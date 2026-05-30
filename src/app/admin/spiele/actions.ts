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
// Spiel bearbeiten — Edit actions for completed (abgeschlossen) matches
// ---------------------------------------------------------------------------

export interface SpielGrunddatenBearbeitenResult {
  fehler?: string;
}

/**
 * Edits the basic data (datum, bierbringer, attendees) of an abgeschlossen Spiel.
 * Status remains abgeschlossen.
 */
export async function spielGrunddatenBearbeitenAction(
  spielId: string,
  formData: FormData
): Promise<SpielGrunddatenBearbeitenResult> {
  const datumStr = formData.get("datum") as string | null;
  const bierbringerId = formData.get("bierbringerId") as string | null;
  const teilnehmerIds = formData.getAll("teilnehmerIds") as string[];

  if (!datumStr) {
    return { fehler: "Datum ist erforderlich." };
  }
  if (teilnehmerIds.length === 0) {
    return { fehler: "Mindestens ein Teilnehmer muss ausgewählt werden." };
  }

  try {
    const spiel = await prisma.spiel.findUnique({
      where: { id: spielId },
      include: { teilnahmen: true },
    });

    if (!spiel) {
      return { fehler: "Spiel nicht gefunden." };
    }

    if (spiel.status !== SpielStatus.abgeschlossen) {
      return { fehler: "Nur abgeschlossene Spiele können bearbeitet werden." };
    }

    const jahr = new Date(datumStr).getFullYear();

    await prisma.$transaction(async (tx) => {
      // Upsert Saison for the new year (in case date changes year)
      const saison = await tx.saison.upsert({
        where: { jahr },
        update: {},
        create: { jahr },
      });

      // Update Spiel basic fields — status unchanged
      await tx.spiel.update({
        where: { id: spielId },
        data: {
          datum: new Date(datumStr),
          bierbringerId: bierbringerId || null,
          saisonId: saison.id,
          // status intentionally NOT changed
        },
      });

      // Reconcile attendees: add new, remove removed
      const existingIds = spiel.teilnahmen.map((t) => t.spielerId);
      const toAdd = teilnehmerIds.filter((id) => !existingIds.includes(id));
      const toRemove = spiel.teilnahmen.filter(
        (t) => !teilnehmerIds.includes(t.spielerId)
      );

      // Remove Teilnahmen that are no longer in the list
      if (toRemove.length > 0) {
        await tx.spielteilnahme.deleteMany({
          where: { id: { in: toRemove.map((t) => t.id) } },
        });
      }

      // Add new Teilnahmen (team null — admin must reassign if needed)
      for (const spielerId of toAdd) {
        await tx.spielteilnahme.create({
          data: { spielId, spielerId, team: null },
        });
      }
    });

    revalidatePath(`/admin/spiele/${spielId}`);
    revalidatePath("/admin/spiele");
    revalidatePath("/spiele");
    return {};
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) {
      throw e;
    }
    console.error("Fehler beim Bearbeiten der Grunddaten:", e);
    return { fehler: "Die Grunddaten konnten nicht gespeichert werden." };
  }
}

export interface TeamsBearbeitenResult {
  fehler?: string;
}

/**
 * Updates team assignments and punkteOverride for an abgeschlossen Spiel.
 * Status remains abgeschlossen.
 */
export async function teamsBearbeitenAction(
  spielId: string,
  formData: FormData
): Promise<TeamsBearbeitenResult> {
  try {
    const spiel = await prisma.spiel.findUnique({
      where: { id: spielId },
      include: { teilnahmen: true },
    });

    if (!spiel) {
      return { fehler: "Spiel nicht gefunden." };
    }

    if (spiel.status !== SpielStatus.abgeschlossen) {
      return { fehler: "Nur abgeschlossene Spiele können bearbeitet werden." };
    }

    const updates: { id: string; team: Team; punkteOverride: Team | null }[] = [];

    for (const teilnahme of spiel.teilnahmen) {
      const teamValue = formData.get(`team_${teilnahme.id}`) as string | null;
      if (!teamValue || (teamValue !== "Rot" && teamValue !== "Gelb")) {
        return { fehler: "Alle Spieler müssen einem Team zugewiesen werden." };
      }
      const team = teamValue as Team;

      const overrideValue = formData.get(`override_${teilnahme.id}`) as string | null;
      let punkteOverride: Team | null = null;
      if (overrideValue && (overrideValue === "Rot" || overrideValue === "Gelb")) {
        punkteOverride = overrideValue as Team;
      }

      updates.push({ id: teilnahme.id, team, punkteOverride });
    }

    await prisma.$transaction(
      updates.map(({ id, team, punkteOverride }) =>
        prisma.spielteilnahme.update({
          where: { id },
          data: { team, punkteOverride },
        })
      )
    );

    revalidatePath(`/admin/spiele/${spielId}`);
    revalidatePath("/spiele");
    return {};
  } catch (e) {
    if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) {
      throw e;
    }
    console.error("Fehler beim Bearbeiten der Teams:", e);
    return { fehler: "Die Teams konnten nicht gespeichert werden." };
  }
}

export interface TorBearbeitenResult {
  fehler?: string;
}

/**
 * Updates an existing Tor record on an abgeschlossen Spiel.
 */
export async function torBearbeitenAction(
  spielId: string,
  torId: string,
  formData: FormData
): Promise<TorBearbeitenResult> {
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

    if (spiel.status !== SpielStatus.abgeschlossen) {
      return { fehler: "Tore können nur bei abgeschlossenen Spielen bearbeitet werden." };
    }

    await prisma.tor.update({
      where: { id: torId },
      data: {
        scorerId,
        assistId: assistId || null,
        eigentor,
        team,
      },
    });

    revalidatePath(`/admin/spiele/${spielId}`);
    return {};
  } catch (e) {
    console.error("Fehler beim Bearbeiten des Tores:", e);
    return { fehler: "Das Tor konnte nicht gespeichert werden." };
  }
}

export interface TorHinzufuegenAbgeschlossenResult {
  fehler?: string;
  torId?: string;
}

/**
 * Adds a new Tor record to an abgeschlossen Spiel (to correct data entry mistakes).
 */
export async function torHinzufuegenAbgeschlossenAction(
  spielId: string,
  formData: FormData
): Promise<TorHinzufuegenAbgeschlossenResult> {
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

    if (spiel.status !== SpielStatus.abgeschlossen) {
      return { fehler: "Tore können nur bei abgeschlossenen Spielen hinzugefügt werden." };
    }

    const tor = await prisma.tor.create({
      data: { spielId, scorerId, assistId: assistId || null, eigentor, team },
    });

    revalidatePath(`/admin/spiele/${spielId}`);
    return { torId: tor.id };
  } catch (e) {
    console.error("Fehler beim Hinzufügen des Tores:", e);
    return { fehler: "Das Tor konnte nicht gespeichert werden." };
  }
}

export interface TorLoeschenAbgeschlossenResult {
  fehler?: string;
}

/**
 * Deletes a Tor record from an abgeschlossen Spiel.
 */
export async function torLoeschenAbgeschlossenAction(
  spielId: string,
  torId: string
): Promise<TorLoeschenAbgeschlossenResult> {
  try {
    const spiel = await prisma.spiel.findUnique({
      where: { id: spielId },
      select: { status: true },
    });

    if (!spiel) {
      return { fehler: "Spiel nicht gefunden." };
    }

    if (spiel.status !== SpielStatus.abgeschlossen) {
      return { fehler: "Tore können nur bei abgeschlossenen Spielen gelöscht werden." };
    }

    await prisma.tor.delete({ where: { id: torId } });

    revalidatePath(`/admin/spiele/${spielId}`);
    return {};
  } catch (e) {
    console.error("Fehler beim Löschen des Tores:", e);
    return { fehler: "Das Tor konnte nicht gelöscht werden." };
  }
}

// naechstenDienstagBerechnen has been moved to @/lib/datum-utils
// to comply with Next.js 16 requirement that all exports from "use server"
// files must be async functions.
