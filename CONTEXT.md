# Dienstagskicken — Domain Context

Dienstagskicken ("Tuesday Kicking") is a mobile-first web app for Verein Weißkirchen's Tuesday football group (~40 players). It digitises their weekly paper match sheet so admins can record attendance, teams, and goals from their phones, and the full group can view live standings and all-time records.

---

## Domain Glossary

Use these terms exactly as written. Do not substitute synonyms.

| Term | Definition |
|---|---|
| **Spieler** | A player. Has a name and an `aktiv` flag. ~40 in the pool; no self-registration. |
| **Saison** | A season, identified by calendar year (integer). Awards and leaderboards are scoped per Saison. |
| **Spiel** | A match. Has a date, a Saison FK, a status, and an optional beer-bringer (Spieler FK). |
| **Spielteilnahme** | Match participation — the join between Spieler and Spiel. Records which team the player was on and an optional points override. |
| **Tor** | A goal event. Records scorer, optional assist, eigentor flag, and which team the goal is attributed to. |
| **Eigentor** | An own goal. Counts toward the **opposing** team's score; excluded from the scorer's personal Tore tally. The `team` field on Tor is the team that **benefits** (conceding team). |
| **Rot** | One of the two fixed teams. Identifier: `Rot`. Accent colour: `#ef4444`. |
| **Gelb** | The other fixed team. Identifier: `Gelb`. Accent colour: `#eab308`. |
| **Bierliste** | "Beer list" — award category tracking who brought beer to the most matches. |
| **Torjägerliste** | Top scorers leaderboard (Eigentore excluded from personal tally). |
| **Vorlagenliste** | Top assists leaderboard. |
| **Punktetabelle** | Points table — 3 pts for a win, 1 for a draw, 0 for a loss, per player. |
| **Anwesenheitsliste** | Attendance list — matches attended per player. |
| **Ewige Tabelle** | All-time leaderboard aggregated across all Saisons. |
| **Zustandsmaschine** | The match state machine. Controls valid Spiel status transitions. |

---

## Match State Machine

```
geplant ──→ teams_zugewiesen ──→ abgeschlossen
    │
    └──→ abgesagt
```

- `geplant` — planned; date, beer bringer, and attendees recorded
- `teams_zugewiesen` — teams assigned; each Spielteilnahme has Rot or Gelb
- `abgeschlossen` — completed; goals recorded, match closed
- `abgesagt` — cancelled from `geplant`; remains in history, excluded from all stats

Only forward transitions are valid. `abgeschlossen` and `abgesagt` are terminal. Implemented in `src/lib/zustandsmaschine.ts`.

---

## Invariants

These rules are non-negotiable and enforced throughout the codebase:

1. **Score is never stored.** It is always derived: `COUNT(Tor WHERE team=Rot AND NOT eigentor) + COUNT(Tor WHERE eigentor AND team=Gelb)` for Rot, symmetric for Gelb. See `src/lib/score.ts` → `deriveScore()`. (ADR-0002)

2. **Eigentore are excluded from the scorer's Tore count.** They still contribute to the conceding team's score.

3. **Cancelled matches (`abgesagt`) are excluded from all statistics** — goals, assists, points, attendance, beer.

4. **Ties are not broken.** Tied players share the same rank. The next rank is the tied players' position + their count (dense competition ranking).

5. **`pointsOverride` on Spielteilnahme** overrides which team's result the player receives points for, without changing their actual team assignment.

6. **Rot and Gelb are the only two team identifiers.** They are not configurable. (ADR-0003)

---

## Architecture Decisions

### ADR-0001 — EU hosting on Hetzner
Deploy to a Hetzner VPS (EU-based) via Docker + docker-compose + Caddy. Vercel and Railway default to US regions; GDPR requires member data (names, stats) to stay in the EU. This adds operational overhead but is non-negotiable.

### ADR-0002 — Score derived from events, never stored
No score field on Spiel. Score is always computed from Tor records. Prevents score/event drift and keeps the event log as the single source of truth.

### ADR-0003 — Rot and Gelb as fixed team identifiers
Teams are always Rot and Gelb — fixed values, not configurable names. Reflects the group's paper sheet and coloured bibs. Keeps the data model simple.

### ADR-0004 — Credentials auth, not OAuth
NextAuth.js credentials provider (username + password). Admin list is small and self-contained; OAuth would introduce a third-party dependency and account-suspension risk for a private group tool. Credentials are stored as `ADMIN_CREDENTIALS` env var (format: `user:pass,user2:pass2`).

---

## Module Map

| Module | Path | Responsibility |
|---|---|---|
| `zustandsmaschine` | `src/lib/zustandsmaschine.ts` | Pure: validates and executes Spiel status transitions |
| `score` | `src/lib/score.ts` | Pure: derives `{ rot, gelb }` score from a list of Tor records |
| `statistik-engine` | `src/lib/statistik-engine.ts` | Pure: computes all five leaderboard categories for a given Saison scope or all-time |
| `spieluebersicht` | `src/lib/spieluebersicht.ts` | Pure: formats match display data (derived score, winner, scorer lists with eigentor attribution) |
| `auth-utils` | `src/lib/auth-utils.ts` | Pure: credential parsing, admin path detection, session validation |
| `auth` | `src/lib/auth.ts` | NextAuth config — credentials provider wired to `auth-utils` |
| `datum-utils` | `src/lib/datum-utils.ts` | Pure date helpers — e.g. `naechstenDienstagBerechnen()` |
| `prisma` | `src/lib/prisma.ts` | Prisma client singleton with `@prisma/adapter-pg` (Prisma v7 requirement) |

Pure modules (`zustandsmaschine`, `score`, `statistik-engine`, `spieluebersicht`, `auth-utils`, `datum-utils`) take data as arguments and return results — no DB calls, no side effects. Test them with in-memory fixture data.

---

## Stack

- **Next.js 16 + TypeScript** — App Router, Server Components, Server Actions
- **Tailwind CSS + shadcn/ui** — mobile-first; Rot (`--rot: #ef4444`) and Gelb (`--gelb: #eab308`) defined as CSS variables
- **PostgreSQL + Prisma v7** — schema in `prisma/schema.prisma`; DB connection via `prisma.config.ts` + `@prisma/adapter-pg` (Prisma v7 no longer accepts `url` in the datasource block)
- **NextAuth.js** — credentials provider; JWT sessions; admin whitelist in `ADMIN_CREDENTIALS` env var
- **Vitest** — unit tests for all pure modules; run with `vitest run`
- **Playwright** — E2E tests against a real local Next.js server + real PostgreSQL; run with `playwright test`
- **Docker + docker-compose** — local dev (app + PostgreSQL); `docker-compose up -d db` to start DB only
- **Caddy** — production reverse proxy with automatic Let's Encrypt TLS
- **GitHub Actions** — CI (tsc → lint → vitest → playwright) and SSH deploy to Hetzner on merge to `main`

---

## Language

All UI copy is in **German**. Domain terms (Spieler, Saison, Spiel, etc.) are used in code identifiers, route names, and UI labels without translation.
