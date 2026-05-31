import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  berechneStatistiken,
  type StatistikEingabe,
  type SpielerEintrag,
} from "@/lib/statistik-engine";
import { SaisonSelektor } from "./SaisonSelektor";

// ---------------------------------------------------------------------------
// Leaderboard table component
// ---------------------------------------------------------------------------

function Rangliste({
  titel,
  eintraege,
  einheitSingular,
  einheitPlural,
}: {
  titel: string;
  eintraege: SpielerEintrag[];
  einheitSingular: string;
  einheitPlural: string;
}) {
  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-base font-bold text-gray-800">{titel}</h2>
      </div>
      {eintraege.length === 0 ? (
        <p className="p-4 text-sm text-gray-400 text-center">
          Noch keine Daten für diese Saison.
        </p>
      ) : (
        <ol className="divide-y divide-gray-50">
          {eintraege.map((eintrag) => (
            <li
              key={eintrag.spielerId}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <span
                className={`w-7 text-center text-sm font-bold tabular-nums shrink-0 ${
                  eintrag.rang === 1
                    ? "text-yellow-500"
                    : eintrag.rang === 2
                    ? "text-gray-400"
                    : eintrag.rang === 3
                    ? "text-amber-700"
                    : "text-gray-300"
                }`}
              >
                {eintrag.rang}.
              </span>
              <span className="flex-1 text-sm text-gray-800 font-medium">
                {eintrag.spielerName}
              </span>
              <span className="text-sm text-gray-600 tabular-nums shrink-0">
                {eintrag.wert}{" "}
                <span className="text-gray-400 text-xs">
                  {eintrag.wert === 1 ? einheitSingular : einheitPlural}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface HomePageProps {
  searchParams: Promise<{ saison?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;

  // Fetch all Saisons for the selector
  const saisons = await prisma.saison.findMany({
    orderBy: { jahr: "desc" },
  });

  // Determine current scope
  const aktuellesSaisonJahr =
    saisons.length > 0 ? saisons[0].jahr : new Date().getFullYear();

  const saisonParam = params.saison;
  const scope =
    saisonParam === "all-time"
      ? ("all-time" as const)
      : saisonParam && /^\d{4}$/.test(saisonParam)
      ? parseInt(saisonParam, 10)
      : aktuellesSaisonJahr;

  // Fetch all data needed for the engine
  const [spieler, spiele, teilnahmen, tore] = await Promise.all([
    prisma.spieler.findMany({ select: { id: true, name: true } }),
    prisma.spiel.findMany({
      select: {
        id: true,
        status: true,
        bierbringerId: true,
        saison: { select: { jahr: true } },
      },
    }),
    prisma.spielteilnahme.findMany({
      select: {
        id: true,
        spielerId: true,
        spielId: true,
        team: true,
        punkteOverride: true,
      },
    }),
    prisma.tor.findMany({
      select: {
        id: true,
        team: true,
        eigentor: true,
        spielId: true,
        scorerId: true,
        assistId: true,
      },
    }),
  ]);

  // Shape data for the engine
  const eingabe: StatistikEingabe = {
    spieler: spieler.map((s) => ({ id: s.id, name: s.name })),
    spiele: spiele.map((s) => ({
      id: s.id,
      status: s.status as StatistikEingabe["spiele"][number]["status"],
      saisonJahr: s.saison.jahr,
      bierbringerId: s.bierbringerId ?? undefined,
    })),
    teilnahmen: teilnahmen.map((t) => ({
      id: t.id,
      spielerId: t.spielerId,
      spielId: t.spielId,
      team: t.team as "Rot" | "Gelb" | null,
      punkteOverride: t.punkteOverride as "Rot" | "Gelb" | null,
    })),
    tore: tore.map((t) => ({
      id: t.id,
      team: t.team as "Rot" | "Gelb",
      eigentor: t.eigentor,
      spielId: t.spielId,
      scorerId: t.scorerId,
      assistId: t.assistId ?? undefined,
    })),
    scope,
  };

  const statistiken = berechneStatistiken(eingabe);

  const saisonLabel =
    scope === "all-time" ? "Alle Zeiten" : `Saison ${scope}`;

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="w-full max-w-lg mx-auto px-4 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dienstagskicken</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Fußball-Tracker · Vereins Weißkirchen
              </p>
            </div>
            <Link
              href="/anmelden"
              className="text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:border-gray-400 transition-colors"
            >
              Verwaltung
            </Link>
          </div>
        </div>
      </div>

      <div className="w-full max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* Season selector + navigation */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-800">{saisonLabel}</h2>
          <div className="flex items-center gap-2">
            <SaisonSelektor
              saisons={saisons.map((s) => s.jahr)}
              aktuellerScope={scope}
            />
            <Link
              href="/spiele"
              className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
            >
              Spielübersicht
            </Link>
          </div>
        </div>

        {/* Five leaderboard tables */}
        <Rangliste
          titel="Torjägerliste"
          eintraege={statistiken.torjaeger}
          einheitSingular="Tor"
          einheitPlural="Tore"
        />

        <Rangliste
          titel="Vorlagenliste"
          eintraege={statistiken.vorlagen}
          einheitSingular="Vorlage"
          einheitPlural="Vorlagen"
        />

        <Rangliste
          titel="Punktetabelle"
          eintraege={statistiken.punkte}
          einheitSingular="Punkt"
          einheitPlural="Punkte"
        />

        <Rangliste
          titel="Anwesenheitsliste"
          eintraege={statistiken.anwesenheit}
          einheitSingular="Spiel"
          einheitPlural="Spiele"
        />

        <Rangliste
          titel="Bierliste"
          eintraege={statistiken.bier}
          einheitSingular="Mal"
          einheitPlural="Mal"
        />

      </div>
    </main>
  );
}
