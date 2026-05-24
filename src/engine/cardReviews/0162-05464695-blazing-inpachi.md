# Blazing Inpachi (05464695)

- Audit version: 1
- Order: 162
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: cccd1c259cb44734b7bbfaa727ff2ae7bb7a397d8bcdfe8db93bd983420b205e

## Local Card Text

A wicked wooden spirit now burning in flames. Its fire attack is powerful, but it will soon be nothing but ashes.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/blazing-inpachi

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
