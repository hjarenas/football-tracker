import { prisma } from "@/lib/prisma";
import { berechneSpielAnzeige, type TorAnzeige } from "@/lib/spieluebersicht";
import { SpieleSaisonSelektor } from "./SpieleSaisonSelektor";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDatum(datum: Date): string {
  return datum.toLocaleDateString("de-AT", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TorZeile({
  scorerName,
  assistName,
  eigentor,
}: {
  scorerName: string;
  assistName?: string;
  eigentor: boolean;
}) {
  return (
    <li className="text-xs text-gray-400 leading-snug">
      {eigentor ? (
        <span className="italic text-gray-500">
          {scorerName} <span className="text-gray-600">(ET)</span>
        </span>
      ) : (
        <span>
          {scorerName}
          {assistName && (
            <span className="text-gray-500"> ({assistName})</span>
          )}
        </span>
      )}
    </li>
  );
}

function TeamTorListe({
  tore,
  team,
}: {
  tore: { scorerName: string; assistName?: string; eigentor: boolean }[];
  team: "Rot" | "Gelb";
}) {
  if (tore.length === 0) return null;

  const teamLabel = team === "Rot" ? "Rot" : "Gelb";
  const teamColor = team === "Rot" ? "text-red-400" : "text-yellow-400";

  return (
    <div className="flex-1 min-w-0">
      <p className={`text-xs font-semibold mb-0.5 ${teamColor}`}>
        {teamLabel}
      </p>
      <ul className="space-y-0.5">
        {tore.map((tor, i) => (
          <TorZeile key={i} {...tor} />
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface SpielListePageProps {
  searchParams: Promise<{ saison?: string }>;
}

export default async function OeffentlicheSpielListePage({
  searchParams,
}: SpielListePageProps) {
  const params = await searchParams;

  // Fetch all Saisons for the selector
  const saisons = await prisma.saison.findMany({
    orderBy: { jahr: "desc" },
  });

  const aktuellstesJahr =
    saisons.length > 0 ? saisons[0].jahr : new Date().getFullYear();

  const saisonParam = params.saison;
  const aktivesJahr =
    saisonParam && /^\d{4}$/.test(saisonParam)
      ? parseInt(saisonParam, 10)
      : aktuellstesJahr;

  // Fetch matches for the selected season with full goal detail
  const saison = await prisma.saison.findUnique({
    where: { jahr: aktivesJahr },
  });

  const spiele = saison
    ? await prisma.spiel.findMany({
        where: { saisonId: saison.id },
        orderBy: { datum: "desc" },
        include: {
          saison: { select: { jahr: true } },
          tore: {
            include: {
              scorer: { select: { name: true } },
              assist: { select: { name: true } },
            },
            orderBy: { id: "asc" },
          },
        },
      })
    : [];

  return (
    <main className="min-h-screen pb-12">
      <div className="max-w-3xl mx-auto px-4 pt-6 space-y-4">
        {/* Season selector */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-100">
            Saison {aktivesJahr}
          </h1>
          {saisons.length > 1 && (
            <SpieleSaisonSelektor
              saisons={saisons.map((s) => s.jahr)}
              aktuellesSaisonJahr={aktivesJahr}
            />
          )}
        </div>

        {/* Match list */}
        {spiele.length === 0 ? (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
            <p className="text-gray-500">Noch keine Spiele geplant.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {spiele.map((spiel) => {
              const abgesagt = spiel.status === "abgesagt";

              const toreFuerAnzeige: TorAnzeige[] = spiel.tore.map((t) => ({
                scorerName: t.scorer.name,
                assistName: t.assist?.name,
                team: t.team as "Rot" | "Gelb",
                eigentor: t.eigentor,
              }));

              const anzeige = berechneSpielAnzeige({
                status: spiel.status as
                  | "geplant"
                  | "teams_zugewiesen"
                  | "abgeschlossen"
                  | "abgesagt",
                tore: toreFuerAnzeige,
              });

              return (
                <li
                  key={spiel.id}
                  className={`bg-gray-800 rounded-xl border p-4 transition-colors ${
                    abgesagt
                      ? "border-gray-700 opacity-50"
                      : "border-gray-700 hover:border-gray-600"
                  }`}
                >
                  {/* Top row: date + result */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${
                          abgesagt
                            ? "text-gray-500 line-through"
                            : "text-gray-100"
                        }`}
                      >
                        {formatDatum(spiel.datum)}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {abgesagt ? (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-700 text-gray-400 whitespace-nowrap">
                          Abgesagt
                        </span>
                      ) : anzeige.scoreVisible ? (
                        <>
                          <span className="text-lg font-bold tabular-nums">
                            <span
                              className={
                                anzeige.sieger === "Rot"
                                  ? "text-red-400 font-extrabold"
                                  : "text-red-500/60"
                              }
                            >
                              {anzeige.rotScore}
                            </span>
                            <span className="text-gray-600 mx-1">:</span>
                            <span
                              className={
                                anzeige.sieger === "Gelb"
                                  ? "text-yellow-400 font-extrabold"
                                  : "text-yellow-500/60"
                              }
                            >
                              {anzeige.gelbScore}
                            </span>
                          </span>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                              anzeige.sieger === "Unentschieden"
                                ? "bg-gray-700 text-gray-300"
                                : anzeige.sieger === "Rot"
                                ? "bg-red-900/60 text-red-400"
                                : "bg-yellow-900/60 text-yellow-400"
                            }`}
                          >
                            {anzeige.sieger === "Unentschieden"
                              ? "Unentschieden"
                              : `${anzeige.sieger} gewinnt`}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-900/60 text-blue-400 whitespace-nowrap">
                          {spiel.status === "geplant" ? "Geplant" : "Läuft"}
                        </span>
                      )}
                    </div>
                  </div>

                  {anzeige.scoreVisible &&
                    (anzeige.tore.rot.length > 0 ||
                      anzeige.tore.gelb.length > 0) && (
                      <div className="mt-3 pt-3 border-t border-gray-700/60 flex gap-4">
                        <TeamTorListe tore={anzeige.tore.rot} team="Rot" />
                        <TeamTorListe tore={anzeige.tore.gelb} team="Gelb" />
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
