# Terrorking Salmon (78060096)

- Audit version: 1
- Order: 1461
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 04e59d56ee35540862c0b314fc5ddaeb64ad5d30d8569b998494d209903f8f5b

## Local Card Text

A feared salmon, master of the Sea of Darkness. Its roe is the best delicacy in the World of Darkness.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/terrorking-salmon

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
