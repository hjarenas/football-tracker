/**
 * Statistik-Engine for Dienstagskicken — Issue #09.
 *
 * Pure computation module — no database calls.
 * Accepts raw match/event data and returns ranked lists for all five award categories.
 *
 * Categories:
 *   1. Torjägerliste  — goals per Spieler (Eigentore excluded from scorer's tally)
 *   2. Vorlagenliste  — assists per Spieler
 *   3. Punktetabelle  — win/draw/loss points (3/1/0), pointsOverride respected
 *   4. Anwesenheitsliste — matches attended (abgesagt excluded)
 *   5. Bierliste      — beer bringer count (abgesagt excluded)
 *
 * Rules:
 *   - Cancelled (abgesagt) matches excluded from ALL categories
 *   - Only abgeschlossen matches count for goals, assists, and points
 *   - Ties not broken — tied Spieler share the same rank
 *   - pointsOverride on Spielteilnahme overrides which team's result a player gets points for
 */

import { deriveScore } from "@/lib/score";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Team = "Rot" | "Gelb";
export type SpielStatus = "geplant" | "teams_zugewiesen" | "abgeschlossen" | "abgesagt";

export interface SpielerInput {
  id: string;
  name: string;
}

export interface SpielInput {
  id: string;
  status: SpielStatus;
  saisonJahr: number;
  bierbringerId?: string;
}

export interface TeilnahmeInput {
  id: string;
  spielerId: string;
  spielId: string;
  team: Team | null;
  punkteOverride: Team | null;
}

export interface TorInput {
  id: string;
  team: Team;
  eigentor: boolean;
  spielId: string;
  scorerId: string;
  assistId?: string;
}

export type StatistikScope = number | "all-time";

export interface StatistikEingabe {
  spieler: SpielerInput[];
  spiele: SpielInput[];
  teilnahmen: TeilnahmeInput[];
  tore: TorInput[];
  scope: StatistikScope;
}

/** A single ranked entry in a leaderboard list. */
export interface SpielerEintrag {
  spielerId: string;
  spielerName: string;
  wert: number;
  rang: number;
}

export interface StatistikErgebnis {
  torjaeger: SpielerEintrag[];
  vorlagen: SpielerEintrag[];
  punkte: SpielerEintrag[];
  anwesenheit: SpielerEintrag[];
  bier: SpielerEintrag[];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Returns the set of Spiel IDs that are in scope (filtered by Saison or all-time)
 * and not cancelled (abgesagt).
 */
function getNichtAbgesagteSpielIds(
  spiele: SpielInput[],
  scope: StatistikScope
): Set<string> {
  return new Set(
    spiele
      .filter((s) => s.status !== "abgesagt")
      .filter((s) => scope === "all-time" || s.saisonJahr === scope)
      .map((s) => s.id)
  );
}

/**
 * Returns the set of Spiel IDs that are abgeschlossen and in scope.
 * Used for goals, assists, and points (only completed matches count).
 */
function getAbgeschlosseneSpielIds(
  spiele: SpielInput[],
  scope: StatistikScope
): Set<string> {
  return new Set(
    spiele
      .filter((s) => s.status === "abgeschlossen")
      .filter((s) => scope === "all-time" || s.saisonJahr === scope)
      .map((s) => s.id)
  );
}

/**
 * Assigns dense competition ranks to sorted entries.
 * Tied entries (same `wert`) share the same rank.
 * Next distinct value gets rank = (number of entries with higher or equal rank).
 *
 * Example: values [5, 3, 3, 1] → ranks [1, 2, 2, 4]
 */
function assignRanks(entries: { spielerId: string; spielerName: string; wert: number }[]): SpielerEintrag[] {
  // Sort descending by wert
  const sorted = [...entries].sort((a, b) => b.wert - a.wert);

  const result: SpielerEintrag[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].wert < sorted[i - 1].wert) {
      // New value is lower — rank advances to current position (1-indexed)
      currentRank = i + 1;
    }
    result.push({ ...sorted[i], rang: currentRank });
  }

  return result;
}

/**
 * Builds a map of spielerId → SpielerInput for quick lookups.
 */
function buildSpielerMap(spieler: SpielerInput[]): Map<string, SpielerInput> {
  return new Map(spieler.map((s) => [s.id, s]));
}

/**
 * Creates a zero-initialized count map from a set of spieler IDs.
 */
function initCounts(spielerIds: Set<string>): Map<string, number> {
  const map = new Map<string, number>();
  for (const id of spielerIds) {
    map.set(id, 0);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Category implementations
// ---------------------------------------------------------------------------

/**
 * Torjägerliste — goals per Spieler.
 * Eigentore are excluded from the scorer's personal tally.
 * Only abgeschlossen matches count.
 */
export function berechneTorjaegerliste(eingabe: StatistikEingabe): SpielerEintrag[] {
  const { spieler, spiele, tore, scope } = eingabe;
  const abgeschlosseneIds = getAbgeschlosseneSpielIds(spiele, scope);

  const spielerMap = buildSpielerMap(spieler);
  const counts = new Map<string, number>();

  for (const tor of tore) {
    if (!abgeschlosseneIds.has(tor.spielId)) continue;
    if (tor.eigentor) continue; // Eigentore excluded from scorer's tally

    counts.set(tor.scorerId, (counts.get(tor.scorerId) ?? 0) + 1);
  }

  if (counts.size === 0) return [];

  const entries = Array.from(counts.entries())
    .map(([spielerId, wert]) => ({
      spielerId,
      spielerName: spielerMap.get(spielerId)?.name ?? spielerId,
      wert,
    }))
    .filter((e) => e.wert > 0);

  if (entries.length === 0) return [];

  return assignRanks(entries);
}

/**
 * Vorlagenliste — assists per Spieler.
 * Only abgeschlossen matches count.
 */
export function berechneVorlagenliste(eingabe: StatistikEingabe): SpielerEintrag[] {
  const { spieler, spiele, tore, scope } = eingabe;
  const abgeschlosseneIds = getAbgeschlosseneSpielIds(spiele, scope);

  const spielerMap = buildSpielerMap(spieler);
  const counts = new Map<string, number>();

  for (const tor of tore) {
    if (!abgeschlosseneIds.has(tor.spielId)) continue;
    if (!tor.assistId) continue;

    counts.set(tor.assistId, (counts.get(tor.assistId) ?? 0) + 1);
  }

  if (counts.size === 0) return [];

  const entries = Array.from(counts.entries())
    .map(([spielerId, wert]) => ({
      spielerId,
      spielerName: spielerMap.get(spielerId)?.name ?? spielerId,
      wert,
    }))
    .filter((e) => e.wert > 0);

  if (entries.length === 0) return [];

  return assignRanks(entries);
}

/**
 * Punktetabelle — win/draw/loss points per Spieler (3/1/0).
 * Uses pointsOverride if set, otherwise uses the player's team.
 * Score derived from Tor records (ADR-0002).
 * Only abgeschlossen matches count.
 */
export function berechnePunktetabelle(eingabe: StatistikEingabe): SpielerEintrag[] {
  const { spieler, spiele, teilnahmen, tore, scope } = eingabe;
  const abgeschlosseneIds = getAbgeschlosseneSpielIds(spiele, scope);

  const spielerMap = buildSpielerMap(spieler);
  const counts = new Map<string, number>();

  // Group tore by spielId for score derivation
  const torsBySpiel = new Map<string, Array<{ team: Team; eigentor: boolean }>>();
  for (const tor of tore) {
    if (!torsBySpiel.has(tor.spielId)) {
      torsBySpiel.set(tor.spielId, []);
    }
    torsBySpiel.get(tor.spielId)!.push({ team: tor.team, eigentor: tor.eigentor });
  }

  // Compute points for each Spielteilnahme in completed matches
  for (const tn of teilnahmen) {
    if (!abgeschlosseneIds.has(tn.spielId)) continue;

    const effectiveTeam = tn.punkteOverride ?? tn.team;
    if (!effectiveTeam) continue; // No team assigned — skip

    const spielTore = torsBySpiel.get(tn.spielId) ?? [];
    const ergebnis = deriveScore(spielTore);

    let punkte: number;
    if (ergebnis.rot === ergebnis.gelb) {
      // Draw
      punkte = 1;
    } else if (
      (effectiveTeam === "Rot" && ergebnis.rot > ergebnis.gelb) ||
      (effectiveTeam === "Gelb" && ergebnis.gelb > ergebnis.rot)
    ) {
      // Win
      punkte = 3;
    } else {
      // Loss
      punkte = 0;
    }

    counts.set(tn.spielerId, (counts.get(tn.spielerId) ?? 0) + punkte);
  }

  if (counts.size === 0) return [];

  const entries = Array.from(counts.entries())
    .map(([spielerId, wert]) => ({
      spielerId,
      spielerName: spielerMap.get(spielerId)?.name ?? spielerId,
      wert,
    }));

  return assignRanks(entries);
}

/**
 * Anwesenheitsliste — matches attended per Spieler.
 * Cancelled (abgesagt) matches excluded. All other statuses count.
 */
export function berechneAnwesenheitsliste(eingabe: StatistikEingabe): SpielerEintrag[] {
  const { spieler, spiele, teilnahmen, scope } = eingabe;
  const nichtAbgesagteIds = getNichtAbgesagteSpielIds(spiele, scope);

  const spielerMap = buildSpielerMap(spieler);
  const counts = new Map<string, number>();

  for (const tn of teilnahmen) {
    if (!nichtAbgesagteIds.has(tn.spielId)) continue;
    counts.set(tn.spielerId, (counts.get(tn.spielerId) ?? 0) + 1);
  }

  if (counts.size === 0) return [];

  const entries = Array.from(counts.entries())
    .map(([spielerId, wert]) => ({
      spielerId,
      spielerName: spielerMap.get(spielerId)?.name ?? spielerId,
      wert,
    }))
    .filter((e) => e.wert > 0);

  if (entries.length === 0) return [];

  return assignRanks(entries);
}

/**
 * Bierliste — matches where Spieler was the beer bringer.
 * Cancelled (abgesagt) matches excluded.
 */
export function berechneBierliste(eingabe: StatistikEingabe): SpielerEintrag[] {
  const { spieler, spiele, scope } = eingabe;
  const nichtAbgesagteIds = getNichtAbgesagteSpielIds(spiele, scope);

  const spielerMap = buildSpielerMap(spieler);
  const counts = new Map<string, number>();

  for (const spiel of spiele) {
    if (!nichtAbgesagteIds.has(spiel.id)) continue;
    if (!spiel.bierbringerId) continue;

    counts.set(spiel.bierbringerId, (counts.get(spiel.bierbringerId) ?? 0) + 1);
  }

  if (counts.size === 0) return [];

  const entries = Array.from(counts.entries())
    .map(([spielerId, wert]) => ({
      spielerId,
      spielerName: spielerMap.get(spielerId)?.name ?? spielerId,
      wert,
    }))
    .filter((e) => e.wert > 0);

  if (entries.length === 0) return [];

  return assignRanks(entries);
}

/**
 * Combined entry point — computes all five leaderboard categories.
 */
export function berechneStatistiken(eingabe: StatistikEingabe): StatistikErgebnis {
  return {
    torjaeger: berechneTorjaegerliste(eingabe),
    vorlagen: berechneVorlagenliste(eingabe),
    punkte: berechnePunktetabelle(eingabe),
    anwesenheit: berechneAnwesenheitsliste(eingabe),
    bier: berechneBierliste(eingabe),
  };
}
