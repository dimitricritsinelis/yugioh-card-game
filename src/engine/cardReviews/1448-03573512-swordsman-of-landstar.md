# Swordsman of Landstar (03573512)

- Audit version: 1
- Order: 1448
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 67bf49039ddb1caa864fa6bca2dc6b099439e1ceb468b5de4722237a617cc6b8

## Local Card Text

An amateur with a sword, this fairy warrior relies on its mysterious powers.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/swordsman-of-landstar

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
