import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import TeamsZuweisenFormular from "./TeamsZuweisenFormular";

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
          spieler: { select: { name: true } },
        },
        orderBy: {
          spieler: { name: "asc" },
        },
      },
    },
  });

  if (!spiel) {
    notFound();
  }

  const kannTeamsZuweisen = spiel.status === "geplant";
  const teamsZugewiesen = spiel.status === "teams_zugewiesen";

  const teilnahmenFuerFormular = spiel.teilnahmen.map((t) => ({
    id: t.id,
    spielerName: t.spieler.name,
    team: t.team as "Rot" | "Gelb" | null,
    punkteOverride: t.punkteOverride as "Rot" | "Gelb" | null,
  }));

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
          </div>
        )}

        {/* Teams anzeigen — wenn bereits zugewiesen */}
        {teamsZugewiesen && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              Teamaufstellung
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* Rot */}
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

              {/* Gelb */}
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
          </div>
        )}

        {/* Abgeschlossen / Abgesagt */}
        {(spiel.status === "abgeschlossen" || spiel.status === "abgesagt") && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-bold text-red-700 mb-2 uppercase tracking-wide">
                  Rot
                </h3>
                <ul className="flex flex-col gap-1">
                  {spiel.teilnahmen
                    .filter((t) => t.team === "Rot")
                    .map((t) => (
                      <li key={t.id} className="text-sm text-gray-700">
                        {t.spieler.name}
                      </li>
                    ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-yellow-700 mb-2 uppercase tracking-wide">
                  Gelb
                </h3>
                <ul className="flex flex-col gap-1">
                  {spiel.teilnahmen
                    .filter((t) => t.team === "Gelb")
                    .map((t) => (
                      <li key={t.id} className="text-sm text-gray-700">
                        {t.spieler.name}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
