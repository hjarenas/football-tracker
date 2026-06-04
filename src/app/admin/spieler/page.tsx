import { prisma } from "@/lib/prisma";
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
    <main className="min-h-screen pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <h1 className="text-xl font-bold text-gray-100 mb-6">
          Spielerverwaltung
        </h1>
        <SpielerVerwaltungFormular initialSpieler={spieler} />
      </div>
    </main>
  );
}
