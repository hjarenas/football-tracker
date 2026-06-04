# 21 — Inline player creation in match setup

Status: done

## What to build

Add an "Add new player" affordance inside `SpielPlanenFormular` (attendee picker section only). The affordance is a text input + confirm button. On confirm it calls `spielerErstellenAction(name)` from issue 19. On success, the new Spieler is automatically appended to the selected attendees — the admin does not need to find and select them manually.

Behaviour:
- The inline form asks for name only (no other fields)
- On success the input clears and the new player appears checked in the attendee list
- The Bierbringer picker does not need an inline creation affordance
- No navigation away from match setup

**E2E test**: admin opens match setup, creates a player inline, and that player appears in the selected attendees list.

## Acceptance criteria

- [x] "Add new player" affordance visible in the attendee picker section of `SpielPlanenFormular`
- [x] Submitting a name calls `spielerErstellenAction` and auto-selects the new player in attendees
- [x] Input clears after successful creation
- [x] New player persists in the DB (visible on `/admin/spieler`)
- [x] E2E test passes: inline-created player appears selected in attendees
- [x] `rtk tsc` passes with no new errors

## Blocked by

- `19-admin-spielerverwaltung.md` ✅ done
- `20-picker-aktivitaets-sortierung.md` ✅ done
