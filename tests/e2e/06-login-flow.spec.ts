import { test, expect } from "@playwright/test";
import { resetDb } from "./helpers/db";

test.beforeAll(async () => {
  await resetDb();
});

test.afterAll(async () => {
  await resetDb();
});

test("Unauthenticated access to /admin redirects to /anmelden", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/anmelden/);
});

test("Valid credentials on /anmelden redirect to /admin", async ({ page }) => {
  await page.goto("/anmelden");
  await page.fill("#username", "testadmin");
  await page.fill("#password", "testpassword");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/admin/, { timeout: 15000 });
  await expect(page).toHaveURL(/\/admin/);
});

test("Invalid credentials on /anmelden show inline error", async ({ page }) => {
  await page.goto("/anmelden");
  await page.fill("#username", "wronguser");
  await page.fill("#password", "wrongpassword");
  await page.click('button[type="submit"]');
  // Should show error message inline, NOT redirect to 404
  await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
  await expect(page).toHaveURL(/\/anmelden/);
});
