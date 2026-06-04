# PRD — Spielerverwaltung

Status: ready-for-agent

## Problem Statement

Admins cannot start a match because there are no players in the system. There is no UI to register players, no way to add a new player on the fly when someone new shows up, and no way to distinguish club members from guests. The Spieler list in the match setup form is also unordered, which slows down attendance selection when the pool grows.

## Solution

Introduce a dedicated player management page at `/admin/spieler` where admins can register, rename, and toggle players. Add inline player creation inside the match setup flow so a new player can be registered and immediately added to the match. Add a `vereinsmitglied` flag to Spieler. Order the attendee picker in match setup by recent activity so the most likely participants appear first.

## User Stories

1. As an admin, I want to open a player management page, so that I can see all registered players.
2. As an admin, I want to create a new Spieler by name, so that they are available for selection in future matches.
3. As an admin, I want to rename a Spieler, so that I can correct typos or update their display name.
4. As an admin, I want to toggle a Spieler's `aktiv` flag, so that players who have left the group no longer appear in match setup pickers.
5. As an admin, I want to mark a Spieler as `vereinsmitglied`, so that I can track which players are formal club members.
6. As an admin, I want to unmark a Spieler as `vereinsmitglied`, so that I can correct the flag if it was set in error.
7. As an admin, I want inactive players (`aktiv = false`) to remain visible on the management page, so that I can reactivate them if they return.
8. As an admin, I want the management page sorted alphabetically, so that I can find a specific player quickly by name.
9. As an admin, I want to see each player's `vereinsmitglied` and `aktiv` status at a glance, so that I can manage the pool without opening each player individually.
10. As an admin, I want to add a new player inline while planning a match, so that I can register a first-time attendee without navigating away from match setup.
11. As an admin, I want an inline-created player to be automatically added to the current match's attendance list, so that I don't have to find and select them manually afterwards.
12. As an admin, I want inline player creation to ask for the name only, so that I can complete the action quickly during match setup.
13. As an admin, I want inactive players hidden from the attendee picker in match setup, so that the picker stays focused on the active player pool.
14. As an admin, I want the attendee picker to show players who participated in the last 90 days first, so that the most likely participants are at the top.
15. As an admin, I want players who participated in the last year (but not the last 90 days) shown in the second group, so that occasional players are still easy to find.
16. As an admin, I want players with no participation in the last year shown last, so that rarely-active players don't clutter the top of the picker.
17. As an admin, I want players within each activity group sorted alphabetically, so that the ordering within a group is predictable.
18. As an admin, I want the same activity-based ordering applied to the beer-bringer picker in match setup, so that the experience is consistent.

## Implementation Decisions

### Schema change
Add `vereinsmitglied Boolean @default(false)` to the `Spieler` model. No other schema changes. A migration is required.

### New pure module: `spieler-sortierung`
A pure function that accepts a list of Spieler (each annotated with their most recent Spielteilnahme date, or null) and a reference date (today), and returns the same list partitioned into three buckets and sorted alphabetically within each:
- Bucket 1: last Spielteilnahme within 90 days of reference date
- Bucket 2: last Spielteilnahme within 365 days but not within 90 days
- Bucket 3: no Spielteilnahme in the last 365 days (or never participated)

This module is pure — no DB calls. The DB query that annotates each Spieler with their most recent Spielteilnahme date lives in the Server Component that owns the picker.

### Modified: match setup player query
The Server Component that renders `SpielPlanenFormular` currently fetches active Spieler. It must be extended to also fetch each player's most recent Spielteilnahme date (a subquery or aggregate join), then pass the annotated list through `spieler-sortierung` before handing it to the form.

### Modified: `SpielPlanenFormular`
- Receives players pre-sorted (order is already correct — no client-side re-sort needed).
- Gains an "Add new player" affordance in the attendee picker: a text input + confirm button that calls a new server action. On success, the new Spieler is appended to the selected attendees.
- The beer-bringer picker receives the same pre-sorted list.

### New server actions
- `spielerErstellenAction(name)` — creates a Spieler with `aktiv = true`, `vereinsmitglied = false`. Returns the new Spieler id and name.
- `spielerUmbenennenAction(id, name)` — renames a Spieler.
- `spielerAktivToggleAction(id, aktiv)` — toggles `aktiv`.
- `spielerVereinsToggleAction(id, vereinsmitglied)` — toggles `vereinsmitglied`.

### New page: `/admin/spieler`
- Admin-only (protected by existing middleware).
- Lists all Spieler alphabetically (aktiv and inactive).
- Each row: name, `vereinsmitglied` badge, `aktiv` toggle, rename affordance.
- No delete. Players with match history cannot be removed — `aktiv = false` is the retirement path.

## Testing Decisions

Good tests assert observable behavior from the outside — they do not test implementation details like internal state or private helpers.

### `spieler-sortierung` (unit tests — Vitest)
This is the primary test target. It is a pure function, which makes it trivially testable with in-memory fixture data. Prior art: `src/lib/score.ts` and `src/lib/statistik-engine.ts` are tested the same way in `tests/unit/`.

Test cases:
- All players in bucket 1 when all have recent participation.
- Mixed buckets — players correctly partitioned and alphabetically sorted within each bucket.
- Player with null last-participation date lands in bucket 3.
- Edge: participation exactly on the 90-day boundary.
- Edge: participation exactly on the 365-day boundary.
- Empty input returns empty output.

### Server actions (not unit-tested)
Server actions are thin orchestration — they validate input, call the DB, and redirect. They are covered by E2E tests, not unit tests.

### E2E (Playwright)
- Admin can navigate to `/admin/spieler`, create a player, and see them in the list.
- Admin can toggle `aktiv` and the player disappears from the match setup picker.
- Admin can toggle `vereinsmitglied` and the badge reflects the change.
- Admin can create a player inline from match setup and that player appears in the selected attendees.
- Players who played recently appear above players who have not played.

Prior art: `tests/e2e/` — existing flows for match planning and admin authentication.

## Out of Scope

- Player photos or profile pages.
- Player self-registration — admins manage the pool exclusively (no self-signup).
- Bulk import.
- Deletion of Spieler records.
- Configuring the activity window thresholds (90 days / 365 days are fixed values).
- Exposing `vereinsmitglied` in any public-facing leaderboard or stat.

## Further Notes

The `vereinsmitglied` flag is administrative only — it has no effect on statistics, leaderboards, or match participation logic.

The activity-based ordering applies only to the match setup pickers (attendees and beer-bringer). The `/admin/spieler` management page is alphabetical.
