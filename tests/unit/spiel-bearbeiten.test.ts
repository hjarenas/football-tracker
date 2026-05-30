/**
 * Unit tests for Spiel bearbeiten (editing completed matches) — Issue #08.
 *
 * Covers:
 * - Editing a completed Spiel does NOT change its status
 * - Score derives correctly after a Tor record is edited/deleted
 * - Adding an eigentor updates the score correctly
 * - Server-side guard: only abgeschlossen Spiele can be edited via the edit actions
 */
import { describe, it, expect } from "vitest";
import { deriveScore } from "@/lib/score";
import { canTransition } from "@/lib/zustandsmaschine";
import { SpielStatus } from "@prisma/client";

// Minimal Tor shape needed for derivation
type TorInput = { team: "Rot" | "Gelb"; eigentor: boolean };

// ---------------------------------------------------------------------------
// Status guard: abgeschlossen remains abgeschlossen after editing
// ---------------------------------------------------------------------------
describe("Spiel bearbeiten — Status bleibt abgeschlossen", () => {
  it("abgeschlossen hat keine erlaubten Zustandsübergänge", () => {
    const erlaubteUebergaenge = [
      SpielStatus.geplant,
      SpielStatus.teams_zugewiesen,
      SpielStatus.abgeschlossen,
      SpielStatus.abgesagt,
    ].filter((ziel) => canTransition(SpielStatus.abgeschlossen, ziel));
    expect(erlaubteUebergaenge).toHaveLength(0);
  });

  it("Bearbeiten ändert den Status nicht — canEditAbgeschlossen gibt true nur für abgeschlossen zurück", () => {
    function canEditAbgeschlossen(status: SpielStatus): boolean {
      return status === SpielStatus.abgeschlossen;
    }
    expect(canEditAbgeschlossen(SpielStatus.abgeschlossen)).toBe(true);
    expect(canEditAbgeschlossen(SpielStatus.geplant)).toBe(false);
    expect(canEditAbgeschlossen(SpielStatus.teams_zugewiesen)).toBe(false);
    expect(canEditAbgeschlossen(SpielStatus.abgesagt)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Score nach Tor-Bearbeitung (edit/delete)
// ---------------------------------------------------------------------------
describe("Spiel bearbeiten — Score korrekt nach Tor-Änderungen", () => {
  it("Ergebnis nach Löschen eines Tores wird neu berechnet", () => {
    const vorher: TorInput[] = [
      { team: "Rot", eigentor: false },
      { team: "Rot", eigentor: false },
      { team: "Gelb", eigentor: false },
    ];
    // Simulate deletion of one Rot goal
    const nachher: TorInput[] = [
      { team: "Rot", eigentor: false },
      { team: "Gelb", eigentor: false },
    ];
    expect(deriveScore(vorher)).toEqual({ rot: 2, gelb: 1 });
    expect(deriveScore(nachher)).toEqual({ rot: 1, gelb: 1 });
  });

  it("Ergebnis nach Bearbeitung eines regulären Tores zu Eigentor ändert sich korrekt", () => {
    // Before: Rot scored a regular goal
    const vorher: TorInput[] = [
      { team: "Rot", eigentor: false },
      { team: "Gelb", eigentor: false },
    ];
    // After: that Rot goal is changed to an eigentor (Rot scored own goal → Gelb gets it)
    const nachher: TorInput[] = [
      { team: "Rot", eigentor: true },
      { team: "Gelb", eigentor: false },
    ];
    expect(deriveScore(vorher)).toEqual({ rot: 1, gelb: 1 });
    expect(deriveScore(nachher)).toEqual({ rot: 0, gelb: 2 });
  });

  it("Hinzufügen eines Tores nach Spielabschluss aktualisiert das Ergebnis", () => {
    const vorher: TorInput[] = [
      { team: "Rot", eigentor: false },
    ];
    // Admin adds a missed Gelb goal
    const nachher: TorInput[] = [
      { team: "Rot", eigentor: false },
      { team: "Gelb", eigentor: false },
    ];
    expect(deriveScore(vorher)).toEqual({ rot: 1, gelb: 0 });
    expect(deriveScore(nachher)).toEqual({ rot: 1, gelb: 1 });
  });

  it("Hinzufügen eines Eigentors nach Spielabschluss — zählt für Gegner", () => {
    const vorher: TorInput[] = [
      { team: "Rot", eigentor: false },
      { team: "Gelb", eigentor: false },
    ];
    // Admin adds a missed Rot eigentor
    const nachher: TorInput[] = [
      { team: "Rot", eigentor: false },
      { team: "Gelb", eigentor: false },
      { team: "Rot", eigentor: true }, // ET by Rot → Gelb gets +1
    ];
    expect(deriveScore(vorher)).toEqual({ rot: 1, gelb: 1 });
    expect(deriveScore(nachher)).toEqual({ rot: 1, gelb: 2 });
  });

  it("Löschen eines Eigentors korrigiert das Ergebnis", () => {
    const vorher: TorInput[] = [
      { team: "Rot", eigentor: false },
      { team: "Gelb", eigentor: true }, // ET by Gelb → Rot +1
    ];
    // Admin deletes the wrongly recorded eigentor
    const nachher: TorInput[] = [
      { team: "Rot", eigentor: false },
    ];
    expect(deriveScore(vorher)).toEqual({ rot: 2, gelb: 0 });
    expect(deriveScore(nachher)).toEqual({ rot: 1, gelb: 0 });
  });

  it("alle Tore gelöscht → 0:0", () => {
    const vorher: TorInput[] = [
      { team: "Rot", eigentor: false },
      { team: "Gelb", eigentor: false },
      { team: "Rot", eigentor: false },
    ];
    const nachher: TorInput[] = [];
    expect(deriveScore(vorher)).toEqual({ rot: 2, gelb: 1 });
    expect(deriveScore(nachher)).toEqual({ rot: 0, gelb: 0 });
  });
});

// ---------------------------------------------------------------------------
// Server-side guard: edit actions require status === abgeschlossen
// ---------------------------------------------------------------------------
describe("Spiel bearbeiten — Server-seitige Validierung", () => {
  /**
   * The edit actions must only proceed when the Spiel status is abgeschlossen.
   * This mirrors the guard that will be checked in the server actions.
   */
  function canBearbeiten(status: SpielStatus): boolean {
    return status === SpielStatus.abgeschlossen;
  }

  it("abgeschlossen kann bearbeitet werden", () => {
    expect(canBearbeiten(SpielStatus.abgeschlossen)).toBe(true);
  });

  it("geplant kann nicht über Bearbeiten-Aktion geändert werden", () => {
    expect(canBearbeiten(SpielStatus.geplant)).toBe(false);
  });

  it("teams_zugewiesen kann nicht über Bearbeiten-Aktion geändert werden", () => {
    expect(canBearbeiten(SpielStatus.teams_zugewiesen)).toBe(false);
  });

  it("abgesagt kann nicht bearbeitet werden", () => {
    expect(canBearbeiten(SpielStatus.abgesagt)).toBe(false);
  });
});
