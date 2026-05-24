# Neo the Magic Swordsman (50930991)

- Audit version: 1
- Order: 1056
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 524faf04bf381e069d70f2b8cb2ad60f0a3cb5b5ad9440a75d30ea03539b0085

## Local Card Text

A dimensional drifter who not only practices sorcery, but is also a sword and martial arts master.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/neo-the-magic-swordsman

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
