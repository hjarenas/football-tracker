# 03 — Admin-Authentifizierung

Status: completed

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## What to build

Implement admin authentication end-to-end. Admins log in with username and password via a German-language login page. Admin status is determined by a whitelist in environment configuration — no admin user table. Public routes remain fully unauthenticated.

- `/anmelden` login page (German copy, mobile-first)
- NextAuth.js credentials provider validating against env-var whitelist
- Session persisted via NextAuth JWT
- Server-side middleware protecting all `/admin/*` routes — redirects to `/anmelden` if unauthenticated
- Logout action
- Unit tests: middleware rejects unauthenticated requests; middleware rejects non-admin sessions; public routes return data without a session

Covers user stories: 15, 27.

## Acceptance criteria

- [x] Visiting `/admin` without a session redirects to `/anmelden`
- [x] Logging in with valid credentials grants access to `/admin`
- [x] Logging in with invalid credentials shows a German error message
- [x] Non-admin credentials (not in whitelist) are rejected
- [x] Logout clears the session and redirects to `/`
- [x] Public routes (`/`) are accessible without login
- [x] Unit tests pass for middleware auth logic

## Blocked by

- `02-datenbankschema-seed.md`
