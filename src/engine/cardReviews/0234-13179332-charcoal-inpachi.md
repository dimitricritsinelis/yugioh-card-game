# Charcoal Inpachi (13179332)

- Audit version: 1
- Order: 234
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 5f800c3d057e86284e70ac7642050a099f61cf24cfa5d0131a0b350c165b27ef

## Local Card Text

A wicked wooden spirit that has burned out. The barbecue grilled with this charcoal is so awesome that everybody thinks it's priceless.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/charcoal-inpachi

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
