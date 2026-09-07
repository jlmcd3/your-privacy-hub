// DOC 213 — generate-corpus-hooks: draft verification, critique verification,
// the settle invariant, and generation exclusion. Pure modules only; nothing
// here calls a live model API.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hookRegistryFor } from "../../../supabase/functions/generate-corpus-hooks/_local/product-registry.ts";
import { checkAtom } from "../../../supabase/functions/generate-corpus-hooks/_local/vocabulary.ts";
import {
  parseDraftPayload,
  refusedForConsultationDraft,
  settleDecision,
  settlednessFor,
  verifyCritique,
  verifyDraft,
  type DraftPayload,
} from "../../../supabase/functions/generate-corpus-hooks/_local/verify.ts";
import {
  citationFor,
  generateHooks,
  type HookProfileRow,
  type HookRow,
  type HookSourceRow,
} from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";
import { liaElementOf } from "../../../supabase/functions/generate-corpus-hooks/_local/factor-element.ts";
import type { ProfileForHook } from "../../../supabase/functions/generate-corpus-hooks/_local/prompts.ts";

const REGISTRY = hookRegistryFor("lia")!;
const PROFILE_A = "11111111-1111-4111-8111-111111111111";
const QUOTE = "The controller may not rely on legitimate interests where the processing is intrusive.";

function profile(over: Partial<ProfileForHook> = {}): ProfileForHook {
  return {
    id: PROFILE_A,
    product: "lia",
    source_table: "edpb_guidelines",
    source_row_id: "row-1",
    extracted_quote: QUOTE,
    outcome_posture: "rejected",
    factor_ids: ["balancing"],
    use_case_class: "direct_marketing",
    flags: [],
    instrument: "EU GDPR",
    curation_note: null,
    pipeline_stage: "stage2_extraction",
    ...over,
  };
}

function draft(over: Partial<DraftPayload> = {}): DraftPayload {
  return {
    profile_id: PROFILE_A,
    fact_atoms: ["class:direct_marketing", "relationship:customer"],
    distinguishing_atoms: ["flag:children"],
    not_distinguishable: false,
    required_atoms: [],
    finding_span: "may not rely on legitimate interests",
    fact_pattern_paraphrase: "Marketing to existing customers using behavioural profiles.",
    finding_paraphrase: "Legitimate interests was unavailable because the processing was intrusive.",
    trigger_terms: ["profiling", "marketing"],
    abstain_reason: "none",
    ...over,
  };
}

// ── Draft verification ──────────────────────────────────────────────────────

Deno.test("draft: a well-formed draft passes both check gates", () => {
  const v = verifyDraft(draft(), profile(), QUOTE, REGISTRY);
  assertEquals(v.errors, []);
  assertEquals(v.hook_status, "drafted");
  assert(v.vocabulary_checks_passed);
  assert(v.substring_checks_passed);
});

Deno.test("draft: an atom outside the closed vocabulary fails vocabulary checks", () => {
  const v = verifyDraft(draft({ fact_atoms: ["class:mind_reading"] }), profile(), QUOTE, REGISTRY);
  assertEquals(v.vocabulary_checks_passed, false);
  assert(v.errors.some((e) => e.includes("unknown class")));
});

Deno.test("draft: a verdict atom is never admitted", () => {
  assertEquals(checkAtom("verdict:balancing=fail", REGISTRY).ok, false);
});

Deno.test("draft: a state atom must use a closed option string verbatim", () => {
  assert(checkAtom('state:intake.balancing_details.opt_out_available=No opt-out is available', REGISTRY).ok);
  assertEquals(checkAtom("state:intake.balancing_details.opt_out_available=maybe", REGISTRY).ok, false);
  assertEquals(checkAtom("state:intake.not_a_real_path=x", REGISTRY).ok, false);
});

Deno.test("draft: a finding_span that is not in the quote fails the substring check", () => {
  const v = verifyDraft(draft({ finding_span: "the controller must obtain consent" }), profile(), QUOTE, REGISTRY);
  assertEquals(v.substring_checks_passed, false);
});

Deno.test("draft: a human-curated profile may anchor the span in the source excerpt", () => {
  const excerpt = "Preamble. the controller must obtain consent in these circumstances.";
  const v = verifyDraft(
    draft({ finding_span: "the controller must obtain consent" }),
    profile({ pipeline_stage: "human" }),
    excerpt,
    REGISTRY,
  );
  assert(v.substring_checks_passed);
});

Deno.test("draft: paraphrase length and brackets are enforced", () => {
  const long = Array.from({ length: 31 }, (_, i) => `word${i}`).join(" ");
  const v = verifyDraft(draft({ fact_pattern_paraphrase: long, finding_paraphrase: "a [bracketed] finding" }), profile(), QUOTE, REGISTRY);
  assert(v.errors.some((e) => e.includes("exceeds 30 words")));
  assert(v.errors.some((e) => e.includes("contains a bracket")));
});

Deno.test("draft: an abstention lands as contested with the reason", () => {
  const v = verifyDraft(draft({ abstain_reason: "quote_states_no_finding" }), profile(), QUOTE, REGISTRY);
  assertEquals(v.hook_status, "contested");
  assertEquals(v.contested_reason, "quote_states_no_finding");
});

Deno.test("draft: a consultation-draft EDPB source is refused outright", () => {
  assert(refusedForConsultationDraft(profile(), "draft_consultation"));
  assertEquals(refusedForConsultationDraft(profile({ source_table: "regulatory_guidance" }), null), false);
});

Deno.test("draft: settledness is derived from the source, not asserted", () => {
  assertEquals(settlednessFor(profile(), "edpb_adopted"), "R1");
  assertEquals(settlednessFor(profile(), "wp29_endorsed_2018"), "R1");
  assertEquals(settlednessFor(profile(), "wp29_not_endorsed"), "R3");
  assertEquals(settlednessFor(profile({ source_table: "regulatory_guidance" }), null), "R1");
  assertEquals(settlednessFor(profile({ source_table: "enforcement_actions" }), null), "R3");
  assertEquals(settlednessFor(profile({ curation_note: "Currently under appeal" }), "edpb_adopted"), "R4");
  assertEquals(settlednessFor(profile({ outcome_posture: "contested" }), "edpb_adopted"), "R4");
});

Deno.test("draft: a payload for the wrong profile is rejected", () => {
  const parsed = parseDraftPayload(JSON.stringify({ ...draft(), profile_id: "other" }), PROFILE_A);
  assertEquals(parsed.ok, false);
});

// ── Critique verification ───────────────────────────────────────────────────

const EXCERPT = `Some preamble. ${QUOTE} Some trailing text.`;

Deno.test("critique: an unknown code is discarded", () => {
  const raw = JSON.stringify({
    hook_id: "hook-1", verdict: "objections",
    objections: [{ code: "invented_code", target: "finding_span", index: null, source_span: null, severity: "block" }],
  });
  const result = verifyCritique(raw, "hook-1", EXCERPT);
  assertEquals(result.objections, []);
  assertEquals(result.verdict, "no_objection");
  assert(result.discarded[0].includes("unknown code"));
});

Deno.test("critique: a source_span not present in the excerpt discards the objection", () => {
  const raw = JSON.stringify({
    hook_id: "hook-1", verdict: "objections",
    objections: [
      { code: "fact_atom_not_in_source", target: "fact_atoms", index: 0, source_span: "text that is not there", severity: "block" },
      { code: "trigger_term_overbroad", target: "trigger_terms", index: 1, source_span: QUOTE, severity: "warn" },
    ],
  });
  const result = verifyCritique(raw, "hook-1", EXCERPT);
  assertEquals(result.objections.length, 1);
  assertEquals(result.objections[0].code, "trigger_term_overbroad");
});

Deno.test("critique: a proposed hook in the body is ignored, not honoured", () => {
  const raw = JSON.stringify({ hook_id: "hook-1", verdict: "no_objection", objections: [], fact_atoms: ["class:fraud_prevention"] });
  const result = verifyCritique(raw, "hook-1", EXCERPT);
  assert(result.ok);
  assertEquals(result.verdict, "no_objection");
  assertEquals(Object.keys(result).includes("fact_atoms"), false);
});

// ── Settle invariant ────────────────────────────────────────────────────────

const SETTLE_BASE = {
  substring_checks_passed: true,
  vocabulary_checks_passed: true,
  objections: [] as { severity: string }[],
  not_distinguishable: false,
  distinguishing_atoms: ["flag:children"],
  outcome_posture: "rejected" as string | null,
  round: 1,
};

Deno.test("settle: a clean rejected hook with a distinguishing atom settles", () => {
  assertEquals(settleDecision(SETTLE_BASE).hook_status, "settled");
});

Deno.test("settle: a rejected posture with no distinguishing atom does not settle", () => {
  const decision = settleDecision({ ...SETTLE_BASE, distinguishing_atoms: [], not_distinguishable: false, round: 2 });
  assertEquals(decision.hook_status, "contested");
  assert(decision.reasons.includes("no_distinguishing_atom_on_a_non_accepted_posture"));
});

Deno.test("settle: an accepted posture needs no distinguishing atom", () => {
  assertEquals(
    settleDecision({ ...SETTLE_BASE, outcome_posture: "accepted", distinguishing_atoms: [] }).hook_status,
    "settled",
  );
});

Deno.test("settle: warn-only objections still settle; a block does not", () => {
  assertEquals(settleDecision({ ...SETTLE_BASE, objections: [{ severity: "warn" }] }).hook_status, "settled");
  assertEquals(settleDecision({ ...SETTLE_BASE, objections: [{ severity: "block" }], round: 2 }).hook_status, "contested");
});

Deno.test("settle: before round 2 a failing hook is left open, not contested", () => {
  assertEquals(settleDecision({ ...SETTLE_BASE, objections: [{ severity: "block" }], round: 1 }).hook_status, null);
});

// ── Generation ──────────────────────────────────────────────────────────────

function hookRow(over: Partial<HookRow> = {}): HookRow {
  return {
    id: "hook-1", profile_id: PROFILE_A, product: "lia", hook_version: 1, hook_status: "ratified",
    fact_atoms: ["class:direct_marketing"], distinguishing_atoms: ["flag:children"],
    not_distinguishable: false, required_atoms: [], finding_span: "may not rely on legitimate interests",
    fact_pattern_paraphrase: "p", finding_paraphrase: "q", trigger_terms: ["marketing"],
    settledness: "R1", ratified_by: "ceo", ratified_at: "2026-09-07T00:00:00Z", ledger_ref: "doc213-1",
    retired_at: null, ...over,
  };
}

function profileRow(over: Partial<HookProfileRow> = {}): HookProfileRow {
  return {
    id: PROFILE_A, source_table: "edpb_guidelines", source_row_id: "row-1", outcome_posture: "rejected",
    instrument: "EU GDPR", factor_ids: [F_BALANCING], endorsement: "edpb_adopted",
    use_case_class: "direct_marketing", relationship: "customer",
    data_categories: ["contact_details"], flags: ["children"],
    curation_note: "EDPB Guidelines 8/2020 ¶150 — curated",
    ratified_by: "ceo", ratified_at: "2026-09-07T00:00:00Z", ledger_ref: "doc213-1", ...over,
  };
}

const F_BALANCING = "Balancing of interests, rights and freedoms";

function sourceRow(over: Partial<HookSourceRow> = {}): HookSourceRow {
  return { source_table: "edpb_guidelines", title: "Guidelines 8/2020 on the targeting of social media users", ...over };
}

function run(rows: HookRow[], profiles: HookProfileRow[], sources?: Map<string, HookSourceRow>) {
  return generateHooks({
    product: "lia", rows,
    profiles: new Map(profiles.map((p) => [p.id, p])),
    sources: sources ?? new Map(profiles.map((p) => [p.id, sourceRow({ source_table: p.source_table })])),
    elementOf: liaElementOf,
    hooksVersion: "lia-hooks-v1-2026-09-07-0",
    outputPath: REGISTRY.output_path,
    exportPrefix: REGISTRY.export_prefix,
    contextBlock: "// placeholder",
  });
}

Deno.test("generate: a ratified hook over a ratified profile is emitted", () => {
  const result = run([hookRow()], [profileRow()]);
  assert(result.ok);
  assertEquals(result.emitted, 1);
  assert(result.contents!.includes("LIA_HOOKS"));
  assert(result.contents!.includes("hook-types.ts"));
});

Deno.test("generate: unratified hook rows are excluded by name", () => {
  const result = run([hookRow({ hook_status: "settled" })], [profileRow()]);
  assertEquals(result.emitted, 0);
  assert(result.excluded[0].reason.includes("not \"ratified\""));
});

Deno.test("generate: an unratified profile excludes the hook", () => {
  const result = run([hookRow()], [profileRow({ ratified_by: null })]);
  assertEquals(result.emitted, 0);
  assert(result.excluded[0].reason.includes("not ratified"));
});

Deno.test("generate: a consultation-draft source is excluded", () => {
  const result = run([hookRow()], [profileRow({ endorsement: "draft_consultation" })]);
  assertEquals(result.emitted, 0);
  assertEquals(result.excluded[0].reason, "primary_source_is_consultation_draft");
});

Deno.test("generate: a retired hook is excluded", () => {
  const result = run([hookRow({ retired_at: "2026-09-01T00:00:00Z" })], [profileRow()]);
  assertEquals(result.emitted, 0);
});

Deno.test("generate: an empty corpus emits a valid, empty file", () => {
  const result = run([], []);
  assert(result.ok);
  assertEquals(result.emitted, 0);
  assert(result.contents!.includes("LIA_HOOKS: readonly AuthorityHook[] = []"));
});

// ── Doc 213 second pass (A): the emitted shape IS the runtime type ─────────

/** The hooks array as data, parsed back out of the generated file. */
function emittedHooks(contents: string): Record<string, unknown>[] {
  const m = /LIA_HOOKS: readonly AuthorityHook\[\] = (\[[\s\S]*?\n\]);/.exec(contents);
  if (!m) throw new Error("no LIA_HOOKS array in generated contents");
  return JSON.parse(m[1]);
}

Deno.test("generate: an emitted hook carries exactly AuthorityHook's fields plus relevance", () => {
  const result = run([hookRow()], [profileRow()]);
  assertEquals(result.emitted, 1);
  const emitted = emittedHooks(result.contents!)[0] as Record<string, any>;
  assertEquals(Object.keys(emitted).sort(), [
    "authority_label", "bears_on_element", "distinguishing_atoms", "fact_atoms",
    "fact_pattern_paraphrase", "factor_id", "finding_paraphrase", "finding_span",
    "hook_id", "not_distinguishable", "posture", "profile_id", "regulator",
    "relevance", "required_atoms", "settledness", "source_row_id",
  ].sort());
  assertEquals(emitted.posture, "rejected");
  assertEquals(emitted.source_row_id, "row-1");
  assertEquals(emitted.factor_id, F_BALANCING);
  assertEquals(emitted.bears_on_element, "balancing");
  assertEquals(emitted.relevance.instrument, "EU GDPR");
  assertEquals(emitted.relevance.use_case_class, "direct_marketing");
  assertEquals(emitted.relevance.outcome_posture, "rejected");
  assertEquals(emitted.authority_label, "Guidelines 8/2020 on the targeting of social media users ¶150");
  assertEquals(emitted.regulator, "EDPB");
});

Deno.test("generate: no factor_ids[0], or an element that does not resolve, excludes by name", () => {
  const none = run([hookRow()], [profileRow({ factor_ids: [] })]);
  assertEquals(none.emitted, 0);
  assert(none.excluded[0].reason.includes("no factor_ids[0]"));
  const gate = run([hookRow()], [profileRow({ factor_ids: ["Special-category and ePrivacy interplay"] })]);
  assertEquals(gate.emitted, 0);
  assert(gate.excluded[0].reason.includes("no three-part-test element"));
});

Deno.test("generate: incomplete citation facts exclude the hook rather than ship a blank", () => {
  const result = run([hookRow()], [profileRow()], new Map([[PROFILE_A, { source_table: "edpb_guidelines", title: null }]]));
  assertEquals(result.emitted, 0);
  assert(result.excluded[0].reason.includes("citation facts incomplete"));
});

Deno.test("generate: a posture outside the hook union excludes the hook", () => {
  const result = run([hookRow()], [profileRow({ outcome_posture: "unknown" })]);
  assertEquals(result.emitted, 0);
  assert(result.excluded[0].reason.includes("not a hook posture"));
});

Deno.test("citationFor: enforcement label is the persuasive section's citation form", () => {
  const cite = citationFor(
    profileRow({ source_table: "enforcement_actions" }),
    { source_table: "enforcement_actions", regulator: "DPC (Ireland)", subject: "LinkedIn", decision_date: "2024-10-22" },
  );
  assertEquals(cite?.authority_label, "DPC (Ireland), LinkedIn, decision of 22 October 2024");
  assertEquals(cite?.regulator, "DPC (Ireland)");
});
