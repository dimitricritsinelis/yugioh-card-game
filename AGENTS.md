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

The app is now **online-only** (Supabase-backed multiplayer, deployed on Vercel).
See "Deployment & Online Backend Ops" below. Do not re-add the old local hot-seat
duel mode. Do not add auth, a deck builder, drag-and-drop, or full card effect
automation unless explicitly requested.

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

## Deployment & Online Backend Ops

The online game has three moving parts that must stay in sync: the **Vercel**
deployment (frontend + `/api/game` function), the **Supabase** Postgres database
(schema via migrations), and the env vars that connect them. This section is the
playbook — follow it so we don't rediscover these footguns each time.

### Identifiers

- **Vercel project**: `yugioh` (`projectName` in `.vercel/project.json`), scope
  `dimitri-projects`. Public production alias: **https://yugioh-psi.vercel.app**.
- **Supabase project ref**: `cpthdosxyzrgdwgeoukd` (region: East US).
- Both CLIs are already authenticated on this machine (`vercel whoami`,
  `npx supabase projects list`). Do not run interactive `login` flows.

### Environment / SSL footguns (read first)

- **`vercel env pull` is flaky on repeated calls** — it sometimes writes an
  empty file (every key blank), which then yields `401 No API key found`.
  Always guard: pull to a temp file, check the key length is non-zero before
  using it, and re-pull if empty. Delete the temp env file when done (it holds
  the service-role key).
- **Python `urllib`/`requests` cannot verify TLS certs on this machine**
  (`CERTIFICATE_VERIFY_FAILED`). Use **`curl`** for any HTTPS call. If you must
  use Python, only parse already-fetched local JSON — never let Python open the
  socket.
- **Never commit secrets.** `.vercel/`, `.claude/`, `.env*`, and
  `supabase/.temp/` are gitignored — keep them that way. Server code reads all
  secrets from env vars (`src/online/server/supabaseAdmin.ts`), never literals.

### Reading prod env vars (names + values)

```sh
vercel env pull /tmp/v.env --environment=production --yes   # may need a retry
grep -oE '^[A-Z_]+=' /tmp/v.env | sort -u                   # names only
# Required keys: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GAME_SEAT_TOKEN_SALT,
#                VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
rm -f /tmp/v.env                                            # scrub when done
```

### Deploying to Vercel

Pushing to `main` does **not** reliably trigger a production deploy (the git
integration may only build Previews). **Deploy explicitly from the repo root:**

```sh
vercel --prod --yes            # build + deploy + alias yugioh-psi.vercel.app
vercel --prod --yes --force    # same, bypassing the build cache
vercel ls --prod               # list recent production deployments
```

Verify the public alias actually serves the new build (don't trust the deploy
log alone — confirm the bundle hash changed and a known new string is present):

```sh
JS=$(curl -sS https://yugioh-psi.vercel.app/ | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | grep -v css | head -1)
curl -sS "https://yugioh-psi.vercel.app/$JS" | grep -c "SomeNewUIString"
```

### Supabase schema = migrations (NOT ad-hoc SQL)

The DB schema lives in `supabase/migrations/*.sql`. A migration that exists in
the repo but was never pushed = the live DB is behind, and the API fails at
runtime (e.g. `Could not find the 'realtime_topic' column`). After **any**
schema change, push migrations:

```sh
# supabase/config.toml is gitignored, so re-link first (CLI is already authed):
npx supabase link --project-ref cpthdosxyzrgdwgeoukd --yes
npx supabase migration list --linked --yes        # local vs remote: spot un-pushed files
npx supabase db push --linked --dry-run --yes     # preview
npx supabase db push --linked --yes               # apply
```

- Migrations run **inside a transaction** — a failed migration rolls back
  cleanly, so it's safe to fix the `.sql` and re-push.
- **Postgres extension gotcha**: Supabase puts `pgcrypto` (`gen_random_bytes`,
  etc.) in the `extensions` schema. Migrations set `search_path = public`, so
  extension functions are NOT found. Prefer built-ins like `gen_random_uuid()`,
  or schema-qualify (`extensions.gen_random_bytes(...)`).
- The Supabase **Management API** (`api.supabase.com`) needs a real PAT; the
  keychain CLI token is go-keyring-wrapped and returns `JWT could not be
  decoded` if used raw with curl. So drive DDL through the **CLI**, not raw
  Management API calls.

### Service-role REST API (data rows only, never DDL)

For reading/writing/deleting rows (e.g. cleaning up test games), use the
PostgREST data API with the service-role key. It bypasses RLS but **cannot run
DDL** — that's migrations' job.

```sh
URL=https://cpthdosxyzrgdwgeoukd.supabase.co
K=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' /tmp/v.env | cut -d= -f2- | tr -d '"')
[ ${#K} -ge 40 ] || { echo "empty key, re-pull"; }    # guard the flaky pull
curl -sS "$URL/rest/v1/duel_games?select=code,status" -H "apikey: $K" -H "Authorization: Bearer $K"
# DELETE requires a filter: ...?code=eq.ABC123 or ...?code=in.(A,B). Add
# -H "Prefer: count=exact" + -I to read a Content-Range total.
```

### `/api/game` request contract (when smoke-testing the function directly)

POST JSON to `/api/game` with a flat `op` field (NOT `action`/nested `payload`).
The P1/P2 **seat token is returned as an HttpOnly cookie** — use a curl cookie
jar (`-c`/`-b`) to carry it across calls.

```sh
API=https://yugioh-psi.vercel.app/api/game
# host (auto-claims P1); save cookie for later authed calls:
curl -sS -c /tmp/p1.jar -X POST $API -H 'Content-Type: application/json' \
  -d '{"op":"createGame","p1Name":"Yugi","clientId":"smoke-p1"}'
# opponent claims P2 -> status flips to "active":
curl -sS -X POST $API -H 'Content-Type: application/json' \
  -d '{"op":"claimSeat","gameIdOrCode":"<CODE>","role":"P2","playerName":"Kaiba","clientId":"smoke-p2"}'
# spectator view (no auth):
curl -sS -X POST $API -H 'Content-Type: application/json' \
  -d '{"op":"getView","gameIdOrCode":"<CODE>","viewerRole":"spectator"}'
```

Clean up any smoke-test games afterward via the service-role REST API above.

### End-to-end deploy checklist

1. `npm run typecheck && npm test && npm run build` pass locally.
2. Merge the PR to `main` (default branch is **`main`**, not `master`).
3. If migrations changed: `npx supabase db push --linked --yes` and confirm
   `migration list` shows them applied on Remote.
4. `vercel --prod --yes`, then confirm the alias serves the new bundle.
5. Smoke-test `/api/game` host→join→spectate against production; delete the
   test rows.
