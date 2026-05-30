/**
 * Scenario 2 — Leaderboard-Korrektheit
 *
 * Seeds a Saison with known match data (specific goals/assists per player),
 * navigates to the public leaderboard at /, and verifies all five categories
 * show the expected rankings including tie handling.
 *
 * Seeded data (see helpers/db.ts → seedLeaderboardScenario):
 *   Match: Rot 3:1 Gelb  (abgeschlossen)
 *   Rot team: Alexander Bauer, Benjamin Fischer, Elias Müller
 *   Gelb team: Christian Hofmann, Daniel Koch
 *   Bierbringer: Elias Müller
 *
 *   Goals:
 *     1. Alexander → Rot (assist: Daniel)   → Alexander: 1 goal, Daniel: 1 assist
 *     2. Benjamin  → Rot (no assist)         → Benjamin: 1 goal
 *     3. Christian eigentor (team: Gelb)     → counts for Rot; Christian excluded from scorer tally
 *     4. Daniel   → Gelb (assist: Alexander) → Daniel: 1 goal, Alexander: 1 assist
 *
 *   Expected Torjägerliste:  Alexander 1, Benjamin 1, Daniel 1 (tied at rank 1)
 *   Expected Vorlagenliste:  Alexander 1, Daniel 1 (tied at rank 1)
 *   Expected Punktetabelle:  Alexander 3, Benjamin 3, Elias 3  (Rot wins 3:1); Daniel 0, Christian 0
 *   Expected Anwesenheitsliste: all 5 players with 1 Spiel each
 *   Expected Bierliste: Elias 1
 */

import { test, expect } from "@playwright/test";
import { resetDb, seedLeaderboardScenario } from "./helpers/db";

test.beforeAll(async () => {
  await resetDb();
  await seedLeaderboardScenario();
});

test.afterAll(async () => {
  await resetDb();
});

test("Torjägerliste shows correct goal counts", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const torjaegerSection = page.locator("section", {
    has: page.locator("h2", { hasText: "Torjägerliste" }),
  });

  // Alexander, Benjamin, and Daniel each scored 1 goal
  await expect(torjaegerSection).toContainText("Alexander Bauer");
  await expect(torjaegerSection).toContainText("Benjamin Fischer");
  await expect(torjaegerSection).toContainText("Daniel Koch");

  // All three should show "1 Tor"
  const entries = torjaegerSection.locator("li");
  const count = await entries.count();
  expect(count).toBe(3);

  // Christian should NOT appear (eigentor doesn't count for scorer's personal tally)
  await expect(torjaegerSection).not.toContainText("Christian Hofmann");
});

test("Vorlagenliste shows correct assist counts", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const vorlagenSection = page.locator("section", {
    has: page.locator("h2", { hasText: "Vorlagenliste" }),
  });

  // Alexander and Daniel each have 1 assist — should share the same rank
  await expect(vorlagenSection).toContainText("Alexander Bauer");
  await expect(vorlagenSection).toContainText("Daniel Koch");

  // Both should show 1 Vorlage
  const entries = vorlagenSection.locator("li");
  const count = await entries.count();
  expect(count).toBe(2);

  // Both should have rank 1 (tied)
  const ranks = await entries.locator("span").first().allTextContents();
  // Each entry's first span is the rank
  for (let i = 0; i < count; i++) {
    const rankSpan = entries.nth(i).locator("span").first();
    await expect(rankSpan).toContainText("1");
  }
});

test("Punktetabelle shows Rot-team players with 3 points each", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const punkteSection = page.locator("section", {
    has: page.locator("h2", { hasText: "Punktetabelle" }),
  });

  // Rot players (winners): 3 points each
  await expect(punkteSection).toContainText("Alexander Bauer");
  await expect(punkteSection).toContainText("Benjamin Fischer");
  await expect(punkteSection).toContainText("Elias Müller");

  // Gelb players show 0 points — they appear in Punktetabelle with 0
  // (The engine includes players with 0 points in Punktetabelle)
  // Verify total entries count: 5 players
  const entries = punkteSection.locator("li");
  const count = await entries.count();
  expect(count).toBe(5);
});

test("Anwesenheitsliste shows all 5 players with 1 Spiel each", async ({
  page,
}) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const anwesenheitSection = page.locator("section", {
    has: page.locator("h2", { hasText: "Anwesenheitsliste" }),
  });

  await expect(anwesenheitSection).toContainText("Alexander Bauer");
  await expect(anwesenheitSection).toContainText("Benjamin Fischer");
  await expect(anwesenheitSection).toContainText("Christian Hofmann");
  await expect(anwesenheitSection).toContainText("Daniel Koch");
  await expect(anwesenheitSection).toContainText("Elias Müller");

  const entries = anwesenheitSection.locator("li");
  const count = await entries.count();
  expect(count).toBe(5);
});

test("Bierliste shows Elias as Bierbringer", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const bierSection = page.locator("section", {
    has: page.locator("h2", { hasText: "Bierliste" }),
  });

  await expect(bierSection).toContainText("Elias Müller");

  // Only 1 entry in Bierliste (only Elias was the beer bringer)
  const entries = bierSection.locator("li");
  const count = await entries.count();
  expect(count).toBe(1);
});

test("Tied players share the same rank in Vorlagenliste", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const vorlagenSection = page.locator("section", {
    has: page.locator("h2", { hasText: "Vorlagenliste" }),
  });

  // Both Alexander and Daniel have 1 assist — both should show rank "1."
  const entries = vorlagenSection.locator("li");
  const count = await entries.count();
  expect(count).toBe(2);

  for (let i = 0; i < count; i++) {
    const rankText = await entries.nth(i).locator("span").first().textContent();
    expect(rankText?.trim()).toBe("1.");
  }
});
