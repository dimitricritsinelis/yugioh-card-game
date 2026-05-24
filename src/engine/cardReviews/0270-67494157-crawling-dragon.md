# Crawling Dragon (67494157)

- Audit version: 1
- Order: 270
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: c5dce237ce6ce1d90982231e8b839fbbacb2c3a202431367903fe67996ccd688

## Local Card Text

This weakened dragon can no longer fly, but it is still a deadly force to be reckoned with.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/crawling-dragon

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
