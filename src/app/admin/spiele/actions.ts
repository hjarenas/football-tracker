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
