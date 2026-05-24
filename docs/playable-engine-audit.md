# Playable Engine Audit

Date: 2026-05-24

## Scope

This audit covers the simplified playable-engine queue: two-player duels using exactly 40-card Main Decks, no Side Deck, no Extra/Fusion Deck, supported cards only in normal playable mode, deterministic reducer behavior, frontend routing through the engine adapter, and explicit unsupported-card handling.

This is not a claim that the full 1,704-card GOAT card pool is automated. The playable scope is the supported implemented/vanilla subset guarded by deck validation and coverage tests.

## Final Validation

- `npm run typecheck`: PASS
  - `tsc -b` completed with exit code 0.
- `npm test`: PASS
  - Vitest reported 44 test files passed and 268 tests passed.
- `npm run build`: PASS
  - `tsc -b && vite build` completed with exit code 0.
  - Vite transformed 1751 modules and produced `dist/index.html`, `dist/assets/index-DzYp-KO6.css`, and `dist/assets/index-C8e9S2ks.js`.

## Acceptance Evidence

| Requirement | Evidence |
| --- | --- |
| Two exact-40-card supported decks can start a duel. | `src/engine/__tests__/playableDecks.test.ts` starts a core duel with `YUGI_PLAYABLE_DECK_FIXTURE` and `KAIBA_PLAYABLE_DECK_FIXTURE`; both open with 5-card hands and 35-card Main Decks. |
| No Side Deck exists in playable flow. | `src/engine/deckValidation.ts` rejects Side Deck input; `src/engine/__tests__/deckValidation.test.ts`, `src/engine/__tests__/reducer.test.ts`, `src/engine/__tests__/frontendAdapter.test.ts`, and `src/engine/__tests__/playableDecks.test.ts` cover rejection and fixture omission. |
| No Extra/Fusion Deck exists in playable flow. | `src/engine/deckValidation.ts` rejects Extra Deck input and Fusion Monsters are covered as `blockedNoExtraDeck`; `src/engine/__tests__/supportedDeckGate.test.ts`, `src/engine/__tests__/deckValidation.test.ts`, and `src/engine/__tests__/reducer.test.ts` cover this path. |
| Playable decks cannot include unsupported cards. | `src/engine/__tests__/supportedDeckGate.test.ts`, `src/engine/__tests__/missingScript.test.ts`, `src/engine/__tests__/spellCards.test.ts`, `src/engine/__tests__/trapCards.test.ts`, and `src/engine/__tests__/monsterCards.test.ts` verify unsupported cards are blocked from normal playable decks. |
| Engine state is deterministic and serializable. | `src/engine/__tests__/determinism.test.ts`, `src/engine/__tests__/random.test.ts`, and `src/engine/__tests__/reducer.test.ts` cover deterministic commands, deterministic opening hands, RNG state, and serialization/restore. |
| Reducer input is not mutated. | `src/engine/__tests__/mutationSafety.test.ts` deep-freezes representative reducer inputs; existing phase, summon, battle, costs, priority, and Damage Step tests also use deep-freeze checks. |
| UI routes actions through engine commands. | `src/engine/__tests__/frontendAdapter.test.ts` and `src/engine/__tests__/goldenFrontendSmoke.test.ts` cover frontend phase, summon, set, attack, prompt, priority, chain, and deck-start routing through engine state/actions. |
| Basic phases, summoning, setting, battle, damage, and End Phase work. | `src/engine/__tests__/phaseFlow.test.ts`, `summons.test.ts`, `battle.test.ts`, `positionChange.test.ts`, `winConditions.test.ts`, and golden scenario tests cover these flows. |
| Implemented card effects use scripts/templates and tests. | `src/engine/cards/scripts/`, `src/engine/cards/templates/`, `src/engine/__tests__/scriptRegistry.test.ts`, and card/template tests cover the current implemented registry. |
| Unsupported card effects are explicit and blocked. | `src/engine/__tests__/missingScript.test.ts` verifies explicit `effect-not-implemented`/unsupported behavior without state mutation. |
| Golden gameplay scenarios pass. | `src/engine/__tests__/goldenPriorityScenarios.test.ts`, `goldenChainScenarios.test.ts`, `goldenBattleScenarios.test.ts`, `goldenDamageStepScenarios.test.ts`, and `goldenFrontendSmoke.test.ts` are included in the passing full test suite. |
| Runtime card text is not parsed for behavior. | `src/engine/__tests__/noRuntimeTextParsing.test.ts` statically guards runtime modules against parser imports/calls and restricts card `text` access to catalog/display normalization. |
| Playable coverage is reported separately from full card-pool coverage. | `src/engine/cards/coverageReport.ts` and `src/engine/__tests__/coverageReport.test.ts` distinguish local card-pool size, vanilla playable, implemented playable, unsupported, Extra/Fusion scope blocks, and deck-validation scope blocks. |

## Known Limitations

- The engine is playable for the supported subset only. It does not automate all 1,704 local cards.
- Unsupported cards remain blocked from normal playable decks unless a test/dev path explicitly opts into unsupported behavior.
- Extra Deck and Fusion Deck gameplay remains out of scope for this queue.
- Side Deck and match siding remain out of scope.
- The frontend is adapted to engine commands, but it is still a local prototype rather than a tournament platform.
- The legacy UI-compatible facade still exists around the core reducer; core playable state remains the source for exact-40 Main Deck-only behavior.
- Battle and Damage Step decisions are still simplified around atomic battle resolution in several flows. Richer mid-battle prompt windows are future work.
- Many richer GOAT effects are intentionally unsupported until they receive scripts/templates and tests, including examples already called out in implementation status such as Sangan, Mystic Tomato, Airknight Parshath, Tsukuyomi, Spirit Reaper, Metamorphosis, and Thousand-Eyes Restrict.
- Future implemented status entries must continue to require script/template coverage and tests.

## Audit Result

The playable-engine queue acceptance criteria are satisfied for the simplified scope. The repository is green under the required validation commands, and remaining limitations are explicit.
