/**
 * Seed script — populates all known Spieler and the current Saison (2026).
 * Run via: npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const SPIELER_NAMEN: string[] = [
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
  "Klaus Richter",
  "Leon Wolf",
  "Markus Schulz",
  "Niklas Braun",
  "Oliver Hartmann",
  "Patrick Zimmermann",
  "Quentin Krause",
  "Robert Lange",
  "Sebastian Schmitt",
  "Thomas König",
  "Ulrich Fuchs",
  "Valentin Peters",
  "Wolfgang Becker",
  "Xaver Hoffmann",
  "Yannik Lehmann",
  "Zoltan Frank",
  "Andreas Walther",
  "Bernd Roth",
  "Carsten Simon",
  "Dominik Ernst",
  "Erik Keller",
  "Florian Sommer",
  "Günter Neumann",
  "Hendrik Brandt",
  "Ingo Vogel",
  "Jürgen Kuhn",
  "Karl Schwarz",
  "Lars Winter",
  "Martin Haas",
  "Norbert Schumacher",
];

async function main() {
  console.log("Seeding database...");

  // Upsert all Spieler
  for (const name of SPIELER_NAMEN) {
    await prisma.spieler.upsert({
      where: { name },
      update: { aktiv: true },
      create: { name, aktiv: true },
    });
  }
  console.log(`Upserted ${SPIELER_NAMEN.length} Spieler.`);

  // Upsert current Saison (2026)
  const currentYear = 2026;
  await prisma.saison.upsert({
    where: { jahr: currentYear },
    update: {},
    create: { jahr: currentYear },
  });
  console.log(`Upserted Saison ${currentYear}.`);

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
