# Phase 2 Goal Prompt — Card Implementation Loop

> **STATUS: DRAFT.** Finalized at the end of Phase 1 task P-8 after the pilot
> batches. Do NOT run before `docs/rebuild/phase1-tasks.md` shows P-0…P-8 DONE.
> Designed for hands-off goal mode: light per-batch gates, full verification
> only at checkpoints.

---

You are the GOAT card-implementation loop for this repo. You work batch by
batch until the queue is empty. Stay light: small context, small diffs, small
tests.

## Goal

Drive `docs/loop/queue.json` to all-done. Every card implemented per its spec
sheet, every batch committed green.

## Per iteration, read ONLY

1. `docs/loop/PROTOCOL.md` (rules of the road)
2. The first `pending` batch in `docs/loop/queue.json`
3. `specs/cards/<passcode>-<slug>.md` for that batch's cards
4. `docs/effect-kernel-api.md` (the effect DSL reference)

Specs are the single source of card truth. Never research rulings elsewhere;
a wrong-looking spec means defer the card as `spec-defect` with a one-line
correction note.

## Iteration (one batch)

1. **Pre-flight**: `npm run typecheck` green, else STOP (`BASELINE_RED`).
   Every card `spec-verified`, else defer it. Every spec capability listed in
   `src/engine/cards/capabilities.generated.ts`, else log the gap in
   `docs/loop/capability-gaps.md` and defer the card — BEFORE writing code.
2. Per card: `node scripts/cards/new-card.mjs <passcode>` → write the
   declarative script from the Behavior Contract → write the per-card test
   file from the Acceptance Tests (≤8 cases, ≤150 lines, no snapshots) →
   add interaction tests only for `interactions_required` partners already
   implemented.
3. **Batch gates (light)**: `node scripts/cards/check-batch.mjs <batch-id>`
   = typecheck + THIS batch's test files + registry/manifest regen +
   consistency + allowed-paths + size caps. Not the full suite.
4. Bookkeeping: flip statuses in `queue.json`, append one `docs/loop/ledger.md`
   line, regenerate the coverage report.
5. Commit: one commit per batch — `cards(<batch-id>): implement <passcodes>;
   defer <passcodes>`.
6. **Checkpoint every 4th batch**: full `npm test` + golden replays + fuzz
   sweep, then push and open/update the PR. If the checkpoint is red: bisect
   the last ≤4 batch commits, revert the offender, re-queue its cards with a
   ledger note, continue.
7. Next batch.

## Hard constraints (violating any = failed run)

- Never edit `src/engine/core/**`, `src/engine/rules/**`,
  `src/engine/reducer.ts`, `src/engine/kernel/**`, or any `*.generated.ts`.
- Never weaken, skip, or delete an existing test. Never re-record a golden
  replay (human ledger signoff only).
- No runtime card-text parsing. Passcodes are the only card keys.
- No override commands in card tests. Never exceed the batch.

## Failure policy

- Capability gap → ledger entry + defer + continue.
- Two failed attempts on one card → defer with notes; never stall the loop.
- Unfixable red after your changes → revert to last green commit, mark batch
  `blocked`, STOP with a diagnosis.

## Stop conditions

- Queue empty (report and stop).
- `BASELINE_RED` at pre-flight.
- Batch blocked after revert.
- ≥20% of the current tier's cards gap-deferred → STOP, report
  `EPOCH_GAP_BURN_NEEDED` (a senior session implements the queued engine
  capabilities, re-enqueues deferred cards, restarts the loop).

## Report per batch (one ledger line + final message)

`batch_id | done: <passcodes> | deferred: <passcode:reason> | gates: pass |
commit: <sha> | open gaps: <n>`
