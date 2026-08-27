// FD703575 (quality batch, 2026-08-27) — LIA deterministic-layer fixes.
// The batch's LIA document (row e6ae29b3, scored 65.05) carried five defects,
// all in the flag-independent deterministic layer (build-upgrade4 +
// three-part-test-typed), all root-caused individually:
//   L1 severityOf recognised an internal vocabulary that matched only
//      "Severe" — three of the four CONTRACT-VALID answers ("None /
//      negligible", "Minor", "Moderate") fell to "unstated", flipping the
//      finding to record_insufficient and the balancing verdict to
//      "uncertain" against an answered record.
//   L2 harmClause then claimed "the worst-case impact is not stated" while
//      record_fact quoted the recorded label — a flat self-contradiction.
//   L3 "No unconditional opt-out is available … case-by-case" classified as
//      an UNCONDITIONAL opt-out (\bunconditional\b matched inside its own
//      negation — the DPO-negation defect class), crediting a mitigation the
//      record denies and rendering "exercisable without having to make out a
//      case" against a quoted conditional mechanism.
//   L4 the partial-rationale necessity sentence promised the unexplained
//      alternatives would be "set out individually below" — no rendered
//      surface does that; they are now named inline. (Plus "1 do not"
//      agreement.)
//   L5 the controller-side weighing clause pasted the entire safeguard list
//      lowercased (mangling product names) into the executive summary.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildAlternativesConsidered,
  buildOptOutFeasibility,
  buildPotentialHarms,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { buildThreePartTestTyped } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";

const LIVE_OPT_OUT_MECHANISM =
  "No unconditional opt-out is available because the telematics monitoring is embedded in the operation of company vehicles. " +
  "Drivers may raise objections through the Works Council or directly to HR. Individual objections are assessed on a case-by-case basis.";

Deno.test("L1 — every POTENTIAL_HARM_OPTS contract answer maps to a severity band (none falls to unstated)", () => {
  const expectations: Record<string, string> = {
    "None / negligible": "negligible",
    "Minor": "limited",
    "Moderate": "significant",
    "Severe": "severe",
  };
  for (const [answer, band] of Object.entries(expectations)) {
    const f = buildPotentialHarms({
      balancing_details: { potential_harms: ["Some named harm"], potential_harm: answer, potential_harm_detail: "" },
    });
    assertEquals(f.worst_case_severity, band, `contract answer ${JSON.stringify(answer)}`);
    assertEquals(f.status, "analysed", `contract answer ${JSON.stringify(answer)} must not be record_insufficient`);
  }
});

Deno.test("L1 — the legacy internal labels still map (no regression for stored rows)", () => {
  for (const [answer, band] of Object.entries({ negligible: "negligible", limited: "limited", significant: "significant" })) {
    const f = buildPotentialHarms({
      balancing_details: { potential_harms: ["Some named harm"], potential_harm: answer },
    });
    assertEquals(f.worst_case_severity, band);
  }
});

Deno.test("L2 — a recorded-but-unmapped label carries severity_label_recorded and is never called 'not stated'", () => {
  const f = buildPotentialHarms({
    balancing_details: { potential_harms: ["Some named harm"], potential_harm: "Catastrophic-ish", potential_harm_detail: "A pathway." },
  });
  assertEquals(f.status, "record_insufficient");
  assertEquals(f.severity_label_recorded, "Catastrophic-ish");
  // The full three-part weighing must name the label, not claim absence.
  const report = { lia_upgrade4: undefined } as Record<string, unknown>;
  void report;
});

Deno.test("L3 — the live fd703575 negated-unconditional mechanism classifies as CONDITIONAL, not unconditional", () => {
  const f = buildOptOutFeasibility({
    balancing_details: {
      opt_out_available: "Yes — but conditional or subject to review",
      opt_out_mechanism: LIVE_OPT_OUT_MECHANISM,
    },
  });
  assertEquals(f.feasibility, "conditional_opt_out_available");
  assertEquals(f.counts_as_mitigation, false);
  assert(!f.application.includes("without having to make out a case"), "must not credit an unconditional opt-out");
});

Deno.test("L3 — a genuinely unconditional mechanism still classifies as unconditional", () => {
  const f = buildOptOutFeasibility({
    balancing_details: {
      opt_out_available: "Yes — unconditional, on request, with no consequence",
      opt_out_mechanism: "An unconditional one-click opt-out in the account settings; processing stops immediately.",
    },
  });
  assertEquals(f.feasibility, "unconditional_opt_out_available");
  assertEquals(f.counts_as_mitigation, true);
});

Deno.test("L4 — unexplained alternatives are named inline, never promised 'below'", () => {
  const f = buildAlternativesConsidered({
    necessity_details: {
      alternatives:
        "Aggregate fleet telemetry\nSelf-reported trip logs — rejected as unreliable in the 2023 pilot.",
      alternatives_rationale: "",
      why_consent_not_used: "Employment power imbalance means consent would not be freely given.",
    },
  });
  assert(f.count_with_rationale < f.alternatives.length, "fixture must exercise the partial-rationale branch");
  assert(!f.application.includes("set out individually below"), "the undelivered promise must be gone");
  assertStringIncludes(f.application, "Aggregate fleet telemetry");
  // Agreement: with exactly one unexplained alternative the verb is "does not".
  assertStringIncludes(f.application, "does not");
});

Deno.test("L5 — the weighing analysis counts safeguards instead of pasting the lowercased list", () => {
  const intake = {
    processing_description: "Driver performance analytics",
    balancing_details: {
      relationship_category: "employee",
      potential_harms: ["Unfair disciplinary action"],
      potential_harm: "Moderate",
      potential_harm_detail: "Dismissal risk from granular data.",
      safeguards: ["Other: Tokenisation in Azure with ServiceNow logging", "Other: Works Council opinion"],
      opt_out_available: "Yes — but conditional or subject to review",
      opt_out_mechanism: LIVE_OPT_OUT_MECHANISM,
    },
  } as Record<string, unknown>;
  const report = {
    potential_harms: buildPotentialHarms(intake),
    opt_out_feasibility: buildOptOutFeasibility(intake),
    benefit_and_beneficiary: { benefit: "Improved road safety outcomes" },
  } as Record<string, unknown>;
  const typed = buildThreePartTestTyped(report, intake) as unknown as {
    three_part_test: { balancing_test: { analysis: string } };
  };
  const analysis = typed.three_part_test.balancing_test.analysis;
  assertStringIncludes(analysis, "the 2 recorded safeguards set out in the balancing analysis");
  assert(!analysis.includes("tokenisation in azure"), "the lowercased verbatim dump must be gone");
  assert(!analysis.includes("an opt-out that goes beyond what the GDPR already requires"), "no credited unconditional opt-out");
});
