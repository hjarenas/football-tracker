# 01 — Projekt-Setup

Status: completed

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## What to build

Scaffold the full project with all tooling in place so every subsequent slice has a working foundation to build on. No application features — just a running app with the correct stack configured end-to-end.

- Next.js + TypeScript (App Router)
- Tailwind CSS with shadcn/ui initialised and themed (Rot/Gelb accent colours defined as CSS variables)
- Prisma configured with a PostgreSQL connection (env-var driven)
- NextAuth.js installed and wired up (credentials provider stub, no users yet)
- Vitest configured and running a placeholder passing test
- Playwright configured and running a placeholder passing test against the local dev server
- Docker + docker-compose for local development (app + PostgreSQL)
- `.env.example` documenting all required environment variables

## Acceptance criteria

- [x] `docker-compose up` starts the app and a local PostgreSQL instance
- [x] The app renders a placeholder page at `/`
- [x] `vitest run` passes (at least one placeholder test)
- [x] `playwright test` passes (at least one placeholder test against the running app)
- [x] `tsc --noEmit` passes with no type errors
- [x] shadcn/ui is initialised; Rot (#ef4444) and Gelb (#eab308) are defined as Tailwind CSS variables
- [x] All required env vars are documented in `.env.example`

## Blocked by

None — can start immediately.
