# Phase 1 Task Queue — GOAT Backend Rebuild

> Active queue for the rebuild program described in `docs/rebuild/PLAN.md`.
> Operating rules (proven by the original T-0xx queue, kept; loopholes removed):
>
> 1. Find the first task whose status is not `DONE`. Complete exactly that task.
> 2. Do not skip ahead. Do not broaden scope.
> 3. Never mark `DONE` unless every acceptance criterion passes.
> 4. Never weaken, skip, or delete an existing test to get green.
> 5. No runtime card-text parsing. Passcodes are the only card keys.
> 6. No `Math.random` / `Date.now` in the engine path.
> 7. Each task lands as its own branch/PR with `npm run typecheck && npm test
>    && npm run build` green. Update this file's status + progress notes in the
>    same PR.
> 8. If a task is genuinely blocked, mark it `BLOCKED` with a reason and STOP —
>    do not "complete the smallest coherent subpart" of a different task.
>
> Statuses: `TODO` | `IN_PROGRESS` | `DONE` | `BLOCKED`

---

## P-0: Baseline repair + CI

Status: TODO

Goal: green test baseline so every later diff is attributable.

Actions:
1. Run `npm test`; triage the 18 failures (battle, phaseFlow, determinism,
   playableDecks, goldenFrontendSmoke, winConditions) into:
   (a) reducer behavior drift from the manual-play trim,
   (b) legacy↔core conversion loss,
   (c) stale test expectations.
   Diff test expectations against their `4802900` versions (`git show`) to
   decide which side is right. Fix deliberately — engine bug → fix engine;
   intended manual-play behavior change → update test and say so in the commit.
2. Add CI (GitHub Actions): `npm run typecheck` + `npm test` on every push/PR.

Acceptance:
- 139/139 engine tests green; full suite green; CI enforces both.

---

## P-1: Single-state unification

Status: TODO

Goal: core `DuelState` becomes the one persisted truth; the legacy UI shape
becomes a pure projection.

Actions:
1. Invert `src/engine/duel.ts`: `applyAction`/`getLegalActions` operate on core
   `DuelState` via `reduceDuel`; legacy `DuelState` is a memoized projection
   consumed by `frontendAdapter`/`publicView`.
2. Persist core `DuelState` in `duel_games.engine_state` with an
   `engineStateVersion` discriminator; loader handles (or retires) old rows —
   old dev games may be marked finished.
3. Round-trip property test: serialize→parse→deep-equal + invariants at every
   step of every scenario in `testing/scenarioRunner`.
4. Delete dead conversion paths; CI grep gate: nothing outside `duel.ts`
   writes through the legacy shape.

Acceptance: round-trip test green on all scenarios; online tests green;
`npm run build` clean.

---

## P-2: Flow kernel (timing state machine, chains, SEGOC, windows)

Status: TODO

Goal: `src/engine/kernel/{flow,chain,triggers,mutations}.ts` — explicit
serializable FlowState; reducer dispatches against the top flow frame.

Actions:
1. Add `flow: FlowState` to core `DuelState` (stack of tagged frames, chain,
   pendingPrompt, triggerQueue, lingering, oncePerTurn, seq) — plain JSON only.
   Frame kinds: open-priority, response-window, segoc-order, chain-resolve
   {linkIndex,pc,locals}, summon-response, damage-step{substep}, end-phase
   {queue}. Document legal transitions in `docs/kernel-flow.md`.
2. New commands: `activate-effect`, `chain-pass`, `resolve-prompt`,
   `order-triggers`; rework `attack` to open response windows and step
   damage-step frames. The 13 existing manual commands stay valid when the
   flow stack is empty (manual mode = degenerate case).
3. Kernel mutation API (`moveCardK`, `destroyK`, `drawK`, `lpK`, `summonK`,
   `setFaceK`, `attachK`, `createTokenK`, …) wrapping `core/zones.ts`,
   emitting typed events, running replacement interception + state-based
   cleanup.
4. Trigger matching + SEGOC bucketing after every mutation batch; missed-timing
   marker for optional "when" triggers. Chain resolution: LIFO, per-link
   resumable programs, resolution-time target re-validation (fizzle), negation
   flags; triggers raised during resolution queue for the next chain.
5. Port spell-speed/priority from `4802900` (`rules/spellSpeed.ts`,
   `rules/priority.ts`) near-verbatim; extend `rules/damageStep.ts` substep
   gating. Re-target `4802900` golden chain/priority/damage-step tests as
   kernel acceptance tests.

Acceptance: golden suites green; SEGOC ordering, damage-step windows,
end-phase ordering, missed-timing tests green; **3-link chain serialized at
every prompt resumes identically** (load-bearing test); manual commands work
with empty flow stack.

---

## P-3: Effect DSL, continuous/replacement, templates

Status: TODO

Goal: CardScript v2 — declarative EffectDef interpreted by a step VM, native
escape hatch, continuous-recompute, replacement interceptors, template library.

Actions:
1. `kernel/{effectDsl,stepVm}.ts`: EffectDef + ~30 orthogonal Steps + JSON
   selector/condition trees; steps may suspend on prompts (VM stores pc+locals
   in the chain link). Salvage CostSpec/TargetSpec vocabulary from `4802900`
   `effects/{costs,targets}.ts`; reject the codex card-shaped step union.
2. Native escape hatch: `registerNative(id, fn)`; ctx exposes ONLY kernel
   mutations + prompt yielding; resumable via `{native, label, locals}`;
   lint cap 150 lines; tracked count in the manifest.
3. `kernel/continuous.ts`: declarative modifiers + `recomputeDerived(state)`
   (transient, never persisted; base → additive → set-to by appliedSeq).
   `kernel/replacement.ts`: would-event interceptors.
4. Template library v2 (one file each, built ON the DSL): vanilla, flipEffect,
   searcher, recruiter, normalSpell, quickPlay, equipSpell, fieldSpell,
   continuousSpell, normalTrap, counterTrap, continuousTrap, spirit, statMod.
5. Write `docs/effect-kernel-api.md` — every step/selector/condition with a
   real GOAT card example. This is the ONE doc Phase 2 agents read.

Acceptance: Pot of Greed, Sangan, Trap Hole, Book of Moon, Snatch Steal,
Solemn Judgment expressible 100% declaratively with passing tests; a native
demo card suspends on a prompt, serializes, resumes; continuous recompute
handles equip + lingering + set-to ordering deterministically.

---

## P-4: Tokens, Extra Deck, fusion/ritual machinery

Status: TODO

Goal: Scapegoat tokens, ~31 GOAT fusions, ritual summons.

Actions:
1. `extraDeck` on `PlayerState` + `ZoneKind`/`ZoneRef`; update zones.ts,
   invariants.ts, clone.ts, builders.ts, deckValidation.ts, redaction/
   publicView (counts only). Grep-driven checklist — every zone-enumeration
   site.
2. Tokens: `createTokenK` mints instances with reserved `TOKEN-*` cardIds
   registered into `state.cardDefinitions`; deterministic seq instance ids;
   invariant: tokens only in monster zones; annihilate on leaving field.
3. Fusion summon machinery (poly | metamorphosis | scientist paths) + ritual
   summon (level-sum tribute selector). Salvage scenario inventories from the
   codex `tokenSystem/fusionSummons/ritualSummons/equipSystem/controlChange`
   tests.

Acceptance: Scapegoat → 4 tokens (summon-locked turn, can't be tributed for a
Tribute Summon, die correctly); Metamorphosis → TER → absorb-equip → stat
set-to → Heavy Storm kills the equip — all end-to-end reducer-driven;
serialization round-trip green with tokens + extra deck; deck validation
accepts a GOAT fusion deck list.

---

## P-5: Online transport (prompts, chains, expected actor)

Status: TODO

Goal: the online layer carries the kernel.

Actions:
1. Engine selector `expectedActors(state): PlayerId[]` from flow;
   `gameService.submitMove` authorizes against it (replaces activePlayer-only
   gate). Adversarial tests: out-of-turn submissions rejected.
2. Extend `OnlineCommand`: `engine-action`, `resolve-prompt`, `respond-pass`;
   server validates prompt selections against stored legal options.
3. Views: `pendingPrompt` (options redacted per viewer — deck-search contents
   never leak), public `chainStack`, `autoPassHint`. Server auto-passes a
   player with zero legal responses inside the same transaction (latency is an
   acceptance criterion).
4. UI: PromptModal (target picker highlighting legal zones, yes/no, option
   list, ordering), ChainStack overlay, "opponent is choosing" affordance.

Acceptance: two-seat integration test — P1 activates, P2 chains a set trap
from a response window; redaction tests green; a duel paused mid-prompt
survives server restart and resumes.

---

## P-6: Online override (opponent-confirms)

Status: TODO

Goal: either seat proposes an override; opponent approves; server applies with
flow repair; loud logs. Revive `OverridePanel.tsx`.

Actions:
1. Migration: `pending_override` jsonb on `duel_games`; per-move
   `engine_state_snapshot` on `duel_moves` (rewind support). Push via
   `npx supabase db push --linked` per AGENTS.md playbook.
2. Ops: `proposeOverride` / `respondOverride(approve|reject)` /
   `cancelOverride` in `api/game.ts` + `gameService`.
3. Engine: `applyOverride(state, proposal)` reusing `overrideCardLocation`
   (reducer.ts ~486) + `repairFlow(state)` (sourceMoved chain links, fizzled
   targets, prompt regeneration, source-scoped effect expiry, invariants,
   recompute).
4. Rewind: restore snapshot at target version, void later moves, bump version,
   both clients refresh. Proposal modal shows a diff summary.
5. Events: override-proposed/approved/applied/rejected — public, unredacted,
   prominent in ActionLog. Revive `OverridePanel.tsx` as composer + approval UI.

Acceptance: (1) mid-chain force-move → chain resolves, invariants hold;
(2) override during a target prompt regenerates it; (3) rewind 3 moves
converges both seats; (4) reject leaves state untouched; all override events
visible in both logs.

---

## P-7: Card pipeline tooling

Status: TODO

Goal: every artifact Phase 2 consumes — generated, never hand-maintained.

Actions:
1. `scripts/cards/generate-specs.mjs`: skeleton spec sheets for all 1,704 cards
   from `cards.json` (identity/stats/legality/text + text_hash — zero
   hallucination risk); import the 167 `src/engine/cardReviews/*.md` bodies;
   extract the codex branch's 258 card definitions into `specs/salvage/*.json`
   (`git show origin/codex/card-implementation:src/engine/cards/scripts/...`).
2. Spec sheet format `specs/cards/<passcode>-<slug>.md`: YAML frontmatter
   (passcode, tier, family, status skeleton|spec-draft|spec-verified|
   implemented|deferred, text_hash, capabilities[], interactions_required[],
   salvage pointer) + body (Card Text / Behavior Contract / Timing & Chain
   Notes incl. SEGOC class, missed-timing, damage-step legality, 2005
   ignition-priority / Edge Cases + ruling URLs / Interactions / numbered
   Given-When-Then Acceptance Tests / Implementation Notes).
3. Spec production pipeline: skeletons (deterministic) → authoring (agent
   fan-out, ≤10/run, tier-by-tier, lazily — only Tiers 0–1 fully authored in
   Phase 1) → verification (separate agent pass, fixed checklist; only
   `spec-verified` is implementable). Human reviews 100% of Tier 0, 10%
   sampled after.
4. `data/goat-tiers.json` (curated; resolve the Exarion Universe data gap) +
   generated `docs/loop/queue.json` (tier-ordered, mechanic-clustered batches).
   Tier 0 ≈ 48 staples → playable Goat Control mirror; Tier 1 ≈ 110 archetype
   completers; Tier V = 345 vanillas via template (50/batch); Tier 2 ≈ 600 by
   family; Tier 3/4 = fringe + rituals + forbidden-but-scripted.
5. `scripts/cards/generate-registry.mjs`: one-file-per-card scripts →
   `registry.generated.ts` + computed coverage manifest (every passcode exactly
   one status incl. `deferred:<gap-id>`); CI asserts manifest == filesystem ==
   ledger. Also `capabilities.generated.ts` from the kernel.
6. `scripts/cards/new-card.mjs` scaffolder; `scripts/cards/check-batch.mjs`
   gate-runner (focused tests → full suite → typecheck → golden replays →
   no-text-parsing guard → manifest regen diff → allowed-paths check →
   200-line script cap → interaction-test presence); seeded fuzz harness.
7. `docs/loop/{PROTOCOL.md,ledger.md,capability-gaps.md}` + interaction matrix;
   finalize `docs/loop/PROMPT.md` draft.

Acceptance: 1,704 skeletons generated; Tier-0/1 specs authored + verified;
registry/manifest fully derived (zero hand edits, enforced by test);
scaffolder + gate-runner work end-to-end on a dummy card; fuzz harness green
on P-3 demo cards.

---

## P-8: Pilot batches + Phase 2 prompt finalization (go/no-go gate)

Status: TODO

Goal: prove the exact Phase 2 protocol on the hardest cards, then freeze the
loop prompt.

Actions:
1. Pilot roster through the real loop artifacts (specs → scaffold → implement
   → gates): Pot of Greed, Sangan, Mystic Tomato, Magician of Faith, Morphing
   Jar, Trap Hole, Solemn Judgment, MST, Snatch Steal, Scapegoat, Book of
   Moon, Tsukuyomi, Metamorphosis + Thousand-Eyes Restrict, Cyber Jar (the
   prompt-protocol stress test).
2. One vanilla mass-batch (50) — proves generator/manifest at scale.
3. One forced capability-gap deferral — proves the escalation path end-to-end.
4. Run TER and Cyber Jar online end-to-end (two browsers) including one
   mid-chain override approval.
5. Finalize `docs/loop/PROMPT.md` from friction observed; dry-run it on one
   fresh batch with zero human intervention; iterate until it lands clean.

Acceptance: pilots merged green via PRs; online E2E passes; dry-run batch
lands clean from the prompt alone; loop iteration cost characterized
(context size, wall time, gate failure causes) and batch size tuned.
