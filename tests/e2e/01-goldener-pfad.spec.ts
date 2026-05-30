/**
 * Scenario 1 — Goldener Pfad (Admin-Flow)
 *
 * Full end-to-end flow:
 * 1. Authenticate as admin (via JWT session cookie)
 * 2. Create a new match at /admin/spiele/neu (date, beer bringer, 4 attendees)
 * 3. Assign teams (Rot/Gelb) at the Spiel detail page
 * 4. Record 3 goals:
 *    - Goal 1: regular goal with an assist
 *    - Goal 2: regular goal without assist
 *    - Goal 3: eigentor
 * 5. Confirm match → abgeschlossen
 * 6. Navigate to public /spiele and verify the match appears with a score
 *
 * Note: Authentication uses direct JWT cookie injection (setAdminSession) because
 * the NextAuth v5 HTTP endpoints behave differently under Next.js 16 Turbopack.
 * The JWT is cryptographically valid and accepted by the server-side auth() middleware.
 */

import { test, expect } from "@playwright/test";
import { resetDb, seedGoldenerPfad } from "./helpers/db";
import { setAdminSession } from "./helpers/auth";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.beforeAll(async () => {
  await resetDb();
  await seedGoldenerPfad();
});

test.afterAll(async () => {
  await resetDb();
});

test("Goldener Pfad — full admin flow from session to public match result", async ({
  page,
}) => {
  // -------------------------------------------------------------------------
  // Step 1: Set admin session
  // -------------------------------------------------------------------------
  await page.goto("/");
  await setAdminSession(page);

  // Verify we can access admin (middleware accepts our JWT)
  await page.goto("/admin");
  await expect(page).not.toHaveURL(/\/anmelden/);

  // -------------------------------------------------------------------------
  // Step 2: Plan a new match
  // -------------------------------------------------------------------------
  await page.goto("/admin/spiele/neu");
  await page.waitForLoadState("networkidle");

  // Set match date to a Tuesday in 2026
  await page.fill("#datum", "2026-06-02");

  // Select beer bringer — open dropdown and pick the first real player
  const bierbringerButton = page.locator('button').filter({
    hasText: /Bierbringer auswählen/,
  });
  await bierbringerButton.click();

  // Wait for dropdown to be visible and pick first non-"Keiner" option
  const dropdown = page.locator("ul").first();
  await expect(dropdown).toBeVisible();
  const firstBierOption = dropdown
    .locator('button')
    .filter({ hasNotText: "Keiner" })
    .first();
  await firstBierOption.click();

  // Select 4 attendees
  const playerCheckboxes = page.locator(
    'div.border.border-gray-200.rounded-lg input[type="checkbox"]'
  );
  await playerCheckboxes.nth(0).check();
  await playerCheckboxes.nth(1).check();
  await playerCheckboxes.nth(2).check();
  await playerCheckboxes.nth(3).check();

  // Submit
  await page.click('button[type="submit"]:has-text("Spiel planen")');
  await page.waitForURL(/\/admin\/spiele$/);
  await page.waitForLoadState("networkidle");

  // -------------------------------------------------------------------------
  // Step 3: Open the match and assign teams
  // -------------------------------------------------------------------------
  // Use 'li a' to skip the "Neues Spiel" button which also matches /admin/spiele/...
  const matchLink = page.locator('li a[href^="/admin/spiele/"]').first();
  await matchLink.click();
  await page.waitForURL(/\/admin\/spiele\/.+/);
  await page.waitForLoadState("networkidle");

  // Verify status is "Geplant"
  await expect(page.locator("text=Geplant").first()).toBeVisible();

  // Assign teams: click Rot button for each player
  // The player list has 4 players; assign first 2 to Rot, last 2 to Gelb
  // Buttons are rendered as: [Rot] [Gelb] per player row
  const teamButtons = page.locator(
    'button[class*="min-w-[60px]"][class*="rounded-lg"]'
  );
  const btnCount = await teamButtons.count();

  // Alternate: assign by player order (pairs of Rot/Gelb per player)
  // Player 0: click Rot (index 0)
  // Player 1: click Rot (index 2)
  // Player 2: click Gelb (index 5)
  // Player 3: click Gelb (index 7)
  if (btnCount >= 8) {
    await teamButtons.nth(0).click(); // Player 0 → Rot
    await teamButtons.nth(2).click(); // Player 1 → Rot
    await teamButtons.nth(5).click(); // Player 2 → Gelb
    await teamButtons.nth(7).click(); // Player 3 → Gelb
  } else {
    // Fallback: click all Rot buttons for first half
    const rotBtns = page.locator('button:has-text("Rot")').filter({
      hasNot: page.locator('button:has-text("Teams speichern")'),
    });
    const rotCount = await rotBtns.count();
    for (let i = 0; i < rotCount; i++) {
      if (i < Math.floor(rotCount / 2)) {
        await rotBtns.nth(i).click();
      }
    }
    const gelbBtns = page.locator('button:has-text("Gelb")').filter({
      hasNot: page.locator('button:has-text("Teams speichern")'),
    });
    const gelbCount = await gelbBtns.count();
    for (let i = Math.floor(gelbCount / 2); i < gelbCount; i++) {
      await gelbBtns.nth(i).click();
    }
  }

  // Save teams
  await page.click('button:has-text("Teams speichern")');
  await page.waitForURL(/\/admin\/spiele\/.+/);
  await page.waitForLoadState("networkidle");

  await expect(page.locator("text=Teams zugewiesen").first()).toBeVisible();

  // -------------------------------------------------------------------------
  // Step 4: Record goals
  // -------------------------------------------------------------------------
  const torForm = page.locator("form").filter({
    has: page.locator("h3", { hasText: "Tor hinzufügen" }),
  });

  const scorerSelect = torForm.locator("select").nth(0);
  const assistSelect = torForm.locator("select").nth(1);

  // Goal 1: first player scores (auto-assigns team), with an assist from another player
  await scorerSelect.selectOption({ index: 1 });
  await assistSelect.selectOption({ index: 1 });

  // Confirm Rot team button is selected (auto-set by scorer selection)
  // The scorer should be in Rot team; click Rot explicitly to ensure it
  const rotTeamBtn = torForm.locator('button:has-text("Rot")').first();
  await rotTeamBtn.click();

  await torForm.locator('button:has-text("Tor hinzufügen")').click();
  await page.waitForLoadState("networkidle");

  // Verify goal was added
  await expect(page.locator('h3:has-text("Tore (1)")')).toBeVisible();

  // Goal 2: second player scores, no assist
  await scorerSelect.selectOption({ index: 2 });
  await assistSelect.selectOption({ value: "" }); // no assist
  await rotTeamBtn.click();

  await torForm.locator('button:has-text("Tor hinzufügen")').click();
  await page.waitForLoadState("networkidle");

  await expect(page.locator('h3:has-text("Tore (2)")')).toBeVisible();

  // Goal 3: eigentor — select a Gelb player (index 3 in the scorer dropdown)
  await scorerSelect.selectOption({ index: 3 });
  await assistSelect.selectOption({ value: "" });

  // Check eigentor checkbox
  const eigentorCheckbox = page
    .locator('label')
    .filter({ hasText: "Eigentor" })
    .locator('input[type="checkbox"]');
  await eigentorCheckbox.check();

  // Team should be Gelb (shooter's team)
  const gelbTeamBtn = torForm.locator('button:has-text("Gelb")').first();
  await gelbTeamBtn.click();

  await torForm.locator('button:has-text("Tor hinzufügen")').click();
  await page.waitForLoadState("networkidle");

  await expect(page.locator('h3:has-text("Tore (3)")')).toBeVisible();

  // -------------------------------------------------------------------------
  // Step 5: Close the match (abschließen)
  // -------------------------------------------------------------------------
  await page.click('button:has-text("Spiel abschließen")');
  await page.waitForURL(/\/admin\/spiele\/.+/);
  await page.waitForLoadState("networkidle");

  // Verify status is now "Abgeschlossen"
  await expect(page.locator("text=Abgeschlossen").first()).toBeVisible();

  // -------------------------------------------------------------------------
  // Step 6: Verify on public /spiele
  // -------------------------------------------------------------------------
  await page.goto("/spiele?saison=2026");
  await page.waitForLoadState("networkidle");

  // The match should appear in the list
  const spielListe = page.locator("ul li").first();
  await expect(spielListe).toBeVisible();

  // The match should NOT show "Geplant" or "Abgesagt" status
  await expect(spielListe).not.toContainText("Geplant");
  await expect(spielListe).not.toContainText("Abgesagt");

  // The score should be visible — Rot 3 : Gelb 0
  // (Goals 1, 2 for Rot, plus eigentor by Gelb which counts for Rot)
  // So score is Rot 3 : Gelb 0
  await expect(spielListe.locator('span.tabular-nums')).toBeVisible();

  // Verify the "gewinnt" label appears (Rot should win)
  await expect(spielListe).toContainText("gewinnt");
});
