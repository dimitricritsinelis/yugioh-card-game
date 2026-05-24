# The Furious Sea King (18710707)

- Audit version: 1
- Order: 1489
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 363ea24314f5f2887a342187e9e2cd9be26435da2d956e1ae13d42e07555c7b2

## Local Card Text

Grand King of the Seven Seas, he's able to summon massive tidal waves to drown the enemy.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/the-furious-sea-king

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
