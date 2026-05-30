# 05 — Teams zuweisen (Step 2)

Status: ready-for-agent

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## What to build

Implement the second step of the match entry flow: assigning each attending player to Rot or Gelb. This is done at the pitch before the match starts.

From the Spiel detail page (status `geplant`), the admin assigns each Spielteilnahme to either Rot or Gelb. The UI presents the list of attendees and allows toggling each between the two teams. An optional points_override can be set per player to handle mid-match team switches (defaults to the player's assigned team).

On save the Spiel transitions to `teams_zugewiesen`. The Spiel-Zustandsmaschine unit tests are extended to cover the `teams_zugewiesen → abgeschlossen` transition and confirm that skipping step 1 (assigning teams without prior `geplant` state) is rejected.

Covers user stories: 18, 24, 25, 26, 27.

## Acceptance criteria

- [ ] Admin can assign each attendee to Rot or Gelb from the Spiel detail page
- [ ] All attendees must be assigned before the transition to `teams_zugewiesen` is allowed
- [ ] Optional points_override is settable per player
- [ ] Saved Spiel shows status `teams_zugewiesen`
- [ ] Spiel-Zustandsmaschine unit tests cover `teams_zugewiesen → abgeschlossen` and invalid skip transitions

## Blocked by

- `04-spiel-planen-anwesenheit.md`
