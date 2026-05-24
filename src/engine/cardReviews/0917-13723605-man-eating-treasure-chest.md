# Man-Eating Treasure Chest (13723605)

- Audit version: 1
- Order: 917
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 7b24ab7e19493cb76591b3bdc135ec50e25c91d925beefe26b2e37a14d6744c1

## Local Card Text

A monster disguised as a treasure chest that is known to attack the unwary adventurer.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/man-eating-treasure-chest

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
