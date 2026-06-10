# Playable Engine Audit

> Historical note: this audit captures a previous playable-engine milestone.
> Some referenced card-script files and tests are no longer present in the
> current online-only implementation. Treat this as archival evidence, not a
> live readiness report.

Date: 2026-05-24

## Scope

This audit covers the simplified playable-engine queue plus the current full card-accountability scaffold: two-player duels using exactly 40-card Main Decks, no Side Deck, no Extra/Fusion Deck, supported cards only in normal playable mode, deterministic reducer behavior, frontend-compatible routing through core reducer commands, and explicit unsupported-card handling.

This is not a claim that the full 1,704-card GOAT card pool is automated. The manifest accounts for every local card by passcode/cardId, but strict final acceptance remains false while GOAT-legal unsupported cards remain.

## Final Validation

- `npm run typecheck`: PASS
  - `tsc -b` completed with exit code 0.
- `npm test`: PASS
  - Vitest reported 47 test files passed and 280 tests passed.
- `npm run build`: PASS
  - `tsc -b && vite build` completed with exit code 0.
  - Vite transformed 1753 modules and produced `dist/index.html`, `dist/assets/index-DzYp-KO6.css`, and `dist/assets/index-n4CM9cej.js`.

## Acceptance Evidence

| Requirement | Evidence |
| --- | --- |
| Two exact-40-card supported decks can start a duel. | `src/engine/__tests__/playableDecks.test.ts` starts a core duel with `YUGI_PLAYABLE_DECK_FIXTURE` and `KAIBA_PLAYABLE_DECK_FIXTURE`; both open with 5-card hands and 35-card Main Decks. |
| No Side Deck exists in playable flow. | `src/engine/deckValidation.ts` rejects Side Deck input; `src/engine/__tests__/deckValidation.test.ts`, `src/engine/__tests__/reducer.test.ts`, `src/engine/__tests__/frontendAdapter.test.ts`, and `src/engine/__tests__/playableDecks.test.ts` cover rejection and fixture omission. |
| No Extra/Fusion Deck exists in playable flow. | `src/engine/deckValidation.ts` rejects Extra Deck input and Fusion/Extra cards are covered as `goatDeckBlocked`; `src/engine/__tests__/supportedDeckGate.test.ts`, `src/engine/__tests__/deckValidation.test.ts`, and `src/engine/__tests__/reducer.test.ts` cover this path. |
| Playable decks cannot include unsupported cards. | `src/engine/__tests__/supportedDeckGate.test.ts`, `src/engine/__tests__/missingScript.test.ts`, `src/engine/__tests__/spellCards.test.ts`, `src/engine/__tests__/trapCards.test.ts`, and `src/engine/__tests__/monsterCards.test.ts` verify unsupported cards are blocked from normal playable decks. |
| Engine state is deterministic and serializable. | `src/engine/__tests__/determinism.test.ts`, `src/engine/__tests__/random.test.ts`, and `src/engine/__tests__/reducer.test.ts` cover deterministic commands, deterministic opening hands, RNG state, and serialization/restore. |
| Reducer input is not mutated. | `src/engine/__tests__/mutationSafety.test.ts` deep-freezes representative reducer inputs; existing phase, summon, battle, costs, priority, and Damage Step tests also use deep-freeze checks. |
| UI-compatible actions route through core reducer commands. | `src/engine/__tests__/frontendCoreRouting.test.ts`, `src/engine/__tests__/frontendAdapter.test.ts`, and `src/engine/__tests__/goldenFrontendSmoke.test.ts` cover frontend-compatible phase, summon, set, activation, attack, prompt, priority, chain, and deck-start routing through core state/actions. |
| Implemented scripts resolve through the frontend-compatible path. | `src/engine/__tests__/frontendCoreRouting.test.ts` proves Pot of Greed draws through a real core chain link and Mystical Space Typhoon target refs route into `activate-card` without synthetic chain injection. |
| Compatibility reducer events are deterministic. | `src/engine/__tests__/frontendCoreRouting.test.ts` verifies same initial frontend-compatible state plus the same phase, summon/set, activation, and attack sequence gives identical final state/events. |
| Broken chain links fail closed. | `src/engine/__tests__/chainResolutionFailure.test.ts` covers stale/malformed links, missing scripts, implemented scripts with missing resolution, and invalid targets resolving visibly without blocking other chain links. |
| Basic phases, summoning, setting, battle, damage, and End Phase work. | `src/engine/__tests__/phaseFlow.test.ts`, `summons.test.ts`, `battle.test.ts`, `positionChange.test.ts`, `winConditions.test.ts`, and golden scenario tests cover these flows. |
| Implemented card effects use scripts/templates and tests. | `src/engine/cards/scripts/`, `src/engine/cards/templates/`, `src/engine/__tests__/scriptRegistry.test.ts`, and card/template tests cover the current implemented registry. |
| Unsupported card effects are explicit and blocked. | `src/engine/__tests__/missingScript.test.ts` verifies explicit `effect-not-implemented`/unsupported behavior without state mutation. |
| Golden gameplay scenarios pass. | `src/engine/__tests__/goldenPriorityScenarios.test.ts`, `goldenChainScenarios.test.ts`, `goldenBattleScenarios.test.ts`, `goldenDamageStepScenarios.test.ts`, and `goldenFrontendSmoke.test.ts` are included in the passing full test suite. |
| Runtime card text is not parsed for behavior. | `src/engine/__tests__/noRuntimeTextParsing.test.ts` statically guards engine runtime files, `src/cardData.ts`, `src/gameLogic.ts`, and adapter paths against parser imports/calls and runtime `text` decisions. |
| Full local card pool is explicitly accounted for. | `src/engine/cards/coverageManifest.generated.ts`, `src/engine/cards/coverageReport.ts`, `src/engine/__tests__/coverageManifest.test.ts`, and `src/engine/__tests__/coverageReport.test.ts` account for every local passcode exactly once and keep `strictFinalAcceptanceReady` false while unsupported GOAT-legal cards remain. |

## Known Limitations

- The engine is playable for the supported subset only. It does not automate all 1,704 local cards.
- The local 1,704-card bundle is accounted for by manifest status, but many GOAT-legal cards remain `goatUnsupported`; strict final acceptance is not ready.
- Unsupported cards remain blocked from normal playable decks unless a test/dev path explicitly opts into unsupported behavior.
- Extra Deck and Fusion Deck gameplay remains out of scope for this queue.
- Side Deck and match siding remain out of scope.
- The frontend-compatible facade still preserves the legacy UI state shape, but real gameplay actions now route to core reducer commands and project back from core state.
- Battle and Damage Step decisions are still simplified around atomic battle resolution in several flows. Richer mid-battle prompt windows are future work.
- Many richer GOAT effects are intentionally unsupported until they receive scripts/templates and tests, including examples already called out in implementation status such as Sangan, Mystic Tomato, Airknight Parshath, Tsukuyomi, Spirit Reaper, Metamorphosis, and Thousand-Eyes Restrict.
- Future implemented status entries must continue to require script/template coverage and tests.

## Audit Result

The playable-engine queue acceptance criteria are satisfied for the simplified scope, and the full-card accountability scaffold is now explicit. The project is not strict-final-acceptance ready until the GOAT-legal unsupported count reaches zero and the remaining timing/card-family TODOs are implemented and tested.
