# Two-Mouth Darkruler (57305373)

- Audit version: 1
- Order: 1599
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 5cc3b6426fa6092a15624994f7616136beeedea2947ef26f358a39f34590fe03

## Local Card Text

A dinosaur with two deadly jaws, it stores electricity in its horn and releases high voltage bolts from the mouth on its back.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/two-mouth-darkruler

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
