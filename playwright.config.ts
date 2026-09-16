import { defineConfig, devices } from "@playwright/test";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env.test before everything else so DATABASE_URL and auth vars
// are available to the web server process that Playwright spawns.
const envTestPath = path.resolve(__dirname, ".env.test");
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath, override: true });
}

// Build env for the dev server, preferring test values over everything
const testEnv = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/dienstagskicken_test",
  AUTH_SECRET:
    process.env.AUTH_SECRET ?? "test-secret-for-e2e-testing-only",
  AUTH_URL: process.env.AUTH_URL ?? "http://localhost:3000",
  ADMIN_CREDENTIALS: process.env.ADMIN_CREDENTIALS ?? "testadmin:testpassword",
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // run serially so DB state is predictable
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // single worker — tests share one DB
  reporter: "html",
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Lets sandboxes with no network access to the Playwright CDN point
        // at a browser binary they already have, instead of the version
        // this repo's @playwright/test pins. Unset everywhere else.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
          : undefined,
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    // Only reuse existing server in local dev (not CI)
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: testEnv,
  },
});
