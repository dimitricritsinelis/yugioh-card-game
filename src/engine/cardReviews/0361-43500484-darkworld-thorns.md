# Darkworld Thorns (43500484)

- Audit version: 1
- Order: 361
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: b9ae85911aa0f03308d5ebda0992f0e65e9fb1016ef10ff1fe93aa98464942fc

## Local Card Text

A thorny plant found in the darklands that wraps its body around any unwary travelers.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/darkworld-thorns

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
