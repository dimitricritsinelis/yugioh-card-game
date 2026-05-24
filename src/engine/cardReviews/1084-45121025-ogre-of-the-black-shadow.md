# Ogre of the Black Shadow (45121025)

- Audit version: 1
- Order: 1084
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 151261bef65464b814dddad7fee643476de81604ab2d42829b57005756e082d5

## Local Card Text

An ogre possessed by the powers of the dark. Few can withstand its rapid charge.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/ogre-of-the-black-shadow

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
