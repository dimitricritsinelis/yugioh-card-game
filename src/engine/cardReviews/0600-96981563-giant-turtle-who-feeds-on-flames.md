# Giant Turtle Who Feeds on Flames (96981563)

- Audit version: 1
- Order: 600
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 132f66706e84051563a80e78c1ffdbf518af504e8b999a3c8201c6077c48edc0

## Local Card Text

A crimson-shelled tortoise that feeds on flames.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/giant-turtle-who-feeds-on-flames

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
