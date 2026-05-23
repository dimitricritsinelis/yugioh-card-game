# GOAT Duel Screen

Lightweight Vite/React prototype for a GOAT-era Yu-Gi-Oh duel screen. The app loads local card metadata from `/yugioh_cards/cards.json` and local WebP card images from `/yugioh_cards/images`.

## Runtime Assets

The canonical runtime bundle is kept in `yugioh_cards/`:

- `cards.json`
- `images/{passcode}_{slugified-card-name}.webp`

The Vite app serves those files through the `public/yugioh_cards` symlink. Do not replace these paths with external image hotlinks.

## Development

```sh
npm ci
npm run dev -- --host 127.0.0.1
npm run typecheck
npm run build
npm run preview
```

## Test Decks

Default local duels use character-themed GOAT test decks from the local card
bundle: `Yugi Goat Test Deck` and `Seto Kaiba Goat Test Deck`. These are for
prototype coverage and visual/gameplay testing, not ranked or competitive deck
defaults.

For scraper maintenance:

```sh
npm --prefix card_scraper ci
npm --prefix card_scraper run typecheck
npm --prefix card_scraper test
```

## Vercel

Use the standard Vite settings:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci`

Generated folders, dependency installs, local OS metadata, and scraper artifacts are excluded by `.gitignore` and `.vercelignore`. The local card bundle remains included for the first deploy target.
