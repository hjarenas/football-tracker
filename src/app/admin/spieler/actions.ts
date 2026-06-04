"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface SpielerErstellenResult {
  id?: string;
  name?: string;
  fehler?: string;
}

/**
 * Creates a new Spieler with aktiv = true and vereinsmitglied = false.
 */
export async function spielerErstellenAction(
  name: string
): Promise<SpielerErstellenResult> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { fehler: "Name ist erforderlich." };
  }

  try {
    const spieler = await prisma.spieler.create({
      data: {
        name: trimmedName,
        aktiv: true,
        vereinsmitglied: false,
      },
    });

    revalidatePath("/admin/spieler");
    return { id: spieler.id, name: spieler.name };
  } catch (e) {
    if (
      e instanceof Error &&
      e.message.includes("Unique constraint failed")
    ) {
      return { fehler: `Ein Spieler mit dem Namen "${trimmedName}" existiert bereits.` };
    }
    console.error("Fehler beim Erstellen des Spielers:", e);
    return { fehler: "Der Spieler konnte nicht gespeichert werden." };
  }
}

export interface SpielerUmbenennenResult {
  fehler?: string;
}

/**
 * Renames a Spieler.
 */
export async function spielerUmbenennenAction(
  id: string,
  name: string
): Promise<SpielerUmbenennenResult> {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { fehler: "Name ist erforderlich." };
  }

  try {
    await prisma.spieler.update({
      where: { id },
      data: { name: trimmedName },
    });

    revalidatePath("/admin/spieler");
    return {};
  } catch (e) {
    if (
      e instanceof Error &&
      e.message.includes("Unique constraint failed")
    ) {
      return { fehler: `Ein Spieler mit dem Namen "${trimmedName}" existiert bereits.` };
    }
    console.error("Fehler beim Umbenennen des Spielers:", e);
    return { fehler: "Der Spieler konnte nicht umbenannt werden." };
  }
}

export interface SpielerAktivToggleResult {
  fehler?: string;
}

/**
 * Toggles the aktiv flag of a Spieler.
 */
export async function spielerAktivToggleAction(
  id: string,
  aktiv: boolean
): Promise<SpielerAktivToggleResult> {
  try {
    await prisma.spieler.update({
      where: { id },
      data: { aktiv },
    });

    revalidatePath("/admin/spieler");
    revalidatePath("/admin/spiele/neu");
    return {};
  } catch (e) {
    console.error("Fehler beim Ändern des aktiv-Status:", e);
    return { fehler: "Der aktiv-Status konnte nicht geändert werden." };
  }
}

export interface SpielerVereinsToggleResult {
  fehler?: string;
}

/**
 * Toggles the vereinsmitglied flag of a Spieler.
 */
export async function spielerVereinsToggleAction(
  id: string,
  vereinsmitglied: boolean
): Promise<SpielerVereinsToggleResult> {
  try {
    await prisma.spieler.update({
      where: { id },
      data: { vereinsmitglied },
    });

    revalidatePath("/admin/spieler");
    return {};
  } catch (e) {
    console.error("Fehler beim Ändern des Vereinsmitglied-Status:", e);
    return { fehler: "Der Vereinsmitglied-Status konnte nicht geändert werden." };
  }
}
