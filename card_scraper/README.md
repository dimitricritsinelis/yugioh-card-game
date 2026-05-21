# Goat World Card Pool Scraper

TypeScript/Node scraper for Goat World's Goat Format card pool. It collects card metadata, downloads local card images, merges Goat World banlist restrictions, validates the result, and writes deterministic JSON/CSV assets for a game prototype.

## Install

```bash
npm install
npx playwright install chromium
```

Node 20+ is required.

## Commands

Run commands from the `card_scraper` directory. By default, game assets are written to the sibling `../yugioh_cards` directory and scraper-only artifacts are written to `./artifacts/latest`.

```bash
npm run scrape -- --out ../yugioh_cards --concurrency 3 --delayMs 500 --strict
npm run validate -- --out ../yugioh_cards --strict
npm run report -- --out ../yugioh_cards --artifacts ./artifacts/latest
```

Useful options:

- `--metadataOnly`: scrape metadata without downloading images.
- `--images`: download or redownload images.
- `--resume`: reuse cached card HTML and existing images where possible.
- `--force`: ignore cache and redownload.
- `--artifacts ./artifacts/latest`: write scraper diagnostics, lookup exports, CSV, reports, and HTML cache outside the game asset folder.
- `--expectedCount 1704`: fail validation if Goat World's count changes. Use `--expectedCount 0` to disable.
- `--limit 5`: scrape a small deterministic sample, mainly for smoke tests and fixture output.

The scraper fetches `/robots.txt` before scraping and does not bypass restrictions. Default detail concurrency is 3 with a jittered delay.

## Game Outputs

Only the files needed by an online game are written under `--out`, normally `../yugioh_cards`.

- `cards.json`: array of complete `CardRecord` objects.
- `images/*.webp`: local card art. Game metadata never hotlinks Goat World image URLs.

Recommended runtime bundle:

```text
yugioh_cards/
  cards.json
  images/
```

Build lookup maps in memory from `cards.json` when the game starts instead of shipping extra lookup JSON files.

## Scraper Artifacts

Scraper-only files are written under `--artifacts`, normally `./artifacts/latest`.

- `cards.by_file.json`: records keyed by image file name.
- `cards.by_passcode.json`: records keyed by passcode.
- `cards.by_slug.json`: records keyed by detail slug.
- `file_to_card_name.json`: `{ [file_name]: card_name }`.
- `cards.csv`: flat export for spreadsheet inspection.
- `manifest.json`: timestamps, source URLs, counts, image status, banlist counts, code version.
- `failures.json`: detail scrape, parse, image, validation, and unmatched banlist failures.
- `scrape-report.md`: human-readable summary.
- `.cache/html/*.html`: raw detail HTML cache for resume/debugging.

Image filenames are deterministic:

```text
{passcode}_{slugified-card-name}.webp
```

Examples: `86988864_3-hump-lacooda.webp`, `67048711_7.webp`, `09786492_white-dragon-ritual.webp`.

## Data Schema

Each card contains raw card metadata only: passcode, slug, name, category, classifications, text, monster or spell/trap fields, local image metadata, related card names, source URLs, and banlist legality.

`game.rarity`, `game.directional_values`, and `game.generated_ability` are intentionally left `null`. A future balancing layer should live in a separate script such as `generateGameStats.ts`.

Banlist restrictions map to max copies:

- `Forbidden`: `0`
- `Limited`: `1`
- `Semi-Limited`: `2`
- `Unlimited`: `3`

## Validation

`npm run validate` checks expected count, duplicate passcodes, duplicate filenames, required fields, card type shape, banlist matching, local image existence, image hashes, non-empty text, and suspicious text such as replacement characters or mismatched quotes.

Strict mode exits non-zero on warnings or failures. Non-strict mode writes reports and continues where safe.

## Scope

Treat Goat World's card pool as the source of truth for this scrape. The default expected count is `1704`; validation is designed to catch site changes instead of silently accepting scope drift.

## Legal/IP Notes

Goat World states that card artwork and Yu-Gi-Oh content belong to Konami and other rightsholders. Use the downloaded assets locally for prototyping unless rights or permission are clear. Do not redistribute card artwork or generated asset bundles casually.

## Game Use

The output is raw data and local assets. A real game needs a separate balancing layer for rarity, directional stats, and special abilities.
