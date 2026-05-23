# GOAT Duel Screen

Lightweight Vite/React prototype for a GOAT-era Yu-Gi-Oh duel screen. The app loads local card metadata from `/yugioh_cards/cards.json` and local WebP card images from `/yugioh_cards/images`.

## Runtime Assets

The card bundle is checked in under `public/yugioh_cards/` and served by Vite at `/yugioh_cards/`:

- `public/yugioh_cards/cards.json`
- `public/yugioh_cards/images/{passcode}_{slugified-card-name}.webp`

Do not replace these paths with external image hotlinks.

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

## Vercel

Use the standard Vite settings:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci`

Generated folders, dependency installs, and local OS metadata are excluded by `.gitignore` and `.vercelignore`. The local card bundle under `public/yugioh_cards/` remains included for the deploy target.
