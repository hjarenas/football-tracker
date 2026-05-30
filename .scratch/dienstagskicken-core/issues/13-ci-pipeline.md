# 13 — CI-Pipeline

Status: ready-for-agent

## Parent

`.scratch/dienstagskicken-core/PRD.md`

## What to build

Implement the GitHub Actions CI pipeline that runs on every push to every branch. The pipeline validates code quality and runs the full test suite automatically.

Pipeline steps (in order):
1. Type-check — `tsc --noEmit`
2. Lint — ESLint
3. Unit tests — `vitest run`
4. E2E tests — `playwright test` against a PostgreSQL service container

The pipeline spins up a PostgreSQL service container for the E2E step so no external database is needed in CI.

## Acceptance criteria

- [ ] Pipeline runs on every push and pull request
- [ ] `tsc --noEmit` failure blocks the pipeline
- [ ] `vitest run` failure blocks the pipeline
- [ ] `playwright test` failure blocks the pipeline
- [ ] E2E tests connect to a PostgreSQL service container (no mocks)
- [ ] Pipeline completes in a reasonable time (target: under 5 minutes)

## Blocked by

- `12-playwright-e2e-suite.md`
