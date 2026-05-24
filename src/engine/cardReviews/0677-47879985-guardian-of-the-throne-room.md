# Guardian of the Throne Room (47879985)

- Audit version: 1
- Order: 677
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: df475ec6fd2ad0fae2c6b557c42e932ed36494fc852db4fbe0e87444f5bab24b

## Local Card Text

A robot guard built to guard throne rooms, it is armed with homing missiles.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/guardian-of-the-throne-room

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
