# 08 — Spiel bearbeiten

Status: completed

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## What to build

Allow an admin to edit a completed match to correct data entry mistakes. Any field from any of the three entry steps can be corrected: date, beer bringer, attendees, team assignments, points overrides, and goal records (add, edit, delete).

Editing a completed Spiel does not change its status — it remains `abgeschlossen`. All derived statistics (leaderboards, scores) update automatically since they are always computed from the underlying data.

Covers user story: 23.

## Acceptance criteria

- [x] Admin can edit date, beer bringer, and attendees on a completed Spiel
- [x] Admin can edit team assignments and points overrides on a completed Spiel
- [x] Admin can add, edit, and delete Tor records on a completed Spiel
- [x] Spiel status remains `abgeschlossen` after editing
- [x] Leaderboard statistics reflect corrections immediately after save

## Blocked by

- `06-spielbericht-erfassen.md`
