# Protector of the Throne (10071456)

- Audit version: 1
- Order: 1161
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 0969f79d2033c260afb51ec0d6520fafa79f4ef856108eb22e3638bb369142dd

## Local Card Text

While the king is away, this queen protects his throne with a mighty defense.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/protector-of-the-throne

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
