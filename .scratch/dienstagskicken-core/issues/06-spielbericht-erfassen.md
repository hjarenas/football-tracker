# 06 — Spielbericht erfassen (Step 3)

Status: ready-for-agent

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## What to build

Implement the third and final step of the match entry flow: recording goals and completing the match. This is done after the match ends.

From the Spiel detail page (status `teams_zugewiesen`), the admin logs each Tor with:
- Scorer (Spieler from the match's attendees)
- Optional assist (Spieler from the match's attendees, different from scorer)
- Eigentor flag (boolean)
- Team the goal is attributed to (Rot or Gelb)

When an Eigentor is flagged, the goal is attributed to the opposing team's score — not the scorer's personal Tore tally.

The final score is never stored — it is always derived as the count of Tor records per team (accounting for Eigentore). The UI displays the derived score.

On confirmation the Spiel transitions to `abgeschlossen`.

Covers user stories: 19, 20, 21, 26, 27.

## Acceptance criteria

- [ ] Admin can add Tor records with scorer, optional assist, eigentor flag, and team
- [ ] Eigentore are attributed to the conceding team's score, not the scorer's tally
- [ ] Derived score is shown correctly in the UI during entry
- [ ] Spiel transitions to `abgeschlossen` on confirmation
- [ ] A completed Spiel is visible in the admin Spiel list with the correct derived score

## Blocked by

- `05-teams-zuweisen.md`
