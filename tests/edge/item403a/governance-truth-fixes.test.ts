// ITEM 403-A — GOVERNANCE TRUTH FIXES FROM THE TWO PILOTS.
//
// Evidence base: quality_run_documents a418f9f0 (perfect pilot) and f947421f
// (degraded pilot). Panel-ratified under the CEO's standing delegation.
//
// Identities:
//   item403a d1 evidence names only keys the record answers
//   item403a d1 every surface key group is independently sufficient
//   item403a d1 degraded vendor_terms produces zero false absence
//   item403a d1 truthful thin record produces zero false-absence violations
//   item403a d1 a genuinely backed surface is still caught
//   item403a d2 perfect record discharges the DPO determination
//   item403a d2 degraded record still returns record_insufficient
//   item403a d2 informal lead is partly evidenced not insufficient
//   item403a d2 unrequested facts are strengthening not deficiency
//   item403a d3 summary posture is bound to the typed rating
//   item403a d3 degraded rating rewrites the mixed-posture claim
//   item403a d3 an evidenced rating leaves an affirmative claim standing
//   item403a d3 assembled document states the verdict in one voice
//   item403a d4 g1 is repaired by the domain single writer
//   item403a d4 g1 honest silence is byte-preserved
//   item403a d4 g1 stays outside the gate condition set

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  answeredKeysForSurface,
  GOVERNANCE_CSC_SURFACES,
  intakeFilled,
  runGovernanceCsc,
} from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-csc.ts";
import { FALSE_ABSENCE_CHECK_IDS } from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import { buildDpoDetermination } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import {
  applyVerdictVoice,
  unboundPostureClaims,
} from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-prose-gold.ts";
import { GOVERNANCE_PERFECT } from "../../../supabase/functions/_shared/golden/governance-perfect.ts";

const PERFECT = GOVERNANCE_PERFECT[0].intake as Record<string, unknown>;

/** The degraded pilot's record shape: the two Art. 28 keys and dpo_status absent. */
const DEGRADED: Record<string, unknown> = (() => {
  const d = { ...PERFECT };
  for (const k of ["dpa_status", "dpa_art28_verified", "dpo_status", "transfer_status", "transfer_mechanism"]) {
    delete d[k];
  }
  return d;
})();

const ABSENCE = "the record does not confirm that Article 28(3) terms are in place";

// ---------------------------------------------------------------------------
// DEFECT 1 — evidence subset + sound key groups
// ---------------------------------------------------------------------------

Deno.test("item403a d1 evidence names only keys the record answers", () => {
  for (const surface of GOVERNANCE_CSC_SURFACES) {
    for (const intake of [PERFECT, DEGRADED]) {
      const named = answeredKeysForSurface(surface, intake);
      for (const key of named) {
        assert(
          intakeFilled(intake, key),
          `${surface.path}: evidence named an unanswered key "${key}"`,
        );
      }
    }
  }
});

Deno.test("item403a d1 every surface key group is independently sufficient", () => {
  // The audited split: no surface may carry a merely-descriptive or
  // generic-owner field among its PRIMARY keys.
  const notIndependentlySufficient = new Set([
    "processing_nature",
    "additional_context",
    "remediation_default_owner",
    "training_ai_coverage",
  ]);
  for (const surface of GOVERNANCE_CSC_SURFACES) {
    for (const key of surface.keys) {
      assert(
        !notIndependentlySufficient.has(key),
        `${surface.path}: "${key}" is corroborating, not primary evidence`,
      );
    }
  }
});

Deno.test("item403a d1 degraded vendor_terms produces zero false absence", () => {
  const report = {
    domain_findings: {
      vendor_terms: { current_state: ABSENCE, gap_description: ABSENCE },
    },
  } as Record<string, unknown>;
  const t = runGovernanceCsc(report, { intake: DEGRADED });
  assertEquals(t.crashed, false);
  const g2 = t.violations.filter((v) => v.path === "domain_findings.vendor_terms");
  assertEquals(g2, [], "vendor_terms fired on a record that answers neither Art. 28 key");
});

Deno.test("item403a d1 truthful thin record produces zero false-absence violations", () => {
  const thin = { organization_name: "Thin Ltd", processing_nature: "Some narrative." };
  const report = {
    dpo_determination: { record_states: "We could not verify this item from the information provided; it is listed under information needed." },
    domain_findings: {
      vendor_terms: { current_state: ABSENCE },
      training: { current_state: "the record does not evidence training" },
    },
    transfer_analysis: { record_states: ABSENCE },
  } as Record<string, unknown>;
  const t = runGovernanceCsc(report, { intake: thin });
  const gated = t.violations.filter((v) =>
    (FALSE_ABSENCE_CHECK_IDS.governance as readonly string[]).includes(v.check_id)
  );
  assertEquals(gated, [], "a truthful thin record must not shut the gate");
});

Deno.test("item403a d1 a genuinely backed surface is still caught", () => {
  const report = {
    domain_findings: {
      vendor_terms: { current_state: ABSENCE, record_states: ABSENCE },
    },
  } as Record<string, unknown>;
  const t = runGovernanceCsc(report, { intake: PERFECT });
  const hits = t.violations.filter((v) =>
    v.check_id === "g2_absence_claim_vs_record" && v.path === "domain_findings.vendor_terms"
  );
  assertEquals(hits.length, 1);
  assert(hits[0].repaired, "a backed surface must be repaired from the register");
  assert(!hits[0].evidence.includes("processing_nature") || intakeFilled(PERFECT, "processing_nature"));
});

// ---------------------------------------------------------------------------
// DEFECT 2 — the DPO determination can be discharged
// ---------------------------------------------------------------------------

Deno.test("item403a d2 perfect record discharges the DPO determination", () => {
  const d = buildDpoDetermination(PERFECT);
  assert(
    d.verdict !== "record_insufficient",
    `perfect record still returned ${d.verdict}`,
  );
  assertEquals(d.status, "analysed");
  assertEquals(d.position_and_independence.status, "analysed");
  assertEquals(d.task_coverage.status, "analysed");
});

Deno.test("item403a d2 degraded record still returns record_insufficient", () => {
  const d = buildDpoDetermination(DEGRADED);
  assertEquals(d.verdict, "record_insufficient");
  assertEquals(d.status, "record_insufficient");
});

Deno.test("item403a d2 informal lead is partly evidenced not insufficient", () => {
  const d = buildDpoDetermination({ ...PERFECT, dpo_status: "Yes, informal privacy lead" });
  assertEquals(d.position_and_independence.verdict, "partially_satisfied");
  assertEquals(d.position_and_independence.status, "analysed");
  // The Art. 37 trigger outcome is untouched by this item: on a mandatory-
  // designation record an informal lead is still "not_satisfied", and the
  // aggregate follows that determination — not the record's silence.
  assertEquals(d.designation_trigger.verdict, "not_satisfied");
  assertEquals(d.verdict, "not_satisfied");
});


Deno.test("item403a d2 unrequested facts are strengthening not deficiency", () => {
  const d = buildDpoDetermination(PERFECT);
  const info = String(d.position_and_independence.information_needed ?? "");
  assert(/would let|would strengthen/i.test(info), info);
  assert(
    !/None of those five is evidenced/i.test(d.position_and_independence.application),
    "the analysis still penalises facts the intake never requested",
  );
});

// ---------------------------------------------------------------------------
// DEFECT 3 — the summary is bound to the typed verdict
// ---------------------------------------------------------------------------

function reportWithRating(primary: string, adverse: boolean, summary: string) {
  return {
    accountability_determination: { verdict: primary, citation: "GDPR Art. 5(2)" },
    dpo_determination: adverse
      ? { verdict: "record_insufficient" }
      : { verdict: "satisfied" },
    executive_summary: summary,
  } as Record<string, unknown>;
}

Deno.test("item403a d3 summary posture is bound to the typed rating", () => {
  const r = reportWithRating(
    "satisfied",
    true,
    "Aldergate presents a materially strong data protection posture: formal DPO oversight and tested incident response are in place.",
  );
  const out = applyVerdictVoice(r);
  assertEquals(out.readiness_rating, "Partly evidenced");
  assert(out.posture_claims_deasserted >= 1);
  const summary = String(r.executive_summary);
  assert(!/materially strong data protection posture/i.test(summary), summary);
  assert(/evidences only in part/i.test(summary), summary);
  assertEquals(unboundPostureClaims(r), []);
});

Deno.test("item403a d3 degraded rating rewrites the mixed-posture claim", () => {
  const r = reportWithRating(
    "record_insufficient",
    true,
    "Calder Health Analytics Ltd presents a mixed compliance posture under both the GDPR and UK GDPR.",
  );
  applyVerdictVoice(r);
  const summary = String(r.executive_summary);
  assert(!/mixed compliance posture/i.test(summary), summary);
  assert(/remains undetermined on this record/i.test(summary), summary);
  assertEquals(unboundPostureClaims(r), []);
});

Deno.test("item403a d3 an evidenced rating leaves an affirmative claim standing", () => {
  const r = reportWithRating(
    "satisfied",
    false,
    "The organisation presents a materially strong data protection posture.",
  );
  const out = applyVerdictVoice(r);
  assertEquals(out.readiness_rating, "Evidenced");
  assertEquals(out.posture_claims_deasserted, 0);
  assert(/materially strong data protection posture/i.test(String(r.executive_summary)));
});

Deno.test("item403a d3 assembled document states the verdict in one voice", () => {
  for (const primary of ["satisfied", "partially_satisfied", "not_satisfied", "record_insufficient"]) {
    const r = reportWithRating(
      primary,
      true,
      "The organisation presents a robust governance posture across the domains assessed.",
    );
    applyVerdictVoice(r);
    assertEquals(unboundPostureClaims(r), [], `two voices survived for ${primary}`);
  }
});

// ---------------------------------------------------------------------------
// DEFECT 4 — g1 single-writer repair
// ---------------------------------------------------------------------------

Deno.test("item403a d4 g1 is repaired by the domain single writer", () => {
  const report = {
    domain_findings: {
      internal_policy: {
        gap_description:
          "The intake does not confirm whether an AI-use policy exists. That leaves the control unevidenced for the purposes of Article 24(1) and the domain unresolved.",
      },
    },
  } as Record<string, unknown>;
  const t = runGovernanceCsc(report, { intake: PERFECT });
  const g1 = t.violations.filter((v) => v.check_id === "g1_domain_finding_vs_record");
  assertEquals(g1.length, 1);
  assertEquals(g1[0].repaired, true);
  const text = String(
    (report.domain_findings as Record<string, Record<string, unknown>>)
      .internal_policy.gap_description,
  );
  assert(!/does not confirm/i.test(text), text);
  assert(text.includes(String(PERFECT.tool_instruction)), text);
  // Only the offending sentence was replaced.
  assert(text.includes("That leaves the control unevidenced"), text);
});

Deno.test("item403a d4 g1 honest silence is byte-preserved", () => {
  const original = "The intake does not confirm whether an AI-use policy exists.";
  const report = {
    domain_findings: { internal_policy: { gap_description: original } },
  } as Record<string, unknown>;
  const silent = { ...PERFECT };
  delete silent.tool_instruction;
  const t = runGovernanceCsc(report, { intake: silent });
  assertEquals(t.violations.filter((v) => v.check_id === "g1_domain_finding_vs_record"), []);
  assertEquals(
    (report.domain_findings as Record<string, Record<string, unknown>>).internal_policy.gap_description,
    original,
  );
});

Deno.test("item403a d4 g1 stays outside the gate condition set", () => {
  assert(
    !(FALSE_ABSENCE_CHECK_IDS.governance as readonly string[]).includes("g1_domain_finding_vs_record"),
    "the gate must not be widened to g1",
  );
});
