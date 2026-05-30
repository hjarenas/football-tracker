# 14 — Hetzner-Deployment

Status: completed

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## What to build

Set up production deployment to a Hetzner VPS with automatic SSL. This is a HITL slice — it requires the human operator to provision the VPS, configure DNS, and supply deployment secrets before the automated parts can run.

**Human steps required:**
- Provision a Hetzner VPS (Ubuntu, minimum CX22)
- Point a domain at the VPS IP
- Add `HETZNER_SSH_KEY`, `DEPLOY_HOST`, and production env vars as GitHub Actions secrets

**Automated parts (agent-implementable):**
- Production `docker-compose.prod.yml` with app + PostgreSQL containers
- `Caddyfile` configured for the domain with automatic Let's Encrypt TLS
- GitHub Actions deploy workflow: SSH into the VPS, pull latest image, run `docker-compose up -d` on merge to `main`
- `.env.production.example` documenting all required production environment variables

## Acceptance criteria

- [x] `docker-compose.prod.yml` runs the app and PostgreSQL in production mode
- [x] Caddy serves the app over HTTPS with a valid Let's Encrypt certificate
- [x] Pushing to `main` triggers the deploy workflow and updates the running app
- [x] Database data persists across deployments (volume mount)
- [x] All production env vars are documented in `.env.production.example`

## Blocked by

- `13-ci-pipeline.md`
