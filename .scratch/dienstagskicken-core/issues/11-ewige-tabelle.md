# 11 — Ewige Tabelle

Status: ready-for-agent

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## What to build

Implement the all-time leaderboard page (Ewige Tabelle) showing aggregated stats across every recorded Saison. This reuses the Statistik-Engine with an "all-time" scope parameter.

The page shows the same five categories as the season leaderboards (Tore, Vorlagen, Punkte, Anwesenheit, Bier) but aggregated across all Saisons in the database. Tied Spieler share the same rank.

Covers user story: 7.

## Acceptance criteria

- [ ] Public Ewige Tabelle page at `/ewige-tabelle` shows all-time totals for all five categories
- [ ] Stats aggregate correctly across multiple Saisons
- [ ] Cancelled matches are excluded
- [ ] Tied Spieler share the same rank
- [ ] Page is mobile-first and in German

## Blocked by

- `09-statistik-engine-leaderboards.md`
