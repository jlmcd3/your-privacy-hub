// DOC 235 — ADMT HOOK JOIN. Pins `applyAdmtHooks`/`planAdmtHookSelection`/
// `resolveHookSelections` (hook-join.ts) against hand-built
// `AuthorityHook`/`TypedStateBag` fixtures — mirrors
// tests/edge/run-li-assessment/doc213-hook-join.test.ts's own structure and
// tests/edge/run-cppa-risk-assessment-v2/doc231-hook-join.test.ts's doc-223
// hazard coverage, adapted to ADMT's own factor-level vocabulary.
//
// `ADMT_HOOKS` ships `[]` in production — every fixture hook below is
// injected directly through `applyAdmtHooks`'s `hooks` parameter, never
// through `ADMT_HOOKS` itself.
//
// `directionFor` (the shared, product-agnostic direction matrix,
// `_shared/corpus/hook-types.ts`) is already exhaustively pinned by
// doc213-hook-join.test.ts and is unmodified by this build — this file
// does not re-test it row by row; it tests THIS join's own wiring
// (rendering through ADMT's own shapes/atom-phrase map/factor-section map)
// and the two doc 223 hazards specifically.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityHook } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import type { TypedStateBag } from "../../../supabase/functions/_shared/corpus/rule-types.ts";
import {
  applyAdmtHooks,
  planAdmtHookSelection,
  resolveHookSelections,
  ADMT_HOOKS_FACTOR_CAP,
  ADMT_HOOKS_REPORT_CAP,
  ADMT_SECTION_ID_FOR_ELEMENT,
  type HookSelectionRow,
} from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/hook-join.ts";
import { ADMT_HOOKS } from "../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts";
import { ADMT_GOVERNANCE_FACTOR_ID } from "../../../supabase/functions/run-admt-checker-v2/_local/corpus/maps/admt-corpus-map.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";

function baseStates(overrides: Partial<TypedStateBag> = {}): TypedStateBag {
  return {
    instrument: "CPPA ADMT Regulations",
    use_case_class: "hiring_admission",
    relationship: null,
    data_categories: [],
    flags: [],
    verdicts: {
      "Significant decision": "passes",
      "Human involvement": "passes",
      "Advertising exclusion": "passes",
      "Notice delivery": "passes",
      "Notice content": "passes",
      "Opt-out pathway": "passes",
      "Access process": "fails",
      "Vendor dependency": "passes",
    },
    states: {},
    ...overrides,
  };
}

function makeHook(overrides: Partial<AuthorityHook> & { hook_id: string }): AuthorityHook {
  return {
    profile_id: "profile-test",
    source_row_id: "row-test",
    fact_atoms: ["class:hiring_admission"],
    distinguishing_atoms: [],
    not_distinguishable: false,
    required_atoms: [],
    finding_span: "the access process did not disclose the outcome",
    fact_pattern_paraphrase: "a business used ADMT for a hiring decision",
    finding_paraphrase: "the access response must disclose the outcome and the reasons for it",
    settledness: "R1",
    posture: "rejected",
    factor_id: "Access process",
    bears_on_element: "Access process",
    authority_label: "Test Regulator, Test Matter, decision of 1 January 2024",
    regulator: "Test Regulator",
    relevance: {
      instrument: "CPPA ADMT Regulations",
      factor_ids: ["Access process"],
      use_case_class: null,
      relationship: null,
      data_categories: [],
      flags: [],
      outcome_posture: "rejected",
    },
    ...overrides,
  };
}

// ── Basic shapes render through ADMT's own vocabulary ────────────────────

Deno.test("applyAdmtHooks — S2 renders with ADMT's factor phrase and section number", () => {
  const hook = makeHook({ hook_id: "test/s2" });
  const states = baseStates();
  const r = applyAdmtHooks([hook], states, states.verdicts, ["row-test"], new Set());
  assertEquals(r.flags, []);
  assertEquals(r.applications.length, 1);
  const app = r.applications[0];
  assertEquals(app.shape, "S2");
  assertEquals(app.hook_id, "test/s2");
  // "the significant-decision determination" is NOT this hook's factor —
  // ADMT's "Access process" phrase and Section 5 must both appear.
  assertEquals(app.sentence.includes("the access and explanation process"), true);
  assertEquals(app.sentence.includes("Section 5"), true);
  assertEquals(app.sentence.includes("The company has stated that the decision is a hiring or admission decision"), true);
});

Deno.test("applyAdmtHooks — the lawyer's rule: rejected + same + passing verdict omits with rule_missing, never S2", () => {
  const hook = makeHook({ hook_id: "test/rule-missing" });
  const states = baseStates({ verdicts: { ...baseStates().verdicts, "Access process": "passes" } });
  const r = applyAdmtHooks([hook], states, states.verdicts, ["row-test"], new Set());
  assertEquals(r.applications, []);
  assertEquals(r.flags, [{ hook_id: "test/rule-missing", reason: "rule_missing" }]);
});

Deno.test("applyAdmtHooks — conditional posture renders S5a/S5b through ADMT's own factor/section slots", () => {
  const hook = makeHook({
    hook_id: "test/s5",
    posture: "conditional",
    bears_on_element: "Opt-out pathway",
    factor_id: "Opt-out pathway",
    fact_atoms: ["class:hiring_admission"],
    required_atoms: ["class:hiring_admission"],
    recognised_proposition: "a full opt-out satisfies the exception requirement",
    condition_text: "the company also documents nondiscrimination testing",
    condition_atoms: ["state:intake.admt_detail.nondiscrimination_testing=Yes — documented testing record"],
  });
  const failing = baseStates({ verdicts: { ...baseStates().verdicts, "Opt-out pathway": "fails" } });
  const a = applyAdmtHooks([hook], failing, failing.verdicts, ["row-test"], new Set());
  assertEquals(a.applications.map((x) => x.shape), ["S5a"]);
  assertEquals(a.applications[0].sentence.includes("Section 4"), true);

  const passingWithCondition = baseStates({
    verdicts: { ...baseStates().verdicts, "Opt-out pathway": "passes" },
    states: { "intake.admt_detail.nondiscrimination_testing": "Yes — documented testing record" },
  });
  const b = applyAdmtHooks([hook], passingWithCondition, passingWithCondition.verdicts, ["row-test"], new Set());
  assertEquals(b.applications.map((x) => x.shape), ["S5b"]);
});

// ── DOC 223 hazard #1 — required atom duplicated into distinguishing_atoms
// (documented, not silently guarded — this is a draft/verify-layer defect
// this join reproduces by construction, exactly as LIA's/Risk's own joins
// do) ──────────────────────────────────────────────────────────────────

Deno.test("applyAdmtHooks — doc 223 hazard #1: a required atom duplicated into distinguishing_atoms forces every nominated record to 'different'; 'same'/'unknown' are unreachable", () => {
  const overlapping = makeHook({
    hook_id: "test/overlap",
    posture: "rejected",
    bears_on_element: "Access process",
    fact_atoms: ["class:hiring_admission", "flag:no_human_review"],
    required_atoms: ["class:hiring_admission"],
    distinguishing_atoms: ["class:hiring_admission"], // the defect
  });
  const allFacts = baseStates({ flags: ["no_human_review"] });
  const a = applyAdmtHooks([overlapping], allFacts, allFacts.verdicts, ["row-test"], new Set());
  assertEquals(a.applications, []);
  assertEquals(a.flags, [{ hook_id: "test/overlap", reason: "s3_missing_distinguishing_atom" }]);

  const partial = baseStates();
  const b = applyAdmtHooks([overlapping], partial, partial.verdicts, ["row-test"], new Set());
  assertEquals(b.flags, [{ hook_id: "test/overlap", reason: "s3_missing_distinguishing_atom" }]);

  // The same hook with the overlap removed reaches both "same" and "unknown".
  const fixed: AuthorityHook = { ...overlapping, distinguishing_atoms: [] };
  assertEquals(applyAdmtHooks([fixed], allFacts, allFacts.verdicts, ["row-test"], new Set()).applications.map((x) => x.shape), ["S2"]);
  assertEquals(applyAdmtHooks([fixed], partial, partial.verdicts, ["row-test"], new Set()).flags, [{ hook_id: "test/overlap", reason: "selection_pending" }]);
});

// ── DOC 223 hazard #2 — the absent-polarity render guard ─────────────────

Deno.test("applyAdmtHooks — doc 223 hazard #2: an absent-polarity pair distinguishes but never renders a false presence statement; the default entry stands", () => {
  const hook = makeHook({
    hook_id: "test/absent-pair",
    posture: "rejected",
    bears_on_element: "Access process",
    fact_atoms: ["class:hiring_admission"],
    required_atoms: ["class:hiring_admission"],
    distinguishing_atoms: [],
    distinguishing_pairs: [{
      source_fact_span: "the business provided a qualifying human reviewer",
      source_polarity: "present",
      record_atom: "flag:qualifying_human_review",
      record_polarity: "absent",
      why_material: "the finding turned on the absence of a qualifying reviewer",
      source_expressly_excludes: false,
    }],
  });
  // No qualifying_human_review flag on the record: the pair holds (absent)
  // -> "different" -> S3 -> guard. It must NEVER render "the company has
  // stated that a human reviewer has authority to change the decision" —
  // the record says the opposite.
  const noReview = baseStates();
  const r = applyAdmtHooks([hook], noReview, noReview.verdicts, ["row-test"], new Set());
  assertEquals(r.applications, []);
  assertEquals(r.flags, [{ hook_id: "test/absent-pair", reason: "absent_pair_unrenderable" }]);

  // With the flag held, the pair does not fire and the facts agree instead.
  const withReview = baseStates({ flags: ["qualifying_human_review"] });
  const s = applyAdmtHooks([hook], withReview, withReview.verdicts, ["row-test"], new Set());
  assertEquals(s.applications.map((x) => x.shape), ["S2"]);
});

Deno.test("applyAdmtHooks — the absent-polarity guard is polarity-specific: a PRESENT-polarity pair on the same hook shape renders normally", () => {
  const hook = makeHook({
    hook_id: "test/present-pair",
    posture: "rejected",
    bears_on_element: "Access process",
    fact_atoms: ["class:hiring_admission"],
    required_atoms: ["class:hiring_admission"],
    distinguishing_atoms: [],
    distinguishing_pairs: [{
      source_fact_span: "the business relied on a biometric model",
      source_polarity: "present",
      record_atom: "flag:biometric_model",
      record_polarity: "present",
      why_material: "the finding turned on the biometric model",
      source_expressly_excludes: false,
    }],
  });
  const withBiometric = baseStates({ flags: ["biometric_model"] });
  const r = applyAdmtHooks([hook], withBiometric, withBiometric.verdicts, ["row-test"], new Set());
  assertEquals(r.applications.length, 1);
  assertEquals(r.applications[0].shape, "S3");
  assertEquals(r.applications[0].sentence.includes("the system uses a biometric, emotion-recognition, or identity-verification model"), true);
});

// ── Caps: five per report, two per factor, settledness then rank order ───

Deno.test("applyAdmtHooks — factor cap: at most ADMT_HOOKS_FACTOR_CAP renders per bears_on_element", () => {
  const hooks: AuthorityHook[] = [];
  for (let i = 0; i < ADMT_HOOKS_FACTOR_CAP + 2; i++) {
    hooks.push(makeHook({ hook_id: `test/factor-cap-${i}`, source_row_id: `row-${i}` }));
  }
  const states = baseStates();
  const r = applyAdmtHooks(hooks, states, states.verdicts, hooks.map((h) => h.source_row_id), new Set());
  assertEquals(r.applications.length, ADMT_HOOKS_FACTOR_CAP);
});

Deno.test("applyAdmtHooks — report cap: at most ADMT_HOOKS_REPORT_CAP renders across all factors", () => {
  const factors = ["Access process", "Opt-out pathway", "Notice content", "Vendor dependency"];
  const hooks: AuthorityHook[] = [];
  let i = 0;
  for (const f of factors) {
    for (let j = 0; j < ADMT_HOOKS_FACTOR_CAP; j++) {
      hooks.push(makeHook({ hook_id: `test/report-cap-${i}`, source_row_id: `row-${i}`, bears_on_element: f, factor_id: f }));
      i++;
    }
  }
  const states = baseStates({
    verdicts: { "Significant decision": "fails", "Human involvement": "fails", "Advertising exclusion": "fails", "Notice delivery": "fails", "Notice content": "fails", "Opt-out pathway": "fails", "Access process": "fails", "Vendor dependency": "fails" },
  });
  const r = applyAdmtHooks(hooks, states, states.verdicts, hooks.map((h) => h.source_row_id), new Set());
  assertEquals(r.applications.length, ADMT_HOOKS_REPORT_CAP);
});

// ── Determinative suppression ─────────────────────────────────────────────

Deno.test("applyAdmtHooks — a hook whose source is already determinative is suppressed silently", () => {
  const hook = makeHook({ hook_id: "test/determinative", source_row_id: "row-cited" });
  const states = baseStates();
  const r = applyAdmtHooks([hook], states, states.verdicts, ["row-cited"], new Set(["row-cited"]));
  assertEquals(r.applications, []);
  assertEquals(r.flags, []);
});

// ── The factor -> section-id map covers every factor ADMT_HOOKS may use ──

Deno.test("ADMT_SECTION_ID_FOR_ELEMENT — covers all eight CAM factor ids plus the Section 7 Governance factor (doc 241) with a valid admt-v2-assemble.ts section id", () => {
  const validIds = new Set(["applicability", "notice", "optout", "access", "vendor", "governance"]);
  const factors = [
    "Significant decision", "Human involvement", "Advertising exclusion",
    "Notice delivery", "Notice content", "Opt-out pathway", "Access process", "Vendor dependency",
    ADMT_GOVERNANCE_FACTOR_ID,
  ];
  for (const f of factors) {
    assertEquals(validIds.has(ADMT_SECTION_ID_FOR_ELEMENT[f]), true, `missing/invalid section id for factor "${f}"`);
  }
  assertEquals(ADMT_SECTION_ID_FOR_ELEMENT[ADMT_GOVERNANCE_FACTOR_ID], "governance");
  assertEquals(Object.keys(ADMT_SECTION_ID_FOR_ELEMENT).length, 9);
});

// ── DOC 241 (2026-09-09) — the Governance factor is a real attachment point ──

Deno.test("doc241 — a Governance-factor hook renders through ADMT's own {factor}/{section} slots: 'Section 7' and the governance phrase; with no Governance verdict (null) it is S2, never rule_missing", () => {
  const hook = makeHook({
    hook_id: "test/governance-s2",
    factor_id: ADMT_GOVERNANCE_FACTOR_ID,
    bears_on_element: ADMT_GOVERNANCE_FACTOR_ID,
    relevance: { instrument: "CPPA ADMT Regulations", factor_ids: [ADMT_GOVERNANCE_FACTOR_ID], use_case_class: null, relationship: null, data_categories: [], flags: [], outcome_posture: "rejected" },
  });
  const states = baseStates();
  assertEquals(states.verdicts[ADMT_GOVERNANCE_FACTOR_ID], undefined, "rule-states derives no Governance verdict — deliberate (hook-join.ts SECTION_FOR_ELEMENT note)");
  const r = applyAdmtHooks([hook], states, states.verdicts, ["row-test"], new Set());
  assertEquals(r.flags, []);
  assertEquals(r.applications.length, 1);
  assertEquals(r.applications[0].shape, "S2");
  assertEquals(r.applications[0].sentence.includes("Section 7"), true, r.applications[0].sentence);
  assertEquals(r.applications[0].sentence.includes("the governance and related risk-assessment obligations"), true, r.applications[0].sentence);
  // Every verdict value keeps the same result: a Governance hook never sees a passing verdict.
  for (const v of ["passes", "fails", "uncertain"]) {
    const bag = baseStates({ verdicts: { ...baseStates().verdicts, [ADMT_GOVERNANCE_FACTOR_ID]: v } });
    const rr = applyAdmtHooks([hook], bag, bag.verdicts, ["row-test"], new Set());
    if (v === "passes") assertEquals(rr.flags, [{ hook_id: "test/governance-s2", reason: "rule_missing" }], "an explicit passing verdict, if one ever existed, would engage the lawyer's rule exactly like any other factor");
    else assertEquals(rr.applications.map((x) => x.shape), ["S2"], v);
  }
});

Deno.test("doc241 integration — a Governance hook application, spliced via ADMT_SECTION_ID_FOR_ELEMENT, lands in the assembled document's '7. Governance…' section and nowhere else", () => {
  const intake: Record<string, unknown> = {
    organization_name: "Test Co",
    system_name: "Test Hiring Screener",
    system_type: "ML classifier",
    system_description: "Scores job applicants for interview eligibility.",
    decision_domains: ["Hiring or admission decisions"],
    human_review: "No — fully automated, no human review",
    training_data_use: "Yes",
    profiling_use: "Yes",
    notice_delivery: ["Separate standalone Pre-use Notice"],
    notice_has_specific_purpose: "Yes",
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
  };
  const computed = computeAdmtV2(intake as any);
  const hook = makeHook({ hook_id: "test/governance-splice", factor_id: ADMT_GOVERNANCE_FACTOR_ID, bears_on_element: ADMT_GOVERNANCE_FACTOR_ID });
  const states = baseStates();
  const { applications } = applyAdmtHooks([hook], states, states.verdicts, ["row-test"], new Set());
  assertEquals(applications.length, 1);

  const sectionId = ADMT_SECTION_ID_FOR_ELEMENT[hook.bears_on_element];
  assertEquals(sectionId, "governance");
  const doc = assembleAdmtV2Document({
    intake, computed, exhibit: null, organizationName: "Test Co", systemName: "Test Hiring Screener",
    admtV3Append: { [sectionId]: [applications[0].sentence] },
  });
  const governance = doc.sections.find((s) => s.id === "governance");
  assertEquals(governance !== undefined, true, "Section 7 must render");
  assertEquals(governance!.title, "7. Governance, Record Sufficiency, and Related Risk-Assessment Obligations");
  const last = governance!.paragraphs[governance!.paragraphs.length - 1];
  assertEquals(last.kind, "generated");
  assertEquals(last.text, applications[0].sentence);
  for (const other of doc.sections.filter((s) => s.id !== "governance")) {
    assertEquals(other.paragraphs.some((p) => p.text === applications[0].sentence), false, `leaked into section "${other.id}"`);
  }
  // The Section 7 S4 attachment point exists but attaches nothing today (no
  // Governance CAM row, no ratified frame): the section is byte-identical to a
  // no-append render apart from the spliced sentence.
  const bare = assembleAdmtV2Document({ intake, computed, exhibit: null, organizationName: "Test Co", systemName: "Test Hiring Screener" });
  const bareGov = bare.sections.find((s) => s.id === "governance")!;
  assertEquals(JSON.stringify(governance!.paragraphs.slice(0, -1)), JSON.stringify(bareGov.paragraphs));
  assertEquals(bareGov.paragraphs.some((p) => p.text.startsWith("Regulatory Interpretation —")), false);
});

// ── The planner ────────────────────────────────────────────────────────────

Deno.test("planAdmtHookSelection — skips a determinative, non-nominated, or already-settled hook; plans an unknown-agreement hook with a usable answer", () => {
  const determinative = makeHook({ hook_id: "test/plan-determinative", source_row_id: "row-det" });
  const notNominated = makeHook({ hook_id: "test/plan-not-nominated", required_atoms: ["class:housing"] });
  const unknownHook = makeHook({ hook_id: "test/plan-unknown", fact_atoms: ["class:hiring_admission", "flag:no_human_review"] });
  const states = baseStates();
  const record = { system_description: "This system scores applicants for a hiring decision using a machine-learned model." };
  const plan = planAdmtHookSelection(
    [determinative, notNominated, unknownHook],
    states, states.verdicts, ["row-det", "row-test"], new Set(["row-det"]), record,
  );
  const byId = new Map(plan.considered.map((c) => [c.hook_id, c] as const));
  assertEquals(byId.get("test/plan-determinative")?.skipped_by, "determinative");
  assertEquals(byId.get("test/plan-not-nominated")?.skipped_by, "not_nominated");
  assertEquals(byId.get("test/plan-unknown")?.status, "called");
  assertEquals(plan.items.length > 0, true);
  assertEquals(plan.items[0].candidates.some((c) => c.hook_id === "test/plan-unknown"), true);
});

Deno.test("planAdmtHookSelection — skips an unknown-agreement hook with no usable answer (unanswered)", () => {
  const unknownHook = makeHook({ hook_id: "test/plan-unanswered", fact_atoms: ["class:hiring_admission", "flag:no_human_review"] });
  const states = baseStates();
  const plan = planAdmtHookSelection([unknownHook], states, states.verdicts, ["row-test"], new Set(), {});
  assertEquals(plan.considered, [{ hook_id: "test/plan-unanswered", status: "skipped", skipped_by: "unanswered" }]);
  assertEquals(plan.items, []);
});

Deno.test("planAdmtHookSelection — a hook outside the ranked set is skipped (cap); the pre-filter skips a hook that could never print either way", () => {
  const outsideRank = makeHook({ hook_id: "test/plan-cap", source_row_id: "row-unranked", fact_atoms: ["class:hiring_admission", "flag:no_human_review"] });
  const states = baseStates();
  const record = { system_description: "A sufficiently long description of the decision process for this fixture." };
  const plan = planAdmtHookSelection([outsideRank], states, states.verdicts, [], new Set(), record);
  assertEquals(plan.considered, [{ hook_id: "test/plan-cap", status: "skipped", skipped_by: "cap" }]);

  // A `posture: "contested"` hook whose `settledness` is NOT "R4" matches no
  // matrix row at all (hook-types.ts's directionFor: contested without R4
  // falls through to `omit` for EVERY fact agreement, `same` included —
  // the one combination where neither answer could ever print) — the
  // pre-filter must catch this before any call is planned.
  const mismatchedHook = makeHook({
    hook_id: "test/plan-prefilter", posture: "contested", settledness: "R1", source_row_id: "row-contested",
    fact_atoms: ["class:hiring_admission", "flag:no_human_review"],
  });
  const plan2 = planAdmtHookSelection([mismatchedHook], states, states.verdicts, ["row-contested"], new Set(), record);
  assertEquals(plan2.considered, [{ hook_id: "test/plan-prefilter", status: "skipped", skipped_by: "prefilter" }]);
});

// ── The resolver ───────────────────────────────────────────────────────────

Deno.test("resolveHookSelections — agrees on a single settled row; unsettled on a legs-disagreed row with no settled field; conflicting settled fields become unsettled", () => {
  const rows: HookSelectionRow[] = [
    { field_id: "system_description", hook_id: "h1", agreement: "same", matched_atom: "class:hiring_admission", evidence_span: "hiring decision", decision_id: "d1", legs_disagreed: false, source: "model" },
    { field_id: "system_description", hook_id: "h2", agreement: "unknown", matched_atom: null, evidence_span: null, decision_id: "d2", legs_disagreed: true, source: "model" },
    { field_id: "system_description", hook_id: "h3", agreement: "same", matched_atom: "class:hiring_admission", evidence_span: "a", decision_id: "d3a", legs_disagreed: false, source: "model" },
    { field_id: "access_logic_disclosure", hook_id: "h3", agreement: "different", matched_atom: "flag:no_human_review", evidence_span: "b", decision_id: "d3b", legs_disagreed: false, source: "model" },
  ];
  const resolved = resolveHookSelections(rows);
  assertEquals(resolved.selections.get("h1")?.agreement, "same");
  assertEquals(resolved.unsettled.has("h2"), true);
  assertEquals(resolved.selections.has("h3"), false);
  assertEquals(resolved.unsettled.has("h3"), true);
  assertEquals(resolved.conflicts, ["h3"]);
});

// ── A zero-hook / empty-corpus call is a true no-op ───────────────────────

Deno.test("applyAdmtHooks — a call against an empty corpus is a true no-op", () => {
  const states = baseStates();
  const r = applyAdmtHooks([], states, states.verdicts, [], new Set());
  assertEquals(r, { applications: [], flags: [] });
});

// ── Integration: a rendered application's sentence actually lands in the
// right section of a real assembled document ─────────────────────────────

Deno.test("integration — a hook application's sentence, spliced via admtV3Append, appears verbatim in the correct section's paragraphs and nowhere else", () => {
  const intake: Record<string, unknown> = {
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
  };
  const computed = computeAdmtV2(intake as any);
  const hook = makeHook({ hook_id: "test/integration-splice" });
  const states = baseStates();
  const { applications } = applyAdmtHooks([hook], states, states.verdicts, ["row-test"], new Set());
  assertEquals(applications.length, 1);

  const admtV3Append = { [ADMT_SECTION_ID_FOR_ELEMENT[hook.bears_on_element]]: [applications[0].sentence] };
  const doc = assembleAdmtV2Document({
    intake, computed, exhibit: null, organizationName: "Test Co", systemName: "Test Hiring Screener", admtV3Append,
  });

  const accessSection = doc.sections.find((s) => s.id === "access");
  assertEquals(accessSection !== undefined, true);
  const matches = accessSection!.paragraphs.filter((p) => p.text === applications[0].sentence);
  assertEquals(matches.length, 1);
  assertEquals(matches[0].kind, "generated");

  // The sentence never leaks into an unrelated section.
  for (const other of doc.sections.filter((s) => s.id !== "access")) {
    assertEquals(other.paragraphs.some((p) => p.text === applications[0].sentence), false, `leaked into section "${other.id}"`);
  }
});

// ── BATCH 66b383d8 (2026-09-10) — an out-of-scope document renders §§3-6 as
// not-reached stubs under their real ids, so an id lookup alone would splice a
// hook sentence directly beneath "Not reached." (the Fortivex ADMT report
// printed a full human-appeal-exception analysis in a Section 4 it had just
// declared not assessed). Duty-section appends are dropped out of scope;
// applicability/governance appends still land. ────────────────────────────

Deno.test("batch 66b383d8 — out of scope, a hook sentence aimed at a duty section (optout) is dropped even though the not-reached stub carries that id; a governance append still lands", () => {
  const intake: Record<string, unknown> = {
    organization_name: "Test Co", system_name: "Test System", system_type: "ML classifier",
    system_description: "An advertising-only system.",
    decision_domains: [],
    admt_detail: { solely_advertising: "Yes — solely advertising" },
  };
  const computed = computeAdmtV2(intake as any);
  assertEquals(computed.scope.scopeState, "OUT_OF_SCOPE", "fixture must be out of scope for this pin to mean anything");

  const bare = assembleAdmtV2Document({ intake, computed, exhibit: null, organizationName: "Test Co", systemName: "Test System" });
  const stub = bare.sections.find((s) => s.id === "optout");
  assertEquals(stub !== undefined, true, "the not-reached stub renders under the real 'optout' id — that is the hazard");
  assertEquals(stub!.paragraphs.length, 1);
  // DOC 257 (2026-09-11): the optout stub is the second not-reached stub and
  // refers back to Section 3 ("Not reached, for the reason stated …").
  assertEquals(/^Not reached[.,]/.test(stub!.paragraphs[0].text), true);

  const dutySentence = "The company relies on the human-appeal exception — this must not print under Not reached.";
  const govSentence = "A governance sentence that is still welcome out of scope.";
  const doc = assembleAdmtV2Document({
    intake, computed, exhibit: null, organizationName: "Test Co", systemName: "Test System",
    admtV3Append: { optout: [dutySentence], notice: [dutySentence], access: [dutySentence], vendor: [dutySentence], governance: [govSentence] },
  });
  assertEquals(doc.sections.length, bare.sections.length);
  for (const section of doc.sections) {
    assertEquals(section.paragraphs.some((p) => p.text === dutySentence), false, `duty sentence leaked into section "${section.id}"`);
  }
  const optout = doc.sections.find((s) => s.id === "optout")!;
  assertEquals(JSON.stringify(optout.paragraphs), JSON.stringify(stub!.paragraphs), "the stub is byte-identical to the no-append render");
  const governance = doc.sections.find((s) => s.id === "governance")!;
  assertEquals(governance.paragraphs.some((p) => p.kind === "generated" && p.text === govSentence), true, "governance still takes its sentence out of scope");
});

Deno.test("integration — appending to a section id that does not exist on this generation's document is skipped silently (never an error, never a fabricated section)", () => {
  const intake: Record<string, unknown> = {
    organization_name: "Test Co", system_name: "Test System", system_type: "ML classifier",
    system_description: "An advertising-only system.",
    decision_domains: [],
    admt_detail: { solely_advertising: "Yes — solely advertising" },
  };
  const computed = computeAdmtV2(intake as any);
  const sectionCountBefore = assembleAdmtV2Document({
    intake, computed, exhibit: null, organizationName: "Test Co", systemName: "Test System",
  }).sections.length;
  // "not_a_real_section" never matches any admt-v2-assemble.ts section id —
  // appending to it must not throw, and must not create a new section.
  const doc = assembleAdmtV2Document({
    intake, computed, exhibit: null, organizationName: "Test Co", systemName: "Test System",
    admtV3Append: { not_a_real_section: ["a sentence that must not appear anywhere"] },
  });
  assertEquals(doc.sections.length, sectionCountBefore);
  for (const section of doc.sections) {
    assertEquals(section.paragraphs.some((p) => p.text === "a sentence that must not appear anywhere"), false);
  }
});
