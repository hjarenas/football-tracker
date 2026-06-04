/**
 * Scenario 8 — Inline player creation in match setup
 *
 * Admin opens match setup (/admin/spiele/neu), creates a player inline
 * via the attendee picker affordance, and the new player appears
 * auto-selected in the attendees list.
 *
 * Also verifies:
 * - Input clears after successful creation
 * - New player persists in the DB (visible on /admin/spieler)
 */

import { test, expect } from "@playwright/test";
import { resetDb, seedSpieler } from "./helpers/db";
import { setAdminSession } from "./helpers/auth";
import { prismaTest } from "./helpers/db";

test.beforeAll(async () => {
  await resetDb();
  await seedSpieler(["Alexander Bauer", "Benjamin Fischer"]);
  // Ensure a Saison exists so the match setup page renders
  await prismaTest.saison.upsert({
    where: { jahr: 2026 },
    update: {},
    create: { jahr: 2026 },
  });
});

test.afterAll(async () => {
  await resetDb();
});

test("Admin creates a player inline in match setup and they appear auto-selected", async ({
  page,
}) => {
  await page.goto("/");
  await setAdminSession(page);

  await page.goto("/admin/spiele/neu");
  await page.waitForLoadState("networkidle");

  // The "Neuer Spieler" inline affordance should be visible in the attendee picker section
  const neuerSpielerInput = page.locator(
    'input[placeholder*="Neuer Spieler"], input[placeholder*="neuer Spieler"], input[placeholder*="Neuen Spieler"]'
  );
  await expect(neuerSpielerInput).toBeVisible();

  // Type a new player name
  await neuerSpielerInput.fill("Zoran Novak");

  // Click the confirm button
  const hinzufuegenButton = page.locator(
    'button:has-text("Hinzufügen"), button:has-text("Erstellen")'
  );
  await hinzufuegenButton.click();

  // Wait for action to complete
  await page.waitForLoadState("networkidle");

  // The new player should appear in the attendee list as checked
  const attendeeList = page.locator("div.border.border-gray-200.rounded-lg");
  await expect(attendeeList).toContainText("Zoran Novak");

  // The checkbox for the new player should be checked
  const zoranLabel = attendeeList.locator("label").filter({ hasText: "Zoran Novak" });
  const zoranCheckbox = zoranLabel.locator('input[type="checkbox"]');
  await expect(zoranCheckbox).toBeChecked();

  // The input should be cleared after successful creation
  await expect(neuerSpielerInput).toHaveValue("");

  // -------------------------------------------------------------------------
  // Verify new player persists in DB (visible on /admin/spieler)
  // -------------------------------------------------------------------------
  await page.goto("/admin/spieler");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("text=Zoran Novak")).toBeVisible();
});
