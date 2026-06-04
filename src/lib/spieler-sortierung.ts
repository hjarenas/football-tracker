/**
 * Spieler-Sortierung module for Dienstagskicken — Issue #18.
 *
 * Pure computation module — no database calls.
 * Accepts a list of Spieler annotated with their most recent Spielteilnahme
 * date (or null) and a reference date, and returns the list partitioned into
 * three activity buckets, alphabetically sorted within each.
 *
 * Bucket 1: last participation within 90 days of reference date (inclusive)
 * Bucket 2: last participation within 365 days but not within 90 days (inclusive)
 * Bucket 3: no participation in the last 365 days, or never participated (null)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A Spieler annotated with their most recent Spielteilnahme date. */
export interface SpielerMitLetzterTeilnahme {
  id: string;
  name: string;
  /** The date of the most recent Spielteilnahme, or null if never participated. */
  letzteTeilnahme: Date | null;
}

/** Result of the sorting operation, partitioned into three activity buckets. */
export interface SortiertesSpielerErgebnis {
  /** Spieler whose last participation was within 90 days of the reference date. */
  eimer1: SpielerMitLetzterTeilnahme[];
  /** Spieler whose last participation was within 365 days but not within 90 days. */
  eimer2: SpielerMitLetzterTeilnahme[];
  /** Spieler who have not participated in the last 365 days, or never participated. */
  eimer3: SpielerMitLetzterTeilnahme[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAGE_EIMER1 = 90;
const TAGE_EIMER2 = 365;

// ---------------------------------------------------------------------------
// Pure sorting function
// ---------------------------------------------------------------------------

/**
 * Sorts Spieler into three activity buckets based on their most recent
 * Spielteilnahme date relative to the reference date.
 *
 * Bucket 1: participated within the last 90 days (inclusive)
 * Bucket 2: participated within the last 365 days but not within 90 days (inclusive)
 * Bucket 3: last participated more than 365 days ago, or never participated (null)
 *
 * Within each bucket, Spieler are sorted alphabetically by name.
 */
export function sortiereSpielerNachAktivitaet(
  spieler: SpielerMitLetzterTeilnahme[],
  referenzDatum: Date
): SortiertesSpielerErgebnis {
  const eimer1: SpielerMitLetzterTeilnahme[] = [];
  const eimer2: SpielerMitLetzterTeilnahme[] = [];
  const eimer3: SpielerMitLetzterTeilnahme[] = [];

  for (const s of spieler) {
    if (s.letzteTeilnahme === null) {
      eimer3.push(s);
      continue;
    }

    const differenzMs = referenzDatum.getTime() - s.letzteTeilnahme.getTime();
    const differenzTage = differenzMs / (1000 * 60 * 60 * 24);

    if (differenzTage <= TAGE_EIMER1) {
      eimer1.push(s);
    } else if (differenzTage <= TAGE_EIMER2) {
      eimer2.push(s);
    } else {
      eimer3.push(s);
    }
  }

  const alphabetisch = (
    a: SpielerMitLetzterTeilnahme,
    b: SpielerMitLetzterTeilnahme
  ) => a.name.localeCompare(b.name);

  return {
    eimer1: eimer1.sort(alphabetisch),
    eimer2: eimer2.sort(alphabetisch),
    eimer3: eimer3.sort(alphabetisch),
  };
}
