# GOAT Engine Implementation Status

## Current phase

Playable-engine queue complete for the simplified scope.

## Completed

- Prompt 1 architecture generated.
- T-000: Concise engine contract saved to docs/goat-engine-contract.md.
- T-001: Task queue saved to docs/list_of_task.md.
- T-002: Baseline validation captured before engine foundation work.
- T-010: Normalized engine card catalog added with passcode/cardId identity and display-only card text.
- T-011: Playable deck validation now enforces exactly 40 Main Deck cards, rejects Side/Extra Deck cards, blocks Fusion Monsters in the Main Deck, enforces copy limits, and supports a passcode/cardId support allowlist for playable-card gating.
- Duplicate public/build artifacts with ` 2`/` 3` suffixes were removed, and Vite build output now copies only canonical public asset roots so those duplicates are not recreated in `dist`.
- T-012: Supported-card coverage gate added. Default playable coverage is conservative: vanilla Normal Monsters are playable, explicit registry entries can mark scripted cards implemented, unsupported cards are rejected, Extra/Fusion Deck cards are blocked, and out-of-scope cards are blocked.
- T-020: Core serializable engine domain types added under `src/engine/core`, with command/result/error types and `Core*` aliases exposed through `src/engine/types.ts`.
- T-021: Immutable core zone helpers added for finding, removing, inserting, moving, revealing, face-state updates, monster-position updates, cloning, and invariant checks.
- T-022: Typed core event union added with readable-message enforcement and query helpers for event messages, type filtering, latest event lookup, player/card/instance filtering, and action-log consumption.
- T-023: Serializable deterministic RNG state and immutable shuffle API added. Engine defaults no longer use `Math.random`; UI-level random test-deck assignment injects randomness from outside `src/engine`.
- T-024: Core reducer shell added. `src/engine/reducer.ts` can create deterministic exact-40 Main Deck duels, draw opening hands, start on Draw Phase, and reduce draw commands without mutating input state. Core serialization helpers clone and restore the new core state without Side/Extra Deck fields.
- T-025: Existing `createDuel` now builds its legacy UI-compatible state from the core reducer state, keeps Side/Extra Decks empty, and routes draw behavior through `reduceDuel`. Compatibility tests now assert the legacy facade carries core state, uses typed reducer deck-out events, and reports unimplemented spell effects explicitly instead of treating them as implemented.
- T-030: Core reducer phase flow added. The reducer advances through Draw, Standby placeholder, Main Phase 1, Battle Phase, Main Phase 2, and End Phase, applies GOAT first-turn draw behavior on Draw Phase progression, starts the next player in Draw Phase, and discards to six cards at End Phase without mutating input state.
- T-031: Core reducer monster play added for Normal Summon, Tribute Summon, monster Set, Tribute Set, and Flip Summon. Summon rules use normalized passcode-keyed card definitions, enforce one Normal Summon/Set per turn, enforce tribute counts from structured monster level metadata, reject Ritual/Fusion paths, and keep Extra Deck data out of core duel state.
- T-032: Core reducer manual battle-position changes added. Position changes are limited to Main Phase 1/Main Phase 2, reject monsters Summoned/Set/Flip Summoned this turn, reject monsters that attacked or already manually changed this turn, reject face-down/no-op changes, and stamp `positionChangedTurn` without mutating input state. Stale duplicate `* 2` source/test copies were removed after they blocked typecheck.
- T-033: Core reducer battle flow added. The reducer now declares attacks, blocks illegal direct/repeated attacks, resolves direct attacks, attack-position battles, defense-position battles, flips face-down defenders before damage calculation, applies battle damage, destroys battle-lost monsters to the Graveyard, preserves 0 ATK vs 0 ATK mutual destruction, and stamps `attackedTurn`.
- T-034: Core terminal win/loss conditions added. LP reaching 0 now finishes the duel, failed required draws from an empty deck finish by deck-out, normal gameplay commands are blocked after `winner` is set, and Exodia only wins when all five Exodia passcodes are explicitly marked `implemented` in the support registry.
- T-040: Card script type and registry added. Scripts are registered by passcode/cardId, duplicate script registration throws, lookup helpers expose known/unknown script checks, and production script/coverage registries only mark cards implemented after templates/scripts and tests add supported behavior.
- T-041: Vanilla monster template added. Normal Monsters are auto-scripted from structured card definitions by passcode/cardId, expose no activatable effects, and remain playable through summon, set, battle, and manual position-change reducer paths.
- T-042: Explicit missing-effect rejection added. Unsupported effect activation now returns an `effect-not-implemented` event with `EFFECT_NOT_IMPLEMENTED`, leaves reducer state unchanged, and normal playable deck validation blocks unsupported cards before duel creation.
- T-043: Priority windows added. Core duel state now carries structured priority holder/pass state, `PASS_PRIORITY` advances priority to the opponent and closes after both players pass, turn actions are blocked while the opponent holds priority, and fresh priority windows open at phase starts and successful summons. A chain-resolution priority window helper is in place for the next chain task.
- T-044: Chain and Spell Speed rules added. Core chain state now stores structured chain links, implemented test scripts create chain links through `activate-card`, Spell Speed legality blocks manual Spell Speed 1 chaining and lower-speed responses to higher-speed links, and `resolve-chain` resolves links in LIFO order before opening a chain-resolved priority window.
- T-045: Costs, targets, and prompts added. Core effect definitions now support structured cost specs, target specs, and prompt definitions; activation can pay costs, store chosen targets on chain links, create pending prompts, answer prompts, and recheck stored targets before chain resolution.
- T-046: Simple trigger collection added. Core effect definitions now support trigger metadata, reducer action batches and chain resolution collect mandatory and optional fixture/scripted triggers, optional triggers create yes/no prompts, accepted optional triggers queue chain links, and turn-player triggers are ordered before opponent triggers.
- T-047: Damage Step restrictions added. Core state now carries Damage Step substep state, battle resolution opens and closes damage calculation state atomically, activation rejects default effects during active Damage Step windows, Counter Trap speed effects remain legal, and scripted direct ATK/DEF modifier effects can opt into Damage Step legality.
- T-048: Continuous, replacement, and lingering foundations added. Fixture scripts can now define derived ATK/DEF modifiers, attack restrictions, destruction prevention/replacement, and lingering effects that apply on chain resolution, expire at End Phase, and clean up when their source leaves the field.
- T-050: Initial supported playable card pool defined. The supported pool now exposes legal vanilla Normal Monsters plus any future explicitly implemented registry entries, seeds two exact-40 supported playable decks from supported local Yugi/Kaiba preset cards, and verifies local default deck resolution contains only supported Main Deck cards with no Side or Extra Deck.
- T-051: Basic Spell templates added. Normal and Quick-Play Spell template helpers now declare structured resolution steps for draw, discard-cost then draw, targeted/all Spell-Trap destruction, monster destruction, battle-position changes, face changes, return-to-hand, and LP changes. Pot of Greed, Heavy Storm, Mystical Space Typhoon, Book of Moon, and Upstart Goblin are registered as implemented with reducer/script tests; unsupported Spells such as Graceful Charity and Lightning Vortex remain blocked.
- T-052: Basic Trap templates added. Normal, Continuous, and Counter Trap template helpers exist; Trap setting, set-turn activation lockout, attack-declaration response chains, summon response chains, attack negation, attacking-monster destruction, opponent attack-position monster destruction, and all-monster destruction are covered by reducer/template tests. Mirror Force, Torrential Tribute, and Sakuretsu Armor are registered as implemented with timing tests; unsupported Traps such as Waboku and Magic Jammer remain blocked.
- T-053: Basic Monster templates added. Flip, recruiter, sent-to-Graveyard search, Spirit return, ignition, piercing, and direct-attack helpers now cover common monster behavior. Dekoichi the Battlechanted Locomotive, Magician of Faith, Old Vindictive Magician, and Exiled Force are registered as implemented with card-script tests; representative unsupported effect monsters such as Sangan and Mystic Tomato remain blocked from playable decks.
- T-054: Breaker the Magical Warrior, Tribe-Infecting Virus, Sinister Serpent, D. D. Warrior Lady, Injection Fairy Lily, Reflect Bounder, Jinzo, Ring of Destruction, Call of the Haunted, Premature Burial, and Snatch Steal are implemented as custom staples. Snatch Steal now targets an opponent's face-up monster, places itself from hand into a Spell/Trap Zone, transfers control into an open Monster Zone, links the Equip Spell and equipped monster, returns the monster to its owner when Snatch Steal is destroyed, destroys Snatch Steal when the equipped monster is destroyed by battle, and gives the opponent 1000 LP during that opponent's Standby Phase.
- T-055: Two explicit exact-40 playable fixture decks now live under `src/engine/testing/playableDecks.ts`. The Yugi and Seto Kaiba fixtures use passcode/cardId deck lists only, omit Side and Extra Decks, respect copy limits, use only supported implemented/vanilla cards, validate cleanly, can start a core duel, and are now the default local duel assignment path.
- T-060: Frontend adapter selectors now project engine state into the existing UI shape, preserve hidden opponent hand/deck/face-down field information, expose legal placement actions and unavailable hand-card ids, map event messages to action-log entries, and keep projection logic out of React components.
- T-061: Frontend phase progression, summon/set placement, tribute selection, attacks, LP edits, and explicit dev-only debug movement now route through engine actions. Attack commands are generated by engine legal-action selection, exposed through adapter targets, and rendered without putting attack legality in React components.
- T-062: Prompt, priority, and chain UI surfaces now render in the frontend. The adapter exposes active prompts, target/discard/tribute candidate selection, yes/no and chain-response choices, priority passing, and chain resolution; the UI-facing engine facade now syncs prompt and chain state for these controls.
- T-063: Frontend deck startup now validates selected decks before creating a duel. The gate requires Player 1 and Player 2 decks, exactly 40 Main Deck cards, no Side Deck, no Extra Deck, and supported cards in normal playable mode; App setup/reset now surfaces readable duel setup errors instead of starting invalid duels.
- T-070: Test fixture helpers added under `src/engine/testing`. Tests can now look up fixture cards, create deterministic rigged exact-40 duels, place cards immutably into key zones, set phase/priority state, run reducer scenarios, and assert events, zones, LP, and chain state without exporting these helpers through the public engine index.
- T-071: Golden gameplay scenarios added for supported-card interactions: Tribe-Infecting Virus post-summon priority, Breaker counter timing, Torrential Tribute, MST chain order, Book of Moon target/position resolution, Mirror Force, Sakuretsu Armor, Damage Step restrictions, deck-out, LP-zero, and a frontend adapter smoke flow from supported deck start through summon/set/attack.
- T-072: Determinism and mutation safety tests added. Dedicated guards now verify same initial state plus same commands gives identical reducer results, same seed gives identical opening hands, representative reducer commands do not mutate deep-frozen inputs, and engine runtime modules do not call `Math.random` or `Date.now`.
- T-073: Runtime card-text parsing guard added. Engine runtime modules are statically checked for behavior-parser imports/calls, and card `text` access is restricted to catalog/display normalization files rather than effect or rule execution.
- T-074: Playable coverage report added. The report separates full local card-pool size from current playable support, counts vanilla and implemented playable cards, distinguishes unsupported cards from Extra/Fusion scope blocks and deck-validation scope blocks, and reports supported playable deck contents with zero unsupported cards.
- T-075: Final playable-engine audit completed in `docs/playable-engine-audit.md`. Final validation passed, acceptance evidence is recorded, and known limitations are explicit.

## In Progress

- None.

## Next task

None. The queue is complete for the simplified playable-engine scope.

## Validation commands

- `npm run typecheck`: PASS
  - `tsc -b` completed with exit code 0.
- `npm test`: PASS
  - Vitest reported 44 test files passed and 268 tests passed.
- `npm run build`: PASS
  - `tsc -b && vite build` completed with exit code 0.

Not run for T-001 because it is docs-only.

## Known risks

- Current engine is prototype-level.
- Full GOAT support requires scripts/templates, not card-text parsing.
- Unsupported effects must be explicit.
- Only the T-051 scripted Spell cards, T-052 scripted Trap cards, T-053 scripted Monster cards, and T-054 custom staples are marked implemented in the default registry; future implemented status entries require scripts/templates and tests.
- Existing prototype tests use the explicit `allowUnsupportedCards` test/dev escape hatch where they exercise unsupported cards.
- The existing prototype engine state still has legacy serialized side/extra fields; the new core playable state added by T-020 does not include Side Deck or Extra Deck fields.
- T-021 helpers target the new core state model; the prototype reducer has not yet been migrated to these helpers.
- T-022 defines the core typed event model; the prototype reducer still emits its legacy stringly typed `DuelEvent` objects until the compatibility/reducer transition tasks wire it over.
- T-023 keeps the existing `shuffleSeeded` compatibility wrapper, backed by the new serializable RNG state.
- T-030 implements core phase flow; the legacy UI facade still has compatibility phase code until frontend routing moves fully to core reducer behavior.
- T-031 implements core summon/set/flip summon rules; the legacy UI facade still has compatibility summon code until frontend routing moves fully to core reducer behavior.
- T-034 implements core terminal win/loss conditions; Ring of Destruction from T-054 now also covers simultaneous 0 LP draw handling for equal effect damage.
- T-040 adds the executable script registry shape, and production entries must remain backed by tested templates/scripts.
- T-041 auto-generates vanilla monster scripts from structured classifications only; scripted non-vanilla effects remain future work.
- T-042 missing-effect rejection still guards unsupported effects and keeps those activations explicit/non-mutating.
- T-043 adds priority windows and pass tracking, but full chain creation/resolution remains T-044.
- T-044 creates and resolves chain links; T-051/T-052/T-053 and T-054 now resolve basic Spell, Trap, Monster, source-counter, declared-Type, Graveyard-return, battle-participant banish, pending-battle ATK, attacker battle-ATK effect-damage, target current-ATK damage, Graveyard-target special summon, source placement into a Spell/Trap Zone, target control transfer, owner control return, and linked-card cleanup payload steps, while broader custom card payloads remain future tasks.
- T-045 adds cost/target/prompt plumbing, now used by T-051 Spell templates for discard costs and targeting.
- T-046 queues simple fixture/scripted trigger effects and prompts optional triggers. Jinzo from T-054 now lets active continuous effects suppress Trap trigger candidates, but broader trigger timing policy remains future work.
- T-047 validates Damage Step activation legality and tracks substep state, but battle still resolves atomically until future prompt/response-window work exposes mid-battle decisions.
- T-048 provides reusable foundations and fixture-script tests for ongoing effects, but production card scripts still need to opt into these templates one card at a time with tests.
- T-052 attack/summon response Traps use a basic mandatory trigger path; richer optional response prompts and Counter Trap production scripts remain future work.
- T-053 covers only deterministic basic Monster templates and four production Monster scripts; richer effects such as Sangan, Mystic Tomato, Airknight Parshath, Tsukuyomi, and Spirit Reaper remain unsupported until future script/template tasks implement and test them.
- T-054 custom staples are complete for the current priority list; Metamorphosis, Thousand-Eyes Restrict, and Extra/Fusion Deck paths remain explicitly out of scope.
- T-050/T-051/T-052/T-053/T-054 keep unimplemented Monster effects, Rituals, Fusions, unimplemented Spells, and unimplemented Traps out of the supported pool until future script/template tasks implement and test them.
- Pre-existing local source changes are present in src/engine/duel.ts and src/engine/__tests__/engine.test.ts; T-023 worked with the current tree and did not revert them.
