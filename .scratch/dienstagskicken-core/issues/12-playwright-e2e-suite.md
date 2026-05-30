# 12 — Playwright E2E Suite

Status: completed

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## What to build

Implement the full Playwright E2E test suite covering the golden paths and critical edge cases. Tests run against a real local Next.js server connected to a real PostgreSQL test database that is seeded and torn down per test run.

**Test scenarios:**

1. **Goldener Pfad (Admin-Flow)** — Log in as admin → plan a match with attendees → assign teams (Rot/Gelb) → record goals and assists → verify the completed match appears in the public Spielübersicht with the correct score and scorers.

2. **Leaderboard-Korrektheit** — Seed a Saison with known match data → navigate to the public leaderboard → verify all five categories (Torjägerliste, Vorlagenliste, Punktetabelle, Anwesenheitsliste, Bierliste) show the expected rankings, including tie handling.

3. **Saisonwechsel** — Verify the season selector updates all leaderboard data; verify the Ewige Tabelle aggregates across seeded seasons.

4. **Zugriffskontrolle** — Verify admin routes redirect unauthenticated users to `/anmelden`; verify public routes are accessible without a session.

5. **Abgesagtes Spiel** — Cancel a planned match; verify it appears in the Spielübersicht labelled `Abgesagt`; verify it is excluded from all leaderboard stats.

## Acceptance criteria

- [x] All five E2E scenarios pass against a real local DB
- [x] Test database is seeded before each test run and torn down after
- [x] Tests are runnable with `playwright test` locally and in CI
- [x] No test relies on mocked database or API responses

## Blocked by

- `09-statistik-engine-leaderboards.md`
- `10-spieluebersicht.md`
