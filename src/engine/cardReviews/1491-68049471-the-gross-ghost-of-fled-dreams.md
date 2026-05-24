# The Gross Ghost of Fled Dreams (68049471)

- Audit version: 1
- Order: 1491
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: c8d8c31cefc19e22052dd67261a32b6c6b8b013834470443391af7bef946cc8e

## Local Card Text

This monster feeds on the dreams of an unwary sleeper, dragging the victim into eternal slumber.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/the-gross-ghost-of-fled-dreams

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
