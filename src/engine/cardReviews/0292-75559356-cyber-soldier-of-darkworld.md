# Cyber Soldier of Darkworld (75559356)

- Audit version: 1
- Order: 292
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: df36e3cc0ec0437461a36fa8b87f6196da5222f0ee3fea3f79e4d1dcbccad620

## Local Card Text

A mechanical soldier that won't stop attacking until all of its life readings have been extinguished from its sensors.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/cyber-soldier-of-darkworld

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
