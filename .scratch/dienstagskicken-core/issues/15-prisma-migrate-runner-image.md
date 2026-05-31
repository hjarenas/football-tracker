# 15 — Prisma migrations in runner container without npx download

Status: ready-for-agent

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## Problem

`npx prisma migrate deploy` in the startup command downloads the Prisma CLI at container start time because the `runner` image's node_modules (copied from `.next/standalone`) does not include the `prisma` CLI package. Additionally, `prisma.config.ts` imports from `@prisma/config` which is also missing from the standalone node_modules.

This is slow and requires outbound internet access on every cold start.

## Goal

Run `prisma migrate deploy` before `node server.js` using a Prisma binary that is already present in the container — no `npx` download.

## Approach

Copy the full `node_modules` from the `deps` stage into the runner image alongside the standalone output, or install `prisma` explicitly as a production dependency so it ends up in `.next/standalone/node_modules`. The key constraint: no downloading at container startup.

Two options to evaluate:

1. **Add `prisma` to `dependencies`** (not `devDependencies`) in `package.json`. Next.js standalone output includes production deps, so `prisma` and `@prisma/config` will be bundled in `.next/standalone/node_modules`. The startup command stays `sh -c "npx prisma migrate deploy && node server.js"` but `npx` finds the local binary immediately.

2. **Copy node_modules from deps stage** — add `COPY --from=deps /app/node_modules ./node_modules` to the runner stage. Larger image but guaranteed to have everything.

Option 1 is preferred: minimal image size increase, no Dockerfile restructuring.

## Acceptance criteria

- `docker-compose up` starts the app without any `npm warn exec The following package was not found` messages
- Migrations run before the server starts
- No outbound npm download during container startup
