import { auth, signOut } from "@/lib/auth";
import Link from "next/link";

const publicNav = [
  { href: "/", label: "Rangliste" },
  { href: "/spiele", label: "Spiele" },
  { href: "/ewige-tabelle", label: "Ewige Tabelle" },
];

const adminNav = [
  { href: "/admin/spiele", label: "Spiele" },
  { href: "/admin/spieler", label: "Spieler" },
];

export default async function Header() {
  const session = await auth();
  const isAdmin = !!session;

  return (
    <header
      className="sticky top-0 z-50 border-b border-white/10"
      style={{ backgroundColor: "var(--color-nav)" }}
    >
      <div className="max-w-7xl mx-auto px-4">
        {/* Top row: brand + admin area */}
        <div className="flex items-center justify-between h-11 gap-4">
          <Link
            href="/"
            className="text-sm font-bold tracking-widest uppercase text-white shrink-0"
          >
            Dienstagskicken
          </Link>

          <div className="flex items-center gap-1">
            {isAdmin ? (
              <>
                <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400 mr-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  Admin
                </span>
                {adminNav.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-xs text-gray-400 hover:text-white px-2.5 py-1.5 rounded hover:bg-white/10 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs text-gray-500 hover:text-red-400 px-2.5 py-1.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Abmelden
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/anmelden"
                className="text-xs text-gray-400 hover:text-white border border-white/20 hover:border-white/40 px-3 py-1.5 rounded transition-colors"
              >
                Verwaltung
              </Link>
            )}
          </div>
        </div>

        {/* Bottom row: public nav links */}
        <div className="flex items-center gap-0.5 pb-2">
          {publicNav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs sm:text-sm text-gray-400 hover:text-white px-2.5 sm:px-3 py-1 rounded hover:bg-white/10 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
