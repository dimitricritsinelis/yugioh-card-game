# United Resistance (85936485)

- Audit version: 1
- Order: 1619
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 61f5e563e350eeeb53457a123d2132ca7fad072e905bbe3aed21a9bfd0004de0

## Local Card Text

The people that gather to swear to fight their oppressors. A revolution is coming.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/united-resistance

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
