// BIO-REG-W1 (2026-07-24T00:15:00Z) — Registry self-consistency test.
//
// Contract: for EVERY row in BIOMETRIC_STATUTE_REGISTRY, the `pinpoint`
// literal MUST appear as a substring of that row's `verbatim_quote`. This
// makes it structurally impossible to ship a pinpoint the quote does not
// support. Also asserts required fields and primary_source_url shape.

import { describe, it, expect } from "vitest";
import {
  BIOMETRIC_STATUTE_REGISTRY,
  BIOMETRIC_REGISTRY_JURISDICTIONS,
  BIOMETRIC_REGISTRY_VERSION,
  listRegistryJurisdictions,
} from "../../../supabase/functions/_shared/registry/biometric-statute-registry.ts";

describe("biometric statute registry — self-consistency", () => {
  it("stamps a non-empty registry version", () => {
    // Registry version tag family — bio-reg-w<wave>[-s<sweep>]-YYYY-MM-DD.
    expect(BIOMETRIC_REGISTRY_VERSION).toMatch(/^bio-reg-w\d(?:-s\d+[a-z]?)?-\d{4}-\d{2}-\d{2}$/);
  });

  it("declares the Wave-1, Wave-2 (S2), and Wave-3 (S3) jurisdictions", () => {
    expect(listRegistryJurisdictions().sort()).toEqual(
      [
        // Wave 1
        "us_co_hb24_1130",
        "us_il_bipa",
        "us_tx_cubi",
        "us_wa_hb1493",
        // Wave 2 (S2)
        "us_ar_pipa",
        "us_ca_cpra",
        "us_ny_shield",
        // Wave 3 (S3)
        "au_privacy_act",
        "ca_pipeda",
        "eu_gdpr",
        "sg_pdpa",
        "uk_gdpr",
      ].sort(),
    );
  });

  it("has at least one row per registered jurisdiction", () => {
    for (const jid of Object.keys(BIOMETRIC_REGISTRY_JURISDICTIONS)) {
      const rows = BIOMETRIC_STATUTE_REGISTRY.filter(
        (r) => r.jurisdiction_id === jid,
      );
      expect(rows.length, `no rows for ${jid}`).toBeGreaterThan(0);
    }
  });

  it("has unique row ids", () => {
    const ids = BIOMETRIC_STATUTE_REGISTRY.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every row's pinpoint appears verbatim in its verbatim_quote", () => {
    const offenders: string[] = [];
    for (const row of BIOMETRIC_STATUTE_REGISTRY) {
      if (!row.verbatim_quote.includes(row.pinpoint)) {
        offenders.push(`${row.id} → pinpoint="${row.pinpoint}"`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("every row supplies a primary_source_url and verification_date", () => {
    for (const row of BIOMETRIC_STATUTE_REGISTRY) {
      expect(row.primary_source_url, row.id).toMatch(/^https?:\/\//);
      expect(row.verification_date, row.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("every row declares at least one applicability predicate", () => {
    for (const row of BIOMETRIC_STATUTE_REGISTRY) {
      expect(row.applicability_predicates.length, row.id).toBeGreaterThan(0);
    }
  });
});

// S2b-fix — enum-label → registry-row mapping CI. Guarantees each discrete
// JURS enum entry the intake form now offers for CA / CO / NY resolves
// into the expected registry jurisdiction via biometric-select.
import { resolveJurisdictions } from "../../../supabase/functions/_shared/registry/biometric-select.ts";

describe("biometric selector — discrete enum-label mapping (S2b)", () => {
  const cases: Array<[string, string]> = [
    ["California, USA (CCPA/CPRA)", "us_ca_cpra"],
    ["Colorado, USA (CPA)", "us_co_hb24_1130"],
    ["New York, USA (SHIELD)", "us_ny_shield"],
  ];
  for (const [label, expectedId] of cases) {
    it(`maps "${label}" → ${expectedId} via direct_selection`, () => {
      const r = resolveJurisdictions({ jurisdictions: [label], other_state_names: "" });
      const hit = r.registered.find((x) => x.jurisdiction_id === expectedId);
      expect(hit, `no registered row for ${label}`).toBeTruthy();
      expect(hit!.source).toBe("direct_selection");
    });
  }
});

// S3 — enum-label → registry-row mapping CI for the Wave-3 non-US regimes.
// UK GDPR must NOT co-select EU GDPR (and vice-versa) when only one is
// selected; both may co-exist when both labels are present.
describe("biometric selector — discrete enum-label mapping (S3)", () => {
  const cases: Array<[string, string]> = [
    ["EU / EEA (GDPR)", "eu_gdpr"],
    ["United Kingdom (UK GDPR)", "uk_gdpr"],
    ["Canada (PIPEDA / provincial)", "ca_pipeda"],
    ["Australia (Privacy Act)", "au_privacy_act"],
    ["Singapore (PDPA)", "sg_pdpa"],
  ];
  for (const [label, expectedId] of cases) {
    it(`maps "${label}" → ${expectedId} via direct_selection`, () => {
      const r = resolveJurisdictions({ jurisdictions: [label], other_state_names: "" });
      const hit = r.registered.find((x) => x.jurisdiction_id === expectedId);
      expect(hit, `no registered row for ${label}`).toBeTruthy();
      expect(hit!.source).toBe("direct_selection");
    });
  }

  it("UK-only selection does NOT co-select EU GDPR", () => {
    const r = resolveJurisdictions({
      jurisdictions: ["United Kingdom (UK GDPR)"],
      other_state_names: "",
    });
    expect(r.registered.some((x) => x.jurisdiction_id === "eu_gdpr")).toBe(false);
    expect(r.registered.some((x) => x.jurisdiction_id === "uk_gdpr")).toBe(true);
  });

  it("EU + UK selection produces both registry ids", () => {
    const r = resolveJurisdictions({
      jurisdictions: ["EU / EEA (GDPR)", "United Kingdom (UK GDPR)"],
      other_state_names: "",
    });
    expect(r.registered.some((x) => x.jurisdiction_id === "eu_gdpr")).toBe(true);
    expect(r.registered.some((x) => x.jurisdiction_id === "uk_gdpr")).toBe(true);
  });
});
