# Celtic Guardian (91152256)

- Audit version: 1
- Order: 217
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 965c1a64d90211288bdd2c3b4d2472f74d08d6b7a20f82e744c1cec04eee47ee

## Local Card Text

An elf who learned to wield a sword, he baffles enemies with lightning-swift attacks.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/celtic-guardian

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
