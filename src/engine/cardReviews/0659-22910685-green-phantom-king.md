# Green Phantom King (22910685)

- Audit version: 1
- Order: 659
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 5d364435a0a11f4f0be09e8e85b77da6896c04e0408e2f1cc581fae719d31400

## Local Card Text

This youthful king of the forest lives in a green world, abundant with trees and wildlife.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/green-phantom-king

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
