# 07 — Spiel absagen

Status: ready-for-agent

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## What to build

Allow an admin to cancel a planned match. A cancelled match stays in season history as `abgesagt` and is excluded from all statistics. Only matches in `geplant` status can be cancelled.

The admin cancels from the Spiel detail page. A confirmation step prevents accidental cancellation. The cancelled Spiel appears in the public match history with a clear `Abgesagt` label.

Covers user stories: 11, 22.

## Acceptance criteria

- [ ] Admin can cancel a Spiel with status `geplant`
- [ ] Cancellation requires a confirmation step
- [ ] Cancelled Spiel transitions to `abgesagt`
- [ ] Matches with status `teams_zugewiesen` or `abgeschlossen` cannot be cancelled
- [ ] Cancelled Spiel appears in the public match list labelled `Abgesagt`
- [ ] Cancelled Spiel is excluded from all leaderboard statistics

## Blocked by

- `04-spiel-planen-anwesenheit.md`
