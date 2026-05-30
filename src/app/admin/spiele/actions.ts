"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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
