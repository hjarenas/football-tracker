/**
 * Pure helper functions for authentication logic.
 * Extracted to be testable independently of NextAuth internals.
 */

/**
 * Parses ADMIN_CREDENTIALS env-var into a username->password map.
 * Format: "username:password,username2:password2"
 */
export function parseAdminCredentials(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of raw.split(",")) {
    const colonIndex = pair.indexOf(":");
    if (colonIndex === -1) continue;
    const user = pair.slice(0, colonIndex).trim();
    const pass = pair.slice(colonIndex + 1).trim();
    if (user && pass) {
      map.set(user, pass);
    }
  }
  return map;
}

/**
 * Returns true if the given username/password combination is valid
 * against the provided admin credentials map.
 */
export function isValidAdminCredential(
  username: string | undefined,
  password: string | undefined,
  admins: Map<string, string>
): boolean {
  if (!username || !password) return false;
  const expected = admins.get(username);
  return expected !== undefined && expected === password;
}

/**
 * Returns true if a pathname requires admin authentication.
 * All paths under /admin/* require auth.
 */
export function isAdminPath(pathname: string): boolean {
  return pathname.startsWith("/admin");
}

/**
 * Returns true if the session object represents an authenticated admin user.
 * A valid session must be a non-null object with a `user` property.
 */
export function isAuthenticatedSession(session: unknown): boolean {
  return (
    session !== null &&
    session !== undefined &&
    typeof session === "object" &&
    "user" in (session as object) &&
    (session as { user: unknown }).user !== null &&
    (session as { user: unknown }).user !== undefined
  );
}
