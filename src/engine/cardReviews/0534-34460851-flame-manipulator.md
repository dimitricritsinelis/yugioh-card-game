# Flame Manipulator (34460851)

- Audit version: 1
- Order: 534
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: b49e0c3ec7a85b6ae36494ba1b851c379f7a68817a5d0030922c8ba987b0c2c0

## Local Card Text

This Spellcaster attacks enemies with fire-related spells such as "Sea of Flames" and "Wall of Fire".

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/flame-manipulator

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
