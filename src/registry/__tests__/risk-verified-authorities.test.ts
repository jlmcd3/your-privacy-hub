// RISK-REGISTRY-WIRING (2026-07-24) — cppa-risk verified-authority registry
// row-shape/anchor/version tests. Mirrors admt-verified-authorities.test.ts.

import { describe, it, expect } from "vitest";

import {
  validateRegistry,
  registrySize,
  requireVerified,
  resolveByPropositionKey,
  rowsForCitation,
} from "../../../supabase/functions/_shared/verified-authority-resolver.ts";

import {
  RISK_VERIFIED_AUTHORITIES,
  RISK_VERIFIED_AUTHORITY_ROWS,
  RISK_VERIFIED_AUTHORITY_VERSION,
} from "../../../supabase/functions/_shared/registry/risk-verified-authorities.ts";

describe("cppa-risk verified-authority registry — row-shape contract", () => {
  it("stamps a non-empty version tag", () => {
    expect(RISK_VERIFIED_AUTHORITY_VERSION).toMatch(/^risk-va-w\d+-\d{4}-\d{2}-\d{2}$/);
  });

  it("has a non-trivial number of rows (covers §§ 7150–7157 + statutory anchors)", () => {
    expect(registrySize(RISK_VERIFIED_AUTHORITIES)).toBeGreaterThanOrEqual(30);
  });

  it("every row satisfies validateRegistry (required fields, enums, URL, depth coherence)", () => {
    const errs = validateRegistry(RISK_VERIFIED_AUTHORITIES);
    if (errs.length) {
      // eslint-disable-next-line no-console
      console.error("[risk-va] shape violations:", errs);
    }
    expect(errs).toEqual([]);
  });

  it("proposition_keys are unique across the row array", () => {
    const keys = RISK_VERIFIED_AUTHORITY_ROWS.map((r) => r.proposition_key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("requireVerified throws on unknown keys and returns the row on known keys", () => {
    expect(() => requireVerified(RISK_VERIFIED_AUTHORITIES, "does_not_exist")).toThrow();
    const row = requireVerified(RISK_VERIFIED_AUTHORITIES, "ra_trigger_admt");
    expect(row.subsection).toBe("11 CCR § 7150(b)(3)");
    expect(row.depth_class).toBe("sub_subsection");
  });

  it("resolveByPropositionKey returns null on unknown keys (never throws)", () => {
    expect(resolveByPropositionKey(RISK_VERIFIED_AUTHORITIES, "nope")).toBeNull();
  });

  it("rowsForCitation groups § 7150 triggers together", () => {
    const s7150 = rowsForCitation(RISK_VERIFIED_AUTHORITIES, "11 CCR § 7150");
    // (a) + (b) intro + six (b)(N) triggers + HR exclusion = at least 8
    expect(s7150.length).toBeGreaterThanOrEqual(8);
    for (const r of s7150) expect(r.citation).toBe("11 CCR § 7150");
  });

  it("rowsForCitation groups § 7152 content requirements together", () => {
    const s7152 = rowsForCitation(RISK_VERIFIED_AUTHORITIES, "11 CCR § 7152");
    expect(s7152.length).toBeGreaterThanOrEqual(10);
    for (const r of s7152) expect(r.citation).toBe("11 CCR § 7152");
  });

  it("§ 7150(b)(4) and (b)(5) are SEPARATE rows with distinct predicates", () => {
    const b4 = requireVerified(RISK_VERIFIED_AUTHORITIES, "ra_trigger_infer_context");
    const b5 = requireVerified(RISK_VERIFIED_AUTHORITIES, "ra_trigger_infer_sensitive_location");
    expect(b4.subsection).toBe("11 CCR § 7150(b)(4)");
    expect(b5.subsection).toBe("11 CCR § 7150(b)(5)");
    expect(b4.verbatim_quote).not.toBe(b5.verbatim_quote);
    // b4 predicate: systematic observation in workplace/education capacity.
    expect(b4.verbatim_quote).toMatch(/systematic observation/);
    // b5 predicate: sensitive location.
    expect(b5.verbatim_quote).not.toMatch(/systematic observation/);
  });

  it("§ 7157 attestation is anchored at (b)(5) and portal is at (d) — no cross-placement", () => {
    const attest = requireVerified(RISK_VERIFIED_AUTHORITIES, "ra_submit_attestation");
    const portal = requireVerified(RISK_VERIFIED_AUTHORITIES, "ra_submit_portal");
    expect(attest.subsection).toBe("11 CCR § 7157(b)(5)");
    expect(portal.subsection).toBe("11 CCR § 7157(d)");
    expect(attest.verbatim_quote).toMatch(/I attest that the business/);
    expect(portal.verbatim_quote).toMatch(/cppa\.ca\.gov/);
  });

  it("Cal. Civ. Code definitions use POST-CPRA lettering (Third party = (ai), not (ad))", () => {
    const tp = requireVerified(RISK_VERIFIED_AUTHORITIES, "ccpa_third_party_def");
    expect(tp.subsection).toBe("Cal. Civ. Code § 1798.140(ai)");
    expect(tp.subsection).not.toMatch(/\(ad\)/);
    expect(tp.verbatim_quote).toMatch(/"Third party"/);
  });

  it("all rows share a single verified_on stamp (hand-verification pass)", () => {
    const stamps = new Set(RISK_VERIFIED_AUTHORITY_ROWS.map((r) => r.verified_on));
    expect(stamps.size).toBe(1);
  });
});
