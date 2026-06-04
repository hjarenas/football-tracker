"use client";

import { useState, useTransition } from "react";
import { spielAbsagenAction } from "../actions";

interface Props {
  spielId: string;
}

export default function SpielAbsagenFormular({ spielId }: Props) {
  const [bestaetigung, setBestaetigung] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAbsagen() {
    setFehler(null);
    startTransition(async () => {
      const result = await spielAbsagenAction(spielId);
      if (result?.fehler) {
        setFehler(result.fehler);
        setBestaetigung(false);
      }
      // On success, the server action redirects — no local state needed
    });
  }

  if (!bestaetigung) {
    return (
      <div className="border-t border-gray-700 pt-4 mt-4">
        <button
          type="button"
          onClick={() => setBestaetigung(true)}
          className="w-full rounded-lg border-2 border-red-700/60 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-900/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Spiel absagen
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-700 pt-4 mt-4">
      <div className="rounded-xl border-2 border-red-800/60 bg-red-900/30 p-4">
        <p className="text-sm font-semibold text-red-400 mb-1">
          Spiel wirklich absagen?
        </p>
        <p className="text-xs text-red-400/80 mb-4">
          Diese Aktion kann nicht rückgängig gemacht werden. Das Spiel wird als
          <strong> Abgesagt</strong> markiert und in der Spielhistorie angezeigt.
        </p>

        {fehler && (
          <p
            role="alert"
            className="mb-3 rounded-lg border border-red-700/60 bg-red-900/40 px-3 py-2 text-sm text-red-400"
          >
            {fehler}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBestaetigung(false)}
            disabled={isPending}
            className="flex-1 rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={handleAbsagen}
            disabled={isPending}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Absagen..." : "Ja, absagen"}
          </button>
        </div>
      </div>
    </div>
  );
}
