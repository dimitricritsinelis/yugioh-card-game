# Online Multiplayer

## Architecture

```text
Browser (Vite React)
  |  POST /api/game create/claim/view/move
  v
Vercel Function (api/game.ts)
  |  service-role Supabase client
  |  applies existing TypeScript engine
  |  commit_duel_move(expected_version) / commit_duel_metadata_update
  v
Supabase Postgres
  - duel_games: canonical private engine_state
  - duel_seats: one P1 and one P2 token hash
  - duel_moves: private action audit plus redacted public events
  - duel_public_invalidations: opaque-topic realtime invalidations
  |
  v
Supabase Realtime
  - clients receive realtimeTopic/version/actorRole/publicSummary
  - clients fetch /api/game getView for their viewer-safe projection
```

The browser never receives `engine_state`, raw `DuelState`, `private_action`, ordered deck contents, seat token hashes, or hidden opponent/spectator card identity. Spectators must join by share code; raw game UUID lookup is reserved for claimed players with a valid seat cookie. Mutations always go through the API route. Claimed-seat bearer tokens are set as an HttpOnly SameSite cookie; browser storage keeps only non-secret session metadata.

## Environment

Frontend variables:

```sh
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_ONLINE_MULTIPLAYER_ENABLED=true
```

Server-only variables:

```sh
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GAME_SEAT_TOKEN_SALT=long-random-secret
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Migrations

Apply the migrations in `supabase/migrations/` with your normal Supabase workflow, for example:

```sh
supabase db push
```

The migrations enable RLS, keep canonical tables private from anon clients, restrict write RPCs to `service_role`, and expose only `duel_public_invalidations` for realtime invalidation. Public invalidation rows contain the opaque `realtime_topic`, not the canonical game UUID.

## Vercel

1. Create or link the Vercel project.
2. Set all frontend and server variables in Vercel project settings.
3. Deploy the Vite app normally.
4. `vercel.json` preserves `/api/*` function routing and rewrites frontend deep links such as `/online` and `/duel/ABC123` to `index.html`.

## Local Notes

Local/offline duel mode is unchanged. During `npm run dev`, Vite hosts `/api/game` with an in-memory `InMemoryGameStore`; this supports two-tab local online play without Supabase realtime. Realtime subscriptions are optional locally, and fallback polling keeps tabs in sync.

Production/deployed online play uses the Vercel `/api/game` function and Supabase-backed state. Set the Supabase environment variables before deploying.

## Known Limitations

- Seat tokens are not full user auth.
- Realtime events are invalidations; Postgres remains the source of truth.
- Reconnect and tab visibility recovery must fetch `getView`.
- Spectator privacy depends on the redaction tests staying green.
- Many spectators may eventually need Broadcast fanout instead of per-row Postgres Changes.
