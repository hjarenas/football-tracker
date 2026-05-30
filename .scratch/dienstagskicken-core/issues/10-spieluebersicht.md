# 10 — Spielübersicht

Status: completed

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## What to build

Implement the public match history page showing all matches in the current season. Viewers can see at a glance who won, who scored, and which matches were cancelled.

Each match entry shows:
- Date
- Derived score (Rot vs. Gelb, computed from Tor records)
- Winning team highlighted (or "Unentschieden" for a draw)
- Goal scorers and assists per team
- `Abgesagt` label for cancelled matches

A season selector (shared with the leaderboard page) allows browsing past seasons.

Covers user stories: 8, 9, 10, 11, 12, 13.

## Acceptance criteria

- [x] Public match list at `/spiele` shows all matches for the current season
- [x] Derived score is displayed correctly for each completed match
- [x] Scorers and assists are listed per match
- [x] Cancelled matches appear with `Abgesagt` label and no score
- [x] Season selector allows viewing past seasons
- [x] Page is mobile-first and in German

## Blocked by

- `06-spielbericht-erfassen.md`
