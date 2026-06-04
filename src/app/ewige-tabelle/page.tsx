import { prisma } from "@/lib/prisma";
import {
  berechneStatistiken,
  type StatistikEingabe,
  type SpielerEintrag,
} from "@/lib/statistik-engine";

// ---------------------------------------------------------------------------
// Leaderboard table component
// ---------------------------------------------------------------------------

function Rangliste({
  titel,
  eintraege,
  einheitSingular,
  einheitPlural,
  emptyText,
}: {
  titel: string;
  eintraege: SpielerEintrag[];
  einheitSingular: string;
  einheitPlural: string;
  emptyText?: string;
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
          {emptyText ?? "Noch keine Daten vorhanden."}
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

export default async function EwigeTabellePage() {
  // Fetch all data across all Saisons (no season filter)
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

  // Shape data for the engine with "all-time" scope
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
    scope: "all-time",
  };

  const statistiken = berechneStatistiken(eingabe);

  return (
    <main className="min-h-screen pb-12">
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <h1 className="text-lg font-bold text-gray-100 mb-6">Alle Zeiten</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Rangliste
            titel="Torjägerliste"
            eintraege={statistiken.torjaeger}
            einheitSingular="Tor"
            einheitPlural="Tore"
            emptyText="Noch keine Tore erzielt."
          />
          <Rangliste
            titel="Vorlagenliste"
            eintraege={statistiken.vorlagen}
            einheitSingular="Vorlage"
            einheitPlural="Vorlagen"
            emptyText="Noch keine Vorlagen verzeichnet."
          />
          <Rangliste
            titel="Punktetabelle"
            eintraege={statistiken.punkte}
            einheitSingular="Punkt"
            einheitPlural="Punkte"
            emptyText="Noch keine abgeschlossenen Spiele."
          />
          <Rangliste
            titel="Anwesenheitsliste"
            eintraege={statistiken.anwesenheit}
            einheitSingular="Spiel"
            einheitPlural="Spiele"
            emptyText="Noch keine Spielteilnahmen verzeichnet."
          />
          <Rangliste
            titel="Bierliste"
            eintraege={statistiken.bier}
            einheitSingular="Mal"
            einheitPlural="Mal"
            emptyText="Noch kein Bierbringer verzeichnet."
          />
        </div>
      </div>
    </main>
  );
}
