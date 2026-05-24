# Gazelle the King of Mythical Beasts (05818798)

- Audit version: 1
- Order: 584
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: c2e1b1032f7b7b2e55280a440b3b542f56165b0415eed0e31ee4dcbc49ad9da4

## Local Card Text

This monster moves so fast that it looks like an illusion to mortal eyes.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/gazelle-the-king-of-mythical-beasts

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
