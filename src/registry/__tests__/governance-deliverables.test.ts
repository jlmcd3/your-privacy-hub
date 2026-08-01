/**
 * ITEM 313 — pin tests for the governance analytic deliverables.
 *
 * Three duties:
 *   1. CORPUS PIN — every verbatim_quote the deliverables cite is an exact
 *      substring of the approved gdpr_articles snapshot.
 *   2. ANALYSIS SHAPE — findings carry standard → record fact → application →
 *      verdict, and degrade to a named `record_insufficient` rather than
 *      fabricate.
 *   3. DEMOTION LAW — the maturity tier is no longer the headline conclusion.
 */
import { describe, expect, it } from "vitest";
import { GOVERNANCE_CORPUS_SNAPSHOT } from "./__fixtures__/governance-corpus-snapshot";
import { GOVERNANCE_ACCOUNTABILITY_AUTHORITIES } from "../../../supabase/functions/_shared/registry/governance-accountability-authorities";
import { GOVERNANCE_VERIFIED_AUTHORITIES } from "../../../supabase/functions/_shared/registry/governance-verified-authorities";
import {
  ANCHOR_KEYS,
  ART30_ELEMENTS,
  DEMONSTRABILITY_DUTIES,
} from "../../../supabase/functions/_shared/ltp/governance-deliverables/elements";
import {
  attachGovernanceDeliverables,
  buildArt30ElementFindings,
  buildArt30ExemptionDetermination,
  buildDemonstrabilityFindings,
  buildDpoDetermination,
  buildGovernanceDeliverables,
  buildReviewAndUpdateFinding,
  buildRiskCalibrationFinding,
} from "../../../supabase/functions/_shared/ltp/governance-deliverables/build";
import { GOVERNANCE_GOLDEN } from "../../../supabase/functions/_shared/golden/governance";
import { governanceContract } from "../../../supabase/functions/_shared/intake-contracts/governance-assessment";

const CORPUS = Object.values(GOVERNANCE_CORPUS_SNAPSHOT).join("\n\n");

const perfect = GOVERNANCE_GOLDEN.find((c) => c.id === "gov-perfect-record")!;
const perfectIntake = perfect.intake as Record<string, unknown>;

describe("ITEM 313 — corpus pins", () => {
  it("snapshot lengths match the dispatch-confirmed corpus", () => {
    expect(GOVERNANCE_CORPUS_SNAPSHOT["eu-art-5"].length).toBe(1977);
    expect(GOVERNANCE_CORPUS_SNAPSHOT["eu-art-24"].length).toBe(861);
    expect(GOVERNANCE_CORPUS_SNAPSHOT["eu-art-30"].length).toBe(2907);
    expect(GOVERNANCE_CORPUS_SNAPSHOT["eu-art-37"].length).toBe(1989);
    expect(GOVERNANCE_CORPUS_SNAPSHOT["eu-art-38"].length).toBe(1390);
    expect(GOVERNANCE_CORPUS_SNAPSHOT["eu-art-39"].length).toBe(1278);
  });

  it("every accountability registry row is an exact corpus substring", () => {
    for (const [key, r] of Object.entries(GOVERNANCE_ACCOUNTABILITY_AUTHORITIES)) {
      expect(r.verbatim_quote.length, key).toBeGreaterThan(20);
      expect(CORPUS.includes(r.verbatim_quote), `${key} not verbatim`).toBe(true);
    }
  });

  // Item 327: `elements.ts` resolves against BOTH governance registries
  // (accountability + verified), so the resolution surface asserted here is
  // the same merged map the builder uses — not the accountability map alone.
  it("every anchor key the builder may cite resolves to a registry row", () => {
    const MERGED = {
      ...GOVERNANCE_VERIFIED_AUTHORITIES,
      ...GOVERNANCE_ACCOUNTABILITY_AUTHORITIES,
    };
    for (const key of Object.values(ANCHOR_KEYS)) {
      expect(
        Object.prototype.hasOwnProperty.call(MERGED, key),
        `${key} unresolved`,
      ).toBe(true);
    }
  });
});

describe("ITEM 313 — demonstrability findings (Op. 2)", () => {
  const findings = buildDemonstrabilityFindings(perfectIntake);

  it("covers every accountability duty and names an artifact for each", () => {
    expect(findings).toHaveLength(DEMONSTRABILITY_DUTIES.length);
    for (const f of findings) {
      expect(f.evidencing_artifact.length).toBeGreaterThan(20);
      expect(["yes", "partial", "no", "unknown"]).toContain(f.artifact_present);
      expect(CORPUS.includes(f.standard.split(" GDPR")[0].slice(0, 60))).toBe(true);
    }
  });

  it("analysed findings carry the full four-part shape", () => {
    for (const f of findings.filter((x) => x.status === "analysed")) {
      expect(f.standard.length).toBeGreaterThan(40);
      expect(f.record_fact).toMatch(/The record answers/);
      expect(f.application.length).toBeGreaterThan(40);
      expect(f.verdict).not.toBe("record_insufficient");
    }
  });

  it("degrades to a named record_insufficient when a duty is unanswered", () => {
    const blank = buildDemonstrabilityFindings({});
    for (const f of blank) {
      expect(f.status).toBe("record_insufficient");
      expect(f.information_needed && f.information_needed.length).toBeGreaterThan(20);
      expect(f.application).toBe("");
    }
  });
});

describe("ITEM 313 — Art. 30 element walk (Op. 3)", () => {
  it("walks (a) through (g) in order", () => {
    const els = buildArt30ElementFindings(perfectIntake);
    expect(els.map((e) => e.element)).toEqual(["a", "b", "c", "d", "e", "f", "g"]);
    expect(els).toHaveLength(ART30_ELEMENTS.length);
    for (const e of els) expect(CORPUS.includes(e.standard)).toBe(true);
  });

  it("degrades the retention element the record does not carry", () => {
    const f = buildArt30ElementFindings(perfectIntake).find((e) => e.element === "f")!;
    expect(f.status).toBe("record_insufficient");
    expect(f.information_needed).toMatch(/Article 30\(1\)\(f\)/);
  });
});

describe("ITEM 313 — Art. 30(5) exemption", () => {
  it("names all three defeating conditions verbatim from the corpus", () => {
    const d = buildArt30ExemptionDetermination(perfectIntake);
    expect(d.defeating_conditions.map((c) => c.condition)).toEqual([
      "likely_risk",
      "not_occasional",
      "special_category",
    ]);
    for (const c of d.defeating_conditions) expect(CORPUS.includes(c.label)).toBe(true);
  });

  it("is unavailable above 250 persons without reaching the conditions", () => {
    const d = buildArt30ExemptionDetermination(perfectIntake);
    expect(d.under_250_employees).toBe(false);
    expect(d.exemption_available).toBe(false);
    expect(d.application).toMatch(/fewer than 250 persons/);
  });

  it("any ONE condition defeats the exemption below 250 persons", () => {
    const d = buildArt30ExemptionDetermination({
      org_size: "11-50",
      data_categories: ["Contact details"],
      special_category: "Yes",
      special_categories_list: ["Health data"],
    });
    expect(d.under_250_employees).toBe(true);
    expect(d.exemption_available).toBe(false);
    expect(d.verdict).toBe("not_applicable");
  });
});

describe("ITEM 313 — DPO determination (Op. 4)", () => {
  const d = buildDpoDetermination(perfectIntake);

  it("is three sub-findings, not a boolean", () => {
    expect(d.designation_trigger).toBeTruthy();
    expect(d.position_and_independence).toBeTruthy();
    expect(d.task_coverage).toBeTruthy();
    expect(typeof (d as unknown as { dpo?: boolean }).dpo).toBe("undefined");
  });

  it("tests the Art. 37(1) trigger rather than recording the appointment as a fact", () => {
    expect(d.designation_trigger.application).toMatch(/large-scale|large scale|public authority|voluntary/i);
    expect(CORPUS.includes(d.designation_trigger.standard.split(" the processing is carried out")[0])).toBe(true);
  });

  it("refuses to conclude on Art. 38 position without reporting-line evidence", () => {
    expect(d.position_and_independence.status).toBe("record_insufficient");
    expect(d.position_and_independence.information_needed).toMatch(/reporting line/i);
  });

  it("treats an informal privacy lead as not satisfying a mandatory designation", () => {
    const informal = buildDpoDetermination({
      ...perfectIntake,
      dpo_status: "Yes, informal privacy lead",
    });
    expect(informal.designation_trigger.verdict).toBe("not_satisfied");
  });
});

describe("ITEM 313 — Art. 24(1) risk calibration (Op. 1) and review (Op. 5)", () => {
  it("refuses to calibrate without the four named factors", () => {
    const r = buildRiskCalibrationFinding({ ...perfectIntake, processing_context: "" });
    expect(r.status).toBe("record_insufficient");
    expect(r.information_needed).toMatch(/context/);
  });

  it("calibrates against the record's own nature/scope/context/purposes", () => {
    const r = buildRiskCalibrationFinding(perfectIntake);
    expect(r.status).toBe("analysed");
    expect(r.record_fact).toMatch(/Nature:/);
    expect(CORPUS.includes(r.standard)).toBe(true);
  });

  it("keeps review-and-update distinct from appropriateness", () => {
    const rev = buildReviewAndUpdateFinding(perfectIntake);
    expect(rev.standard).toBe("Those measures shall be reviewed and updated where necessary.");
    expect(rev.verdict).toBe("satisfied");

    const none = buildReviewAndUpdateFinding({ measures_review_cadence: "No defined cadence", measures_last_review_date: "2024-01-01" });
    expect(none.verdict).toBe("not_satisfied");

    const noDate = buildReviewAndUpdateFinding({ measures_review_cadence: "Annually or more often" });
    expect(noDate.status).toBe("record_insufficient");
  });
});

describe("ITEM 313 — DEMOTION LAW", () => {
  it("headline is the statutory accountability determination", () => {
    const built = buildGovernanceDeliverables(perfectIntake, "Managed");
    expect(built.accountability_determination.citation).toMatch(/Art\. 5\(2\)/);
    expect(built.accountability_determination.reasoning).toMatch(/Demonstrability|record does not yet support/);
  });

  it("attach removes the tier from the headline and re-emits it labelled", () => {
    const report: Record<string, unknown> = {
      overall_readiness_rating: "Managed",
      readiness_rationale:
        "Domain severities reflect: Critical = no controls in place; High = controls materially incomplete.",
    };
    const telemetry = attachGovernanceDeliverables(report, perfectIntake);
    expect(telemetry.ok).toBe(true);
    expect(telemetry.tier_demoted).toBe(true);
    expect(report.overall_readiness_rating).toBeUndefined();
    expect(report.readiness_rationale).toBeUndefined();
    const aid = report.maturity_tier_readability_aid as Record<string, unknown>;
    expect(aid.tier).toBe("Managed");
    expect(aid.statutory_basis).toBe("none");
    expect(aid.superseded_by).toBe("accountability_determination");
    expect(report.accountability_determination).toBeTruthy();
    expect(report.demonstrability_findings).toBeTruthy();
    expect(report.art30_element_findings).toBeTruthy();
    expect(report.dpo_determination).toBeTruthy();
  });

  it("attach is fail-open and never throws", () => {
    const t = attachGovernanceDeliverables({}, null);
    expect(t.ok).toBe(true);
  });
});

describe("ITEM 313 — fixture unblock guard", () => {
  const contractKeys = new Set(governanceContract.fields.map((f) => f.key));

  it("the contract carries every Item 313 field", () => {
    for (
      const k of [
        "measures_review_cadence",
        "measures_last_review_date",
        "processing_nature",
        "processing_scope",
        "processing_context",
        "processing_purposes",
      ]
    ) {
      expect(contractKeys.has(k), k).toBe(true);
    }
  });

  it("gov-perfect-record supplies every added field and stays on-contract", () => {
    expect(perfect).toBeTruthy();
    for (const k of Object.keys(perfectIntake)) expect(contractKeys.has(k), `${k} off-contract`).toBe(true);
    for (
      const k of [
        "measures_review_cadence",
        "measures_last_review_date",
        "processing_nature",
        "processing_scope",
        "processing_context",
        "processing_purposes",
      ]
    ) {
      expect(String(perfectIntake[k] ?? "").length, k).toBeGreaterThan(3);
    }
  });

  it("the cadence value is a contract enum option", () => {
    const field = governanceContract.fields.find((f) => f.key === "measures_review_cadence")!;
    expect(field.options).toContain(perfectIntake.measures_review_cadence);
  });

  it("the perfect record produces no record_insufficient headline", () => {
    const built = buildGovernanceDeliverables(perfectIntake, "Managed");
    expect(built.accountability_determination.status).toBe("analysed");
  });
});
