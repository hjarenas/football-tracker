# Dienstagskicken

Mobile-first web app for Verein Weißkirchen's Tuesday football group. Digitises the weekly match sheet — attendance, teams, goals, and end-of-year leaderboards.

## Prerequisites

- [Node.js 20+](https://nodejs.org)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

The defaults in `.env.example` work out of the box for local development. To change the admin credentials, edit `ADMIN_CREDENTIALS` in `.env`:

```
ADMIN_CREDENTIALS=admin:password
```

### 3. Start the database

```bash
docker-compose up -d db
```

### 4. Run migrations and seed

```bash
npm run db:migrate     # apply schema migrations
npm run db:seed        # seed 40 Spieler + current Saison
```

### 5. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Public leaderboards:** `/`
- **Match history:** `/spiele`
- **All-time leaderboard:** `/ewige-tabelle`
- **Admin login:** `/anmelden` — default credentials: `admin` / `password`

---

## Running with Docker (full stack)

To run the app and database together in containers:

```bash
docker-compose up -d
```

Then seed on first run:

```bash
docker-compose exec app npm run db:migrate
docker-compose exec app npm run db:seed
```

---

## Development commands

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run type-check` | TypeScript type check |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright E2E tests (requires dev server + DB) |
| `npm run test:e2e:ui` | Playwright with interactive UI |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed initial data |
| `npm run db:studio` | Open Prisma Studio |

---

## Running E2E tests

E2E tests use a separate test database and require the dev server to be running:

```bash
# 1. Start the test database (same Docker service, different DB name)
docker-compose up -d db

# 2. Start the dev server
npm run dev

# 3. In a separate terminal, run E2E tests
npm run test:e2e
```

The Playwright global setup (`tests/e2e/global-setup.ts`) automatically syncs the test DB schema before tests run. Test credentials are set in `.env.test`.

---

## Project structure

```
src/
├── app/                  # Next.js App Router pages and server actions
│   ├── admin/            # Admin routes (protected)
│   ├── spiele/           # Public match history
│   ├── ewige-tabelle/    # All-time leaderboard
│   └── anmelden/         # Login page
├── lib/
│   ├── statistik-engine.ts   # Pure: leaderboard computation
│   ├── zustandsmaschine.ts   # Pure: match state machine
│   ├── score.ts              # Pure: score derivation from goal events
│   ├── spieluebersicht.ts    # Pure: match display formatting
│   └── auth-utils.ts         # Pure: auth helpers
prisma/
├── schema.prisma         # Database schema
├── seed.ts               # Seed script
└── migrations/           # Migration history
tests/
├── unit/                 # Vitest unit tests
└── e2e/                  # Playwright E2E tests
```

## Tech stack

- **Next.js 16** + TypeScript (App Router)
- **Tailwind CSS** + shadcn/ui
- **PostgreSQL** + Prisma
- **NextAuth.js** (credentials provider)
- **Vitest** (unit tests) + **Playwright** (E2E)
- **Docker** + docker-compose
