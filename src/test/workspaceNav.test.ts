import { describe, it, expect } from "vitest";
import {
  computeActiveTo,
  computeActiveReportsSub,
  ALL_WORKSPACE_ITEMS,
  LIBRARY_ITEMS,
  REPORTS_SUBITEMS,
} from "@/lib/workspaceNav";

/**
 * LEFTNAV-2 coverage test: every listed route must yield exactly one active
 * nav item — no double-highlights, no missing highlights for known primary
 * or result routes. The sidebar is now LIBRARY-first: the sidebar contains
 * no product-creation entries; result routes highlight "Reports".
 */

// Routes that MUST resolve to a single specific nav item.
// [pathname, search, expected `to`]
const EXPECTED: Array<[string, string, string]> = [
  ["/dashboard", "", "/dashboard"],
  ["/watchlist", "", "/watchlist"],
  ["/start", "", "/start"],

  // Library — Reports (parent claims all filter variants)
  ["/dashboard/reports", "", "/dashboard/reports"],
  ["/dashboard/reports", "?family=cppa", "/dashboard/reports"],
  ["/dashboard/reports", "?family=gdpr", "/dashboard/reports"],

  // Former per-tool result routes all now highlight Reports.
  ["/li-assessment/result/abc", "", "/dashboard/reports"],
  ["/dpia-framework/result/abc", "", "/dashboard/reports"],
  ["/governance-assessment/result/abc", "", "/dashboard/reports"],
  ["/dpa-generator/result/abc", "", "/dashboard/reports"],
  ["/ir-playbook/result/abc", "", "/dashboard/reports"],
  ["/biometric-checker/result/abc", "", "/dashboard/reports"],
  ["/cppa-risk-assessment/result/abc", "", "/dashboard/reports"],
  ["/cppa-cybersecurity/result/abc", "", "/dashboard/reports"],
  ["/cppa-admt-checker/result/abc", "", "/dashboard/reports"],
  ["/cppa-scope-checker", "", "/dashboard/reports"],

  // Library — Notices & RoPA
  ["/notices-ropa", "", "/notices-ropa"],
  ["/us-notices/abc/documents", "", "/notices-ropa"],
  ["/eu-notices/questions/abc", "", "/notices-ropa"],
  ["/ropa/documents", "", "/notices-ropa"],
  ["/ropa/activities", "", "/notices-ropa"],

  // Library — Filings
  ["/registration-manager", "", "/registration-manager/my-filings"],
  ["/registration-manager/my-filings", "", "/registration-manager/my-filings"],
  ["/registration-manager/order/abc", "", "/registration-manager/my-filings"],

  // Library — Obligations
  ["/obligations", "", "/obligations"],
  ["/obligations/123", "", "/obligations"],

  // Account
  ["/account", "", "/account"],
  ["/brief-preferences", "", "/account"],
];

// Routes documented as intentionally NOT highlighting anything.
// Product intake / creation pages live on /start, not the library.
const NO_ACTIVE: string[] = [
  "/li-assessment",
  "/dpia-framework",
  "/governance-assessment",
  "/dpa-generator",
  "/ir-playbook",
  "/biometric-checker",
  "/cppa-risk-assessment",
  "/cppa-cybersecurity",
  "/cppa-admt-checker",
  "/cppa",
  "/cppa-suite/result",
];

describe("workspaceNav.computeActiveTo — LEFTNAV-2 coverage", () => {
  it.each(EXPECTED)(
    "resolves %s%s -> %s (single match)",
    (path, search, expected) => {
      expect(computeActiveTo(path, "", search)).toBe(expected);

      // Exactly one item in ALL_WORKSPACE_ITEMS matches.
      const matches = ALL_WORKSPACE_ITEMS.filter((it) =>
        it.match(path, "", search),
      );
      expect(matches.map((m) => m.to)).toEqual([expected]);
    },
  );

  it.each(NO_ACTIVE)("returns null for non-library route %s", (path) => {
    expect(computeActiveTo(path, "", "")).toBe(null);
  });

  it("Library has exactly 4 items (Reports, Notices & RoPA, Filings, Obligations)", () => {
    expect(LIBRARY_ITEMS.map((i) => i.label)).toEqual([
      "Reports",
      "Notices & RoPA",
      "Filings",
      "Obligations",
    ]);
  });

  it("Reports has three sub-items (CPPA, GDPR, All jurisdictions)", () => {
    expect(REPORTS_SUBITEMS.map((s) => s.id)).toEqual(["cppa", "gdpr", "all"]);
  });
});

describe("computeActiveReportsSub", () => {
  it("returns null off the reports page", () => {
    expect(computeActiveReportsSub("/dashboard", "")).toBe(null);
    expect(computeActiveReportsSub("/li-assessment/result/x", "")).toBe(null);
  });
  it("returns 'all' on plain /dashboard/reports", () => {
    expect(computeActiveReportsSub("/dashboard/reports", "")).toBe("all");
  });
  it("returns 'cppa' when family=cppa", () => {
    expect(computeActiveReportsSub("/dashboard/reports", "?family=cppa")).toBe(
      "cppa",
    );
  });
  it("returns 'gdpr' when family=gdpr", () => {
    expect(computeActiveReportsSub("/dashboard/reports", "?family=gdpr")).toBe(
      "gdpr",
    );
  });
});
