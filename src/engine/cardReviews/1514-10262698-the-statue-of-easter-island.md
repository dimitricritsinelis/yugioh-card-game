# The Statue of Easter Island (10262698)

- Audit version: 1
- Order: 1514
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: b29491e93335833e71a9a3e30478e97dfc852ddf5d2158a7dac2939b6068c7c4

## Local Card Text

A stone monument from Easter Island that launches laser blasts from its rock-hewn lips.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/the-statue-of-easter-island

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
