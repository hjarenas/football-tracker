import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { deriveScore } from "@/lib/score";

const STATUS_LABELS: Record<string, string> = {
  geplant: "Geplant",
  teams_zugewiesen: "Teams zugewiesen",
  abgeschlossen: "Abgeschlossen",
  abgesagt: "Abgesagt",
};

const STATUS_COLORS: Record<string, string> = {
  geplant: "bg-blue-900/60 text-blue-300",
  teams_zugewiesen: "bg-yellow-900/60 text-yellow-300",
  abgeschlossen: "bg-green-900/60 text-green-300",
  abgesagt: "bg-gray-700 text-gray-400 line-through",
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
      tore: { select: { team: true, eigentor: true } },
    },
  });

  return (
    <main className="min-h-screen pb-12">
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold text-gray-100">Spiele</h1>
          <Link
            href="/admin/spiele/neu"
            className="inline-flex items-center gap-1 py-2 px-4 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            + Neues Spiel
          </Link>
        </div>

        {spiele.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
            <p className="text-gray-500 mb-4">Noch keine Spiele geplant.</p>
            <Link
              href="/admin/spiele/neu"
              className="inline-flex items-center gap-1 py-2 px-4 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Erstes Spiel planen
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {spiele.map((spiel) => (
              <li
                key={spiel.id}
                className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-gray-600 transition-colors"
              >
                <Link href={`/admin/spiele/${spiel.id}`} className="block">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-base font-semibold text-gray-100">
                        {formatDatum(spiel.datum)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Saison {spiel.saison.jahr}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                          STATUS_COLORS[spiel.status] ??
                          "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {STATUS_LABELS[spiel.status] ?? spiel.status}
                      </span>
                      {spiel.status === "abgeschlossen" &&
                        (() => {
                          const ergebnis = deriveScore(
                            spiel.tore.map((t) => ({
                              team: t.team as "Rot" | "Gelb",
                              eigentor: t.eigentor,
                            }))
                          );
                          return (
                            <span className="text-sm font-bold tabular-nums">
                              <span className="text-red-400">
                                {ergebnis.rot}
                              </span>
                              <span className="text-gray-600">{" : "}</span>
                              <span className="text-yellow-400">
                                {ergebnis.gelb}
                              </span>
                            </span>
                          );
                        })()}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-400">
                    <span>
                      <span className="font-medium text-gray-300">
                        Teilnehmer:
                      </span>{" "}
                      {spiel.teilnahmen.length}
                    </span>
                    {spiel.bierbringer && (
                      <span>
                        <span className="font-medium text-gray-300">
                          Bierbringer:
                        </span>{" "}
                        {spiel.bierbringer.name}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
