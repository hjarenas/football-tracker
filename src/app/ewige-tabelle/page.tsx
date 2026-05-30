import { prisma } from "@/lib/prisma";
import Link from "next/link";
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
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h2 className="text-base font-bold text-gray-800">{titel}</h2>
      </div>
      {eintraege.length === 0 ? (
        <p className="p-4 text-sm text-gray-400 text-center">
          {emptyText ?? "Noch keine Daten vorhanden."}
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
    <main className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="w-full max-w-lg mx-auto px-4 py-5">
          <Link
            href="/"
            className="text-xs text-gray-400 hover:text-gray-600 mb-1 block"
          >
            ← Startseite
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Ewige Tabelle</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gesamtwertung über alle Saisons
          </p>
        </div>
      </div>

      <div className="w-full max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* All-time label */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-800">Alle Zeiten</h2>
          <Link
            href="/spiele"
            className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            Spielübersicht
          </Link>
        </div>

        {/* Five leaderboard tables */}
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

        {/* Footer links */}
        <div className="flex justify-center gap-4 pt-4 text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">
            Saison-Statistiken
          </Link>
          <Link href="/anmelden" className="hover:text-gray-600">
            Verwaltung
          </Link>
        </div>
      </div>
    </main>
  );
}
