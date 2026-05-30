import { prisma } from "@/lib/prisma";
import Link from "next/link";
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
    <li className="text-xs text-gray-600 leading-snug">
      {eigentor ? (
        <span className="italic text-gray-400">
          {scorerName} <span className="text-gray-300">(ET)</span>
        </span>
      ) : (
        <span>
          {scorerName}
          {assistName && (
            <span className="text-gray-400"> ({assistName})</span>
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
  const teamColor = team === "Rot" ? "text-red-600" : "text-yellow-600";

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
    <main className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="w-full max-w-2xl mx-auto px-4 py-5">
          <Link
            href="/"
            className="text-xs text-gray-400 hover:text-gray-600 mb-1 block"
          >
            ← Startseite
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Spielübersicht</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Alle Spiele der Saison {aktivesJahr}
          </p>
        </div>
      </div>

      <div className="w-full max-w-2xl mx-auto px-4 pt-5 space-y-4">
        {/* Season selector */}
        {saisons.length > 1 && (
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-700">
              Saison {aktivesJahr}
            </h2>
            <SpieleSaisonSelektor
              saisons={saisons.map((s) => s.jahr)}
              aktuellesSaisonJahr={aktivesJahr}
            />
          </div>
        )}

        {/* Match list */}
        {spiele.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <p className="text-gray-500">Noch keine Spiele geplant.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {spiele.map((spiel) => {
              const abgesagt = spiel.status === "abgesagt";

              // Shape tore for display logic
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
                  className={`bg-white rounded-xl shadow-sm border p-4 transition-colors ${
                    abgesagt
                      ? "border-gray-100 opacity-60"
                      : "border-gray-100 hover:border-gray-200"
                  }`}
                >
                  {/* Top row: date + result */}
                  <div className="flex items-start justify-between gap-3">
                    {/* Date */}
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold ${
                          abgesagt
                            ? "text-gray-400 line-through"
                            : "text-gray-800"
                        }`}
                      >
                        {formatDatum(spiel.datum)}
                      </p>
                    </div>

                    {/* Score / Status badge */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {abgesagt ? (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
                          Abgesagt
                        </span>
                      ) : anzeige.scoreVisible ? (
                        <>
                          {/* Derived score */}
                          <span className="text-lg font-bold tabular-nums text-gray-800">
                            <span
                              className={
                                anzeige.sieger === "Rot"
                                  ? "text-red-600 font-extrabold"
                                  : "text-red-400"
                              }
                            >
                              {anzeige.rotScore}
                            </span>
                            <span className="text-gray-400 mx-1">:</span>
                            <span
                              className={
                                anzeige.sieger === "Gelb"
                                  ? "text-yellow-500 font-extrabold"
                                  : "text-yellow-400"
                              }
                            >
                              {anzeige.gelbScore}
                            </span>
                          </span>
                          {/* Winner / draw label */}
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${
                              anzeige.sieger === "Unentschieden"
                                ? "bg-gray-100 text-gray-500"
                                : anzeige.sieger === "Rot"
                                ? "bg-red-50 text-red-700"
                                : "bg-yellow-50 text-yellow-700"
                            }`}
                          >
                            {anzeige.sieger === "Unentschieden"
                              ? "Unentschieden"
                              : `${anzeige.sieger} gewinnt`}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-600 whitespace-nowrap">
                          {spiel.status === "geplant"
                            ? "Geplant"
                            : "Läuft"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Goal scorers per team (only for finished matches with goals) */}
                  {anzeige.scoreVisible &&
                    (anzeige.tore.rot.length > 0 ||
                      anzeige.tore.gelb.length > 0) && (
                      <div className="mt-3 pt-3 border-t border-gray-50 flex gap-4">
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
