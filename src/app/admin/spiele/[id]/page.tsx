import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import TeamsZuweisenFormular from "./TeamsZuweisenFormular";
import SpielberichtFormular from "./SpielberichtFormular";
import SpielAbsagenFormular from "./SpielAbsagenFormular";
import SpielBearbeitenFormular from "./SpielBearbeitenFormular";
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
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SpielDetailPage({ params }: Props) {
  const { id } = await params;

  const [spiel, alleSpieler] = await Promise.all([
    prisma.spiel.findUnique({
      where: { id },
      include: {
        saison: { select: { jahr: true } },
        bierbringer: { select: { id: true, name: true } },
        teilnahmen: {
          include: {
            spieler: { select: { id: true, name: true } },
          },
          orderBy: {
            spieler: { name: "asc" },
          },
        },
        tore: {
          include: {
            scorer: { select: { id: true, name: true } },
            assist: { select: { id: true, name: true } },
          },
          orderBy: { id: "asc" },
        },
      },
    }),
    prisma.spieler.findMany({
      where: { aktiv: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!spiel) {
    notFound();
  }

  const kannTeamsZuweisen = spiel.status === "geplant";
  const teamsZugewiesen = spiel.status === "teams_zugewiesen";
  const abgeschlossen = spiel.status === "abgeschlossen";

  const teilnahmenFuerFormular = spiel.teilnahmen.map((t) => ({
    id: t.id,
    spielerName: t.spieler.name,
    team: t.team as "Rot" | "Gelb" | null,
    punkteOverride: t.punkteOverride as "Rot" | "Gelb" | null,
  }));

  const teilnehmerMitTeam = spiel.teilnahmen
    .filter((t) => t.team !== null)
    .map((t) => ({
      id: t.spieler.id,
      name: t.spieler.name,
      team: t.team as "Rot" | "Gelb",
    }));

  const toreFuerFormular = spiel.tore.map((t) => ({
    id: t.id,
    team: t.team as "Rot" | "Gelb",
    eigentor: t.eigentor,
    scorer: { id: t.scorer.id, name: t.scorer.name },
    assist: t.assist ? { id: t.assist.id, name: t.assist.name } : null,
  }));

  const ergebnis = deriveScore(
    spiel.tore.map((t) => ({ team: t.team as "Rot" | "Gelb", eigentor: t.eigentor }))
  );

  const teilnahmenFuerBearbeiten = spiel.teilnahmen.map((t) => ({
    id: t.id,
    spielerId: t.spieler.id,
    spielerName: t.spieler.name,
    team: t.team as "Rot" | "Gelb" | null,
    punkteOverride: t.punkteOverride as "Rot" | "Gelb" | null,
  }));

  return (
    <main className="min-h-screen pb-12">
      <div className="w-full max-w-lg mx-auto px-4 pt-6 flex flex-col gap-4">
        {/* Spiel-Header */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-100">
                {formatDatum(spiel.datum)}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Saison {spiel.saison.jahr}
              </p>
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                STATUS_COLORS[spiel.status] ?? "bg-gray-700 text-gray-400"
              }`}
            >
              {STATUS_LABELS[spiel.status] ?? spiel.status}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-400">
            <span>
              <span className="font-medium text-gray-300">Teilnehmer:</span>{" "}
              {spiel.teilnahmen.length}
            </span>
            {spiel.bierbringer && (
              <span>
                <span className="font-medium text-gray-300">Bierbringer:</span>{" "}
                {spiel.bierbringer.name}
              </span>
            )}
          </div>
        </div>

        {/* Teams zuweisen — nur bei Status geplant */}
        {kannTeamsZuweisen && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-100 mb-1">
              Teams zuweisen
            </h2>
            <p className="text-sm text-gray-400 mb-5">
              Jeden Spieler Rot oder Gelb zuweisen.
            </p>
            <TeamsZuweisenFormular
              spielId={spiel.id}
              teilnahmen={teilnahmenFuerFormular}
            />
            <SpielAbsagenFormular spielId={spiel.id} />
          </div>
        )}

        {/* Spielbericht erfassen — bei Status teams_zugewiesen */}
        {teamsZugewiesen && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h2 className="text-lg font-bold text-gray-100 mb-1">
              Spielbericht erfassen
            </h2>
            <p className="text-sm text-gray-400 mb-5">
              Tore eintragen und Spiel abschließen.
            </p>
            <SpielberichtFormular
              spielId={spiel.id}
              teilnehmer={teilnehmerMitTeam}
              initialTore={toreFuerFormular}
            />
          </div>
        )}

        {/* Abgeschlossen — Ergebnis, Spieler anzeigen + Daten bearbeiten */}
        {abgeschlossen && (
          <>
            {/* Read-only summary card */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-lg font-bold text-gray-100 mb-4">Ergebnis</h2>

              {/* Score display */}
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1 rounded-xl border-2 border-red-800/60 bg-red-900/30 py-4 text-center">
                  <span className="block text-4xl font-bold text-red-400">
                    {ergebnis.rot}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-red-400 mt-1 block">
                    Rot
                  </span>
                </div>
                <span className="text-2xl font-bold text-gray-500">:</span>
                <div className="flex-1 rounded-xl border-2 border-yellow-800/60 bg-yellow-900/30 py-4 text-center">
                  <span className="block text-4xl font-bold text-yellow-400">
                    {ergebnis.gelb}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-yellow-400 mt-1 block">
                    Gelb
                  </span>
                </div>
              </div>

              {/* Teams */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-bold text-red-400 mb-2 uppercase tracking-wide">
                    Rot ({spiel.teilnahmen.filter((t) => t.team === "Rot").length})
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {spiel.teilnahmen
                      .filter((t) => t.team === "Rot")
                      .map((t) => (
                        <li key={t.id} className="text-sm text-gray-300">
                          {t.spieler.name}
                          {t.punkteOverride && t.punkteOverride !== t.team && (
                            <span className="ml-1 text-xs text-gray-500">
                              (Punkte: {t.punkteOverride})
                            </span>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-yellow-400 mb-2 uppercase tracking-wide">
                    Gelb ({spiel.teilnahmen.filter((t) => t.team === "Gelb").length})
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {spiel.teilnahmen
                      .filter((t) => t.team === "Gelb")
                      .map((t) => (
                        <li key={t.id} className="text-sm text-gray-300">
                          {t.spieler.name}
                          {t.punkteOverride && t.punkteOverride !== t.team && (
                            <span className="ml-1 text-xs text-gray-500">
                              (Punkte: {t.punkteOverride})
                            </span>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>

              {/* Torliste */}
              {spiel.tore.length > 0 && (
                <div className="mt-5 border-t border-gray-700 pt-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">
                    Tore ({spiel.tore.length})
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {spiel.tore.map((tor, idx) => (
                      <li key={tor.id} className="flex items-center gap-2 text-sm text-gray-300">
                        <span className="text-gray-500 w-5 text-right">{idx + 1}.</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            tor.team === "Rot"
                              ? "bg-red-600 text-white"
                              : "bg-yellow-400 text-yellow-900"
                          }`}
                        >
                          {tor.team}
                        </span>
                        {tor.eigentor && (
                          <span className="rounded-full bg-orange-900/40 px-2 py-0.5 text-xs font-semibold text-orange-400 border border-orange-700/40">
                            ET
                          </span>
                        )}
                        <span>{tor.scorer.name}</span>
                        {tor.assist && (
                          <span className="text-xs text-gray-500">
                            (Vorlage: {tor.assist.name})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Edit section */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-lg font-bold text-gray-100 mb-1">
                Spiel bearbeiten
              </h2>
              <p className="text-sm text-gray-400 mb-5">
                Fehler korrigieren — Status bleibt abgeschlossen.
              </p>
              <SpielBearbeitenFormular
                spielId={spiel.id}
                initialDatum={spiel.datum.toISOString().slice(0, 10)}
                initialBierbringerId={spiel.bierbringerId ?? null}
                initialTeilnahmen={teilnahmenFuerBearbeiten}
                initialTore={toreFuerFormular}
                alleSpieler={alleSpieler}
              />
            </div>
          </>
        )}

        {/* Abgesagt */}
        {spiel.status === "abgesagt" && (
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <p className="text-gray-400 text-sm">Dieses Spiel wurde abgesagt.</p>
          </div>
        )}
      </div>
    </main>
  );
}
