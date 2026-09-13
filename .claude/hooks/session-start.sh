#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# ---------------------------------------------------------------------------
# Node dependencies
# ---------------------------------------------------------------------------
npm install

# ---------------------------------------------------------------------------
# PostgreSQL — start the pre-installed cluster and ensure dev/test DBs exist.
# ---------------------------------------------------------------------------
if command -v pg_lsclusters >/dev/null 2>&1; then
  if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
    service postgresql start
    for _ in $(seq 1 30); do
      pg_isready -h localhost -p 5432 >/dev/null 2>&1 && break
      sleep 1
    done
  fi

  sudo -u postgres psql -v ON_ERROR_STOP=0 -c "ALTER USER postgres PASSWORD 'postgres';" >/dev/null
  sudo -u postgres psql -v ON_ERROR_STOP=0 -c "CREATE DATABASE dienstagskicken;" >/dev/null 2>&1 || true
  sudo -u postgres psql -v ON_ERROR_STOP=0 -c "CREATE DATABASE dienstagskicken_test;" >/dev/null 2>&1 || true
fi

# ---------------------------------------------------------------------------
# Prisma client — needed for both `npm run dev` and the test suites.
# Test DB schema itself is synced automatically by tests/e2e/global-setup.ts.
# ---------------------------------------------------------------------------
export DATABASE_URL="${DATABASE_URL:-postgresql://postgres:postgres@localhost:5432/dienstagskicken_test}"
npx prisma generate

# ---------------------------------------------------------------------------
# Playwright — this sandbox's pre-installed Chromium build is older than the
# version @playwright/test pins, and cdn.playwright.dev is blocked by the
# egress policy here, so `playwright install` cannot fetch the pinned build.
# playwright.config.ts honors this env var as a launchOptions.executablePath
# override (see PR #2); point it at the pre-installed binary when present.
# ---------------------------------------------------------------------------
if [ -x /opt/pw-browsers/chromium ]; then
  echo "export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/pw-browsers/chromium" >> "$CLAUDE_ENV_FILE"
fi
