/**
 * Scenario 5 — Abgesagtes Spiel
 *
 * Verifies:
 * - A planned match can be cancelled via the admin UI
 * - The cancelled match appears in /spiele with the "Abgesagt" label and no score
 * - The cancelled match is excluded from all leaderboard stats on /
 *
 * Note: Authentication is set up via direct JWT cookie injection (setAdminSession)
 * because the NextAuth v5 HTTP API endpoints (/api/auth/*) behave differently
 * when tested via Next.js 16's Turbopack dev server. The JWT is valid and the
 * middleware/server-side auth() accept it.
 */

import { test, expect } from "@playwright/test";
import { resetDb, seedSpieler } from "./helpers/db";
import { setAdminSession } from "./helpers/auth";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
  await resetDb();
  await seedSpieler();
  // Seed the 2026 Saison so spielPlanenAction finds it
  const { prismaTest } = await import("./helpers/db");
  await prismaTest.saison.create({ data: { jahr: 2026 } });
});

test.afterAll(async () => {
  await resetDb();
});

test("cancelled match appears in /spiele with Abgesagt label and no score", async ({
  page,
}) => {
  // --- Step 1: set admin session cookie (at root first, then navigate) ---
  await page.goto("/");
  await setAdminSession(page);

  // Verify admin access works
  const adminResponse = await page.goto("/admin");
  expect(adminResponse?.url()).toMatch(/\/admin/);
  expect(adminResponse?.url()).not.toMatch(/\/anmelden/);

  // --- Step 2: plan a new match ---
  await page.goto("/admin/spiele/neu");
  await page.waitForLoadState("networkidle");

  // Verify we're on the right page (not redirected to login)
  await expect(page).toHaveURL(/\/admin\/spiele\/neu/);

  // Set date
  await page.fill("#datum", "2026-06-02");

  // Select the first two players as attendees
  const checkboxes = page.locator(
    'div.border.border-gray-600.rounded-lg input[type="checkbox"]'
  );
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();

  // Use text-based selector to avoid matching the header's sign-out submit button
  await page.click('button[type="submit"]:has-text("Spiel planen")');
  // After planning, redirected to /admin/spiele (exact path, not /neu)
  await page.waitForURL((url) => url.pathname === "/admin/spiele");
  await page.waitForLoadState("networkidle");

  // --- Step 3: open the newly created match ---
  // Find the first match list item link (not the "Neues Spiel" button which also
  // points to /admin/spiele/neu). Match list items are inside <li> elements.
  const matchLink = page.locator('li a[href^="/admin/spiele/"]').first();
  await matchLink.click();
  await page.waitForURL(/\/admin\/spiele\/.+/);
  await page.waitForLoadState("networkidle");

  // Verify we're on the detail page (should see status Geplant)
  await expect(page.locator("text=Geplant").first()).toBeVisible();

  // --- Step 4: cancel the match ---
  // Click "Spiel absagen" button (first click shows confirmation dialog)
  await page.click('button:has-text("Spiel absagen")');

  // Wait for the confirmation dialog to appear (it has "Ja, absagen" button)
  await page.waitForSelector('button:has-text("Ja, absagen")', { timeout: 5000 });

  // Click confirm — this triggers the server action.
  // After the server action, the page redirects and shows the abgesagt status.
  // The status badge for "abgesagt" has a "line-through" class.
  // Wait for that specific element to appear (not the dialog text which uses <strong>).
  await page.click('button:has-text("Ja, absagen")');

  // Wait for the status badge with line-through class (only present in abgesagt state)
  await expect(
    page.locator('span.line-through')
  ).toBeVisible({ timeout: 15000 });

  // --- Step 5: verify on public /spiele ---
  await page.goto("/spiele?saison=2026");
  await page.waitForLoadState("networkidle");

  // The match should be listed with "Abgesagt" badge
  await expect(page.locator("text=Abgesagt").first()).toBeVisible();

  // The cancelled match card should contain "Abgesagt" but no numeric score
  const abgesagtItem = page
    .locator("li")
    .filter({ has: page.locator("text=Abgesagt") })
    .first();
  await expect(abgesagtItem).toBeVisible();

  // Confirm no numeric score pattern (e.g., "2 : 1") is rendered in the cancelled match card
  const itemText = await abgesagtItem.textContent();
  expect(itemText).not.toMatch(/\d\s*:\s*\d/);
});

test("cancelled match is excluded from leaderboard stats on /", async ({
  page,
}) => {
  // The cancelled match has no goals, so leaderboards should be empty
  await page.goto("/?saison=2026");
  await page.waitForLoadState("networkidle");

  // Torjägerliste should show empty state (no goals from abgesagt match)
  const torjaegerSection = page.locator("section", {
    has: page.locator("h2", { hasText: "Torjägerliste" }),
  });
  // The empty-state text is "Noch keine Daten für diese Saison."
  await expect(torjaegerSection).toContainText("Noch keine Daten");

  // Anwesenheitsliste also excludes abgesagt matches
  const anwesenheitSection = page.locator("section", {
    has: page.locator("h2", { hasText: "Anwesenheitsliste" }),
  });
  await expect(anwesenheitSection).toContainText("Noch keine Daten");
});
