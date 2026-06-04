# 17 — Schema: add `vereinsmitglied` to Spieler

Status: done

## What to build

Add `vereinsmitglied Boolean @default(false)` to the `Spieler` model in `prisma/schema.prisma` and generate a Prisma migration. No UI, no seed changes — just the schema extension that issues 19 and later slices depend on.

## Acceptance criteria

- [x] `Spieler` model has `vereinsmitglied Boolean @default(false)`
- [x] Migration file generated via `prisma migrate dev` and committed
- [x] Existing records default to `false` (no data loss)
- [x] `prisma generate` runs without errors
- [x] `rtk tsc` passes with no new errors

## Blocked by

None — can start immediately.
