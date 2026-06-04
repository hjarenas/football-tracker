# 20 — Activity-based picker ordering in match setup

Status: done

## What to build

Extend the Server Component that renders `SpielPlanenFormular` (at `src/app/admin/spiele/neu/`) to fetch each active player's most recent `Spielteilnahme` date alongside the player list, then pass the annotated list through `spieler-sortierung` before handing it to the form.

Changes:
- Server Component query extended to include the most recent `Spielteilnahme.spiel.datum` per player (subquery or aggregate join)
- Inactive players (`aktiv = false`) excluded from the query — they must not appear in the picker
- The sorted list is passed as the `spieler` prop to `SpielPlanenFormular` — the component itself needs no re-sort logic
- The same pre-sorted list is used for both the attendee picker and the Bierbringer picker

`SpielPlanenFormular` receives players already in the correct order; no client-side sort is needed.

**E2E test**: a player who participated in the last 90 days appears above a player who has never participated.

## Acceptance criteria

- [x] Attendee picker shows players in three-bucket activity order, alphabetical within each bucket
- [x] Bierbringer picker shows the same ordering
- [x] Inactive players do not appear in either picker
- [x] `spieler-sortierung` is the only sorting logic — no duplicated sort in the component or page
- [x] E2E test passes: recent player ranks above never-played player
- [x] `rtk tsc` passes with no new errors

## Blocked by

- `18-spieler-sortierung-modul.md`
