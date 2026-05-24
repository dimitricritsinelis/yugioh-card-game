# Sorcerer of the Doomed (49218300)

- Audit version: 1
- Order: 1357
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 627e39dada2396ddc4d85eb3e195a796c54d62abfe14e6275e1d418502991ada

## Local Card Text

A slave of the dark arts, this sorcerer is a master of death-dealing spells.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/sorcerer-of-the-doomed

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
