import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { parseAdminCredentials, isValidAdminCredential } from "@/lib/auth-utils";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Anmeldung",
      credentials: {
        username: { label: "Benutzername", type: "text" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        const admins = parseAdminCredentials(
          process.env.ADMIN_CREDENTIALS ?? ""
        );
        const username = credentials?.username as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!isValidAdminCredential(username, password, admins)) return null;

        return {
          id: username!,
          name: username!,
          email: `${username}@admin.local`,
        };
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
