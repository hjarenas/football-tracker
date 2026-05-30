/**
 * Score derivation for Dienstagskicken matches.
 *
 * Score is NEVER stored — always derived from Tor records (ADR-0002).
 *
 * Derivation rule:
 *   Rot  = COUNT(Tor WHERE team=Rot  AND NOT eigentor) + COUNT(Tor WHERE team=Gelb AND eigentor)
 *   Gelb = COUNT(Tor WHERE team=Gelb AND NOT eigentor) + COUNT(Tor WHERE team=Rot  AND eigentor)
 *
 * The `team` field on Tor refers to the SHOOTING player's own team.
 * An eigentor counts for the OPPONENT (not the scorer's team).
 */

/** Minimal Tor shape required for score derivation. */
export interface TorFuerErgebnis {
  team: "Rot" | "Gelb";
  eigentor: boolean;
}

/** Derived match score. */
export interface Ergebnis {
  rot: number;
  gelb: number;
}

/**
 * Derives the match score from a list of Tor records.
 *
 * Regular goal: `team` gets the goal.
 * Eigentor: the OPPONENT of `team` gets the goal.
 */
export function deriveScore(tore: TorFuerErgebnis[]): Ergebnis {
  let rot = 0;
  let gelb = 0;

  for (const tor of tore) {
    if (tor.eigentor) {
      // Eigentor: counts for the OPPONENT
      if (tor.team === "Rot") {
        gelb += 1; // Rot player scores own goal → Gelb benefits
      } else {
        rot += 1; // Gelb player scores own goal → Rot benefits
      }
    } else {
      // Regular goal: counts for the shooter's team
      if (tor.team === "Rot") {
        rot += 1;
      } else {
        gelb += 1;
      }
    }
  }

  return { rot, gelb };
}
