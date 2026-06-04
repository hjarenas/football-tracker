import { prisma } from "@/lib/prisma";
import Link from "next/link";
import SpielerVerwaltungFormular from "./SpielerVerwaltungFormular";

export default async function SpielerVerwaltungPage() {
  const spieler = await prisma.spieler.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      aktiv: true,
      vereinsmitglied: true,
    },
  });

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-4">
          <Link
            href="/admin"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Zurück zur Verwaltung
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          Spielerverwaltung
        </h1>

        <SpielerVerwaltungFormular initialSpieler={spieler} />
      </div>
    </main>
  );
}
