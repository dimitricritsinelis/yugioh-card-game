# GOAT Backend Rebuild: Effect Engine + Card Implementation Program

> **This document supersedes `docs/list_of_task.md` as the active roadmap.**
> The old queue and `docs/playable-engine-audit.md` remain as archival context.
> Approved 2026-06-09 after a full audit of main, the failed
> `codex/card-implementation` branch, and the prototype engine at `4802900`.

## Goal

A fully automated GOAT-format backend: the engine enforces rules, runs
chains/timing/prompts (EDOPro-style automatic), card behavior is implemented
card-by-card as code, integrated with the existing online (Supabase/Vercel)
game, with an **opponent-confirmed override** system as the escape hatch.

Two phases:

- **Phase 1 — Preparation** (senior-engineer work): repair the baseline, build
  the timing kernel + effect DSL, tokens/fusion, online transport + override,
  and the entire card-production pipeline (specs, tiers, generators, gates),
  validated by a pilot batch. Tracked in `docs/rebuild/phase1-tasks.md`.
- **Phase 2 — Execution loop**: a self-contained goal prompt
  (`docs/loop/PROMPT.md`, finalized at P-8) that an agent runs batch-by-batch
  until the queue is empty.

## Binding decisions

1. **Full GOAT support**: tokens + minimal Fusion Deck (~31 GOAT-legal fusions;
   Thousand-Eyes Restrict first). The old no-fusion/no-token scope is revoked.
2. **Full automation + override**: engine enforces everything; override is the
   escape hatch for engine bugs/unimplemented cards.
3. **Online override = opponent-confirms**: either seat proposes (move card /
   LP / face-position / rewind), opponent approves, server applies, loudly logged.
4. **Coverage = meta-first then full pool**: ~150 cards covering 95% of real
   GOAT decklists first, then archetype/fringe, then the long tail.

## Audit summary (what we learned)

The repo has had three lives:

1. `4802900` (PR #1–2): full prototype engine — reducer, chain/priority/
   spell-speed, prompts, costs/targets, triggers, continuous effects, CardScript
   registry + templates, 280 passing tests. Survives in git history.
2. `origin/codex/card-implementation` (forked from `4802900`): ONE 110k-line
   commit; 258 scripted cards, 14 templates, ~8k lines of behavioral tests.
   **Unmergeable** — main later deleted every file it modifies. Mine it for
   reference; never merge it.
3. `e408a0f` trimmed the engine to manual-play; online-only multiplayer was
   built on that. Main today: excellent chassis (immutable JSON state, seeded
   RNG, typed events, server-authoritative versioned moves, redaction) but no
   effect system, a red test baseline (18/139 failing), and a dead-code
   `OverridePanel.tsx`.

**Why the original attempt failed (process, not architecture):**

1. No preparation phase: "implement card-family batches" was one unbounded task
   — no per-card specs, no value ordering, no batch acceptance criteria.
2. Loop-hostile layout: monolithic 2–4k-line script/test files; a hardcoded
   1,687-entry coverage manifest.
3. Engine gaps (SEGOC, damage-step subwindows, end-phase ordering) blocked hard
   cards → the loop ate the easy 60% and skipped the GOAT-defining 40%
   (Scapegoat, Metamorphosis, TER, Tsukuyomi, Sangan).
4. Built on a fork while main pivoted under it; one monolithic commit.

**Keep / scrap:**

| Keep | Scrap |
|---|---|
| Main's chassis: core state/zones/invariants, RNG, events, serialization, online plumbing | The failed branch as a branch (mine it, never merge it) |
| Salvage as vocabulary/reference: `4802900` spellSpeed/priority/costs/targets + golden timing tests; codex 258 card definitions + templates + tests (spec seeds) | Naive LIFO chain without SEGOC/response windows; card-shaped step kinds |
| `cardReviews` spec format; old queue operating rules (one task per run, never weaken tests, stop at green) | Hardcoded coverage manifest; monolithic script/test files; "smallest coherent subpart" loophole |
| Test infra: `builders.ts`, `scenarioRunner.ts`, `assertions.ts` | Goal-mode with unbounded tasks and no per-card specs |

## Architecture

**Greenfield timing kernel on main's chassis**, with aggressive salvage of
vocabularies, tests, and card semantics:

- **`src/engine/kernel/`** — explicit, serializable `FlowState` on core
  `DuelState`: a stack of flow frames (`open-priority`, `response-window`,
  `segoc-order`, `chain-resolve{linkIndex,pc,locals}`, `summon-response`,
  `damage-step{substep}`, `end-phase{queue}`), pending prompt, trigger queue,
  lingering effects, once-per-turn map. **Iron rule: no closures in persisted
  state** — every resumable thing is `(scriptId, pc, locals)` so a duel freezes
  mid-chain into Supabase jsonb and resumes on another serverless invocation.
  The reducer keeps its pure `(state, command)` signature; the top flow frame
  defines which commands are legal and from whom.
- **Kernel mutation API** — the only way effects touch state (`moveCardK`,
  `destroyK`, `drawK`, `lpK`, `summonK`, `createTokenK`, …): wraps
  `core/zones.ts`, emits typed events, runs replacement-effect interception,
  then state-based cleanup. Trigger matching + SEGOC bucketing (mandatory-TP →
  mandatory-OPP → optional-TP → optional-OPP) after every mutation batch;
  missed-timing tracked for optional "when" triggers.
- **Effect DSL, declarative-first** — `EffectDef { kind, speed, condition,
  cost, targets, resolution: Step[] | {native}, oncePerTurn?,
  damageStepPermission? }` over ~30 **orthogonal** step primitives + JSON
  selector trees. Imperative **native** escape hatch (registered pure
  functions, resumable via `(native, label, locals)`, same kernel API) for the
  ~10–15% genuinely weird cards (Metamorphosis, TER, Cyber Jar, Fiber Jar,
  Reasoning, Creature Swap…). Custom-resolver count is a tracked metric —
  growth means the DSL is missing a step kind (capability gap, not a per-card
  hack).
- **Continuous/derived stats recomputed, never incrementally mutated**:
  declarative modifiers; `recomputeDerived(state)` produces transient effective
  ATK/DEF + restriction sets (base → additive by appliedSeq → set-to by
  appliedSeq). Replacement effects = interceptors on
  would-destroy/would-damage/would-send.
- **Capability registry (keystone)**: the engine exports machine-readable
  supported step kinds / cost kinds / target features / windows
  (`capabilities.generated.ts`). Spec sheets declare required capabilities;
  the loop pre-flight checks `spec ⊆ engine` and **defers** the card with a
  gap-id otherwise. This one mechanism prevents both prior failure modes
  (silently skipping hard cards; improvising engine features mid-loop).
- **Tokens & Extra Deck**: `extraDeck` on `PlayerState` + `ZoneKind`; tokens
  minted with reserved `TOKEN-*` ids registered into `state.cardDefinitions`,
  deterministic seq-based instance ids; explicit cross-check vs `redaction.ts`
  / `publicView.ts` (anything assuming "every instance has a cards.json
  passcode" breaks).
- **Override-as-proposal with flow repair**: `proposeOverride` /
  `respondOverride(approve|reject)` ops; apply path reuses
  `overrideCardLocation` then `repairFlow(state)`: chain links with force-moved
  sources flagged `sourceMoved` (keep resolving — correct YGO behavior),
  targets fizzle via standard resolution-time re-validation, pending prompts
  regenerated or popped, source-scoped continuous/lingering effects expire,
  invariants + recompute run. Rewind = restore per-move state snapshot, void
  later moves. All override events public and loud. Card tests and golden
  replays may never use overrides.

## Phase 1 workstreams

See `docs/rebuild/phase1-tasks.md` for the live queue with status and full
acceptance criteria. Summary: P-0 baseline repair + CI → P-1 single-state
unification → P-2 flow kernel → P-3 effect DSL + templates → P-4 tokens/
extra deck/fusion → P-5 online transport → P-6 online override → P-7 card
pipeline tooling → P-8 pilot batches (go/no-go gate for Phase 2).

## Phase 2 loop (summary)

One run = one batch (5–8 cards, mechanically homogeneous; Tier-0
deck-coherent; vanillas 50/batch). Fixed tiny context per iteration:
`docs/loop/PROTOCOL.md` + the head batch of `docs/loop/queue.json` + that
batch's spec sheets + `docs/effect-kernel-api.md`. Pre-flight (suite green;
specs `spec-verified`; capabilities ⊆ engine) → implement → per-card tests →
gates (`scripts/cards/check-batch.mjs`) → ledger + manifest regen → one commit
per batch, PR every 4 batches → stop and report.

Failure policy: capability gap → defer with gap-id, never hack the engine;
two failed attempts → defer with notes; red suite → revert and STOP.
**Epoch rhythm**: tier exhausted or ≥20% recent gap-deferrals → loop halts →
senior gap-burn session implements queued engine capabilities → deferred
cards re-enqueue at queue front.

Cross-card safety: mandatory interaction-matrix tests, golden replay corpus of
real GOAT lines (runs every batch; re-record requires human ledger signoff),
seeded fuzz playouts over the implemented pool.

## Risks

- **Spec hallucination at scale** — independent verification pass, required
  ruling URLs, 100% human review of Tier 0, text_hash drift guards, golden
  replays as spec-independent oracle, override as runtime escape valve.
- **Mid-chain serialization** is the architectural bet — serialize-at-every-
  prompt tests are mandatory.
- **State unification (P-1)** changes what's persisted — version-gate the
  loader; old dev games may be abandoned.
- **`expectedActors` rework (P-5)** touches authorization — adversarial tests.
- **Gate gaming by loop agents** — mechanical gates + PR spot-checks.
- **Suite runtime growth** — per-card tests budgeted <1s; sharding ready.
