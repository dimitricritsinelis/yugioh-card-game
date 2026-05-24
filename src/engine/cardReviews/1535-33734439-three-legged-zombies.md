# Three-Legged Zombies (33734439)

- Audit version: 1
- Order: 1535
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 176667ca41f9200bd2ee37b5e1469246f82a38bbf92bf4b1e1be116705c1e339

## Local Card Text

A pair of friendly skeletons, lean and fat, that travel with extreme difficulty.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/three-legged-zombies

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
