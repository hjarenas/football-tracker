/**
 * Unit tests for the Spieler-Sortierung module — Issue #18.
 *
 * Pure function: accepts a list of Spieler annotated with their most recent
 * Spielteilnahme date (or null) and a reference date, and returns the list
 * partitioned into three activity buckets, alphabetically sorted within each.
 *
 * Bucket 1: last participation within 90 days of reference date
 * Bucket 2: last participation within 365 days but not within 90 days
 * Bucket 3: no participation in the last 365 days, or never participated (null)
 */
import { describe, it, expect } from "vitest";
import {
  sortiereSpielerNachAktivitaet,
  type SpielerMitLetzterTeilnahme,
  type SortiertesSpielerErgebnis,
} from "@/lib/spieler-sortierung";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Subtracts `days` from `date` and returns the resulting Date. */
function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

const REFERENZ = new Date("2025-06-04T12:00:00.000Z");

function makePlayer(
  name: string,
  letzteTeilnahme: Date | null
): SpielerMitLetzterTeilnahme {
  return { id: name.toLowerCase(), name, letzteTeilnahme };
}

// ---------------------------------------------------------------------------
// Test 1 — All players in bucket 1 (all recent)
// ---------------------------------------------------------------------------
describe("sortiereSpielerNachAktivitaet — alle Spieler in Eimer 1", () => {
  it("alle Spieler landen in Eimer 1 wenn alle letzte Teilnahme < 90 Tage", () => {
    const spieler: SpielerMitLetzterTeilnahme[] = [
      makePlayer("Zara", subtractDays(REFERENZ, 1)),
      makePlayer("Anton", subtractDays(REFERENZ, 45)),
      makePlayer("Max", subtractDays(REFERENZ, 89)),
    ];

    const result: SortiertesSpielerErgebnis = sortiereSpielerNachAktivitaet(
      spieler,
      REFERENZ
    );

    expect(result.eimer1.map((s) => s.name)).toEqual(["Anton", "Max", "Zara"]);
    expect(result.eimer2).toEqual([]);
    expect(result.eimer3).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Test 2 — Mixed buckets, correctly partitioned and alphabetically sorted
// ---------------------------------------------------------------------------
describe("sortiereSpielerNachAktivitaet — gemischte Eimer", () => {
  it("Spieler werden korrekt aufgeteilt und alphabetisch sortiert", () => {
    const spieler: SpielerMitLetzterTeilnahme[] = [
      makePlayer("Zara", subtractDays(REFERENZ, 10)),    // Eimer 1
      makePlayer("Anton", subtractDays(REFERENZ, 200)),  // Eimer 2
      makePlayer("Max", subtractDays(REFERENZ, 400)),    // Eimer 3
      makePlayer("Bernd", subtractDays(REFERENZ, 50)),   // Eimer 1
      makePlayer("Klaus", subtractDays(REFERENZ, 100)),  // Eimer 2
    ];

    const result = sortiereSpielerNachAktivitaet(spieler, REFERENZ);

    expect(result.eimer1.map((s) => s.name)).toEqual(["Bernd", "Zara"]);
    expect(result.eimer2.map((s) => s.name)).toEqual(["Anton", "Klaus"]);
    expect(result.eimer3.map((s) => s.name)).toEqual(["Max"]);
  });
});

// ---------------------------------------------------------------------------
// Test 3 — null last-participation date lands in bucket 3
// ---------------------------------------------------------------------------
describe("sortiereSpielerNachAktivitaet — null Teilnahme in Eimer 3", () => {
  it("Spieler mit null letzteTeilnahme landet in Eimer 3", () => {
    const spieler: SpielerMitLetzterTeilnahme[] = [
      makePlayer("Anna", subtractDays(REFERENZ, 30)),   // Eimer 1
      makePlayer("Dieter", null),                        // Eimer 3
      makePlayer("Bodo", null),                          // Eimer 3
    ];

    const result = sortiereSpielerNachAktivitaet(spieler, REFERENZ);

    expect(result.eimer1.map((s) => s.name)).toEqual(["Anna"]);
    expect(result.eimer2).toEqual([]);
    expect(result.eimer3.map((s) => s.name)).toEqual(["Bodo", "Dieter"]);
  });
});

// ---------------------------------------------------------------------------
// Test 4 — Edge: participation exactly on the 90-day boundary
// ---------------------------------------------------------------------------
describe("sortiereSpielerNachAktivitaet — Grenzwert 90 Tage", () => {
  it("Teilnahme genau am 90-Tage-Grenzwert landet in Eimer 1 (inklusiv)", () => {
    const spieler: SpielerMitLetzterTeilnahme[] = [
      makePlayer("Exakt90", subtractDays(REFERENZ, 90)),
    ];

    const result = sortiereSpielerNachAktivitaet(spieler, REFERENZ);

    expect(result.eimer1.map((s) => s.name)).toEqual(["Exakt90"]);
    expect(result.eimer2).toEqual([]);
    expect(result.eimer3).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Test 5 — Edge: participation exactly on the 365-day boundary
// ---------------------------------------------------------------------------
describe("sortiereSpielerNachAktivitaet — Grenzwert 365 Tage", () => {
  it("Teilnahme genau am 365-Tage-Grenzwert landet in Eimer 2 (inklusiv)", () => {
    const spieler: SpielerMitLetzterTeilnahme[] = [
      makePlayer("Exakt365", subtractDays(REFERENZ, 365)),
    ];

    const result = sortiereSpielerNachAktivitaet(spieler, REFERENZ);

    expect(result.eimer1).toEqual([]);
    expect(result.eimer2.map((s) => s.name)).toEqual(["Exakt365"]);
    expect(result.eimer3).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Test 6 — Empty input returns empty output
// ---------------------------------------------------------------------------
describe("sortiereSpielerNachAktivitaet — leere Eingabe", () => {
  it("leere Eingabe liefert leere Eimer", () => {
    const result = sortiereSpielerNachAktivitaet([], REFERENZ);

    expect(result.eimer1).toEqual([]);
    expect(result.eimer2).toEqual([]);
    expect(result.eimer3).toEqual([]);
  });
});
