/**
 * ITEM 276 — TRACK 2 REDESIGN STEP 2: THE ASSESSMENT'S SUBJECT IS THE
 * PRIMARY ACTIVITY.
 *
 * Two obligations under test:
 *   (1) SUBJECT SEMANTICS — when the Item-275 fields are on the record, the
 *       executive summary, the processing narrative, and the rationale
 *       carrier all name the customer's primary activity, and the § 7156(a)
 *       segmentation item + unresolved-comparison ask appear.
 *   (2) MANDATORY DEGRADATION LAW — a legacy intake (no primary-activity
 *       fields, the archived ClearPath record) is byte-identical to the
 *       pre-Item-276 prong-derived behaviour: no new templates emitted.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { derivePlan } from "./derive.ts";
import { composeSection } from "./section-composers/cppa-risk.ts";
import { renderTemplate } from "./pass2-render.ts";

const LEGACY_INTAKE: Record<string, unknown> = {
  entity_name: "ClearPath Credit Solutions, Inc.",
  q1_revenue: "$100M–$500M",
  q2_consumers: "250,000–1 million",
  q3_sector: "Financial services",
  q4_pi_categories: ["Financial information"],
  q5_sell_share: "Yes — share for advertising only",
  q15_sensitive_pi: "Yes",
  q18_admt_use: "Yes",
  q5b_profiling_observation: "Yes",
  i1_processing_purpose: "to underwrite personal-loan applications",
  i1b_min_pi: "application fields limited to FCRA-permitted data",
  i2_retention_period: "seven years from account closure",
  i2_retention_criteria: "the applicable consumer-lending record-keeping period",
  i4_disclosure_mechanisms: "API transfers under written contracts",
  i4b_sources: "the applicant directly and credit bureaus",
  i6_vendors: "Experian, Plaid, and AWS",
  i7_internal_contributors: "Privacy Officer",
  i8_certifying_exec_title: "Chief Privacy Officer",
  i9_has_existing_dpia: "No",
};

const PRIMARY_INTAKE: Record<string, unknown> = {
  ...LEGACY_INTAKE,
  primary_activity_name: "credit-decisioning on loan applications",
  primary_activity_purpose: "assessing applicant creditworthiness for personal loans",
  has_secondary_uses: "Yes — there are other uses",
  secondary_activities: [
    {
      name: "marketing look-alike modelling",
      purpose: "prospecting for new applicants",
      divergence: {
        data: "Same",
        purpose: "Different",
        systems: "Not sure",
        people: "Same",
        risks: "Not sure",
      },
    },
  ],
};

function planFor(intake: Record<string, unknown>) {
  return derivePlan({ intake, report_data: {}, buildStamp: "item276@test" });
}

function ids(intake: Record<string, unknown>, section: string): string[] {
  return (composeSection(section, planFor(intake)) ?? []).map((i) => i.template_id);
}

function renderedText(intake: Record<string, unknown>, section: string): string {
  const plan = planFor(intake);
  const instances = composeSection(section, plan) ?? [];
  return instances
    .map((i) => renderTemplate(i.template_id, plan, i.ctx).text)
    .join("\n");
}

Deno.test("ITEM 276: executive summary leads with the named primary activity", () => {
  const text = renderedText(PRIMARY_INTAKE, "executive_summary");
  assert(
    ids(PRIMARY_INTAKE, "executive_summary")[0] === "T.risk.exec.primary_subject_lead",
    "primary-subject lead must be the first executive-summary instance",
  );
  assert(text.includes("credit-decisioning on loan applications"), text.slice(0, 400));
  assert(
    text.includes("assessing applicant creditworthiness for personal loans"),
    "purpose clause must render",
  );
  // Subject count is ONE (the named activity), never the engaged-prong count.
  const execInstances = composeSection("executive_summary", planFor(PRIMARY_INTAKE)) ?? [];
  const tail = execInstances[execInstances.length - 1].ctx as Record<string, string>;
  const countBearing = tail.activity_count_phrase ?? tail.activity_singplural_clause ?? "";
  assert(
    !/\b[2-9]\d* activities\b/.test(countBearing),
    `subject must read as a single activity, got: ${countBearing}`,
  );
});

Deno.test("ITEM 276: processing narrative and rationale name the primary activity", () => {
  // The narrative's SUBJECT is asserted on the composed ctx (its rendered
  // text is governed by pre-existing operational-slot resolution, untouched
  // this turn).
  const narrativeCtx = (composeSection("processing_narrative", planFor(PRIMARY_INTAKE)) ?? [])[0]
    .ctx as { activity_label?: string };
  assertEquals(narrativeCtx.activity_label, "credit-decisioning on loan applications");

  const plan = planFor(PRIMARY_INTAKE);
  const rationale = composeSection("risk_assessment_by_activity", plan) ?? [];
  assert(rationale.length > 0, "rationale must emit");
  assertEquals(
    (rationale[0].ctx as { activity_label?: string }).activity_label,
    "credit-decisioning on loan applications",
  );
});

Deno.test("ITEM 276: § 7156(a) segmentation item emits with reserved framing", () => {
  const scopeIds = ids(PRIMARY_INTAKE, "scope_and_triggers");
  assertEquals(scopeIds[scopeIds.length - 1], "T.risk.scope.secondary_segmentation");
  const text = renderedText(PRIMARY_INTAKE, "scope_and_triggers");
  assert(text.includes("marketing look-alike modelling"), "secondary use must be named");
  assert(text.includes("7156(a)"), "segmentation item must cite § 7156(a)");
  assert(
    text.includes("reserved to the Company and its counsel"),
    "tool must never green-light bundling",
  );
  // ITEM 276 RIDER — deliberate spec-of-test change: the standard clause must
  // quote the § 7156(a) DEFINITIONAL sentence (corpus row cppa-7156), not the
  // § 7156(a)(1) Business E example facts.
  assert(
    text.includes(
      "\u201ca set of similar processing activities that present similar risks to consumers\u2019 privacy.\u201d",
    ),
    "standard clause must quote the § 7156(a) definitional sentence verbatim",
  );
  assert(
    !text.includes("the same personal information, the same purpose"),
    "example-derived 'same X' enumeration must not be stated as the standard",
  );
  assert(
    text.includes("not resolved on the record"),
    '"Not sure" dimensions must read as unresolved',
  );
});

Deno.test("ITEM 276: unresolved comparisons raise an Items-for-your-review ask", () => {
  const text = renderedText(PRIMARY_INTAKE, "information_needed");
  assert(text.includes("comparable-set"), text.slice(0, 400));
  assert(
    text.includes("the systems, technology, and service providers used"),
    "the 'Not sure' dimensions must be named in the ask",
  );
  assert(
    !text.includes("the purpose of the processing"),
    "answered dimensions must NOT be asked again",
  );
});

Deno.test("ITEM 276: MANDATORY DEGRADATION — legacy intake emits no Item-276 templates", () => {
  for (const section of [
    "executive_summary",
    "scope_and_triggers",
    "scope_confirmation",
    "processing_narrative",
    "information_needed",
  ]) {
    const emitted = ids(LEGACY_INTAKE, section);
    assert(
      !emitted.includes("T.risk.exec.primary_subject_lead"),
      `${section} must not lead with a primary subject on a legacy record`,
    );
    assert(
      !emitted.includes("T.risk.scope.secondary_segmentation"),
      `${section} must not emit segmentation on a legacy record`,
    );
  }
  const legacyNarrativeCtx = (composeSection("processing_narrative", planFor(LEGACY_INTAKE)) ?? [])[0]
    .ctx as { activity_label?: string };
  assert(
    !(legacyNarrativeCtx.activity_label ?? "").includes("credit-decisioning"),
    "legacy narrative keeps its prong-derived subject",
  );
  const legacyRationale = composeSection("risk_assessment_by_activity", planFor(LEGACY_INTAKE)) ?? [];
  assert(
    !((legacyRationale[0]?.ctx as { activity_label?: string })?.activity_label ?? "")
      .includes("credit-decisioning"),
    "legacy rationale keeps its prong-derived subject",
  );
});
