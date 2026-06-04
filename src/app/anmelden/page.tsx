"use client";

import { Suspense, useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function AnmeldenForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [ladend, setLadend] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFehler(null);
    setLadend(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setFehler("Ungueltige Zugangsdaten. Bitte erneut versuchen.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setFehler("Ein Fehler ist aufgetreten. Bitte erneut versuchen.");
    } finally {
      setLadend(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="username"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Benutzername
        </label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          placeholder="Benutzername eingeben"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Passwort
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
          placeholder="Passwort eingeben"
        />
      </div>

      {fehler && (
        <p
          role="alert"
          className="text-sm text-red-400 bg-red-900/40 border border-red-700/60 rounded-lg px-3 py-2"
        >
          {fehler}
        </p>
      )}

      <button
        type="submit"
        disabled={ladend}
        className="w-full py-2 px-4 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {ladend ? "Anmelden..." : "Anmelden"}
      </button>
    </form>
  );
}

export default function AnmeldenPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-gray-800 rounded-xl border border-gray-700 p-8">
        <h1 className="text-xl font-bold mb-1 text-center text-gray-100">
          Anmelden
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Dienstagskicken-Verwaltung
        </p>

        <Suspense>
          <AnmeldenForm />
        </Suspense>
      </div>
    </main>
  );
}
