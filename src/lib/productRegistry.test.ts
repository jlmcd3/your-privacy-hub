import { describe, it, expect } from "vitest";
import { PRODUCT_REGISTRY, getProduct, findProductsByText } from "./productRegistry";

describe("productRegistry", () => {
  it("has unique slugs", () => {
    const slugs = PRODUCT_REGISTRY.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has unique priorities", () => {
    const priorities = PRODUCT_REGISTRY.map((p) => p.priority);
    expect(new Set(priorities).size).toBe(priorities.length);
  });

  it("every entry has a non-empty name", () => {
    for (const p of PRODUCT_REGISTRY) {
      expect(p.name, p.slug).toBeTruthy();
      expect(p.name.trim().length, p.slug).toBeGreaterThan(0);
    }
  });

  it("every entry has a route starting with /", () => {
    for (const p of PRODUCT_REGISTRY) {
      expect(p.route, p.slug).toMatch(/^\//);
    }
  });

  it("every entry has at least 3 triggers", () => {
    for (const p of PRODUCT_REGISTRY) {
      expect(p.triggers.length, p.slug).toBeGreaterThanOrEqual(3);
    }
  });

  it("every trigger is lowercase", () => {
    for (const p of PRODUCT_REGISTRY) {
      for (const t of p.triggers) {
        expect(t, `${p.slug}: ${t}`).toBe(t.toLowerCase());
      }
    }
  });

  it("getProduct returns the entry for a known slug", () => {
    expect(getProduct("ir-playbook").route).toBe("/ir-playbook");
  });

  it("getProduct throws for unknown slug", () => {
    expect(() => getProduct("nope")).toThrow();
  });

  it("findProductsByText matches and sorts by priority", () => {
    const results = findProductsByText(
      "We need a breach response plan and a CPPA risk assessment.",
    );
    const slugs = results.map((r) => r.slug);
    expect(slugs).toContain("ir-playbook");
    expect(slugs).toContain("cppa-risk-assessment");
    // CPPA risk (priority 1) sorts before IR Playbook (priority 7).
    expect(slugs.indexOf("cppa-risk-assessment")).toBeLessThan(
      slugs.indexOf("ir-playbook"),
    );
  });

  it("findProductsByText returns [] for empty input", () => {
    expect(findProductsByText("")).toEqual([]);
  });
});
