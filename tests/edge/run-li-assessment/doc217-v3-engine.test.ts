// DOC 217 — V3 LIA ENGINE (the B+ pipeline on the deterministic engine),
// build 217B (2026-09-07). Pins §5.1 (the `prop:` atom through the LIA
// adapter), §5.2 (emission from CONFIRMED readings only; both call sites),
// §5.4 (the Schedule of Readings), §5.5 (the method statement), §5.6 (the
// record block's inputs), §5.7 (the assertions; the replay law; the no-
// readings byte-identity law) and §5.8 (the read-back templates and their
// src mirror). Everything runs with LIA_V3_ENABLED frozen false in this
// process (the flag is read once at import — 213A Deviation 5), so the
// engine is exercised through the assembler's `readings`/`v3Enabled`
// options and index.ts is pinned by SOURCE, exactly as doc207-cutover-guards
// and doc213b's call-site test do.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import type { AuthorityRule } from "../../../supabase/functions/_shared/corpus/rule-types.ts";
import type { AuthorityHook } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import { buildLiaEngagementMap } from "../../../supabase/functions/_shared/engagement-map.ts";
import { LIA_PERFECT_PINNED } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia-perfect-pinned.ts";
import { attachLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { attachLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { attachPrecedentClassPosture } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";
import { buildDocumentationTyped, buildThreePartTestTyped } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import { applyLiaRules } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/rule-pass.ts";
import { buildLiaRuleStates } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/rule-states.ts";
import {
  assembleLiaSkeletonDocument,
  deriveScheduleOfReadings,
  LIA_METHOD_STATEMENT,
  LIA_METHOD_STATEMENT_RATIFIED,
  LIA_SCHEDULE_OF_READINGS_COLUMNS,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { buildLiaPersuasiveAuthority } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-persuasive-authority.ts";
import {
  LIA_SCHEDULE_OF_READINGS_LEAD,
  LIA_SKELETON_PARAGRAPHS,
  LIA_SKELETON_SECTIONS,
  LIA_SKELETON_SECTIONS_V2,
} from "../../../supabase/functions/run-li-assessment/_local/prose/plans/lia.spine.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import {
  type ConfirmedReading,
  filterConfirmed,
  parseIntakeReadingRows,
  propsFromReadings,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/v3/readings.ts";
import {
  LIA_V3_FIELD_IDS,
  LIA_V3_FIELDS,
  liaV3Answer,
  liaV3Field,
  liaV3FieldLabel,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/v3/field-labels.ts";
import {
  LIA_GATE_REASON_CODES,
  LIA_READBACK_ACTIONS,
  LIA_READBACK_READING_TEMPLATE,
  LIA_READBACK_REASON_TEMPLATES,
  LIA_READBACK_STOOD_TEMPLATE,
  renderLiaReadbackTemplate,
  renderLiaReasonCode,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/v3/readback-templates.ts";
import { loadIntakeReadings, type ReadingsClientLike } from "../../../supabase/functions/run-li-assessment/_local/ltp/v3/load-readings.ts";
import { LIA_V3_DEFAULT, LIA_V3_ENABLED } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-v3-flag.ts";
import { LIA_V3_INTAKE_FIELDS } from "../../../src/lib/lia/v3Fields.ts";

type Bag = Record<string, unknown>;
const clone = (o: unknown): Bag => JSON.parse(JSON.stringify(o));
/** The pinned EU fixture leaves `why_consent_not_used` blank; every render
 *  in this file uses the SAME clone with a deterministic consent answer (a
 *  217A positive example for `consent.bundled_in_terms`), so the spans the
 *  fixture readings quote are byte-substrings of the record (Law L8). */
const CONSENT_ANSWER =
  "Users accept our terms of service, which include consent to this processing; consent is covered in the privacy policy customers agree to at sign-up.";
const EU = (): Bag => {
  const intake = clone(LIA_PERFECT_PINNED.find((g) => g.id === "lia-perfect-eu-clean")!.intake);
  (intake.necessity_details as Bag).why_consent_not_used = CONSENT_ANSWER;
  return intake;
};
const ASSESSMENT_ID = "11111111-2222-4333-8444-555555555555";
const CONSENT_FIELD = "necessity_details.why_consent_not_used";
const BENEFIT_FIELD = "purpose_details.specific_benefit";

function frameworks(intake: Bag): string[] {
  const js = Array.isArray(intake.jurisdictions) ? intake.jurisdictions as string[] : [];
  const out: string[] = [];
  if (js.includes("EU (GDPR)")) out.push("EU_GDPR");
  if (js.includes("United Kingdom (UK GDPR)")) out.push("UK_GDPR");
  return out;
}

/** The deterministic path as index.ts runs it (deliverables → typed test →
 *  rule pass with `readings` → assembler with `readings`), the same shape
 *  doc161's render() uses plus the rule pass and the two doc 217 options. */
function render(
  intake: Bag,
  opts: { readings?: readonly ConfirmedReading[]; v3Enabled?: boolean; omitReadings?: boolean } = {},
) {
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  const ruled = opts.omitReadings
    ? applyLiaRules(typed, report, intake)
    : applyLiaRules(typed, report, intake, undefined, opts.readings);
  const effective = ruled.invariant_violations.length ? typed : ruled.typed;
  report.three_part_test = effective.three_part_test;
  if (effective.determination_override) report.lia_determination = effective.determination_override;
  report.information_needed = effective.information_needed;
  report.rule_applications = ruled.invariant_violations.length ? [] : ruled.applications;
  report.documentation_recommendations = buildDocumentationTyped(report, "Disclaimer.");
  report.engagement_map = buildLiaEngagementMap(intake, {}, frameworks(intake), (report.eprivacy_short_circuit as Bag).determination as string);
  const sk = opts.omitReadings
    ? assembleLiaSkeletonDocument(report, intake, { deterministic: true })
    : assembleLiaSkeletonDocument(report, intake, { deterministic: true, readings: opts.readings, v3Enabled: opts.v3Enabled });
  return { report, sk, text: skeletonDocumentToText(sk.document), json: JSON.stringify(sk.document) };
}

function reading(overrides: Partial<ConfirmedReading> & { prop_id: string; evidence_span: string }): ConfirmedReading {
  return {
    assessment_id: ASSESSMENT_ID,
    field_id: CONSENT_FIELD,
    prop_label: "",
    disposition: "confirmed",
    answer_hash: "deadbeef",
    decision_id: "decision-1",
    ...overrides,
  };
}

/** A verbatim span of the fixture's own answer to `field` (Law L8). */
function spanOf(intake: Bag, field: string, chars = 40): string {
  const answer = liaV3Answer(intake, field);
  assert(answer.length > chars, `fixture answer for ${field} too short: ${JSON.stringify(answer)}`);
  return answer.slice(0, chars);
}

// ── §5.2 — readings.ts ─────────────────────────────────────────────────────

Deno.test("doc217 §5.2 — filterConfirmed keeps only disposition === confirmed", () => {
  const rows = [
    reading({ prop_id: "a", evidence_span: "x", disposition: "confirmed" }),
    reading({ prop_id: "b", evidence_span: "x", disposition: "unconfirmed" }),
    reading({ prop_id: "c", evidence_span: "x", disposition: "stood" }),
    reading({ prop_id: "d", evidence_span: "x", disposition: "corrected" }),
  ];
  assertEquals(filterConfirmed(rows).map((r) => r.prop_id), ["a"]);
});

Deno.test("doc217 §5.2 — parseIntakeReadingRows is total: malformed rows drop, labels resolve from the row, an embedded inventory row, or the map", () => {
  const labels = new Map([["lia/consent.bundled_in_terms", "Consent held through terms"]]);
  const out = parseIntakeReadingRows([
    { assessment_id: ASSESSMENT_ID, field_id: CONSENT_FIELD, prop_id: "lia/consent.bundled_in_terms", evidence_span: "in our terms", disposition: "confirmed", answer_hash: "h", decision_id: "d1" },
    { assessment_id: ASSESSMENT_ID, field_id: CONSENT_FIELD, prop_id: "lia/consent.mechanism_unclear", evidence_span: "we have consent", disposition: "unconfirmed", answer_hash: "h", proposition_inventory: { label: "Consent claimed, mechanism not stated" } },
    { assessment_id: ASSESSMENT_ID, field_id: CONSENT_FIELD, prop_id: "lia/consent.not_assessed", evidence_span: "", disposition: "stood", answer_hash: "h", prop_label: "Own label" },
    { assessment_id: ASSESSMENT_ID, field_id: CONSENT_FIELD, prop_id: "lia/x", evidence_span: "x", disposition: "bogus", answer_hash: "h" },
    { field_id: CONSENT_FIELD, prop_id: "lia/y", evidence_span: "x", disposition: "confirmed" },
    null,
    "not a row",
  ], labels);
  assertEquals(out.length, 3);
  assertEquals(out[0].prop_label, "Consent held through terms");
  assertEquals(out[0].decision_id, "d1");
  assertEquals(out[1].prop_label, "Consent claimed, mechanism not stated");
  assertEquals(out[2].prop_label, "Own label");
  assertEquals(parseIntakeReadingRows("nope"), []);
  assertEquals(parseIntakeReadingRows(undefined), []);
});

Deno.test("doc217 §5.2/§5.7 — propsFromReadings emits only confirmed readings; a confirmed reading without a span emits nothing and is named (fail-visible)", () => {
  const ok = propsFromReadings([
    reading({ prop_id: "lia/consent.bundled_in_terms", evidence_span: "in our terms" }),
    reading({ prop_id: "lia/consent.mechanism_unclear", evidence_span: "we have consent", disposition: "unconfirmed" }),
    reading({ prop_id: "lia/consent.not_assessed", evidence_span: "not looked at", disposition: "stood" }),
  ]);
  assertEquals(ok.props, { "lia/consent.bundled_in_terms": "asserted" });
  assertEquals(ok.assertion_failures, []);

  const noSpan = propsFromReadings([reading({ prop_id: "lia/consent.bundled_in_terms", evidence_span: "" })]);
  assertEquals(noSpan.props, undefined);
  assertEquals(noSpan.assertion_failures, ["confirmed_reading_without_span:lia/consent.bundled_in_terms"]);

  assertEquals(propsFromReadings([]).props, undefined);
});

// ── §5.2 — buildLiaRuleStates ──────────────────────────────────────────────

Deno.test("doc217 §5.2 — buildLiaRuleStates without readings is the pre-doc-217 bag: no `props` key, deep-equal to the three-argument call", () => {
  const intake = EU();
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  const three = buildLiaRuleStates(report, intake, typed);
  const four = buildLiaRuleStates(report, intake, typed, []);
  const fourUndef = buildLiaRuleStates(report, intake, typed, undefined);
  assert(!("props" in three));
  assertEquals(four, three);
  assertEquals(fourUndef, three);
  // Unconfirmed / stood / corrected readings emit nothing either.
  const silent = buildLiaRuleStates(report, intake, typed, [
    reading({ prop_id: "lia/consent.bundled_in_terms", evidence_span: "x", disposition: "unconfirmed" }),
    reading({ prop_id: "lia/consent.bundled_in_terms", evidence_span: "x", disposition: "stood" }),
    reading({ prop_id: "lia/consent.bundled_in_terms", evidence_span: "x", disposition: "corrected" }),
  ]);
  assertEquals(silent, three);
  // A confirmed reading emits exactly its prop.
  const withProp = buildLiaRuleStates(report, intake, typed, [
    reading({ prop_id: "lia/consent.bundled_in_terms", evidence_span: "x" }),
  ]);
  assertEquals(withProp.props, { "lia/consent.bundled_in_terms": "asserted" });
  assertEquals({ ...withProp, props: undefined }, { ...three, props: undefined });
});

// ── §5.1/§5.2 — the rule pass over a prop: trigger (F11-1's shape) ─────────

const F11_1: AuthorityRule = {
  rule_id: "lia/rule/consent-in-terms-necessity-not-determined",
  product: "lia",
  settledness: "R1",
  instrument_scope: ["EU GDPR", "UK GDPR"],
  regulator_scope: null,
  bears_on_element: "necessity",
  trigger: { all_of: ["prop:lia/consent.bundled_in_terms=asserted"] },
  effect: {
    kind: "require_condition",
    text: "Whether valid consent is a workable alternative is not determined on the record. Record that assessment.",
  },
  reason_sentence: "Whether valid consent is a workable alternative is not determined on the record. Record that assessment.",
  authority_citation: "GDPR Article 4(11), Article 7(1)–(4), Recital 32 — determinative authority (condition)",
  sources: [{ table: "gdpr_articles", row_id: "e5328e1f" }],
  retired_at: null,
};

Deno.test("doc217 §5.1 — applyLiaRules: a prop: rule fires ONLY on a confirmed reading (L3); unconfirmed and absent are silent; no verdict moves", () => {
  const intake = EU();
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  const before = JSON.stringify(typed.three_part_test);

  const fired = applyLiaRules(typed, report, intake, [F11_1], [
    reading({ prop_id: "lia/consent.bundled_in_terms", evidence_span: spanOf(intake, CONSENT_FIELD) }),
  ]);
  assertEquals(fired.invariant_violations, []);
  assertEquals(fired.applications.length, 1);
  assertEquals(fired.applications[0].changed, true);
  const added = (fired.typed.information_needed as Bag[]).find((e) => String(e.dimensions).startsWith("Whether valid consent"));
  assert(added, JSON.stringify(fired.typed.information_needed));
  assertEquals(added!.enables, "the necessity test");
  // No F11 verdict change: the three verdicts are byte-identical.
  const tptFired = fired.typed.three_part_test as Bag;
  const tptBefore = JSON.parse(before) as Bag;
  for (const k of ["purpose_test", "necessity_test", "balancing_test"]) {
    assertEquals((tptFired[k] as Bag).verdict, (tptBefore[k] as Bag).verdict);
  }

  const unconfirmed = applyLiaRules(typed, report, intake, [F11_1], [
    reading({ prop_id: "lia/consent.bundled_in_terms", evidence_span: "x", disposition: "unconfirmed" }),
  ]);
  assertEquals(unconfirmed.applications, []);
  const none = applyLiaRules(typed, report, intake, [F11_1]);
  assertEquals(none.applications, []);
  const empty = applyLiaRules(typed, report, intake, [F11_1], []);
  assertEquals(empty.applications, []);
});

// ── §5.4/§5.7 — THE NO-READINGS BYTE-IDENTITY LAW ──────────────────────────

Deno.test("doc217 LAW — with no readings the document is byte-identical however the options are spelled, and no Schedule / method statement exists", () => {
  const intake = EU();
  const base = render(intake, { omitReadings: true });
  const a = render(intake, {});
  const b = render(intake, { readings: [] });
  const c = render(intake, { readings: undefined, v3Enabled: false });
  const d = render(intake, {
    readings: [reading({ prop_id: "lia/consent.bundled_in_terms", evidence_span: spanOf(intake, CONSENT_FIELD), disposition: "corrected" })],
  });
  for (const r of [a, b, c, d]) {
    assertEquals(r.text, base.text);
    assertEquals(r.json, base.json);
    assertEquals(r.sk.conformance, base.sk.conformance);
  }
  assert(!base.sk.document.sections.some((s) => s.id === "schedule_of_readings"));
  assert(!base.text.includes("Schedule of Readings"));
  assert(!base.text.includes(LIA_SCHEDULE_OF_READINGS_LEAD));
  assert(!base.text.includes(LIA_METHOD_STATEMENT));
  assertEquals(base.sk.v3.schedule_rendered, false);
  assertEquals(base.sk.v3.method_statement_rendered, false);
  assertEquals(base.sk.v3.readings, { confirmed: 0, corrected: 0, stood: 0, unconfirmed: 0 });
  assertEquals(d.sk.v3.readings, { confirmed: 0, corrected: 1, stood: 0, unconfirmed: 0 });
  assertEquals(base.sk.v3.hooks.applied_ids, []);
  assertEquals(base.sk.v3.assertion_failures, []);
});

Deno.test("doc217 — the engine flag ships dark: LIA_V3_DEFAULT is false and the module resolved false in this process", () => {
  assertEquals(LIA_V3_DEFAULT, false);
  assertEquals(LIA_V3_ENABLED, false);
});

// ── §5.4 — THE SCHEDULE OF READINGS ────────────────────────────────────────

Deno.test("doc217 §5.4 — the Schedule renders after Section IV with the ratified lead and one row per reading (confirmed / unconfirmed / stood); ToA and conformance untouched", () => {
  const intake = EU();
  const consentSpan = spanOf(intake, CONSENT_FIELD);
  const benefitSpan = spanOf(intake, BENEFIT_FIELD, 25);
  const readings = [
    reading({ prop_id: "lia/consent.bundled_in_terms", prop_label: "Consent held through terms", evidence_span: consentSpan }),
    reading({ prop_id: "lia/consent.mechanism_unclear", prop_label: "Consent claimed, mechanism not stated", evidence_span: consentSpan, disposition: "unconfirmed" }),
    reading({ prop_id: "lia/consent.not_assessed", evidence_span: consentSpan, disposition: "stood" }),
    reading({ field_id: BENEFIT_FIELD, prop_id: "lia/benefit.stated", prop_label: "A specific benefit is stated", evidence_span: benefitSpan, disposition: "unconfirmed" }),
  ];
  const base = render(intake, {});
  const r = render(intake, { readings });

  const ids = r.sk.document.sections.map((s) => s.id);
  const iv = ids.indexOf("balancing_test");
  const sched = ids.indexOf("schedule_of_readings");
  const v = ids.indexOf("findings");
  assert(iv >= 0 && sched === iv + 1 && v === sched + 1, `section order: ${ids.join(" > ")}`);

  const section = r.sk.document.sections[sched];
  assertEquals(section.title, "Schedule of Readings");
  assertEquals(section.paragraphs[0].kind, "lead");
  assertEquals(section.paragraphs[0].text, LIA_SCHEDULE_OF_READINGS_LEAD);
  assertEquals(section.paragraphs[1].kind, "table");
  const table = section.paragraphs[1].table!;
  assertEquals([...table.columns], [...LIA_SCHEDULE_OF_READINGS_COLUMNS]);
  assertEquals(table.rows.length, 4);
  // Document order: the purpose-stage field precedes the necessity-stage
  // one; within a field, prop_id order; the label prints, else the prop_id.
  assertEquals(table.rows[0][0], liaV3FieldLabel(BENEFIT_FIELD));
  assertEquals(table.rows[0][1], `"${benefitSpan}"`);
  assertEquals(table.rows[0][2], "A specific benefit is stated");
  assertEquals(table.rows[0][3], "unconfirmed");
  assertEquals(table.rows[1][0], "Why isn't consent appropriate here?");
  assertEquals(table.rows[1][2], "Consent held through terms");
  assertEquals(table.rows[1][3], "confirmed");
  assertEquals(table.rows[2][2], "Consent claimed, mechanism not stated");
  assertEquals(table.rows[2][3], "unconfirmed");
  assertEquals(table.rows[3][2], "lia/consent.not_assessed");
  assertEquals(table.rows[3][3], "stood");

  assertStringIncludes(r.text, LIA_SCHEDULE_OF_READINGS_LEAD);
  assertStringIncludes(r.text, `"${consentSpan}"`);
  assertEquals(r.sk.conformance, []);
  assertEquals(r.sk.register_findings, []);
  assertEquals(r.sk.lead_coherence, []);
  assertEquals(r.sk.v3.schedule_rendered, true);
  assertEquals(r.sk.v3.schedule_rows, 4);
  assertEquals(r.sk.v3.readings, { confirmed: 1, corrected: 0, stood: 1, unconfirmed: 2 });
  assertEquals(r.sk.v3.assertion_failures, []);
  // The Table of Authorities is untouched by the Schedule.
  const toa = (doc: typeof r.sk.document) => doc.sections.find((s) => s.id === "table_of_authorities")!.paragraphs.map((p) => p.text).join("\n");
  assertEquals(toa(r.sk.document), toa(base.sk.document));
  // Everything BEFORE the Schedule is byte-identical to the no-readings render,
  // except that the confirmed prop reached the rule pass — LIA_RULES carries no
  // F11 rule yet, so nothing fired and the sections are identical bytes.
  const upTo = (t: string) => t.slice(0, t.indexOf("Schedule of Readings"));
  assertEquals(upTo(r.text), base.text.slice(0, upTo(r.text).length));
});

Deno.test("doc217 §5.4 — the Schedule lead is the doc 217 §5.4 sentence verbatim, is ¶38 of the hash basis, and the section is v2-only", () => {
  assertEquals(
    LIA_SCHEDULE_OF_READINGS_LEAD,
    "Schedule — Readings of free-text answers. The engine read the following answers as stating the propositions listed. A reading marked confirmed was confirmed by the company at intake; a reading marked unconfirmed was not put to the company and did not affect any finding; a reading marked stood was declined and the company's answer stands as written.",
  );
  assertEquals(LIA_SKELETON_PARAGRAPHS[37], LIA_SCHEDULE_OF_READINGS_LEAD);
  assertEquals(LIA_SKELETON_PARAGRAPHS.length, 38);
  assert(!LIA_SKELETON_SECTIONS.some((s) => s.id === "schedule_of_readings"), "v1 must stay byte-untouched");
  const v2 = LIA_SKELETON_SECTIONS_V2.map((s) => s.id);
  assertEquals(v2.indexOf("schedule_of_readings"), v2.indexOf("balancing_test") + 1);
  assertEquals(v2.indexOf("findings"), v2.indexOf("schedule_of_readings") + 1);
  const findings = LIA_SKELETON_SECTIONS_V2.find((s) => s.id === "findings")!;
  assertEquals(findings.blocks.length, 7, "findings:6 carries the method statement block");
  assertEquals(findings.blocks[6].kind, "generated");
});

Deno.test("doc217 §5.7 (L8) — a span that is not a byte-substring of the answer is dropped from the Schedule and named; never printed, never blocking", () => {
  const intake = EU();
  const good = reading({ prop_id: "lia/consent.bundled_in_terms", prop_label: "Consent held through terms", evidence_span: spanOf(intake, CONSENT_FIELD) });
  const bad = reading({ prop_id: "lia/consent.would_defeat_purpose", prop_label: "Consent would defeat the purpose", evidence_span: "THIS SPAN IS NOT IN THE ANSWER" });
  const both = render(intake, { readings: [good, bad] });
  assertEquals(both.sk.v3.assertion_failures, ["schedule_span_not_in_answer:necessity_details.why_consent_not_used:lia/consent.would_defeat_purpose"]);
  assertEquals(both.sk.v3.schedule_rows, 1);
  assert(!both.text.includes("THIS SPAN IS NOT IN THE ANSWER"));
  assert(!both.text.includes("Consent would defeat the purpose"));
  assertStringIncludes(both.text, "Consent held through terms");

  // Only the bad one: no Schedule at all, and the document is the no-readings document.
  const only = render(intake, { readings: [bad] });
  const base = render(intake, {});
  assertEquals(only.text, base.text);
  assertEquals(only.sk.v3.schedule_rendered, false);
  assertEquals(only.sk.v3.assertion_failures.length, 1);

  // A confirmed reading with the bad span still emits its prop to the rule
  // pass (rule-states' own assertion is about the span's PRESENCE, L8's
  // substring check is the assembler's) — but LIA_RULES has no prop: rule,
  // so nothing fires and nothing prints. Pinned so a future F11 landing
  // knows which layer checks what.
  assertEquals(only.sk.v3.hooks.applied_ids, []);
});

Deno.test("doc217 §5.7 — deriveScheduleOfReadings is deterministic: store order and duplicates do not change the rows", () => {
  const intake = EU();
  const span = spanOf(intake, CONSENT_FIELD);
  const a = reading({ prop_id: "lia/consent.bundled_in_terms", prop_label: "L1", evidence_span: span });
  const b = reading({ prop_id: "lia/consent.mechanism_unclear", prop_label: "L2", evidence_span: span, disposition: "unconfirmed" });
  const c = reading({ field_id: BENEFIT_FIELD, prop_id: "lia/benefit.stated", prop_label: "L3", evidence_span: spanOf(intake, BENEFIT_FIELD, 20), disposition: "stood" });
  const one = deriveScheduleOfReadings([a, b, c], intake);
  const two = deriveScheduleOfReadings([c, b, a, a, c], intake);
  assertEquals(two.table, one.table);
  assertEquals(one.rows, 3);
  assertEquals(deriveScheduleOfReadings([], intake).table, null);
});

Deno.test("doc217 §5.7 — REPLAY: the same readings in any order render the same bytes twice (document text and JSON)", () => {
  const intake = EU();
  const span = spanOf(intake, CONSENT_FIELD);
  const readings = [
    reading({ prop_id: "lia/consent.bundled_in_terms", prop_label: "Consent held through terms", evidence_span: span }),
    reading({ prop_id: "lia/consent.mechanism_unclear", prop_label: "Consent claimed, mechanism not stated", evidence_span: span, disposition: "unconfirmed" }),
    reading({ field_id: BENEFIT_FIELD, prop_id: "lia/benefit.stated", prop_label: "A specific benefit is stated", evidence_span: spanOf(intake, BENEFIT_FIELD, 20), disposition: "stood" }),
  ];
  const first = render(EU(), { readings, v3Enabled: true });
  const second = render(EU(), { readings: [...readings].reverse(), v3Enabled: true });
  assertEquals(second.text, first.text);
  assertEquals(second.json, first.json);
  assertEquals(second.sk.v3, first.sk.v3);
  assertEquals(first.sk.v3.schedule_rendered, true);
  assertEquals(first.sk.v3.method_statement_rendered, true);
});

// ── §5.5 — THE METHOD STATEMENT ────────────────────────────────────────────

Deno.test("doc217 §5.5 — the method statement is doc 212 §4 (ii) verbatim, unratified, printed in Section V only while the caller says V3 is on", () => {
  assertEquals(LIA_METHOD_STATEMENT_RATIFIED, false);
  assertEquals(
    LIA_METHOD_STATEMENT,
    "This assessment was produced by a rules-based engine applying ratified rules and authority patterns to the company's answers. Readings of free-text answers are listed in Schedule [X] and should be confirmed by the company. Authorities are cited as persuasive patterns with their status marked. The assessment is the company's own record; it is not legal advice.",
  );
  const intake = EU();
  const off = render(intake, { v3Enabled: false });
  assert(!off.text.includes(LIA_METHOD_STATEMENT));
  assertEquals(off.sk.v3.method_statement_rendered, false);
  const on = render(intake, { v3Enabled: true });
  const findings = on.sk.document.sections.find((s) => s.id === "findings")!;
  assertEquals(findings.paragraphs[findings.paragraphs.length - 1].text, LIA_METHOD_STATEMENT);
  assertEquals(findings.paragraphs[findings.paragraphs.length - 1].kind, "generated");
  assertEquals(on.sk.v3.method_statement_rendered, true);
  assertEquals(on.sk.conformance, []);
  assertEquals(on.sk.register_findings, []);
  // The only difference between on and off is that one paragraph.
  assertEquals(off.text, on.text.replace(`\n${LIA_METHOD_STATEMENT}\n`, "\n").replace(/\n{3,}/g, "\n\n"));
});

// ── §5.6 — hook_applied_ids on the persuasive result ───────────────────────

Deno.test("doc217 §5.6 — LiaPersuasiveAuthorityResult.hook_applied_ids is [] by default and names the hook whose sentence rendered", () => {
  const intake = EU();
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  report.three_part_test = typed.three_part_test;
  const plain = buildLiaPersuasiveAuthority(report, false, { intake });
  assertEquals(plain.hook_applied_ids, []);

  // A hook that ranks and applies (the doc213b test-2 shape).
  const hook: AuthorityHook = {
    hook_id: "enforcement_actions:doc217-applied:v1",
    profile_id: "profile-doc217",
    source_row_id: "doc217-applied",
    fact_atoms: ["class:fraud_prevention"],
    distinguishing_atoms: [],
    not_distinguishable: true,
    required_atoms: [],
    finding_span: "the necessity test could not be met on these facts",
    fact_pattern_paraphrase: "a controller processed personal data without a valid legal basis",
    finding_paraphrase: "the necessity test could not be met",
    settledness: "R2",
    posture: "accepted",
    factor_id: "Necessity and less-intrusive means",
    bears_on_element: "necessity",
    authority_label: "Test DPA, Doc217 Matter, decision of 1 June 2025",
    regulator: "Test DPA",
    relevance: {
      instrument: "EU GDPR",
      factor_ids: ["Necessity and less-intrusive means"],
      use_case_class: "fraud_prevention",
      relationship: "customer",
      data_categories: ["Contact data"],
      flags: [],
      outcome_posture: "accepted",
    },
  };
  const hookReport: Bag = {
    precedent_class_posture: { use_case_class: "fraud_prevention" },
    three_part_test: { purpose_test: { verdict: "" }, necessity_test: { verdict: "" }, balancing_test: { verdict: "" } },
    scale_frequency_duration: {},
  };
  const hookIntake: Bag = { jurisdictions: ["EU (GDPR)"], data_categories: ["Contact data"], balancing_details: { relationship_category: "Customer" } };
  const states = buildLiaRuleStates(hookReport, hookIntake, { three_part_test: hookReport.three_part_test as Bag });
  const applied = buildLiaPersuasiveAuthority(hookReport, false, { intake: hookIntake, hooks: [hook], states, verdicts: states.verdicts });
  assertEquals(applied.hook_flags, []);
  assertEquals(applied.hook_applied_ids, [hook.hook_id]);
  assert(applied.ledger.includes(hook.authority_label));
});

// ── §5.2 — THE CALL-SITE LAW (index.ts, pinned by source) ──────────────────

const INDEX_SRC = Deno.readTextFileSync(new URL("../../../supabase/functions/run-li-assessment/index.ts", import.meta.url));
const ASSEMBLER_SRC = Deno.readTextFileSync(
  new URL("../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts", import.meta.url),
);

Deno.test("doc217 call-site law — index.ts loads readings once, only under LIA_DETERMINISTIC_ENABLED && LIA_V3_ENABLED, through the guarded loader", () => {
  assertStringIncludes(INDEX_SRC, `import { LIA_V3_ENABLED } from "./_local/ltp/lia-v3-flag.ts";`);
  const load = INDEX_SRC.indexOf("loadIntakeReadings(supabase");
  assert(load >= 0, "index.ts must call loadIntakeReadings on the supabase client");
  const before = INDEX_SRC.slice(Math.max(0, load - 900), load);
  assertStringIncludes(before, "if (LIA_DETERMINISTIC_ENABLED && LIA_V3_ENABLED) {");
  assertStringIncludes(before, 'await import("./_local/ltp/v3/load-readings.ts")');
  assertEquals((INDEX_SRC.match(/loadIntakeReadings\(/g) ?? []).length, 1, "loaded exactly once");
  assertStringIncludes(INDEX_SRC, "const v3Readings = v3Load?.readings ?? [];");
});

Deno.test("doc217 call-site law — index.ts passes the SAME readings to applyLiaRules (site 1) and to the assembler (site 2), and the flag to the assembler", () => {
  const rulePass = INDEX_SRC.indexOf("const ruled = applyLiaRules(");
  assert(rulePass >= 0);
  const ruleCall = INDEX_SRC.slice(rulePass, INDEX_SRC.indexOf(");", rulePass) + 2);
  assert(/undefined,\s*v3Readings,?\s*\)/.test(ruleCall), `rule pass must receive v3Readings as its readings argument: ${ruleCall}`);

  // index.ts is CRLF on disk — match the call across either line ending.
  const asmMatch = /assembleLiaSkeletonDocument\(\r?\n\s+reportData as Record/.exec(INDEX_SRC);
  assert(asmMatch, "assembler call not found");
  const asm = asmMatch.index;
  const asmCall = INDEX_SRC.slice(asm, INDEX_SRC.indexOf(");", asm) + 2);
  assertStringIncludes(asmCall, "readings: v3Readings");
  assertStringIncludes(asmCall, "v3Enabled: LIA_V3_ENABLED");
  assertStringIncludes(asmCall, "deterministic: LIA_DETERMINISTIC_ENABLED");
});

Deno.test("doc217 call-site law — the record block is written only under LIA_V3_ENABLED; the assembler forwards readings to its state bag and composes the Schedule from them", () => {
  const rec = INDEX_SRC.indexOf("_i.lia_v3 = {");
  assert(rec >= 0, "record block not found");
  const before = INDEX_SRC.slice(Math.max(0, rec - 200), rec);
  assertStringIncludes(before, "if (LIA_V3_ENABLED) {");
  assert(/buildLiaRuleStates\(report, record, \{[\s\S]{0,400}?\}, readings\)/.test(ASSEMBLER_SRC));
  assertStringIncludes(ASSEMBLER_SRC, "deriveScheduleOfReadings(readings, record)");
  assertStringIncludes(ASSEMBLER_SRC, 'composed["schedule_of_readings:0"] = LIA_SCHEDULE_OF_READINGS_LEAD;');
  assertStringIncludes(ASSEMBLER_SRC, "LIA_METHOD_STATEMENT_RATIFIED || opts.v3Enabled === true");
  // No model client anywhere near the assembler (the boundary test proves the graph; this pins the text).
  assert(!/anthropic|openai|llm-extraction/i.test(ASSEMBLER_SRC));
});

// ── §5.2 — the guarded loader (stub client; never a network) ───────────────

function stubClient(tables: Record<string, { data?: unknown; error?: unknown; throws?: boolean }>): ReadingsClientLike {
  return {
    from(table: string) {
      return {
        select(_cols: string) {
          return {
            in(_col: string, _vals: readonly string[]) {
              const t = tables[table] ?? { error: { message: `relation "${table}" does not exist` } };
              if (t.throws) throw new Error(`boom:${table}`);
              return Promise.resolve({ data: t.data ?? null, error: t.error ?? null });
            },
          };
        },
      };
    },
  };
}

Deno.test("doc217 §5.2 — loadIntakeReadings FAILS OPEN: a missing table, an error or a throw yields [] with the error named", async () => {
  const missing = await loadIntakeReadings(stubClient({}), [ASSESSMENT_ID]);
  assertEquals(missing.readings, []);
  assertStringIncludes(missing.error ?? "", "intake_readings");
  const thrown = await loadIntakeReadings(stubClient({ intake_readings: { throws: true } }), [ASSESSMENT_ID]);
  assertEquals(thrown.readings, []);
  assertStringIncludes(thrown.error ?? "", "boom:intake_readings");
  const noId = await loadIntakeReadings(stubClient({}), ["", "  "]);
  assertEquals(noId.error, "no_assessment_id");
});

Deno.test("doc217 §5.2 — loadIntakeReadings resolves labels and the inventory version, and degrades each lookup independently", async () => {
  const rows = [
    { assessment_id: ASSESSMENT_ID, field_id: CONSENT_FIELD, prop_id: "lia/consent.bundled_in_terms", evidence_span: "in our terms", disposition: "confirmed", answer_hash: "h", decision_id: "d1" },
    { assessment_id: ASSESSMENT_ID, field_id: CONSENT_FIELD, prop_id: "lia/consent.not_assessed", evidence_span: "not looked at", disposition: "unconfirmed", answer_hash: "h", decision_id: "d2" },
  ];
  const full = await loadIntakeReadings(
    stubClient({
      intake_readings: { data: rows },
      proposition_inventory: { data: [{ prop_id: "lia/consent.bundled_in_terms", label: "Consent held through terms" }] },
      proposition_decisions: { data: [{ decision_id: "d1", inventory_version: "inv-1" }, { decision_id: "d2", inventory_version: "inv-1" }] },
    }),
    [ASSESSMENT_ID],
  );
  assertEquals(full.error, null);
  assertEquals(full.readings.length, 2);
  assertEquals(full.readings[0].prop_label, "Consent held through terms");
  assertEquals(full.readings[1].prop_label, "");
  assertEquals(full.decision_ids, ["d1", "d2"]);
  assertEquals(full.inventory_version, "inv-1");
  assertEquals(full.counts, { confirmed: 1, corrected: 0, stood: 0, unconfirmed: 1 });
  assertEquals(full.warnings, []);

  const degraded = await loadIntakeReadings(stubClient({ intake_readings: { data: rows } }), [ASSESSMENT_ID]);
  assertEquals(degraded.error, null);
  assertEquals(degraded.readings.length, 2);
  assertEquals(degraded.readings[0].prop_label, "");
  assertEquals(degraded.inventory_version, null);
  assertEquals(degraded.warnings.length, 2);
});

// ── §1 — the free-text surface ─────────────────────────────────────────────

Deno.test("doc217 §1 — the fifteen field ids are doc 217 §1's, every label is the question as displayed on the form, and the src mirror agrees", () => {
  assertEquals([...LIA_V3_FIELD_IDS], [
    "processing_description",
    "purpose_details.interest_statement",
    "purpose_details.stated_purpose",
    "purpose_details.specific_benefit",
    "purpose_details.statutory_restrictions",
    "necessity_details.alternatives",
    "necessity_details.alternatives_rationale",
    "necessity_details.achievable_without_personal_data_rationale",
    "necessity_details.why_consent_not_used",
    "necessity_details.data_minimised",
    "balancing_details.reasonable_expectation_detail",
    "balancing_details.collection_context",
    "balancing_details.potential_harms",
    "balancing_details.additional_mitigations",
    "balancing_details.additional_context",
  ]);
  const intakeSrc = Deno.readTextFileSync(new URL("../../../src/pages/LIAssessmentIntake.tsx", import.meta.url));
  const step1Src = Deno.readTextFileSync(new URL("../../../src/pages/LIAssessment.tsx", import.meta.url));
  for (const f of LIA_V3_FIELDS) {
    const src = f.field_id === "processing_description" ? step1Src : intakeSrc;
    assert(src.includes(f.label), `${f.field_id}: label not displayed on the form: ${f.label}`);
  }
  // The src mirror (the read-back component's field list) carries the same ids and labels.
  assertEquals(LIA_V3_INTAKE_FIELDS.map((f) => f.field_id), [...LIA_V3_FIELD_IDS]);
  for (const f of LIA_V3_INTAKE_FIELDS) assertEquals(f.question_text, liaV3FieldLabel(f.field_id), f.field_id);
  // Every form field the component wires carries the data attribute the component listens for.
  for (const f of LIA_V3_INTAKE_FIELDS) {
    if (f.field_id === "processing_description") continue; // Step 1 page, not on this form
    assert(intakeSrc.includes(`data-v3-field="${f.field_id}"`), `${f.field_id}: no data-v3-field attribute on the intake form`);
  }
});

Deno.test("doc217 §1 — liaV3Answer reads the re-pathed fields from where the form stores them; liaV3Field resolves by either key", () => {
  const intake = EU();
  assertEquals(liaV3Answer(intake, "purpose_details.stated_purpose"), String(intake.stated_purpose));
  assertEquals(liaV3Answer(intake, CONSENT_FIELD), String((intake.necessity_details as Bag).why_consent_not_used));
  assertEquals(liaV3Answer(intake, "balancing_details.potential_harms"), String((intake.balancing_details as Bag).potential_harm_detail ?? ""));
  assertEquals(liaV3Field("balancing_details.potential_harm_detail")?.field_id, "balancing_details.potential_harms");
  assertEquals(liaV3Field("stated_purpose")?.field_id, "purpose_details.stated_purpose");
  assertEquals(liaV3FieldLabel("not.a.field"), "not.a.field");
  assertEquals(liaV3Answer({}, CONSENT_FIELD), "");
  assertEquals(liaV3Answer({ necessity_details: { alternatives: ["a", "b"] } }, "necessity_details.alternatives"), "a\nb");
});

// ── §5.8 — the read-back templates ─────────────────────────────────────────

const COACHING = ["should", "must", "for example", "a good answer", "to pass"];

Deno.test("doc217 §5.8 — six reason codes, one ratified template each; no template or action word carries coaching language (L6)", () => {
  assertEquals([...LIA_GATE_REASON_CODES], [
    "non_responsive",
    "unintelligible",
    "placeholder",
    "contradicts_closed_answer",
    "legal_conclusion_not_fact",
    "fact_belongs_to_other_limb",
  ]);
  const all = [
    ...Object.values(LIA_READBACK_REASON_TEMPLATES),
    LIA_READBACK_READING_TEMPLATE,
    LIA_READBACK_STOOD_TEMPLATE,
    ...Object.values(LIA_READBACK_ACTIONS),
  ];
  assertEquals(all.length, 6 + 2 + 5);
  for (const t of all) {
    for (const marker of COACHING) {
      assert(!new RegExp(`\\b${marker.replace(/ /g, "\\s+")}\\b`, "i").test(t), `coaching marker "${marker}" in template: ${t}`);
    }
    assert(t.trim().length > 0);
  }
  // The three doc 217 §5.8 examples exist (217A's wording governs the bytes).
  assertStringIncludes(LIA_READBACK_REASON_TEMPLATES.non_responsive, "does not address the question as asked");
  assertStringIncludes(LIA_READBACK_REASON_TEMPLATES.legal_conclusion_not_fact, "The assessment can only weigh facts.");
  assertStringIncludes(LIA_READBACK_REASON_TEMPLATES.fact_belongs_to_other_limb, "It has been noted there; you may move or repeat it.");
  assertEquals(LIA_READBACK_READING_TEMPLATE, "We read this answer as stating: {label} — based on: \"{span}\".");
});

Deno.test("doc217 §5.8 — renderLiaReadbackTemplate substitutes verbatim and returns null on any unresolved slot; unknown codes render nothing", () => {
  assertEquals(
    renderLiaReasonCode("non_responsive", { question: "Why isn't consent appropriate here?" }),
    "This answer does not address the question as asked: \"Why isn't consent appropriate here?\". You may revise it, or keep it as written.",
  );
  assertEquals(renderLiaReasonCode("non_responsive", {}), null);
  assertEquals(renderLiaReasonCode("legal_conclusion_not_fact", { span: "" }), null);
  assertEquals(renderLiaReasonCode("other_limb_field", { span: "x" }), null);
  assertEquals(
    renderLiaReadbackTemplate(LIA_READBACK_READING_TEMPLATE, { label: "Consent held through terms", span: "in our terms" }),
    "We read this answer as stating: Consent held through terms — based on: \"in our terms\".",
  );
  assertEquals(
    renderLiaReadbackTemplate(LIA_READBACK_REASON_TEMPLATES.contradicts_closed_answer, { span: "a", closed_question: "b", closed_answer: "c" }),
    "This answer, \"a\", does not agree with your answer to \"b\" (\"c\"). You may revise either, or keep both as written; the assessment will not resolve the difference.",
  );
});

Deno.test("doc217 §5.8 — the src mirror of the templates is byte-identical to the canonical file (line endings normalised — the doc207c lesson)", async () => {
  const norm = (s: string) => s.replace(/\r\n/g, "\n");
  const canonical = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-li-assessment/_local/ltp/v3/readback-templates.ts", import.meta.url),
  );
  const mirror = await Deno.readTextFile(new URL("../../../src/lib/lia/readbackTemplates.ts", import.meta.url));
  assertEquals(norm(mirror), norm(canonical), "src/lib/lia/readbackTemplates.ts has drifted from v3/readback-templates.ts — copy the canonical file");
  assert(!/^import\s/m.test(canonical), "the templates module must have no imports (it is mirrored into src)");
});
