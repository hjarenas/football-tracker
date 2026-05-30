/**
 * Unit tests for the Spiel-Zustandsmaschine (state machine).
 * Tests all valid and invalid transitions from each state.
 */
import { describe, it, expect } from "vitest";
import {
  canTransition,
  transition,
  ZustandsmaschineError,
  VALID_TRANSITIONS,
} from "@/lib/zustandsmaschine";
import { SpielStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// canTransition — valid transitions from geplant
// ---------------------------------------------------------------------------
describe("canTransition — von geplant", () => {
  it("geplant → teams_zugewiesen ist erlaubt", () => {
    expect(canTransition(SpielStatus.geplant, SpielStatus.teams_zugewiesen)).toBe(true);
  });

  it("geplant → abgesagt ist erlaubt", () => {
    expect(canTransition(SpielStatus.geplant, SpielStatus.abgesagt)).toBe(true);
  });

  it("geplant → abgeschlossen ist nicht erlaubt", () => {
    expect(canTransition(SpielStatus.geplant, SpielStatus.abgeschlossen)).toBe(false);
  });

  it("geplant → geplant (gleicher Status) ist nicht erlaubt", () => {
    expect(canTransition(SpielStatus.geplant, SpielStatus.geplant)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canTransition — valid transitions from teams_zugewiesen
// ---------------------------------------------------------------------------
describe("canTransition — von teams_zugewiesen", () => {
  it("teams_zugewiesen → abgeschlossen ist erlaubt", () => {
    expect(canTransition(SpielStatus.teams_zugewiesen, SpielStatus.abgeschlossen)).toBe(true);
  });

  it("teams_zugewiesen → abgesagt ist erlaubt", () => {
    expect(canTransition(SpielStatus.teams_zugewiesen, SpielStatus.abgesagt)).toBe(true);
  });

  it("teams_zugewiesen → geplant ist nicht erlaubt", () => {
    expect(canTransition(SpielStatus.teams_zugewiesen, SpielStatus.geplant)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canTransition — terminal states (abgeschlossen, abgesagt) reject all
// ---------------------------------------------------------------------------
describe("canTransition — Endzustände", () => {
  it("abgeschlossen → teams_zugewiesen ist nicht erlaubt", () => {
    expect(canTransition(SpielStatus.abgeschlossen, SpielStatus.teams_zugewiesen)).toBe(false);
  });

  it("abgeschlossen → geplant ist nicht erlaubt", () => {
    expect(canTransition(SpielStatus.abgeschlossen, SpielStatus.geplant)).toBe(false);
  });

  it("abgeschlossen → abgesagt ist nicht erlaubt", () => {
    expect(canTransition(SpielStatus.abgeschlossen, SpielStatus.abgesagt)).toBe(false);
  });

  it("abgesagt → geplant ist nicht erlaubt", () => {
    expect(canTransition(SpielStatus.abgesagt, SpielStatus.geplant)).toBe(false);
  });

  it("abgesagt → teams_zugewiesen ist nicht erlaubt", () => {
    expect(canTransition(SpielStatus.abgesagt, SpielStatus.teams_zugewiesen)).toBe(false);
  });

  it("abgesagt → abgeschlossen ist nicht erlaubt", () => {
    expect(canTransition(SpielStatus.abgesagt, SpielStatus.abgeschlossen)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// transition — wirft ZustandsmaschineError bei ungültigen Übergängen
// ---------------------------------------------------------------------------
describe("transition — gibt neuen Status zurück oder wirft", () => {
  it("gibt neuen Status zurück bei erlaubtem Übergang", () => {
    expect(transition(SpielStatus.geplant, SpielStatus.teams_zugewiesen)).toBe(
      SpielStatus.teams_zugewiesen
    );
  });

  it("wirft ZustandsmaschineError bei ungültigem Übergang", () => {
    expect(() =>
      transition(SpielStatus.geplant, SpielStatus.abgeschlossen)
    ).toThrow(ZustandsmaschineError);
  });

  it("wirft ZustandsmaschineError wenn von Endzustand abgeschlossen", () => {
    expect(() =>
      transition(SpielStatus.abgeschlossen, SpielStatus.geplant)
    ).toThrow(ZustandsmaschineError);
  });

  it("wirft ZustandsmaschineError wenn von Endzustand abgesagt", () => {
    expect(() =>
      transition(SpielStatus.abgesagt, SpielStatus.teams_zugewiesen)
    ).toThrow(ZustandsmaschineError);
  });

  it("Fehlermeldung enthält Von- und Nach-Status", () => {
    try {
      transition(SpielStatus.geplant, SpielStatus.abgeschlossen);
      expect.fail("Kein Fehler geworfen");
    } catch (e) {
      expect(e).toBeInstanceOf(ZustandsmaschineError);
      expect((e as ZustandsmaschineError).message).toContain("geplant");
      expect((e as ZustandsmaschineError).message).toContain("abgeschlossen");
    }
  });
});

// ---------------------------------------------------------------------------
// VALID_TRANSITIONS — Vollständigkeit des Transition-Maps
// ---------------------------------------------------------------------------
describe("VALID_TRANSITIONS — Transition-Map Vollständigkeit", () => {
  it("geplant hat genau zwei erlaubte Folgezustände", () => {
    const targets = VALID_TRANSITIONS[SpielStatus.geplant];
    expect(targets).toHaveLength(2);
    expect(targets).toContain(SpielStatus.teams_zugewiesen);
    expect(targets).toContain(SpielStatus.abgesagt);
  });

  it("teams_zugewiesen hat genau zwei erlaubte Folgezustände", () => {
    const targets = VALID_TRANSITIONS[SpielStatus.teams_zugewiesen];
    expect(targets).toHaveLength(2);
    expect(targets).toContain(SpielStatus.abgeschlossen);
    expect(targets).toContain(SpielStatus.abgesagt);
  });

  it("abgeschlossen hat keine erlaubten Folgezustände", () => {
    const targets = VALID_TRANSITIONS[SpielStatus.abgeschlossen];
    expect(targets).toHaveLength(0);
  });

  it("abgesagt hat keine erlaubten Folgezustände", () => {
    const targets = VALID_TRANSITIONS[SpielStatus.abgesagt];
    expect(targets).toHaveLength(0);
  });
});
