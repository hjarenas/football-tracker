/**
 * Auth helper for E2E tests.
 *
 * Instead of going through the full login UI flow (which is brittle with
 * NextAuth v5's client-side signIn on Next.js 16), we set the session cookie
 * directly using the same JWT encoding that NextAuth uses internally.
 *
 * This approach is equivalent to being logged in because:
 * 1. The middleware uses `auth()` (server-side) which reads and verifies the JWT cookie
 * 2. The cookie is signed with the same NEXTAUTH_SECRET the server uses
 *
 * Cookie name in NextAuth v5 (Auth.js): "authjs.session-token"
 * The salt used for the session token cookie is "authjs.session-token"
 */

import { encode } from "next-auth/jwt";
import type { Page } from "@playwright/test";

const NEXTAUTH_SECRET =
  process.env.NEXTAUTH_SECRET ?? "test-secret-for-e2e-testing-only";

// Cookie name used by NextAuth v5 in HTTP (non-HTTPS) context
const SESSION_COOKIE_NAME = "authjs.session-token";

/**
 * Creates a valid NextAuth v5 session JWT for the testadmin user
 * and sets it as a cookie in the given Playwright page context.
 *
 * After calling this, the page's fetch requests will include the session cookie
 * and the Next.js middleware will consider the user authenticated.
 */
export async function setAdminSession(page: Page): Promise<void> {
  // Create a JWT token matching what NextAuth v5 creates for a credentials user
  const token = await encode({
    token: {
      name: "testadmin",
      email: "testadmin@admin.local",
      sub: "testadmin",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
      jti: `test-${Date.now()}`,
    },
    secret: NEXTAUTH_SECRET,
    salt: SESSION_COOKIE_NAME,
  });

  // Set the cookie on the browser context
  await page.context().addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: token,
      domain: "localhost",
      path: "/",
      httpOnly: true,
      secure: false, // localhost is non-HTTPS
      sameSite: "Lax",
    },
  ]);
}

/**
 * Clears the admin session cookie from the page context.
 */
export async function clearAdminSession(page: Page): Promise<void> {
  await page.context().clearCookies();
}
