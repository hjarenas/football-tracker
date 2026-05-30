import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// Admin whitelist from environment variables
// Format: ADMIN_CREDENTIALS=username:password,username2:password2
function getAdminCredentials(): Map<string, string> {
  const raw = process.env.ADMIN_CREDENTIALS ?? "";
  const map = new Map<string, string>();
  for (const pair of raw.split(",")) {
    const [user, pass] = pair.split(":");
    if (user && pass) {
      map.set(user.trim(), pass.trim());
    }
  }
  return map;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Anmeldung",
      credentials: {
        username: { label: "Benutzername", type: "text" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        const admins = getAdminCredentials();
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!username || !password) return null;

        const expectedPassword = admins.get(username);
        if (!expectedPassword || expectedPassword !== password) return null;

        return { id: username, name: username, email: `${username}@admin.local` };
      },
    }),
  ],
  pages: {
    signIn: "/anmelden",
  },
  session: {
    strategy: "jwt",
  },
});
