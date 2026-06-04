# 18 — Pure module `spieler-sortierung` + Vitest unit tests

Status: done

## What to build

Create `src/lib/spieler-sortierung.ts` — a pure function that accepts a list of Spieler (each annotated with their most recent `Spielteilnahme` date or `null`) and a reference date, and returns the list partitioned into three activity buckets, alphabetically sorted within each:

- Bucket 1: last participation within 90 days of reference date
- Bucket 2: last participation within 365 days but not within 90 days
- Bucket 3: no participation in the last 365 days, or never participated (`null`)

No DB calls. The function is pure. Follow the pattern of `src/lib/score.ts` and `src/lib/statistik-engine.ts`.

Add unit tests in `tests/unit/spieler-sortierung.test.ts` covering all six cases from the PRD:

- All players in bucket 1 when all have recent participation
- Mixed buckets — correctly partitioned and alphabetically sorted within each
- Player with `null` last-participation date lands in bucket 3
- Edge: participation exactly on the 90-day boundary
- Edge: participation exactly on the 365-day boundary
- Empty input returns empty output

## Acceptance criteria

- [x] `src/lib/spieler-sortierung.ts` exists and exports a pure sorting function
- [x] All six unit test cases pass (`rtk vitest run`)
- [x] `rtk tsc` passes with no new errors
- [x] No DB imports in the module

## Blocked by

- `17-schema-vereinsmitglied.md`
