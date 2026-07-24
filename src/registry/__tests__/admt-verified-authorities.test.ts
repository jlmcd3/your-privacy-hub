// CPPA-PRODUCT-1 / S-A — cppa-admt verified-authority registry tests.
//
// Two contracts:
//   1. Row-shape contract — every row in ADMT_VERIFIED_AUTHORITIES satisfies
//      the VerifiedAuthorityRow shape defined in the shared resolver
//      (required fields, depth enum, ISO date, https URL, subsection depth
//      coherence, unique/consistent keys).
//   2. Coverage contract — every L1-tagged admt finding_check_id in the
//      snapshotted quality_finding_backlog has ≥ 1 covering row in
//      ADMT_COVERAGE. Known gaps are documented in ADMT_COVERAGE_GAPS and
//      surfaced in the coverage summary; the test asserts that no L1 class
//      is silently uncovered.
//
// Runtime: vitest (matches project include glob src/**/*.test.ts).

import { describe, it, expect } from "vitest";

import {
  validateRegistry,
  registrySize,
  requireVerified,
  resolveByPropositionKey,
  rowsForCitation,
} from "../../../supabase/functions/_shared/verified-authority-resolver.ts";

import {
  ADMT_VERIFIED_AUTHORITIES,
  ADMT_VERIFIED_AUTHORITY_ROWS,
  ADMT_VERIFIED_AUTHORITY_VERSION,
} from "../../../supabase/functions/_shared/registry/admt-verified-authorities.ts";

import {
  ADMT_L1_FINDINGS,
  ADMT_COVERAGE,
  ADMT_COVERAGE_GAPS,
  ADMT_BACKLOG_SNAPSHOT,
  coverageSummary,
} from "../../../supabase/functions/_shared/registry/admt-verified-authorities.coverage.ts";

describe("cppa-admt verified-authority registry — row-shape contract", () => {
  it("stamps a non-empty version tag", () => {
    expect(ADMT_VERIFIED_AUTHORITY_VERSION).toMatch(/^admt-va-w\d-\d{4}-\d{2}-\d{2}$/);
  });

  it("has a non-trivial number of rows", () => {
    // S-A minimum: cover the high-frequency admt L1 classes. If this drops
    // below 20, we've lost the definitions / scope / notice / opt-out /
    // access / RA / FSOR coverage the coverage test depends on.
    expect(registrySize(ADMT_VERIFIED_AUTHORITIES)).toBeGreaterThanOrEqual(20);
  });

  it("every row satisfies validateRegistry (required fields, enums, URL, depth coherence)", () => {
    const errs = validateRegistry(ADMT_VERIFIED_AUTHORITIES);
    // Print a helpful diff if this ever fails.
    if (errs.length) {
      // eslint-disable-next-line no-console
      console.error("[admt-va] shape violations:", errs);
    }
    expect(errs).toEqual([]);
  });

  it("proposition_keys are unique across the row array", () => {
    const keys = ADMT_VERIFIED_AUTHORITY_ROWS.map((r) => r.proposition_key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("requireVerified throws on unknown keys and returns the row on known keys", () => {
    expect(() => requireVerified(ADMT_VERIFIED_AUTHORITIES, "does_not_exist")).toThrow();
    const row = requireVerified(ADMT_VERIFIED_AUTHORITIES, "admt_def");
    expect(row.subsection).toBe("11 CCR § 7001(e)");
    expect(row.depth_class).toBe("subsection");
  });

  it("resolveByPropositionKey returns null on unknown keys (never throws)", () => {
    expect(resolveByPropositionKey(ADMT_VERIFIED_AUTHORITIES, "nope")).toBeNull();
  });

  it("rowsForCitation groups by section-level citation", () => {
    const notice = rowsForCitation(ADMT_VERIFIED_AUTHORITIES, "11 CCR § 7220");
    // notice_timing + purpose + optout + access + antiretal + howworks(A/B) + altprocess = 8
    expect(notice.length).toBeGreaterThanOrEqual(7);
    // Every returned row must actually be scoped to § 7220.
    for (const r of notice) expect(r.citation).toBe("11 CCR § 7220");
  });

  it("all rows share a single verified_on stamp (S-A hand-verification pass)", () => {
    const stamps = new Set(ADMT_VERIFIED_AUTHORITY_ROWS.map((r) => r.verified_on));
    expect(stamps.size).toBe(1);
  });
});

describe("cppa-admt verified-authority registry — coverage contract", () => {
  it("snapshot metadata points at the L5 backlog pass", () => {
    expect(ADMT_BACKLOG_SNAPSHOT.tool).toBe("cppa-admt");
    expect(ADMT_BACKLOG_SNAPSHOT.snapshot_at).toBe("2026-07-24T07:40:04Z");
  });

  it("every L1-tagged admt finding class has ≥ 1 covering row", () => {
    const summary = coverageSummary();
    const gaps = summary.filter((s) => s.status === "gap");
    if (gaps.length) {
      // eslint-disable-next-line no-console
      console.error("[admt-va] uncovered L1 classes:", gaps);
    }
    expect(gaps).toEqual([]);
  });

  it("every covering proposition_key in ADMT_COVERAGE actually exists in the registry", () => {
    const missing: { finding_check_id: string; key: string }[] = [];
    for (const [findingId, cov] of Object.entries(ADMT_COVERAGE)) {
      for (const k of cov.prevented_by) {
        if (!ADMT_VERIFIED_AUTHORITIES[k]) missing.push({ finding_check_id: findingId, key: k });
      }
    }
    if (missing.length) {
      // eslint-disable-next-line no-console
      console.error("[admt-va] coverage refers to unknown keys:", missing);
    }
    expect(missing).toEqual([]);
  });

  it("coverage summary reports total prevented occurrences", () => {
    const summary = coverageSummary();
    const totalOcc = summary.reduce((n, s) => n + s.occurrence_count, 0);
    // W5–W8 admt L1 backlog totals — matches the psql read the S-A dispatch reports.
    // 63 + 37 + 26 + 19 + 11 + 8 + 2 = 166
    expect(totalOcc).toBe(166);
    for (const s of summary) expect(s.covering_rows).toBeGreaterThan(0);
  });

  it("known coverage gaps are enumerated and non-empty (S-A does not close all L1 tail)", () => {
    // R-ruling: S-A is authoring only. Additional rows arrive in the admt
    // wiring turn (S-B). Explicit gap enumeration keeps the deferred backlog
    // visible instead of hiding it behind test silence.
    expect(ADMT_COVERAGE_GAPS.length).toBeGreaterThan(0);
    for (const g of ADMT_COVERAGE_GAPS) {
      expect(g.area).toMatch(/\S/);
      expect(g.missing).toMatch(/\S/);
      expect(g.reason).toMatch(/\S/);
      expect(g.deferred_to).toMatch(/\S/);
    }
  });
});
