# GOAT Rules Notes

These notes define the shared rule assumptions card scripts and templates should reference. Card implementations must not parse card text at runtime; card text is reviewed from `public/yugioh_cards/cards.json`, then represented as structured scripts/templates.

## Sources

- GoatFormat.com Rules & Policies: https://www.goatformat.com/rules.html
- GoatFormat.com Basic Mechanics: https://www.goatformat.com/basics.html
- GoatFormat.com priority article: https://www.goatformat.com/home/6-facts-that-you-should-know-about-priority
- Official Yu-Gi-Oh! rulebook v9, chains and Spell Speed: https://img.yugioh-card.com/eu/wp-content/uploads/2022/07/Rulebook_v9_en.pdf

GoatFormat.com states its rule materials are intended to model April 2005 premier-event rulings, and its Basic Mechanics page treats current fast-effect timing as the baseline with the GOAT-specific addition that turn player priority can include monster Ignition Effects after a Summon or Chain has resolved. The official rulebook is used for generic chain, Spell Speed, and turn-player priority mechanics that GoatFormat.com says are unchanged unless specifically overridden.

## Turn Structure

The engine models the GOAT turn sequence as:

```text
Draw Phase -> Standby Phase -> Main Phase 1 -> Battle Phase -> Main Phase 2 -> End Phase
```

Implementation:

- `src/engine/rules/phases.ts`
- `src/engine/reducer.ts`

Executable coverage:

- `src/engine/__tests__/phaseFlow.test.ts`
- `src/engine/__tests__/reducer.test.ts`
- `src/engine/__tests__/goldenFrontendSmoke.test.ts`

## Priority And Open Game States

GOAT priority follows current fast-effect timing except that the turn player may use a monster Ignition Effect, not only a fast effect, after a successful Summon or after a Chain has resolved. Trigger Effects are collected before optional Ignition priority can be used when the triggering event requires a Chain.

Implementation:

- `src/engine/rules/priority.ts`
- `src/engine/rules/triggers.ts`
- `src/engine/reducer.ts`

Executable coverage:

- `src/engine/__tests__/priority.test.ts`
- `src/engine/__tests__/goldenPriorityScenarios.test.ts`
- `src/engine/__tests__/triggers.test.ts`
- `src/engine/__tests__/customTimingScenarios.test.ts`

Card-script rule:

- Ignition effects must be represented as `kind: "ignition"` and should check Main Phase/open-state constraints through templates or `canActivate`.
- Trigger effects must be represented as `kind: "trigger"` and collected by event/timing metadata instead of activated manually.

## Chains And Spell Speed

The official rulebook defines Spell Speeds 1-3 and requires a response in a Chain to be Spell Speed 2 or higher and not lower than the previous Chain Link. Chains resolve last-in, first-out.

Implementation:

- `src/engine/rules/chain.ts`
- `src/engine/rules/spellSpeed.ts`
- `src/engine/reducer.ts`

Executable coverage:

- `src/engine/__tests__/chain.test.ts`
- `src/engine/__tests__/spellSpeed.test.ts`
- `src/engine/__tests__/goldenChainScenarios.test.ts`
- `src/engine/__tests__/chainResolutionFailure.test.ts`

Card-script rule:

- Spell Speed 1 effects cannot be manually chained.
- Normal Trap, Continuous Trap activation effects, Quick-Play Spell effects, and Quick Effects are Spell Speed 2 unless a card requires stricter handling.
- Counter Trap effects are Spell Speed 3.

## Summon Response Windows

After a successful Normal Summon, Tribute Summon, Set where applicable, Flip Summon, or Special Summon, the engine opens the appropriate response/priority window. GOAT turn-player priority permits the turn player to activate a legal Ignition Effect before the opponent can use a response, except when mandatory/optional Trigger Effects are already constructing a Chain.

Implementation:

- `src/engine/rules/summons.ts`
- `src/engine/rules/priority.ts`
- `src/engine/rules/triggers.ts`
- `src/engine/reducer.ts`

Executable coverage:

- `src/engine/__tests__/summons.test.ts`
- `src/engine/__tests__/priority.test.ts`
- `src/engine/__tests__/goldenPriorityScenarios.test.ts`
- `src/engine/__tests__/trapTemplates.test.ts`

## Damage Step And Battle Flow

The engine currently models battle as attack declaration, optional response windows, Damage Step state for activation legality, damage calculation, battle damage, battle destruction, and battle-completed triggers. During active Damage Step state, only Counter Traps and explicitly scripted ATK/DEF modifier effects are legal by default.

Implementation:

- `src/engine/rules/battle.ts`
- `src/engine/rules/damageStep.ts`
- `src/engine/reducer.ts`

Executable coverage:

- `src/engine/__tests__/battle.test.ts`
- `src/engine/__tests__/damageStep.test.ts`
- `src/engine/__tests__/goldenBattleScenarios.test.ts`
- `src/engine/__tests__/goldenDamageStepScenarios.test.ts`
- `src/engine/__tests__/customTimingScenarios.test.ts`

Card-script rule:

- Damage Step cards must opt into Damage Step legality through structured metadata.
- ATK/DEF-changing effects that are legal during Damage Step must use `damageStep: { kind: "atk-def-modifier" }` or stricter card-specific logic.

## Costs, Targets, And Resolution

Costs are paid before activation and are not refunded by negation or failed resolution. Targets are declared at activation and revalidated at resolution. If stored targets are no longer legal, resolution applies the card's configured no-effect handling instead of mutating illegal state.

Implementation:

- `src/engine/effects/costs.ts`
- `src/engine/effects/targets.ts`
- `src/engine/reducer.ts`

Executable coverage:

- `src/engine/__tests__/costsTargetsPrompts.test.ts`
- `src/engine/__tests__/chainResolutionFailure.test.ts`
- `src/engine/__tests__/spellTemplates.test.ts`
- `src/engine/__tests__/monsterTemplates.test.ts`

## Public And Private Information

Deck, hand, and face-down cards remain hidden unless a structured effect reveals, searches, or moves them to a public zone. Frontend projections must preserve hidden opponent information.

Implementation:

- `src/engine/core/state.ts`
- `src/engine/core/zones.ts`
- `src/engine/adapters/frontendAdapter.ts`
- `src/engine/adapters/viewSelectors.ts`

Executable coverage:

- `src/engine/__tests__/frontendAdapter.test.ts`
- `src/engine/__tests__/frontendCoreRouting.test.ts`
- `src/engine/__tests__/goldenFrontendSmoke.test.ts`
- `src/engine/__tests__/noRuntimeTextParsing.test.ts`

## Card Task Usage

Every Card Task must classify the card against these shared rules before adding card-specific logic:

- base rules or vanilla handling;
- existing exact template;
- new shared template;
- custom script;
- forbidden-but-scripted handling;
- non-GOAT deck blocking.

If a card contradicts a rule note or exposes missing engine behavior, update the shared rule/module first, run affected regression tests, then return to the card task.
