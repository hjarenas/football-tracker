import { test, expect } from "@playwright/test";

test("Startseite wird angezeigt", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Dienstagskicken/);
});

test("Startseite enthält App-Namen", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Dienstagskicken");
});
