# 19 — `/admin/spieler` management page + player server actions

Status: done

## What to build

A full vertical slice delivering the player management page at `/admin/spieler` end-to-end: four server actions, the page UI, and E2E test coverage.

**Server actions** (new file, e.g. `src/app/admin/spieler/actions.ts`):
- `spielerErstellenAction(name)` — creates a Spieler with `aktiv = true`, `vereinsmitglied = false`; returns `{ id, name }`
- `spielerUmbenennenAction(id, name)` — renames a Spieler
- `spielerAktivToggleAction(id, aktiv)` — toggles `aktiv`
- `spielerVereinsToggleAction(id, vereinsmitglied)` — toggles `vereinsmitglied`

**Page** at `/admin/spieler`:
- Admin-only (existing middleware covers this automatically)
- Lists all Spieler alphabetically — both `aktiv` and inactive
- Each row: name, `vereinsmitglied` badge, `aktiv` toggle, rename affordance
- No delete affordance

**E2E tests** (extend `tests/e2e/`, following existing patterns):
- Admin navigates to `/admin/spieler`, creates a player, sees them in the list
- Admin toggles `aktiv` off; player disappears from match setup attendee picker
- Admin toggles `vereinsmitglied`; badge reflects the change
- Admin renames a player; new name appears in the list

## Acceptance criteria

- [x] All four server actions exist and are covered by E2E tests
- [x] `/admin/spieler` renders the full player list (aktiv + inactive)
- [x] Unauthenticated access to `/admin/spieler` redirects to `/anmelden`
- [x] `aktiv` toggle works and inactive players are hidden from match setup pickers
- [x] `vereinsmitglied` badge reflects current state after toggle
- [x] Rename updates name in the list
- [x] All E2E tests pass (`rtk playwright test`)
- [x] `rtk tsc` passes with no new errors

## Blocked by

- `17-schema-vereinsmitglied.md`
