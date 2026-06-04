import { prisma } from "@/lib/prisma";
import { naechstenDienstagBerechnen } from "@/lib/datum-utils";
import { sortiereSpielerNachAktivitaet } from "@/lib/spieler-sortierung";
import SpielPlanenFormular from "./SpielPlanenFormular";

export default async function SpielNeuPage() {
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

  const annotiert = spielerMitTeilnahme.map((s) => ({
    id: s.id,
    name: s.name,
    letzteTeilnahme: s.teilnahmen[0]?.spiel.datum ?? null,
  }));

  const { eimer1, eimer2, eimer3 } = sortiereSpielerNachAktivitaet(
    annotiert,
    new Date()
  );

  const spieler = [...eimer1, ...eimer2, ...eimer3];
  const vorausgefuelltDatum = naechstenDienstagBerechnen();

  return (
    <main className="min-h-screen pb-12">
      <div className="w-full max-w-lg mx-auto px-4 pt-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h1 className="text-xl font-bold text-gray-100 mb-1">
            Neues Spiel planen
          </h1>
          <p className="text-sm text-gray-400 mb-6">
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
