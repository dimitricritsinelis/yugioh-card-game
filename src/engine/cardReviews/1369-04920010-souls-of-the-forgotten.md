# Souls of the Forgotten (04920010)

- Audit version: 1
- Order: 1369
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 2b81da06c83aaa27496f2168c913e895448b3e87611891512c970fc0b993c5cc

## Local Card Text

A wicked spirit created by the hateful souls of those who fell in battle. It grows by assimilating the souls of its enemies.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/souls-of-the-forgotten

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
