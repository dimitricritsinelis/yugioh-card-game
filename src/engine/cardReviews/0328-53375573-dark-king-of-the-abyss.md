# Dark King of the Abyss (53375573)

- Audit version: 1
- Order: 328
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: f45e8c1896cd67f1e4de34a6cded3c475a8ba58ef698d41a7af854fae41e4015

## Local Card Text

It's said that this King of the Netherworld once had the power to rule over the dark.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/dark-king-of-the-abyss

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
