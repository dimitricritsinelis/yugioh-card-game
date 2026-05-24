# Woodborg Inpachi (35322812)

- Audit version: 1
- Order: 1676
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 69137c23a8220df1aa4447603caff1fb76c4ba21e2ef3cfaa1f6418a43999f0c

## Local Card Text

The new form of the enigmatic Inpachi, remodeled by cutting-edge Dark World technology. Maneuverability has been sacrificed for strong armor, which was considered more important.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/woodborg-inpachi

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
