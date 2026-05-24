# GOAT Engine Task Queue

## Short goal

Build a deterministic backend/game engine for the existing Yu-Gi-Oh! frontend so two players can play with **exactly 40-card Main Decks**, **no Side Deck**, and **no Extra/Fusion Deck**. The engine must support legal actions, phases, card effects for implemented cards, explicit unsupported-card handling, and frontend integration through an adapter rather than a rewrite.

## Scope decisions

These decisions intentionally simplify the original architecture into the fastest reliable path to a playable game.

### In scope

- Two-player duel engine.
- Exactly 40 cards per player.
- Main Deck only.
- No Side Deck.
- No Extra Deck / Fusion Deck.
- Existing frontend remains recognizable.
- Deterministic reducer-style engine.
- Serializable state.
- Legal action generation.
- Prompts for choices, targets, costs, discards, tributes, and chain responses.
- Card behavior through scripts/templates only.
- Unsupported card effects are explicit and blocked.
- Deck builder / duel start prevents unsupported cards from entering playable decks unless in developer/test mode.
- The first production-ready goal is playable 40-card duels, not perfect 1,704-card automation.

### Out of scope for this task queue

- Side Deck.
- Extra Deck / Fusion Deck.
- Full match siding.
- Best-of-three match flow.
- Automated AI opponent beyond test/dev helpers.
- Runtime parsing of card text.
- Full 1,704-card implementation as a blocker for playability.
- Generating 1,704 one-off files.
- Rewriting the frontend.
- Full tournament platform features.

### Deck policy

- Main Deck size is **exactly 40**.
- No Side Deck input.
- No Extra Deck input.
- Deck validation rejects non-implemented effect cards in normal playable mode.
- Developer/test mode may allow unsupported cards only when the test expects explicit unsupported behavior.
- Forbidden/limited/semi-limited handling may still exist as metadata, but the immediate playable-mode constraint is:
  - exactly 40 cards
  - only cards in the supported implementation registry
  - no side/extra/fusion deck

## Source references

Keep these available in docs and tests:

- https://goatworld.community/wiki/game-rules
- https://goatworld.community/wiki/card-pool
- https://goatworld.community/wiki/banlist
- https://goatworld.community/wiki/what-is-goat-format

## Queue operating rules for Codex

Codex must follow these rules for every run.

1. Open this file.
2. Find the first task whose status is not `DONE`.
3. Complete exactly that task.
4. Do not skip ahead.
5. Do not broaden scope.
6. If a task is too large, complete the smallest coherent subpart, mark it `IN_PROGRESS`, document what remains, and stop at a green state.
7. Never mark a task `DONE` unless its acceptance criteria pass.
8. Update this file after the task.
9. Update `docs/implementation-status.md` after the task.
10. Preserve existing tests.
11. Do not weaken tests to pass.
12. Do not parse card text at runtime.
13. Do not use card names as primary IDs.
14. Do not put rules inside React components.
15. Do not mutate reducer input state.
16. Do not use `Math.random` or `Date.now` in the reducer path.
17. Do not mark a card effect implemented without a script/template and tests.

## Validation commands

Run after every implementation task unless the task is explicitly docs-only:

```sh
npm run typecheck
npm test
npm run build
```

## Status values

Use only:

- `TODO`
- `IN_PROGRESS`
- `DONE`
- `BLOCKED`

---

# Codex kickoff prompt

Copy/paste this into Codex to start or continue the queue:

```txt
You are working in repo `dimitricritsinelis/yugioh-card-game`.

Goal:
Clear `docs/list_of_task.md` in order, one task per run, while keeping the repo green.

Instructions:
1. Open `docs/list_of_task.md`.
2. Find the first task whose status is not `DONE`.
3. Complete exactly that one task.
4. Do not skip ahead.
5. Do not broaden scope beyond the current task.
6. If the task is too large, complete the smallest coherent subpart, mark it `IN_PROGRESS`, document what remains, and stop at a green state.
7. Never mark a task `DONE` unless its acceptance criteria pass.
8. Update `docs/list_of_task.md`.
9. Update `docs/implementation-status.md`.
10. Run validation commands unless docs-only:
   - npm run typecheck
   - npm test
   - npm run build

Hard constraints:
- Exactly 40-card Main Decks only.
- No Side Deck.
- No Extra/Fusion Deck.
- No runtime card-text parsing.
- No card-name primary keys.
- No React rule logic.
- No reducer input mutation.
- No silent unsupported effects.
- No card marked implemented without tests.

Stop after completing one task and report:
- task ID completed
- files changed
- commands run
- pass/fail result
- next task ID
```

# Codex continuation prompt

Use this if Codex gets stuck or the task is too large:

```txt
Continue from the last green state. Open `docs/list_of_task.md`, find the current `IN_PROGRESS` task or first non-DONE task, and complete only the next coherent subpart. Preserve completed work. Do not restart or redesign. Stop after updating the task queue and running required validation commands.
```

---

# Phase 0: Documentation and baseline

## T-000: Save concise engine contract

Status: DONE

Goal:
Create concise permanent docs for the simplified playable-engine scope.

Files:
- `docs/goat-engine-contract.md`
- `docs/implementation-status.md`

Actions:
1. Create `docs/goat-engine-contract.md`.
2. State the simplified scope:
   - exactly 40-card Main Decks
   - no Side Deck
   - no Extra/Fusion Deck
   - deterministic reducer engine
   - card scripts/templates only
   - explicit unsupported behavior
   - frontend adapter, not rewrite
3. Create `docs/implementation-status.md`.
4. Record current phase as "Playable engine scope saved. Foundation not started."
5. Do not modify source code.

Acceptance:
- Both docs exist.
- Docs clearly state no side/extra deck and exactly 40 cards.
- No source files changed.

---

## T-001: Save this task queue in the repo

Status: DONE

Goal:
Save this queue so Codex can iterate through it.

Files:
- `docs/list_of_task.md`
- `docs/implementation-status.md`

Actions:
1. Create or replace `docs/list_of_task.md` with this file.
2. Update `docs/implementation-status.md` to reference the queue.
3. Mark T-000 as `DONE` if contract docs already exist and match this scope.
4. Mark T-001 as `DONE` only after the queue exists in the repo.

Acceptance:
- `docs/list_of_task.md` exists.
- `docs/implementation-status.md` references it.
- No source files changed except docs.

---

## T-002: Capture current baseline

Status: DONE

Goal:
Record the current repo state before engine changes.

Files:
- `docs/implementation-status.md`

Actions:
1. Run `npm run typecheck`.
2. Run `npm test`.
3. Run `npm run build`.
4. Record command results in `docs/implementation-status.md`.
5. If any command fails before changes, record the failure and fix only if it blocks later work.

Acceptance:
- Baseline command outputs are recorded.
- No source files changed except docs.

---

# Phase 1: Data catalog and exact-40 deck validation

## T-010: Create normalized engine card catalog

Status: DONE

Goal:
Create engine-safe card definitions independent of UI card types.

Files:
- `src/engine/data/cardCatalog.ts`
- `src/engine/data/normalizeCard.ts`
- `src/engine/__tests__/cardCatalog.test.ts`
- `src/engine/index.ts`

Actions:
1. Define `CardDefinition`, `MonsterDefinition`, `SpellTrapDefinition`, and `CardKind`.
2. Normalize raw `CardRecord` from `src/types.ts`.
3. Use passcode/cardId as primary identity.
4. Preserve original text for display only.
5. Do not infer executable behavior from card text.
6. Add tests for monster, spell, trap, ritual monster if present, and fusion monster if present as catalog data only.

Acceptance:
- Catalog normalizes representative cards.
- No runtime behavior is parsed from text.
- Validation commands pass.

---

## T-011: Harden deck validation for simplified playable mode

Status: DONE

Goal:
Validate playable decks as exactly 40 implemented Main Deck cards, with no side or extra deck.

Files:
- `src/engine/deckValidation.ts`
- `src/engine/__tests__/deckValidation.test.ts`
- `src/engine/data/goatBanlist.ts` if needed

Actions:
1. Require Main Deck length exactly 40.
2. Remove Side Deck validation from playable mode.
3. Remove Extra/Fusion Deck validation from playable mode.
4. Reject any Side Deck input.
5. Reject any Extra Deck input.
6. Reject Fusion Monsters in playable Main Deck unless the engine explicitly supports them as Main Deck cards, which it should not in this scope.
7. Enforce card copy limits from local card metadata.
8. Keep banlist/restriction support if already present, but do not let it complicate the exact-40 no-side/no-extra scope.
9. Add tests:
   - 39 cards fails.
   - 40 cards passes when all cards are supported and copy limits are legal.
   - 41 cards fails.
   - Side Deck input fails.
   - Extra Deck input fails.
   - unsupported card in playable deck fails.
   - duplicate over copy limit fails.

Acceptance:
- Deck validation enforces exactly 40 cards.
- No Side Deck is accepted.
- No Extra Deck is accepted.
- Validation commands pass.

---

## T-012: Add supported-card gate for playable decks

Status: DONE

Goal:
Prevent playable decks from including cards whose effects are not implemented.

Files:
- `src/engine/cards/coverage.ts`
- `src/engine/cards/registry.ts`
- `src/engine/deckValidation.ts`
- `src/engine/__tests__/supportedDeckGate.test.ts`

Actions:
1. Add coverage statuses:
   - `implemented`
   - `vanilla`
   - `unsupported`
   - `blockedNoExtraDeck`
   - `blockedByScope`
2. Add helper `isPlayableCard(cardId)`.
3. Vanilla normal monsters are playable through the vanilla template.
4. Implemented effect cards are playable.
5. Unsupported cards are not playable in normal mode.
6. Cards requiring Extra/Fusion Deck are `blockedNoExtraDeck`.
7. Add tests for each status.

Acceptance:
- Playable deck validation checks support status.
- Unsupported cards cannot enter playable decks.
- Cards can still exist in the catalog for display.
- Validation commands pass.

---

# Phase 2: Engine state, reducer, events, and zones

## T-020: Define core engine domain types

Status: DONE

Goal:
Add the minimum domain model needed for gameplay.

Files:
- `src/engine/core/state.ts`
- `src/engine/core/cardRefs.ts`
- `src/engine/commands.ts`
- `src/engine/result.ts`
- `src/engine/errors.ts`
- `src/engine/types.ts`

Actions:
1. Define `DuelState`.
2. Define `PlayerState`.
3. Define `CardInstance`.
4. Define `ZoneCard`.
5. Define `ZoneRef`.
6. Define `EngineCommand`.
7. Define `EngineResult`.
8. Include only Main Deck, Hand, Monster Zones, Spell/Trap Zones, Graveyard, Banished, and Field Zone if needed.
9. Do not include Side Deck or Extra Deck fields.
10. Keep state serializable.

Acceptance:
- Types compile.
- No side/extra state exists in the core playable state.
- Validation commands pass.

---

## T-021: Add immutable zone operations

Status: DONE

Goal:
Create safe card movement helpers.

Files:
- `src/engine/core/zones.ts`
- `src/engine/core/invariants.ts`
- `src/engine/core/clone.ts`
- `src/engine/__tests__/zones.test.ts`

Actions:
1. Implement find card by instance ID.
2. Implement remove from zone.
3. Implement insert into zone.
4. Implement move between zones.
5. Implement reveal/face-up/face-down updates.
6. Implement monster position updates.
7. Implement invariant checks:
   - no duplicate instance IDs
   - max 5 Monster Zones
   - max 5 Spell/Trap Zones
   - exactly one location per card
8. Add deep-freeze tests proving no input mutation.

Acceptance:
- Zone tests pass.
- No helper mutates input state.
- Validation commands pass.

---

## T-022: Add typed event model

Status: DONE

Goal:
Emit structured events with readable messages for the UI action log.

Files:
- `src/engine/events.ts`
- `src/engine/eventQueries.ts`
- `src/engine/__tests__/events.test.ts`

Actions:
1. Define event types for:
   - duel started
   - turn started
   - phase changed
   - card drawn
   - card moved
   - summon declared
   - summon successful
   - monster set
   - spell/trap set
   - position changed
   - attack declared
   - battle damage
   - card destroyed
   - card banished
   - LP changed
   - effect activated
   - cost paid
   - targets chosen
   - chain link created
   - chain resolved
   - prompt created/resolved
   - player lost
   - duel finished
   - illegal action
   - effect not implemented
2. Every event must have a readable `message`.
3. Add structured metadata where applicable.
4. Add event query helpers.

Acceptance:
- Event tests pass.
- Event messages can drive existing action log.
- Validation commands pass.

---

## T-023: Add deterministic RNG and shuffle

Status: DONE

Goal:
Make shuffling deterministic and serializable.

Files:
- `src/engine/random.ts`
- `src/engine/__tests__/random.test.ts`

Actions:
1. Add serializable `RngState`.
2. Add deterministic shuffle returning new RNG state.
3. Remove or isolate non-deterministic engine shuffling.
4. Add tests:
   - same seed produces same order.
   - different seed produces different order.
   - shuffle does not mutate input.

Acceptance:
- Random tests pass.
- No `Math.random` in engine path.
- Validation commands pass.

---

## T-024: Add reducer shell

Status: DONE

Goal:
Create one deterministic engine entry point.

Files:
- `src/engine/reducer.ts`
- `src/engine/serialization.ts`
- `src/engine/index.ts`
- `src/engine/__tests__/reducer.test.ts`

Actions:
1. Implement `createDuel`.
2. Implement `reduceDuel(state, command)`.
3. Support initial 40-card decks.
4. Draw opening hands.
5. Start on Draw Phase.
6. Return `{ state, events, prompts, errors }`.
7. Never mutate input state.
8. Do not support side or extra deck inputs.

Acceptance:
- Duel can be created with two exact 40-card decks.
- Opening hands are deterministic.
- Reducer does not mutate input state.
- Validation commands pass.

---

## T-025: Convert existing duel API to compatibility facade

Status: DONE

Goal:
Keep existing UI and tests compiling while engine transitions to reducer.

Files:
- `src/engine/duel.ts`
- `src/engine/index.ts`
- `src/gameLogic.ts`
- `src/engine/__tests__/engine.test.ts`

Actions:
1. Keep existing exported functions where practical.
2. Route behavior through the new reducer.
3. Do not preserve old behavior if it silently resolves missing effects.
4. Add compatibility wrappers only where needed.
5. Keep frontend compiling.

Acceptance:
- Existing tests either pass or are updated to the new reducer behavior.
- App compiles.
- Validation commands pass.

---

# Phase 3: Basic gameplay rules

## T-030: Implement phase and turn flow

Status: DONE

Goal:
Implement the basic turn loop.

Files:
- `src/engine/rules/phases.ts`
- `src/engine/rules/endPhase.ts`
- `src/engine/reducer.ts`
- `src/engine/__tests__/phaseFlow.test.ts`

Actions:
1. Implement Draw Phase.
2. Implement Standby Phase placeholder.
3. Implement Main Phase 1.
4. Implement Battle Phase.
5. Implement Main Phase 2.
6. Implement End Phase.
7. Implement first-turn GOAT draw behavior.
8. Implement End Phase discard to 6.
9. Add tests for normal phase flow and turn passing.

Acceptance:
- Turn can progress through all phases.
- New turn starts correctly.
- Hand-size discard works.
- Validation commands pass.

---

## T-031: Implement Normal Summon, Tribute Summon, Set, and Flip Summon

Status: DONE

Goal:
Support basic monster play.

Files:
- `src/engine/rules/summons.ts`
- `src/engine/reducer.ts`
- `src/engine/__tests__/summons.test.ts`

Actions:
1. Implement Normal Summon.
2. Implement Tribute Summon.
3. Implement monster Set.
4. Implement Tribute Set.
5. Implement Flip Summon.
6. Enforce one Normal Summon/Set per turn.
7. Enforce tribute counts by level.
8. Do not implement Fusion/Extra Deck summons.
9. Add tests for legal and illegal cases.

Acceptance:
- Main Deck monsters can be summoned/set.
- Tribute rules work.
- No Extra Deck summon path exists.
- Validation commands pass.

---

## T-032: Implement manual battle-position changes

Status: DONE

Goal:
Support manual position changes in Main Phases.

Files:
- `src/engine/rules/positionChange.ts`
- `src/engine/reducer.ts`
- `src/engine/__tests__/positionChange.test.ts`

Actions:
1. Allow manual position change during Main Phase 1 or Main Phase 2.
2. Block if summoned/set this turn.
3. Block if attacked this turn.
4. Block if already manually changed this turn.
5. Allow card effects to change position through separate effect operations later.

Acceptance:
- Manual position restrictions pass tests.
- Validation commands pass.

---

## T-033: Implement battle flow

Status: DONE

Goal:
Support basic attacking and battle resolution.

Files:
- `src/engine/rules/battle.ts`
- `src/engine/reducer.ts`
- `src/engine/__tests__/battle.test.ts`

Actions:
1. Implement attack declaration.
2. Implement direct attack only if opponent controls no monsters.
3. Implement attack vs attack.
4. Implement attack vs defense.
5. Flip face-down defender before damage calculation.
6. Apply battle damage.
7. Destroy monsters by battle.
8. Preserve 0 ATK vs 0 ATK destruction behavior.
9. Mark monster as attacked.

Acceptance:
- Battle tests pass.
- Basic duels can deal damage and destroy monsters.
- Validation commands pass.

---

## T-034: Implement win/loss conditions

Status: DONE

Goal:
Finish basic terminal states.

Files:
- `src/engine/rules/winConditions.ts`
- `src/engine/reducer.ts`
- `src/engine/__tests__/winConditions.test.ts`

Actions:
1. LP reaches 0 means loss.
2. Failed required draw from empty deck means loss.
3. Exodia win condition only if Exodia cards are implemented in the supported registry.
4. Once duel is finished, block normal gameplay commands.

Acceptance:
- LP-zero test passes.
- Deck-out test passes.
- Finished duel blocks actions.
- Validation commands pass.

---

# Phase 4: Effects, priority, chain, prompts

## T-040: Add card script type and registry

Status: DONE

Goal:
Create the executable card behavior registry.

Files:
- `src/engine/cards/CardScript.ts`
- `src/engine/cards/registry.ts`
- `src/engine/cards/scripts/index.ts`
- `src/engine/__tests__/scriptRegistry.test.ts`

Actions:
1. Define `CardScript`.
2. Define `EffectDefinition`.
3. Register scripts by passcode/cardId.
4. Reject duplicate script registrations.
5. Add lookup helpers.
6. Add tests for known/unknown scripts.

Acceptance:
- Registry works.
- Duplicate scripts fail tests.
- Validation commands pass.

---

## T-041: Add vanilla monster template

Status: DONE

Goal:
Make normal monsters playable.

Files:
- `src/engine/cards/templates/vanillaMonster.ts`
- `src/engine/cards/scripts/index.ts`
- `src/engine/__tests__/vanillaMonster.test.ts`

Actions:
1. Auto-register normal monsters with no effect text.
2. Allow summon/set/battle/position change.
3. Do not expose activatable effects.
4. Add tests with representative normal monsters.

Acceptance:
- Vanilla monsters are playable.
- They have no effect activation.
- Validation commands pass.

---

## T-042: Add explicit missing-effect rejection

Status: DONE

Goal:
Prevent silent no-op effects.

Files:
- `src/engine/cards/unsupported.ts`
- `src/engine/reducer.ts`
- `src/engine/__tests__/missingScript.test.ts`

Actions:
1. If a card has no effect script and a player tries to activate/use an effect, emit `EFFECT_NOT_IMPLEMENTED`.
2. Leave state unchanged.
3. Add regression test for current silent Spell activation behavior.
4. Deck validation should block unsupported cards in normal playable mode.

Acceptance:
- Missing effects are explicit.
- State does not change on unsupported activation.
- Validation commands pass.

---

## T-043: Implement priority windows

Status: DONE

Goal:
Add priority state sufficient for real card effects.

Files:
- `src/engine/rules/priority.ts`
- `src/engine/reducer.ts`
- `src/engine/__tests__/priority.test.ts`

Actions:
1. Add priority holder state.
2. Add `PASS_PRIORITY` command.
3. Add priority after phase start.
4. Add priority after successful summon.
5. Add priority after chain resolution.
6. Add tests for turn-player priority and both-player pass.

Acceptance:
- Priority tests pass.
- Validation commands pass.

---

## T-044: Implement chain and Spell Speed

Status: DONE

Goal:
Support chained effects.

Files:
- `src/engine/rules/chain.ts`
- `src/engine/rules/spellSpeed.ts`
- `src/engine/reducer.ts`
- `src/engine/__tests__/chain.test.ts`
- `src/engine/__tests__/spellSpeed.test.ts`

Actions:
1. Add chain state.
2. Add chain link creation.
3. Add LIFO chain resolution.
4. Enforce Spell Speed 1/2/3 legality.
5. Add tests for:
   - Spell Speed 1 cannot chain manually.
   - Spell Speed 2 can chain to 1 or 2.
   - Spell Speed 3 can chain to 1, 2, or 3.
   - Chain resolves LIFO.

Acceptance:
- Chain tests pass.
- Spell Speed tests pass.
- Validation commands pass.

---

## T-045: Implement costs, targets, and prompts

Status: DONE

Goal:
Enable scripts that need choices.

Files:
- `src/engine/effects/costs.ts`
- `src/engine/effects/targets.ts`
- `src/engine/prompts/prompt.ts`
- `src/engine/prompts/selection.ts`
- `src/engine/reducer.ts`
- `src/engine/__tests__/costsTargetsPrompts.test.ts`

Actions:
1. Implement cost types:
   - none
   - discard
   - tribute
   - pay LP
   - send to Graveyard
   - banish from Graveyard
   - reveal
2. Implement target specs:
   - card target
   - player target
   - own/opponent
   - monster/spell/trap
   - face-up/face-down
   - exact/up-to counts
3. Implement prompts:
   - choose cards
   - choose targets
   - yes/no
   - discard to hand size
   - chain response
4. Store chosen targets at activation.
5. Recheck target validity on resolution.

Acceptance:
- Cost tests pass.
- Target invalidation tests pass.
- Prompt tests pass.
- Validation commands pass.

---

## T-046: Implement simple trigger collection

Status: DONE

Goal:
Support common trigger effects without overbuilding.

Files:
- `src/engine/rules/triggers.ts`
- `src/engine/reducer.ts`
- `src/engine/__tests__/triggers.test.ts`

Actions:
1. Collect triggers after completed action batches and chain resolution.
2. Support mandatory and optional triggers.
3. Support turn-player/opponent ordering.
4. Add prompts for optional triggers where needed.
5. Add tests with simple fixture triggers.

Acceptance:
- Trigger tests pass.
- Optional trigger prompt works.
- Validation commands pass.

---

## T-047: Implement Damage Step restrictions

Status: DONE

Goal:
Prevent illegal Damage Step activations and support common legal ones.

Files:
- `src/engine/rules/damageStep.ts`
- `src/engine/rules/battle.ts`
- `src/engine/__tests__/damageStep.test.ts`

Actions:
1. Add Damage Step substep state.
2. Default effects cannot activate in Damage Step.
3. Allow Counter Traps where legal.
4. Allow direct ATK/DEF modifiers where scripted.
5. Add tests for illegal Mirror Force/Ring/Sakuretsu-style activations in Damage Step using fixtures or implemented cards.

Acceptance:
- Damage Step tests pass.
- Validation commands pass.

---

## T-048: Implement continuous, replacement, and lingering foundations

Status: DONE

Goal:
Support ongoing effects needed by common playable cards.

Files:
- `src/engine/effects/continuous.ts`
- `src/engine/effects/replacement.ts`
- `src/engine/effects/lingering.ts`
- `src/engine/rules/stateBasedCleanup.ts`
- `src/engine/__tests__/continuousReplacementLingering.test.ts`

Actions:
1. Implement derived ATK/DEF modifiers.
2. Implement attack restrictions.
3. Implement simple destruction prevention/replacement.
4. Implement lingering until End Phase.
5. Implement source cleanup when source leaves field.
6. Add tests using fixture scripts.

Acceptance:
- Continuous modifier tests pass.
- Replacement tests pass.
- Lingering expiry tests pass.
- Validation commands pass.

---

# Phase 5: Card scripts for playable decks

## T-050: Define initial supported playable card pool

Status: DONE

Goal:
Choose the supported card pool needed to play stable 40-card duels.

Files:
- `src/engine/cards/supportedCards.ts`
- `src/engine/cards/coverage.ts`
- `docs/implementation-status.md`
- `src/engine/__tests__/supportedCards.test.ts`

Actions:
1. Build a supported card list from:
   - cards in the default/local test decks
   - normal monsters
   - core simple GOAT staples that the engine can support reliably
2. Exclude cards requiring Extra/Fusion Deck.
3. Exclude unsupported complex cards until scripted.
4. Ensure supported cards can form at least two valid 40-card decks.
5. Add tests that each default/playable deck contains exactly 40 supported cards.

Acceptance:
- At least two exact-40 playable decks exist.
- No supported deck contains unsupported cards.
- No supported deck uses Side/Extra cards.
- Validation commands pass.

---

## T-051: Implement basic Spell templates

Status: DONE

Goal:
Implement common Spell behaviors needed for playable decks.

Files:
- `src/engine/cards/templates/normalSpell.ts`
- `src/engine/cards/templates/quickPlaySpell.ts`
- `src/engine/cards/scripts/spells.ts`
- `src/engine/__tests__/spellTemplates.test.ts`
- `src/engine/__tests__/spellCards.test.ts`

Actions:
Implement and test template behavior for supported cards only:
1. Draw N cards.
2. Discard then draw.
3. Destroy target Spell/Trap.
4. Destroy all Spell/Trap cards.
5. Destroy target monster.
6. Change battle position.
7. Flip target face-down or face-up.
8. Return card to hand.
9. Burn damage or LP gain if needed by supported cards.

Representative cards if included in supported pool:
- Pot of Greed
- Graceful Charity
- Heavy Storm
- Mystical Space Typhoon
- Nobleman of Crossout
- Book of Moon
- Upstart Goblin
- Lightning Vortex

Acceptance:
- Supported Spell cards have tests.
- Unsupported Spell cards remain blocked.
- Validation commands pass.

---

## T-052: Implement basic Trap templates

Status: DONE

Goal:
Implement common Trap behaviors needed for playable decks.

Files:
- `src/engine/cards/templates/normalTrap.ts`
- `src/engine/cards/templates/continuousTrap.ts`
- `src/engine/cards/templates/counterTrap.ts`
- `src/engine/cards/scripts/traps.ts`
- `src/engine/__tests__/trapTemplates.test.ts`
- `src/engine/__tests__/trapCards.test.ts`

Actions:
Implement and test template behavior for supported cards only:
1. Set Trap.
2. Cannot activate Trap the turn it was set.
3. Respond to attack declaration.
4. Respond to summon.
5. Destroy attacking monster.
6. Destroy all opponent attack-position monsters.
7. Negate attack.
8. Counter Trap negation if included.
9. Continuous attack restriction if included.

Representative cards if included:
- Mirror Force
- Torrential Tribute
- Sakuretsu Armor
- Waboku
- Magic Cylinder
- Dust Tornado
- Seven Tools of the Bandit
- Magic Jammer
- Gravity Bind
- Royal Decree if supported

Acceptance:
- Supported Trap cards have timing tests.
- Trap timing is enforced.
- Unsupported Traps remain blocked.
- Validation commands pass.

---

## T-053: Implement basic Monster templates

Status: DONE

Goal:
Implement common monster behaviors needed for playable decks.

Files:
- `src/engine/cards/templates/flipEffect.ts`
- `src/engine/cards/templates/recruiter.ts`
- `src/engine/cards/templates/searcher.ts`
- `src/engine/cards/templates/spirit.ts`
- `src/engine/cards/templates/statModifier.ts`
- `src/engine/cards/scripts/monsters.ts`
- `src/engine/__tests__/monsterTemplates.test.ts`
- `src/engine/__tests__/monsterCards.test.ts`

Actions:
Implement and test supported monster templates only:
1. Flip draw.
2. Flip destroy target monster.
3. Flip return Spell from Graveyard to hand.
4. Recruiter destroyed by battle and sent to Graveyard.
5. Sent-from-field-to-Graveyard search trigger.
6. Spirit return at End Phase.
7. Self-tribute ignition.
8. Discard-cost ignition.
9. Piercing battle damage.
10. Direct attack if needed.

Representative cards if included:
- Sangan
- Magician of Faith
- Dekoichi the Battlechanted Locomotive
- Mystic Tomato
- Shining Angel
- Giant Rat
- Exiled Force
- Don Zaloog
- Airknight Parshath
- Tsukuyomi
- Old Vindictive Magician
- Spirit Reaper

Acceptance:
- Supported Monster cards have tests.
- Unsupported effect monsters remain blocked.
- Validation commands pass.

---

## T-054: Implement priority/custom staple cards for supported decks

Status: DONE

Goal:
Script the key non-template cards needed for playable decks.

Files:
- `src/engine/cards/scripts/custom/staples.ts`
- `src/engine/__tests__/customStaples.test.ts`
- `src/engine/__tests__/customTimingScenarios.test.ts`

Actions:
Implement only supported custom cards. Prioritize:
1. Breaker the Magical Warrior.
2. Tribe-Infecting Virus.
3. Sinister Serpent.
4. D. D. Warrior Lady.
5. Injection Fairy Lily if supported.
6. Reflect Bounder if supported.
7. Jinzo if supported.
8. Ring of Destruction if supported.
9. Call of the Haunted if supported.
10. Premature Burial if supported.
11. Snatch Steal if supported.

Progress:
- DONE: Breaker the Magical Warrior is scripted by passcode/cardId with tested Normal Summon Spell Counter placement, counter-gated ATK gain, counter-removal cost, and targeted Spell/Trap destruction.
- DONE: Tribe-Infecting Virus is scripted by passcode/cardId with tested discard cost, declared monster Type effects, face-up Type matching from structured monster metadata, and self-destruction when Aqua is declared.
- DONE: Sinister Serpent is scripted by passcode/cardId with tested optional controller Standby Phase return from Graveyard to hand, decline behavior, and opponent-turn non-trigger behavior.
- DONE: D. D. Warrior Lady is scripted by passcode/cardId with tested post-battle optional banish behavior for itself and the battled monster, including declined-trigger behavior.
- DONE: Injection Fairy Lily is scripted by passcode/cardId with tested optional 2000 LP payment, pending-battle-only ATK boost, boosted battle outcome, and declined-trigger normal battle behavior.
- DONE: Reflect Bounder is scripted by passcode/cardId with a tested attacked-while-in-Attack-Position trigger, battle-ATK effect damage to the attacking player, post-damage self-destruction when still on field, and non-trigger cases for attacking or Defense Position.
- DONE: Jinzo is scripted by passcode/cardId with tested face-up Trap activation restriction, Trap trigger suppression, and face-up Continuous Trap effect negation.
- DONE: Ring of Destruction is scripted by passcode/cardId with tested face-up monster targeting, current-ATK damage to both players, target destruction, source Trap movement to Graveyard, invalid face-down target rejection, and simultaneous 0 LP draw handling.
- DONE: Call of the Haunted is scripted by passcode/cardId with tested own-Graveyard monster revival, Continuous Trap field persistence, source/target attachment links, cleanup when Call leaves the field, cleanup when the revived monster is destroyed by battle, and activation blocking when no Monster Zone is open.
- DONE: Premature Burial is scripted by passcode/cardId with tested 800 LP activation cost, own-Graveyard monster revival, Equip Spell placement from hand into a Spell/Trap Zone, source/target attachment links, cleanup when Premature Burial is destroyed, cleanup when the revived monster is destroyed by battle, and activation blocking when no Spell/Trap Zone is open.
- DONE: Snatch Steal is scripted by passcode/cardId with tested opponent face-up monster targeting, Equip Spell placement from hand into a Spell/Trap Zone, control transfer into an open Monster Zone, source/target attachment links, owner control return when Snatch Steal is destroyed, Snatch Steal cleanup when the equipped monster is destroyed by battle, opponent Standby Phase LP gain, and activation blocking when no Monster Zone is open.

Remaining:
- None.

Do not implement:
- Metamorphosis.
- Thousand-Eyes Restrict.
- Extra/Fusion Deck cards.
- Cards that require Side/Extra deck support.

Acceptance:
- Each supported custom card has behavior tests.
- Unsupported custom cards are blocked from playable decks.
- Validation commands pass.

---

## T-055: Add playable deck fixtures

Status: DONE

Goal:
Provide two reliable exact-40 decks using only supported cards.

Files:
- `src/engine/testing/playableDecks.ts`
- `src/engine/__tests__/playableDecks.test.ts`
- `src/gameLogic.ts` if default deck selection needs adjustment

Actions:
1. Create two exact-40 deck lists.
2. Use only supported cards.
3. Respect copy limits.
4. Use no Side Deck.
5. Use no Extra Deck.
6. Make the decks tactically simple enough for engine testing.
7. Wire default local duel setup to these decks if needed.

Acceptance:
- Both decks validate.
- Both decks can start a duel.
- No unsupported cards appear.
- Validation commands pass.

Progress:
- DONE: Added two explicit exact-40 passcode/cardId fixture decks for Yugi and Seto Kaiba under `src/engine/testing/playableDecks.ts`.
- DONE: Fixture decks omit Side and Extra Decks, use only supported implemented/vanilla cards, respect copy limits, validate with `validateDeck`, and can start a core duel.
- DONE: Default local game setup now randomly assigns these playable fixture decks instead of resolving unsupported legacy presets with filler.
- DONE: Added fixture/default setup tests in `src/engine/__tests__/playableDecks.test.ts` and updated the existing default-game expectation.

---

# Phase 6: Frontend integration

## T-060: Add frontend adapter selectors

Status: DONE

Goal:
Project engine state into the existing UI shape.

Files:
- `src/engine/adapters/frontendAdapter.ts`
- `src/engine/adapters/viewSelectors.ts`
- `src/gameLogic.ts`
- `src/engine/__tests__/frontendAdapter.test.ts`

Actions:
1. Convert engine state to current board/hand/graveyard/banished view.
2. Preserve hidden opponent hand/deck information.
3. Map legal engine commands to UI actions.
4. Map engine events to action log messages.
5. Do not put rules in React components.

Acceptance:
- Adapter tests pass.
- Existing UI can render projected state.
- Validation commands pass.

Progress:
- DONE: Added frontend adapter selectors under `src/engine/adapters/` to project player board, hand, Graveyard, Banished, opponent counts/hidden zones, legal placement actions, unavailable hand cards, selected-card lookup, and action-log messages from engine state.
- DONE: Moved existing `src/gameLogic.ts` projection helpers onto the adapter layer so React-facing game logic consumes selector output instead of duplicating projection details.
- DONE: Added adapter tests covering frontend projection shape, hidden opponent hand/deck/face-down information, legal play-card action mapping, event-to-log mapping, selected-card lookup, and unavailable hand cards.

---

## T-061: Route phase, summon, set, attack, and move actions through engine

Status: DONE

Goal:
Move basic UI gameplay actions onto the reducer.

Files:
- `src/App.tsx`
- `src/gameLogic.ts`
- `src/components/Board.tsx` if needed
- `src/components/Hand.tsx` if needed
- `src/engine/__tests__/frontendAdapter.test.ts`

Actions:
1. Route phase advance through reducer command.
2. Route summon/set through reducer command.
3. Route tribute selection through reducer prompts or adapter.
4. Route attack through reducer command.
5. Route move to Graveyard/banish debug actions through explicit dev commands or remove from normal play.
6. Preserve UI layout.

Acceptance:
- App compiles.
- Basic playable duel actions use engine state.
- Validation commands pass.

Progress:
- DONE: Phase progression, summon/set placement, tribute selection, attacks, LP edits, and debug movement now route through engine actions from `src/gameLogic.ts`.
- DONE: Attack commands are generated by engine legal-action selection, projected through adapter attack targets, and rendered by `Board` without putting attack legality in React components.
- DONE: Hand Graveyard/Banish movement controls are explicit dev-only debug actions and remain backed by the engine `move-card` command.
- DONE: Added frontend routing tests for summon, phase advance, direct attack, debug movement, and hidden monster-zone attack target mapping.

---

## T-062: Add prompt, priority, and chain UI surfaces

Status: DONE

Goal:
Expose engine choices to the player.

Files:
- `src/components/PromptPanel.tsx`
- `src/components/PriorityPanel.tsx`
- `src/components/ChainPanel.tsx`
- `src/components/TargetSelectionOverlay.tsx`
- `src/App.tsx`
- `src/gameLogic.ts`

Actions:
1. Show active prompt with required choices.
2. Allow target selection.
3. Allow discard/tribute selection.
4. Allow yes/no optional effects.
5. Show current priority player.
6. Add Pass Priority button when legal.
7. Show current chain links.
8. Keep UI minimal and functional.

Acceptance:
- App compiles.
- Prompt flow works in adapter tests or manual smoke test.
- Validation commands pass.

Progress:
- DONE: Added `PromptPanel`, `PriorityPanel`, `ChainPanel`, and `TargetSelectionOverlay` UI surfaces with compact rail/overlay styling.
- DONE: Added frontend selectors/handlers for active prompts, target/discard/tribute candidate selection, yes/no and chain-response choices, priority passing, and chain resolution.
- DONE: Bridged pass-priority, answer-prompt, and resolve-chain through the UI-facing engine action facade while syncing prompt and chain state back to the frontend projection.
- DONE: Added adapter tests for prompt display/answering, prompt card candidate mapping, priority passing, and chain view/resolution.
- DONE: Ran a local headless Chrome smoke check against `http://127.0.0.1:5173/?scenario=demo` and verified the new panels render without layout overlap.

---

## T-063: Enforce exact-40 supported-only deck selection in frontend

Status: DONE

Goal:
Prevent unplayable decks from being started in the UI.

Files:
- `src/gameLogic.ts`
- `src/App.tsx`
- deck-related components if present
- `src/engine/__tests__/frontendAdapter.test.ts`

Actions:
1. Ensure default decks are exact 40-card supported decks.
2. If user-selected decks exist, block:
   - not exactly 40 cards
   - unsupported cards
   - Side Deck
   - Extra Deck
3. Show readable error message.
4. Do not start invalid duels.

Acceptance:
- Frontend cannot start invalid decks.
- Validation commands pass.

Progress:
- DONE: Added frontend deck-selection validation before `createInitialGameState` starts a duel, requiring both Player 1 and Player 2 decks.
- DONE: Frontend deck selection now blocks non-40-card Main Decks, Side Deck input, Extra Deck input, and unsupported cards in normal playable mode with readable errors.
- DONE: Default frontend startup continues to use exact-40 supported playable fixture decks and is validated through the same frontend gate.
- DONE: App setup/reset now shows a readable duel setup error instead of starting from an invalid deck selection.
- DONE: Added adapter tests for valid default/provided decks, unsupported-card rejection, Side/Extra Deck rejection, missing deck rejection, and non-40-card deck rejection.

---

# Phase 7: Golden scenarios and hardening

## T-070: Add test fixture helpers

Status: DONE

Goal:
Make golden scenario tests easy to write.

Files:
- `src/engine/testing/builders.ts`
- `src/engine/testing/scenarioRunner.ts`
- `src/engine/testing/assertions.ts`
- `src/engine/__tests__/testFixtures.test.ts`

Actions:
1. Add helpers:
   - cardByName
   - cardByPasscode
   - createRiggedDuel
   - putCardInHand
   - putMonsterOnField
   - putSpellTrapOnField
   - putCardInGraveyard
   - setPhase
   - setPriorityPlayer
   - expectEvent
   - expectZone
   - expectLP
   - expectChain
2. Keep helpers test-only.

Acceptance:
- Fixture helper tests pass.
- Validation commands pass.

Progress:
- DONE: Added passcode-backed test card lookup and deterministic rigged duel builders under `src/engine/testing/builders.ts`.
- DONE: Added immutable setup helpers for hand, Monster Zones, Spell/Trap Zones, Graveyard, phase, and priority state.
- DONE: Added a reducer scenario runner and Vitest assertion helpers for events, zones, LP, and chain state.
- DONE: Added focused fixture tests proving the helpers build legal exact-40 duels, preserve input state, and drive a direct-attack scenario.

---

## T-071: Add golden gameplay scenarios

Status: DONE

Goal:
Validate real play interactions, not just unit behavior.

Files:
- `src/engine/__tests__/goldenPriorityScenarios.test.ts`
- `src/engine/__tests__/goldenChainScenarios.test.ts`
- `src/engine/__tests__/goldenBattleScenarios.test.ts`
- `src/engine/__tests__/goldenDamageStepScenarios.test.ts`
- `src/engine/__tests__/goldenFrontendSmoke.test.ts`

Actions:
Add scenarios for supported cards only:
1. Summon priority with Tribe-Infecting Virus or fixture equivalent.
2. Breaker counter timing if supported.
3. Torrential Tribute response to summon if supported.
4. MST chained to a Spell/Trap.
5. Mirror Force on attack declaration.
6. Sakuretsu Armor or Waboku timing if supported.
7. Book of Moon target/position interaction if supported.
8. Sangan or recruiter trigger if supported.
9. Spirit return before hand-size discard if supported.
10. Deck-out and LP-zero.

Acceptance:
- Golden tests pass.
- Scenarios use supported cards only.
- Validation commands pass.

Progress:
- DONE: Added golden priority scenarios for post-summon Tribe-Infecting Virus priority and Breaker's summon-trigger counter timing.
- DONE: Added golden chain scenarios for Torrential Tribute on summon, MST chained to a Spell activation, and Book of Moon target/position resolution.
- DONE: Added golden battle scenarios for Mirror Force, Sakuretsu Armor, LP-zero battle finish, and deck-out finish.
- DONE: Added golden Damage Step scenarios for supported Book of Moon activation restrictions and battle cleanup.
- DONE: Added a frontend smoke scenario covering supported deck start, Spell/Trap Set, monster Summon, Battle Phase entry, and direct attack through the adapter.
- DONE: Unsupported listed examples with no production supported script, such as Waboku, Sangan/recruiter, and production Spirit return scenarios, were not asserted because this task requires supported-card scenarios only.

---

## T-072: Add determinism and mutation safety tests

Status: DONE

Goal:
Guard against future engine instability.

Files:
- `src/engine/__tests__/determinism.test.ts`
- `src/engine/__tests__/mutationSafety.test.ts`

Actions:
1. Same initial state + same commands = same final state.
2. Same seed = same opening hands.
3. Reducer input deep-frozen state is not mutated.
4. No `Math.random` in engine modules.
5. No `Date.now` in reducer path.

Acceptance:
- Determinism tests pass.
- Mutation tests pass.
- Validation commands pass.

Progress:
- DONE: Added deterministic command-stream tests proving the same initial state and commands produce the same final state, events, and prompts.
- DONE: Added same-seed opening-hand tests for shuffled exact-40 core duels.
- DONE: Added deep-frozen reducer input mutation guards for representative phase, summon, and attack commands.
- DONE: Added static runtime module guards against `Math.random` and `Date.now` inside engine runtime modules.

---

## T-073: Add no-runtime-card-text-parsing guard

Status: DONE

Goal:
Prevent accidental card-text parser logic.

Files:
- `src/engine/__tests__/noRuntimeTextParsing.test.ts`

Actions:
1. Add test that engine runtime modules do not import or call behavior parsers.
2. Add test or static check that card `text` is not used to decide runtime effects.
3. Allow text for display/catalog only.

Acceptance:
- Guard test passes.
- Validation commands pass.

Progress:
- DONE: Added a static guard test for engine runtime modules that blocks parser-like behavior imports or calls.
- DONE: Added a static guard that allows card `text` only in catalog/display normalization files.
- DONE: Added a runtime-behavior module check that rejects card-text property access outside the allowed catalog/display files.

---

## T-074: Add playable coverage report

Status: DONE

Goal:
Report what can and cannot be used in playable decks.

Files:
- `src/engine/cards/coverageReport.ts`
- `src/engine/__tests__/coverageReport.test.ts`
- `docs/implementation-status.md`

Actions:
1. Report:
   - total local cards
   - vanilla playable
   - implemented playable
   - unsupported blocked
   - blocked by no-extra-deck scope
   - blocked by deck validation
2. Report which cards are in supported playable decks.
3. Do not require all 1,704 cards to be implemented.
4. Require supported playable decks to have zero unsupported cards.

Acceptance:
- Coverage report test passes.
- Report clearly distinguishes playable support from full card-pool support.
- Validation commands pass.

Progress:
- DONE: Added `buildPlayableCoverageReport` with totals for local cards, vanilla playable cards, implemented playable cards, unsupported blocks, Extra/Fusion scope blocks, and deck-validation scope blocks.
- DONE: Added supported playable deck reporting with per-deck card IDs, copy counts, validation errors, and unsupported card IDs.
- DONE: Added coverage report tests proving the report does not require all local cards to be implemented and supported playable deck fixtures contain zero unsupported cards.

---

## T-075: Final playable-engine audit

Status: DONE

Goal:
Confirm the backend is ready for playable frontend use under the simplified scope.

Files:
- `docs/implementation-status.md`
- `docs/playable-engine-audit.md`

Actions:
1. Run:
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
2. Record final outputs.
3. Confirm:
   - exact-40 Main Deck validation
   - no Side Deck
   - no Extra Deck
   - default decks validate
   - default decks start a duel
   - unsupported cards are blocked from playable decks
   - reducer is deterministic
   - frontend adapter works
   - golden scenarios pass
4. Create `docs/playable-engine-audit.md` with remaining known limitations.

Acceptance:
- All validation commands pass.
- Audit doc exists.
- Known limitations are explicit.
- Queue can be considered complete for playable-engine scope.

Progress:
- DONE: Ran final `npm run typecheck`, `npm test`, and `npm run build`; all passed.
- DONE: Created `docs/playable-engine-audit.md` with validation outputs, acceptance evidence, and known limitations.
- DONE: Confirmed the queue can be considered complete for the simplified playable-engine scope.

---

# Whole-project acceptance criteria

The project is complete for this queue when all are true:

1. Two exact-40-card supported decks can start a duel.
2. No Side Deck exists in playable flow.
3. No Extra/Fusion Deck exists in playable flow.
4. Playable decks cannot include unsupported cards.
5. Engine state is deterministic and serializable.
6. Reducer input is not mutated.
7. UI routes actions through engine commands.
8. Basic phases, summoning, setting, battle, damage, and End Phase work.
9. Implemented card effects use scripts/templates and tests.
10. Unsupported card effects are explicit and blocked.
11. Golden gameplay scenarios pass.
12. `npm run typecheck` passes.
13. `npm test` passes.
14. `npm run build` passes.
