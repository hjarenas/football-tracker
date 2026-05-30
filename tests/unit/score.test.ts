/**
 * Unit tests for the score derivation logic.
 *
 * Score derivation rule:
 *   Rot  = COUNT(Tor WHERE team=Rot  AND NOT eigentor) + COUNT(Tor WHERE team=Gelb AND eigentor)
 *   Gelb = COUNT(Tor WHERE team=Gelb AND NOT eigentor) + COUNT(Tor WHERE team=Rot  AND eigentor)
 *
 * `team` on Tor = the shooting player's own team.
 * An eigentor counts for the OPPONENT, not the scorer's team.
 */
import { describe, it, expect } from "vitest";
import { deriveScore } from "@/lib/score";

// Minimal Tor shape needed for derivation
type TorInput = { team: "Rot" | "Gelb"; eigentor: boolean };

// ---------------------------------------------------------------------------
// Empty match — 0:0
// ---------------------------------------------------------------------------
describe("deriveScore — leeres Spiel (0:0)", () => {
  it("gibt 0:0 zurück wenn keine Tore", () => {
    const result = deriveScore([]);
    expect(result).toEqual({ rot: 0, gelb: 0 });
  });
});

// ---------------------------------------------------------------------------
// Regular goals — no eigentore
// ---------------------------------------------------------------------------
describe("deriveScore — reguläre Tore (keine Eigentore)", () => {
  it("ein Tor für Rot → 1:0", () => {
    const tore: TorInput[] = [{ team: "Rot", eigentor: false }];
    expect(deriveScore(tore)).toEqual({ rot: 1, gelb: 0 });
  });

  it("ein Tor für Gelb → 0:1", () => {
    const tore: TorInput[] = [{ team: "Gelb", eigentor: false }];
    expect(deriveScore(tore)).toEqual({ rot: 0, gelb: 1 });
  });

  it("drei Tore Rot, zwei Tore Gelb → 3:2", () => {
    const tore: TorInput[] = [
      { team: "Rot", eigentor: false },
      { team: "Rot", eigentor: false },
      { team: "Rot", eigentor: false },
      { team: "Gelb", eigentor: false },
      { team: "Gelb", eigentor: false },
    ];
    expect(deriveScore(tore)).toEqual({ rot: 3, gelb: 2 });
  });

  it("alle Tore für Rot → korrektes Ergebnis", () => {
    const tore: TorInput[] = Array(5).fill({ team: "Rot", eigentor: false });
    expect(deriveScore(tore)).toEqual({ rot: 5, gelb: 0 });
  });
});

// ---------------------------------------------------------------------------
// Eigentor — counts for opposing team, NOT scorer's team
// ---------------------------------------------------------------------------
describe("deriveScore — Eigentore", () => {
  it("Rot-Spieler schießt Eigentor → Gelb bekommt das Tor (team=Rot, eigentor=true)", () => {
    const tore: TorInput[] = [{ team: "Rot", eigentor: true }];
    expect(deriveScore(tore)).toEqual({ rot: 0, gelb: 1 });
  });

  it("Gelb-Spieler schießt Eigentor → Rot bekommt das Tor (team=Gelb, eigentor=true)", () => {
    const tore: TorInput[] = [{ team: "Gelb", eigentor: true }];
    expect(deriveScore(tore)).toEqual({ rot: 1, gelb: 0 });
  });

  it("Eigentor von Rot-Spieler wird NICHT Rot gutgeschrieben", () => {
    const tore: TorInput[] = [{ team: "Rot", eigentor: true }];
    expect(deriveScore(tore).rot).toBe(0);
  });

  it("Eigentor von Gelb-Spieler wird NICHT Gelb gutgeschrieben", () => {
    const tore: TorInput[] = [{ team: "Gelb", eigentor: true }];
    expect(deriveScore(tore).gelb).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Gemischte Szenarien
// ---------------------------------------------------------------------------
describe("deriveScore — gemischte Szenarien", () => {
  it("1 reguläres Rot + 1 Eigentor Rot → 1:1", () => {
    const tore: TorInput[] = [
      { team: "Rot", eigentor: false }, // +1 für Rot
      { team: "Rot", eigentor: true },  // +1 für Gelb (Eigentor)
    ];
    expect(deriveScore(tore)).toEqual({ rot: 1, gelb: 1 });
  });

  it("1 reguläres Gelb + 1 Eigentor Gelb → 1:1", () => {
    const tore: TorInput[] = [
      { team: "Gelb", eigentor: false }, // +1 für Gelb
      { team: "Gelb", eigentor: true },  // +1 für Rot (Eigentor)
    ];
    expect(deriveScore(tore)).toEqual({ rot: 1, gelb: 1 });
  });

  it("3 Rot + 1 Eigentor Gelb + 2 Gelb = Rot: 3+1=4, Gelb: 2", () => {
    const tore: TorInput[] = [
      { team: "Rot", eigentor: false },
      { team: "Rot", eigentor: false },
      { team: "Rot", eigentor: false },
      { team: "Gelb", eigentor: true },  // +1 für Rot
      { team: "Gelb", eigentor: false },
      { team: "Gelb", eigentor: false },
    ];
    expect(deriveScore(tore)).toEqual({ rot: 4, gelb: 2 });
  });

  it("2 Eigentore beider Teams + je 1 reguläres Tor → 2:2", () => {
    const tore: TorInput[] = [
      { team: "Rot", eigentor: false },   // +1 Rot regulär
      { team: "Gelb", eigentor: true },   // +1 Rot durch ET Gelb
      { team: "Gelb", eigentor: false },  // +1 Gelb regulär
      { team: "Rot", eigentor: true },    // +1 Gelb durch ET Rot
    ];
    expect(deriveScore(tore)).toEqual({ rot: 2, gelb: 2 });
  });

  it("nur Eigentore von beiden Teams", () => {
    const tore: TorInput[] = [
      { team: "Rot", eigentor: true },   // +1 für Gelb
      { team: "Rot", eigentor: true },   // +1 für Gelb
      { team: "Gelb", eigentor: true },  // +1 für Rot
    ];
    expect(deriveScore(tore)).toEqual({ rot: 1, gelb: 2 });
  });

  it("viele Tore, gemischt", () => {
    const tore: TorInput[] = [
      { team: "Rot", eigentor: false },   // Rot: +1
      { team: "Rot", eigentor: false },   // Rot: +1
      { team: "Rot", eigentor: true },    // Gelb: +1
      { team: "Gelb", eigentor: false },  // Gelb: +1
      { team: "Gelb", eigentor: false },  // Gelb: +1
      { team: "Gelb", eigentor: false },  // Gelb: +1
      { team: "Gelb", eigentor: true },   // Rot: +1
    ];
    // Rot: 2 regulär + 1 ET von Gelb = 3
    // Gelb: 3 regulär + 1 ET von Rot = 4
    expect(deriveScore(tore)).toEqual({ rot: 3, gelb: 4 });
  });
});
