# EU hosting on Hetzner instead of Vercel or Railway

The group is based in Germany (Verein Weißkirchen) and member data — names, attendance, performance stats — must stay within the EU for GDPR compliance. Vercel and Railway default to US regions. We deploy to a Hetzner VPS (EU-based) using Docker + docker-compose, with Caddy handling TLS and a GitHub Actions pipeline doing the deploy over SSH. This adds operational overhead compared to a managed platform but is non-negotiable given the data residency requirement.

## Considered Options

- **Vercel** — zero-ops Next.js deployment but data leaves the EU by default.
- **Railway** — managed Postgres + app hosting, US-based.
- **Hetzner VPS** — self-managed, EU-native, full data locality. Chosen.
