"use client";

import { useState, useTransition } from "react";
import { spielPlanenAction } from "../actions";
import { spielerErstellenAction } from "../../spieler/actions";

interface Spieler {
  id: string;
  name: string;
}

interface Props {
  spieler: Spieler[];
  vorausgefuelltDatum: string;
}

export default function SpielPlanenFormular({
  spieler,
  vorausgefuelltDatum,
}: Props) {
  const [datum, setDatum] = useState(vorausgefuelltDatum);
  const [bierbringerId, setBierbringerId] = useState("");
  const [bierbringerSuche, setBierbringerSuche] = useState("");
  const [bierbringerOffen, setBierbringerOffen] = useState(false);
  const [ausgewaehlteTeilnehmer, setAusgewaehlteTeilnehmer] = useState<
    Set<string>
  >(new Set());
  const [teilnehmerSuche, setTeilnehmerSuche] = useState("");
  const [extraSpieler, setExtraSpieler] = useState<Spieler[]>([]);
  const [neuerSpielerName, setNeuerSpielerName] = useState("");
  const [neuerSpielerFehler, setNeuerSpielerFehler] = useState<string | null>(null);
  const [isCreating, startCreatingTransition] = useTransition();
  const [fehler, setFehler] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Merge server-provided list with client-side newly created players,
  // deduplicating by id so that revalidatePath re-renders don't produce duplicate keys.
  const spielerIds = new Set(spieler.map((s) => s.id));
  const alleSpieler = [...spieler, ...extraSpieler.filter((s) => !spielerIds.has(s.id))];

  const gefilterteBierbringer = alleSpieler.filter((s) =>
    s.name.toLowerCase().includes(bierbringerSuche.toLowerCase())
  );

  const gefilterteTeilnehmer = alleSpieler.filter((s) =>
    s.name.toLowerCase().includes(teilnehmerSuche.toLowerCase())
  );

  const ausgewaehlterBierbringer = alleSpieler.find((s) => s.id === bierbringerId);

  async function handleNeuerSpieler() {
    const trimmed = neuerSpielerName.trim();
    if (!trimmed) return;
    setNeuerSpielerFehler(null);

    startCreatingTransition(async () => {
      const result = await spielerErstellenAction(trimmed);
      if (result.fehler) {
        setNeuerSpielerFehler(result.fehler);
        return;
      }
      if (result.id && result.name) {
        const neuer: Spieler = { id: result.id, name: result.name };
        setExtraSpieler((prev) => [...prev, neuer]);
        setAusgewaehlteTeilnehmer((prev) => new Set([...prev, result.id!]));
        setNeuerSpielerName("");
      }
    });
  }

  function toggleTeilnehmer(id: string) {
    setAusgewaehlteTeilnehmer((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function alleAuswaehlen() {
    setAusgewaehlteTeilnehmer(new Set(alleSpieler.map((s) => s.id)));
  }

  function alleAbwaehlen() {
    setAusgewaehlteTeilnehmer(new Set());
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFehler(null);

    const formData = new FormData();
    formData.set("datum", datum);
    if (bierbringerId) formData.set("bierbringerId", bierbringerId);
    for (const id of ausgewaehlteTeilnehmer) {
      formData.append("teilnehmerIds", id);
    }

    startTransition(async () => {
      const result = await spielPlanenAction(formData);
      if (result?.fehler) {
        setFehler(result.fehler);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Datum */}
      <div>
        <label
          htmlFor="datum"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Datum <span className="text-red-500">*</span>
        </label>
        <input
          id="datum"
          type="date"
          required
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
        />
      </div>

      {/* Bierbringer */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bierbringer
        </label>
        <button
          type="button"
          onClick={() => setBierbringerOffen((v) => !v)}
          className="w-full text-left px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 bg-white"
        >
          {ausgewaehlterBierbringer
            ? ausgewaehlterBierbringer.name
            : "Bierbringer auswählen..."}
        </button>

        {bierbringerOffen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
            <div className="p-2">
              <input
                type="text"
                placeholder="Suchen..."
                value={bierbringerSuche}
                onChange={(e) => setBierbringerSuche(e.target.value)}
                className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
                autoFocus
              />
            </div>
            <ul className="max-h-48 overflow-y-auto">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setBierbringerId("");
                    setBierbringerSuche("");
                    setBierbringerOffen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 italic"
                >
                  — Keiner —
                </button>
              </li>
              {gefilterteBierbringer.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setBierbringerId(s.id);
                      setBierbringerSuche("");
                      setBierbringerOffen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                      bierbringerId === s.id
                        ? "font-semibold text-gray-900 bg-gray-100"
                        : "text-gray-700"
                    }`}
                  >
                    {s.name}
                  </button>
                </li>
              ))}
              {gefilterteBierbringer.length === 0 && (
                <li className="px-4 py-2 text-sm text-gray-400 italic">
                  Keine Treffer
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Teilnehmer */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Teilnehmer <span className="text-red-500">*</span>{" "}
            <span className="text-gray-400 font-normal">
              ({ausgewaehlteTeilnehmer.size} ausgewählt)
            </span>
          </label>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={alleAuswaehlen}
              className="text-blue-600 hover:underline"
            >
              Alle
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              onClick={alleAbwaehlen}
              className="text-gray-500 hover:underline"
            >
              Keine
            </button>
          </div>
        </div>

        <input
          type="text"
          placeholder="Spieler suchen..."
          value={teilnehmerSuche}
          onChange={(e) => setTeilnehmerSuche(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 mb-2"
        />

        {/* Inline new player creation */}
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Neuen Spieler hinzufügen..."
            value={neuerSpielerName}
            onChange={(e) => setNeuerSpielerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleNeuerSpieler();
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-800"
          />
          <button
            type="button"
            onClick={handleNeuerSpieler}
            disabled={isCreating || !neuerSpielerName.trim()}
            className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isCreating ? "..." : "Hinzufügen"}
          </button>
        </div>
        {neuerSpielerFehler && (
          <p className="text-xs text-red-600 mb-2">{neuerSpielerFehler}</p>
        )}

        <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto divide-y divide-gray-100">
          {gefilterteTeilnehmer.map((s) => {
            const checked = ausgewaehlteTeilnehmer.has(s.id);
            return (
              <label
                key={s.id}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 ${
                  checked ? "bg-blue-50" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleTeilnehmer(s.id)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{s.name}</span>
              </label>
            );
          })}
          {gefilterteTeilnehmer.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-400 italic">
              Keine Spieler gefunden
            </p>
          )}
        </div>
      </div>

      {fehler && (
        <p
          role="alert"
          className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
        >
          {fehler}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 px-4 bg-gray-800 text-white font-semibold rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? "Speichern..." : "Spiel planen"}
      </button>
    </form>
  );
}
