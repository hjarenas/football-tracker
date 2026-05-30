/**
 * Unit tests for the Ewige Tabelle (all-time leaderboard) — Issue #11.
 *
 * Verifies that the Statistik-Engine correctly aggregates stats across
 * multiple Saisons when scope is "all-time", and that cancelled matches
 * are excluded regardless of Saison.
 */
import { describe, it, expect } from "vitest";
import {
  berechneStatistiken,
  type StatistikEingabe,
} from "@/lib/statistik-engine";

// ---------------------------------------------------------------------------
// Fixture types (mirrors statistik-engine.ts public API)
// ---------------------------------------------------------------------------

type Team = "Rot" | "Gelb";
type SpielStatus = "geplant" | "teams_zugewiesen" | "abgeschlossen" | "abgesagt";

interface SpielFixture {
  id: string;
  status: SpielStatus;
  saisonJahr: number;
  bierbringerId?: string;
}

interface TeilnahmeFixture {
  id: string;
  spielerId: string;
  spielId: string;
  team: Team | null;
  punkteOverride: Team | null;
}

interface TorFixture {
  id: string;
  team: Team;
  eigentor: boolean;
  spielId: string;
  scorerId: string;
  assistId?: string;
}

function makeEingabe(
  spielerIds: string[],
  spiele: SpielFixture[],
  teilnahmen: TeilnahmeFixture[],
  tore: TorFixture[],
  scope: number | "all-time"
): StatistikEingabe {
  return {
    spieler: spielerIds.map((id) => ({ id, name: id.toUpperCase() })),
    spiele,
    teilnahmen,
    tore,
    scope,
  };
}

// ---------------------------------------------------------------------------
// Multi-Saison fixtures
// ---------------------------------------------------------------------------

// Two seasons of data
const SPIEL_2025_ABGESCHLOSSEN: SpielFixture = {
  id: "sp-2025-1",
  status: "abgeschlossen",
  saisonJahr: 2025,
  bierbringerId: "s1",
};
const SPIEL_2025_ABGESAGT: SpielFixture = {
  id: "sp-2025-2",
  status: "abgesagt",
  saisonJahr: 2025,
  bierbringerId: "s2", // cancelled — should not count
};
const SPIEL_2026_ABGESCHLOSSEN: SpielFixture = {
  id: "sp-2026-1",
  status: "abgeschlossen",
  saisonJahr: 2026,
  bierbringerId: "s2",
};
const SPIEL_2024_ABGESCHLOSSEN: SpielFixture = {
  id: "sp-2024-1",
  status: "abgeschlossen",
  saisonJahr: 2024,
  bierbringerId: "s1",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Ewige Tabelle — all-time scope aggregates correctly", () => {
  it("aggregiert Tore über drei Saisons", () => {
    const spiel2024: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: 2024 };
    const spiel2025: SpielFixture = { id: "sp2", status: "abgeschlossen", saisonJahr: 2025 };
    const spiel2026: SpielFixture = { id: "sp3", status: "abgeschlossen", saisonJahr: 2026 };
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
      { id: "t2", team: "Rot", eigentor: false, spielId: "sp2", scorerId: "s1" },
      { id: "t3", team: "Rot", eigentor: false, spielId: "sp3", scorerId: "s1" },
      { id: "t4", team: "Gelb", eigentor: false, spielId: "sp3", scorerId: "s2" },
    ];
    const eingabe = makeEingabe(
      ["s1", "s2"],
      [spiel2024, spiel2025, spiel2026],
      [],
      tore,
      "all-time"
    );
    const result = berechneStatistiken(eingabe);
    const s1 = result.torjaeger.find((e) => e.spielerId === "s1");
    const s2 = result.torjaeger.find((e) => e.spielerId === "s2");
    expect(s1?.wert).toBe(3);
    expect(s1?.rang).toBe(1);
    expect(s2?.wert).toBe(1);
    expect(s2?.rang).toBe(2);
  });

  it("schließt abgesagte Spiele aus ALLEN Saisons aus", () => {
    const tore: TorFixture[] = [
      // Goal in a real match
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp-2025-1", scorerId: "s1" },
      // Goal in a cancelled match — should be excluded
      { id: "t2", team: "Rot", eigentor: false, spielId: "sp-2025-2", scorerId: "s2" },
    ];
    const eingabe = makeEingabe(
      ["s1", "s2"],
      [SPIEL_2025_ABGESCHLOSSEN, SPIEL_2025_ABGESAGT],
      [],
      tore,
      "all-time"
    );
    const result = berechneStatistiken(eingabe);
    const s2Tore = result.torjaeger.find((e) => e.spielerId === "s2");
    // s2's goal was in a cancelled match — should not appear
    expect(s2Tore?.wert ?? 0).toBe(0);
  });

  it("Gleichstand bei all-time — gleicher Rang", () => {
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp-2025-1", scorerId: "s1" },
      { id: "t2", team: "Gelb", eigentor: false, spielId: "sp-2026-1", scorerId: "s2" },
    ];
    const eingabe = makeEingabe(
      ["s1", "s2"],
      [SPIEL_2025_ABGESCHLOSSEN, SPIEL_2026_ABGESCHLOSSEN],
      [],
      tore,
      "all-time"
    );
    const result = berechneStatistiken(eingabe);
    const s1 = result.torjaeger.find((e) => e.spielerId === "s1");
    const s2 = result.torjaeger.find((e) => e.spielerId === "s2");
    expect(s1?.rang).toBe(1);
    expect(s2?.rang).toBe(1);
  });

  it("Anwesenheit: zählt alle Spiele über mehrere Saisons", () => {
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp-2025-1", team: "Rot", punkteOverride: null },
      { id: "tn2", spielerId: "s1", spielId: "sp-2026-1", team: "Rot", punkteOverride: null },
      { id: "tn3", spielerId: "s1", spielId: "sp-2024-1", team: "Rot", punkteOverride: null },
      // s2 only attended one match
      { id: "tn4", spielerId: "s2", spielId: "sp-2026-1", team: "Gelb", punkteOverride: null },
      // This is in a cancelled match — not counted for attendance
      { id: "tn5", spielerId: "s1", spielId: "sp-2025-2", team: "Rot", punkteOverride: null },
    ];
    const eingabe = makeEingabe(
      ["s1", "s2"],
      [SPIEL_2025_ABGESCHLOSSEN, SPIEL_2025_ABGESAGT, SPIEL_2026_ABGESCHLOSSEN, SPIEL_2024_ABGESCHLOSSEN],
      teilnahmen,
      [],
      "all-time"
    );
    const result = berechneStatistiken(eingabe);
    const s1 = result.anwesenheit.find((e) => e.spielerId === "s1");
    const s2 = result.anwesenheit.find((e) => e.spielerId === "s2");
    // s1 attended 3 non-cancelled matches (2025, 2026, 2024); cancelled excluded
    expect(s1?.wert).toBe(3);
    expect(s1?.rang).toBe(1);
    expect(s2?.wert).toBe(1);
    expect(s2?.rang).toBe(2);
  });

  it("Bierliste: zählt über alle Saisons, schließt abgesagte aus", () => {
    const eingabe = makeEingabe(
      ["s1", "s2"],
      [SPIEL_2025_ABGESCHLOSSEN, SPIEL_2025_ABGESAGT, SPIEL_2026_ABGESCHLOSSEN, SPIEL_2024_ABGESCHLOSSEN],
      [],
      [],
      "all-time"
    );
    // Fixtures: s1 is bierbringer in 2025 and 2024, s2 is bierbringer in 2026
    // s2 is also in cancelled match (2025-2) but that's excluded
    const result = berechneStatistiken(eingabe);
    const s1 = result.bier.find((e) => e.spielerId === "s1");
    const s2 = result.bier.find((e) => e.spielerId === "s2");
    // s1: 2025 abgeschlossen + 2024 abgeschlossen = 2
    expect(s1?.wert).toBe(2);
    expect(s1?.rang).toBe(1);
    // s2: 2026 abgeschlossen = 1 (cancelled match excluded)
    expect(s2?.wert).toBe(1);
    expect(s2?.rang).toBe(2);
  });

  it("Punkte: aggregiert über Saisons korrekt", () => {
    // Rot wins 1:0 in each match
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp-2025-1", team: "Rot", punkteOverride: null },
      { id: "tn2", spielerId: "s2", spielId: "sp-2025-1", team: "Gelb", punkteOverride: null },
      { id: "tn3", spielerId: "s1", spielId: "sp-2026-1", team: "Rot", punkteOverride: null },
      { id: "tn4", spielerId: "s2", spielId: "sp-2026-1", team: "Gelb", punkteOverride: null },
    ];
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp-2025-1", scorerId: "s1" },
      { id: "t2", team: "Rot", eigentor: false, spielId: "sp-2026-1", scorerId: "s1" },
    ];
    const eingabe = makeEingabe(
      ["s1", "s2"],
      [SPIEL_2025_ABGESCHLOSSEN, SPIEL_2026_ABGESCHLOSSEN],
      teilnahmen,
      tore,
      "all-time"
    );
    const result = berechneStatistiken(eingabe);
    const s1 = result.punkte.find((e) => e.spielerId === "s1");
    const s2 = result.punkte.find((e) => e.spielerId === "s2");
    // s1 wins both matches → 6 pts
    expect(s1?.wert).toBe(6);
    expect(s1?.rang).toBe(1);
    // s2 loses both → 0 pts
    expect(s2?.wert).toBe(0);
  });

  it("alle fünf Kategorien werden zurückgegeben", () => {
    const eingabe = makeEingabe(["s1"], [], [], [], "all-time");
    const result = berechneStatistiken(eingabe);
    expect(result).toHaveProperty("torjaeger");
    expect(result).toHaveProperty("vorlagen");
    expect(result).toHaveProperty("punkte");
    expect(result).toHaveProperty("anwesenheit");
    expect(result).toHaveProperty("bier");
  });

  it("leere Datenbank gibt leere Listen zurück", () => {
    const eingabe = makeEingabe([], [], [], [], "all-time");
    const result = berechneStatistiken(eingabe);
    expect(result.torjaeger).toEqual([]);
    expect(result.vorlagen).toEqual([]);
    expect(result.punkte).toEqual([]);
    expect(result.anwesenheit).toEqual([]);
    expect(result.bier).toEqual([]);
  });
});
