/**
 * Playwright global setup — runs once before any test file.
 *
 * Loads .env.test so the test process uses the test database,
 * then ensures the test DB schema is up-to-date (prisma db push).
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

export default async function globalSetup() {
  // Load .env.test into the current process environment
  const envTestPath = path.resolve(process.cwd(), ".env.test");
  if (fs.existsSync(envTestPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envTestPath));
    for (const [key, value] of Object.entries(parsed)) {
      process.env[key] = value;
    }
  }

  // Run prisma db push to ensure the test DB schema matches the Prisma schema.
  // --accept-data-loss is safe here because this is a throwaway test DB.
  try {
    execSync("npx prisma db push --accept-data-loss", {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL,
      },
      stdio: "pipe",
    });
  } catch (err) {
    console.error("prisma db push failed:", err);
    throw err;
  }
}
