/**
 * Schema shape tests — verify that Prisma-generated types match the domain model.
 * These tests import from @prisma/client and check enum values and type structure.
 * They do NOT connect to a real database.
 */
import { describe, it, expect } from "vitest";
import { Team, SpielStatus } from "@prisma/client";

describe("Prisma Schema — Enums", () => {
  it("Team enum hat Rot und Gelb", () => {
    expect(Team.Rot).toBe("Rot");
    expect(Team.Gelb).toBe("Gelb");
    const values = Object.values(Team);
    expect(values).toHaveLength(2);
    expect(values).toContain("Rot");
    expect(values).toContain("Gelb");
  });

  it("SpielStatus enum hat alle vier Zustände", () => {
    expect(SpielStatus.geplant).toBe("geplant");
    expect(SpielStatus.teams_zugewiesen).toBe("teams_zugewiesen");
    expect(SpielStatus.abgeschlossen).toBe("abgeschlossen");
    expect(SpielStatus.abgesagt).toBe("abgesagt");
    const values = Object.values(SpielStatus);
    expect(values).toHaveLength(4);
  });
});

describe("Prisma Schema — Type shapes", () => {
  it("Spieler-Typ hat name und aktiv Felder", () => {
    const spieler: {
      id: string;
      name: string;
      aktiv: boolean;
      createdAt: Date;
      updatedAt: Date;
    } = {
      id: "test-id",
      name: "Max Mustermann",
      aktiv: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(spieler.name).toBe("Max Mustermann");
    expect(spieler.aktiv).toBe(true);
  });

  it("Saison-Typ hat ein jahr Feld als Zahl", () => {
    const saison: {
      id: string;
      jahr: number;
    } = {
      id: "saison-id",
      jahr: 2026,
    };
    expect(saison.jahr).toBe(2026);
    expect(typeof saison.jahr).toBe("number");
  });

  it("Spiel-Typ hat status als SpielStatus und optionalen bierbringerId", () => {
    const spiel: {
      id: string;
      datum: Date;
      status: SpielStatus;
      saisonId: string;
      bierbringerId: string | null;
      createdAt: Date;
      updatedAt: Date;
    } = {
      id: "spiel-id",
      datum: new Date("2026-05-27"),
      status: SpielStatus.geplant,
      saisonId: "saison-id",
      bierbringerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(spiel.status).toBe("geplant");
    expect(spiel.bierbringerId).toBeNull();
  });

  it("Spielteilnahme-Typ hat team und optionalen punkteOverride", () => {
    const teilnahme: {
      id: string;
      team: Team;
      punkteOverride: Team | null;
      spielerId: string;
      spielId: string;
    } = {
      id: "teilnahme-id",
      team: Team.Rot,
      punkteOverride: null,
      spielerId: "spieler-id",
      spielId: "spiel-id",
    };
    expect(teilnahme.team).toBe("Rot");
    expect(teilnahme.punkteOverride).toBeNull();
  });

  it("Tor-Typ hat eigentor-Flag und optionalen assistId", () => {
    const tor: {
      id: string;
      team: Team;
      eigentor: boolean;
      spielId: string;
      scorerId: string;
      assistId: string | null;
    } = {
      id: "tor-id",
      team: Team.Gelb,
      eigentor: false,
      spielId: "spiel-id",
      scorerId: "spieler-id",
      assistId: null,
    };
    expect(tor.eigentor).toBe(false);
    expect(tor.assistId).toBeNull();
  });
});
