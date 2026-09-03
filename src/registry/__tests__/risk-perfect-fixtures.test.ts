// ITEM 378 — TRULY-PERFECT CPPA RISK FIXTURE — pin test.
//
// CPPA_RISK_PERFECT exists so an A/B batch labelled "perfect" grades
// perfect-record WRITING. These tests assert (a) contract cleanliness,
// (b) completeness against every contract key, (c) that every triggered
// conditional is answered and every untriggered conditional is absent,
// (d) enum byte-parity with the contract option lists, and (e) that the
// variant resolver routes "perfect" to the new set for cppa-risk only.

import { describe, it, expect } from "vitest";
import { validateIntake } from "../../../supabase/functions/_shared/intake-contracts/validate";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment";
import { CPPA_RISK_PERFECT, CPPA_RISK_GOLDEN } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-risk";
import { GOLDEN_BY_TOOL, PERFECT_BY_TOOL, casesForVariant } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/registry";

/**
 * Keys a truthful complete record legitimately leaves empty:
 *   • secondary_activities — the record states there are no secondary uses.
 *   • exceptions_intake    — no exception is claimed.
 *   • the two untriggered conditionals (asserted absent below).
 */
const EXEMPT = new Set([
  "secondary_activities",
  // DOC 157 (model-vs-law build) — q19b_housing_basis is asked only when the
  // categorical § 7001(ddd) answer selects Housing (this record's decision is
  // a financial or lending service); the two final_processing_decision keys
  // are FINALIZATION-stage fields (§ 7152(a)(7)), recorded after the analysis
  // is reviewed, so a complete intake record is honestly silent on them.
  "q19b_housing_basis",
  "final_processing_decision",
  "final_processing_decision_notes",
  "exceptions_intake",
  "q5c_share_revenue_50pct",
  "i9_existing_dpia_summary",
  // RK3-D (doc 33 D-L3) — untriggered conditionals on this record: the
  // fixture answers "processed only for the stated purpose" and "single
  // activity", so the dependent narratives are honestly absent.
  "out_of_scope_activities",
  "comparable_processing_basis",
  // RK3-A2 g1 — timing/status fields with emptyIsAnswer. processing_status
  // is filled ("Ongoing"); the four date/description fields below are N/A on
  // this record and empty is the honest answer per the contract posture:
  //   processing_start_date  — no statutory requirement to record the exact
  //                             start date of an ongoing programme.
  //   planned_start_date     — N/A: processing is already Ongoing, not Planned.
  //   prior_risk_assessment_date — no prior formal assessment exists.
  //   material_change_date / material_change_description — material_change_since_prior
  //                             is "No", so these sub-fields are absent.
  "processing_start_date",
  "planned_start_date",
  "prior_risk_assessment_date",
  "material_change_date",
  "material_change_description",
  // RK3-A2 g3 — downstream ADMT-provider fields. admt_made_available_to_other_business
  // is "No" on this record; the two downstream fields are therefore N/A.
  "admt_provider_trained_using_pi",
  "recipient_business_uses_admt_for_significant_decision",
  // RK3-A4 g4 — SPI employment-exception facts. q17_sensitive_basis is
  // "Necessary for the service" (not "Employment contract"), so this field
  // is empty by design (emptyIsAnswer) on this record.
  "spi_employment_exception_facts",
  // RK3-A3 g2 — internal EUP QA tool. Never printed in the assessment spine;
  // a complete assessment does not require it to be populated before submission.
  "harm_category_review_status",
]);

/** Untriggered conditionals: MUST be absent (or empty) on this record. */
const MUST_BE_ABSENT = [
  "q5c_share_revenue_50pct",
  "i9_existing_dpia_summary",
  // RK3-D — see EXEMPT note above.
  "out_of_scope_activities",
  "comparable_processing_basis",
];

/** Triggered conditionals on this record: MUST be answered. */
const MUST_BE_PRESENT = [
  "q15c_spi_volume",
  "q16_sensitive_limit",
  "q17_sensitive_basis",
  "q19_admt_description",
  "q20_admt_opt_out",
  "i5_admt_logic",
  "i5_admt_human_review",
];

function readPath(root: unknown, key: string): unknown {
  let cur: unknown = root;
  for (const seg of key.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function filled(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim() !== "";
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
}

const CASE = CPPA_RISK_PERFECT[0];
const INTAKE = CASE.intake as Record<string, unknown>;

describe("CPPA_RISK_PERFECT — truly-complete-record fixture", () => {
  it("contains exactly the authored cases", () => {
    // RK0.5 D1 added the second perfect fixture (seller/geolocation profile).
    expect(CPPA_RISK_PERFECT.map((c) => c.id)).toEqual([
      "risk-perfect-complete",
      "risk-perfect-seller-geolocation",
    ]);
    expect(CASE.tool).toBe("cppa-risk");
  });

  it("validates against the cppa-risk contract with zero violations", () => {
    const res = validateIntake(cppaRiskContract, INTAKE);
    const detail = res.ok ? "" : res.violations.map((v) => `${v.key}: ${v.reason}`).join("; ");
    expect(detail).toBe("");
    expect(res.ok).toBe(true);
  });

  it("fills every scalar contract key except the documented exemptions", () => {
    const missing = cppaRiskContract.fields
      .map((f) => f.key)
      .filter((k) => !k.includes("[]"))
      .filter((k) => !EXEMPT.has(k) && !filled(readPath(INTAKE, k)));
    expect(missing).toEqual([]);
  });

  it("answers every triggered conditional", () => {
    const missing = MUST_BE_PRESENT.filter((k) => !filled(INTAKE[k]));
    expect(missing).toEqual([]);
  });

  it("leaves every untriggered conditional absent", () => {
    const present = MUST_BE_ABSENT.filter((k) => k in INTAKE);
    expect(present).toEqual([]);
  });

  it("every enum value byte-matches a contract option", () => {
    const bad: string[] = [];
    for (const f of cppaRiskContract.fields) {
      if (!f.options || f.key.includes("[]")) continue;
      const v = readPath(INTAKE, f.key);
      if (v == null || v === "") continue;
      const values = Array.isArray(v) ? v : [v];
      for (const one of values) {
        if (!(f.options as readonly string[]).includes(one as string)) {
          bad.push(`${f.key}: ${String(one)}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("every row-level enum byte-matches a contract option", () => {
    const bad: string[] = [];
    for (const f of cppaRiskContract.fields) {
      if (!f.options || !f.key.includes("[]")) continue;
      const [arrKey, leaf] = f.key.split("[].");
      const rows = INTAKE[arrKey];
      if (!Array.isArray(rows)) continue;
      rows.forEach((row, i) => {
        const v = (row as Record<string, unknown>)?.[leaf];
        if (v == null || v === "") return;
        // RK3-A1 g5: multi-enum row children (pi_categories_made_available)
        // carry arrays — each element must byte-match an option.
        const values = Array.isArray(v) ? v : [v];
        for (const one of values) {
          if (!(f.options as readonly string[]).includes(one as string)) {
            bad.push(`${arrKey}[${i}].${leaf}: ${String(one)}`);
          }
        }
      });
    }
    expect(bad).toEqual([]);
  });

  it("every a5 harm has a matching a6 safeguard row", () => {
    const harms = (INTAKE.a5_harm_pathways as { harm: string }[]).map((r) => r.harm);
    const guarded = (INTAKE.a6_safeguards as { harm: string }[]).map((r) => r.harm);
    expect(new Set(guarded)).toEqual(new Set(harms));
    expect(new Set(harms).size).toBe(harms.length); // no duplicate harm ids
  });

  it("the record is truthful about secondary uses and exceptions", () => {
    expect(INTAKE.has_secondary_uses).toBe("No — this data is used for this activity only");
    expect(INTAKE.secondary_activities).toEqual([]);
    expect("exceptions_intake" in INTAKE).toBe(false);
  });
});

describe("casesForVariant — perfect routing (cppa-risk)", () => {
  it("cppa-risk / perfect returns exactly the new case", () => {
    expect(casesForVariant("cppa-risk", "perfect")).toEqual(CPPA_RISK_PERFECT);
  });

  it("cppa-risk / null is unchanged (legacy golden set)", () => {
    expect(casesForVariant("cppa-risk", null)).toEqual(CPPA_RISK_GOLDEN);
    expect(casesForVariant("cppa-risk", null)).toBe(GOLDEN_BY_TOOL["cppa-risk"]);
  });

  // ITEM 401 leg B — governance now HAS a perfect fixture, so the old
  // "falls back to GOLDEN_BY_TOOL" pin is superseded: perfect routes to
  // PERFECT_BY_TOOL["governance"] and the legacy set stays untouched.
  it("governance / perfect routes to the item-401 perfect fixture", () => {
    expect(casesForVariant("governance", "perfect")).toEqual(PERFECT_BY_TOOL["governance"]);
    expect(casesForVariant("governance", null)).toEqual(GOLDEN_BY_TOOL["governance"]);
  });
});
