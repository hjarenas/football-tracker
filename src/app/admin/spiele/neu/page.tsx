import { prisma } from "@/lib/prisma";
import { naechstenDienstagBerechnen } from "@/lib/datum-utils";
import { sortiereSpielerNachAktivitaet } from "@/lib/spieler-sortierung";
import SpielPlanenFormular from "./SpielPlanenFormular";
import Link from "next/link";

export default async function SpielNeuPage() {
  // Fetch all active players with their most recent Spielteilnahme date.
  // Inactive players are excluded — they must not appear in the picker.
  const spielerMitTeilnahme = await prisma.spieler.findMany({
    where: { aktiv: true },
    select: {
      id: true,
      name: true,
      teilnahmen: {
        select: {
          spiel: {
            select: { datum: true },
          },
        },
        orderBy: { spiel: { datum: "desc" } },
        take: 1,
      },
    },
  });

  // Map to SpielerMitLetzterTeilnahme shape required by spieler-sortierung
  const annotiert = spielerMitTeilnahme.map((s) => ({
    id: s.id,
    name: s.name,
    letzteTeilnahme: s.teilnahmen[0]?.spiel.datum ?? null,
  }));

  // Sort into three activity buckets (Eimer 1: ≤90 days, Eimer 2: ≤365 days, Eimer 3: older/never)
  // spieler-sortierung is the sole sorting logic — no sort anywhere else in this file or the form
  const { eimer1, eimer2, eimer3 } = sortiereSpielerNachAktivitaet(
    annotiert,
    new Date()
  );

  // Flatten buckets preserving order: Eimer 1 → Eimer 2 → Eimer 3
  const spieler = [...eimer1, ...eimer2, ...eimer3];

  const vorausgefuelltDatum = naechstenDienstagBerechnen();

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-lg mx-auto">
        <div className="mb-4">
          <Link
            href="/admin/spiele"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← Zurück zur Spielübersicht
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            Neues Spiel planen
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Datum, Bierbringer und Teilnehmer festlegen.
          </p>

          <SpielPlanenFormular
            spieler={spieler}
            vorausgefuelltDatum={vorausgefuelltDatum}
          />
        </div>
      </div>
    </main>
  );
}
