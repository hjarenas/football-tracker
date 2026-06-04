"use client";

import { useState, useTransition } from "react";
import {
  spielerErstellenAction,
  spielerUmbenennenAction,
  spielerAktivToggleAction,
  spielerVereinsToggleAction,
} from "./actions";

interface Spieler {
  id: string;
  name: string;
  aktiv: boolean;
  vereinsmitglied: boolean;
}

interface Props {
  initialSpieler: Spieler[];
}

export default function SpielerVerwaltungFormular({ initialSpieler }: Props) {
  const [spieler, setSpieler] = useState<Spieler[]>(initialSpieler);
  const [neuerName, setNeuerName] = useState("");
  const [erstellFehler, setErstellFehler] = useState<string | null>(null);
  const [erstellPending, startErstellTransition] = useTransition();

  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameFehler, setRenameFehler] = useState<string | null>(null);
  const [renamePending, startRenameTransition] = useTransition();

  const [togglePending, setTogglePending] = useState<Record<string, boolean>>({});

  async function handleErstellen(e: React.FormEvent) {
    e.preventDefault();
    setErstellFehler(null);

    startErstellTransition(async () => {
      const result = await spielerErstellenAction(neuerName);
      if (result.fehler) {
        setErstellFehler(result.fehler);
      } else if (result.id && result.name) {
        setSpieler((prev) =>
          [...prev, { id: result.id!, name: result.name!, aktiv: true, vereinsmitglied: false }]
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setNeuerName("");
      }
    });
  }

  async function handleUmbenennen(id: string) {
    setRenameFehler(null);

    startRenameTransition(async () => {
      const result = await spielerUmbenennenAction(id, renameName);
      if (result.fehler) {
        setRenameFehler(result.fehler);
      } else {
        setSpieler((prev) =>
          prev
            .map((s) => (s.id === id ? { ...s, name: renameName.trim() } : s))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setRenameId(null);
        setRenameName("");
      }
    });
  }

  async function handleAktivToggle(id: string, aktiv: boolean) {
    setTogglePending((prev) => ({ ...prev, [`aktiv-${id}`]: true }));
    const result = await spielerAktivToggleAction(id, aktiv);
    setTogglePending((prev) => ({ ...prev, [`aktiv-${id}`]: false }));
    if (!result.fehler) {
      setSpieler((prev) =>
        prev.map((s) => (s.id === id ? { ...s, aktiv } : s))
      );
    }
  }

  async function handleVereinsToggle(id: string, vereinsmitglied: boolean) {
    setTogglePending((prev) => ({ ...prev, [`verein-${id}`]: true }));
    const result = await spielerVereinsToggleAction(id, vereinsmitglied);
    setTogglePending((prev) => ({ ...prev, [`verein-${id}`]: false }));
    if (!result.fehler) {
      setSpieler((prev) =>
        prev.map((s) => (s.id === id ? { ...s, vereinsmitglied } : s))
      );
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Create new player form */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h2 className="text-sm font-semibold text-gray-100 mb-3">
          Neuen Spieler erstellen
        </h2>
        <form onSubmit={handleErstellen} className="flex gap-2">
          <input
            type="text"
            placeholder="Name des Spielers"
            value={neuerName}
            onChange={(e) => setNeuerName(e.target.value)}
            className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            required
          />
          <button
            type="submit"
            disabled={erstellPending}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {erstellPending ? "Erstellen..." : "Spieler erstellen"}
          </button>
        </form>
        {erstellFehler && (
          <p
            role="alert"
            className="mt-2 text-sm text-red-400 bg-red-900/40 border border-red-700/60 rounded-lg px-3 py-2"
          >
            {erstellFehler}
          </p>
        )}
      </div>

      {/* Player list */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold text-gray-100">
            Alle Spieler ({spieler.length})
          </h2>
        </div>

        {spieler.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500 italic text-center">
            Noch keine Spieler vorhanden.
          </p>
        ) : (
          <ul className="divide-y divide-gray-700">
            {spieler.map((s) => (
              <li
                key={s.id}
                className="px-4 py-3 flex items-center gap-3 flex-wrap hover:bg-gray-700/30 transition-colors"
              >
                {/* Name / rename inline */}
                <div className="flex-1 min-w-0">
                  {renameId === s.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={renameName}
                        onChange={(e) => setRenameName(e.target.value)}
                        className="flex-1 px-2 py-1 bg-gray-900 border border-gray-600 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUmbenennen(s.id);
                          if (e.key === "Escape") {
                            setRenameId(null);
                            setRenameName("");
                            setRenameFehler(null);
                          }
                        }}
                      />
                      <button
                        type="submit"
                        onClick={() => handleUmbenennen(s.id)}
                        disabled={renamePending}
                        className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-gray-100 text-xs rounded-md disabled:opacity-50 transition-colors"
                      >
                        Speichern
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRenameId(null);
                          setRenameName("");
                          setRenameFehler(null);
                        }}
                        className="px-2 py-1 text-gray-400 text-xs rounded-md hover:bg-gray-700 transition-colors"
                      >
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-medium ${
                          s.aktiv ? "text-gray-100" : "text-gray-500 line-through"
                        }`}
                      >
                        {s.name}
                      </span>
                      {s.vereinsmitglied && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300">
                          Mitglied
                        </span>
                      )}
                      {!s.aktiv && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-700 text-gray-400">
                          Inaktiv
                        </span>
                      )}
                    </div>
                  )}
                  {renameId === s.id && renameFehler && (
                    <p className="mt-1 text-xs text-red-400">{renameFehler}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {renameId !== s.id && (
                    <button
                      type="button"
                      aria-label={`umbenennen ${s.name}`}
                      onClick={() => {
                        setRenameId(s.id);
                        setRenameName(s.name);
                        setRenameFehler(null);
                      }}
                      className="text-xs px-2 py-1 text-gray-400 border border-gray-600 rounded-md hover:bg-gray-700 transition-colors"
                    >
                      Umbenennen
                    </button>
                  )}

                  <button
                    type="button"
                    aria-label={`vereinsmitglied ${s.name}`}
                    onClick={() => handleVereinsToggle(s.id, !s.vereinsmitglied)}
                    disabled={togglePending[`verein-${s.id}`]}
                    className={`text-xs px-2 py-1 border rounded-md transition-colors disabled:opacity-50 ${
                      s.vereinsmitglied
                        ? "bg-blue-900/60 text-blue-300 border-blue-700/60 hover:bg-blue-900/40"
                        : "text-gray-400 border-gray-600 hover:bg-gray-700"
                    }`}
                    title={s.vereinsmitglied ? "Als Nicht-Mitglied markieren" : "Als Vereinsmitglied markieren"}
                  >
                    {s.vereinsmitglied ? "Mitglied ✓" : "Mitglied"}
                  </button>

                  <button
                    type="button"
                    aria-label={`aktiv ${s.name}`}
                    onClick={() => handleAktivToggle(s.id, !s.aktiv)}
                    disabled={togglePending[`aktiv-${s.id}`]}
                    className={`text-xs px-2 py-1 border rounded-md transition-colors disabled:opacity-50 ${
                      s.aktiv
                        ? "bg-green-900/60 text-green-300 border-green-700/60 hover:bg-green-900/40"
                        : "text-gray-400 border-gray-600 hover:bg-gray-700"
                    }`}
                    title={s.aktiv ? "Als inaktiv markieren" : "Als aktiv markieren"}
                  >
                    {s.aktiv ? "Aktiv ✓" : "Inaktiv"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
