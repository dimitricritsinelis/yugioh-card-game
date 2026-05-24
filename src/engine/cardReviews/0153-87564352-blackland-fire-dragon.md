# Blackland Fire Dragon (87564352)

- Audit version: 1
- Order: 153
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: b7b5f6aff6aea0b3a3f8875893430709f025959ef80de0c786305dabf858f22a

## Local Card Text

A dragon that dwells in the depths of darkness, its vulnerability lies in its poor eyesight.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/blackland-fire-dragon

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
