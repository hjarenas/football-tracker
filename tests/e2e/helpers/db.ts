/**
 * E2E test database helper.
 *
 * Creates a Prisma client pointed at the TEST database (DATABASE_URL from env),
 * and provides helpers to reset + seed the DB before each test file.
 *
 * Usage:
 *   import { resetDb, seedBaseData, prismaTest } from './db';
 *
 * The test DATABASE_URL is read from the process environment — the Playwright
 * global setup loads .env.test before spawning tests.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createTestPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL env var not set — make sure .env.test is loaded"
    );
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prismaTest = createTestPrisma();

// ---------------------------------------------------------------------------
// Reset — wipe all data in dependency order
// ---------------------------------------------------------------------------

export async function resetDb() {
  // Delete in reverse-dependency order to avoid FK violations
  await prismaTest.tor.deleteMany();
  await prismaTest.spielteilnahme.deleteMany();
  await prismaTest.spiel.deleteMany();
  await prismaTest.saison.deleteMany();
  await prismaTest.spieler.deleteMany();
}

// ---------------------------------------------------------------------------
// Base players (shared subset used by most tests)
// ---------------------------------------------------------------------------

export const BASE_SPIELER = [
  "Alexander Bauer",
  "Benjamin Fischer",
  "Christian Hofmann",
  "Daniel Koch",
  "Elias Müller",
  "Fabian Schneider",
  "Georg Wagner",
  "Hans Weber",
  "Ivan Schäfer",
  "Jonas Meyer",
];

export async function seedSpieler(namen: string[] = BASE_SPIELER) {
  const results: { id: string; name: string }[] = [];
  for (const name of namen) {
    const s = await prismaTest.spieler.create({ data: { name, aktiv: true } });
    results.push({ id: s.id, name: s.name });
  }
  return results;
}

// ---------------------------------------------------------------------------
// Seed a season + matches for leaderboard tests (scenario 2)
// ---------------------------------------------------------------------------

/**
 * Seeds a complete, deterministic dataset for leaderboard correctness tests.
 *
 * One Saison (2026), one abgeschlossenes Spiel:
 *   - Rot: Alexander Bauer (scorer 2 goals, 1 assist), Benjamin Fischer (scorer 1 goal)
 *   - Gelb: Christian Hofmann (scorer 1 eigentor), Daniel Koch (scorer 1 goal, 1 assist)
 *   - Bierbringer: Elias Müller (on Rot team, also attending)
 *
 * Derived score: Rot 3 (2 regular + 1 eigentor) : Gelb 1
 * Expected stats:
 *   - Torjägerliste: Alexander 2, Benjamin 1, Daniel 1 (Christian eigentor → not counted)
 *   - Vorlagenliste: Alexander 1, Daniel 1
 *   - Punktetabelle (Rot wins 3:1): Alexander 3, Benjamin 3, Elias 3; Daniel 0, Christian 0
 *   - Anwesenheitsliste: all 5 players: 1 Spiel each
 *   - Bierliste: Elias 1
 */
export async function seedLeaderboardScenario() {
  const spieler = await seedSpieler([
    "Alexander Bauer",
    "Benjamin Fischer",
    "Christian Hofmann",
    "Daniel Koch",
    "Elias Müller",
  ]);

  const [alexander, benjamin, christian, daniel, elias] = spieler;

  const saison = await prismaTest.saison.create({ data: { jahr: 2026 } });

  const spiel = await prismaTest.spiel.create({
    data: {
      datum: new Date("2026-01-06"),
      status: "abgeschlossen",
      saisonId: saison.id,
      bierbringerId: elias.id,
      teilnahmen: {
        create: [
          { spielerId: alexander.id, team: "Rot" },
          { spielerId: benjamin.id, team: "Rot" },
          { spielerId: elias.id, team: "Rot" },
          { spielerId: christian.id, team: "Gelb" },
          { spielerId: daniel.id, team: "Gelb" },
        ],
      },
    },
  });

  // Goals:
  // 1. Alexander scores for Rot (assist: Daniel) → Rot 1:0
  // 2. Benjamin scores for Rot (no assist) → Rot 2:0
  // 3. Christian eigentor (team: Gelb, counts for Rot) → Rot 3:0
  // 4. Daniel scores for Gelb (assist: Alexander) → Rot 3:1
  await prismaTest.tor.createMany({
    data: [
      {
        spielId: spiel.id,
        scorerId: alexander.id,
        assistId: daniel.id,
        team: "Rot",
        eigentor: false,
      },
      {
        spielId: spiel.id,
        scorerId: benjamin.id,
        assistId: null,
        team: "Rot",
        eigentor: false,
      },
      {
        spielId: spiel.id,
        scorerId: christian.id,
        assistId: null,
        team: "Gelb",
        eigentor: true,
      },
      {
        spielId: spiel.id,
        scorerId: daniel.id,
        assistId: alexander.id,
        team: "Gelb",
        eigentor: false,
      },
    ],
  });

  return { spieler, saison, spiel };
}

// ---------------------------------------------------------------------------
// Seed two seasons for Saisonwechsel test (scenario 3)
// ---------------------------------------------------------------------------

/**
 * Seeds two seasons with distinct data so we can verify the season selector
 * and ewige-tabelle aggregation.
 *
 * Saison 2025: one match, scorer = Alexander Bauer (1 goal)
 * Saison 2026: one match, scorer = Benjamin Fischer (2 goals)
 *
 * All-time totals: Alexander 1, Benjamin 2
 */
export async function seedZweiSaisons() {
  const spieler = await seedSpieler([
    "Alexander Bauer",
    "Benjamin Fischer",
    "Christian Hofmann",
    "Daniel Koch",
  ]);

  const [alexander, benjamin, christian, daniel] = spieler;

  const saison2025 = await prismaTest.saison.create({ data: { jahr: 2025 } });
  const saison2026 = await prismaTest.saison.create({ data: { jahr: 2026 } });

  // Saison 2025: Alexander scores 1 goal (Rot wins 1:0)
  const spiel2025 = await prismaTest.spiel.create({
    data: {
      datum: new Date("2025-01-07"),
      status: "abgeschlossen",
      saisonId: saison2025.id,
      teilnahmen: {
        create: [
          { spielerId: alexander.id, team: "Rot" },
          { spielerId: christian.id, team: "Gelb" },
        ],
      },
    },
  });
  await prismaTest.tor.create({
    data: {
      spielId: spiel2025.id,
      scorerId: alexander.id,
      team: "Rot",
      eigentor: false,
    },
  });

  // Saison 2026: Benjamin scores 2 goals (Rot wins 2:0)
  const spiel2026 = await prismaTest.spiel.create({
    data: {
      datum: new Date("2026-01-06"),
      status: "abgeschlossen",
      saisonId: saison2026.id,
      teilnahmen: {
        create: [
          { spielerId: benjamin.id, team: "Rot" },
          { spielerId: daniel.id, team: "Gelb" },
        ],
      },
    },
  });
  await prismaTest.tor.createMany({
    data: [
      {
        spielId: spiel2026.id,
        scorerId: benjamin.id,
        team: "Rot",
        eigentor: false,
      },
      {
        spielId: spiel2026.id,
        scorerId: benjamin.id,
        team: "Rot",
        eigentor: false,
      },
    ],
  });

  return { spieler, saison2025, saison2026 };
}

// ---------------------------------------------------------------------------
// Seed minimal data for golden-path admin flow (scenario 1)
// ---------------------------------------------------------------------------

export async function seedGoldenerPfad() {
  const spieler = await seedSpieler(BASE_SPIELER);
  // Ensure the current year's Saison exists so spielPlanenAction can upsert it
  const saison = await prismaTest.saison.create({ data: { jahr: 2026 } });
  return { spieler, saison };
}
