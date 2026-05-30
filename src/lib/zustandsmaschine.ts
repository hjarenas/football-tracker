/**
 * Spiel-Zustandsmaschine — pure module encoding valid Spiel status transitions.
 *
 * Valid transitions:
 *   geplant           → teams_zugewiesen | abgesagt
 *   teams_zugewiesen  → abgeschlossen    | abgesagt
 *   abgeschlossen     → (terminal — no transitions)
 *   abgesagt          → (terminal — no transitions)
 */
import { SpielStatus } from "@prisma/client";

/** Map of valid target states for each source state. */
export const VALID_TRANSITIONS: Record<SpielStatus, SpielStatus[]> = {
  [SpielStatus.geplant]: [SpielStatus.teams_zugewiesen, SpielStatus.abgesagt],
  [SpielStatus.teams_zugewiesen]: [SpielStatus.abgeschlossen, SpielStatus.abgesagt],
  [SpielStatus.abgeschlossen]: [],
  [SpielStatus.abgesagt]: [],
};

/** Thrown when an invalid state transition is attempted. */
export class ZustandsmaschineError extends Error {
  constructor(von: SpielStatus, nach: SpielStatus) {
    super(
      `Ungültiger Zustandsübergang: ${von} → ${nach}. ` +
        `Erlaubte Folgezustände von "${von}": [${VALID_TRANSITIONS[von].join(", ") || "keine"}]`
    );
    this.name = "ZustandsmaschineError";
  }
}

/**
 * Returns true if transitioning from `von` to `nach` is a valid Spiel status transition.
 */
export function canTransition(von: SpielStatus, nach: SpielStatus): boolean {
  return VALID_TRANSITIONS[von].includes(nach);
}

/**
 * Performs the transition from `von` to `nach`.
 * Returns the new status on success.
 * Throws ZustandsmaschineError if the transition is not allowed.
 */
export function transition(von: SpielStatus, nach: SpielStatus): SpielStatus {
  if (!canTransition(von, nach)) {
    throw new ZustandsmaschineError(von, nach);
  }
  return nach;
}
