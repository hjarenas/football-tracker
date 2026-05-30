import { prisma } from "@/lib/prisma";
import Link from "next/link";

const STATUS_LABELS: Record<string, string> = {
  geplant: "Geplant",
  teams_zugewiesen: "Teams zugewiesen",
  abgeschlossen: "Abgeschlossen",
  abgesagt: "Abgesagt",
};

const STATUS_COLORS: Record<string, string> = {
  geplant: "bg-blue-100 text-blue-800",
  teams_zugewiesen: "bg-yellow-100 text-yellow-800",
  abgeschlossen: "bg-green-100 text-green-800",
  abgesagt: "bg-gray-100 text-gray-500 line-through",
};

function formatDatum(datum: Date): string {
  return datum.toLocaleDateString("de-AT", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function SpielListePage() {
  const spiele = await prisma.spiel.findMany({
    orderBy: { datum: "desc" },
    include: {
      bierbringer: { select: { name: true } },
      teilnahmen: { select: { id: true } },
      saison: { select: { jahr: true } },
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

        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Spiele</h1>
          <Link
            href="/admin/spiele/neu"
            className="inline-flex items-center gap-1 py-2 px-4 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
          >
            + Neues Spiel
          </Link>
        </div>

        {spiele.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <p className="text-gray-500 mb-4">Noch keine Spiele geplant.</p>
            <Link
              href="/admin/spiele/neu"
              className="inline-flex items-center gap-1 py-2 px-4 bg-gray-800 text-white text-sm font-semibold rounded-lg hover:bg-gray-700 transition-colors"
            >
              Erstes Spiel planen
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {spiele.map((spiel) => (
              <li
                key={spiel.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-gray-800">
                      {formatDatum(spiel.datum)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Saison {spiel.saison.jahr}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                      STATUS_COLORS[spiel.status] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {STATUS_LABELS[spiel.status] ?? spiel.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                  <span>
                    <span className="font-medium">Teilnehmer:</span>{" "}
                    {spiel.teilnahmen.length}
                  </span>
                  {spiel.bierbringer && (
                    <span>
                      <span className="font-medium">Bierbringer:</span>{" "}
                      {spiel.bierbringer.name}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
