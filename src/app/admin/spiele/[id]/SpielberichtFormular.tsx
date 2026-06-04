"use client";

import { useState, useTransition } from "react";
import { torErfassenAction, torLoeschenAction, spielAbschliessenAction } from "../actions";
import { deriveScore } from "@/lib/score";

type Team = "Rot" | "Gelb";

interface Teilnehmer {
  id: string;
  name: string;
  team: Team;
}

interface Tor {
  id: string;
  team: Team;
  eigentor: boolean;
  scorer: { id: string; name: string };
  assist: { id: string; name: string } | null;
}

interface Props {
  spielId: string;
  teilnehmer: Teilnehmer[];
  initialTore: Tor[];
}

const TEAM_BADGE: Record<Team, string> = {
  Rot: "bg-red-600 text-white",
  Gelb: "bg-yellow-400 text-yellow-900",
};

export default function SpielberichtFormular({ spielId, teilnehmer, initialTore }: Props) {
  const [tore, setTore] = useState<Tor[]>(initialTore);

  const [scorerId, setScorerId] = useState<string>("");
  const [assistId, setAssistId] = useState<string>("");
  const [eigentor, setEigentor] = useState<boolean>(false);
  const [torTeam, setTorTeam] = useState<Team | "">("");

  const [fehler, setFehler] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isAbschliessen, startAbschliessen] = useTransition();

  const selectedSpieler = teilnehmer.find((t) => t.id === scorerId);

  function handleScorerChange(id: string) {
    setScorerId(id);
    setAssistId("");
    const spieler = teilnehmer.find((t) => t.id === id);
    if (spieler) {
      setTorTeam(spieler.team);
    }
  }

  const ergebnis = deriveScore(tore.map((t) => ({ team: t.team, eigentor: t.eigentor })));

  async function handleTorHinzufuegen(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFehler(null);

    if (!scorerId) {
      setFehler("Bitte einen Torschützen auswählen.");
      return;
    }
    if (!torTeam) {
      setFehler("Bitte das Team auswählen.");
      return;
    }

    const formData = new FormData();
    formData.set("scorerId", scorerId);
    if (assistId) formData.set("assistId", assistId);
    formData.set("eigentor", String(eigentor));
    formData.set("team", torTeam);

    startTransition(async () => {
      const result = await torErfassenAction(spielId, formData);
      if (result.fehler) {
        setFehler(result.fehler);
        return;
      }

      if (result.torId) {
        const scorer = teilnehmer.find((t) => t.id === scorerId)!;
        const assist = assistId ? (teilnehmer.find((t) => t.id === assistId) ?? null) : null;
        const neuesTor: Tor = {
          id: result.torId,
          team: torTeam as Team,
          eigentor,
          scorer: { id: scorer.id, name: scorer.name },
          assist: assist ? { id: assist.id, name: assist.name } : null,
        };
        setTore((prev) => [...prev, neuesTor]);
      }

      setScorerId("");
      setAssistId("");
      setEigentor(false);
      setTorTeam("");
    });
  }

  async function handleTorLoeschen(torId: string) {
    setFehler(null);
    startTransition(async () => {
      const result = await torLoeschenAction(spielId, torId);
      if (result.fehler) {
        setFehler(result.fehler);
        return;
      }
      setTore((prev) => prev.filter((t) => t.id !== torId));
    });
  }

  async function handleAbschliessen() {
    setFehler(null);
    startAbschliessen(async () => {
      const result = await spielAbschliessenAction(spielId);
      if (result?.fehler) {
        setFehler(result.fehler);
      }
    });
  }

  const moeglicheAssists = teilnehmer.filter((t) => t.id !== scorerId);

  return (
    <div className="flex flex-col gap-6">
      {/* Live-Ergebnis */}
      <div className="flex items-center gap-4">
        <div className="flex-1 rounded-xl border-2 border-red-800/60 bg-red-900/30 py-4 text-center">
          <span className="block text-4xl font-bold text-red-400">{ergebnis.rot}</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-red-400 mt-1 block">Rot</span>
        </div>
        <span className="text-2xl font-bold text-gray-500">:</span>
        <div className="flex-1 rounded-xl border-2 border-yellow-800/60 bg-yellow-900/30 py-4 text-center">
          <span className="block text-4xl font-bold text-yellow-400">{ergebnis.gelb}</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-yellow-400 mt-1 block">Gelb</span>
        </div>
      </div>

      {/* Torliste */}
      {tore.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">
            Tore ({tore.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {tore.map((tor, idx) => (
              <li
                key={tor.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gray-700 bg-gray-900/40 px-3 py-2"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-500 w-5 text-right">
                    {idx + 1}.
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TEAM_BADGE[tor.team]}`}
                  >
                    {tor.team}
                  </span>
                  {tor.eigentor && (
                    <span className="rounded-full bg-orange-900/40 px-2 py-0.5 text-xs font-semibold text-orange-400 border border-orange-700/40">
                      ET
                    </span>
                  )}
                  <span className="text-sm text-gray-100 font-medium">
                    {tor.scorer.name}
                  </span>
                  {tor.assist && (
                    <span className="text-xs text-gray-500">
                      (Vorlage: {tor.assist.name})
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleTorLoeschen(tor.id)}
                  disabled={isPending}
                  className="shrink-0 rounded-md border border-gray-600 px-2 py-1 text-xs text-gray-500 hover:border-red-700 hover:text-red-400 transition-colors disabled:opacity-40"
                >
                  Löschen
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tor hinzufügen */}
      <form onSubmit={handleTorHinzufuegen} className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-gray-400">Tor hinzufügen</h3>

        {/* Torschütze */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Torschütze *
          </label>
          <select
            value={scorerId}
            onChange={(e) => handleScorerChange(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-gray-400 focus:outline-none"
          >
            <option value="">— Spieler auswählen —</option>
            {(["Rot", "Gelb"] as Team[]).map((team) => (
              <optgroup key={team} label={team}>
                {teilnehmer
                  .filter((t) => t.team === team)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Vorlagengeber */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Vorlagengeber (optional)
          </label>
          <select
            value={assistId}
            onChange={(e) => setAssistId(e.target.value)}
            disabled={!scorerId}
            className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-gray-400 focus:outline-none disabled:opacity-50"
          >
            <option value="">— kein Vorlagengeber —</option>
            {moeglicheAssists.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.team})
              </option>
            ))}
          </select>
        </div>

        {/* Team */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">
            Team *{" "}
            <span className="text-gray-500 font-normal">
              (bei Eigentor: Team des schießenden Spielers)
            </span>
          </label>
          <div className="flex gap-2">
            {(["Rot", "Gelb"] as Team[]).map((team) => (
              <button
                key={team}
                type="button"
                onClick={() => setTorTeam(team)}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
                  torTeam === team
                    ? TEAM_BADGE[team]
                    : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {team}
              </button>
            ))}
          </div>
          {selectedSpieler && torTeam && torTeam !== selectedSpieler.team && !eigentor && (
            <p className="mt-1 text-xs text-amber-400">
              Hinweis: Torschütze spielt in Team {selectedSpieler.team}.
            </p>
          )}
        </div>

        {/* Eigentor */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={eigentor}
            onChange={(e) => setEigentor(e.target.checked)}
            className="h-4 w-4 rounded border-gray-600 accent-red-500"
          />
          <span className="text-sm text-gray-300">
            Eigentor{" "}
            <span className="text-xs text-gray-500">
              (zählt für das gegnerische Team)
            </span>
          </span>
        </label>

        {eigentor && torTeam && (
          <p className="rounded-lg border border-orange-700/60 bg-orange-900/30 px-3 py-2 text-xs text-orange-400">
            Eigentor: Das Tor wird{" "}
            <strong>{torTeam === "Rot" ? "Gelb" : "Rot"}</strong> gutgeschrieben.
          </p>
        )}

        {fehler && (
          <p
            role="alert"
            className="rounded-lg border border-red-700/60 bg-red-900/40 px-3 py-2 text-sm text-red-400"
          >
            {fehler}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || !scorerId || !torTeam}
          className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Speichern..." : "Tor hinzufügen"}
        </button>
      </form>

      {/* Spiel abschließen */}
      <div className="border-t border-gray-700 pt-4">
        <p className="text-xs text-gray-500 mb-3">
          Wenn alle Tore erfasst sind, das Spiel abschließen.
        </p>
        <button
          type="button"
          onClick={handleAbschliessen}
          disabled={isAbschliessen}
          className="w-full rounded-lg bg-green-700 border-2 border-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAbschliessen ? "Abschließen..." : "Spiel abschließen"}
        </button>
      </div>
    </div>
  );
}
