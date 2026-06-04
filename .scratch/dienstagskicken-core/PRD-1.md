# PRD: Dienstagskicken — Core Application

Status: ready-for-agent

## Problem Statement

Verein Weißkirchen's Tuesday football group (~40 players) has been tracking match results, goals, assists, attendance, and beer duty on handwritten paper sheets for over 10 years. At the end of each calendar year the group holds an award ceremony recognising top performers across several categories. There is no digital home for this data: history is fragmented across paper sheets, there is no live standings view between matches, and the manual entry process creates friction for the admin running the game.

## Solution

A mobile-first responsive web application — Dienstagskicken — that digitises the weekly match sheet. A small group of admins can plan matches, record attendance, assign teams, and log goals and assists from their phones. The full group (40+ members) can view live standings, match history, and all-time records without needing an account. At the end of each season the leaderboards serve directly as the award ceremony source.

## User Stories

### Public viewer

1. As a player, I want to see the current season's Torjägerliste (top scorers), so that I can track my standing before the award ceremony.
2. As a player, I want to see the current season's Vorlagenliste (top assists), so that I can compare my contribution with others.
3. As a player, I want to see the current season's Punktetabelle (win/draw/loss points per player), so that I know who has been on the winning side most often.
4. As a player, I want to see the current season's Anwesenheitsliste, so that I can see who has played the most matches.
5. As a player, I want to see the current season's Bierliste, so that I know who has brought the most beer.
6. As a player, I want to browse past seasons, so that I can look up results and standings from previous years.
7. As a player, I want to see an all-time leaderboard across all seasons, so that I can see who holds the overall records.
8. As a player, I want to see a list of all matches in the current season with dates and results, so that I can review recent games.
9. As a player, I want to see the scorers and assists for each match, so that I can relive the highlights.
10. As a player, I want to see which team (Rot or Gelb) won each match, so that I can follow the season narrative.
11. As a player, I want to see matches marked as cancelled, so that I understand gaps in the schedule.
12. As a player, I want to view the app comfortably on my phone, so that I can check standings at the pitch or on the way home.
13. As a player, I want the app to be in German, so that it feels natural for the group.
14. As a player, I want to see when two players are tied for an award, so that I know the ceremony will recognise both.

### Admin

15. As an admin, I want to log in with a username and password, so that I can access the data entry interface securely.
16. As an admin, I want to plan a new match with the date pre-filled to next Tuesday, so that I can set up each week's game quickly.
17. As an admin, I want to record which players are attending a planned match, so that teams can be assigned from the confirmed attendees.
18. As an admin, I want to assign each attending player to either Rot or Gelb, so that the match teams are recorded accurately.
19. As an admin, I want to log each goal with the scorer, an optional assist, and an own-goal flag, so that individual stats are captured correctly.
20. As an admin, I want own goals to count toward the team's score but not the scorer's personal Tore tally, so that stats remain fair.
21. As an admin, I want to record who brought beer for each match, so that the Bierliste stays accurate.
22. As an admin, I want to mark a planned match as cancelled, so that the season record reflects reality.
23. As an admin, I want to edit a match after saving it, so that I can correct data entry mistakes.
24. As an admin, I want a player who switched teams mid-match to default to receiving points for the team they finished with, so that the common case is handled automatically.
25. As an admin, I want to override the points attribution for a mid-match team switcher, so that edge cases (injury substitutions) can be handled correctly.
26. As an admin, I want the match entry flow to be split into three steps — plan + attendees, team assignment, match report — so that each step can be completed at the right moment (before, at, and after the match).
27. As an admin, I want the data entry interface to be optimised for mobile, so that I can use it from my phone at the pitch.

## Implementation Decisions

### Match state machine

A match progresses through three states that map directly to the three-step entry flow:

- `geplant` — date, beer bringer, and attendees recorded (before the match)
- `teams_zugewiesen` — each attendee assigned to Rot or Gelb (at the pitch)
- `abgeschlossen` — goals, assists, and own goals recorded (after the match)
- `abgesagt` — cancelled from `geplant` state; stays in season history

Only forward transitions are valid except for corrections by admin (edit).

### Core entities

- **Spieler** — name, active flag; ~40 in the pool, no self-registration
- **Saison** — calendar year (integer); awards are scoped per Saison, all-time spans all Saisons
- **Spiel** — date, Saison FK, status, beer bringer (Spieler FK)
- **Spielteilnahme** — Spieler × Spiel, team (Rot | Gelb), points override (nullable: Rot | Gelb | null meaning use team)
- **Tor** — Spiel FK, scorer (Spieler FK), assist (Spieler FK nullable), eigentor flag, team (Rot | Gelb)

### Score derivation

The final score is not stored. It is computed as `COUNT(Tor WHERE team = Rot AND NOT eigentor) + COUNT(Tor WHERE eigentor AND team = Gelb)` for Rot, and symmetrically for Gelb. No redundant score field.

### Points attribution

Each Spielteilnahme earns 3 (win), 1 (draw), or 0 (loss) points based on the match result and the player's assigned team. The `points_override` field on Spielteilnahme allows an admin to manually assign a different team for points purposes without changing the player's team assignment.

### Tore tally

Eigentore are excluded from the scorer's personal Tore count. They contribute to the conceding team's score.

### Leaderboards (Statistik-Engine)

A dedicated computation layer accepts a Saison (or "all-time") scope and returns ranked lists for each award category: Tore, Vorlagen, Punkte, Anwesenheit, Bier. Ties are not broken — all tied players share the rank.

### Auth

NextAuth.js with credentials provider (username + password). Admin status is determined by a whitelist stored in environment configuration. Public routes are fully unauthenticated. Admin routes are protected server-side.

### Modules

| Module | Responsibility |
|---|---|
| Statistik-Engine | Pure computation: leaderboards per Saison or all-time from match/event data |
| Spiel-Zustandsmaschine | Validates and executes match state transitions |
| Auth | Admin session management, whitelist check |
| Admin UI | 3-step match entry flow, mobile-first |
| Public UI | Leaderboards, match history, season selector, all-time view |
| Datenbankschema (Prisma) | Schema, migrations, seed data for Spieler list |

### UI Styling

**Component library:** shadcn/ui (built on Radix UI primitives). Components are copied into the project and fully customisable. Provides accessible, unstyled building blocks — dialogs, dropdowns, forms, tables — without imposing a visual style.

**Visual direction:** Clean and minimal. The app is data-forward — leaderboards and match history are the primary content. Typography and whitespace carry the design; decorative elements are kept to a minimum.

**Colour palette:** Rot and Gelb anchor the accent colours, mirroring the domain's team identifiers. Red and yellow are used for team badges, highlights, and key UI accents throughout. Neutral greys form the base. This makes the domain language visible in the UI — a Rot goal looks red, a Gelb goal looks yellow. The palette is defined via Tailwind CSS variables and shadcn/ui theming so it can be swapped out without touching component code.

**Responsive approach:** Mobile-first. Layouts are designed for a phone screen at the pitch first, then enhanced for larger screens.

### Stack

- Next.js + TypeScript
- Tailwind CSS (mobile-first) + shadcn/ui
- PostgreSQL + Prisma
- NextAuth.js (credentials)
- Docker + docker-compose
- Caddy (reverse proxy, auto SSL via Let's Encrypt)
- GitHub Actions → SSH deploy to Hetzner VPS

### Language

All UI copy in German.

## Testing Decisions

Good tests verify observable behaviour through the module's public interface — not internal implementation details. A test that breaks when you rename a private function is not a good test.

Testing is part of the development process, not an afterthought. New logic ships with tests. The test suite runs in CI on every push.

### Unit tests (Vitest)

Fast, in-memory, no database or network. Run on every file save during development.

**Statistik-Engine** — highest priority. Pure computation: given fixture match/event data, returns leaderboard results. Verify: correct Tore tallies excluding Eigentore, correct Punkte per Spieler across multiple matches, correct Anwesenheit counts, cancelled matches excluded from all stats, tied players share the same rank, all-time aggregation spans multiple Saisons.

**Spiel-Zustandsmaschine** — test valid and invalid state transitions. Verify: `geplant → teams_zugewiesen → abgeschlossen` is valid; skipping a step is rejected; `abgesagt` is only reachable from `geplant`; a completed match cannot be cancelled.

**Auth middleware** — verify admin-only routes reject unauthenticated requests and non-admin sessions; public routes return data without a session.

### E2E tests (Playwright)

Full-stack tests that run against a real local Next.js server connected to a real PostgreSQL database (test instance, seeded per test run). These tests own the golden paths that cross multiple layers.

**Admin match entry flow** — log in as admin, plan a match, record attendees, assign teams (Rot/Gelb), submit goals and assists, verify the completed match appears correctly in the public match history.

**Leaderboard correctness** — seed a season with known match data, navigate to the public standings page, verify Torjägerliste, Vorlagenliste, Punktetabelle, Anwesenheitsliste, and Bierliste show the expected rankings.

**Season selector** — verify switching between seasons updates all leaderboard data; all-time view aggregates correctly across seeded seasons.

**Access control** — verify data entry routes redirect unauthenticated users to login; public routes are accessible without a session.

**Cancelled match** — verify a cancelled match appears in the match list with the correct status and is excluded from all leaderboard stats.

### Test tooling

- **Vitest** for unit tests
- **Playwright** for E2E tests (local dev + CI)
- A dedicated test database is seeded and torn down per Playwright test run
- `vitest run` and `playwright test` both run in CI via GitHub Actions on every push

### Not tested at unit level

- UI components (covered by Playwright E2E golden paths)
- Database schema (Prisma handles type safety; validated implicitly by E2E tests)

## Out of Scope

- Card tracking (yellow/red cards)
- Push notifications or match day reminders
- Historical data import from spreadsheet (later feature)
- OCR scanning of paper match sheets (later feature)
- Player self-registration or account management
- Mobile native app (iOS/Android)
- Multiple languages / i18n
- Fantasy league or external data integration

## Further Notes

- The group's paper sheet uses **Rot** and **Gelb** as the two team identifiers — these are the canonical team names in the domain, not generic "home/away."
- The beer bringer is recorded per match (one person per match), and "Meistes Bier" is a genuine end-of-year award with the same weight as top scorer.
- The app name **Dienstagskicken** ("Tuesday Kicking") reflects that matches are always on Tuesdays — the date pre-fill is a UX detail that reinforces this.
- Historical data (10+ years) exists in a spreadsheet and will be migrated in a future phase. The schema should not be constrained by the old spreadsheet's format.
- Domain registration is TBD — not a blocker for development.
