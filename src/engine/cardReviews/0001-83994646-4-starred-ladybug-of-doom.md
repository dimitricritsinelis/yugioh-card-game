# 4-Starred Ladybug of Doom (83994646)

- Audit version: 1
- Order: 1
- Status at claim: in-progress
- Category: Monster
- Classifications: Effect, Flip
- Local text hash: 84c4ad2c74de95987b7dbdc61e4b6f79bf110ad4d4b779aff548ebdd488df97a

## Local Card Text

FLIP: Destroy all face-up Level 4 monsters on your opponent's side of the field.

## Stats

```json
{
  "monster": {
    "attribute": "WIND",
    "type": "Insect",
    "level": 3,
    "atk": 800,
    "def": 1200
  },
  "spell_trap": null,
  "legality": {
    "goat_world_pool": true,
    "restriction": "Unlimited",
    "max_copies": 3
  }
}
```

## Ruling Sources

- https://goatworld.community/cards/4-starred-ladybug-of-doom
- https://www.goatformat.com/indivrulings.html

## Required Review

- Activation legality: Flip Effect; this is not an Ignition effect. It is triggered automatically when this monster is flipped face-up by any in-game flip event.
- Costs: none.
- Targets: none selected on activation; it applies to all matching monsters in range.
- Chain timing / spell speed: a Trigger Effect that can be activated and resolve in sequence like other Flip Effects.
- Trigger timing / missed timing: triggers when this face-down card is flipped face-up (e.g., in battle or by a resolving card effect). If it is never flipped, there is no effect to activate.
- Continuous or replacement behavior: none.
- Battle and Damage Step behavior: this text applies while flipping a face-down monster. It resolves as the flip event and destroys matching monsters immediately before remaining battle resolution.
- Edge cases:
  - Only opponent monsters are eligible; your side is never affected by its own resolution.
  - Only face-up monsters at level 4 are destroyed.
  - Face-down level 4 monsters are unaffected.
  - If no qualifying monsters are present, the effect resolves with no board change.

## Implementation Summary

Added a flip-trigger shared primitive so monsters with Flip-Effect scripts resolve their effect when revealed face-up during battle. Implemented `4-Starred Ladybug of Doom` as an implemented script that destroys all face-up Level 4 monsters on the opponent’s monster zones when its flip effect resolves.

## Acceptance Tests

- Flipping a face-down `4-Starred Ladybug of Doom` during battle destroys every opponent face-up Level 4 monster and does not destroy non-face-up or non-Level 4 monsters.
- The effect only applies to opponent monsters; any own-side Level 4 monsters remain on the field.
- If the attacked flipped monster was on the defender side, battle continues after flip resolution and uses the flipped monster if still present.
