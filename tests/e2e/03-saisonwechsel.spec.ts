/**
 * Scenario 3 — Saisonwechsel
 *
 * Seeds two Saisons with different data and verifies:
 * - The season selector on / updates all leaderboard data when switched
 * - /ewige-tabelle shows correctly aggregated totals across both Saisons
 *
 * Seeded data (see helpers/db.ts → seedZweiSaisons):
 *   Saison 2025: Alexander Bauer scores 1 goal (Rot 1:0 Gelb)
 *   Saison 2026: Benjamin Fischer scores 2 goals (Rot 2:0 Gelb)
 *
 * Expected:
 *   - / with saison=2026: Benjamin 2 goals; Alexander not in Torjägerliste
 *   - / with saison=2025: Alexander 1 goal; Benjamin not in Torjägerliste
 *   - /ewige-tabelle: Alexander 1, Benjamin 2
 */

import { test, expect } from "@playwright/test";
import { resetDb, seedZweiSaisons } from "./helpers/db";

test.beforeAll(async () => {
  await resetDb();
  await seedZweiSaisons();
});

test.afterAll(async () => {
  await resetDb();
});

test("Season selector on / shows 2026 data by default (most recent season)", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const torjaegerSection = page.locator("section", {
    has: page.locator("h2", { hasText: "Torjägerliste" }),
  });

  // Default season is 2026 (most recent) — Benjamin scored 2 goals in 2026
  await expect(torjaegerSection).toContainText("Benjamin Fischer");
  await expect(torjaegerSection).not.toContainText("Alexander Bauer");
});

test("Switching to 2025 season shows Alexander's goals", async ({ page }) => {
  await page.goto("/?saison=2025");
  await page.waitForLoadState("networkidle");

  const torjaegerSection = page.locator("section", {
    has: page.locator("h2", { hasText: "Torjägerliste" }),
  });

  // 2025 season — Alexander scored 1 goal
  await expect(torjaegerSection).toContainText("Alexander Bauer");
  await expect(torjaegerSection).not.toContainText("Benjamin Fischer");
});

test("Switching to 2026 season shows Benjamin's goals", async ({ page }) => {
  await page.goto("/?saison=2026");
  await page.waitForLoadState("networkidle");

  const torjaegerSection = page.locator("section", {
    has: page.locator("h2", { hasText: "Torjägerliste" }),
  });

  // 2026 season — Benjamin scored 2 goals
  await expect(torjaegerSection).toContainText("Benjamin Fischer");
  const firstEntry = torjaegerSection.locator("li").first();
  await expect(firstEntry).toContainText("2");
});

test("/ewige-tabelle aggregates goals from both seasons", async ({ page }) => {
  await page.goto("/ewige-tabelle");
  await page.waitForLoadState("networkidle");

  const torjaegerSection = page.locator("section", {
    has: page.locator("h2", { hasText: "Torjägerliste" }),
  });

  // All-time: Benjamin 2 goals, Alexander 1 goal
  await expect(torjaegerSection).toContainText("Benjamin Fischer");
  await expect(torjaegerSection).toContainText("Alexander Bauer");

  // Benjamin should be ranked first (2 goals > 1 goal)
  const firstEntry = torjaegerSection.locator("li").first();
  await expect(firstEntry).toContainText("Benjamin Fischer");
  await expect(firstEntry).toContainText("2");
});

test("/ewige-tabelle Anwesenheitsliste shows players from both seasons", async ({
  page,
}) => {
  await page.goto("/ewige-tabelle");
  await page.waitForLoadState("networkidle");

  const anwesenheitSection = page.locator("section", {
    has: page.locator("h2", { hasText: "Anwesenheitsliste" }),
  });

  // Alexander appeared in 2025, Benjamin in 2026, Christian in 2025, Daniel in 2026
  await expect(anwesenheitSection).toContainText("Alexander Bauer");
  await expect(anwesenheitSection).toContainText("Benjamin Fischer");
  await expect(anwesenheitSection).toContainText("Christian Hofmann");
  await expect(anwesenheitSection).toContainText("Daniel Koch");
});

test("Page heading updates when season changes via URL", async ({ page }) => {
  await page.goto("/?saison=2025");
  await page.waitForLoadState("networkidle");

  // The season heading should reflect 2025
  await expect(page.locator("h2").first()).toContainText("2025");

  await page.goto("/?saison=2026");
  await page.waitForLoadState("networkidle");

  await expect(page.locator("h2").first()).toContainText("2026");
});
