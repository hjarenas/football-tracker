-- CreateEnum
CREATE TYPE "Team" AS ENUM ('Rot', 'Gelb');

-- CreateEnum
CREATE TYPE "SpielStatus" AS ENUM ('geplant', 'teams_zugewiesen', 'abgeschlossen', 'abgesagt');

-- CreateTable
CREATE TABLE "Spieler" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aktiv" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Spieler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Saison" (
    "id" TEXT NOT NULL,
    "jahr" INTEGER NOT NULL,

    CONSTRAINT "Saison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spiel" (
    "id" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "status" "SpielStatus" NOT NULL DEFAULT 'geplant',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "saisonId" TEXT NOT NULL,
    "bierbringerId" TEXT,

    CONSTRAINT "Spiel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spielteilnahme" (
    "id" TEXT NOT NULL,
    "team" "Team" NOT NULL,
    "punkteOverride" "Team",
    "spielerId" TEXT NOT NULL,
    "spielId" TEXT NOT NULL,

    CONSTRAINT "Spielteilnahme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tor" (
    "id" TEXT NOT NULL,
    "team" "Team" NOT NULL,
    "eigentor" BOOLEAN NOT NULL DEFAULT false,
    "spielId" TEXT NOT NULL,
    "scorerId" TEXT NOT NULL,
    "assistId" TEXT,

    CONSTRAINT "Tor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Spieler_name_key" ON "Spieler"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Saison_jahr_key" ON "Saison"("jahr");

-- CreateIndex
CREATE UNIQUE INDEX "Spielteilnahme_spielerId_spielId_key" ON "Spielteilnahme"("spielerId", "spielId");

-- AddForeignKey
ALTER TABLE "Spiel" ADD CONSTRAINT "Spiel_saisonId_fkey" FOREIGN KEY ("saisonId") REFERENCES "Saison"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spiel" ADD CONSTRAINT "Spiel_bierbringerId_fkey" FOREIGN KEY ("bierbringerId") REFERENCES "Spieler"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spielteilnahme" ADD CONSTRAINT "Spielteilnahme_spielerId_fkey" FOREIGN KEY ("spielerId") REFERENCES "Spieler"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spielteilnahme" ADD CONSTRAINT "Spielteilnahme_spielId_fkey" FOREIGN KEY ("spielId") REFERENCES "Spiel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tor" ADD CONSTRAINT "Tor_spielId_fkey" FOREIGN KEY ("spielId") REFERENCES "Spiel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tor" ADD CONSTRAINT "Tor_scorerId_fkey" FOREIGN KEY ("scorerId") REFERENCES "Spieler"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tor" ADD CONSTRAINT "Tor_assistId_fkey" FOREIGN KEY ("assistId") REFERENCES "Spieler"("id") ON DELETE SET NULL ON UPDATE CASCADE;
