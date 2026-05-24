# Elemental HERO Clayman (84327329)

- Audit version: 1
- Order: 464
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 89ff813abdabbf34788f1cd45eed13e20c652f470f4643d7aa2df89430c654ee

## Local Card Text

An Elemental HERO with a clay body built-to-last. He'll preserve his Elemental HERO colleagues at any cost.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/elemental-hero-clayman

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
