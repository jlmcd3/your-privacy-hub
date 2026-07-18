import { describe, it, expect } from "vitest";
import {
  computeActiveTo,
  computeActiveGroupId,
  ALL_LEAF_ITEMS,
  WORKSPACE_GROUPS,
  STANDALONE_ITEMS,
  ASSESSMENTS_SUB_GDPR,
  ASSESSMENTS_SUB_CPPA,
  ASSESSMENTS_SUB_BIOMETRIC,
  NOTICES_SUB_US,
  NOTICES_SUB_EU,
  NOTICES_SUB_PLAYBOOKS,
  CONTRACTS_SUB_DPAS,
  CONTRACTS_SUB_ROPA,
} from "@/lib/workspaceNav";

/**
 * LEFTNAV-3 coverage — every route must resolve to exactly one active leaf.
 */

const EXPECTED: Array<[string, string, string]> = [
  // Top / chrome
  ["/dashboard", "", "/dashboard"],
  ["/watchlist", "", "/watchlist"],
  ["/start", "", "/start"],

  // Assessments sub-items (via URL params)
  [
    "/dashboard/reports",
    "?group=assessments&family=gdpr",
    ASSESSMENTS_SUB_GDPR.to,
  ],
  [
    "/dashboard/reports",
    "?group=assessments&family=cppa",
    ASSESSMENTS_SUB_CPPA.to,
  ],
  [
    "/dashboard/reports",
    "?group=assessments&family=biometric",
    ASSESSMENTS_SUB_BIOMETRIC.to,
  ],
  // Plain /dashboard/reports falls back to GDPR (Assessments' first item).
  ["/dashboard/reports", "", ASSESSMENTS_SUB_GDPR.to],

  // Notices & policies
  ["/notices-ropa", "?kind=us", NOTICES_SUB_US.to],
  ["/notices-ropa", "?kind=eu", NOTICES_SUB_EU.to],
  // Plain /notices-ropa falls back to US notices.
  ["/notices-ropa", "", NOTICES_SUB_US.to],
  ["/dashboard/reports", "?group=playbooks", NOTICES_SUB_PLAYBOOKS.to],

  // Contracts & records
  ["/dashboard/reports", "?group=dpas", CONTRACTS_SUB_DPAS.to],
  ["/notices-ropa", "?kind=ropa", CONTRACTS_SUB_ROPA.to],

  // Per-tool result routes -> their family sub-item.
  ["/li-assessment/result/abc", "", ASSESSMENTS_SUB_GDPR.to],
  ["/dpia-framework/result/abc", "", ASSESSMENTS_SUB_GDPR.to],
  ["/governance-assessment/result/abc", "", ASSESSMENTS_SUB_GDPR.to],
  ["/cppa-risk-assessment/result/abc", "", ASSESSMENTS_SUB_CPPA.to],
  ["/cppa-cybersecurity/result/abc", "", ASSESSMENTS_SUB_CPPA.to],
  ["/cppa-admt-checker/result/abc", "", ASSESSMENTS_SUB_CPPA.to],
  ["/cppa-scope-checker", "", ASSESSMENTS_SUB_CPPA.to],
  ["/biometric-checker/result/abc", "", ASSESSMENTS_SUB_BIOMETRIC.to],
  ["/ir-playbook/result/abc", "", NOTICES_SUB_PLAYBOOKS.to],
  ["/dpa-generator/result/abc", "", CONTRACTS_SUB_DPAS.to],

  // Deep notice/ropa routes.
  ["/us-notices/abc/documents", "", NOTICES_SUB_US.to],
  ["/eu-notices/questions/abc", "", NOTICES_SUB_EU.to],
  ["/ropa/documents", "", CONTRACTS_SUB_ROPA.to],
  ["/ropa/activities", "", CONTRACTS_SUB_ROPA.to],

  // Standalones
  ["/registration-manager", "", "/registration-manager/my-filings"],
  ["/registration-manager/my-filings", "", "/registration-manager/my-filings"],
  ["/registration-manager/order/abc", "", "/registration-manager/my-filings"],
  ["/obligations", "", "/obligations"],
  ["/obligations/123", "", "/obligations"],

  // Account
  ["/account", "", "/account"],
  ["/brief-preferences", "", "/account"],
];

// Product-creation intake pages live on /start, not the library.
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
];

describe("workspaceNav.computeActiveTo — LEFTNAV-3", () => {
  it.each(EXPECTED)(
    "resolves %s%s -> %s (single match)",
    (path, search, expected) => {
      expect(computeActiveTo(path, "", search)).toBe(expected);
      // Exactly one leaf claims the route (first-match-wins).
      const matches = ALL_LEAF_ITEMS.filter((it) => it.match(path, "", search));
      expect(matches[0]?.to).toBe(expected);
    },
  );

  it.each(NO_ACTIVE)("returns null for non-library route %s", (path) => {
    expect(computeActiveTo(path, "", "")).toBe(null);
  });

  it("has three groups (Assessments, Notices & policies, Contracts & records)", () => {
    expect(WORKSPACE_GROUPS.map((g) => g.label)).toEqual([
      "Assessments",
      "Notices & policies",
      "Contracts & records",
    ]);
  });

  it("Assessments has GDPR / CPPA / Biometric", () => {
    expect(WORKSPACE_GROUPS[0].items.map((i) => i.label)).toEqual([
      "GDPR",
      "CPPA",
      "Biometric",
    ]);
  });

  it("Standalones are Registrations and Deadlines & Reminders", () => {
    expect(STANDALONE_ITEMS.map((i) => i.label)).toEqual([
      "Registrations",
      "Deadlines & Reminders",
    ]);
  });
});

describe("computeActiveGroupId", () => {
  it("returns 'assessments' on GDPR sub-item", () => {
    expect(
      computeActiveGroupId(
        "/dashboard/reports",
        "",
        "?group=assessments&family=cppa",
      ),
    ).toBe("assessments");
  });
  it("returns 'notices_policies' on Playbooks sub-item", () => {
    expect(
      computeActiveGroupId("/dashboard/reports", "", "?group=playbooks"),
    ).toBe("notices_policies");
  });
  it("returns 'contracts_records' on RoPA sub-item", () => {
    expect(computeActiveGroupId("/notices-ropa", "", "?kind=ropa")).toBe(
      "contracts_records",
    );
  });
  it("returns null for standalones", () => {
    expect(computeActiveGroupId("/obligations", "", "")).toBe(null);
    expect(
      computeActiveGroupId("/registration-manager/my-filings", "", ""),
    ).toBe(null);
  });
});
