import { prisma } from "@/lib/prisma";
import {
  berechneStatistiken,
  type StatistikEingabe,
  type SpielerEintrag,
} from "@/lib/statistik-engine";
import { SaisonSelektor } from "./SaisonSelektor";

// ---------------------------------------------------------------------------
// Leaderboard card
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
    <section className="rounded-xl overflow-hidden border border-gray-700">
      <div className="px-4 py-3 border-b border-gray-700 bg-gray-700/50">
        <h2 className="text-sm font-bold text-gray-100 uppercase tracking-wide">
          {titel}
        </h2>
      </div>
      {eintraege.length === 0 ? (
        <p className="p-4 text-sm text-gray-500 text-center">
          Noch keine Daten für diese Saison.
        </p>
      ) : (
        <ol className="divide-y divide-gray-700/60">
          {eintraege.map((eintrag) => (
            <li
              key={eintrag.spielerId}
              className="flex items-center gap-3 px-4 py-2.5 bg-gray-800 hover:bg-gray-700/40 transition-colors"
            >
              <span
                className={`w-6 text-center text-sm font-bold tabular-nums shrink-0 ${
                  eintrag.rang === 1
                    ? "text-yellow-400"
                    : eintrag.rang === 2
                    ? "text-gray-400"
                    : eintrag.rang === 3
                    ? "text-amber-600"
                    : "text-gray-600"
                }`}
              >
                {eintrag.rang}.
              </span>
              <span className="flex-1 text-sm text-gray-100 font-medium">
                {eintrag.spielerName}
              </span>
              <span className="text-sm text-gray-300 tabular-nums shrink-0">
                {eintrag.wert}{" "}
                <span className="text-gray-500 text-xs">
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

  const saisons = await prisma.saison.findMany({
    orderBy: { jahr: "desc" },
  });

  const aktuellesSaisonJahr =
    saisons.length > 0 ? saisons[0].jahr : new Date().getFullYear();

  const saisonParam = params.saison;
  const scope =
    saisonParam === "all-time"
      ? ("all-time" as const)
      : saisonParam && /^\d{4}$/.test(saisonParam)
      ? parseInt(saisonParam, 10)
      : aktuellesSaisonJahr;

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
    <main className="min-h-screen pb-12">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        {/* Season selector */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-lg font-bold text-gray-100">{saisonLabel}</h1>
          <SaisonSelektor
            saisons={saisons.map((s) => s.jahr)}
            aktuellerScope={scope}
          />
        </div>

        {/* 3-col leaderboard grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </div>
    </main>
  );
}
