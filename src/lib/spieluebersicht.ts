/**
 * Display logic for the public Spielübersicht page — Issue #10.
 *
 * Pure module — no database calls. Derives all display data from raw Tor records.
 *
 * Rules:
 *   - Score derived via deriveScore (never stored — ADR-0002)
 *   - Abgesagt matches show no score and no scorers
 *   - Eigentore shown under the OPPONENT's scorer list (attributed to the correct team)
 *   - Winning team determined by derived score; equal → "Unentschieden"
 */

import { deriveScore } from "@/lib/score";

export type Team = "Rot" | "Gelb";

export type SpielStatus =
  | "geplant"
  | "teams_zugewiesen"
  | "abgeschlossen"
  | "abgesagt";

export interface TorAnzeige {
  scorerName: string;
  assistName?: string;
  eigentor: boolean;
  team: Team; // the SHOOTING player's team (same as in Tor.team)
}

export interface SpielAnzeigeEingabe {
  status: SpielStatus;
  tore: TorAnzeige[];
}

export type Sieger = "Rot" | "Gelb" | "Unentschieden" | null;

/** Scorers + assists attributed to the team that BENEFITS from the goal. */
export interface TeamToreListe {
  rot: TorAnzeigeZeile[];
  gelb: TorAnzeigeZeile[];
}

export interface TorAnzeigeZeile {
  scorerName: string;
  assistName?: string;
  eigentor: boolean;
}

export interface SpielAnzeigeErgebnis {
  /** Whether to show a score (false for abgesagt) */
  scoreVisible: boolean;
  /** Rot's score (undefined when not visible) */
  rotScore?: number;
  /** Gelb's score (undefined when not visible) */
  gelbScore?: number;
  /** Winning team, draw, or null if not applicable (abgesagt / not finished) */
  sieger: Sieger;
  /** Goal + assist lines per team. Empty lists for abgesagt / not finished. */
  tore: TeamToreListe;
}

/**
 * Derives all display data for a match entry.
 *
 * For abgesagt matches: scoreVisible=false, sieger=null, empty tore lists.
 * For abgeschlossen matches: score derived from tore, sieger determined, tore attributed by benefit.
 * For other statuses (geplant, teams_zugewiesen): scoreVisible=false, sieger=null, tore listed.
 *
 * Eigentor attribution:
 *   A Rot-player's eigentor benefits Gelb → listed under Gelb's scorer list.
 *   A Gelb-player's eigentor benefits Rot → listed under Rot's scorer list.
 */
export function berechneSpielAnzeige(
  eingabe: SpielAnzeigeEingabe
): SpielAnzeigeErgebnis {
  const { status, tore } = eingabe;

  if (status === "abgesagt") {
    return {
      scoreVisible: false,
      sieger: null,
      tore: { rot: [], gelb: [] },
    };
  }

  if (status !== "abgeschlossen") {
    // geplant or teams_zugewiesen — no score yet, but show participants if any
    return {
      scoreVisible: false,
      sieger: null,
      tore: { rot: [], gelb: [] },
    };
  }

  // Derive score
  const ergebnis = deriveScore(
    tore.map((t) => ({ team: t.team, eigentor: t.eigentor }))
  );

  // Determine winner
  let sieger: Sieger;
  if (ergebnis.rot > ergebnis.gelb) {
    sieger = "Rot";
  } else if (ergebnis.gelb > ergebnis.rot) {
    sieger = "Gelb";
  } else {
    sieger = "Unentschieden";
  }

  // Attribute goals to the BENEFITING team
  const rotTore: TorAnzeigeZeile[] = [];
  const gelbTore: TorAnzeigeZeile[] = [];

  for (const tor of tore) {
    const zeile: TorAnzeigeZeile = {
      scorerName: tor.scorerName,
      assistName: tor.assistName,
      eigentor: tor.eigentor,
    };

    if (tor.eigentor) {
      // Eigentor: benefits the OPPONENT
      if (tor.team === "Rot") {
        // Rot player's eigentor → counts for Gelb
        gelbTore.push(zeile);
      } else {
        // Gelb player's eigentor → counts for Rot
        rotTore.push(zeile);
      }
    } else {
      // Regular goal: counts for the shooter's own team
      if (tor.team === "Rot") {
        rotTore.push(zeile);
      } else {
        gelbTore.push(zeile);
      }
    }
  }

  return {
    scoreVisible: true,
    rotScore: ergebnis.rot,
    gelbScore: ergebnis.gelb,
    sieger,
    tore: { rot: rotTore, gelb: gelbTore },
  };
}
