# Left Leg of the Forbidden One (44519536)

- Audit version: 1
- Order: 845
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 0fd80c3b2267d7e6569c5e62ed6b18f7fd05ede84ff0157e88047c4c09454911

## Local Card Text

A forbidden left leg sealed by magic. Whosoever breaks this seal will know infinite power.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/left-leg-of-the-forbidden-one

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
