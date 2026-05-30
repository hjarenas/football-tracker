"use client";

import { useState, useTransition } from "react";
import { teamsZuweisenAction } from "../actions";

type Team = "Rot" | "Gelb";

interface Teilnahme {
  id: string;
  spielerName: string;
  team: Team | null;
  punkteOverride: Team | null;
}

interface Props {
  spielId: string;
  teilnahmen: Teilnahme[];
}

const TEAM_STYLES: Record<Team, { button: string; active: string }> = {
  Rot: {
    button: "border-red-300 text-red-700 hover:bg-red-50",
    active: "bg-red-600 text-white border-red-600",
  },
  Gelb: {
    button: "border-yellow-400 text-yellow-700 hover:bg-yellow-50",
    active: "bg-yellow-400 text-yellow-900 border-yellow-400",
  },
};

export default function TeamsZuweisenFormular({ spielId, teilnahmen }: Props) {
  // team assignments: teilnahmeId → Team
  const [teams, setTeams] = useState<Record<string, Team>>(() => {
    const initial: Record<string, Team> = {};
    for (const t of teilnahmen) {
      if (t.team) initial[t.id] = t.team;
    }
    return initial;
  });

  // punkteOverride: teilnahmeId → Team | null
  const [overrides, setOverrides] = useState<Record<string, Team | null>>(() => {
    const initial: Record<string, Team | null> = {};
    for (const t of teilnahmen) {
      if (t.punkteOverride) initial[t.id] = t.punkteOverride;
    }
    return initial;
  });

  const [fehler, setFehler] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const alleZugewiesen = teilnahmen.every((t) => teams[t.id]);
  const rotAnzahl = Object.values(teams).filter((t) => t === "Rot").length;
  const gelbAnzahl = Object.values(teams).filter((t) => t === "Gelb").length;

  function setTeam(teilnahmeId: string, team: Team) {
    setTeams((prev) => ({ ...prev, [teilnahmeId]: team }));
  }

  function toggleOverride(teilnahmeId: string, team: Team) {
    setOverrides((prev) => {
      const current = prev[teilnahmeId];
      return { ...prev, [teilnahmeId]: current === team ? null : team };
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFehler(null);

    if (!alleZugewiesen) {
      setFehler("Alle Spieler müssen einem Team zugewiesen werden.");
      return;
    }

    const formData = new FormData();
    for (const t of teilnahmen) {
      if (teams[t.id]) {
        formData.set(`team_${t.id}`, teams[t.id]);
      }
      if (overrides[t.id]) {
        formData.set(`override_${t.id}`, overrides[t.id]!);
      }
    }

    startTransition(async () => {
      const result = await teamsZuweisenAction(spielId, formData);
      if (result?.fehler) {
        setFehler(result.fehler);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Team-Übersicht */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center">
          <span className="block text-2xl font-bold text-red-600">{rotAnzahl}</span>
          <span className="text-xs font-medium text-red-700">Rot</span>
        </div>
        <div className="flex-1 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-center">
          <span className="block text-2xl font-bold text-yellow-600">{gelbAnzahl}</span>
          <span className="text-xs font-medium text-yellow-700">Gelb</span>
        </div>
      </div>

      {/* Spieler-Liste */}
      <div className="flex flex-col gap-3">
        {teilnahmen.map((teilnahme) => {
          const assignedTeam = teams[teilnahme.id] ?? null;
          const override = overrides[teilnahme.id] ?? null;

          return (
            <div
              key={teilnahme.id}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm font-semibold text-gray-800">
                  {teilnahme.spielerName}
                </span>

                {/* Rot / Gelb Buttons */}
                <div className="flex gap-2">
                  {(["Rot", "Gelb"] as Team[]).map((team) => (
                    <button
                      key={team}
                      type="button"
                      onClick={() => setTeam(teilnahme.id, team)}
                      className={`min-w-[60px] rounded-lg border px-4 py-1.5 text-sm font-semibold transition-colors ${
                        assignedTeam === team
                          ? TEAM_STYLES[team].active
                          : `bg-white ${TEAM_STYLES[team].button}`
                      }`}
                    >
                      {team}
                    </button>
                  ))}
                </div>
              </div>

              {/* Punkte-Override — nur anzeigen wenn Team zugewiesen */}
              {assignedTeam && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500 mb-2">
                    Punkte für:{" "}
                    <span className="italic">
                      {override
                        ? override
                        : `${assignedTeam} (Standard)`}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    {(["Rot", "Gelb"] as Team[]).map((team) => (
                      <button
                        key={team}
                        type="button"
                        onClick={() => toggleOverride(teilnahme.id, team)}
                        className={`min-w-[60px] rounded-md border px-3 py-1 text-xs font-medium transition-colors ${
                          override === team
                            ? TEAM_STYLES[team].active
                            : `bg-white ${TEAM_STYLES[team].button}`
                        }`}
                      >
                        {team}
                      </button>
                    ))}
                    {override && (
                      <button
                        type="button"
                        onClick={() =>
                          setOverrides((prev) => ({
                            ...prev,
                            [teilnahme.id]: null,
                          }))
                        }
                        className="rounded-md border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50"
                      >
                        Zurücksetzen
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {fehler && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600"
        >
          {fehler}
        </p>
      )}

      {!alleZugewiesen && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {teilnahmen.length - Object.keys(teams).length} Spieler noch nicht zugewiesen.
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !alleZugewiesen}
        className="w-full rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Speichern..." : "Teams speichern"}
      </button>
    </form>
  );
}
