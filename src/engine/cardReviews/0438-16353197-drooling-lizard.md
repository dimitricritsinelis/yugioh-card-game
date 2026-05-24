# Drooling Lizard (16353197)

- Audit version: 1
- Order: 438
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 3443843ae8686053831f28b5a69be13374bb5a574654e12d84cd0373a8963869

## Local Card Text

A blood-sucking snake in human form that attacks any living being that passes nearby.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/drooling-lizard

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
