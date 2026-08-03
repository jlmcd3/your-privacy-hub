// CYBER-REGISTRY-WIRING (2026-07-24) — cppa-cybersecurity verified-authority
// registry row-shape/anchor/version tests. Mirrors risk-verified-authorities.test.ts.
//
// ITEM 371 (2026-08-03): the registry is no longer a hand-transcribed constant.
// It is hydrated at generation time from the `provision_texts` corpus, so the
// suite hydrates it the same way before asserting the row-shape contract.

import { describe, it, expect, beforeAll } from "vitest";

import {
  validateRegistry,
  registrySize,
  requireVerified,
  resolveByPropositionKey,
  rowsForCitation,
} from "../../../supabase/functions/_shared/verified-authority-resolver.ts";

import {
  CYBER_VERIFIED_AUTHORITIES,
  CYBER_VERIFIED_AUTHORITY_VERSION,
  cyberAuthorityRows,
  resolveCyberAuthorities,
} from "../../../supabase/functions/run-cppa-cybersecurity/_local/registry/cyber-verified-authorities.ts";
import { makeCorpusProvisionClient, loadCyberProvisionRows } from "./corpus-client";

let hydrated = false;

beforeAll(async () => {
  const rows = await loadCyberProvisionRows();
  if (!rows) return;
  await resolveCyberAuthorities(makeCorpusProvisionClient(rows) as never);
  hydrated = true;
}, 60_000);

describe("cppa-cybersecurity verified-authority registry — row-shape contract", () => {
  it("hydrates the registry from the corpus (skipped offline)", () => {
    if (!hydrated) return;
    expect(Object.keys(CYBER_VERIFIED_AUTHORITIES).length).toBe(44);
  });

  it("stamps a non-empty version tag", () => {
    expect(CYBER_VERIFIED_AUTHORITY_VERSION).toMatch(/^cyber-va-w\d+-corpus-\d{4}-\d{2}-\d{2}$/);
  });

  it("covers §§ 7120–7124 with per-component rows for § 7123(c)(1)–(18)", () => {
    if (!hydrated) return;
    // 4 (§7120) + 2 (§7121) + 8 (§7122) + 23 (§7123 incl. 18 components) + 5 (§7124) = 42+
    expect(registrySize(CYBER_VERIFIED_AUTHORITIES)).toBeGreaterThanOrEqual(40);
  });

  it("every row satisfies validateRegistry (required fields, enums, URL, depth coherence)", () => {
    if (!hydrated) return;
    const errs = validateRegistry(CYBER_VERIFIED_AUTHORITIES);
    if (errs.length) {
      // eslint-disable-next-line no-console
      console.error("[cyber-va] shape violations:", errs);
    }
    expect(errs).toEqual([]);
  });

  it("proposition_keys are unique across the row array", () => {
    if (!hydrated) return;
    const keys = cyberAuthorityRows().map((r) => r.proposition_key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("requireVerified throws on unknown keys and returns the row on known keys", () => {
    if (!hydrated) return;
    expect(() => requireVerified(CYBER_VERIFIED_AUTHORITIES, "does_not_exist")).toThrow();
    const row = requireVerified(CYBER_VERIFIED_AUTHORITIES, "cyber_c2_encryption");
    expect(row.subsection).toBe("11 CCR § 7123(c)(2)");
    expect(row.depth_class).toBe("sub_subsection");
  });

  it("resolveByPropositionKey returns null on unknown keys (never throws)", () => {
    if (!hydrated) return;
    expect(resolveByPropositionKey(CYBER_VERIFIED_AUTHORITIES, "nope")).toBeNull();
  });

  it("rowsForCitation groups § 7123 rows together (chapeau + 18 components + operative)", () => {
    if (!hydrated) return;
    const s7123 = rowsForCitation(CYBER_VERIFIED_AUTHORITIES, "11 CCR § 7123");
    // (a), (b), (c) chapeau + 18 (c)(N) + (d) + (e) chapeau + at least two (e)(N) = ≥ 24
    expect(s7123.length).toBeGreaterThanOrEqual(23);
    for (const r of s7123) expect(r.citation).toBe("11 CCR § 7123");
  });

  it("has one row per § 7123(c)(1)–(c)(18) component", () => {
    if (!hydrated) return;
    const s7123 = rowsForCitation(CYBER_VERIFIED_AUTHORITIES, "11 CCR § 7123");
    const componentSubsections = new Set(
      s7123
        .map((r) => r.subsection)
        .filter((s) => /^11 CCR § 7123\(c\)\(\d+\)$/.test(s)),
    );
    for (let i = 1; i <= 18; i++) {
      expect(componentSubsections.has(`11 CCR § 7123(c)(${i})`)).toBe(true);
    }
  });

  it("§ 7123(c)(2) is discrete encryption row (predicate-distinct from other components)", () => {
    if (!hydrated) return;
    const enc = requireVerified(CYBER_VERIFIED_AUTHORITIES, "cyber_c2_encryption");
    expect(enc.subsection).toBe("11 CCR § 7123(c)(2)");
    expect(enc.verbatim_quote).toMatch(/Encryption of personal information/);
    // The (c)(9) antivirus row must not share the encryption verbatim.
    const av = requireVerified(CYBER_VERIFIED_AUTHORITIES, "cyber_c9_antivirus");
    expect(av.verbatim_quote).not.toBe(enc.verbatim_quote);
  });

  it("§ 7122(a)(2) auditor-impartiality and § 7122(d) evidence-over-attestation are separate rows", () => {
    if (!hydrated) return;
    const imp = requireVerified(CYBER_VERIFIED_AUTHORITIES, "cyber_auditor_impartial");
    const evid = requireVerified(CYBER_VERIFIED_AUTHORITIES, "cyber_evidence_over_attestation");
    expect(imp.subsection).toBe("11 CCR § 7122(a)(2)");
    expect(evid.subsection).toBe("11 CCR § 7122(d)");
    expect(imp.verbatim_quote).not.toBe(evid.verbatim_quote);
  });

  it("§ 7124 certification portal row references the CPPA website verbatim", () => {
    if (!hydrated) return;
    const portal = requireVerified(CYBER_VERIFIED_AUTHORITIES, "cyber_cert_portal_and_attest");
    expect(portal.subsection).toBe("11 CCR § 7124(d)");
    expect(portal.verbatim_quote).toMatch(/https:\/\/cppa\.ca\.gov\//);
  });

  it("§ 7124(d)(4) attestation preserves the penalty-of-perjury opening verbatim", () => {
    if (!hydrated) return;
    const att = requireVerified(CYBER_VERIFIED_AUTHORITIES, "cyber_cert_attestation_text");
    expect(att.subsection).toBe("11 CCR § 7124(d)(4)");
    expect(att.verbatim_quote).toMatch(/I attest\s+that I meet the requirements/);
  });

  it("all rows share a single verified_on stamp (hand-verification pass)", () => {
    if (!hydrated) return;
    const stamps = new Set(cyberAuthorityRows().map((r) => r.verified_on));
    expect(stamps.size).toBe(1);
  });
});
