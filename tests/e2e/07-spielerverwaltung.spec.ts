/**
 * Scenario 7 — Spielerverwaltung (/admin/spieler)
 *
 * Tests the player management page:
 * 1. Admin creates a player, sees them in the list
 * 2. Admin toggles aktiv off; player disappears from match setup attendee picker
 * 3. Admin toggles vereinsmitglied; badge reflects the change
 * 4. Admin renames a player; new name appears in the list
 * 5. Unauthenticated access to /admin/spieler redirects to /anmelden
 */

import { test, expect } from "@playwright/test";
import { resetDb, seedSpieler } from "./helpers/db";
import { setAdminSession } from "./helpers/auth";

test.beforeAll(async () => {
  await resetDb();
  await seedSpieler(["Alexander Bauer", "Benjamin Fischer"]);
});

test.afterAll(async () => {
  await resetDb();
});

test("Unauthenticated access to /admin/spieler redirects to /anmelden", async ({
  page,
}) => {
  await page.goto("/admin/spieler");
  await expect(page).toHaveURL(/\/anmelden/);
});

test("Admin creates a player and sees them in the list", async ({ page }) => {
  await page.goto("/");
  await setAdminSession(page);

  await page.goto("/admin/spieler");
  await page.waitForLoadState("networkidle");

  // Page heading
  await expect(page.locator("h1")).toContainText("Spielerverwaltung");

  // Create new player
  const nameInput = page.locator('input[placeholder*="Name"]');
  await nameInput.fill("Christian Hofmann");
  await page.locator('button:has-text("Spieler erstellen")').click();
  await page.waitForLoadState("networkidle");

  // New player should appear in the list
  await expect(page.locator("text=Christian Hofmann")).toBeVisible();
});

test("Admin toggles aktiv off; player disappears from match setup picker", async ({
  page,
}) => {
  await page.goto("/");
  await setAdminSession(page);

  await page.goto("/admin/spieler");
  await page.waitForLoadState("networkidle");

  // Find Alexander Bauer's row and toggle aktiv off
  const alexanderRow = page.locator("tr, li").filter({ hasText: "Alexander Bauer" }).first();
  const aktivToggle = alexanderRow.locator('button[aria-label*="aktiv"]').first();
  await aktivToggle.click();
  await page.waitForLoadState("networkidle");

  // Alexander should still appear on the spielerverwaltung page (all players shown)
  await expect(page.locator("text=Alexander Bauer")).toBeVisible();

  // Navigate to match planning — Alexander should NOT be in the attendee picker
  // First ensure a Saison exists
  const { prismaTest } = await import("./helpers/db");
  await prismaTest.saison.upsert({
    where: { jahr: 2026 },
    update: {},
    create: { jahr: 2026 },
  });

  await page.goto("/admin/spiele/neu");
  await page.waitForLoadState("networkidle");

  // Alexander Bauer should NOT appear in the attendee checkbox list
  const attendeeList = page.locator('div.border.border-gray-600.rounded-lg');
  await expect(attendeeList).not.toContainText("Alexander Bauer");
});

test("Admin toggles vereinsmitglied; badge reflects the change", async ({
  page,
}) => {
  await page.goto("/");
  await setAdminSession(page);

  await page.goto("/admin/spieler");
  await page.waitForLoadState("networkidle");

  // Find Benjamin Fischer's row — vereinsmitglied should be false initially
  const benjaminRow = page.locator("tr, li").filter({ hasText: "Benjamin Fischer" }).first();

  // No "Mitglied" badge (span) initially — the button always exists, but the badge span should not
  await expect(benjaminRow.locator('span:has-text("Mitglied")')).not.toBeVisible();

  // Toggle vereinsmitglied on via the dedicated button
  const vereinsToggle = benjaminRow.locator('button[aria-label*="vereinsmitglied"]').first();
  await vereinsToggle.click();
  await page.waitForLoadState("networkidle");

  // Badge span should now be visible on Benjamin's row
  const updatedBenjaminRow = page.locator("tr, li").filter({ hasText: "Benjamin Fischer" }).first();
  await expect(updatedBenjaminRow.locator('span:has-text("Mitglied")')).toBeVisible();
});

test("Admin renames a player; new name appears in the list", async ({
  page,
}) => {
  await page.goto("/");
  await setAdminSession(page);

  await page.goto("/admin/spieler");
  await page.waitForLoadState("networkidle");

  // Find Benjamin Fischer's rename input/button
  const benjaminRow = page.locator("tr, li").filter({ hasText: "Benjamin Fischer" }).first();

  // Click rename affordance
  const renameButton = benjaminRow.locator('button[aria-label*="umbenennen"]').first();
  await renameButton.click();

  // Fill in new name
  const renameInput = benjaminRow.locator('input[type="text"]').first();
  await renameInput.clear();
  await renameInput.fill("Benjamin Fischer-Updated");

  // Confirm rename via Speichern button
  const confirmButton = benjaminRow.locator('button:has-text("Speichern")').first();
  await confirmButton.click();
  await page.waitForLoadState("networkidle");

  // New name should appear in the list
  await expect(page.locator("text=Benjamin Fischer-Updated")).toBeVisible();
  // Old exact name (without suffix) should no longer appear as its own element
  await expect(page.locator("li").filter({ hasText: /^Benjamin Fischer$/ })).not.toBeVisible();
});
