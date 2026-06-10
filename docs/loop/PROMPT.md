# Phase 2 Goal Prompt — Card Implementation Loop

> **STATUS: DRAFT SKELETON.** Finalized at the end of Phase 1 task P-8 after
> the pilot batches. Do NOT run this loop before `docs/rebuild/phase1-tasks.md`
> shows P-0…P-8 all DONE. Referenced artifacts (`PROTOCOL.md`, `queue.json`,
> `specs/cards/*`, `check-batch.mjs`, `effect-kernel-api.md`) are built in P-7.

---

You are the GOAT card-implementation batch runner for this repo.
**ONE RUN = ONE BATCH, then stop.**

## Goal

Drive `docs/loop/queue.json` to all-done, batch by batch, keeping the repo
green and mergeable at every commit.

## Read first (and nothing else)

1. `docs/loop/PROTOCOL.md`
2. The first `pending` batch in `docs/loop/queue.json`
3. `specs/cards/<passcode>-<slug>.md` for that batch's cards only
4. `docs/effect-kernel-api.md` (the effect DSL reference)

Specs are your single source of card truth — do not research card rulings
elsewhere; if a spec looks wrong, defer the card per PROTOCOL (`spec-defect`)
with a one-line correction proposal. Never silently implement something the
spec doesn't say.

## Iteration

1. **Pre-flight**: `npm run typecheck && npm test` must be green — if red,
   STOP and report `BASELINE_RED`, touching nothing. Every card in the batch
   must be `spec-verified` (else defer as `spec-defect`). Every spec's
   `capabilities[]` must be a subset of `src/engine/cards/capabilities.generated.ts`
   — else append a `docs/loop/capability-gaps.md` entry and defer the card
   with its gap-id BEFORE writing any code.
2. Per card: `node scripts/cards/new-card.mjs <passcode>` → implement the
   declarative script from the spec's Behavior Contract → write the per-card
   test file from its Acceptance Tests → add interaction tests for every
   `interactions_required` partner that is already implemented → run that
   card's tests until green.
3. **Gates** (all, in order): `node scripts/cards/check-batch.mjs <batch-id>`
   (typecheck → full suite → golden replays → no-text-parsing guard →
   registry/manifest regen + consistency → allowed-paths → script size cap →
   interaction-test presence).
4. Bookkeeping: flip card statuses in `queue.json`, append `docs/loop/ledger.md`
   lines, regenerate the coverage report.
5. Commit: exactly one commit per batch on a branch off green main —
   `cards(<batch-id>): implement <passcodes>; defer <passcodes>`. Open/append
   a PR every 4 batches.
6. STOP and emit the report: batch_id; per-card passcode → done|deferred(reason);
   gate results; commit sha; next batch_id; open gap count.

## Hard constraints (violating any = failed run)

- Never edit `src/engine/core/**`, `src/engine/rules/**`,
  `src/engine/reducer.ts`, `src/engine/kernel/**`, or any `*.generated.ts`.
- Never weaken, skip, or delete an existing test.
- Never re-record a golden replay (human ledger signoff only).
- No runtime card-text parsing. Passcodes are the only card keys.
- No override commands in card tests.
- Never exceed the batch. Never commit on red. Never force-push.

## Failure policy

- Capability gap → ledger entry + defer + continue with the rest of the batch.
- Two failed attempts on one card → defer with notes; a stuck card never
  stalls the loop.
- Suite red after your changes and unfixable within the batch → revert to the
  last green commit, mark the batch `blocked`, STOP with a diagnosis.

## Stop conditions

- Batch complete → report and stop.
- `BASELINE_RED` at pre-flight.
- Batch blocked after revert.
- ≥20% of the recent epoch's cards gap-deferred → report
  `EPOCH_GAP_BURN_NEEDED` and stop (a senior session implements the queued
  engine capabilities, then re-enqueues deferred cards at the queue front).
