# GOAT Engine Contract

## Goal

Build a pure reducer-style deterministic GOAT-format Yu-Gi-Oh! engine for two-player, Main Deck-only duels. Engine state must be serializable, and the reducer must not depend on runtime card-text parsing. Every card effect must come from a script, template, or vanilla handling. Unsupported effects must be explicit and visible, never silent fallbacks. The existing frontend should be adapted to the engine contract rather than rewritten wholesale.

## Simplified Playable Scope

- Each player uses exactly one 40-card Main Deck.
- Side Decks are not supported.
- Extra Decks and Fusion Decks are not supported.
- Deck validation blocks unsupported cards in normal playable mode.
- Developer/test mode may exercise unsupported cards only when explicit unsupported behavior is under test.
- The frontend integrates through an adapter layer and should not be rewritten around engine internals.

## Architecture

### Data catalog

Normalize `cards.json` into an engine catalog keyed by stable card identity. Use passcode/cardId as primary identity and treat card names as display data only.

### Core state/zones

Represent all zones in serializable state. Card movement must be immutable and must preserve owner, controller, face state, battle position, counters, and attachments where applicable.

### Rules kernel

Centralize phases, priority, chain handling, trigger timing, spell speed legality, Damage Step rules, battle flow, and cleanup in the rules kernel.

### Effect system

Model costs, targets, prompts, activation legality, resolution, continuous effects, replacement effects, and lingering effects as deterministic engine data and reducer behavior.

### Card scripts

Support vanilla cards, reusable templates, custom scripts, forbidden-but-scripted cards, and a coverage gate. Forbidden cards remain unavailable for legal deck construction but are still scripted for tests and development duels.

### Reducer API

The engine accepts commands and returns a new state plus events, prompts, and explicit errors. Commands must be deterministic and replayable.

### Frontend adapter

The UI sends commands to the reducer and renders selectors, prompts, events, and errors from engine output. React components must not contain engine rules.

## Core Rules To Support

- GOAT first-turn draw.
- Draw, Standby, Main 1, Battle, Main 2, and End phases.
- Normal Summon, Tribute Summon, Set, Flip Summon, and a Special Summon framework.
- Turn player priority, summon priority, and priority passing.
- Chain building and LIFO resolution.
- Spell Speed 1, 2, and 3 legality.
- SEGOC trigger ordering.
- Damage Step windows and restrictions.
- Targets chosen at activation and rechecked at resolution.
- Costs paid at activation and not refunded.
- Manual position-change limits.
- End Phase hand-size discard.
- Spirit return before hand-size discard.
- Deck-out, LP-zero, and Exodia win conditions where applicable.

## Card Coverage Policy

Every `cards.json` card gets exactly one status:

- `goatVanilla`
- `goatTemplate`
- `goatCustom`
- `goatForbiddenButScripted`
- `goatDeckBlocked`
- `goatUnsupported`
- `notInGoatPool`

The manifest is an accountability gate, not a claim that every card is automated. The final GOAT-legal unsupported count must be zero before strict final acceptance can be true. Forbidden cards remain deck-blocked in normal playable mode even when scripted, but may be exercised by explicit tests and development duels. No card can be marked implemented without a script or template and tests.

## Testing Policy

- Unit tests for rules, zones, costs, targets, chain, priority, battle, and Damage Step.
- Script tests for every card and template.
- Golden scenario tests for real GOAT interactions.
- Coverage tests for every `cards.json` card.
- Regression tests for every bug fix.

## Code Constraints

- No `Math.random` in the engine path.
- No `Date.now` in the reducer.
- No hidden mutation.
- No card names as primary IDs.
- No engine logic in React components.
- Keep `npm run typecheck`, `npm test`, and `npm run build` green.
