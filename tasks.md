# YUGIOH Frontend Tasks

## Purpose

Build the frontend app-shell flow for the existing Yu-Gi-Oh duel prototype:

1. Home screen
2. Join / lobby screen
3. Player 1 and Player 2 game views
4. Spectator mode
5. Validation that the existing duel screen still works

This is a frontend-focused task list. Do not rewrite the engine or card rules.

---

## Operating Instructions for Claude Code

- Work from the `main` branch baseline only.
- Create or use a frontend-specific worktree/branch before implementation.
- Keep changes focused on frontend app-shell, viewer-role routing, UI components, styles, and tests.
- Do not broaden scope into full online multiplayer unless existing repo code already supports it.
- Do not rewrite the game engine.
- Do not change card rules, card scripts, deck validation, or card data unless a frontend integration requires a small adapter change.
- Prefer small, isolated commits/tasks.
- Update this file as each task progresses.
- Use only these task statuses:
  - `TODO`
  - `IN_PROGRESS`
  - `DONE`
  - `BLOCKED`

---

## Required Design Follow-Up Questions

Before design-dependent implementation, ask the user as many follow-up questions as needed. Do not guess on visual/design choices unless the user explicitly says to use best judgment.

At minimum, ask about:

1. Home screen visual direction:
   - Dark fantasy?
   - Classic Yu-Gi-Oh inspired?
   - Clean modern game lobby?
   - Use placeholder styling until final art exists?

2. Home page background:
   - Is the asset already available?
   - Desired filename/path?
   - Should a CSS gradient placeholder be used until the asset is added?

3. Title / logo:
   - Exact title text?
   - Use plain text or image logo?
   - Any subtitle/tagline?

4. Music behavior:
   - Should music start only after clicking `Play` / `Start Music`?
   - Should music continue between Home, Lobby, Game, and Spectator?
   - Should mute state persist across screens?

5. Lobby behavior:
   - Should `Enter Spectator Mode` require a name?
   - Should Player 1 / Player 2 selection be radio buttons, cards, or buttons?
   - Should the app prevent both local users from choosing the same slot, or is this only a local role selector?

6. Player names:
   - Default names if blank?
   - Max length?
   - Where should names appear in-game?

7. Spectator mode:
   - Board only, or board plus side panel?
   - Should spectator see phase, turn, LP, chain, and action log?
   - Should spectator be able to click public cards for details?
   - Should all gameplay buttons be hidden or simply disabled?

8. Routing:
   - Use simple React state only?
   - Or use URL routes such as `/`, `/join`, `/game`, `/spectate`?

9. Responsive layout:
   - Desktop-first only for MVP?
   - Mobile/tablet support required in this task?

10. Assets:
   - Home background asset path.
   - Logo/title asset path if any.
   - Optional lobby background.
   - Optional sound effects.

---

## Known Repo Context

- The repo is already a Vite + React frontend prototype.
- The app currently goes from card loading directly into the duel screen.
- The existing duel UI has separate `Board`, `Hand`, `MusicPlayer`, status, phase, prompt, priority, and chain surfaces.
- The existing music player can be reused/refactored.
- The current gameplay path is largely Player 1 oriented, so Player 2 support requires viewer-role/action refactoring.
- Spectator mode should reuse the existing board where possible and remove/hide gameplay controls.

---

# Task Queue

## FE-000: Create frontend worktree and branch

Status: DONE

Notes: Work is on branch `front-end`, already isolated from `main` (branched after merge commit `4802900`). No additional worktree created — existing branch satisfies the isolation requirement.

### Goal

Create an isolated frontend work area from `main`.

### Actions

1. Confirm the current branch and repo status.
2. Ensure the baseline is `main`.
3. Create a frontend branch/worktree:
   - Suggested branch: `frontend/home-lobby-spectator`
   - If already in a Claude Code worktree, confirm it is isolated and on an appropriate branch.
4. Do not make feature changes in this task.

### Acceptance Criteria

- Work is isolated from the main checkout.
- Branch/worktree name is reported.
- No source changes are made except this task file if needed.

---

## FE-001: Ask and record design decisions

Status: DONE

### Goal

Collect enough design direction to avoid guessing on visual UX choices.

### Actions

1. Ask the user all design follow-up questions needed.
2. Record the final decisions in this file under `Design Decisions`.
3. Mark unanswered but non-blocking choices as `User deferred, use best judgment`.
4. Do not implement visual screens until core visual decisions are answered or deferred.

### Acceptance Criteria

- Design questions have been asked.
- User answers or explicit deferrals are recorded.
- Any remaining blockers are listed clearly.

---

## Design Decisions

Status: DONE

- Home visual style: Classic Yu-Gi-Oh inspired — warm gold (`--gold #b28b43`) + parchment accents on dark slate, cohesive with existing duel mat. No dark-neon/cyberpunk.
- Home background asset: None available — CSS gradient/pattern placeholder echoing the duel mat. Asset hooks kept ready (one URL constant to swap later).
- Title / logo: Typeset text. Title text "GOAT DUEL" (matches `index.html` title "GOAT Duel Screen"). Subtitle: "Goat-format Yu-Gi-Oh prototype". Asset swap path available if logo image is added later.
- Music behavior: Start on first user gesture (Play on Home — satisfies browser autoplay). Track + mute state persists across Home → Lobby → Game → Spectator. Single `MusicPlayer` instance lifted to App.
- Lobby behavior: Two seat cards (P1, P2) shown side by side, each with its own name field. Spectator entry has its own optional name field (default `"Spectator"`). "Enter as Player 1" / "Enter as Player 2" / "Enter as Spectator" actions. Local-only — no slot locking.
- Player name defaults: `"Player 1"` / `"Player 2"` / `"Spectator"`. Max length 20 chars. Whitespace trimmed; blank → default.
- Spectator layout: Board + LP/phase/turn + chain panel + action log. Hands hidden. All gameplay buttons hidden/disabled. Public face-up cards clickable for detail.
- Routing approach: Local React state (`screen: "home" | "lobby" | "game" | "spectator"`). No router library. Refresh always lands on Home.
- Responsive target: Desktop-first, graceful down to ~768px tablet. Duel screen retains landscape assumption.
- Optional assets: All deferred — none required to ship MVP. Asset hooks documented in code with one-line comments where applicable.

---

## FE-010: Add frontend app-shell screen flow

Status: DONE

### Goal

Introduce a simple screen flow so the app no longer loads directly into the duel screen.

### Actions

1. Add frontend screen state for:
   - `home`
   - `lobby`
   - `game`
   - `spectator`
2. Add session state for:
   - selected role: `P1`, `P2`, or `spectator`
   - Player 1 name
   - Player 2 name
   - optional spectator name
3. Keep card loading and error handling intact.
4. Keep duel state creation/reset behavior intact.
5. Choose simple local React state unless the user explicitly wants URL routing.

### Acceptance Criteria

- App can render Home, Lobby, Game, and Spectator states.
- Existing loading and error states still work.
- No engine/rules changes are introduced.

---

## FE-020: Build Home screen

Status: DONE

### Goal

Create the first screen users see before joining a duel.

### Actions

1. Create a Home screen component.
2. Add:
   - title/logo area
   - background image or approved placeholder
   - `Play` button
   - music start/mute control
3. Reuse/refactor the existing `MusicPlayer` where practical.
4. Ensure browser autoplay limitations are handled by requiring a user action to start audio if needed.
5. Navigate to Lobby after `Play`.

### Acceptance Criteria

- Home screen displays before the lobby.
- `Play` advances to Lobby.
- Music control works on Home.
- Mute/unmute behavior is clear.
- Existing duel screen remains reachable.

---

## FE-030: Build Join / Lobby screen

Status: DONE

### Goal

Let users enter a name, choose a role, and enter either game or spectator mode.

### Actions

1. Create a Lobby screen component.
2. Add player name input.
3. Add role selection:
   - Player 1
   - Player 2
4. Add buttons:
   - `Enter Game`
   - `Enter Spectator Mode`
5. Validate required fields based on design decisions.
6. Save selected role/name into app session state.
7. Keep the lobby local-only unless real multiplayer/session code already exists.

### Acceptance Criteria

- User can enter a name.
- User can select Player 1 or Player 2.
- `Enter Game` opens the game view.
- `Enter Spectator Mode` opens spectator mode.
- Selected name/role persists while navigating into the selected view.

---

## FE-040: Add viewer role support for Player 1 and Player 2

Status: DONE

### Goal

Make the existing duel view work from either Player 1 or Player 2 perspective.

### Actions

1. Introduce a frontend viewer role model:
   - `P1`
   - `P2`
   - `spectator`
2. Refactor frontend helpers so viewer-specific behavior is not hardcoded to `P1`.
3. Ensure Player 1 actions dispatch as `P1`.
4. Ensure Player 2 actions dispatch as `P2`.
5. Ensure each player sees their own hand.
6. Ensure opponent hand/cards remain hidden according to existing engine serialization.
7. Keep spectator read-only.

### Acceptance Criteria

- Player 1 view can play as Player 1.
- Player 2 view can play as Player 2.
- The correct player hand is shown.
- The opposite player hand remains hidden.
- Existing prompts/priority/chain/phase actions work from the selected player perspective where supported.
- Spectator does not dispatch gameplay actions.

---

## FE-050: Update active game view UI

Status: DONE

### Goal

Reuse the current duel UI while making it role-aware and name-aware.

### Actions

1. Keep the existing board/hand/rail structure where possible.
2. Replace static labels with session names:
   - Player 1 display name
   - Player 2 display name
3. Show the hand only for the active viewer.
4. Keep current controls for the selected player:
   - placement
   - attack
   - phase/turn flow
   - prompt/priority/chain controls
   - LP edit if still desired
5. Add a simple way back to Lobby or Home only if approved by design decisions.

### Acceptance Criteria

- Game screen still looks/functionally behaves like the current duel screen.
- Player names appear correctly.
- The selected viewer controls the correct player.
- Existing reset/fullscreen/music behavior still works or is intentionally repositioned.

---

## FE-060: Create Spectator mode

Status: DONE

### Goal

Create a read-only board-focused spectator view.

### Actions

1. Create a spectator layout using the existing board where possible.
2. Hide both player hands.
3. Remove or disable all gameplay actions:
   - card placement
   - attacks
   - phase advancement
   - prompt answers
   - priority passing
   - chain resolution
   - LP editing unless explicitly approved
4. Show read-only game context:
   - board
   - Player 1 / Player 2 names
   - LP
   - phase
   - turn
   - optional chain/action log if approved
5. Allow public card detail viewing only if approved.

### Acceptance Criteria

- Spectator view shows the board clearly.
- No hand cards are visible.
- No gameplay actions can be taken.
- LP, phase, and turn are visible.
- Board-focused layout is visually distinct from player mode.

---

## FE-070: Add frontend styling and asset integration

Status: DONE

### Goal

Add styles/assets for Home, Lobby, and Spectator without disrupting the existing duel layout.

### Actions

1. Add CSS for Home screen.
2. Add CSS for Lobby screen.
3. Add CSS for Spectator screen.
4. Add/verify asset paths:
   - home background image
   - optional logo/title image
   - optional lobby background
   - optional sound effects
5. Use placeholders only when approved or assets are missing.
6. Preserve current board styling and responsive behavior.

### Acceptance Criteria

- Home, Lobby, and Spectator screens are visually complete for MVP.
- Missing optional assets do not break the app.
- Existing board styling remains intact.
- CSS remains maintainable and scoped by screen/component classes.

---

## FE-080: Add tests / smoke coverage

Status: DONE

### Goal

Add lightweight coverage for the new screen flow and role handling.

### Actions

1. Add or update tests for:
   - app starts at Home after card load
   - Play opens Lobby
   - Player 1 selection opens game as Player 1
   - Player 2 selection opens game as Player 2
   - Spectator mode hides hands and gameplay controls
2. Prefer focused smoke tests over broad brittle UI tests.
3. Do not weaken existing tests.

### Acceptance Criteria

- New screen flow has test coverage.
- Player/spectator visibility rules are tested.
- Existing tests still pass.

---

## FE-090: Validate and report

Status: DONE

### Goal

Confirm the frontend branch is ready for review.

### Actions

1. Run:
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
2. Fix any failures caused by this work.
3. Report:
   - files changed
   - commands run
   - pass/fail results
   - remaining risks
   - any user decisions still needed

### Acceptance Criteria

- Typecheck passes.
- Tests pass.
- Build passes.
- Final summary is provided.
- This task file has updated statuses.

---

## Assets Required

Required:

- Home page background image

Optional:

- Logo / title image
- Lobby background image
- Button sound effects
- Loading animation
- Spectator badge/icon
- Custom font

---

## Out of Scope for This Frontend Pass

- Real online matchmaking
- Server-backed seat claiming
- WebSocket synchronization
- New card rules
- New card scripts
- Deck builder changes
- Full multiplayer backend
- Full visual redesign of the duel board
- Replacing the existing engine
