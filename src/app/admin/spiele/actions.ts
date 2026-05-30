"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { transition } from "@/lib/zustandsmaschine";
import { SpielStatus, Team } from "@prisma/client";

export interface SpielPlanenResult {
  fehler?: string;
}

/**
 * Erstellt ein neues Spiel mit Status "geplant" und Spielteilnahme-Einträge
 * für alle gewählten Teilnehmer (team noch nicht zugewiesen).
 */
export async function spielPlanenAction(
  formData: FormData
): Promise<SpielPlanenResult> {
  const datumStr = formData.get("datum") as string | null;
  const bierbringerId = formData.get("bierbringerId") as string | null;
  const teilnehmerIds = formData.getAll("teilnehmerIds") as string[];

  if (!datumStr) {
    return { fehler: "Datum ist erforderlich." };
  }

  if (teilnehmerIds.length === 0) {
    return { fehler: "Mindestens ein Teilnehmer muss ausgewählt werden." };
  }

  // Find or create Saison for the year of the datum
  const jahr = new Date(datumStr).getFullYear();

  try {
    const saison = await prisma.saison.upsert({
      where: { jahr },
      update: {},
      create: { jahr },
    });

    const spiel = await prisma.spiel.create({
      data: {
        datum: new Date(datumStr),
        saisonId: saison.id,
        bierbringerId: bierbringerId || null,
        status: "geplant",
        teilnahmen: {
          create: teilnehmerIds.map((spielerId) => ({
            spielerId,
            team: null,
          })),
        },
      },
    });

    revalidatePath("/admin/spiele");
    redirect(`/admin/spiele`);
  } catch (e) {
    if (
      e instanceof Error &&
      e.message.includes("NEXT_REDIRECT")
    ) {
      throw e;
    }
    console.error("Fehler beim Erstellen des Spiels:", e);
    return { fehler: "Das Spiel konnte nicht gespeichert werden." };
  }
}

export interface TeamsZuweisenResult {
  fehler?: string;
}

/**
 * Assigns each Spielteilnahme to Rot or Gelb and transitions the Spiel
 * to status `teams_zugewiesen`. All attendees must have a team assigned.
 */
export async function teamsZuweisenAction(
  spielId: string,
  formData: FormData
): Promise<TeamsZuweisenResult> {
  try {
    const spiel = await prisma.spiel.findUnique({
      where: { id: spielId },
      include: { teilnahmen: true },
    });

    if (!spiel) {
      return { fehler: "Spiel nicht gefunden." };
    }

    // Validate we can transition (must be geplant)
    try {
      transition(spiel.status, SpielStatus.teams_zugewiesen);
    } catch {
      return {
        fehler: `Ungültiger Zustandsübergang: Spiel ist bereits "${spiel.status}".`,
      };
    }

    // Parse team assignments from FormData
    const assignments: { id: string; team: Team; punkteOverride: Team | null }[] = [];

    for (const teilnahme of spiel.teilnahmen) {
      const teamValue = formData.get(`team_${teilnahme.id}`) as string | null;
      if (!teamValue || (teamValue !== "Rot" && teamValue !== "Gelb")) {
        return {
          fehler: `Alle Spieler müssen einem Team zugewiesen werden.`,
        };
      }
      const team = teamValue as Team;

      const overrideValue = formData.get(`override_${teilnahme.id}`) as string | null;
      let punkteOverride: Team | null = null;
      if (overrideValue && (overrideValue === "Rot" || overrideValue === "Gelb")) {
        punkteOverride = overrideValue as Team;
      }

      assignments.push({ id: teilnahme.id, team, punkteOverride });
    }

    // All assigned — update in a transaction
    await prisma.$transaction([
      // Update each Spielteilnahme
      ...assignments.map(({ id, team, punkteOverride }) =>
        prisma.spielteilnahme.update({
          where: { id },
          data: { team, punkteOverride },
        })
      ),
      // Transition the Spiel to teams_zugewiesen
      prisma.spiel.update({
        where: { id: spielId },
        data: { status: SpielStatus.teams_zugewiesen },
      }),
    ]);

    revalidatePath(`/admin/spiele/${spielId}`);
    revalidatePath("/admin/spiele");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) {
      throw e;
    }
    console.error("Fehler beim Zuweisen der Teams:", e);
    return { fehler: "Teams konnten nicht gespeichert werden." };
  }

  redirect(`/admin/spiele/${spielId}`);
}

// ---------------------------------------------------------------------------
// Tor erfassen — Step 3
// ---------------------------------------------------------------------------

export interface TorErfassenResult {
  fehler?: string;
  torId?: string;
}

/**
 * Adds a new Tor record to a Spiel (status must be `teams_zugewiesen`).
 * Returns the new Tor's id on success.
 */
export async function torErfassenAction(
  spielId: string,
  formData: FormData
): Promise<TorErfassenResult> {
  const scorerId = formData.get("scorerId") as string | null;
  const assistId = formData.get("assistId") as string | null;
  const eigentorValue = formData.get("eigentor") as string | null;
  const teamValue = formData.get("team") as string | null;

  if (!scorerId) {
    return { fehler: "Torschütze ist erforderlich." };
  }
  if (!teamValue || (teamValue !== "Rot" && teamValue !== "Gelb")) {
    return { fehler: "Team ist erforderlich." };
  }
  if (assistId && assistId === scorerId) {
    return { fehler: "Torschütze und Vorlagengeber dürfen nicht identisch sein." };
  }

  const eigentor = eigentorValue === "true";
  const team = teamValue as Team;

  try {
    const spiel = await prisma.spiel.findUnique({
      where: { id: spielId },
      select: { status: true },
    });

    if (!spiel) {
      return { fehler: "Spiel nicht gefunden." };
    }

    if (spiel.status !== "teams_zugewiesen") {
      return { fehler: "Tore können nur bei Status 'teams_zugewiesen' erfasst werden." };
    }

    const tor = await prisma.tor.create({
      data: {
        spielId,
        scorerId,
        assistId: assistId || null,
        eigentor,
        team,
      },
    });

    revalidatePath(`/admin/spiele/${spielId}`);
    return { torId: tor.id };
  } catch (e) {
    console.error("Fehler beim Erfassen des Tores:", e);
    return { fehler: "Das Tor konnte nicht gespeichert werden." };
  }
}

export interface TorLoeschenResult {
  fehler?: string;
}

/**
 * Deletes a Tor record from a Spiel.
 */
export async function torLoeschenAction(
  spielId: string,
  torId: string
): Promise<TorLoeschenResult> {
  try {
    const spiel = await prisma.spiel.findUnique({
      where: { id: spielId },
      select: { status: true },
    });

    if (!spiel) {
      return { fehler: "Spiel nicht gefunden." };
    }

    if (spiel.status !== "teams_zugewiesen") {
      return { fehler: "Tore können nur bei Status 'teams_zugewiesen' gelöscht werden." };
    }

    await prisma.tor.delete({ where: { id: torId } });

    revalidatePath(`/admin/spiele/${spielId}`);
    return {};
  } catch (e) {
    console.error("Fehler beim Löschen des Tores:", e);
    return { fehler: "Das Tor konnte nicht gelöscht werden." };
  }
}

export interface SpielAbschliessenResult {
  fehler?: string;
}

/**
 * Transitions a Spiel from `teams_zugewiesen` to `abgeschlossen`.
 */
export async function spielAbschliessenAction(
  spielId: string
): Promise<SpielAbschliessenResult> {
  try {
    const spiel = await prisma.spiel.findUnique({
      where: { id: spielId },
      select: { status: true },
    });

    if (!spiel) {
      return { fehler: "Spiel nicht gefunden." };
    }

    try {
      transition(spiel.status, SpielStatus.abgeschlossen);
    } catch {
      return {
        fehler: `Ungültiger Zustandsübergang: Spiel ist bereits "${spiel.status}".`,
      };
    }

    await prisma.spiel.update({
      where: { id: spielId },
      data: { status: SpielStatus.abgeschlossen },
    });

    revalidatePath(`/admin/spiele/${spielId}`);
    revalidatePath("/admin/spiele");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) {
      throw e;
    }
    console.error("Fehler beim Abschließen des Spiels:", e);
    return { fehler: "Das Spiel konnte nicht abgeschlossen werden." };
  }

  redirect(`/admin/spiele/${spielId}`);
}

// ---------------------------------------------------------------------------
// Spiel absagen — Cancel action (only geplant → abgesagt)
// ---------------------------------------------------------------------------

export interface SpielAbsagenResult {
  fehler?: string;
}

/**
 * Transitions a Spiel from `geplant` to `abgesagt`.
 * Only Spiele with status `geplant` can be cancelled via this action.
 * Matches with status `teams_zugewiesen` or `abgeschlossen` are rejected.
 */
export async function spielAbsagenAction(
  spielId: string
): Promise<SpielAbsagenResult> {
  try {
    const spiel = await prisma.spiel.findUnique({
      where: { id: spielId },
      select: { status: true },
    });

    if (!spiel) {
      return { fehler: "Spiel nicht gefunden." };
    }

    // Guard: only geplant matches may be cancelled via this action
    if (spiel.status !== SpielStatus.geplant) {
      return {
        fehler: `Nur geplante Spiele können abgesagt werden. Status ist derzeit "${spiel.status}".`,
      };
    }

    // Validate via Zustandsmaschine (double-check)
    try {
      transition(spiel.status, SpielStatus.abgesagt);
    } catch {
      return {
        fehler: `Ungültiger Zustandsübergang: Spiel ist bereits "${spiel.status}".`,
      };
    }

    await prisma.spiel.update({
      where: { id: spielId },
      data: { status: SpielStatus.abgesagt },
    });

    revalidatePath(`/admin/spiele/${spielId}`);
    revalidatePath("/admin/spiele");
    revalidatePath("/spiele");
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) {
      throw e;
    }
    console.error("Fehler beim Absagen des Spiels:", e);
    return { fehler: "Das Spiel konnte nicht abgesagt werden." };
  }

  redirect(`/admin/spiele/${spielId}`);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
