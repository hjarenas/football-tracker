# 04 — Spiel planen + Anwesenheit (Step 1)

Status: completed

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## What to build

Implement the first step of the match entry flow: planning a match and recording who attended. This is done before the match takes place.

The admin creates a new Spiel with:
- Date field pre-filled to the next Tuesday
- Beer bringer picker (searchable list of active Spieler)
- Attendee selector — multi-select from active Spieler list

On save the Spiel is created with status `geplant` and Spielteilnahme records are created for each selected attendee (team unassigned at this point).

The Spiel-Zustandsmaschine is implemented here as a pure module and unit tested. It encodes valid state transitions: `geplant → teams_zugewiesen`, `geplant → abgesagt`. All other transitions from `geplant` are rejected.

Covers user stories: 16, 17, 26, 27.

## Acceptance criteria

- [x] Admin can create a new Spiel at `/admin/spiele/neu`
- [x] Date field defaults to the next Tuesday
- [x] Beer bringer and attendees are selectable from the active Spieler list
- [x] Saved Spiel appears in the admin Spiel list with status `geplant`
- [x] Spielteilnahme records are created for each attendee
- [x] Unit tests cover valid and invalid Spiel-Zustandsmaschine transitions from `geplant`

## Blocked by

- `03-admin-authentifizierung.md`
