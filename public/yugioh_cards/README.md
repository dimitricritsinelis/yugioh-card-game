# Yu-Gi-Oh Card Data Bundle

This folder is the game-facing output from the Goat World card scraper. It is intended to be copied or served directly by an online game.

## Contents

```text
yugioh_cards/
  README.md
  cards.json
  images/
    {passcode}_{slugified-card-name}.webp
```

Only `cards.json` and `images/` are required at runtime. Scraper reports, validation files, CSV exports, lookup JSON files, and raw HTML caches live outside this folder in:

```text
../card_scraper/artifacts/latest/
```

## Runtime Data

`cards.json` is the canonical card metadata file. It contains an array of `CardRecord` objects, one per scraped card.

For the full Goat World card pool, expect about 1,704 cards. The current checked-in/generated folder may be a smaller sample if the scraper was run with `--limit`.

Each record includes:

- `passcode`: Yu-Gi-Oh card passcode as a string. Leading zeros are preserved.
- `slug`: stable Goat World card slug.
- `name`: card name.
- `file_name`: deterministic local image filename.
- `category`: `Monster`, `Spell`, or `Trap`.
- `classifications`: card classifications such as `Normal`, `Effect`, `Fusion`, `Ritual`, `Spirit`, or `Union`.
- `text`: raw card text.
- `monster`: monster stats for monster cards, otherwise `null`.
- `spell_trap`: spell/trap icon data for spell and trap cards, otherwise `null`.
- `legality`: Goat Format legality and max allowed copies.
- `image`: local image metadata.
- `related_cards`: related card names from Goat World.
- `source`: scrape source and timestamp metadata.
- `game`: intentionally empty game-balancing fields.

## Images

Images are stored locally under `images/`. Do not hotlink Goat World image URLs from the game.

Image filenames are deterministic:

```text
{passcode}_{slugified-card-name}.webp
```

Examples:

```text
86988864_3-hump-lacooda.webp
67048711_7.webp
09786492_white-dragon-ritual.webp
```

Use `card.image.file_name` or `card.file_name` to load an image:

```ts
const imageUrl = `/yugioh_cards/images/${card.image.file_name}`;
```

## Lookup Strategy

Do not repeatedly search the `cards.json` array during gameplay. Load `cards.json` once and build in-memory maps at startup.

```ts
const cards = await fetch("/yugioh_cards/cards.json").then((response) => response.json());

const cardsByPasscode = new Map(cards.map((card) => [card.passcode, card]));
const cardsBySlug = new Map(cards.map((card) => [card.slug, card]));
const cardsByFileName = new Map(cards.map((card) => [card.file_name, card]));
const cardsByName = new Map(cards.map((card) => [card.name.toLowerCase(), card]));
```

For roughly 1,704 cards, this is small and fast enough for an online game MVP.

## Legality

`card.legality` contains Goat World banlist status:

```ts
type Restriction = "Forbidden" | "Limited" | "Semi-Limited" | "Unlimited";
```

Max copies:

- `Forbidden`: `0`
- `Limited`: `1`
- `Semi-Limited`: `2`
- `Unlimited`: `3`

## Game Fields

The scraper does not invent game-specific balancing data. These fields are intentionally empty:

```ts
card.game.rarity === null
card.game.directional_values === null
card.game.generated_ability === null
```

A game should generate or maintain those values in a separate balancing layer, for example a future `game_cards.json`.

## Legal/IP Note

Card artwork and Yu-Gi-Oh content belong to Konami and other rightsholders. Treat these assets as local prototype data unless rights or permission are clear. Do not casually redistribute the image bundle.
