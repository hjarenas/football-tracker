# 11 — Ewige Tabelle

Status: completed

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## What to build

Implement the all-time leaderboard page (Ewige Tabelle) showing aggregated stats across every recorded Saison. This reuses the Statistik-Engine with an "all-time" scope parameter.

The page shows the same five categories as the season leaderboards (Tore, Vorlagen, Punkte, Anwesenheit, Bier) but aggregated across all Saisons in the database. Tied Spieler share the same rank.

Covers user story: 7.

## Acceptance criteria

- [x] Public Ewige Tabelle page at `/ewige-tabelle` shows all-time totals for all five categories
- [x] Stats aggregate correctly across multiple Saisons
- [x] Cancelled matches are excluded
- [x] Tied Spieler share the same rank
- [x] Page is mobile-first and in German

## Blocked by

- `09-statistik-engine-leaderboards.md`
