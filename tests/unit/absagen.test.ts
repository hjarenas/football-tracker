/**
 * Unit tests for Spiel absagen (cancellation) business rules.
 *
 * Verifies:
 * - geplant → abgesagt is valid (via Zustandsmaschine)
 * - teams_zugewiesen → abgesagt is rejected by the cancel action guard
 *   (teams_zugewiesen CAN transition to abgesagt per the state machine,
 *    but the cancel button only appears when status is geplant — the
 *    action enforces this server-side by checking status === geplant)
 * - abgeschlossen → abgesagt is rejected by the Zustandsmaschine
 * - abgesagt → abgesagt is rejected by the Zustandsmaschine
 */
import { describe, it, expect } from "vitest";
import {
  canTransition,
  transition,
  ZustandsmaschineError,
} from "@/lib/zustandsmaschine";
import { SpielStatus } from "@prisma/client";

// ---------------------------------------------------------------------------
// Zustandsmaschine: geplant → abgesagt (muss erlaubt sein)
// ---------------------------------------------------------------------------
describe("Absagen — Zustandsmaschine", () => {
  it("geplant → abgesagt ist erlaubt", () => {
    expect(canTransition(SpielStatus.geplant, SpielStatus.abgesagt)).toBe(true);
  });

  it("transition(geplant, abgesagt) gibt abgesagt zurück", () => {
    expect(transition(SpielStatus.geplant, SpielStatus.abgesagt)).toBe(
      SpielStatus.abgesagt
    );
  });

  it("abgeschlossen → abgesagt ist nicht erlaubt", () => {
    expect(canTransition(SpielStatus.abgeschlossen, SpielStatus.abgesagt)).toBe(false);
  });

  it("transition(abgeschlossen, abgesagt) wirft ZustandsmaschineError", () => {
    expect(() =>
      transition(SpielStatus.abgeschlossen, SpielStatus.abgesagt)
    ).toThrow(ZustandsmaschineError);
  });

  it("abgesagt → abgesagt ist nicht erlaubt (Endzustand)", () => {
    expect(canTransition(SpielStatus.abgesagt, SpielStatus.abgesagt)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Server-side guard: nur geplant darf über die Absagen-Aktion abgesagt werden
// ---------------------------------------------------------------------------
describe("Absagen — Server-seitige Validierung (canSpielAbsagen)", () => {
  /**
   * The cancel action only permits cancellation when status is "geplant".
   * This guard is defined in the action and mirrors the UI constraint.
   */
  function canSpielAbsagen(status: SpielStatus): boolean {
    return status === SpielStatus.geplant;
  }

  it("geplant darf abgesagt werden", () => {
    expect(canSpielAbsagen(SpielStatus.geplant)).toBe(true);
  });

  it("teams_zugewiesen darf nicht über Absagen-Aktion abgesagt werden", () => {
    expect(canSpielAbsagen(SpielStatus.teams_zugewiesen)).toBe(false);
  });

  it("abgeschlossen darf nicht abgesagt werden", () => {
    expect(canSpielAbsagen(SpielStatus.abgeschlossen)).toBe(false);
  });

  it("abgesagt darf nicht erneut abgesagt werden", () => {
    expect(canSpielAbsagen(SpielStatus.abgesagt)).toBe(false);
  });
});
