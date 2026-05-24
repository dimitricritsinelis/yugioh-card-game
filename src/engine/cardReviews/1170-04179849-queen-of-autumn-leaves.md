# Queen of Autumn Leaves (04179849)

- Audit version: 1
- Order: 1170
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 32c3a0624a9f324b832ce4dc36d72c43a9fea54a95e885351588875528d90b74

## Local Card Text

Queen of the Emerald Forest and wife of the Spirit King, she lives surrounded by vivid red leaves.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/queen-of-autumn-leaves

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
