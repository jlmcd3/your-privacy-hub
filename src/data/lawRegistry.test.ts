import { describe, it, expect } from "vitest";
import { LAW_REGISTRY, findLaw, isUrlFresh } from "./lawRegistry";

describe("lawRegistry", () => {
  it("has no duplicate canonical names", () => {
    const names = LAW_REGISTRY.map((e) => e.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it("every entry has an internal path on /jurisdiction/*", () => {
    for (const e of LAW_REGISTRY) {
      expect(e.internalPath, e.name).toMatch(/^\/jurisdiction\//);
    }
  });

  it("every entry has an https officialUrl", () => {
    for (const e of LAW_REGISTRY) {
      expect(e.officialUrl, e.name).toMatch(/^https:\/\//);
    }
  });

  it("verifiedAt is null or a valid ISO date", () => {
    for (const e of LAW_REGISTRY) {
      if (e.verifiedAt === null) continue;
      const t = new Date(e.verifiedAt).getTime();
      expect(Number.isNaN(t), `${e.name}: ${e.verifiedAt}`).toBe(false);
    }
  });

  it("findLaw matches by canonical name (case-insensitive)", () => {
    expect(findLaw("EU AI Act")?.name).toBe("EU AI Act");
    expect(findLaw("eu ai act")?.name).toBe("EU AI Act");
    expect(findLaw("  GDPR  ")?.name).toBe("GDPR");
  });

  it("findLaw matches by alias", () => {
    expect(findLaw("California Delete Act")?.name).toBe("SB 362");
    expect(findLaw("KCDPA")?.name).toBe("Kentucky HB 15");
  });

  it("findLaw returns null for unknown or empty", () => {
    expect(findLaw("Unknown Law XYZ")).toBeNull();
    expect(findLaw("")).toBeNull();
    expect(findLaw(null)).toBeNull();
  });

  it("isUrlFresh is false when verifiedAt is null", () => {
    expect(isUrlFresh({ ...LAW_REGISTRY[0], verifiedAt: null })).toBe(false);
  });

  it("isUrlFresh is false for >180-day-old timestamps", () => {
    const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
    expect(isUrlFresh({ ...LAW_REGISTRY[0], verifiedAt: old })).toBe(false);
  });

  it("isUrlFresh is true for recent timestamps", () => {
    const recent = new Date().toISOString();
    expect(isUrlFresh({ ...LAW_REGISTRY[0], verifiedAt: recent })).toBe(true);
  });
});
