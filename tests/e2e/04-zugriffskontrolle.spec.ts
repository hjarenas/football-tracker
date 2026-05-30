/**
 * Scenario 4 — Zugriffskontrolle
 *
 * Verifies:
 * - Admin routes redirect unauthenticated users to /anmelden
 * - Public routes are accessible without authentication
 */

import { test, expect } from "@playwright/test";
import { resetDb, seedSpieler } from "./helpers/db";

test.beforeAll(async () => {
  await resetDb();
  await seedSpieler();
  // Seed a Saison so the public pages don't show errors
  const { prismaTest } = await import("./helpers/db");
  await prismaTest.saison.create({ data: { jahr: 2026 } });
});

test.afterAll(async () => {
  await resetDb();
});

test("GET /admin without session redirects to /anmelden", async ({ page }) => {
  const response = await page.goto("/admin");
  // Should end up on /anmelden (redirect may chain)
  await expect(page).toHaveURL(/\/anmelden/);
});

test("GET /admin/spiele/neu without session redirects to /anmelden", async ({
  page,
}) => {
  await page.goto("/admin/spiele/neu");
  await expect(page).toHaveURL(/\/anmelden/);
});

test("GET /admin/spiele without session redirects to /anmelden", async ({
  page,
}) => {
  await page.goto("/admin/spiele");
  await expect(page).toHaveURL(/\/anmelden/);
});

test("GET / is accessible without session", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/");
  await expect(page.locator("h1")).toContainText("Dienstagskicken");
});

test("GET /spiele is accessible without session", async ({ page }) => {
  await page.goto("/spiele");
  await expect(page).toHaveURL("/spiele");
  // The page title heading should be present
  await expect(page.locator("h1")).toContainText("Spielübersicht");
});

test("GET /ewige-tabelle is accessible without session", async ({ page }) => {
  await page.goto("/ewige-tabelle");
  await expect(page).toHaveURL("/ewige-tabelle");
  await expect(page.locator("h1")).toContainText("Ewige Tabelle");
});
