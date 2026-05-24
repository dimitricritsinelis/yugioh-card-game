# La Jinn the Mystical Genie of the Lamp (97590747)

- Audit version: 1
- Order: 828
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 5a02fa2daefadfbb5968abf36f0aacdf345fd5588e8e8e6ef943c94212b0c96b

## Local Card Text

A genie of the lamp that is at the beck and call of its master.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/la-jinn-the-mystical-genie-of-the-lamp

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
