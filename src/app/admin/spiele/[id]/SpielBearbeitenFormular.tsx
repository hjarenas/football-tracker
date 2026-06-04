"use client";

import { useState, useTransition } from "react";
import {
  spielGrunddatenBearbeitenAction,
  teamsBearbeitenAction,
  torHinzufuegenAbgeschlossenAction,
  torLoeschenAbgeschlossenAction,
  torBearbeitenAction,
} from "../actions";
import { deriveScore } from "@/lib/score";

type Team = "Rot" | "Gelb";

interface Spieler {
  id: string;
  name: string;
}

interface Teilnahme {
  id: string;
  spielerId: string;
  spielerName: string;
  team: Team | null;
  punkteOverride: Team | null;
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
  initialDatum: string;
  initialBierbringerId: string | null;
  initialTeilnahmen: Teilnahme[];
  initialTore: Tor[];
  alleSpieler: Spieler[];
}

const TEAM_STYLES: Record<Team, { button: string; active: string }> = {
  Rot: {
    button: "border-red-700/60 text-red-400 hover:bg-red-900/20",
    active: "bg-red-600 text-white border-red-600",
  },
  Gelb: {
    button: "border-yellow-700/60 text-yellow-400 hover:bg-yellow-900/20",
    active: "bg-yellow-400 text-yellow-900 border-yellow-400",
  },
};

const TEAM_BADGE: Record<Team, string> = {
  Rot: "bg-red-600 text-white",
  Gelb: "bg-yellow-400 text-yellow-900",
};

type BearbeitenSchritt = "grunddaten" | "teams" | "tore";

export default function SpielBearbeitenFormular({
  spielId,
  initialDatum,
  initialBierbringerId,
  initialTeilnahmen,
  initialTore,
  alleSpieler,
}: Props) {
  const [aktiverSchritt, setAktiverSchritt] = useState<BearbeitenSchritt | null>(null);

  // ---- Grunddaten state ----
  const [datum, setDatum] = useState(initialDatum);
  const [bierbringerId, setBierbringerId] = useState(initialBierbringerId ?? "");
  const [ausgewaehlteTeilnehmer, setAusgewaehlteTeilnehmer] = useState<Set<string>>(
    new Set(initialTeilnahmen.map((t) => t.spielerId))
  );
  const [grunddatenFehler, setGrunddatenFehler] = useState<string | null>(null);
  const [isPendingGrunddaten, startGrunddaten] = useTransition();

  // ---- Teams state ----
  const [teilnahmen, setTeilnahmen] = useState<Teilnahme[]>(initialTeilnahmen);
  const [teams, setTeams] = useState<Record<string, Team>>(() => {
    const m: Record<string, Team> = {};
    for (const t of initialTeilnahmen) {
      if (t.team) m[t.id] = t.team;
    }
    return m;
  });
  const [overrides, setOverrides] = useState<Record<string, Team | null>>(() => {
    const m: Record<string, Team | null> = {};
    for (const t of initialTeilnahmen) {
      if (t.punkteOverride) m[t.id] = t.punkteOverride;
    }
    return m;
  });
  const [teamsFehler, setTeamsFehler] = useState<string | null>(null);
  const [isPendingTeams, startTeams] = useTransition();

  // ---- Tore state ----
  const [tore, setTore] = useState<Tor[]>(initialTore);
  const [torFehler, setTorFehler] = useState<string | null>(null);
  const [isPendingTor, startTor] = useTransition();

  const [scorerId, setScorerId] = useState("");
  const [assistId, setAssistId] = useState("");
  const [eigentor, setEigentor] = useState(false);
  const [torTeam, setTorTeam] = useState<Team | "">("");

  const [bearbeitenTorId, setBearbeitenTorId] = useState<string | null>(null);
  const [editScorerId, setEditScorerId] = useState("");
  const [editAssistId, setEditAssistId] = useState("");
  const [editEigentor, setEditEigentor] = useState(false);
  const [editTorTeam, setEditTorTeam] = useState<Team | "">("");

  const spielerMitTeam = teilnahmen
    .filter((t) => teams[t.id])
    .map((t) => ({
      id: t.spielerId,
      name: t.spielerName,
      team: teams[t.id],
    }));

  const ergebnis = deriveScore(tore.map((t) => ({ team: t.team, eigentor: t.eigentor })));

  // ---- Grunddaten handlers ----
  function toggleTeilnehmer(id: string) {
    setAusgewaehlteTeilnehmer((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleGrunddatenSpeichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setGrunddatenFehler(null);

    if (!datum) {
      setGrunddatenFehler("Datum ist erforderlich.");
      return;
    }
    if (ausgewaehlteTeilnehmer.size === 0) {
      setGrunddatenFehler("Mindestens ein Teilnehmer muss ausgewählt werden.");
      return;
    }

    const formData = new FormData();
    formData.set("datum", datum);
    if (bierbringerId) formData.set("bierbringerId", bierbringerId);
    for (const id of ausgewaehlteTeilnehmer) {
      formData.append("teilnehmerIds", id);
    }

    startGrunddaten(async () => {
      const result = await spielGrunddatenBearbeitenAction(spielId, formData);
      if (result.fehler) {
        setGrunddatenFehler(result.fehler);
      } else {
        setAktiverSchritt(null);
      }
    });
  }

  // ---- Teams handlers ----
  function handleTeamSetzen(teilnahmeId: string, team: Team) {
    setTeams((prev) => ({ ...prev, [teilnahmeId]: team }));
  }

  function handleOverrideToggle(teilnahmeId: string, team: Team) {
    setOverrides((prev) => ({
      ...prev,
      [teilnahmeId]: prev[teilnahmeId] === team ? null : team,
    }));
  }

  async function handleTeamsSpeichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTeamsFehler(null);

    const alleZugewiesen = teilnahmen.every((t) => teams[t.id]);
    if (!alleZugewiesen) {
      setTeamsFehler("Alle Spieler müssen einem Team zugewiesen werden.");
      return;
    }

    const formData = new FormData();
    for (const t of teilnahmen) {
      if (teams[t.id]) formData.set(`team_${t.id}`, teams[t.id]);
      if (overrides[t.id]) formData.set(`override_${t.id}`, overrides[t.id]!);
    }

    startTeams(async () => {
      const result = await teamsBearbeitenAction(spielId, formData);
      if (result.fehler) {
        setTeamsFehler(result.fehler);
      } else {
        setTeilnahmen((prev) =>
          prev.map((t) => ({
            ...t,
            team: teams[t.id] ?? t.team,
            punkteOverride: overrides[t.id] !== undefined ? overrides[t.id] : t.punkteOverride,
          }))
        );
        setAktiverSchritt(null);
      }
    });
  }

  // ---- Tor handlers ----
  function handleScorerChange(id: string) {
    setScorerId(id);
    setAssistId("");
    const spieler = spielerMitTeam.find((t) => t.id === id);
    if (spieler) setTorTeam(spieler.team);
  }

  async function handleTorHinzufuegen(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTorFehler(null);

    if (!scorerId) {
      setTorFehler("Bitte einen Torschützen auswählen.");
      return;
    }
    if (!torTeam) {
      setTorFehler("Bitte das Team auswählen.");
      return;
    }

    const formData = new FormData();
    formData.set("scorerId", scorerId);
    if (assistId) formData.set("assistId", assistId);
    formData.set("eigentor", String(eigentor));
    formData.set("team", torTeam);

    startTor(async () => {
      const result = await torHinzufuegenAbgeschlossenAction(spielId, formData);
      if (result.fehler) {
        setTorFehler(result.fehler);
        return;
      }
      if (result.torId) {
        const scorer = spielerMitTeam.find((t) => t.id === scorerId)!;
        const assist = assistId ? spielerMitTeam.find((t) => t.id === assistId) ?? null : null;
        setTore((prev) => [
          ...prev,
          {
            id: result.torId!,
            team: torTeam as Team,
            eigentor,
            scorer: { id: scorer.id, name: scorer.name },
            assist: assist ? { id: assist.id, name: assist.name } : null,
          },
        ]);
      }
      setScorerId("");
      setAssistId("");
      setEigentor(false);
      setTorTeam("");
    });
  }

  async function handleTorLoeschen(torId: string) {
    setTorFehler(null);
    startTor(async () => {
      const result = await torLoeschenAbgeschlossenAction(spielId, torId);
      if (result.fehler) {
        setTorFehler(result.fehler);
        return;
      }
      setTore((prev) => prev.filter((t) => t.id !== torId));
    });
  }

  function handleTorBearbeitenOeffnen(tor: Tor) {
    setBearbeitenTorId(tor.id);
    setEditScorerId(tor.scorer.id);
    setEditAssistId(tor.assist?.id ?? "");
    setEditEigentor(tor.eigentor);
    setEditTorTeam(tor.team);
    setTorFehler(null);
  }

  function handleEditScorerChange(id: string) {
    setEditScorerId(id);
    setEditAssistId("");
    const spieler = spielerMitTeam.find((t) => t.id === id);
    if (spieler) setEditTorTeam(spieler.team);
  }

  async function handleTorBearbeitenSpeichern(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTorFehler(null);

    if (!editScorerId || !editTorTeam || !bearbeitenTorId) return;

    const formData = new FormData();
    formData.set("scorerId", editScorerId);
    if (editAssistId) formData.set("assistId", editAssistId);
    formData.set("eigentor", String(editEigentor));
    formData.set("team", editTorTeam);

    startTor(async () => {
      const result = await torBearbeitenAction(spielId, bearbeitenTorId, formData);
      if (result.fehler) {
        setTorFehler(result.fehler);
        return;
      }
      const scorer = spielerMitTeam.find((t) => t.id === editScorerId)!;
      const assist = editAssistId
        ? spielerMitTeam.find((t) => t.id === editAssistId) ?? null
        : null;
      setTore((prev) =>
        prev.map((t) =>
          t.id === bearbeitenTorId
            ? {
                ...t,
                team: editTorTeam as Team,
                eigentor: editEigentor,
                scorer: { id: scorer.id, name: scorer.name },
                assist: assist ? { id: assist.id, name: assist.name } : null,
              }
            : t
        )
      );
      setBearbeitenTorId(null);
    });
  }

  const moeglicheAssists = spielerMitTeam.filter((t) => t.id !== scorerId);
  const editMoeglicheAssists = spielerMitTeam.filter((t) => t.id !== editScorerId);

  return (
    <div className="flex flex-col gap-4">
      {/* Aktuelles Ergebnis */}
      <div className="flex items-center gap-4 mb-2">
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

      {/* Section buttons */}
      <div className="flex flex-col gap-2">
        {/* ---- Grunddaten ---- */}
        <div className="rounded-xl border border-gray-700 bg-gray-900/40 overflow-hidden">
          <button
            type="button"
            onClick={() =>
              setAktiverSchritt((prev) => (prev === "grunddaten" ? null : "grunddaten"))
            }
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-700/30 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-100">Grunddaten bearbeiten</span>
            <span className="text-xs text-gray-500">
              {aktiverSchritt === "grunddaten" ? "▲" : "▼"}
            </span>
          </button>

          {aktiverSchritt === "grunddaten" && (
            <div className="border-t border-gray-700 p-4">
              <form onSubmit={handleGrunddatenSpeichern} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Datum <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={datum}
                    onChange={(e) => setDatum(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Bierbringer
                  </label>
                  <select
                    value={bierbringerId}
                    onChange={(e) => setBierbringerId(e.target.value)}
                    className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-gray-400 focus:outline-none"
                  >
                    <option value="">— Keiner —</option>
                    {alleSpieler.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">
                    Teilnehmer <span className="text-red-400">*</span>{" "}
                    <span className="text-gray-500 font-normal">
                      ({ausgewaehlteTeilnehmer.size} ausgewählt)
                    </span>
                  </label>
                  <div className="border border-gray-600 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-700">
                    {alleSpieler.map((s) => {
                      const checked = ausgewaehlteTeilnehmer.has(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                            checked ? "bg-blue-900/30 hover:bg-blue-900/40" : "hover:bg-gray-700/40"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleTeilnehmer(s.id)}
                            className="h-4 w-4 rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-100">{s.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {grunddatenFehler && (
                  <p role="alert" className="rounded-lg border border-red-700/60 bg-red-900/40 px-3 py-2 text-sm text-red-400">
                    {grunddatenFehler}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAktiverSchritt(null)}
                    className="flex-1 rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={isPendingGrunddaten}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPendingGrunddaten ? "Speichern..." : "Speichern"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* ---- Teams ---- */}
        <div className="rounded-xl border border-gray-700 bg-gray-900/40 overflow-hidden">
          <button
            type="button"
            onClick={() =>
              setAktiverSchritt((prev) => (prev === "teams" ? null : "teams"))
            }
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-700/30 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-100">Teams bearbeiten</span>
            <span className="text-xs text-gray-500">
              {aktiverSchritt === "teams" ? "▲" : "▼"}
            </span>
          </button>

          {aktiverSchritt === "teams" && (
            <div className="border-t border-gray-700 p-4">
              <form onSubmit={handleTeamsSpeichern} className="flex flex-col gap-4">
                {teilnahmen.map((teilnahme) => {
                  const assignedTeam = teams[teilnahme.id] ?? null;
                  const override = overrides[teilnahme.id] ?? null;

                  return (
                    <div
                      key={teilnahme.id}
                      className="rounded-xl border border-gray-700 bg-gray-800/50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <span className="text-sm font-semibold text-gray-100">
                          {teilnahme.spielerName}
                        </span>
                        <div className="flex gap-2">
                          {(["Rot", "Gelb"] as Team[]).map((team) => (
                            <button
                              key={team}
                              type="button"
                              onClick={() => handleTeamSetzen(teilnahme.id, team)}
                              className={`min-w-[60px] rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                                assignedTeam === team
                                  ? TEAM_STYLES[team].active
                                  : `bg-gray-800 ${TEAM_STYLES[team].button}`
                              }`}
                            >
                              {team}
                            </button>
                          ))}
                        </div>
                      </div>

                      {assignedTeam && (
                        <div className="mt-2 border-t border-gray-700 pt-2">
                          <p className="text-xs text-gray-400 mb-1.5">
                            Punkte für:{" "}
                            <span className="italic">
                              {override ? override : `${assignedTeam} (Standard)`}
                            </span>
                          </p>
                          <div className="flex gap-2">
                            {(["Rot", "Gelb"] as Team[]).map((team) => (
                              <button
                                key={team}
                                type="button"
                                onClick={() => handleOverrideToggle(teilnahme.id, team)}
                                className={`min-w-[52px] rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                                  override === team
                                    ? TEAM_STYLES[team].active
                                    : `bg-gray-800 ${TEAM_STYLES[team].button}`
                                }`}
                              >
                                {team}
                              </button>
                            ))}
                            {override && (
                              <button
                                type="button"
                                onClick={() =>
                                  setOverrides((prev) => ({ ...prev, [teilnahme.id]: null }))
                                }
                                className="rounded-md border border-gray-600 px-2.5 py-1 text-xs text-gray-400 hover:bg-gray-700 transition-colors"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {teamsFehler && (
                  <p role="alert" className="rounded-lg border border-red-700/60 bg-red-900/40 px-3 py-2 text-sm text-red-400">
                    {teamsFehler}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAktiverSchritt(null)}
                    className="flex-1 rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={isPendingTeams}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPendingTeams ? "Speichern..." : "Speichern"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* ---- Tore ---- */}
        <div className="rounded-xl border border-gray-700 bg-gray-900/40 overflow-hidden">
          <button
            type="button"
            onClick={() =>
              setAktiverSchritt((prev) => (prev === "tore" ? null : "tore"))
            }
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-700/30 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-100">
              Tore bearbeiten ({tore.length})
            </span>
            <span className="text-xs text-gray-500">
              {aktiverSchritt === "tore" ? "▲" : "▼"}
            </span>
          </button>

          {aktiverSchritt === "tore" && (
            <div className="border-t border-gray-700 p-4 flex flex-col gap-5">
              {torFehler && (
                <p role="alert" className="rounded-lg border border-red-700/60 bg-red-900/40 px-3 py-2 text-sm text-red-400">
                  {torFehler}
                </p>
              )}

              {/* Torliste */}
              {tore.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Vorhandene Tore
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {tore.map((tor, idx) => (
                      <li key={tor.id}>
                        {bearbeitenTorId === tor.id ? (
                          <form
                            onSubmit={handleTorBearbeitenSpeichern}
                            className="rounded-lg border-2 border-blue-800/60 bg-blue-900/30 p-3 flex flex-col gap-3"
                          >
                            <p className="text-xs font-semibold text-blue-300">
                              Tor {idx + 1} bearbeiten
                            </p>

                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">
                                Torschütze *
                              </label>
                              <select
                                value={editScorerId}
                                onChange={(e) => handleEditScorerChange(e.target.value)}
                                className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-gray-400 focus:outline-none"
                              >
                                <option value="">— Spieler auswählen —</option>
                                {(["Rot", "Gelb"] as Team[]).map((team) => (
                                  <optgroup key={team} label={team}>
                                    {spielerMitTeam
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

                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">
                                Vorlagengeber (optional)
                              </label>
                              <select
                                value={editAssistId}
                                onChange={(e) => setEditAssistId(e.target.value)}
                                disabled={!editScorerId}
                                className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-gray-400 focus:outline-none disabled:opacity-50"
                              >
                                <option value="">— kein Vorlagengeber —</option>
                                {editMoeglicheAssists.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name} ({t.team})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">
                                Team *
                              </label>
                              <div className="flex gap-2">
                                {(["Rot", "Gelb"] as Team[]).map((team) => (
                                  <button
                                    key={team}
                                    type="button"
                                    onClick={() => setEditTorTeam(team)}
                                    className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                                      editTorTeam === team
                                        ? TEAM_BADGE[team]
                                        : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"
                                    }`}
                                  >
                                    {team}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <label className="flex items-center gap-3 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={editEigentor}
                                onChange={(e) => setEditEigentor(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-600 accent-red-500"
                              />
                              <span className="text-sm text-gray-300">Eigentor</span>
                            </label>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setBearbeitenTorId(null)}
                                className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
                              >
                                Abbrechen
                              </button>
                              <button
                                type="submit"
                                disabled={isPendingTor || !editScorerId || !editTorTeam}
                                className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isPendingTor ? "..." : "Speichern"}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-2">
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
                            <div className="flex gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleTorBearbeitenOeffnen(tor)}
                                disabled={isPendingTor}
                                className="rounded-md border border-gray-600 px-2 py-1 text-xs text-gray-400 hover:border-blue-700 hover:text-blue-400 transition-colors disabled:opacity-40"
                              >
                                Bearbeiten
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTorLoeschen(tor.id)}
                                disabled={isPendingTor}
                                className="rounded-md border border-gray-600 px-2 py-1 text-xs text-gray-500 hover:border-red-700 hover:text-red-400 transition-colors disabled:opacity-40"
                              >
                                Löschen
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tor hinzufügen */}
              {bearbeitenTorId === null && (
                <form onSubmit={handleTorHinzufuegen} className="flex flex-col gap-4">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Tor hinzufügen
                  </h3>

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
                          {spielerMitTeam
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
                  </div>

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

                  <button
                    type="submit"
                    disabled={isPendingTor || !scorerId || !torTeam}
                    className="w-full rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isPendingTor ? "Speichern..." : "Tor hinzufügen"}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
