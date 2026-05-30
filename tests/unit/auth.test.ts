/**
 * Unit tests for admin authentication middleware logic.
 * Tests pure helper functions from auth-utils.ts.
 */
import { describe, it, expect } from "vitest";
import {
  parseAdminCredentials,
  isValidAdminCredential,
  isAdminPath,
  isAuthenticatedSession,
} from "@/lib/auth-utils";

// ---------------------------------------------------------------------------
// parseAdminCredentials
// ---------------------------------------------------------------------------
describe("parseAdminCredentials", () => {
  it("parst eine einzelne username:password Kombination", () => {
    const map = parseAdminCredentials("admin:geheim");
    expect(map.size).toBe(1);
    expect(map.get("admin")).toBe("geheim");
  });

  it("parst mehrere Kombinationen getrennt durch Kommas", () => {
    const map = parseAdminCredentials("admin:geheim,coach:passwort123");
    expect(map.size).toBe(2);
    expect(map.get("admin")).toBe("geheim");
    expect(map.get("coach")).toBe("passwort123");
  });

  it("ignoriert leere Eintraege", () => {
    const map = parseAdminCredentials("");
    expect(map.size).toBe(0);
  });

  it("ignoriert Eintraege ohne Doppelpunkt", () => {
    const map = parseAdminCredentials("keinDoppelpunkt,admin:ok");
    expect(map.size).toBe(1);
    expect(map.get("admin")).toBe("ok");
  });

  it("trimmt Leerzeichen um Benutzername und Passwort", () => {
    const map = parseAdminCredentials(" admin : geheim ");
    expect(map.get("admin")).toBe("geheim");
  });

  it("erlaubt Doppelpunkte im Passwort", () => {
    const map = parseAdminCredentials("admin:pass:with:colons");
    expect(map.get("admin")).toBe("pass:with:colons");
  });
});

// ---------------------------------------------------------------------------
// isValidAdminCredential
// ---------------------------------------------------------------------------
describe("isValidAdminCredential", () => {
  const admins = new Map([
    ["admin", "geheim"],
    ["coach", "passwort123"],
  ]);

  it("gibt true zurueck bei gueltigen Zugangsdaten", () => {
    expect(isValidAdminCredential("admin", "geheim", admins)).toBe(true);
  });

  it("gibt false zurueck bei falschem Passwort", () => {
    expect(isValidAdminCredential("admin", "falsch", admins)).toBe(false);
  });

  it("gibt false zurueck bei unbekanntem Benutzernamen", () => {
    expect(isValidAdminCredential("unbekannt", "geheim", admins)).toBe(false);
  });

  it("gibt false zurueck wenn Benutzername undefined ist", () => {
    expect(isValidAdminCredential(undefined, "geheim", admins)).toBe(false);
  });

  it("gibt false zurueck wenn Passwort undefined ist", () => {
    expect(isValidAdminCredential("admin", undefined, admins)).toBe(false);
  });

  it("gibt false zurueck bei leerer Admin-Map (kein Whitelist-Eintrag)", () => {
    expect(isValidAdminCredential("admin", "geheim", new Map())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isAdminPath
// ---------------------------------------------------------------------------
describe("isAdminPath", () => {
  it("erkennt /admin als Admin-Route", () => {
    expect(isAdminPath("/admin")).toBe(true);
  });

  it("erkennt /admin/spieler als Admin-Route", () => {
    expect(isAdminPath("/admin/spieler")).toBe(true);
  });

  it("erkennt /admin/spiele/123 als Admin-Route", () => {
    expect(isAdminPath("/admin/spiele/123")).toBe(true);
  });

  it("erkennt / als oeffentliche Route", () => {
    expect(isAdminPath("/")).toBe(false);
  });

  it("erkennt /anmelden als oeffentliche Route", () => {
    expect(isAdminPath("/anmelden")).toBe(false);
  });

  it("erkennt /api/auth/session als oeffentliche Route", () => {
    expect(isAdminPath("/api/auth/session")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isAuthenticatedSession
// ---------------------------------------------------------------------------
describe("isAuthenticatedSession", () => {
  it("gibt true zurueck bei einer gueltigen Session mit user", () => {
    const session = { user: { id: "admin", name: "admin" }, expires: "2099-01-01" };
    expect(isAuthenticatedSession(session)).toBe(true);
  });

  it("gibt false zurueck bei null (keine Session)", () => {
    expect(isAuthenticatedSession(null)).toBe(false);
  });

  it("gibt false zurueck bei undefined", () => {
    expect(isAuthenticatedSession(undefined)).toBe(false);
  });

  it("gibt false zurueck bei einem Objekt ohne user-Eigenschaft", () => {
    expect(isAuthenticatedSession({ expires: "2099-01-01" })).toBe(false);
  });

  it("gibt false zurueck wenn user null ist", () => {
    expect(isAuthenticatedSession({ user: null, expires: "2099-01-01" })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Middleware-Logik (integriert): Admin-Routen ohne Session werden abgelehnt
// ---------------------------------------------------------------------------
describe("Middleware-Logik: Admin-Routen", () => {
  it("Admin-Route ohne Session -> Weiterleitung erforderlich", () => {
    const path = "/admin";
    const session = null;
    const shouldRedirect = isAdminPath(path) && !isAuthenticatedSession(session);
    expect(shouldRedirect).toBe(true);
  });

  it("Admin-Route mit gueltiger Session -> kein Redirect", () => {
    const path = "/admin/spieler";
    const session = { user: { id: "admin", name: "admin" }, expires: "2099-01-01" };
    const shouldRedirect = isAdminPath(path) && !isAuthenticatedSession(session);
    expect(shouldRedirect).toBe(false);
  });

  it("Admin-Route mit Nicht-Admin-Session (kein user) -> Weiterleitung erforderlich", () => {
    const path = "/admin";
    // Session object exists but has no user -> not authenticated
    const session = { expires: "2099-01-01" };
    const shouldRedirect = isAdminPath(path) && !isAuthenticatedSession(session);
    expect(shouldRedirect).toBe(true);
  });

  it("Oeffentliche Route ohne Session -> kein Redirect", () => {
    const path = "/";
    const session = null;
    const shouldRedirect = isAdminPath(path) && !isAuthenticatedSession(session);
    expect(shouldRedirect).toBe(false);
  });

  it("Oeffentliche Route /anmelden ohne Session -> kein Redirect", () => {
    const path = "/anmelden";
    const session = null;
    const shouldRedirect = isAdminPath(path) && !isAuthenticatedSession(session);
    expect(shouldRedirect).toBe(false);
  });
});
