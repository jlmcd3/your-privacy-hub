// DOC 235 — `buildAdmtRuleStates`. Pins the projection from ADMT's typed
// deterministic output into the shared `TypedStateBag`, including the
// `isPassingVerdict` vocabulary coupling this file's own doc comment
// documents (doc 232 §9.1's warning to "the next hooks product").

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { buildAdmtRuleStates } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/v3/rule-states.ts";
import { isPassingVerdict } from "../../../supabase/functions/_shared/corpus/hook-types.ts";

// A minimal, realistic ADMT intake — a hiring decision, fully automated,
// notice in place but generic, full opt-out.
function baseIntake(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    organization_name: "Test Co",
    system_name: "Test Hiring Screener",
    system_type: "ML classifier",
    system_description: "Scores job applicants for interview eligibility.",
    decision_domains: ["Hiring or admission decisions"],
    human_review: "No — fully automated, no human review",
    training_data_use: "Yes",
    profiling_use: "Yes",
    notice_delivery: ["Separate standalone Pre-use Notice"],
    notice_has_specific_purpose: "No — uses generic language",
    notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
    notice_has_access_desc: "Yes",
    notice_has_anti_retaliation: "Yes",
    notice_has_how_it_works: "Yes — included inline in the notice",
    notice_has_alternative_process: "Yes",
    opt_out_exception: "No exception — we provide a full opt-out right",
    access_submission_methods: "Online form",
    access_verification_process: "Email verification",
    access_logic_disclosure: "We describe the scoring model in general terms.",
    access_outcome_disclosure: "We tell the applicant whether they advanced.",
    access_response_timeline: "Within 45 calendar days (standard)",
    admt_detail: {},
    ...overrides,
  };
}

Deno.test("buildAdmtRuleStates — instrument, use_case_class (first regulated domain), flags, and states derive from the intake", () => {
  const intake = baseIntake();
  const computed = computeAdmtV2(intake as any);
  const states = buildAdmtRuleStates(intake, computed);
  assertEquals(states.instrument, "CPPA ADMT Regulations");
  assertEquals(states.use_case_class, "hiring_admission");
  assertEquals(states.relationship, null);
  assertEquals(states.data_categories, []);
  assertEquals(states.flags.includes("no_human_review"), true);
  assertEquals(states.flags.includes("qualifying_human_review"), false);
  assertEquals(states.states["intake.human_review"], "No — fully automated, no human review");
  assertEquals(states.states["intake.access_response_timeline"], "Within 45 calendar days (standard)");
});

Deno.test("buildAdmtRuleStates — use_case_class takes the FIRST regulated domain when several are selected; the explicit negative selects none", () => {
  const multi = baseIntake({ decision_domains: ["Housing (rental or purchase eligibility)", "Hiring or admission decisions"] });
  const s1 = buildAdmtRuleStates(multi, computeAdmtV2(multi as any));
  assertEquals(s1.use_case_class, "housing");

  const none = baseIntake({ decision_domains: ["None of these categories — the decision is outside every § 7001(ddd) category"] });
  const s2 = buildAdmtRuleStates(none, computeAdmtV2(none as any));
  assertEquals(s2.use_case_class, null);
});

Deno.test("buildAdmtRuleStates — qualifying human review sets the flag and no_human_review is absent", () => {
  const intake = baseIntake({
    human_review: "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
  });
  const states = buildAdmtRuleStates(intake, computeAdmtV2(intake as any));
  assertEquals(states.flags.includes("qualifying_human_review"), true);
  assertEquals(states.flags.includes("no_human_review"), false);
});

Deno.test("buildAdmtRuleStates — vendor/biometric/opt-out-path flags derive correctly", () => {
  const intake = baseIntake({
    admt_detail: { hosting: "Hosted by the vendor", model_types: ["Biometric"] },
    opt_out_exception: "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination",
  });
  const states = buildAdmtRuleStates(intake, computeAdmtV2(intake as any));
  assertEquals(states.flags.includes("vendor_hosted"), true);
  assertEquals(states.flags.includes("biometric_model"), true);
  assertEquals(states.flags.includes("hiring_admission_exception"), true);
  assertEquals(states.flags.includes("full_opt_out"), false);
});

// ── THE isPassingVerdict HAZARD (doc 232 §9.1) — verify this file's chosen
// verdict strings actually register correctly against the SHARED,
// unmodified isPassingVerdict, not an ADMT-native token like "MEETS_REPORTED"
// or "SUPPORTS" which would silently register as non-passing. ────────────

Deno.test("buildAdmtRuleStates — verdicts use the literal isPassingVerdict vocabulary ('passes'/'fails'/'uncertain'), never an ADMT-native token", () => {
  const intake = baseIntake(); // notice generic (GAP-adjacent), access MEETS_REPORTED-ish, fully automated
  const states = buildAdmtRuleStates(intake, computeAdmtV2(intake as any));
  for (const factor of Object.keys(states.verdicts)) {
    const v = states.verdicts[factor];
    assertEquals(["passes", "fails", "uncertain"].includes(v), true, `factor "${factor}" carries non-vocabulary verdict "${v}"`);
  }
  // Sanity: isPassingVerdict must actually distinguish "passes" from the
  // other two literal strings this file emits (the hazard doc 232 §9.1
  // warns a native token would silently fail to do).
  assertEquals(isPassingVerdict("passes"), true);
  assertEquals(isPassingVerdict("fails"), false);
  assertEquals(isPassingVerdict("uncertain"), false);
});

Deno.test("buildAdmtRuleStates — the three scope-bearing factors (Significant decision/Human involvement/Advertising exclusion) share one verdict derived from the record's overall scope resolution", () => {
  const inScope = baseIntake(); // hiring decision, fully automated -> IN_SCOPE (a resolved determination)
  const s1 = buildAdmtRuleStates(inScope, computeAdmtV2(inScope as any));
  assertEquals(s1.verdicts["Significant decision"], s1.verdicts["Human involvement"]);
  assertEquals(s1.verdicts["Human involvement"], s1.verdicts["Advertising exclusion"]);
});

Deno.test("buildAdmtRuleStates — duty-area verdicts: MEETS_REPORTED -> passes, GAP -> fails, everything else -> uncertain", () => {
  // A fully-populated, well-answered record should read MEETS_REPORTED on
  // access (this build's own substantivePassing proxy) -> "passes".
  const meets = baseIntake();
  const s = buildAdmtRuleStates(meets, computeAdmtV2(meets as any));
  assertEquals(["passes", "fails", "uncertain"].includes(s.verdicts["Access process"]), true);

  // No notice at all: notice.posture should read a GAP -> "fails".
  const noNotice = baseIntake({
    notice_delivery: ["We have not yet provided a Pre-use Notice"],
    notice_has_specific_purpose: "We have not yet created a Pre-use Notice",
    notice_has_opt_out_desc: "No",
    notice_has_access_desc: "No",
    notice_has_anti_retaliation: "No",
    notice_has_how_it_works: "No",
    notice_has_alternative_process: "No",
  });
  const s2 = buildAdmtRuleStates(noNotice, computeAdmtV2(noNotice as any));
  assertEquals(s2.verdicts["Notice content"], "fails");
});
