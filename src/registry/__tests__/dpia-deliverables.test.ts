// ITEM 310 — PIN TESTS for the four dpia analytic deliverables
// (Chapter 6 (E)(3) of docs/PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md).
//
// These tests assert GROUNDEDNESS and PERFORMANCE, not prose quality:
//   1. REUSE LAW — every statutory string the builder emits is a
//      byte-identical copy of a verified-authority registry row, and every
//      registry row used is itself an Art. 35 / Art. 36 pinpoint.
//   2. Necessity is PERFORMED, not recited: the verdict changes with the
//      alternatives on the record, and a usefulness-only rejection flips it.
//   3. Proportionality is a SEPARATE deliverable and requires both sides.
//   4. Art. 36 is REASONED from the residual bands in the risk register, and
//      the SEPARATION GUARD keeps enforcement-exposure language out of the
//      obligation finding.
//   5. Fixture guard (the Item 309 discipline): validateIntake traces over
//      every dpia golden case, and the Perfect case runs the ANALYSED path.
//
// Runtime: vitest (src/**/*.test.ts glob).

import { describe, it, expect } from "vitest";

import {
  DPIA_VERIFIED_AUTHORITIES,
  DPIA_UNANCHORED_PROPOSITIONS,
} from "../../../supabase/functions/_shared/registry/dpia-verified-authorities.ts";
import { ANCHOR_KEYS, DPIA_RISK_SPECS } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/elements.ts";
import {
  buildArt36Consultation,
  buildDpiaDeliverables,
  buildNecessityFindings,
  buildProportionality,
  buildRiskRegister,
  splitExposure,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { DPIA_GOLDEN } from "../../../supabase/functions/_shared/golden/dpia.ts";
import { dpiaFrameworkContract } from "../../../supabase/functions/_shared/intake-contracts/dpia-framework.ts";
import { validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate.ts";

const PERFECT = DPIA_GOLDEN.find((f) => f.id === "dpia-perfect-record");

const MINIMAL = {
  processing_activity_name: "Patient portal analytics",
  purpose: "Improve care pathways for chronic patients.",
  data_categories: ["Contact details"],
  retention_period: "24 months rolling.",
};

describe("ITEM 310 — REUSE LAW", () => {
  it("every anchor key resolves to a registry row", () => {
    for (const key of Object.values(ANCHOR_KEYS)) {
      expect(DPIA_VERIFIED_AUTHORITIES[key], `missing registry row: ${key}`).toBeTruthy();
    }
  });

  it("Art. 36(1) and Art. 35(9) are anchored rows, not write-arounds", () => {
    expect(DPIA_VERIFIED_AUTHORITIES.prior_consultation_art_36.subsection).toBe("GDPR Art. 36(1)");
    expect(DPIA_VERIFIED_AUTHORITIES.consultation_of_data_subjects_35_9.subsection)
      .toBe("GDPR Art. 35(9)");
    expect(DPIA_UNANCHORED_PROPOSITIONS).not.toContain("prior_consultation_art_36");
    expect(DPIA_UNANCHORED_PROPOSITIONS).not.toContain("consultation_of_data_subjects_35_9");
  });

  it("emitted authority_verbatim strings are byte-identical registry quotes", () => {
    const built = buildDpiaDeliverables(PERFECT!.intake);
    const necessityQuote = DPIA_VERIFIED_AUTHORITIES[ANCHOR_KEYS.necessity].verbatim_quote;
    for (const n of built.necessity_findings) expect(n.authority_verbatim).toBe(necessityQuote);
    for (const p of built.proportionality) expect(p.authority_verbatim).toBe(necessityQuote);
    expect(built.art36_consultation.authority_verbatim)
      .toBe(DPIA_VERIFIED_AUTHORITIES[ANCHOR_KEYS.art36].verbatim_quote);
    for (const r of built.risk_register) {
      expect(r.authority_verbatim).toContain(
        DPIA_VERIFIED_AUTHORITIES[ANCHOR_KEYS.risks].verbatim_quote,
      );
    }
  });
});

describe("ITEM 310 — Op 2 necessity is PERFORMED", () => {
  it("no recorded alternatives degrades to a named record_insufficient, never a verdict", () => {
    const [f] = buildNecessityFindings(MINIMAL);
    expect(f.verdict).toBe("undetermined_on_the_record");
    expect(f.status).toBe("record_insufficient");
    expect(f.information_needed).toMatch(/alternative/i);
  });

  it("alternatives rejected because they miss the purpose support least-intrusive means", () => {
    const [f] = buildNecessityFindings(PERFECT!.intake);
    expect(f.verdict).toBe("least_intrusive_means_supported");
    expect(f.status).toBe("analysed");
    expect(f.alternatives_considered.length).toBe(2);
  });

  it("a usefulness-only rejection flips the verdict against necessity", () => {
    const [f] = buildNecessityFindings({
      ...MINIMAL,
      alternatives_considered: [{
        alternative: "Aggregated cohort telemetry",
        rejection_reason: "It is less useful for the analytics team and more expensive to build.",
      }],
    });
    expect(f.verdict).toBe("less_intrusive_alternative_available");
  });

  it("an alternative with no rejection reason leaves the comparison open", () => {
    const [f] = buildNecessityFindings({
      ...MINIMAL,
      alternatives_considered: [{ alternative: "Aggregated cohort telemetry" }],
    });
    expect(f.verdict).toBe("undetermined_on_the_record");
    expect(f.status).toBe("record_insufficient");
  });
});

describe("ITEM 310 — Op 3 proportionality is its own deliverable", () => {
  it("benefit-only records are undetermined, not proportionate", () => {
    const [p] = buildProportionality({
      ...MINIMAL,
      necessity_proportionality: "The processing enables better care pathways.",
    });
    expect(p.argued_both_directions).toBe(false);
    expect(p.verdict).toBe("undetermined_on_the_record");
    expect(p.status).toBe("record_insufficient");
  });

  it("both directions plus recorded measures yields a proportionate finding", () => {
    const [p] = buildProportionality(PERFECT!.intake);
    expect(p.argued_both_directions).toBe(true);
    expect(p.verdict).toBe("proportionate_on_the_record");
    expect(p.impact_argument).not.toBe(p.benefit_argument);
  });

  it("both directions with no safeguard recorded is disproportionate on the record", () => {
    const [p] = buildProportionality({
      ...MINIMAL,
      necessity_proportionality:
        "The processing enables better care pathways, but it is intrusive and affects patients who cannot avoid it.",
      existing_safeguards: ["None"],
    });
    expect(p.verdict).toBe("disproportionate_on_the_record");
  });
});

describe("ITEM 310 — Op 4 risk register", () => {
  it("only triggered risks are emitted, and each carries likelihood/severity/residual", () => {
    const reg = buildRiskRegister(PERFECT!.intake);
    expect(reg.length).toBeGreaterThan(0);
    expect(reg.length).toBeLessThanOrEqual(DPIA_RISK_SPECS.length);
    for (const r of reg) {
      expect(r.likelihood).toBeTruthy();
      expect(r.severity).toBeTruthy();
      expect(["low", "moderate", "high", "undetermined"]).toContain(r.residual_band);
    }
    // Special-category risk must be present on a health-data record.
    expect(reg.map((r) => r.risk_id)).toContain("r2_special_category_exposure");
  });

  it("a record with no safeguards degrades every risk with a specific information_needed", () => {
    const reg = buildRiskRegister({ ...MINIMAL, existing_safeguards: ["None"] });
    for (const r of reg) {
      expect(r.status).toBe("record_insufficient");
      expect(r.information_needed).toContain(r.risk_label);
    }
  });
});

describe("ITEM 310 — Op 5 Art. 36 determination", () => {
  it("a high residual band triggers consultation and names the driving risks", () => {
    const reg = buildRiskRegister({ ...MINIMAL, data_categories: ["Children's data"], existing_safeguards: [] });
    const d = buildArt36Consultation({}, reg);
    expect(d.determination).toBe("consultation_required");
    expect(d.driving_risk_ids.length).toBeGreaterThan(0);
    expect(d.procedural_citation).toBe("GDPR Art. 36(3)");
  });

  it("an empty register is undetermined, never 'not required'", () => {
    const d = buildArt36Consultation({}, []);
    expect(d.determination).toBe("undetermined_on_the_record");
    expect(d.status).toBe("record_insufficient");
  });

  it("SEPARATION GUARD relocates exposure language out of the obligation finding", () => {
    const split = splitExposure(
      "The controller must consult the supervisory authority before processing begins. Failure to do so exposes the controller to an administrative fine under Article 83.",
    );
    expect(split.repairs).toBe(1);
    expect(split.kept).not.toMatch(/fine|Article 83/i);
    expect(split.moved).toMatch(/administrative fine/i);
  });

  it("the shipped determination's why carries no enforcement framing", () => {
    const built = buildDpiaDeliverables(PERFECT!.intake);
    expect(built.art36_consultation.why).not.toMatch(/fine|penalt|Art(icle)?\.?\s*83/i);
  });
});

describe("ITEM 310 — fixture unblock (Item 309 discipline)", () => {
  it("validateIntake traces clean over every dpia golden case", () => {
    for (const fx of DPIA_GOLDEN) {
      const res = validateIntake(
        dpiaFrameworkContract,
        (fx.intake ?? {}) as Record<string, unknown>,
      );
      expect(
        res.violations.map((v) => `${v.key}: ${v.reason}`).join("; ") || "ok",
        fx.id,
      ).toBe("ok");
      expect(res.ok, fx.id).toBe(true);
    }
  });

  it("the Perfect fixture carries every Item 310 intake addition", () => {
    expect(PERFECT, "dpia-perfect-record missing").toBeTruthy();
    const i = PERFECT!.intake as Record<string, any>;
    expect(Array.isArray(i.alternatives_considered)).toBe(true);
    expect(i.alternatives_considered.length).toBeGreaterThanOrEqual(2);
    for (const a of i.alternatives_considered) {
      expect(String(a.alternative).length).toBeGreaterThan(20);
      expect(String(a.rejection_reason).length).toBeGreaterThan(40);
    }
    expect(i.data_subjects_views_sought).toBe("Yes — views sought");
    expect(String(i.dpo_advice).length).toBeGreaterThan(60);
  });

  it("the Perfect fixture drives the deliverables off the insufficient-record path", () => {
    const built = buildDpiaDeliverables(PERFECT!.intake);
    for (const n of built.necessity_findings) expect(n.status, n.operation_id).toBe("analysed");
    for (const p of built.proportionality) expect(p.status, p.operation_id).toBe("analysed");
    for (const r of built.risk_register) expect(r.status, r.risk_id).toBe("analysed");
    expect(built.art36_consultation.status).toBe("analysed");
  });
});

// ─────────────────────────────────────────────────────────────────────────
// WP248-PINNING (2026-08-01) — corpus pin for the two WP248 rev.01 rows.
//
// Pattern follows risk-verified-authorities-corpus-pin.test.ts: the DB half
// is skipped without direct Postgres access; the shape/anchoring half always
// runs so the pin cannot drift silently in CI.
// ─────────────────────────────────────────────────────────────────────────
const WP248_KEYS = ["high_risk_criteria_edpb_wp248", "risk_severity_edpb_wp248"] as const;

function normWp(s: string): string {
  return String(s)
    .replace(/[\u2018\u2019\u201A\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("WP248-PINNING — registry rows", () => {
  it("both WP248 propositions are anchored, not write-arounds", () => {
    for (const key of WP248_KEYS) {
      const r = DPIA_VERIFIED_AUTHORITIES[key];
      expect(r, `missing registry row: ${key}`).toBeTruthy();
      expect(r.verbatim_quote.length).toBeGreaterThan(80);
      expect(r.subsection).toMatch(/^EDPB WP248 rev\.01/);
      expect(r.governing_anchor).toMatch(/WP248 rev\.01/);
      expect(r.primary_source_url).toBe(
        "https://ec.europa.eu/newsroom/just/document.cfm?doc_id=47711",
      );
      expect(r.verified_on).toBe("2026-08-01");
      expect(DPIA_UNANCHORED_PROPOSITIONS).not.toContain(key);
    }
  });

  it("dpo_designation_art_37_39 stays unanchored (out of scope)", () => {
    expect(DPIA_UNANCHORED_PROPOSITIONS).toContain("dpo_designation_art_37_39");
    expect(DPIA_VERIFIED_AUTHORITIES.dpo_designation_art_37_39).toBeUndefined();
  });

  it("the exact shipped quotes are pinned byte-for-byte", () => {
    expect(DPIA_VERIFIED_AUTHORITIES.high_risk_criteria_edpb_wp248.verbatim_quote).toBe(
      "In general, the WP29 considers that the more criteria are met by the processing, the more likely it is to present a high risk to the rights and freedoms of data subjects, and therefore to require a DPIA, regardless of the measures which the controller envisages to adopt. However, in some cases, a data controller can consider that a processing meeting only one of these criteria requires a DPIA.",
    );
    expect(DPIA_VERIFIED_AUTHORITIES.risk_severity_edpb_wp248.verbatim_quote).toBe(
      "origin, nature, particularity and severity of the risks are appreciated (cf. recital 84) or, more specifically, for each risk (illegitimate access, undesired modification, and disappearance of data) from the perspective of the data subjects",
    );
  });

  it("the risk register consumes the WP248 severity anchor verbatim", () => {
    const built = buildDpiaDeliverables(PERFECT!.intake);
    expect(built.risk_register.length).toBeGreaterThan(0);
    for (const r of built.risk_register) {
      expect(r.guidance_citation).toBe(
        DPIA_VERIFIED_AUTHORITIES.risk_severity_edpb_wp248.subsection,
      );
      expect(r.guidance_verbatim).toBe(
        DPIA_VERIFIED_AUTHORITIES.risk_severity_edpb_wp248.verbatim_quote,
      );
    }
  });
});

const WP248_CAN_RUN = !!process.env.PGHOST && !!process.env.PGDATABASE;

describe.skipIf(!WP248_CAN_RUN)("WP248-PINNING — corpus pin (edpb_guidelines)", () => {
  it("each quote is a contiguous substring of an approved WP248 corpus row", async () => {
    const { execFileSync } = await import("node:child_process");
    const out = execFileSync(
      "psql",
      [
        "-tAX",
        "-c",
        "SELECT excerpt_text || E'\\x1e' FROM edpb_guidelines " +
          "WHERE guideline_ref = 'WP248 rev.01' AND status = 'final'",
      ],
      { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );
    const rows = out.split("\x1e").map(normWp).filter(Boolean);
    expect(rows.length).toBeGreaterThan(0);
    for (const key of WP248_KEYS) {
      const q = normWp(DPIA_VERIFIED_AUTHORITIES[key].verbatim_quote);
      expect(rows.some((body) => body.includes(q)), `${key} not found in WP248 corpus`).toBe(true);
    }
  });
});
