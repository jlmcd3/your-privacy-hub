/**
 * ITEM 317 — pin tests for the biometric analytic deliverables.
 *
 * Six duties:
 *   1. CROSS-STATE BLEED PIN — each statute's definitional sentence belongs to
 *      that statute and appears in no other statute's rows. The three
 *      definitions differ materially; a characterization built on the wrong
 *      state's text is simply wrong.
 *   2. IDENTIFIER DIVERGENCE — the same described data can be within one
 *      statute's definition and outside another's, and the builder must be
 *      able to say so rather than smoothing it over.
 *   3. ANALYSIS SHAPE — every duty finding carries standard → record fact →
 *      application → verdict, quotes the corpus verbatim, and degrades to a
 *      named `record_insufficient` rather than asserting.
 *   4. SEPARATION GUARD — exposure language lives only in the consequence
 *      determination; it may not appear in any duty finding.
 *   5. RESERVED-FRAMING LAW — the un-ingested 740 ILCS 14/20 is never quoted
 *      and damages specifics never appear anywhere in the output.
 *   6. CONTRACT GUARD — every field the builder reads exists in the intake
 *      contract, the client option lists match the contract's, and the golden
 *      fixtures pass `validateIntake`.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BIOMETRIC_DUTY_ROWS,
  BIPA_PRA_CORPUS_STATUS,
  dutiesFor,
} from "../../../supabase/functions/_shared/registry/biometric-verified-authorities";
import {
  buildBiometricDeliverables,
  statutesInScope,
  type BiometricIntakeForDeliverables,
} from "../../../supabase/functions/_shared/ltp/biometric-deliverables/build";
import {
  biometricCheckerContract,
  BIO_TRI,
  BIO_NOTICE,
  BIO_CONSENT_ARTIFACT,
  BIO_DISCLOSURE_BASES,
} from "../../../supabase/functions/_shared/intake-contracts/biometric-checker";
import { validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate";
import { BIOMETRIC_GOLDEN } from "../../../supabase/functions/_shared/golden/biometric";
import {
  BIO_TRI as CLIENT_TRI,
  BIO_NOTICE as CLIENT_NOTICE,
  BIO_CONSENT_ARTIFACT as CLIENT_CONSENT,
  BIO_DISCLOSURE_BASES as CLIENT_DISCLOSURE,
} from "../biometric-intake-options";

const norm = (s: string) => s.replace(/\s+/g, " ").trim();

// ── Records used across the behavioural tests ──────────────────────────────

const goldenIntake = (id: string): BiometricIntakeForDeliverables => {
  const c = BIOMETRIC_GOLDEN.find((g) => g.id === id);
  if (!c) throw new Error(`golden case not found: ${id}`);
  return c.intake as BiometricIntakeForDeliverables;
};

const PERFECT_MULTI = () => goldenIntake("bio-perfect-il-tx-wa-record");
const DEFICIENT_IL = () => goldenIntake("bio-perfect-il-deficient-record");

/** Silent record: in scope, but says nothing about any practice. */
const SILENT_IL: BiometricIntakeForDeliverables = {
  orgName: "Silent Co.",
  orgType: "Employer (employee biometrics)",
  biometricTypes: ["Fingerprint / palm print"],
  purpose: "Physical access control",
  jurisdictions: ["Illinois, USA (BIPA)"],
};

/** Photographs only — inside a layperson's idea of biometrics, outside BIPA. */
const PHOTO_ONLY: BiometricIntakeForDeliverables = {
  ...SILENT_IL,
  biometricTypes: ["Other biometric identifier"],
  data_source_description:
    "The system stores member photographs taken at the front desk; no template or scan of face geometry is computed from them.",
};

describe("Item 317 — cross-state bleed pins", () => {
  it("each statute's definitional text sits only under that statute", () => {
    const defs = BIOMETRIC_DUTY_ROWS.filter((r) => r.kind === "definition");
    expect(defs.length).toBeGreaterThan(2);

    for (const def of defs) {
      const others = BIOMETRIC_DUTY_ROWS.filter(
        (r) => r.statute_key !== def.statute_key,
      );
      // Take a long, statute-specific fragment of the definition.
      const fragment = norm(def.verbatim_quote).slice(0, 60);
      for (const other of others) {
        expect(norm(other.verbatim_quote)).not.toContain(fragment);
      }
    }
  });

  it("BIPA's HIPAA/diagnostic-imaging exclusions belong to BIPA alone", () => {
    const bipaOnly = "used to diagnose, prognose, or treat an illness";
    const carriers = BIOMETRIC_DUTY_ROWS.filter((r) =>
      norm(r.verbatim_quote).includes(bipaOnly),
    );
    expect(carriers.length).toBeGreaterThan(0);
    for (const r of carriers) expect(r.statute_key).toBe("us_il_bipa");
  });

  it("the CUBI one-year clock belongs to Texas alone", () => {
    const carriers = BIOMETRIC_DUTY_ROWS.filter((r) =>
      /within\s+(a\s+)?(reasonable\s+time|1|one)\s*year/i.test(norm(r.verbatim_quote)),
    );
    expect(carriers.length).toBeGreaterThan(0);
    for (const r of carriers) expect(r.statute_key).toBe("us_tx_cubi");
  });

  it("every duty row quotes a real statute and names its corpus row", () => {
    for (const r of BIOMETRIC_DUTY_ROWS) {
      expect(r.corpus_key.length).toBeGreaterThan(0);
      expect(r.verbatim_quote.trim().length).toBeGreaterThan(20);
      expect(r.source_url).toMatch(/^https:\/\//);
    }
  });

  it("all three statutes carry their own duty rows", () => {
    for (const k of ["us_il_bipa", "us_tx_cubi", "us_wa_19375"] as const) {
      expect(dutiesFor(k).length).toBeGreaterThan(0);
    }
  });
});

describe("Item 317 — scope and identifier characterization", () => {
  it("puts exactly the selected statutes in scope", () => {
    const scope = statutesInScope(PERFECT_MULTI()).map((s) => s.statute_key);
    expect(scope).toEqual(
      expect.arrayContaining(["us_il_bipa", "us_tx_cubi", "us_wa_19375"]),
    );
    expect(statutesInScope(SILENT_IL).map((s) => s.statute_key)).toEqual([
      "us_il_bipa",
    ]);
  });

  it("characterizes the identifier under each statute's OWN definition", () => {
    const d = buildBiometricDeliverables(PERFECT_MULTI());
    expect(d.identifier_characterizations).toHaveLength(3);
    for (const c of d.identifier_characterizations) {
      expect(c.definition_standard.length).toBeGreaterThan(20);
      // The definition quoted is the one belonging to that statute.
      const owned = BIOMETRIC_DUTY_ROWS.filter(
        (r) => r.statute_key === c.statute_key && r.kind === "definition",
      ).map((r) => norm(r.verbatim_quote));
      expect(owned.some((q) => q.includes(norm(c.definition_standard).slice(0, 50)))).toBe(true);
      expect(c.verdict).toBe("within_definition");
    }
  });

  it("names an exclusion rather than asserting coverage when the data is photographs", () => {
    const d = buildBiometricDeliverables(PHOTO_ONLY);
    const il = d.identifier_characterizations.find((c) => c.statute_key === "us_il_bipa");
    expect(il).toBeDefined();
    expect(il!.verdict).not.toBe("within_definition");
    if (il!.verdict === "record_insufficient") {
      expect(il!.information_needed && il!.information_needed.length).toBeTruthy();
    }
  });
});

describe("Item 317 — entity characterization is reasoned, not echoed", () => {
  it("gives a role plus reasoning distinct from the intake label", () => {
    const d = buildBiometricDeliverables(PERFECT_MULTI());
    const e = d.entity_characterization;
    expect(e.role.length).toBeGreaterThan(0);
    expect(e.role_reasoning.length).toBeGreaterThan(30);
    expect(norm(e.role_reasoning)).not.toBe(norm(e.intake_label ?? ""));
    expect(e.per_statute.length).toBe(3);
    for (const p of e.per_statute) {
      expect(p.standard.length).toBeGreaterThan(20);
      expect(p.application.length).toBeGreaterThan(20);
    }
  });
});

describe("Item 317 — per-duty analysis shape", () => {
  it("emits one finding per duty, never a lumped blob", () => {
    const d = buildBiometricDeliverables(PERFECT_MULTI());
    const ilKeys = d.duty_findings.filter((f) => f.statute_key === "us_il_bipa");
    // BIPA § 15(a)-(e) are separate duties, at minimum.
    expect(ilKeys.length).toBeGreaterThanOrEqual(5);
    const unique = new Set(d.duty_findings.map((f) => f.key));
    expect(unique.size).toBe(d.duty_findings.length);
  });

  it("every finding carries standard → record fact → application → verdict", () => {
    const d = buildBiometricDeliverables(PERFECT_MULTI());
    for (const f of d.duty_findings) {
      expect(f.citation.length).toBeGreaterThan(0);
      expect(f.standard.length).toBeGreaterThan(20);
      expect(f.record_fact.length).toBeGreaterThan(0);
      expect(f.application.length).toBeGreaterThan(20);
      expect(["satisfied", "not_satisfied", "not_applicable", "record_insufficient"])
        .toContain(f.verdict);
    }
  });

  it("every quoted standard is verbatim corpus text", () => {
    const corpus = BIOMETRIC_DUTY_ROWS.map((r) => norm(r.verbatim_quote));
    const d = buildBiometricDeliverables(PERFECT_MULTI());
    for (const f of d.duty_findings) {
      expect(corpus.some((q) => q.includes(norm(f.standard)))).toBe(true);
    }
  });

  it("a silent record degrades to named record_insufficient, never to a verdict", () => {
    const d = buildBiometricDeliverables(SILENT_IL);
    const insufficient = d.duty_findings.filter((f) => f.verdict === "record_insufficient");
    expect(insufficient.length).toBeGreaterThan(0);
    for (const f of insufficient) {
      expect(f.status).toBe("record_insufficient");
      expect(f.information_needed && f.information_needed.length).toBeTruthy();
    }
    expect(d.duty_findings.some((f) => f.verdict === "satisfied")).toBe(false);
  });

  it("a well-documented record can reach satisfied", () => {
    const d = buildBiometricDeliverables(PERFECT_MULTI());
    expect(d.duty_findings.some((f) => f.verdict === "satisfied")).toBe(true);
  });

  it("a deficient record reaches not_satisfied on release, profit and retention", () => {
    const d = buildBiometricDeliverables(DEFICIENT_IL());
    const failed = d.duty_findings.filter((f) => f.verdict === "not_satisfied");
    expect(failed.length).toBeGreaterThanOrEqual(3);
  });

  it("records the CUBI (c-1)/(c-2) qualifiers as qualifiers, not as the duty", () => {
    const tx = buildBiometricDeliverables({
      ...PERFECT_MULTI(),
      tx_employer_security_collection: "Yes",
    }).duty_findings.filter((f) => f.statute_key === "us_tx_cubi");
    expect(tx.some((f) => f.qualifiers_applied.length > 0)).toBe(true);
    for (const f of tx) {
      for (const q of f.qualifiers_applied) {
        expect(q.standard.length).toBeGreaterThan(10);
        expect(q.effect.length).toBeGreaterThan(10);
      }
    }
  });
});

describe("Item 317 — divergence analysis", () => {
  it("names the CUBI one-year clock as having no BIPA or RCW 19.375 analogue", () => {
    const d = buildBiometricDeliverables(PERFECT_MULTI());
    const clock = d.divergence_analysis.find((x) => /year/i.test(x.topic) || x.key.includes("retention"));
    expect(clock).toBeDefined();
    expect(clock!.positions.length).toBeGreaterThan(1);
    for (const p of clock!.positions) expect(p.standard.length).toBeGreaterThan(10);
  });

  it("stays silent about statutes that are not in scope", () => {
    const d = buildBiometricDeliverables(SILENT_IL);
    for (const item of d.divergence_analysis) {
      for (const k of item.statutes) expect(k).toBe("us_il_bipa");
    }
  });
});

describe("Item 317 — SEPARATION GUARD and RESERVED-FRAMING LAW", () => {
  const EXPOSURE = /damages|penalt|liquidated|per\s+scan|class\s+action|\$\s?\d|sue|lawsuit/i;

  it("no duty finding carries exposure language", () => {
    for (const intake of [PERFECT_MULTI(), DEFICIENT_IL(), SILENT_IL]) {
      const d = buildBiometricDeliverables(intake);
      for (const f of d.duty_findings) {
        expect(EXPOSURE.test(f.application)).toBe(false);
        expect(EXPOSURE.test(f.record_fact)).toBe(false);
      }
    }
  });

  it("exposure lives only in the consequence determination, separated from unlawful_now", () => {
    const d = buildBiometricDeliverables(DEFICIENT_IL());
    const c = d.consequence_determination;
    expect(c.unlawful_now.length).toBeGreaterThan(0);
    expect(c.exposure_surfaces.length).toBeGreaterThan(0);
    expect(c.separation_note.length).toBeGreaterThan(20);
    for (const u of c.unlawful_now) expect(EXPOSURE.test(u.why)).toBe(false);
  });

  it("never quotes the un-ingested 740 ILCS 14/20", () => {
    expect(BIPA_PRA_CORPUS_STATUS.ingested).toBe(false);
    const d = buildBiometricDeliverables(DEFICIENT_IL());
    const pra = d.consequence_determination.exposure_surfaces.find((s) =>
      s.citation.includes("14/20"),
    );
    expect(pra).toBeDefined();
    expect(pra!.corpus_status).toBe("not_ingested");
    expect(pra!.standard).toBeNull();
    expect(pra!.reserved && pra!.reserved.length).toBeTruthy();
    const blob = JSON.stringify(d);
    expect(/\$1,000|\$5,000|liquidated damages/i.test(blob)).toBe(false);
  });

  it("no duty row was sourced from the un-ingested PRA provision", () => {
    for (const r of BIOMETRIC_DUTY_ROWS) {
      expect(r.corpus_key).not.toContain("14-20");
      expect(r.pinpoint).not.toContain("14/20");
    }
  });
});

describe("Item 317 — RCW 19.373 stays inert", () => {
  it("no duty row or deliverable applies the MHMD row", () => {
    for (const r of BIOMETRIC_DUTY_ROWS) {
      expect(r.citation).not.toContain("19.373");
      expect(r.corpus_key).not.toContain("19-373");
    }
    const d = buildBiometricDeliverables(PERFECT_MULTI());
    for (const f of d.duty_findings) expect(f.citation).not.toContain("19.373");
    for (const c of d.identifier_characterizations) {
      expect(c.definition_citation).not.toContain("19.373");
    }
  });

  it("carries it only as a scope-gated provenance flag", () => {
    const d = buildBiometricDeliverables(PERFECT_MULTI());
    const gated = d.scope_gated.find((g) => g.citation.includes("19.373"));
    expect(gated).toBeDefined();
    expect(gated!.status).toBe("scope_gated_pending");
  });
});

describe("Item 317 — narrative", () => {
  it("emits a part-1 overview and a part-4 determination", () => {
    const d = buildBiometricDeliverables(PERFECT_MULTI());
    expect(d.narrative.part1_overview.length).toBeGreaterThan(80);
    expect(d.narrative.part4_determination.length).toBeGreaterThan(80);
  });
});

describe("Item 317 — contract guard", () => {
  const keys = new Set(biometricCheckerContract.fields.map((f) => f.key));

  it("declares every field the builder reads", () => {
    const src = readFileSync(
      resolve(
        __dirname,
        "../../../supabase/functions/_shared/ltp/biometric-deliverables/build.ts",
      ),
      "utf8",
    );
    const iface = src.slice(
      src.indexOf("export interface BiometricIntakeForDeliverables"),
    );
    const body = iface.slice(0, iface.indexOf("\n}"));
    const read = [...body.matchAll(/^\s{2}([a-z0-9_]+)\?:/gm)].map((m) => m[1]);
    expect(read.length).toBeGreaterThan(20);
    for (const k of read) expect(keys.has(k)).toBe(true);
  });

  it("client option lists match the contract's exactly", () => {
    expect([...CLIENT_TRI]).toEqual([...BIO_TRI]);
    expect([...CLIENT_NOTICE]).toEqual([...BIO_NOTICE]);
    expect([...CLIENT_CONSENT]).toEqual([...BIO_CONSENT_ARTIFACT]);
    expect([...CLIENT_DISCLOSURE]).toEqual([...BIO_DISCLOSURE_BASES]);
  });

  it("the Item 317 golden fixtures validate against the contract", () => {
    for (const id of ["bio-perfect-il-tx-wa-record", "bio-perfect-il-deficient-record"]) {
      const res = validateIntake(
        biometricCheckerContract,
        goldenIntake(id) as Record<string, unknown>,
      );
      expect(res.violations).toEqual([]);
      expect(res.ok).toBe(true);
    }
  });
});
