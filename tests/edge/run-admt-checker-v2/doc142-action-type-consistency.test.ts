// DOC 142 (2026-09-02) — ADMT action-taxonomy consistency guard.
//
// External-review item (Batch 7 follow-on): the Executive Summary described
// the unresolved opt-out matter as "Recommendation — follow up on the
// selected opt-out pathway." while §8.1 Conditions to Proceed classified
// the same finding as a Condition (priority 1). Appendix B repeated the
// Recommendation label. A normalized action must carry ONE type on every
// surface. The fix (optOutAreaPhrase, admt-v2-assemble.ts) makes both the
// Executive Summary row and the Appendix B determination row consume the
// finding's normalized type: any priority-1 opt-out finding renders as
// "Condition — confirm …" wherever the area's severity word appears.
//
// Note: the doc-141 generator overhaul canonicalized opt_out_exception on
// clean batches, so this finding rarely fires there — but real customer
// intakes can still submit a non-canonical value, so the forced fixture
// below keeps the pathway under permanent test.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";

type Bag = Record<string, unknown>;

function renderText(intake: Bag): string {
  const computed = computeAdmtV2(intake as never);
  const doc = assembleAdmtV2Document({
    intake: intake as never,
    computed,
    exhibit: null,
    organizationName: String(intake.organization_name ?? ""),
    systemName: String(intake.system_name ?? ""),
  });
  return doc.sections
    .map((s) =>
      [s.title, ...s.paragraphs.map((p: Bag) =>
        p.kind === "table" && p.table
          ? [(p.table as Bag).title, ...((p.table as { rows: string[][] }).rows ?? []).map((r) => r.join(" | "))].join("\n")
          : String(p.text ?? "")
      )].join("\n")
    )
    .join("\n\n");
}

// Never introduced by this fix (standing deterministic-sweep ban).
const BANNED_PHRASES = [
  "the record shows", "the record reflects", "the record indicates",
  "the record demonstrates", "the record establishes", "on this record",
];

const BASE_INTAKE: Bag = {
  organization_name: "Taxonomy Test Co",
  system_name: "TypeCheck",
  system_type: "ML model",
  system_description: "Synthetic intake exercising the action-type consistency guard; not a real customer record.",
  decision_domains: ["Financial or lending services (credit decisions, loans, accounts)"],
  human_review: "No — fully automated, no human review",
  notice_delivery: ["Separate standalone Pre-use Notice"],
  notice_has_specific_purpose: "Yes",
  notice_purpose_text: "TypeCheck scores applications for eligibility.",
  notice_has_opt_out_desc: "Yes",
  notice_has_access_desc: "Yes",
  notice_has_anti_retaliation: "Yes",
  notice_has_how_it_works: "Yes",
  notice_has_alternative_process: "Yes",
};

Deno.test("DOC142 — unresolved opt-out pathway carries ONE normalized type (Condition) on every surface", () => {
  // Non-canonical opt_out_exception forces path OTHER_UNRESOLVED, which
  // computeAdmtV2 records as posture INSUFFICIENT_RECORD + a priority-1
  // finding (a §8.1 Condition to Proceed).
  const intake: Bag = { ...BASE_INTAKE, opt_out_exception: "Something else entirely" };
  const computed = computeAdmtV2(intake as never);
  const f = computed.optOut.findings.find((x) => x.area === "Opt-Out" && x.criterion === "Selected pathway");
  assert(f, "expected the unresolved-pathway finding to fire");
  assertEquals(f!.priority, 1, "the unresolved-pathway finding is a §8.1 Condition (priority 1) by taxonomy");

  const text = renderText(intake);

  // The old mismatch — the Condition item printing as a Recommendation on
  // the Executive Summary or Appendix B — must never come back.
  assert(!text.includes("Recommendation — follow up on the selected opt-out pathway"),
    "Executive Summary still labels the §8.1 Condition item as a Recommendation");
  assert(!text.includes("Recommendation — follow up on the selected pathway"),
    "Appendix B still labels the §8.1 Condition item as a Recommendation");

  // The normalized type renders as Condition wording on both surfaces.
  assert(text.includes("Condition — confirm the selected opt-out pathway."),
    "Executive Summary opt-out row does not carry the Condition label");
  assert(text.includes("Condition — confirm the selected pathway."),
    "Appendix B opt-out determination row does not carry the Condition label");

  // §8.1 still classifies the same item as a Condition to Proceed.
  assert(text.includes("8.1 Conditions to Proceed"), "§8.1 heading missing");
  assert(text.includes("Confirm which opt-out pathway or § 7221(b) exception the Company relies on."),
    "§8.1 no longer lists the unresolved-pathway condition");

  const lower = text.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    assert(!lower.includes(phrase), `banned phrase "${phrase}" rendered`);
  }
});

Deno.test("DOC142 — a non-priority-1 opt-out record limitation still renders as a Recommendation (no over-escalation)", () => {
  const intake: Bag = {
    ...BASE_INTAKE,
    opt_out_exception: "No exception — we provide a full opt-out right",
    // Every priority-1 factor affirmatively met; only the two priority-3
    // evidence factors (15-day process, confirmation mechanism) stay
    // unanswered, so posture is INSUFFICIENT_RECORD with NO priority-1
    // finding — the fix must not escalate items whose only §8 route is
    // Follow-Up/Recommendations.
    opt_out_methods: ["Interactive web form", "Toll-free number"],
    opt_out_no_cookie_banner: "Confirmed — an ADMT-specific opt-out route exists beyond any cookie banner",
    opt_out_no_account_required: "Confirmed — no account is required",
  };
  const computed = computeAdmtV2(intake as never);
  assertEquals(computed.optOut.path, "FULL_OPT_OUT");
  assertEquals(computed.optOut.posture, "INSUFFICIENT_RECORD");
  assert(!computed.optOut.findings.some((x) => x.priority === 1),
    "fixture drift: a priority-1 finding fired; this fixture must exercise the no-Condition branch");
  const text = renderText(intake);
  assert(text.includes("Recommendation — follow up on the selected opt-out pathway."),
    "a non-Condition opt-out record limitation was escalated off the Recommendation label");
  assert(!text.includes("Condition — confirm the selected opt-out pathway."),
    "Condition label rendered with no priority-1 finding behind it");
});

Deno.test("DOC142 — a priority-1 record gap on a RESOLVED pathway also types as Condition on the summary surfaces", () => {
  // Same mismatch class beyond OTHER_UNRESOLVED: the ADMT-specific-route
  // factor unanswered fires a priority-1 INSUFFICIENT_RECORD finding
  // (§8.1 Condition) while the composite posture alone would have printed
  // "Recommendation". One normalized type must win here too.
  const intake: Bag = {
    ...BASE_INTAKE,
    opt_out_exception: "No exception — we provide a full opt-out right",
    opt_out_methods: ["Interactive web form", "Toll-free number"],
    opt_out_no_account_required: "Confirmed — no account is required",
    // opt_out_no_cookie_banner intentionally unanswered → priority-1 finding.
  };
  const computed = computeAdmtV2(intake as never);
  assertEquals(computed.optOut.path, "FULL_OPT_OUT");
  assert(computed.optOut.posture !== "GAP", "fixture drift: expected a non-GAP posture with a priority-1 finding");
  assert(computed.optOut.findings.some((x) => x.priority === 1), "fixture drift: expected a priority-1 finding");
  const text = renderText(intake);
  assert(text.includes("Condition — confirm the selected opt-out pathway."),
    "priority-1 finding present but the Executive Summary does not type it as a Condition");
  assert(!text.includes("Recommendation — follow up on the selected opt-out pathway."),
    "the §8.1 Condition item still prints as a Recommendation on the Executive Summary");
});
