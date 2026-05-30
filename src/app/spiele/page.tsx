import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { deriveScore } from "@/lib/score";

const STATUS_LABELS: Record<string, string> = {
  geplant: "Geplant",
  teams_zugewiesen: "Läuft",
  abgeschlossen: "Abgeschlossen",
  abgesagt: "Abgesagt",
};

const STATUS_COLORS: Record<string, string> = {
  geplant: "bg-blue-100 text-blue-800",
  teams_zugewiesen: "bg-yellow-100 text-yellow-800",
  abgeschlossen: "bg-green-100 text-green-800",
  abgesagt: "bg-gray-100 text-gray-500",
};

function formatDatum(datum: Date): string {
  return datum.toLocaleDateString("de-AT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function OeffentlicheSpielListePage() {
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
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-2xl mx-auto">
        <div className="mb-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            ← Startseite
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-6">Spielübersicht</h1>

        {spiele.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <p className="text-gray-500">Noch keine Spiele geplant.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {spiele.map((spiel) => {
              const abgesagt = spiel.status === "abgesagt";
              return (
                <li
                  key={spiel.id}
                  className={`bg-white rounded-xl shadow-sm border p-4 transition-colors ${
                    abgesagt
                      ? "border-gray-100 opacity-60"
                      : "border-gray-100 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p
                        className={`text-base font-semibold ${
                          abgesagt
                            ? "text-gray-400 line-through"
                            : "text-gray-800"
                        }`}
                      >
                        {formatDatum(spiel.datum)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Saison {spiel.saison.jahr}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                          STATUS_COLORS[spiel.status] ??
                          "bg-gray-100 text-gray-600"
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
                            <span className="text-sm font-bold text-gray-700 tabular-nums">
                              <span className="text-red-600">{ergebnis.rot}</span>
                              {" : "}
                              <span className="text-yellow-600">
                                {ergebnis.gelb}
                              </span>
                            </span>
                          );
                        })()}
                    </div>
                  </div>

                  {!abgesagt && (
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
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
