import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminPage() {
  const session = await auth();

  if (!session) {
    redirect("/anmelden");
  }

  return (
    <main className="min-h-screen pb-12">
      <div className="max-w-md mx-auto px-4 pt-8">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h1 className="text-xl font-bold text-gray-100 mb-1">Verwaltung</h1>
          <p className="text-sm text-gray-500 mb-6">
            Angemeldet als{" "}
            <span className="text-gray-300 font-medium">
              {session.user?.name}
            </span>
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/admin/spiele"
              className="w-full py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-gray-100 text-center font-semibold rounded-lg transition-colors text-sm"
            >
              Spiele verwalten
            </Link>
            <Link
              href="/admin/spieler"
              className="w-full py-2.5 px-4 bg-gray-700 hover:bg-gray-600 text-gray-100 text-center font-semibold rounded-lg transition-colors text-sm"
            >
              Spieler verwalten
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
