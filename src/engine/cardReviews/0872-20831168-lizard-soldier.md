# Lizard Soldier (20831168)

- Audit version: 1
- Order: 872
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 6833f8771816ff4f0cc065d9333d104b95cc9226b40a95f52533fc39538456ba

## Local Card Text

A beast soldier derived from dragons, it is small for a Dragon-Type. Moving very quickly, this monster is an excellent strategist.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/lizard-soldier

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
