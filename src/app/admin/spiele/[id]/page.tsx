import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import TeamsZuweisenFormular from "./TeamsZuweisenFormular";
import SpielberichtFormular from "./SpielberichtFormular";
import SpielAbsagenFormular from "./SpielAbsagenFormular";
import { deriveScore } from "@/lib/score";

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

  const spiel = await prisma.spiel.findUnique({
    where: { id },
    include: {
      saison: { select: { jahr: true } },
      bierbringer: { select: { name: true } },
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
  });

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

  // Teilnehmer with assigned teams (for goal entry form)
  const teilnehmerMitTeam = spiel.teilnahmen
    .filter((t) => t.team !== null)
    .map((t) => ({
      id: t.spieler.id,
      name: t.spieler.name,
      team: t.team as "Rot" | "Gelb",
    }));

  // Tore for goal entry form
  const toreFuerFormular = spiel.tore.map((t) => ({
    id: t.id,
    team: t.team as "Rot" | "Gelb",
    eigentor: t.eigentor,
    scorer: { id: t.scorer.id, name: t.scorer.name },
    assist: t.assist ? { id: t.assist.id, name: t.assist.name } : null,
  }));

  // Derived score (for abgeschlossen view)
  const ergebnis = deriveScore(
    spiel.tore.map((t) => ({ team: t.team as "Rot" | "Gelb", eigentor: t.eigentor }))
  );

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-lg mx-auto">
        <div className="mb-4">
          <Link
            href="/admin/spiele"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Zurück zur Spielübersicht
          </Link>
        </div>

        {/* Spiel-Header */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                {formatDatum(spiel.datum)}
              </h1>
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

          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
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
        </div>

        {/* Teams zuweisen — nur bei Status geplant */}
        {kannTeamsZuweisen && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">
              Teams zuweisen
            </h2>
            <p className="text-sm text-gray-500 mb-5">
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
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1">
              Spielbericht erfassen
            </h2>
            <p className="text-sm text-gray-500 mb-5">
              Tore eintragen und Spiel abschließen.
            </p>
            <SpielberichtFormular
              spielId={spiel.id}
              teilnehmer={teilnehmerMitTeam}
              initialTore={toreFuerFormular}
            />
          </div>
        )}

        {/* Abgeschlossen — Ergebnis und Spieler anzeigen */}
        {abgeschlossen && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Ergebnis</h2>

            {/* Score display */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 rounded-xl border-2 border-red-200 bg-red-50 py-4 text-center">
                <span className="block text-4xl font-bold text-red-600">
                  {ergebnis.rot}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-red-700 mt-1 block">
                  Rot
                </span>
              </div>
              <span className="text-2xl font-bold text-gray-400">:</span>
              <div className="flex-1 rounded-xl border-2 border-yellow-300 bg-yellow-50 py-4 text-center">
                <span className="block text-4xl font-bold text-yellow-600">
                  {ergebnis.gelb}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-yellow-700 mt-1 block">
                  Gelb
                </span>
              </div>
            </div>

            {/* Teams */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-bold text-red-700 mb-2 uppercase tracking-wide">
                  Rot ({spiel.teilnahmen.filter((t) => t.team === "Rot").length})
                </h3>
                <ul className="flex flex-col gap-1">
                  {spiel.teilnahmen
                    .filter((t) => t.team === "Rot")
                    .map((t) => (
                      <li key={t.id} className="text-sm text-gray-700">
                        {t.spieler.name}
                        {t.punkteOverride && t.punkteOverride !== t.team && (
                          <span className="ml-1 text-xs text-gray-400">
                            (Punkte: {t.punkteOverride})
                          </span>
                        )}
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-yellow-700 mb-2 uppercase tracking-wide">
                  Gelb ({spiel.teilnahmen.filter((t) => t.team === "Gelb").length})
                </h3>
                <ul className="flex flex-col gap-1">
                  {spiel.teilnahmen
                    .filter((t) => t.team === "Gelb")
                    .map((t) => (
                      <li key={t.id} className="text-sm text-gray-700">
                        {t.spieler.name}
                        {t.punkteOverride && t.punkteOverride !== t.team && (
                          <span className="ml-1 text-xs text-gray-400">
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
              <div className="mt-5 border-t border-gray-100 pt-4">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">
                  Tore ({spiel.tore.length})
                </h3>
                <ul className="flex flex-col gap-1.5">
                  {spiel.tore.map((tor, idx) => (
                    <li key={tor.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="text-gray-400 w-5 text-right">{idx + 1}.</span>
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
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700 border border-orange-200">
                          ET
                        </span>
                      )}
                      <span>{tor.scorer.name}</span>
                      {tor.assist && (
                        <span className="text-xs text-gray-400">
                          (Vorlage: {tor.assist.name})
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Abgesagt */}
        {spiel.status === "abgesagt" && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-gray-500 text-sm">Dieses Spiel wurde abgesagt.</p>
          </div>
        )}
      </div>
    </main>
  );
}
