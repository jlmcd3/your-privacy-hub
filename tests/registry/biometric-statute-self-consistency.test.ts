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
} from "../../supabase/functions/_shared/registry/biometric-statute-registry.ts";

describe("biometric statute registry — self-consistency", () => {
  it("stamps a non-empty registry version", () => {
    expect(BIOMETRIC_REGISTRY_VERSION).toMatch(/^bio-reg-w\d/);
  });

  it("declares the four Wave-1 jurisdictions", () => {
    expect(listRegistryJurisdictions().sort()).toEqual(
      ["us_co_hb24_1130", "us_il_bipa", "us_tx_cubi", "us_wa_hb1493"].sort(),
    );
  });

  it("has at least one row per Wave-1 jurisdiction", () => {
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
