# Skull Dog Marron (86652646)

- Audit version: 1
- Order: 1326
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: f2124d2381cf57dddd714c43609487da6f9401768abcbfbdc57d82f89da053f8

## Local Card Text

A lost dog that wandered off 1000 years ago. He's still waiting for his master to come for him.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/skull-dog-marron

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
