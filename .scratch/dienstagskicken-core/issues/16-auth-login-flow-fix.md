# 16 — Fix login flow: 404 after submitting credentials

Status: ready-for-agent

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## Problem

Submitting valid credentials on `/anmelden` results in a 404 rather than redirecting to `/admin`. The admin area is effectively inaccessible.

## Suspected root causes (investigate in order)

### 1. NextAuth catch-all route directory misnamed

The build output shows the route as `/api/auth/[...nextauth/]` (note the slash inside the bracket). The directory on disk appears to be named `[...nextauth\]` — with a backslash as part of the name — instead of `[...nextauth]`. This was likely introduced on Windows, where git allows a backslash in a directory name. Next.js normalises it to a forward slash, producing the malformed route pattern. The catch-all then no longer matches `/api/auth/callback/credentials`, `/api/auth/error`, etc., causing the 404.

Critically, the misnamed directory is committed to git, so it reproduces identically when checked out on Linux (including inside the Docker container). This is not a Windows-only issue.

**Fix:** delete `src/app/api/auth/[...nextauth\]/route.ts` and recreate it at the correct path `src/app/api/auth/[...nextauth]/route.ts`. Commit the rename so Linux and Docker both get the corrected path.

### 2. `middleware.ts` deprecated in Next.js 16

The build warns:
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
```

Next.js 16 renamed `middleware.ts` → `proxy.ts`. If the old filename is silently ignored, unauthenticated requests to `/admin` are not redirected to `/anmelden` at all. This affects both local dev and the Docker container on Linux.

**Fix:** rename `src/middleware.ts` → `src/proxy.ts`. Verify the `export default auth(...)` pattern and the `export const config` matcher still apply under the new convention. Check the Next.js 16 migration guide for any API differences.

### 3. NextAuth v5 beta + credentials provider error redirect

If root cause 1 is resolved but credentials are invalid (e.g. `ADMIN_CREDENTIALS` env var not set for local dev), NextAuth may redirect to `/api/auth/error` instead of honouring `redirect: false`. Verify the `ADMIN_CREDENTIALS` env var is set in `.env.local` for local development and that the `signIn("credentials", { redirect: false })` path returns an inline error rather than a redirect when auth fails.

## Acceptance criteria

All three Playwright scenarios must pass:

1. **Unauthenticated access is blocked** — navigating to `/admin` redirects to `/anmelden` (not a 404, not a blank page).
2. **Successful login** — entering valid credentials on `/anmelden` redirects to `/admin` and the admin page loads.
3. **Failed login** — entering invalid credentials shows an inline error message on `/anmelden` (no redirect, no 404).

## Notes

- Existing Playwright suite is in `tests/` and runs against a real local Next.js server + real PostgreSQL. New tests should follow the same pattern.
- `ADMIN_CREDENTIALS` default for local dev is `admin:password` (see `docker-compose.yml` and `.env.local`).
- Do not add a custom `pages.error` to the NextAuth config unless it is needed to fix the 404 — keep the auth config minimal.
