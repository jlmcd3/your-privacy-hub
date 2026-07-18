import { describe, it, expect } from "vitest";
import {
  computeActiveTo,
  ALL_WORKSPACE_ITEMS,
  PRODUCT_ITEMS,
} from "@/lib/workspaceNav";

/**
 * LEFTNAV-1 coverage test (Task 5): every listed route must yield exactly
 * one active nav item — no double-highlights, no missing highlights for
 * known primary or result routes.
 */

// Routes that MUST resolve to a single specific nav item.
// [pathname, expected `to`]
const EXPECTED: Array<[string, string]> = [
  ["/dashboard", "/dashboard"],
  ["/watchlist", "/watchlist"],
  ["/start", "/start"],
  ["/obligations", "/obligations"],
  ["/obligations/123", "/obligations"],
  ["/account", "/account"],
  ["/brief-preferences", "/account"],

  // 14 product primary routes
  ["/cppa-scope-checker", "/cppa-scope-checker"],
  ["/cppa-risk-assessment", "/cppa-risk-assessment"],
  ["/cppa-cybersecurity", "/cppa-cybersecurity"],
  ["/cppa-admt-checker", "/cppa-admt-checker"],
  ["/us-notices", "/us-notices"],
  ["/li-assessment", "/li-assessment"],
  ["/dpia-framework", "/dpia-framework"],
  ["/governance-assessment", "/governance-assessment"],
  ["/ropa", "/ropa"],
  ["/eu-notices", "/eu-notices"],
  ["/dpa-generator", "/dpa-generator"],
  ["/ir-playbook", "/ir-playbook"],
  ["/biometric-checker", "/biometric-checker"],
  ["/registration-manager", "/registration-manager"],

  // One result / detail route per report-producing tool
  ["/li-assessment/result/abc", "/li-assessment"],
  ["/dpia-framework/result/abc", "/dpia-framework"],
  ["/governance-assessment/result/abc", "/governance-assessment"],
  ["/dpa-generator/result/abc", "/dpa-generator"],
  ["/ir-playbook/result/abc", "/ir-playbook"],
  ["/biometric-checker/result/abc", "/biometric-checker"],
  ["/cppa-risk-assessment/result/abc", "/cppa-risk-assessment"],
  ["/cppa-cybersecurity/result/abc", "/cppa-cybersecurity"],
  ["/cppa-admt-checker/result/abc", "/cppa-admt-checker"],
  ["/registration-manager/my-filings", "/registration-manager"],
  ["/registration-manager/order/abc", "/registration-manager"],
  ["/us-notices/mode", "/us-notices"],
  ["/eu-notices/questions/abc", "/eu-notices"],
  ["/ropa/activities", "/ropa"],
];

// Routes documented as intentionally NOT highlighting anything (Task 4).
const NO_ACTIVE: string[] = [
  "/dashboard/reports",
  "/notices-ropa",
  "/cppa",
  "/cppa-suite/result",
  "/ropa-builder",
];

describe("workspaceNav.computeActiveTo — LEFTNAV-1 coverage", () => {
  it.each(EXPECTED)("resolves %s -> %s (single match)", (path, expected) => {
    expect(computeActiveTo(path, "")).toBe(expected);

    // Also assert exactly one item in ALL_WORKSPACE_ITEMS matches.
    const matches = ALL_WORKSPACE_ITEMS.filter((it) => it.match(path, ""));
    expect(matches.map((m) => m.to)).toEqual([expected]);
  });

  it.each(NO_ACTIVE)("returns null for legacy list route %s", (path) => {
    expect(computeActiveTo(path, "")).toBe(null);
  });

  it("has 14 products across the three category groups", () => {
    expect(PRODUCT_ITEMS).toHaveLength(14);
  });

  it("has no product with a duplicate `to`", () => {
    const seen = new Set<string>();
    for (const p of PRODUCT_ITEMS) {
      expect(seen.has(p.to)).toBe(false);
      seen.add(p.to);
    }
  });
});
