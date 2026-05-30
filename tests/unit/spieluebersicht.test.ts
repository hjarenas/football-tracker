/**
 * Unit tests for Spielübersicht display logic — Issue #10.
 *
 * Covers:
 *   - Score display: correct Rot:Gelb from Tor records
 *   - Winner determination: Rot wins, Gelb wins, draw (Unentschieden)
 *   - Eigentor attribution: shown under OPPONENT's team list
 *   - Abgesagt match: no score, no scorers listed
 *   - Not-finished match (geplant, teams_zugewiesen): no score shown
 */
import { describe, it, expect } from "vitest";
import {
  berechneSpielAnzeige,
  type SpielAnzeigeEingabe,
  type TorAnzeige,
} from "@/lib/spieluebersicht";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tor(
  scorerName: string,
  team: "Rot" | "Gelb",
  opts: { eigentor?: boolean; assistName?: string } = {}
): TorAnzeige {
  return {
    scorerName,
    team,
    eigentor: opts.eigentor ?? false,
    assistName: opts.assistName,
  };
}

// ---------------------------------------------------------------------------
// Abgesagt — cancelled matches
// ---------------------------------------------------------------------------

describe("berechneSpielAnzeige — Abgesagt", () => {
  it("zeigt keinen Score für abgesagte Spiele", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgesagt",
      tore: [],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.scoreVisible).toBe(false);
    expect(result.rotScore).toBeUndefined();
    expect(result.gelbScore).toBeUndefined();
  });

  it("zeigt keine Torschützen für abgesagte Spiele", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgesagt",
      tore: [tor("Müller", "Rot")],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.tore.rot).toHaveLength(0);
    expect(result.tore.gelb).toHaveLength(0);
  });

  it("setzt sieger auf null für abgesagte Spiele", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgesagt",
      tore: [],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.sieger).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Geplant / Teams zugewiesen — not finished yet
// ---------------------------------------------------------------------------

describe("berechneSpielAnzeige — Nicht abgeschlossen", () => {
  it("zeigt keinen Score für geplante Spiele", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "geplant",
      tore: [],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.scoreVisible).toBe(false);
    expect(result.sieger).toBeNull();
  });

  it("zeigt keinen Score für Spiele mit zugewiesenen Teams", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "teams_zugewiesen",
      tore: [],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.scoreVisible).toBe(false);
    expect(result.sieger).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Score display — abgeschlossen
// ---------------------------------------------------------------------------

describe("berechneSpielAnzeige — Score Anzeige (abgeschlossen)", () => {
  it("0:0 Unentschieden wenn keine Tore", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.scoreVisible).toBe(true);
    expect(result.rotScore).toBe(0);
    expect(result.gelbScore).toBe(0);
    expect(result.sieger).toBe("Unentschieden");
  });

  it("korrekte Score 3:1 (3 Rot-Tore, 1 Gelb-Tor)", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [
        tor("Schmidt", "Rot"),
        tor("Müller", "Rot"),
        tor("Fischer", "Rot"),
        tor("Wagner", "Gelb"),
      ],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.rotScore).toBe(3);
    expect(result.gelbScore).toBe(1);
  });

  it("korrekte Score 2:4 (2 Rot-Tore, 4 Gelb-Tore)", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [
        tor("A", "Rot"),
        tor("B", "Rot"),
        tor("C", "Gelb"),
        tor("D", "Gelb"),
        tor("E", "Gelb"),
        tor("F", "Gelb"),
      ],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.rotScore).toBe(2);
    expect(result.gelbScore).toBe(4);
  });

  it("scoreVisible ist true für abgeschlossene Spiele", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [tor("X", "Rot")],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.scoreVisible).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Winner determination
// ---------------------------------------------------------------------------

describe("berechneSpielAnzeige — Sieger-Bestimmung", () => {
  it("Rot gewinnt wenn Rot-Score > Gelb-Score", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [tor("A", "Rot"), tor("B", "Rot"), tor("C", "Gelb")],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.sieger).toBe("Rot");
  });

  it("Gelb gewinnt wenn Gelb-Score > Rot-Score", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [tor("A", "Gelb"), tor("B", "Gelb"), tor("C", "Rot")],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.sieger).toBe("Gelb");
  });

  it("Unentschieden wenn Scores gleich", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [tor("A", "Rot"), tor("B", "Gelb")],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.sieger).toBe("Unentschieden");
  });

  it("Unentschieden bei 0:0", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.sieger).toBe("Unentschieden");
  });

  it("Unentschieden bei 3:3", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [
        tor("A", "Rot"),
        tor("B", "Rot"),
        tor("C", "Rot"),
        tor("D", "Gelb"),
        tor("E", "Gelb"),
        tor("F", "Gelb"),
      ],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.sieger).toBe("Unentschieden");
  });
});

// ---------------------------------------------------------------------------
// Eigentor attribution — shown under OPPONENT's list
// ---------------------------------------------------------------------------

describe("berechneSpielAnzeige — Eigentor-Zuordnung", () => {
  it("Eigentor von Rot-Spieler erscheint in Gelb-Torschützenliste", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [tor("Müller", "Rot", { eigentor: true })],
    };
    const result = berechneSpielAnzeige(eingabe);
    // Rot player scores own goal → benefits Gelb → appears in Gelb list
    expect(result.tore.gelb).toHaveLength(1);
    expect(result.tore.gelb[0].scorerName).toBe("Müller");
    expect(result.tore.gelb[0].eigentor).toBe(true);
    // Must NOT appear in Rot list
    expect(result.tore.rot).toHaveLength(0);
  });

  it("Eigentor von Gelb-Spieler erscheint in Rot-Torschützenliste", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [tor("Wagner", "Gelb", { eigentor: true })],
    };
    const result = berechneSpielAnzeige(eingabe);
    // Gelb player scores own goal → benefits Rot → appears in Rot list
    expect(result.tore.rot).toHaveLength(1);
    expect(result.tore.rot[0].scorerName).toBe("Wagner");
    expect(result.tore.rot[0].eigentor).toBe(true);
    // Must NOT appear in Gelb list
    expect(result.tore.gelb).toHaveLength(0);
  });

  it("Eigentor-Score wird korrekt berechnet (Rot-ET → Gelb +1)", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [tor("Müller", "Rot", { eigentor: true })],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.rotScore).toBe(0);
    expect(result.gelbScore).toBe(1);
  });

  it("Eigentor-Score wird korrekt berechnet (Gelb-ET → Rot +1)", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [tor("Wagner", "Gelb", { eigentor: true })],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.rotScore).toBe(1);
    expect(result.gelbScore).toBe(0);
  });

  it("Eigentor entscheidet Spiel: Gelb-ET macht Rot zum Sieger", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [tor("Wagner", "Gelb", { eigentor: true })],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.sieger).toBe("Rot");
  });

  it("gemischte Tore: regulär + Eigentore korrekt zugeordnet", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [
        tor("Schmidt", "Rot"),               // Rot regular → Rot list
        tor("Müller", "Rot", { eigentor: true }), // Rot ET → Gelb list
        tor("Wagner", "Gelb"),              // Gelb regular → Gelb list
        tor("Becker", "Gelb", { eigentor: true }), // Gelb ET → Rot list
      ],
    };
    const result = berechneSpielAnzeige(eingabe);
    // Rot list: Schmidt (regular) + Becker (Gelb ET)
    expect(result.tore.rot).toHaveLength(2);
    expect(result.tore.rot.map((t) => t.scorerName)).toContain("Schmidt");
    expect(result.tore.rot.map((t) => t.scorerName)).toContain("Becker");
    // Gelb list: Müller (Rot ET) + Wagner (regular)
    expect(result.tore.gelb).toHaveLength(2);
    expect(result.tore.gelb.map((t) => t.scorerName)).toContain("Müller");
    expect(result.tore.gelb.map((t) => t.scorerName)).toContain("Wagner");
    // Score: Rot = 1(Schmidt) + 1(Becker ET) = 2, Gelb = 1(Wagner) + 1(Müller ET) = 2
    expect(result.rotScore).toBe(2);
    expect(result.gelbScore).toBe(2);
    expect(result.sieger).toBe("Unentschieden");
  });
});

// ---------------------------------------------------------------------------
// Assists
// ---------------------------------------------------------------------------

describe("berechneSpielAnzeige — Vorlagen", () => {
  it("Vorlage wird korrekt übernommen", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [tor("Schmidt", "Rot", { assistName: "Müller" })],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.tore.rot[0].assistName).toBe("Müller");
  });

  it("kein assistName wenn kein Assist", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [tor("Schmidt", "Rot")],
    };
    const result = berechneSpielAnzeige(eingabe);
    expect(result.tore.rot[0].assistName).toBeUndefined();
  });

  it("Vorlage bei Eigentor wird mitvererbt", () => {
    const eingabe: SpielAnzeigeEingabe = {
      status: "abgeschlossen",
      tore: [tor("Müller", "Rot", { eigentor: true, assistName: "Irrtum" })],
    };
    const result = berechneSpielAnzeige(eingabe);
    // Listed under Gelb (Rot ET)
    expect(result.tore.gelb[0].assistName).toBe("Irrtum");
  });
});
