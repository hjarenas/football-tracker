import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminPage() {
  const session = await auth();

  if (!session) {
    redirect("/anmelden");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-8">
        <h1 className="text-2xl font-bold mb-2 text-gray-800">
          Verwaltung
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Angemeldet als: <strong>{session.user?.name}</strong>
        </p>

        <div className="flex flex-col gap-3">
          <p className="text-gray-600 text-sm mb-2">
            Willkommen im Verwaltungsbereich von Dienstagskicken.
          </p>
          <Link
            href="/admin/spiele"
            className="w-full py-2 px-4 bg-gray-800 text-white text-center font-semibold rounded-lg hover:bg-gray-700 transition-colors text-sm"
          >
            Spiele verwalten
          </Link>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
          className="mt-8"
        >
          <button
            type="submit"
            className="w-full py-2 px-4 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-500 transition-colors"
          >
            Abmelden
          </button>
        </form>
      </div>
    </main>
  );
}
