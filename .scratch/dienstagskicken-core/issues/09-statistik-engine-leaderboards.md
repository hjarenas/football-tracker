# 09 — Statistik-Engine + Saison-Leaderboards

Status: completed

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## What to build

Implement the Statistik-Engine as a pure computation module, then wire it to a public-facing leaderboard page with a season selector.

The Statistik-Engine accepts a Saison scope (or "all-time") and returns ranked lists for all five award categories:
- **Torjägerliste** — goals per Spieler (Eigentore excluded from scorer's tally)
- **Vorlagenliste** — assists per Spieler
- **Punktetabelle** — win/draw/loss points per Spieler (3/1/0, using points_override where set)
- **Anwesenheitsliste** — matches attended per Spieler
- **Bierliste** — beer brought per Spieler

Ties are not broken — tied Spieler share the same rank.
Cancelled matches (`abgesagt`) are excluded from all calculations.

The public leaderboard page (`/`) shows all five categories for the current Saison by default. A season selector allows browsing past seasons.

Full Vitest unit tests for the Statistik-Engine using in-memory fixture data: eigentor exclusion, tie handling, cancelled match exclusion, all-time aggregation across multiple Saisons, points_override respected.

Covers user stories: 1, 2, 3, 4, 5, 6, 12, 13, 14.

## Acceptance criteria

- [x] Statistik-Engine correctly computes all five leaderboard categories
- [x] Eigentore are excluded from scorer's Tore count
- [x] Cancelled matches are excluded from all categories
- [x] Tied Spieler share the same rank
- [x] points_override is respected in Punktetabelle computation
- [x] Vitest unit tests pass for all Statistik-Engine logic with fixture data
- [x] Public leaderboard page shows current season by default
- [x] Season selector switches all five categories to the selected Saison
- [x] Page is mobile-first and in German

## Blocked by

- `06-spielbericht-erfassen.md`
