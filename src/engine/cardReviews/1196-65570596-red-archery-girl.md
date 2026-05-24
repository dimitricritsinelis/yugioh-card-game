# Red Archery Girl (65570596)

- Audit version: 1
- Order: 1196
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 4cef59a18a760bfb6046baed407f7382c5755fb323ca5f91b0beca247781b00c

## Local Card Text

A mermaid archer that hides in a protective shell, waiting for the right moment to strike.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/red-archery-girl

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
