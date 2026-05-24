# Robotic Knight (44203504)

- Audit version: 1
- Order: 1234
- Status: no-op
- Category: Monster
- Classifications: Normal
- Local text hash: 03c41a9d47efcbd0d264dbb8d89c0045038efb48a8ac56d34cef79029cc0d36a

## Local Card Text

The Commander of Machine-Types, he serves the Machine King. He is famous for the way he controls his troops.

## No-Op Review

This card is a Normal Monster in the local Goat World record and has no Effect, Spirit, Union, or Toon classification. It has no card-specific backend logic beyond normal monster stats, Normal Summon/Set legality, battle stats, ownership, control, and zone movement handled by shared engine rules.

## Ruling Sources

- https://goatworld.community/cards/robotic-knight

## Implementation Summary

Reviewed local card record as a Normal Monster with no effect-bearing classification; registry coverage supplies an explicit no-op script.

## Acceptance Tests

- Card script registry contains an explicit no-op entry for this passcode.
- Card is classified as a Normal Monster without Effect, Spirit, Union, or Toon classifications.
