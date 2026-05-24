# Earthbound Spirit (67105242)

- Audit version: 1
- Order: 445
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: a931029892d5be8199fb6f84ea9fac56aac9c0629cf8a728ff76c65ce82ab637

## Local Card Text

A vengeful creature formed by the spirits of fallen warriors, it drags any who dare approach it into the deepest bowels of the earth.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/earthbound-spirit

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
