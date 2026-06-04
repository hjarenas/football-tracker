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

  // Per-row rename state
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameFehler, setRenameFehler] = useState<string | null>(null);
  const [renamePending, startRenameTransition] = useTransition();

  // Per-row toggle pending state (id → pending)
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
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-base font-semibold text-gray-800 mb-3">
          Neuen Spieler erstellen
        </h2>
        <form onSubmit={handleErstellen} className="flex gap-2">
          <input
            type="text"
            placeholder="Name des Spielers"
            value={neuerName}
            onChange={(e) => setNeuerName(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
            required
          />
          <button
            type="submit"
            disabled={erstellPending}
            className="px-4 py-2 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {erstellPending ? "Erstellen..." : "Spieler erstellen"}
          </button>
        </form>
        {erstellFehler && (
          <p
            role="alert"
            className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
          >
            {erstellFehler}
          </p>
        )}
      </div>

      {/* Player list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            Alle Spieler ({spieler.length})
          </h2>
        </div>

        {spieler.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-400 italic text-center">
            Noch keine Spieler vorhanden.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {spieler.map((s) => (
              <li
                key={s.id}
                className="px-4 py-3 flex items-center gap-3 flex-wrap"
              >
                {/* Name / rename inline */}
                <div className="flex-1 min-w-0">
                  {renameId === s.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={renameName}
                        onChange={(e) => setRenameName(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
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
                        className="px-2 py-1 bg-gray-800 text-white text-xs rounded-md hover:bg-gray-700 disabled:opacity-50"
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
                        className="px-2 py-1 text-gray-500 text-xs rounded-md hover:bg-gray-100"
                      >
                        Abbrechen
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-sm font-medium ${
                          s.aktiv ? "text-gray-800" : "text-gray-400 line-through"
                        }`}
                      >
                        {s.name}
                      </span>
                      {s.vereinsmitglied && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                          Mitglied
                        </span>
                      )}
                      {!s.aktiv && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          Inaktiv
                        </span>
                      )}
                    </div>
                  )}
                  {renameId === s.id && renameFehler && (
                    <p className="mt-1 text-xs text-red-600">{renameFehler}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Rename */}
                  {renameId !== s.id && (
                    <button
                      type="button"
                      aria-label={`umbenennen ${s.name}`}
                      onClick={() => {
                        setRenameId(s.id);
                        setRenameName(s.name);
                        setRenameFehler(null);
                      }}
                      className="text-xs px-2 py-1 text-gray-500 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Umbenennen
                    </button>
                  )}

                  {/* Vereinsmitglied toggle */}
                  <button
                    type="button"
                    aria-label={`vereinsmitglied ${s.name}`}
                    onClick={() => handleVereinsToggle(s.id, !s.vereinsmitglied)}
                    disabled={togglePending[`verein-${s.id}`]}
                    className={`text-xs px-2 py-1 border rounded-md transition-colors disabled:opacity-50 ${
                      s.vereinsmitglied
                        ? "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-50"
                        : "text-gray-500 border-gray-200 hover:bg-gray-50"
                    }`}
                    title={s.vereinsmitglied ? "Als Nicht-Mitglied markieren" : "Als Vereinsmitglied markieren"}
                  >
                    {s.vereinsmitglied ? "Mitglied ✓" : "Mitglied"}
                  </button>

                  {/* Aktiv toggle */}
                  <button
                    type="button"
                    aria-label={`aktiv ${s.name}`}
                    onClick={() => handleAktivToggle(s.id, !s.aktiv)}
                    disabled={togglePending[`aktiv-${s.id}`]}
                    className={`text-xs px-2 py-1 border rounded-md transition-colors disabled:opacity-50 ${
                      s.aktiv
                        ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-50"
                        : "text-gray-500 border-gray-200 hover:bg-gray-50"
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
