# 02 — Datenbankschema & Seed

Status: completed

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## What to build

Define the complete Prisma schema for all domain entities and provide a seed script that populates the initial Spieler list. This is the authoritative data model that all other slices build on.

Entities to model:

- **Spieler** — name, active flag
- **Saison** — calendar year (integer)
- **Spiel** — date, Saison FK, status (`geplant | teams_zugewiesen | abgeschlossen | abgesagt`), beer bringer (Spieler FK, nullable)
- **Spielteilnahme** — Spieler × Spiel join, team (`Rot | Gelb`), points_override (`Rot | Gelb | null`)
- **Tor** — Spiel FK, scorer Spieler FK, assist Spieler FK (nullable), eigentor flag (boolean), team (`Rot | Gelb`)

The seed script populates all ~40 known Spieler by name with `active = true`, plus a seed Saison for the current calendar year.

Score is never stored — it is always derived from Tor records (see ADR-0002).

## Acceptance criteria

- [x] `prisma migrate dev` runs cleanly and creates all tables
- [x] `prisma db seed` populates all ~40 Spieler and a current Saison
- [x] All foreign key relationships are correctly constrained
- [x] Spiel status is enforced as an enum
- [x] `tsc --noEmit` passes after schema generation

## Blocked by

- `01-projekt-setup.md`
