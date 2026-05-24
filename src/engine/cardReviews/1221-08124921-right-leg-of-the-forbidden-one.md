# Right Leg of the Forbidden One (08124921)

- Audit version: 1
- Order: 1221
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: bae62ab547b31c7ecb3bcf352b38ed799e758d0c046e80cc16ab12c174411a85

## Local Card Text

A forbidden right leg sealed by magic. Whosoever breaks this seal will know infinite power.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/right-leg-of-the-forbidden-one

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
