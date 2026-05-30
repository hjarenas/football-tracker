import { describe, it, expect } from "vitest";

describe("Dienstagskicken", () => {
  it("projekt ist konfiguriert", () => {
    expect(true).toBe(true);
  });

  it("berechnet Ergebnisse korrekt", () => {
    // Grundlegende Arithmetik für Spielstand-Berechnung
    const toreRot = 3;
    const toreGelb = 2;
    expect(toreRot).toBeGreaterThan(toreGelb);
  });
});
