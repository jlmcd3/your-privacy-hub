// BATCH 7bd29982 (2026-09-10) — Velostream Technologies ADMT (17e67bf5).
// Two rendered defects on an out-of-scope (advertising-only) record:
//   1. The categorical decision_domains option was spliced into the domain
//      sentence: "The Company uses VeloTarget … in None of these categories —
//      the decision is outside every § 7001(ddd) category." (exec summary)
//      and "The System is used in None of these categories — …" (Section 1).
//   2. Appendix B's Scale row doubled the stop when the free-text count ended
//      in its own ("…quarterly count..", "…(not yet in scope)..").
// The intake below is the batch's own row, trimmed to the fields the two
// surfaces read.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeAdmtV2, ADMT_NONE_DOMAIN } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";

function velostream() {
  return {
    organization_name: "Velostream Technologies, Inc.",
    system_name: "VeloTarget Behavioral Scoring Engine",
    system_type: "ML-based interest-classification and ad-targeting system",
    system_description:
      "VeloTarget is a gradient-boosted machine-learning classifier that processes in-app behavioral signals from registered users to assign interest-category scores and rank advertising inventory for in-platform display.",
    decision_domains: [ADMT_NONE_DOMAIN],
    human_review: "Partial — reviewer sees the output but cannot override it",
    ca_consumer_count: "Approximately 1.4 million registered California users as of the most recent quarterly count.",
    admt_system_count: "1 production ADMT system (VeloTarget) in active use for ad targeting; 1 system in evaluation for churn-prediction use case (not yet in scope).",
    training_data_use: "Yes",
    profiling_use: "Yes",
    third_party_admt: "No",
    notice_delivery: ["Included in our Notice at Collection"],
    admt_detail: {
      hosting: "Hybrid",
      model_types: ["ML classifier", "Ranking / recommender"],
      solely_advertising: "Yes — solely advertising",
      sole_factor: "Material factor — heavily weighted alongside others",
      decision_effects: ["Ranking", "Allocation"],
      decision_cadence: "Continuous",
      feeds_future_decisions: "Yes",
      hi_reviewer_present: "Sometimes / on a subset",
      hi_authority_override: "No",
      hi_reviews_other_info: "No",
      hi_trained: "Yes",
    },
  };
}

function sectionText(doc: ReturnType<typeof assembleAdmtV2Document>, id: string): string {
  const section = doc.sections.find((s) => s.id === id);
  assert(section, `section ${id} must render`);
  return section!.paragraphs.map((p) => p.text).join("\n");
}

Deno.test("7bd29982 ADMT-1 — the 'None of these categories' option renders as the record it is, not as a domain the System is used in", () => {
  const intake = velostream();
  const computed = computeAdmtV2(intake as any);
  const doc = assembleAdmtV2Document({ intake, computed, exhibit: null, organizationName: intake.organization_name, systemName: intake.system_name });
  const exec = sectionText(doc, "executive_summary");
  // DOC 251 ledger A2/A3 — CEO-revised bytes (2026-09-10), pinned byte-exact.
  assertStringIncludes(exec, "The Company’s position is that the decision VeloTarget Behavioral Scoring Engine makes is not a “significant decision” under § 7001(ddd).");
  assert(!exec.includes("in None of these categories"), exec);
  const profile = sectionText(doc, "system_profile");
  // DOC 255 (2026-09-11, ledger L3): the reported use precedes the position.
  assertStringIncludes(profile, "The Company reports that the System is not used to make a decision in any of the § 7001(ddd) categories, and its position is therefore that the decision the System makes is not a “significant decision” under § 7001(ddd).");
  assert(!profile.includes("The System is used in None"), profile);
});

Deno.test("7bd29982 ADMT-1 — a real domain still renders through the unchanged branch", () => {
  const intake = { ...velostream(), decision_domains: ["Hiring or admission decisions"] };
  const computed = computeAdmtV2(intake as any);
  const doc = assembleAdmtV2Document({ intake, computed, exhibit: null, organizationName: intake.organization_name, systemName: intake.system_name });
  assertStringIncludes(sectionText(doc, "executive_summary"), "The Company uses VeloTarget Behavioral Scoring Engine in Hiring or admission decisions.");
});

Deno.test("7bd29982 ADMT-2 — the fact record's Scale row never doubles a stop", () => {
  const intake = velostream();
  const computed = computeAdmtV2(intake as any);
  const doc = assembleAdmtV2Document({ intake, computed, exhibit: null, organizationName: intake.organization_name, systemName: intake.system_name });
  const all = JSON.stringify(doc);
  assert(!all.includes(".."), "no doubled stop anywhere in the assembled document");
  assertStringIncludes(all, "CA consumers: Approximately 1.4 million registered California users as of the most recent quarterly count. ADMT system count: 1 production ADMT system (VeloTarget) in active use for ad targeting; 1 system in evaluation for churn-prediction use case (not yet in scope).");
});
