// DOC 213 — generate-corpus-hooks: draft verification, critique verification,
// the settle invariant, and generation exclusion — as amended by DOC 222
// (hooks contract v2, 2026-09-08). Pure modules only; nothing here calls a
// live model API.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hookRegistryFor } from "../../../supabase/functions/generate-corpus-hooks/_local/product-registry.ts";
import { checkAtom } from "../../../supabase/functions/generate-corpus-hooks/_local/vocabulary.ts";
import {
  clauseFormErrors,
  droppedQualifiers,
  parseDraftPayload,
  pinpointErrors,
  refusedForConsultationDraft,
  settleDecision,
  settlednessFor,
  verifyCritique,
  verifyDraft,
  type DraftPayload,
} from "../../../supabase/functions/generate-corpus-hooks/_local/verify.ts";
import {
  citationFor,
  deriveSourceStatus,
  generateHooks,
  shortLabelFor,
  type HookProfileRow,
  type HookRow,
  type HookSourceRow,
} from "../../../supabase/functions/generate-corpus-hooks/_local/generate.ts";
import { liaElementOf } from "../../../supabase/functions/generate-corpus-hooks/_local/factor-element.ts";
import { draftSchema, type ProfileForHook } from "../../../supabase/functions/generate-corpus-hooks/_local/prompts.ts";
import { LIA_ATOM_CONCEPTS as GENERATOR_CONCEPTS } from "../../../supabase/functions/generate-corpus-hooks/_local/concepts.ts";
import { LIA_ATOM_CONCEPTS as CANONICAL_CONCEPTS } from "../../../supabase/functions/run-li-assessment/_local/corpus/maps/lia-hooks.ts";

const REGISTRY = hookRegistryFor("lia")!;
const PROFILE_A = "11111111-1111-4111-8111-111111111111";
const QUOTE = "The controller may not rely on legitimate interests where the processing is intrusive.";
/** A source excerpt with numbered paragraphs, so a paragraph pinpoint can anchor. */
const EXCERPT = `11. Preamble about the balancing test.\n12. ${QUOTE}\n13. Some trailing text.`;

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
    material_facts: [
      { atom: "class:direct_marketing", materiality_reason: "the processing at issue", source_span: "the processing is intrusive" },
      { atom: "relationship:customer", materiality_reason: "the controller's relationship", source_span: "The controller" },
    ],
    distinguishing_pairs: [{
      source_fact_span: "processing is intrusive", source_polarity: "present",
      record_atom: "flag:children", record_polarity: "present",
      why_material: "children change the balancing", source_expressly_excludes: false,
      exclusion_span: null, exclusion_paraphrase: null,
    }],
    fact_atoms: ["class:direct_marketing", "relationship:customer"],
    distinguishing_atoms: ["flag:children"],
    not_distinguishable: false,
    required_atoms: [],
    finding_span: "may not rely on legitimate interests",
    fact_pattern_paraphrase: "marketing to existing customers using behavioural profiles",
    finding_paraphrase: "legitimate interests may not be relied on where the processing is intrusive",
    trigger_terms: ["profiling", "marketing"],
    abstain_reason: "none",
    recognised_proposition: null,
    recognised_span: null,
    condition_text: null,
    condition_span: null,
    condition_atoms: null,
    pinpoint: { kind: "paragraph", ref: "12", anchor_span: "may not rely on legitimate interests" },
    ...over,
  };
}

// ── Draft verification ──────────────────────────────────────────────────────

Deno.test("draft: a well-formed v2 draft passes every gate with no errors", () => {
  const v = verifyDraft(draft(), profile(), EXCERPT, REGISTRY);
  assertEquals(v.errors, []);
  assertEquals(v.warnings, []);
  assertEquals(v.hook_status, "drafted");
  assert(v.vocabulary_checks_passed);
  assert(v.substring_checks_passed);
});

Deno.test("draft: an atom outside the closed vocabulary fails vocabulary checks", () => {
  const v = verifyDraft(draft({ fact_atoms: ["class:mind_reading"] }), profile(), EXCERPT, REGISTRY);
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
  const v = verifyDraft(draft({ finding_span: "the controller must obtain consent" }), profile(), EXCERPT, REGISTRY);
  assertEquals(v.substring_checks_passed, false);
});

Deno.test("draft: a human-curated profile may anchor the span in the source excerpt", () => {
  const excerpt = "Preamble. the controller must obtain consent in these circumstances.";
  const v = verifyDraft(
    draft({
      finding_span: "the controller must obtain consent",
      finding_paraphrase: "consent was required in these circumstances",
      material_facts: [{ atom: "class:direct_marketing", materiality_reason: "r", source_span: "the controller" }],
      distinguishing_pairs: [],
      distinguishing_atoms: [],
      pinpoint: { kind: "section", ref: "Preamble", anchor_span: "must obtain consent" },
    }),
    profile({ pipeline_stage: "human" }),
    excerpt,
    REGISTRY,
  );
  assertEquals(v.errors, []);
  assert(v.substring_checks_passed);
});

Deno.test("draft: a paraphrase must be LESS THAN 60 words — 59 passes, 60 is refused, no soft target (CEO 2026-09-08); brackets are an error", () => {
  const w59 = Array.from({ length: 59 }, (_, i) => `word${i}`).join(" ");
  const w60 = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
  const v = verifyDraft(draft({ fact_pattern_paraphrase: w59, finding_paraphrase: "a [bracketed] finding" }), profile(), EXCERPT, REGISTRY);
  assertEquals(v.warnings, []);
  assert(!v.errors.some((e) => e.includes("words")));
  assert(v.errors.some((e) => e.includes("contains a bracket")));
  const hard = verifyDraft(draft({ fact_pattern_paraphrase: w60 }), profile(), EXCERPT, REGISTRY);
  assert(hard.errors.some((e) => e.includes("must be less than 60 words (has 60)")));
});

Deno.test("draft: clause form — sentence case, internal period, ellipsis, quotation marks", () => {
  assert(clauseFormErrors("x", "Marketing to customers").errors.some((e) => e.includes("upper-case")));
  assertEquals(clauseFormErrors("x", "EDPB guidance on marketing").errors, []);
  assertEquals(clauseFormErrors("x", "Article 6(1)(f) may be relied on").errors, []);
  assert(clauseFormErrors("x", "marketing was intrusive. Consent was required").errors.some((e) => e.includes("internal period")));
  assert(clauseFormErrors("x", "marketing was intrusive.").errors.some((e) => e.includes("ends with punctuation")));
  assert(clauseFormErrors("x", "marketing … was intrusive").errors.some((e) => e.includes("ellipsis")));
  assert(clauseFormErrors("x", 'the "intrusive" processing').errors.some((e) => e.includes("quotation")));
  assertEquals(clauseFormErrors("x", "processing under Art. 6(1)(f) could be lawful").errors, []);
});

Deno.test("draft: a paraphrase that drops a qualifier in its span is rejected (doc 222 §2.6 rule 3)", () => {
  assertEquals(droppedQualifiers("may not rely on legitimate interests", "legitimate interests may not be relied on"), []);
  assertEquals(droppedQualifiers("could only be lawful where strictly necessary", "was lawful where necessary"), ["could", "only", "strictly"]);
  assertEquals(droppedQualifiers("only where the data is public", "where the data is public"), ["only where"]);
  const v = verifyDraft(draft({ finding_paraphrase: "legitimate interests cannot be relied on where the processing is intrusive" }), profile(), EXCERPT, REGISTRY);
  assert(v.errors.some((e) => e.includes('drops the qualifier "may"')));
});

Deno.test("draft: two material facts naming one concept are rejected; an instrument atom is never a fact", () => {
  const dup = verifyDraft(draft({
    material_facts: [
      { atom: "flag:special_category", materiality_reason: "r", source_span: "The controller" },
      { atom: "data_category:Special category data", materiality_reason: "r", source_span: "The controller" },
    ],
  }), profile(), EXCERPT, REGISTRY);
  assert(dup.errors.some((e) => e.includes("name the same fact")));
  const inst = verifyDraft(draft({
    material_facts: [{ atom: "instrument:EU GDPR", materiality_reason: "r", source_span: "The controller" }],
  }), profile(), EXCERPT, REGISTRY);
  assert(inst.errors.some((e) => e.includes("scope filter, not a fact")));
});

Deno.test("draft: a state: material fact needs no source span; a non-state fact does", () => {
  const ok = verifyDraft(draft({
    material_facts: [{ atom: "state:intake.balancing_details.opt_out_available=No opt-out is available", materiality_reason: "r", source_span: null }],
  }), profile(), EXCERPT, REGISTRY);
  assert(!ok.errors.some((e) => e.includes("source_span")));
  const bad = verifyDraft(draft({
    material_facts: [{ atom: "class:direct_marketing", materiality_reason: "r", source_span: "words not in the source" }],
  }), profile(), EXCERPT, REGISTRY);
  assert(bad.errors.some((e) => e.includes("no verbatim source_span")));
  assertEquals(bad.substring_checks_passed, false);
});

Deno.test("draft: 'expressly excludes' needs a verbatim exclusion span and a clause paraphrase", () => {
  const v = verifyDraft(draft({
    distinguishing_pairs: [{
      source_fact_span: "processing is intrusive", source_polarity: "present",
      record_atom: "flag:children", record_polarity: "present", why_material: "w",
      source_expressly_excludes: true, exclusion_span: "not in the source", exclusion_paraphrase: null,
    }],
  }), profile(), EXCERPT, REGISTRY);
  assert(v.errors.some((e) => e.includes("without a verbatim exclusion_span")));
  assert(v.errors.some((e) => e.includes("without an exclusion_paraphrase")));
});

Deno.test("draft: a conditional source must carry the proposition split with verbatim spans (doc 222 §2.1)", () => {
  const missing = verifyDraft(draft(), profile({ outcome_posture: "conditional" }), EXCERPT, REGISTRY);
  assert(missing.errors.some((e) => e.includes("without recognised_proposition")));
  const ok = verifyDraft(draft({
    recognised_proposition: "legitimate interests may be relied on",
    recognised_span: "may not rely on legitimate interests",
    condition_text: "the processing is not intrusive",
    condition_span: "the processing is intrusive",
    condition_atoms: ["flag:children"],
  }), profile({ outcome_posture: "conditional" }), EXCERPT, REGISTRY);
  assertEquals(ok.errors, []);
  const verdictAtom = verifyDraft(draft({
    recognised_proposition: "legitimate interests may be relied on", recognised_span: "may not rely on legitimate interests",
    condition_text: "the processing is not intrusive", condition_span: "the processing is intrusive",
    condition_atoms: ["verdict:balancing=pass"],
  }), profile({ outcome_posture: "conditional" }), EXCERPT, REGISTRY);
  assert(verdictAtom.errors.some((e) => e.includes("is a verdict, not a fact")));
});

Deno.test("draft: the pinpoint is verified against the source — anchor verbatim, marker in the window (doc 222 §2.5)", () => {
  assertEquals(pinpointErrors({ kind: "paragraph", ref: "12", anchor_span: "may not rely" }, EXCERPT), []);
  assert(pinpointErrors({ kind: "paragraph", ref: "99", anchor_span: "may not rely" }, EXCERPT)[0].includes("marker"));
  assert(pinpointErrors({ kind: "paragraph", ref: "12", anchor_span: "not in the text" }, EXCERPT)[0].includes("verbatim"));
  assert(pinpointErrors(null, EXCERPT)[0].includes("missing"));
  assertEquals(pinpointErrors({ kind: "section", ref: "Preamble", anchor_span: "trailing text" }, EXCERPT), []);
  const v = verifyDraft(draft({ pinpoint: null }), profile(), EXCERPT, REGISTRY);
  assert(v.errors.some((e) => e.includes("pinpoint missing")));
  const abstained = verifyDraft(draft({ pinpoint: null, abstain_reason: "pinpoint_unlocatable" }), profile(), EXCERPT, REGISTRY);
  assert(!abstained.errors.some((e) => e.includes("pinpoint missing")));
  assertEquals(abstained.hook_status, "contested");
  assertEquals(abstained.contested_reason, "pinpoint_unlocatable");
});

Deno.test("draft: an abstention lands as contested with the reason", () => {
  const v = verifyDraft(draft({ abstain_reason: "quote_states_no_finding" }), profile(), EXCERPT, REGISTRY);
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

Deno.test("draft: a payload for the wrong profile is rejected; a v2 payload round-trips with derived atoms", () => {
  const parsed = parseDraftPayload(JSON.stringify({ ...draft(), profile_id: "other" }), PROFILE_A);
  assertEquals(parsed.ok, false);
  const { fact_atoms: _f, distinguishing_atoms: _d, ...wire } = draft();
  const ok = parseDraftPayload(JSON.stringify(wire), PROFILE_A);
  assert(ok.ok);
  if (ok.ok) {
    assertEquals(ok.draft.fact_atoms, ["class:direct_marketing", "relationship:customer"]);
    assertEquals(ok.draft.distinguishing_atoms, ["flag:children"]);
    assertEquals(ok.draft.pinpoint?.ref, "12");
  }
});

// ── DOC 223 — the atom-overlap defect (seven of ten LIA hooks, 2026-09-08) ──

const PAIR_BASE = {
  source_fact_span: "processing is intrusive", source_polarity: "present" as const,
  why_material: "w", source_expressly_excludes: false, exclusion_span: null, exclusion_paraphrase: null,
};

Deno.test("draft (doc 223): only present-polarity pairs project into distinguishing_atoms; an absent-polarity pair distinguishes through the pair alone", () => {
  const { fact_atoms: _f, distinguishing_atoms: _d, ...wire } = draft({
    distinguishing_pairs: [
      { ...PAIR_BASE, record_atom: "flag:children", record_polarity: "present" },
      { ...PAIR_BASE, record_atom: "flag:large_scale", record_polarity: "absent" },
    ],
  });
  const ok = parseDraftPayload(JSON.stringify(wire), PROFILE_A);
  assert(ok.ok);
  if (ok.ok) {
    assertEquals(ok.draft.distinguishing_atoms, ["flag:children"]);
    assertEquals(verifyDraft(ok.draft, profile(), EXCERPT, REGISTRY).errors, []);
  }
});

Deno.test("draft (doc 223): a pair on a required atom is rejected — it holds on every nominated record and can never distinguish, whatever its polarity", () => {
  const present = verifyDraft(draft({ required_atoms: ["flag:children"] }), profile(), EXCERPT, REGISTRY);
  assert(present.errors.some((e) => e.includes("is a required atom")), present.errors.join(" | "));
  const absent = verifyDraft(draft({
    required_atoms: ["flag:children"],
    distinguishing_pairs: [{ ...PAIR_BASE, record_atom: "flag:children", record_polarity: "absent" }],
    distinguishing_atoms: [],
  }), profile(), EXCERPT, REGISTRY);
  assert(absent.errors.some((e) => e.includes("is a required atom")), absent.errors.join(" | "));
});

Deno.test("draft (doc 223): a present-polarity pair on a material fact is rejected; an absent-polarity pair on one ('the record lacks the fact') passes", () => {
  const present = verifyDraft(draft({
    distinguishing_pairs: [{ ...PAIR_BASE, record_atom: "class:direct_marketing", record_polarity: "present" }],
    distinguishing_atoms: ["class:direct_marketing"],
  }), profile(), EXCERPT, REGISTRY);
  assert(present.errors.some((e) => e.includes("names the material fact")), present.errors.join(" | "));
  const absent = verifyDraft(draft({
    distinguishing_pairs: [{ ...PAIR_BASE, record_atom: "class:direct_marketing", record_polarity: "absent" }],
    distinguishing_atoms: [],
  }), profile(), EXCERPT, REGISTRY);
  assertEquals(absent.errors, []);
});

Deno.test("draft (doc 223): distinguishing_atoms must be exactly the present-polarity projection of the pairs", () => {
  const stale = verifyDraft(draft({ distinguishing_atoms: ["flag:children", "class:direct_marketing"] }), profile(), EXCERPT, REGISTRY);
  assert(stale.errors.some((e) => e.includes("not the present-polarity projection")), stale.errors.join(" | "));
});

Deno.test("schema: the v2 draft schema requires every doc 222 field", () => {
  const schema = draftSchema(PROFILE_A) as { required: string[]; properties: Record<string, unknown> };
  for (const k of ["material_facts", "distinguishing_pairs", "recognised_proposition", "recognised_span", "condition_text", "condition_span", "condition_atoms", "pinpoint"]) {
    assert(schema.required.includes(k), `schema requires ${k}`);
  }
  assert(!("fact_atoms" in schema.properties), "fact_atoms is derived, not drafted");
  const abstain = (schema.properties.abstain_reason as { enum: string[] }).enum;
  assert(abstain.includes("pinpoint_unlocatable"));
});

Deno.test("concepts: the generator's concept table is byte-equal to the canonical LIA table", () => {
  assertEquals(GENERATOR_CONCEPTS, CANONICAL_CONCEPTS);
});

// ── Critique verification ───────────────────────────────────────────────────

const CRIT_EXCERPT = `Some preamble. ${QUOTE} Some trailing text.`;

Deno.test("critique: an unknown code is discarded", () => {
  const raw = JSON.stringify({
    hook_id: "hook-1", verdict: "objections",
    objections: [{ code: "invented_code", target: "finding_span", index: null, source_span: null, severity: "block" }],
  });
  const result = verifyCritique(raw, "hook-1", CRIT_EXCERPT);
  assertEquals(result.objections, []);
  assertEquals(result.verdict, "no_objection");
  assert(result.discarded[0].includes("unknown code"));
});

Deno.test("critique: a source_span not present in the excerpt discards the objection", () => {
  const raw = JSON.stringify({
    hook_id: "hook-1", verdict: "objections",
    objections: [
      { code: "fact_atom_not_in_source", target: "material_facts", index: 0, source_span: "text that is not there", severity: "block" },
      { code: "trigger_term_overbroad", target: "trigger_terms", index: 1, source_span: QUOTE, severity: "warn" },
    ],
  });
  const result = verifyCritique(raw, "hook-1", CRIT_EXCERPT);
  assertEquals(result.objections.length, 1);
  assertEquals(result.objections[0].code, "trigger_term_overbroad");
});

Deno.test("critique: the v2 codes and targets are accepted", () => {
  const raw = JSON.stringify({
    hook_id: "hook-1", verdict: "objections",
    objections: [
      { code: "proposition_broader_than_source", target: "proposition", index: null, source_span: null, severity: "block" },
      { code: "exclusion_overclaim", target: "distinguishing_pairs", index: 0, source_span: null, severity: "block" },
      { code: "pinpoint_wrong", target: "pinpoint", index: null, source_span: null, severity: "warn" },
    ],
  });
  const result = verifyCritique(raw, "hook-1", CRIT_EXCERPT);
  assertEquals(result.objections.length, 3);
  assertEquals(result.discarded, []);
});

Deno.test("critique: a proposed hook in the body is ignored, not honoured", () => {
  const raw = JSON.stringify({ hook_id: "hook-1", verdict: "no_objection", objections: [], fact_atoms: ["class:fraud_prevention"] });
  const result = verifyCritique(raw, "hook-1", CRIT_EXCERPT);
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
  pinpoint_present: true,
  proposition_split_present: false,
  verification_errors: 0,
};

Deno.test("settle: a clean rejected hook with a distinguishing atom settles", () => {
  assertEquals(settleDecision(SETTLE_BASE).hook_status, "settled");
});

Deno.test("settle: a rejected posture with no distinguishing atom does not settle", () => {
  const decision = settleDecision({ ...SETTLE_BASE, distinguishing_atoms: [], not_distinguishable: false, round: 2 });
  assertEquals(decision.hook_status, "contested");
  assert(decision.reasons.includes("no_distinguishing_atom_on_a_non_accepted_posture"));
});

Deno.test("settle (doc 223): absent-polarity pairs distinguish without projecting into the plain array — pairs with an empty array still settle", () => {
  assertEquals(settleDecision({ ...SETTLE_BASE, distinguishing_atoms: [], distinguishing_pairs: 2 }).hook_status, "settled");
  assertEquals(settleDecision({ ...SETTLE_BASE, distinguishing_atoms: [], distinguishing_pairs: 0, round: 2 }).hook_status, "contested");
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

Deno.test("settle: doc 222 gates — pinpoint, proposition split, outstanding verification errors", () => {
  const noPin = settleDecision({ ...SETTLE_BASE, pinpoint_present: false, round: 2 });
  assertEquals(noPin.hook_status, "contested");
  assert(noPin.reasons.includes("pinpoint_missing"));
  const noSplit = settleDecision({ ...SETTLE_BASE, outcome_posture: "conditional", round: 2 });
  assert(noSplit.reasons.includes("proposition_split_missing"));
  assertEquals(settleDecision({ ...SETTLE_BASE, outcome_posture: "conditional", proposition_split_present: true }).hook_status, "settled");
  const errs = settleDecision({ ...SETTLE_BASE, verification_errors: 2, round: 2 });
  assert(errs.reasons.includes("verification_errors_outstanding"));
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

const F_BALANCING = "Balancing of interests, rights and freedoms";

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

function sourceRow(over: Partial<HookSourceRow> = {}): HookSourceRow {
  return {
    source_table: "edpb_guidelines", title: "Guidelines 8/2020 on the targeting of social media users",
    adopted_date: "2021-04-13", source_url: "https://edpb.europa.eu/x", status: "final", ...over,
  };
}

function run(rows: HookRow[], profiles: HookProfileRow[], sources?: Map<string, HookSourceRow>) {
  return generateHooks({
    product: "lia", rows,
    profiles: new Map(profiles.map((p) => [p.id, p])),
    sources: sources ?? new Map(profiles.map((p) => [p.id, sourceRow({ source_table: p.source_table })])),
    elementOf: liaElementOf,
    hooksVersion: "lia-hooks-v2-2026-09-08-0",
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

// ── Doc 213 second pass (A) + doc 222: the emitted shape IS the runtime type ─

/** The hooks array as data, parsed back out of the generated file. */
function emittedHooks(contents: string): Record<string, unknown>[] {
  const m = /LIA_HOOKS: readonly AuthorityHook\[\] = (\[[\s\S]*?\n\]);/.exec(contents);
  if (!m) throw new Error("no LIA_HOOKS array in generated contents");
  return JSON.parse(m[1]);
}

Deno.test("generate: an emitted hook carries exactly AuthorityHook's fields (v1 + doc 222 v2 + doc 238 proposed plumbing) plus relevance", () => {
  const result = run([hookRow()], [profileRow()]);
  assertEquals(result.emitted, 1, JSON.stringify(result.excluded));
  const emitted = emittedHooks(result.contents!)[0] as Record<string, any>;
  assertEquals(Object.keys(emitted).sort(), [
    "authority_label", "bears_on_element", "distinguishing_atoms", "fact_atoms",
    "fact_pattern_paraphrase", "factor_id", "finding_paraphrase", "finding_span",
    "hook_id", "not_distinguishable", "posture", "profile_id", "regulator",
    "relevance", "required_atoms", "settledness", "source_row_id",
    // doc 222 v2
    "authority_label_short", "hook_version", "source_status", "status_label", "verb",
    "appeal_note", "verified_as_of", "pinpoint", "recognised_proposition", "condition_text",
    "condition_atoms", "material_facts", "distinguishing_pairs",
    // doc 238 — PROPOSED shape-amendment plumbing, additive, null unless a
    // curated row sets them (none does yet).
    "governing_provision_sentence", "hedge_variant", "hedge_sentence",
  ].sort());
  assertEquals(emitted.posture, "rejected");
  assertEquals(emitted.source_row_id, "row-1");
  assertEquals(emitted.factor_id, F_BALANCING);
  assertEquals(emitted.bears_on_element, "balancing");
  assertEquals(emitted.relevance.instrument, "EU GDPR");
  assertEquals(emitted.relevance.use_case_class, "direct_marketing");
  assertEquals(emitted.relevance.outcome_posture, "rejected");
  // doc 222: the label carries NO pinpoint; the pinpoint is structured.
  assertEquals(emitted.authority_label, "EDPB, Guidelines 8/2020 on the targeting of social media users");
  assertEquals(emitted.authority_label_short, "EDPB Guidelines 8/2020");
  assertEquals(emitted.regulator, "the EDPB");
  assertEquals(emitted.pinpoint, { kind: "paragraph", ref: "150", anchor_span: "may not rely on legitimate interests" });
  assertEquals(emitted.source_status, "edpb_guidelines_final");
  assertEquals(emitted.verb, "states");
  assertEquals(emitted.status_label, "EDPB Guidelines, adopted 13 April 2021 — interpretive guidance, not binding law");
  assertEquals(emitted.hook_version, 1);
  assertEquals(emitted.material_facts, []);
  assertEquals(emitted.distinguishing_pairs, []);
  // doc 238 — no row sets any of these fields yet, so all three ship null.
  assertEquals(emitted.governing_provision_sentence, null);
  assertEquals(emitted.hedge_variant, null);
  assertEquals(emitted.hedge_sentence, null);
});

Deno.test("generate: a v2 row's own structured pinpoint wins over the curation-note ¶", () => {
  const result = run([hookRow({ pinpoint: { kind: "paragraph", ref: "151", anchor_span: "may not rely" } })], [profileRow()]);
  const emitted = emittedHooks(result.contents!)[0] as Record<string, any>;
  assertEquals(emitted.pinpoint.ref, "151");
});

Deno.test("generate: no pinpoint anywhere excludes the hook by name (doc 222 §2.5)", () => {
  const result = run([hookRow()], [profileRow({ curation_note: "curated, no paragraph recorded" })]);
  assertEquals(result.emitted, 0);
  assert(result.excluded[0].reason.includes("pinpoint missing"));
});

Deno.test("generate: a conditional hook without its proposition split is excluded (doc 222 §2.1)", () => {
  const none = run([hookRow()], [profileRow({ outcome_posture: "conditional" })]);
  assertEquals(none.emitted, 0);
  assert(none.excluded[0].reason.includes("without recognised_proposition"));
  const ok = run(
    [hookRow({ recognised_proposition: "x may be lawful", condition_text: "y holds", condition_atoms: ["flag:children"] })],
    [profileRow({ outcome_posture: "conditional" })],
  );
  assertEquals(ok.emitted, 1);
  const emitted = emittedHooks(ok.contents!)[0] as Record<string, any>;
  assertEquals(emitted.condition_atoms, ["flag:children"]);
});

Deno.test("generate: status derivation — WP29 needs verified_as_of; vacated is never shipped; appeal pending is labelled (doc 222 §2.7)", () => {
  const wp29Source = sourceRow({ title: "Opinion 06/2014 on the notion of legitimate interests", adopted_date: "2014-04-09", source_url: "https://ec.europa.eu/newsroom/article29/items/1" });
  const wp29NoDate = run([hookRow()], [profileRow({ endorsement: "wp29_endorsed_2018" })], new Map([[PROFILE_A, wp29Source]]));
  assertEquals(wp29NoDate.emitted, 0);
  assert(wp29NoDate.excluded[0].reason.includes("verified_as_of"));
  const wp29Ok = run([hookRow({ verified_as_of: "2026-09-08" })], [profileRow({ endorsement: "wp29_endorsed_2018" })], new Map([[PROFILE_A, wp29Source]]));
  assertEquals(wp29Ok.emitted, 1);
  const e = emittedHooks(wp29Ok.contents!)[0] as Record<string, any>;
  assertEquals(e.source_status, "wp29_opinion");
  assertEquals(e.verb, "advised");
  assertEquals(e.authority_label, "Article 29 Working Party, Opinion 06/2014 on the notion of legitimate interests");
  assertEquals(e.authority_label_short, "WP29 Opinion 06/2014");
  assertEquals(e.status_label, "Article 29 Working Party opinion, 9 April 2014 — historical interpretive guidance, endorsed by the EDPB on 25 May 2018; current relevance verified 2026-09-08");

  const enfProfile = profileRow({ source_table: "enforcement_actions", curation_note: "¶20 finding" });
  const enfSource = (appeal: string | null): HookSourceRow => ({ source_table: "enforcement_actions", regulator: "DPC (Ireland)", subject: "LinkedIn", decision_date: "2024-10-22", appeal_status: appeal });
  const vacated = run([hookRow()], [enfProfile], new Map([[PROFILE_A, enfSource("vacated")]]));
  assertEquals(vacated.emitted, 0);
  assert(vacated.excluded[0].reason.includes("vacated"));
  const pending = run([hookRow({ appeal_note: "appeal lodged 2025-01" })], [enfProfile], new Map([[PROFILE_A, enfSource("appeal_pending")]]));
  assertEquals(pending.emitted, 1);
  const p = emittedHooks(pending.contents!)[0] as Record<string, any>;
  assertEquals(p.source_status, "sa_decision_appeal_pending");
  // CEO 2026-09-08: the appeal prints as the fixed sentence in the join; the
  // note is emitted as record data and never composed into the label.
  assertEquals(p.status_label, "under appeal");
  assertEquals(p.appeal_note, "appeal lodged 2025-01");
  assertEquals(p.authority_label_short, "DPC (Ireland), LinkedIn");
  const plain = deriveSourceStatus(enfProfile, enfSource(null), {});
  assert(!("exclude" in plain) && plain.source_status === "sa_decision" && plain.verb === "found");
  const guidance = deriveSourceStatus(
    profileRow({ source_table: "regulatory_guidance" }),
    { source_table: "regulatory_guidance", regulator: "ICO", title: "Legitimate interests guidance" },
    {},
  );
  assert(!("exclude" in guidance) && guidance.source_status === "regulator_guidance" && guidance.status_label === "ICO regulatory guidance — non-binding");
  assertEquals(shortLabelFor(profileRow({ source_table: "regulatory_guidance" }), { source_table: "regulatory_guidance", regulator: "ICO", title: "Legitimate interests guidance" }), "ICO, Legitimate interests guidance");
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

// DOC 238 §7 — the two additive enforcement facts (proposed
// `regulator_english_name`, real `appeal_status`) doc 234's approved Risk
// prose carries in the trailing citation, e.g. "Autoriteit Persoonsgegevens
// (Dutch Data Protection Authority), International Card Services B.V.,
// decision of 15 January 2024, final on appeal". Both are no-ops when
// absent (proven by the unchanged test directly above).

Deno.test("citationFor: enforcement label appends ', final on appeal' when appeal_status is final", () => {
  const cite = citationFor(
    profileRow({ source_table: "enforcement_actions" }),
    { source_table: "enforcement_actions", regulator: "AP", subject: "International Card Services B.V.", decision_date: "2024-01-15", appeal_status: "final" },
  );
  assertEquals(cite?.authority_label, "AP, International Card Services B.V., decision of 15 January 2024, final on appeal");
});

Deno.test("citationFor: enforcement label appends ', affirmed on appeal' when appeal_status is affirmed", () => {
  const cite = citationFor(
    profileRow({ source_table: "enforcement_actions" }),
    { source_table: "enforcement_actions", regulator: "DPC (Ireland)", subject: "LinkedIn", decision_date: "2024-10-22", appeal_status: "affirmed" },
  );
  assertEquals(cite?.authority_label, "DPC (Ireland), LinkedIn, decision of 22 October 2024, affirmed on appeal");
});

Deno.test("citationFor: enforcement label appends no note for appeal_status 'unknown'/'appeal_pending' — those are handled elsewhere (deriveSourceStatus + LIA_APPEAL_SENTENCE)", () => {
  for (const appeal of ["unknown", "appeal_pending", undefined]) {
    const cite = citationFor(
      profileRow({ source_table: "enforcement_actions" }),
      { source_table: "enforcement_actions", regulator: "AP", subject: "ICS", decision_date: "2024-01-15", appeal_status: appeal },
    );
    assertEquals(cite?.authority_label, "AP, ICS, decision of 15 January 2024");
  }
});

Deno.test("citationFor: enforcement label composes the proposed regulator_english_name as a trailing parenthetical (placeholder data — no DB column carries this yet, doc 238 §7)", () => {
  const cite = citationFor(
    profileRow({ source_table: "enforcement_actions" }),
    {
      source_table: "enforcement_actions",
      regulator: "Autoriteit Persoonsgegevens",
      subject: "International Card Services B.V.",
      decision_date: "2024-01-15",
      appeal_status: "final",
      regulator_english_name: "Dutch Data Protection Authority",
    },
  );
  assertEquals(
    cite?.authority_label,
    "Autoriteit Persoonsgegevens (Dutch Data Protection Authority), International Card Services B.V., decision of 15 January 2024, final on appeal",
  );
  // `regulator` itself (the {regulator} slot LIA/DPIA/Risk/ADMT's shapes
  // print inline, e.g. "In {authority}, {regulator} found that…") stays the
  // short form — only authority_label's trailing citation gets the gloss.
  assertEquals(cite?.regulator, "Autoriteit Persoonsgegevens");
});
