/**
 * Date utility functions for Dienstagskicken.
 * Extracted from actions.ts since "use server" files require all exports to be async.
 */

/**
 * Returns the next Tuesday from today (or today if today is Tuesday).
 * Returns ISO date string "YYYY-MM-DD".
 */
export function naechstenDienstagBerechnen(heute: Date = new Date()): string {
  const tag = heute.getDay(); // 0=Sun, 1=Mon, 2=Tue, ...
  const daysUntilTuesday = tag === 2 ? 7 : (2 - tag + 7) % 7 || 7;
  const naechsterDienstag = new Date(heute);
  naechsterDienstag.setDate(heute.getDate() + daysUntilTuesday);
  return naechsterDienstag.toISOString().slice(0, 10);
}
