import { prisma } from "@/lib/prisma";
import { naechstenDienstagBerechnen } from "../actions";
import SpielPlanenFormular from "./SpielPlanenFormular";
import Link from "next/link";

export default async function SpielNeuPage() {
  const spieler = await prisma.spieler.findMany({
    where: { aktiv: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

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
