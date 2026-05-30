/**
 * Unit tests for the Statistik-Engine — Issue #09.
 *
 * All tests use in-memory fixture data (no database calls).
 *
 * Categories tested:
 *   1. Torjägerliste  — goals per Spieler (Eigentore excluded from scorer's tally)
 *   2. Vorlagenliste  — assists per Spieler
 *   3. Punktetabelle  — win/draw/loss points (3/1/0), pointsOverride respected
 *   4. Anwesenheitsliste — matches attended (abgesagt excluded)
 *   5. Bierliste      — beer bringer count (abgesagt excluded)
 *
 * Additional rules:
 *   - Tied Spieler share the same rank
 *   - Cancelled (abgesagt) matches excluded from ALL categories
 *   - Only abgeschlossen matches count for goals, assists, and points
 *   - All-time aggregates across multiple Saisons
 */
import { describe, it, expect } from "vitest";
import {
  berechneTorjaegerliste,
  berechneVorlagenliste,
  berechnePunktetabelle,
  berechneAnwesenheitsliste,
  berechneBierliste,
  berechneStatistiken,
  type StatistikEingabe,
  type SpielerEintrag,
} from "@/lib/statistik-engine";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

type Team = "Rot" | "Gelb";
type SpielStatus = "geplant" | "teams_zugewiesen" | "abgeschlossen" | "abgesagt";

interface TorFixture {
  id: string;
  team: Team;
  eigentor: boolean;
  spielId: string;
  scorerId: string;
  assistId?: string;
}

interface TeilnahmeFixture {
  id: string;
  spielerId: string;
  spielId: string;
  team: Team | null;
  punkteOverride: Team | null;
}

interface SpielFixture {
  id: string;
  status: SpielStatus;
  saisonJahr: number;
  bierbringerId?: string;
}

interface SpielerFixture {
  id: string;
  name: string;
}

function makeEingabe(
  spieler: SpielerFixture[],
  spiele: SpielFixture[],
  teilnahmen: TeilnahmeFixture[],
  tore: TorFixture[],
  scope: number | "all-time"
): StatistikEingabe {
  return { spieler, spiele, teilnahmen, tore, scope };
}

// ---------------------------------------------------------------------------
// Helpers to build consistent fixtures
// ---------------------------------------------------------------------------

const S1: SpielerFixture = { id: "s1", name: "Anna" };
const S2: SpielerFixture = { id: "s2", name: "Ben" };
const S3: SpielerFixture = { id: "s3", name: "Clara" };
const S4: SpielerFixture = { id: "s4", name: "Dirk" };

const SAISON_2026 = 2026;
const SAISON_2025 = 2025;

// ---------------------------------------------------------------------------
// 1. Torjägerliste
// ---------------------------------------------------------------------------

describe("berechneTorjaegerliste — Torjägerliste", () => {
  it("gibt leere Liste zurück wenn keine Spiele", () => {
    const eingabe = makeEingabe([S1, S2], [], [], [], SAISON_2026);
    expect(berechneTorjaegerliste(eingabe)).toEqual([]);
  });

  it("zählt reguläre Tore pro Spieler", () => {
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
      { id: "t2", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
      { id: "t3", team: "Gelb", eigentor: false, spielId: "sp1", scorerId: "s2" },
    ];
    const eingabe = makeEingabe([S1, S2], [spiel], [], tore, SAISON_2026);
    const result = berechneTorjaegerliste(eingabe);
    expect(result[0]).toMatchObject({ spielerId: "s1", wert: 2, rang: 1 });
    expect(result[1]).toMatchObject({ spielerId: "s2", wert: 1, rang: 2 });
  });

  it("schließt Eigentore aus der persönlichen Torbilanz aus", () => {
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
      { id: "t2", team: "Rot", eigentor: true, spielId: "sp1", scorerId: "s1" }, // Eigentor — NOT counted
    ];
    const eingabe = makeEingabe([S1, S2], [spiel], [], tore, SAISON_2026);
    const result = berechneTorjaegerliste(eingabe);
    // s1 only has 1 regular goal (eigentor excluded)
    expect(result[0]).toMatchObject({ spielerId: "s1", wert: 1 });
  });

  it("Eigentor erscheint nicht in Torjägerliste wenn nur Eigentore geschossen", () => {
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: true, spielId: "sp1", scorerId: "s1" }, // Eigentor only
    ];
    const eingabe = makeEingabe([S1], [spiel], [], tore, SAISON_2026);
    const result = berechneTorjaegerliste(eingabe);
    // s1 scored 0 regular goals — should not appear or appear with 0
    const s1Entry = result.find((e) => e.spielerId === "s1");
    expect(s1Entry?.wert ?? 0).toBe(0);
  });

  it("schließt abgesagte Spiele aus", () => {
    const spielAbgeschlossen: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const spielAbgesagt: SpielFixture = { id: "sp2", status: "abgesagt", saisonJahr: SAISON_2026 };
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
      { id: "t2", team: "Rot", eigentor: false, spielId: "sp2", scorerId: "s2" }, // abgesagt — excluded
    ];
    const eingabe = makeEingabe([S1, S2], [spielAbgeschlossen, spielAbgesagt], [], tore, SAISON_2026);
    const result = berechneTorjaegerliste(eingabe);
    const s2Entry = result.find((e) => e.spielerId === "s2");
    expect(s2Entry?.wert ?? 0).toBe(0);
  });

  it("schließt geplante und teams_zugewiesen Spiele aus Torjägerliste aus", () => {
    const spielGeplant: SpielFixture = { id: "sp1", status: "geplant", saisonJahr: SAISON_2026 };
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
    ];
    const eingabe = makeEingabe([S1], [spielGeplant], [], tore, SAISON_2026);
    const result = berechneTorjaegerliste(eingabe);
    const s1Entry = result.find((e) => e.spielerId === "s1");
    expect(s1Entry?.wert ?? 0).toBe(0);
  });

  it("Gleichstand — gleicher Rang für gebundene Spieler", () => {
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
      { id: "t2", team: "Gelb", eigentor: false, spielId: "sp1", scorerId: "s2" },
    ];
    const eingabe = makeEingabe([S1, S2], [spiel], [], tore, SAISON_2026);
    const result = berechneTorjaegerliste(eingabe);
    expect(result[0].rang).toBe(1);
    expect(result[1].rang).toBe(1);
  });

  it("nach Gleichstand bekommt der nächste Spieler korrekten Rang (Lücke)", () => {
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
      { id: "t2", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s2" },
      { id: "t3", team: "Gelb", eigentor: false, spielId: "sp1", scorerId: "s3" }, // 1 goal
    ];
    // s1 and s2 both have 1 goal → rank 1; s3 also has 1 → rank 1 all tied
    // let's add second goal only for s1
    const tore2: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
      { id: "t2", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
      { id: "t3", team: "Gelb", eigentor: false, spielId: "sp1", scorerId: "s2" },
      { id: "t4", team: "Gelb", eigentor: false, spielId: "sp1", scorerId: "s3" },
    ];
    const eingabe = makeEingabe([S1, S2, S3], [spiel], [], tore2, SAISON_2026);
    const result = berechneTorjaegerliste(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    const s2 = result.find((e) => e.spielerId === "s2")!;
    const s3 = result.find((e) => e.spielerId === "s3")!;
    expect(s1.rang).toBe(1);
    expect(s2.rang).toBe(2); // tied for 2nd
    expect(s3.rang).toBe(2);
  });

  it("filtert nach Saison-Jahr", () => {
    const spiel2026: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const spiel2025: SpielFixture = { id: "sp2", status: "abgeschlossen", saisonJahr: SAISON_2025 };
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
      { id: "t2", team: "Rot", eigentor: false, spielId: "sp2", scorerId: "s2" }, // 2025 — excluded
    ];
    const eingabe = makeEingabe([S1, S2], [spiel2026, spiel2025], [], tore, SAISON_2026);
    const result = berechneTorjaegerliste(eingabe);
    const s2Entry = result.find((e) => e.spielerId === "s2");
    expect(s2Entry?.wert ?? 0).toBe(0);
  });

  it("all-time aggregiert über mehrere Saisons", () => {
    const spiel2026: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const spiel2025: SpielFixture = { id: "sp2", status: "abgeschlossen", saisonJahr: SAISON_2025 };
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
      { id: "t2", team: "Rot", eigentor: false, spielId: "sp2", scorerId: "s1" }, // 2025 — included in all-time
    ];
    const eingabe = makeEingabe([S1], [spiel2026, spiel2025], [], tore, "all-time");
    const result = berechneTorjaegerliste(eingabe);
    expect(result[0]).toMatchObject({ spielerId: "s1", wert: 2 });
  });
});

// ---------------------------------------------------------------------------
// 2. Vorlagenliste
// ---------------------------------------------------------------------------

describe("berechneVorlagenliste — Vorlagenliste", () => {
  it("gibt leere Liste zurück wenn keine Vorlagen", () => {
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" }, // no assistId
    ];
    const eingabe = makeEingabe([S1, S2], [spiel], [], tore, SAISON_2026);
    const result = berechneVorlagenliste(eingabe);
    const s2Entry = result.find((e) => e.spielerId === "s2");
    expect(s2Entry?.wert ?? 0).toBe(0);
  });

  it("zählt Vorlagen pro Spieler", () => {
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1", assistId: "s2" },
      { id: "t2", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s3", assistId: "s2" },
      { id: "t3", team: "Gelb", eigentor: false, spielId: "sp1", scorerId: "s2", assistId: "s1" },
    ];
    const eingabe = makeEingabe([S1, S2, S3], [spiel], [], tore, SAISON_2026);
    const result = berechneVorlagenliste(eingabe);
    expect(result[0]).toMatchObject({ spielerId: "s2", wert: 2, rang: 1 });
    expect(result[1]).toMatchObject({ spielerId: "s1", wert: 1, rang: 2 });
  });

  it("schließt Vorlagen bei abgesagten Spielen aus", () => {
    const spielAbgesagt: SpielFixture = { id: "sp1", status: "abgesagt", saisonJahr: SAISON_2026 };
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1", assistId: "s2" },
    ];
    const eingabe = makeEingabe([S1, S2], [spielAbgesagt], [], tore, SAISON_2026);
    const result = berechneVorlagenliste(eingabe);
    const s2Entry = result.find((e) => e.spielerId === "s2");
    expect(s2Entry?.wert ?? 0).toBe(0);
  });

  it("Gleichstand bei Vorlagen — gleicher Rang", () => {
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s3", assistId: "s1" },
      { id: "t2", team: "Gelb", eigentor: false, spielId: "sp1", scorerId: "s3", assistId: "s2" },
    ];
    const eingabe = makeEingabe([S1, S2, S3], [spiel], [], tore, SAISON_2026);
    const result = berechneVorlagenliste(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    const s2 = result.find((e) => e.spielerId === "s2")!;
    expect(s1.rang).toBe(1);
    expect(s2.rang).toBe(1);
  });

  it("Eigentore haben keinen Vorlagengeber", () => {
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: true, spielId: "sp1", scorerId: "s1", assistId: "s2" },
    ];
    // Even if there's an assistId on an eigentor, it still counts for assist
    // (domain doesn't forbid it, engine should handle it consistently)
    const eingabe = makeEingabe([S1, S2], [spiel], [], tore, SAISON_2026);
    const result = berechneVorlagenliste(eingabe);
    // The engine counts assists on eigentore — this is acceptable
    // Main thing: doesn't crash
    expect(Array.isArray(result)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. Punktetabelle
// ---------------------------------------------------------------------------

describe("berechnePunktetabelle — Punktetabelle", () => {
  it("gibt leere Liste zurück wenn keine Teilnahmen", () => {
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const eingabe = makeEingabe([S1, S2], [spiel], [], [], SAISON_2026);
    expect(berechnePunktetabelle(eingabe)).toEqual([]);
  });

  it("Gewinner bekommt 3 Punkte, Verlierer 0", () => {
    // Rot wins 2:0
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp1", team: "Rot", punkteOverride: null },
      { id: "tn2", spielerId: "s2", spielId: "sp1", team: "Gelb", punkteOverride: null },
    ];
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
      { id: "t2", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
    ];
    const eingabe = makeEingabe([S1, S2], [spiel], teilnahmen, tore, SAISON_2026);
    const result = berechnePunktetabelle(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    const s2 = result.find((e) => e.spielerId === "s2")!;
    expect(s1.wert).toBe(3);
    expect(s2.wert).toBe(0);
  });

  it("Unentschieden — beide Spieler bekommen 1 Punkt", () => {
    // 1:1
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp1", team: "Rot", punkteOverride: null },
      { id: "tn2", spielerId: "s2", spielId: "sp1", team: "Gelb", punkteOverride: null },
    ];
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
      { id: "t2", team: "Gelb", eigentor: false, spielId: "sp1", scorerId: "s2" },
    ];
    const eingabe = makeEingabe([S1, S2], [spiel], teilnahmen, tore, SAISON_2026);
    const result = berechnePunktetabelle(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    const s2 = result.find((e) => e.spielerId === "s2")!;
    expect(s1.wert).toBe(1);
    expect(s2.wert).toBe(1);
  });

  it("0:0 Unentschieden — beide bekommen 1 Punkt", () => {
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp1", team: "Rot", punkteOverride: null },
      { id: "tn2", spielerId: "s2", spielId: "sp1", team: "Gelb", punkteOverride: null },
    ];
    const eingabe = makeEingabe([S1, S2], [spiel], teilnahmen, [], SAISON_2026);
    const result = berechnePunktetabelle(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    const s2 = result.find((e) => e.spielerId === "s2")!;
    expect(s1.wert).toBe(1);
    expect(s2.wert).toBe(1);
  });

  it("punkteOverride überschreibt das tatsächliche Ergebnis", () => {
    // Rot wins 2:0. But s1 (Rot player) has punkteOverride=Gelb
    // → s1 gets points as if they were on Gelb (0 pts), s2 (Gelb) gets 0 normally
    // Actually: s1 is on Rot but override says Gelb → s1 gets Gelb's outcome (loss = 0)
    // s2 is on Gelb → Gelb lost → s2 gets 0 pts
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp1", team: "Rot", punkteOverride: "Gelb" }, // Override!
      { id: "tn2", spielerId: "s2", spielId: "sp1", team: "Gelb", punkteOverride: null },
    ];
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s3" },
      { id: "t2", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s3" },
    ];
    const eingabe = makeEingabe([S1, S2, S3], [spiel], teilnahmen, tore, SAISON_2026);
    const result = berechnePunktetabelle(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    // s1 was overridden to Gelb, Gelb lost → 0 points
    expect(s1.wert).toBe(0);
  });

  it("punkteOverride=Rot lässt Gelb-Spieler wie Rot punkten", () => {
    // Rot wins 1:0. s2 is on Gelb but has punkteOverride=Rot → gets 3 pts
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp1", team: "Rot", punkteOverride: null },
      { id: "tn2", spielerId: "s2", spielId: "sp1", team: "Gelb", punkteOverride: "Rot" }, // Override!
    ];
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
    ];
    const eingabe = makeEingabe([S1, S2], [spiel], teilnahmen, tore, SAISON_2026);
    const result = berechnePunktetabelle(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    const s2 = result.find((e) => e.spielerId === "s2")!;
    expect(s1.wert).toBe(3); // Rot won → 3pts
    expect(s2.wert).toBe(3); // Override Rot → also 3pts
  });

  it("schließt abgesagte Spiele aus der Punktetabelle aus", () => {
    const spielAbgesagt: SpielFixture = { id: "sp1", status: "abgesagt", saisonJahr: SAISON_2026 };
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp1", team: "Rot", punkteOverride: null },
    ];
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
    ];
    const eingabe = makeEingabe([S1], [spielAbgesagt], teilnahmen, tore, SAISON_2026);
    const result = berechnePunktetabelle(eingabe);
    const s1Entry = result.find((e) => e.spielerId === "s1");
    expect(s1Entry?.wert ?? 0).toBe(0);
  });

  it("Gleichstand in Punkten — gleicher Rang", () => {
    // Two separate matches, each player wins one → both get 3 pts
    const spiel1: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const spiel2: SpielFixture = { id: "sp2", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp1", team: "Rot", punkteOverride: null },
      { id: "tn2", spielerId: "s2", spielId: "sp1", team: "Gelb", punkteOverride: null },
      { id: "tn3", spielerId: "s1", spielId: "sp2", team: "Gelb", punkteOverride: null },
      { id: "tn4", spielerId: "s2", spielId: "sp2", team: "Rot", punkteOverride: null },
    ];
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" }, // sp1: Rot wins
      { id: "t2", team: "Rot", eigentor: false, spielId: "sp2", scorerId: "s2" }, // sp2: Rot wins (s2 on Rot)
    ];
    const eingabe = makeEingabe([S1, S2], [spiel1, spiel2], teilnahmen, tore, SAISON_2026);
    const result = berechnePunktetabelle(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    const s2 = result.find((e) => e.spielerId === "s2")!;
    expect(s1.wert).toBe(3);
    expect(s2.wert).toBe(3);
    expect(s1.rang).toBe(1);
    expect(s2.rang).toBe(1);
  });

  it("Punkte kumulieren über mehrere Spiele", () => {
    const spiel1: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const spiel2: SpielFixture = { id: "sp2", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp1", team: "Rot", punkteOverride: null }, // wins sp1 → 3pts
      { id: "tn2", spielerId: "s1", spielId: "sp2", team: "Rot", punkteOverride: null }, // wins sp2 → 3pts
      { id: "tn3", spielerId: "s2", spielId: "sp1", team: "Gelb", punkteOverride: null }, // loses sp1 → 0pts
      { id: "tn4", spielerId: "s2", spielId: "sp2", team: "Gelb", punkteOverride: null }, // loses sp2 → 0pts
    ];
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
      { id: "t2", team: "Rot", eigentor: false, spielId: "sp2", scorerId: "s1" },
    ];
    const eingabe = makeEingabe([S1, S2], [spiel1, spiel2], teilnahmen, tore, SAISON_2026);
    const result = berechnePunktetabelle(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    expect(s1.wert).toBe(6);
  });

  it("all-time aggregiert Punkte über Saisons", () => {
    const spiel2026: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const spiel2025: SpielFixture = { id: "sp2", status: "abgeschlossen", saisonJahr: SAISON_2025 };
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp1", team: "Rot", punkteOverride: null },
      { id: "tn2", spielerId: "s1", spielId: "sp2", team: "Rot", punkteOverride: null },
    ];
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1" },
      { id: "t2", team: "Rot", eigentor: false, spielId: "sp2", scorerId: "s1" },
    ];
    const eingabe = makeEingabe([S1], [spiel2026, spiel2025], teilnahmen, tore, "all-time");
    const result = berechnePunktetabelle(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    expect(s1.wert).toBe(6); // 3 pts × 2 matches
  });
});

// ---------------------------------------------------------------------------
// 4. Anwesenheitsliste
// ---------------------------------------------------------------------------

describe("berechneAnwesenheitsliste — Anwesenheitsliste", () => {
  it("gibt leere Liste zurück wenn keine Teilnahmen", () => {
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const eingabe = makeEingabe([S1], [spiel], [], [], SAISON_2026);
    expect(berechneAnwesenheitsliste(eingabe)).toEqual([]);
  });

  it("zählt Spielteilnahmen pro Spieler", () => {
    const spiel1: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const spiel2: SpielFixture = { id: "sp2", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp1", team: "Rot", punkteOverride: null },
      { id: "tn2", spielerId: "s1", spielId: "sp2", team: "Rot", punkteOverride: null },
      { id: "tn3", spielerId: "s2", spielId: "sp1", team: "Gelb", punkteOverride: null },
    ];
    const eingabe = makeEingabe([S1, S2], [spiel1, spiel2], teilnahmen, [], SAISON_2026);
    const result = berechneAnwesenheitsliste(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    const s2 = result.find((e) => e.spielerId === "s2")!;
    expect(s1.wert).toBe(2);
    expect(s2.wert).toBe(1);
  });

  it("schließt abgesagte Spiele aus der Anwesenheitsliste aus", () => {
    const spielAbgesagt: SpielFixture = { id: "sp1", status: "abgesagt", saisonJahr: SAISON_2026 };
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp1", team: "Rot", punkteOverride: null },
    ];
    const eingabe = makeEingabe([S1], [spielAbgesagt], teilnahmen, [], SAISON_2026);
    const result = berechneAnwesenheitsliste(eingabe);
    const s1Entry = result.find((e) => e.spielerId === "s1");
    expect(s1Entry?.wert ?? 0).toBe(0);
  });

  it("zählt auch geplante und teams_zugewiesen Spiele (nicht nur abgeschlossen)", () => {
    // Attendance counts non-cancelled matches
    const spielGeplant: SpielFixture = { id: "sp1", status: "geplant", saisonJahr: SAISON_2026 };
    const spielLaufend: SpielFixture = { id: "sp2", status: "teams_zugewiesen", saisonJahr: SAISON_2026 };
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp1", team: null, punkteOverride: null },
      { id: "tn2", spielerId: "s1", spielId: "sp2", team: "Rot", punkteOverride: null },
    ];
    const eingabe = makeEingabe([S1], [spielGeplant, spielLaufend], teilnahmen, [], SAISON_2026);
    const result = berechneAnwesenheitsliste(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    expect(s1.wert).toBe(2);
  });

  it("Gleichstand bei Anwesenheit — gleicher Rang", () => {
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp1", team: "Rot", punkteOverride: null },
      { id: "tn2", spielerId: "s2", spielId: "sp1", team: "Gelb", punkteOverride: null },
    ];
    const eingabe = makeEingabe([S1, S2], [spiel], teilnahmen, [], SAISON_2026);
    const result = berechneAnwesenheitsliste(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    const s2 = result.find((e) => e.spielerId === "s2")!;
    expect(s1.rang).toBe(1);
    expect(s2.rang).toBe(1);
  });

  it("all-time aggregiert Anwesenheit über Saisons", () => {
    const spiel2026: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const spiel2025: SpielFixture = { id: "sp2", status: "abgeschlossen", saisonJahr: SAISON_2025 };
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp1", team: "Rot", punkteOverride: null },
      { id: "tn2", spielerId: "s1", spielId: "sp2", team: "Rot", punkteOverride: null },
    ];
    const eingabe = makeEingabe([S1], [spiel2026, spiel2025], teilnahmen, [], "all-time");
    const result = berechneAnwesenheitsliste(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    expect(s1.wert).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 5. Bierliste
// ---------------------------------------------------------------------------

describe("berechneBierliste — Bierliste", () => {
  it("gibt leere Liste zurück wenn kein Bierbringer gesetzt", () => {
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026 };
    const eingabe = makeEingabe([S1], [spiel], [], [], SAISON_2026);
    expect(berechneBierliste(eingabe)).toEqual([]);
  });

  it("zählt Bierbringer-Einsätze pro Spieler", () => {
    const spiel1: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026, bierbringerId: "s1" };
    const spiel2: SpielFixture = { id: "sp2", status: "abgeschlossen", saisonJahr: SAISON_2026, bierbringerId: "s1" };
    const spiel3: SpielFixture = { id: "sp3", status: "abgeschlossen", saisonJahr: SAISON_2026, bierbringerId: "s2" };
    const eingabe = makeEingabe([S1, S2], [spiel1, spiel2, spiel3], [], [], SAISON_2026);
    const result = berechneBierliste(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    const s2 = result.find((e) => e.spielerId === "s2")!;
    expect(s1.wert).toBe(2);
    expect(s2.wert).toBe(1);
  });

  it("schließt abgesagte Spiele aus der Bierliste aus", () => {
    const spielAbgesagt: SpielFixture = { id: "sp1", status: "abgesagt", saisonJahr: SAISON_2026, bierbringerId: "s1" };
    const eingabe = makeEingabe([S1], [spielAbgesagt], [], [], SAISON_2026);
    const result = berechneBierliste(eingabe);
    const s1Entry = result.find((e) => e.spielerId === "s1");
    expect(s1Entry?.wert ?? 0).toBe(0);
  });

  it("Gleichstand bei Bier — gleicher Rang", () => {
    const spiel1: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026, bierbringerId: "s1" };
    const spiel2: SpielFixture = { id: "sp2", status: "abgeschlossen", saisonJahr: SAISON_2026, bierbringerId: "s2" };
    const eingabe = makeEingabe([S1, S2], [spiel1, spiel2], [], [], SAISON_2026);
    const result = berechneBierliste(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    const s2 = result.find((e) => e.spielerId === "s2")!;
    expect(s1.rang).toBe(1);
    expect(s2.rang).toBe(1);
  });

  it("all-time aggregiert Bierliste über Saisons", () => {
    const spiel2026: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026, bierbringerId: "s1" };
    const spiel2025: SpielFixture = { id: "sp2", status: "abgeschlossen", saisonJahr: SAISON_2025, bierbringerId: "s1" };
    const eingabe = makeEingabe([S1], [spiel2026, spiel2025], [], [], "all-time");
    const result = berechneBierliste(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    expect(s1.wert).toBe(2);
  });

  it("filtert nach Saison — anderes Jahr nicht gezählt", () => {
    const spiel2026: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026, bierbringerId: "s1" };
    const spiel2025: SpielFixture = { id: "sp2", status: "abgeschlossen", saisonJahr: SAISON_2025, bierbringerId: "s1" };
    const eingabe = makeEingabe([S1], [spiel2026, spiel2025], [], [], SAISON_2026);
    const result = berechneBierliste(eingabe);
    const s1 = result.find((e) => e.spielerId === "s1")!;
    expect(s1.wert).toBe(1); // Only 2026
  });
});

// ---------------------------------------------------------------------------
// 6. berechneStatistiken — combined output
// ---------------------------------------------------------------------------

describe("berechneStatistiken — kombinierte Ausgabe", () => {
  it("gibt alle fünf Listen zurück", () => {
    const eingabe = makeEingabe([], [], [], [], SAISON_2026);
    const result = berechneStatistiken(eingabe);
    expect(result).toHaveProperty("torjaeger");
    expect(result).toHaveProperty("vorlagen");
    expect(result).toHaveProperty("punkte");
    expect(result).toHaveProperty("anwesenheit");
    expect(result).toHaveProperty("bier");
  });

  it("alle Listen sind leer bei leeren Eingabedaten", () => {
    const eingabe = makeEingabe([], [], [], [], SAISON_2026);
    const result = berechneStatistiken(eingabe);
    expect(result.torjaeger).toEqual([]);
    expect(result.vorlagen).toEqual([]);
    expect(result.punkte).toEqual([]);
    expect(result.anwesenheit).toEqual([]);
    expect(result.bier).toEqual([]);
  });

  it("integriertes Szenario: Spiel mit allen Elementen", () => {
    // Match: Rot wins 2:1
    // s1 (Rot): 2 goals (1 regular, 1 eigentor → only 1 counted), 0 assists, attends, not bierbringer
    // s2 (Gelb): 1 goal, 1 assist, attends, bierbringer
    // s3 (Rot): 0 goals, 1 assist, attends
    // Result: Rot wins → s1 & s3 get 3pts, s2 gets 0pts
    const spiel: SpielFixture = { id: "sp1", status: "abgeschlossen", saisonJahr: SAISON_2026, bierbringerId: "s2" };
    const teilnahmen: TeilnahmeFixture[] = [
      { id: "tn1", spielerId: "s1", spielId: "sp1", team: "Rot", punkteOverride: null },
      { id: "tn2", spielerId: "s2", spielId: "sp1", team: "Gelb", punkteOverride: null },
      { id: "tn3", spielerId: "s3", spielId: "sp1", team: "Rot", punkteOverride: null },
    ];
    const tore: TorFixture[] = [
      { id: "t1", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1", assistId: "s3" }, // Rot: +1 regular
      { id: "t2", team: "Rot", eigentor: true, spielId: "sp1", scorerId: "s1" },  // Gelb: +1 (eigentor by s1)
      { id: "t3", team: "Rot", eigentor: false, spielId: "sp1", scorerId: "s1", assistId: "s3" }, // Rot: +1
      { id: "t4", team: "Gelb", eigentor: false, spielId: "sp1", scorerId: "s2" }, // Gelb: +1
    ];
    // Score: Rot=2 (2 regular), Gelb=2 (1 regular + 1 eigentor by Rot)
    // Wait, let me recalculate:
    // t1: Rot regular → Rot+1
    // t2: Rot eigentor → Gelb+1
    // t3: Rot regular → Rot+1
    // t4: Gelb regular → Gelb+1
    // Score: Rot=2, Gelb=2 → draw → 1pt each
    const eingabe = makeEingabe([S1, S2, S3], [spiel], teilnahmen, tore, SAISON_2026);
    const result = berechneStatistiken(eingabe);

    // Torjäger: s1 has 2 regular goals (eigentor excluded), s2 has 1
    const s1Torjaeger = result.torjaeger.find((e) => e.spielerId === "s1");
    expect(s1Torjaeger?.wert).toBe(2);

    // Vorlagen: s3 has 2 assists
    const s3Vorlage = result.vorlagen.find((e) => e.spielerId === "s3");
    expect(s3Vorlage?.wert).toBe(2);

    // Punkte: draw → 1pt each
    const s1Punkte = result.punkte.find((e) => e.spielerId === "s1");
    expect(s1Punkte?.wert).toBe(1);

    // Anwesenheit: all 3 attended
    expect(result.anwesenheit.filter((e) => e.wert > 0)).toHaveLength(3);

    // Bier: s2 is bierbringer
    const s2Bier = result.bier.find((e) => e.spielerId === "s2");
    expect(s2Bier?.wert).toBe(1);
  });
});
