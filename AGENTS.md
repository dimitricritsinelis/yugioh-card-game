# GOAT Duel Screen Agent Notes

## Project Goal

This repo is building a lightweight local browser prototype for a GOAT-era Yu-Gi-Oh style duel screen. The current goal is fast visual and interaction iteration, not a full game engine.

The app should:

- Load real card metadata from `/yugioh_cards/cards.json`.
- Render card images from local files only: `/yugioh_cards/images/...`.
- Randomly assign Yugi or Seto Kaiba GOAT test decks for local default matches.
- Show a playable single-player test board with hand, zones, LP, phase controls, action log, and card detail HUD.
- Keep cards as the visual centerpiece. Board chrome should support readability, not compete with the cards.

## Scope Boundaries

Do not add backend services, auth, Supabase, multiplayer, deck builder, drag-and-drop, or full card effect automation unless explicitly requested.

Prefer simple React, TypeScript, and CSS changes. Avoid heavy UI or animation libraries.

## Design Direction

The UI should be modern, clean, and space-efficient with subtle original Yu-Gi-Oh influence. Avoid dark neon/cyberpunk styling that distracts from the cards.

Priorities:

- The full board should fit on one browser screen.
- Field cards and hand cards must be easy to see.
- The center board gets priority over HUDs.
- Side HUDs should stay slim and useful.
- Avoid overlap, wasted gaps, and text lines crossing visual boundaries.
- Preserve symmetry between player and opponent zones.

## Data Notes

The card bundle lives under `public/yugioh_cards/` and is served by Vite at `/yugioh_cards/`:

- `public/yugioh_cards/cards.json`
- `public/yugioh_cards/images/{passcode}_{slugified-card-name}.webp`

Use local image paths only. Do not hotlink external card images.

Default duel presets live in `src/engine/goatTestDecks.ts`. They are local
prototype test decks, not ranked or competitive deck defaults.

## Quick Test Loop

Keep testing lightweight. Do the smallest check that matches the change.

For CSS/layout-only changes:

1. Reload the running app at `http://127.0.0.1:5173/`.
2. Do one quick browser geometry or visual check focused on the changed area.
3. If visual layout changed, take one temporary Chrome screenshot and inspect it.

For TypeScript/React logic changes:

1. Run `npm run typecheck`.
2. Reload the app.
3. Do one quick interaction check for the changed behavior.

For dependency, build config, or release-readiness changes:

1. Run `npm run typecheck`.
2. Run `npm run build`.

Avoid running full builds repeatedly during pure design iteration.

## Screenshot Feedback Loop

Screenshots are for the agent feedback loop, not for storage.

Approach:

- Use headless Google Chrome with a temporary profile.
- Save the screenshot under `/tmp`, inspect it, then delete or ignore it.
- The app fetches its card bundle asynchronously, so a bare `--screenshot`
  captures the loading spinner. `--virtual-time-budget` makes Chrome wait for
  the load to finish before capturing. Do NOT pass `--disable-background-networking`
  — it interferes with the virtual-time wait.

Example:

```sh
'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  --headless=new \
  --disable-gpu \
  --hide-scrollbars \
  --window-size=1972,1200 \
  --virtual-time-budget=6000 \
  --user-data-dir=/tmp/goat-duel-chrome-check \
  --screenshot=/tmp/goat-duel-layout.png \
  'http://127.0.0.1:5173/?scenario=demo'
```

Then inspect `/tmp/goat-duel-layout.png` visually. Do not keep it as a project artifact.

### Demo scenario

`?scenario=demo` (dev mode only — `import.meta.env.DEV`, so it never ships) boots
a fully populated board: face-up and face-down field cards, an activated spell,
occupied Graveyard and Banished piles, and a selected card. Use it so a single
screenshot verifies every visual state without clicking through actions. Omit the
query string to capture the normal opening-hand state.

## Development Commands

```sh
npm run dev -- --host 127.0.0.1
npm run typecheck
npm run build
```

Use `npm run build` sparingly during rapid UI iteration.
