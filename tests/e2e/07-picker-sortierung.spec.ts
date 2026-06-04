/**
 * Scenario 7 — Activity-based picker ordering in match setup
 *
 * Verifies that the /admin/spiele/neu picker shows players in three-bucket
 * activity order: players who participated within 90 days appear before
 * players who have never participated.
 *
 * Seed:
 *   - "Aktiver Spieler" — has a Spielteilnahme 30 days ago (Eimer 1)
 *   - "Neuer Spieler"   — never participated (Eimer 3)
 *   - "Inaktiver Spieler" — aktiv=false, must not appear in picker
 *
 * Expected picker order: Aktiver Spieler … then … Neuer Spieler
 * Inaktiver Spieler must not appear at all.
 */

import { test, expect } from "@playwright/test";
import { resetDb, prismaTest } from "./helpers/db";
import { setAdminSession } from "./helpers/auth";

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

async function seedPickerSortierung() {
  // Create a season for the test year
  const saison = await prismaTest.saison.create({ data: { jahr: 2026 } });

  // Recent player — participated 30 days ago
  const aktiverSpieler = await prismaTest.spieler.create({
    data: { name: "Aktiver Spieler", aktiv: true },
  });

  // Never-played player
  await prismaTest.spieler.create({
    data: { name: "Neuer Spieler", aktiv: true },
  });

  // Inactive player — must not appear in picker
  await prismaTest.spieler.create({
    data: { name: "Inaktiver Spieler", aktiv: false },
  });

  // Create a match 30 days ago with a Spielteilnahme for aktiverSpieler
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const spiel = await prismaTest.spiel.create({
    data: {
      datum: thirtyDaysAgo,
      status: "abgeschlossen",
      saisonId: saison.id,
    },
  });

  await prismaTest.spielteilnahme.create({
    data: {
      spielerId: aktiverSpieler.id,
      spielId: spiel.id,
      team: "Rot",
    },
  });

  return { saison };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
  await resetDb();
  await seedPickerSortierung();
});

test.afterAll(async () => {
  await resetDb();
});

test("recent player appears before never-played player in Teilnehmer picker", async ({
  page,
}) => {
  await page.goto("/");
  await setAdminSession(page);

  await page.goto("/admin/spiele/neu");
  await page.waitForLoadState("networkidle");

  // Verify we're on the right page
  await expect(page).toHaveURL(/\/admin\/spiele\/neu/);

  // The Teilnehmer picker renders player names in <span> elements inside checkboxes
  const teilnehmerBox = page.locator(
    "div.border.border-gray-600.rounded-lg"
  );
  await expect(teilnehmerBox).toBeVisible();

  // Get all player name spans within the Teilnehmer picker
  const playerLabels = teilnehmerBox.locator("label span.text-sm");
  await expect(playerLabels).toHaveCount(2); // only 2 active players

  const firstPlayer = await playerLabels.nth(0).textContent();
  const secondPlayer = await playerLabels.nth(1).textContent();

  // "Aktiver Spieler" (Eimer 1: within 90 days) must come before "Neuer Spieler" (Eimer 3: never played)
  expect(firstPlayer?.trim()).toBe("Aktiver Spieler");
  expect(secondPlayer?.trim()).toBe("Neuer Spieler");

  // "Inaktiver Spieler" must not appear at all
  const allText = await teilnehmerBox.textContent();
  expect(allText).not.toContain("Inaktiver Spieler");
});

test("recent player appears before never-played player in Bierbringer picker", async ({
  page,
}) => {
  await page.goto("/");
  await setAdminSession(page);

  await page.goto("/admin/spiele/neu");
  await page.waitForLoadState("networkidle");

  // Open the Bierbringer dropdown
  const bierbringerButton = page
    .locator("button")
    .filter({ hasText: /Bierbringer auswählen/ });
  await bierbringerButton.click();

  const dropdown = page.locator("ul").first();
  await expect(dropdown).toBeVisible();

  // Get the player buttons in the dropdown (skip "— Keiner —")
  const playerButtons = dropdown
    .locator("button")
    .filter({ hasNotText: "Keiner" });
  await expect(playerButtons).toHaveCount(2); // only 2 active players

  const firstPlayer = await playerButtons.nth(0).textContent();
  const secondPlayer = await playerButtons.nth(1).textContent();

  // "Aktiver Spieler" (Eimer 1: within 90 days) must come before "Neuer Spieler" (Eimer 3: never played)
  expect(firstPlayer?.trim()).toBe("Aktiver Spieler");
  expect(secondPlayer?.trim()).toBe("Neuer Spieler");

  // "Inaktiver Spieler" must not appear at all
  const dropdownText = await dropdown.textContent();
  expect(dropdownText).not.toContain("Inaktiver Spieler");
});
