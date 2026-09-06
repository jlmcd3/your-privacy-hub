// DOC 161 (2026-09-03) — LIA model-vs-law build: the deterministic path
// (LIA_DETERMINISTIC_ENABLED: attachLiaDeliverables → attachLiaUpgrade4 →
// attachPrecedentClassPosture → buildThreePartTestTyped →
// assembleLiaSkeletonDocument) read against GDPR / UK GDPR Art. 6(1)(f),
// Recital 47 and EDPB Guidelines 1/2024, with the seven audits of doc 154
// Part A. One test per designed state the build introduced.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  INTEREST_HOLDER_OPTS,
  INTEREST_TYPE_OPTS,
  POTENTIAL_HARM_OPTS,
  REASONABLE_EXPECTATION_OPTS,
} from "../../../supabase/functions/_shared/intake-contracts/li-assessment.ts";
import { FIELD_ENUM_MIRROR } from "../../../supabase/functions/_shared/field-enums.ts";
import { GRADER_CONTEXT_VERSION } from "../../../supabase/functions/_shared/grader/context.ts";
import { buildLiaEngagementMap } from "../../../supabase/functions/_shared/engagement-map.ts";
import { LIA_GOLDEN } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia.ts";
import { LIA_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia-perfect.ts";
import { LIA_PERFECT_PINNED } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia-perfect-pinned.ts";
import { attachLiaDeliverables, buildChildFactor, buildDetermination, buildPublicAuthorityExclusion, buildReasonableExpectations } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { attachLiaUpgrade4, buildAlternativesConsidered, buildInterestLegitimacy, harmIsMaterial } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { attachPrecedentClassPosture } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";
import { stripSpeculativeNegations } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/elements.ts";
import { buildEprivacyShortCircuit } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/eprivacy-gate.ts";
import {
  buildDocumentationTyped,
  buildThreePartTestTyped,
  LIA_EPRIVACY_RULE_SENTENCE,
  LIA_EPRIVACY_RULE_SENTENCE_UK,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import {
  assembleLiaSkeletonDocument,
  buildLiaSlotValues,
  LIA_NON_GDPR_JURISDICTION_SENTENCE,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { LIA_PERSUASIVE_AUTHORITY_LEAD } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-persuasive-authority.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { LIA_RAIL } from "../../../src/components/lia/LIARailEntries.ts";

type Bag = Record<string, unknown>;
const clone = (o: unknown): Bag => JSON.parse(JSON.stringify(o));
const EU = () => clone(LIA_PERFECT_PINNED.find((g) => g.id === "lia-perfect-eu-clean")!.intake);
const UK = () => clone(LIA_PERFECT[0].intake);
const PERFECT = () => clone(LIA_GOLDEN.find((g) => g.id === "lia-perfect-record")!.intake);

function frameworks(intake: Bag): string[] {
  const js = Array.isArray(intake.jurisdictions) ? intake.jurisdictions as string[] : [];
  const out: string[] = [];
  if (js.includes("EU (GDPR)")) out.push("EU_GDPR");
  if (js.includes("United Kingdom (UK GDPR)")) out.push("UK_GDPR");
  return out;
}

function render(intake: Bag) {
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  report.three_part_test = typed.three_part_test;
  if (typed.determination_override) report.lia_determination = typed.determination_override;
  report.information_needed = typed.information_needed;
  report.documentation_recommendations = buildDocumentationTyped(report, "Disclaimer.");
  report.engagement_map = buildLiaEngagementMap(intake, {}, frameworks(intake), (report.eprivacy_short_circuit as Bag).determination as string);
  const sk = assembleLiaSkeletonDocument(report, intake, { deterministic: true });
  return { report, sk, text: skeletonDocumentToText(sk.document) };
}

// ── R1: the real-and-present sub-test no longer trips on its own negation ────

Deno.test("doc161 — negated speculative spans are stripped before the lexicon runs", () => {
  assert(!/speculative|hypothetical/.test(stripSpeculativeNegations("present rather than speculative")));
  assert(!/speculative/.test(stripSpeculativeNegations("the interest is not hypothetical and is present")));
  assert(/speculative/.test(stripSpeculativeNegations("the benefit remains speculative")));
});

Deno.test("doc161 — the golden perfect record's purpose test passes and the document coheres", () => {
  const { report, text } = render(PERFECT());
  const leg = report.interest_legitimacy as Bag;
  assertEquals(leg.verdict, "legitimate_interest_established");
  const tpt = report.three_part_test as Bag;
  assertEquals((tpt.purpose_test as Bag).verdict, "passes");
  assertStringIncludes(text, "Purpose test | Met");
  assert(!text.includes("does not qualify as a legitimate interest"));
});

// ── R2: one resolver for material harm ──────────────────────────────────────

Deno.test("doc161 — material harm is one resolver over both vocabularies", () => {
  for (const a of ["Severe", "Moderate", "Significant — discrimination, financial loss, reputational damage", "Severe — physical safety, identity theft, loss of livelihood"]) {
    assert(harmIsMaterial(a), a);
  }
  for (const a of ["Minor", "None / negligible", "Limited — minor inconvenience or unwanted contact", "Negligible — annoyance only", ""]) {
    assert(!harmIsMaterial(a), a);
  }
});

Deno.test("doc161 — Moderate harm with no safeguard: the determination and the balancing verdict move together", () => {
  const intake = EU();
  const b = intake.balancing_details as Bag;
  b.potential_harm = "Moderate";
  b.safeguards = [];
  b.safeguards_other = "";
  const { report, text } = render(intake);
  assertEquals((report.lia_determination as Bag).outcome, "available_only_with_mitigations");
  assertEquals(((report.three_part_test as Bag).balancing_test as Bag).verdict, "likely_fails");
  // The ratified lead for the mitigations outcome: available, subject to the conditions.
  assertStringIncludes(text, "subject to the conditions recorded below");
  assertStringIncludes(text, "Balancing test | Not met");
  assertEquals(render(intake).sk.lead_coherence.length, 0);
});

// ── R3: the determination consumes the typed legitimacy verdict ─────────────

Deno.test("doc161 — a label-only interest fails the first condition and legitimate interests is not available as recorded", () => {
  const intake = EU();
  (intake.purpose_details as Bag).interest_statement = "Marketing.";
  const leg = buildInterestLegitimacy(intake);
  assertEquals(leg.verdict, "legitimate_interest_not_established");
  const { report, text } = render(intake);
  const det = report.lia_determination as Bag;
  assertEquals(det.outcome, "legitimate_interests_not_available");
  assert((det.driving_factors as string[]).includes("legitimacy"));
  assertStringIncludes(String(det.why), "first of the three cumulative conditions is not met");
  assert((det.mitigations as Bag[]).some((m) => m.factor === "legitimacy"));
  assertStringIncludes(text, "Purpose test | Not met");
  assert(!text.includes("Legitimate interests is available to"));
  assertEquals(render(intake).sk.lead_coherence.length, 0);
});

Deno.test("doc161 — an open legitimacy condition keeps the determination open, with the ask", () => {
  const intake = EU();
  (intake.purpose_details as Bag).interest_type = "";
  (intake.purpose_details as Bag).interest_type_other = "";
  const leg = buildInterestLegitimacy(intake);
  assertEquals(leg.verdict, "undetermined_on_the_record");
  const det = buildDetermination(intake, buildReasonableExpectations(intake), buildChildFactor(intake), buildPublicAuthorityExclusion(intake));
  assertEquals(det.outcome, "undetermined_on_the_record");
  assert((det.driving_factors as string[]).includes("legitimacy"));
  assertStringIncludes(String(det.information_needed), "interest_type");
});

// ── R4: seams, parser, quoted facts ─────────────────────────────────────────

Deno.test("doc161 — the UK perfect record renders without a doubled stop, a stop-comma seam, or a broken list item", () => {
  const { text } = render(UK());
  assert(!text.includes(".."), text.match(/.{40}\.\..{20}/)?.[0]);
  assert(!text.includes(".,"), text.match(/.{40}\.,.{20}/)?.[0]);
  assertStringIncludes(text, "3-D Secure step-up alone |");
  assert(!text.includes("| D Secure"));
});

Deno.test("doc161 — the alternatives parser keeps a leading digit-hyphen and strips real list markers", () => {
  const intake = EU();
  (intake.necessity_details as Bag).alternatives = "- 3-D Secure alone — authenticates but does not detect re-shipping fraud\n2) Manual review of every order — three people cannot review 18,000 orders";
  (intake.necessity_details as Bag).alternatives_rationale = "";
  const f = buildAlternativesConsidered(intake);
  const names = f.alternatives.map((a) => a.alternative);
  assert(names.some((n) => n.startsWith("3-D Secure")), JSON.stringify(names));
  assert(names.some((n) => n.startsWith("Manual review")), JSON.stringify(names));
});

Deno.test("doc161 — the child factor quotes the vulnerable-groups answer, never a JSON array", () => {
  const intake = EU();
  (intake.balancing_details as Bag).children_data_subjects = "";
  (intake.balancing_details as Bag).vulnerable_subjects = ["None"];
  const f = buildChildFactor(intake);
  assert(!f.record_fact.includes("[\""), f.record_fact);
  assertStringIncludes(f.record_fact, "\"None\"");
  assert(!f.application.includes("[\""), f.application);
});

// ── R5: the intake form's vocabulary ────────────────────────────────────────

Deno.test("doc161 — contract options carry the form's option strings and the legacy values; mirrors match", () => {
  assert(REASONABLE_EXPECTATION_OPTS.includes("Probably — disclosed in privacy notice and consistent with the relationship"));
  assert(REASONABLE_EXPECTATION_OPTS.includes("Yes"));
  assert(POTENTIAL_HARM_OPTS.includes("Significant — discrimination, financial loss, reputational damage"));
  assert(POTENTIAL_HARM_OPTS.includes("Moderate"));
  assertEquals([...(FIELD_ENUM_MIRROR["li_assessment:balancing_details.reasonable_expectation"] ?? [])], [...REASONABLE_EXPECTATION_OPTS]);
  assertEquals([...(FIELD_ENUM_MIRROR["li_assessment:balancing_details.potential_harm"] ?? [])], [...POTENTIAL_HARM_OPTS]);
  assertEquals(INTEREST_HOLDER_OPTS.length, 6);
  assertEquals(INTEREST_TYPE_OPTS.length, 8);
});

Deno.test("doc161 — a real form record keeps its relationship-and-expectations sentence and labels its answers", () => {
  const intake = EU();
  const b = intake.balancing_details as Bag;
  const p = intake.purpose_details as Bag;
  b.reasonable_expectation = "Probably — disclosed in privacy notice and consistent with the relationship";
  b.potential_harm = "Significant — discrimination, financial loss, reputational damage";
  p.interest_holder = "The data subject themselves";
  p.interest_type = "Security / fraud prevention";
  p.beneficiary = "Our business and the individuals";
  const v = buildLiaSlotValues(intake) as Bag;
  assertEquals(v.EXPECTATION_PHRASE, "would probably");
  assertEquals(v.potentialHarm, "significant");
  assertEquals(v.INTEREST_HOLDER_PHRASE, "on behalf of the individuals whose data is processed");
  assertEquals(v.INTEREST_TYPE_PHRASE, "a security or fraud-prevention interest");
  assertEquals(v.beneficiary, "its own business and the individuals whose data is processed");
  const { text, sk } = render(intake);
  assertStringIncludes(text, "A. Relationship and reasonable expectations.");
  assertStringIncludes(text, "would probably reasonably expect this processing");
  assertEquals(sk.conformance.length, 0);
});

Deno.test("doc161 — a blank expectation detail or harm list no longer drops the answered facts", () => {
  const intake = EU();
  const b = intake.balancing_details as Bag;
  b.reasonable_expectation_detail = "";
  b.potential_harms = [];
  const { text, sk } = render(intake);
  assertStringIncludes(text, "A. Relationship and reasonable expectations.");
  assertStringIncludes(text, "the basis it offers is not recorded");
  assertStringIncludes(text, "B. Potential impact.");
  assertEquals(sk.conformance.length, 0);
});

Deno.test("doc161 — an 'Other: <text>' data category renders its text, never the additional context", () => {
  const intake = EU();
  intake.data_categories = ["Contact data", "Other: telemetry from the mobile app"];
  (intake.balancing_details as Bag).additional_context = "The scoring runs only on weekdays.";
  const v = buildLiaSlotValues(intake) as Bag;
  assertStringIncludes(String(v.dataCategories), "telemetry from the mobile app");
  assert(!String(v.dataCategories).includes("weekdays"));
});

// ── R6/R7: collected and now read ───────────────────────────────────────────

Deno.test("doc161 — the necessity analysis quotes the data-minimisation account beside Art. 5(1)(c)", () => {
  const intake = EU();
  (intake.necessity_details as Bag).data_minimised = "Only the order value and the device type are read; no location data are collected.";
  const { text } = render(intake);
  assertStringIncludes(text, "On data minimisation, the company has stated: \"Only the order value and the device type are read; no location data are collected\".");
  assertStringIncludes(text, "Article 5(1)(c) requires personal data to be adequate, relevant and limited to what is necessary");
  const blank = EU();
  (blank.necessity_details as Bag).data_minimised = "";
  assertStringIncludes(render(blank).text, "The company has not described how the data used are limited to what the purpose needs");
});

Deno.test("doc161 — the balancing analysis quotes the Company's further context", () => {
  const intake = EU();
  (intake.balancing_details as Bag).additional_context = "Managers were consulted on 12 May 2026 and the works council minutes are filed.";
  const { text } = render(intake);
  assertStringIncludes(text, "The company adds, as further context for the balance: \"Managers were consulted on 12 May 2026 and the works council minutes are filed\".");
});

// ── R8: regime default stated ───────────────────────────────────────────────

Deno.test("doc161 — a record naming neither the EU nor the UK states the GDPR default once, first", () => {
  const intake = EU();
  intake.jurisdictions = ["United States — Federal", "California (CCPA/CPRA)"];
  const { text } = render(intake);
  const first = text.indexOf(LIA_NON_GDPR_JURISDICTION_SENTENCE);
  assert(first >= 0, "basis sentence missing");
  assertEquals(text.indexOf(LIA_NON_GDPR_JURISDICTION_SENTENCE, first + 1), -1);
  assert(first < text.indexOf("I. The Processing"));
  assert(!render(EU()).text.includes(LIA_NON_GDPR_JURISDICTION_SENTENCE));
  assert(!render(UK()).text.includes(LIA_NON_GDPR_JURISDICTION_SENTENCE));
});

// ── R9: UK Art. 6(11) direct marketing only ─────────────────────────────────

Deno.test("doc161 — the UK Art. 6(11) direct-marketing note fires on direct marketing, not on marketing analytics", () => {
  const analytics = clone(LIA_GOLDEN.find((g) => g.id === "lia-uk-analytics-tuning")!.intake);
  const map = buildLiaEngagementMap(analytics, {}, ["UK_GDPR"], "not_engaged_on_the_record");
  const dm = map.entries.find((e) => e.rule_id === "R_UK_ART_6_11_DIRECT_MARKETING")!;
  assertEquals(dm.status, "not_engaged");
  assert(!render(analytics).text.includes("recognises direct marketing"));
  const marketing = UK();
  marketing.stated_purpose = "Send direct marketing emails about new cycle ranges to existing customers.";
  const map2 = buildLiaEngagementMap(marketing, {}, ["UK_GDPR"], "undetermined_on_the_record");
  assertEquals(map2.entries.find((e) => e.rule_id === "R_UK_ART_6_11_DIRECT_MARKETING")!.status, "engaged");
});

// ── R10: the UK ePrivacy twin ───────────────────────────────────────────────

Deno.test("doc161 — the ePrivacy foreclosure sentence names PECR and Article 6(1)(f) UK GDPR on a UK-only record", () => {
  // DOC 189 (2026-09-05): both perfect fixtures now answer the device-access
  // pair (UK: "Yes" / "all strictly necessary" for the checkout's device
  // signals; EU: "No"), and an explicit answer outranks the cookie lexicon. To
  // exercise the FORECLOSURE sentence the record must say the access goes
  // further — the "Yes"/"No" pair a real cookie-tracking record would give.
  const goesFurther = { device_access: "Yes", device_access_strictly_necessary: "No — some or all of it goes further" };
  const uk = UK();
  uk.processing_description = `${uk.processing_description} Behavioural signals are collected through cookies and tracking pixels on the site.`;
  uk.purpose_details = { ...(uk.purpose_details as Record<string, unknown>), ...goesFurther };
  const gate = buildEprivacyShortCircuit(uk);
  assertEquals(gate.determination, "consent_requirement_engaged");
  assertStringIncludes(gate.application, LIA_EPRIVACY_RULE_SENTENCE_UK);
  assert(!gate.application.includes(LIA_EPRIVACY_RULE_SENTENCE));
  const eu = EU();
  eu.processing_description = `${eu.processing_description} Behavioural signals are collected through cookies and tracking pixels on the site.`;
  eu.purpose_details = { ...(eu.purpose_details as Record<string, unknown>), ...goesFurther };
  assertStringIncludes(buildEprivacyShortCircuit(eu).application, LIA_EPRIVACY_RULE_SENTENCE);
});

// ── R11: register bytes ─────────────────────────────────────────────────────

Deno.test("doc161 — the persuasive-authority lead reaches the page as written", () => {
  assertStringIncludes(LIA_PERSUASIVE_AUTHORITY_LEAD, "which turns on the facts the company has provided");
  const { text } = render(UK());
  assert(!text.includes("the information provided's own facts"));
  assertStringIncludes(text, "which turns on the facts the company has provided");
});

// ── Form, instrument, and the whole golden set ──────────────────────────────

Deno.test("doc161 — rail entries exist for the five verdict-driving questions", () => {
  for (const k of ["controller_is_public_authority", "public_task_processing", "reasonable_expectation", "children_data_subjects", "potential_harm"]) {
    assert(LIA_RAIL[k], `rail entry ${k}`);
    assert(LIA_RAIL[k].coachLead.length > 0);
  }
});

Deno.test("doc161 — grader instrument carries the LIA law-map amendment", () => {
  assert(GRADER_CONTEXT_VERSION.includes("+lia-law-map-2026-09-03"), GRADER_CONTEXT_VERSION);
  assert(GRADER_CONTEXT_VERSION.startsWith("gc-2026-08-28-skeleton-cal-3-item204["));
});

Deno.test("doc161 — every golden record renders register-clean, lead-coherent, without seams", () => {
  for (const g of [...LIA_GOLDEN, ...LIA_PERFECT, ...LIA_PERFECT_PINNED]) {
    const { sk, text } = render(clone(g.intake));
    assertEquals(sk.register_findings.length, 0, `${g.id}: ${JSON.stringify(sk.register_findings)}`);
    assertEquals(sk.lead_coherence.length, 0, `${g.id}: ${JSON.stringify(sk.lead_coherence)}`);
    assert(!text.includes(".."), `${g.id}: double stop`);
    assert(!text.includes("[\""), `${g.id}: JSON array in prose`);
    assert(!/the information provided's/.test(text), `${g.id}: possessive register artefact`);
  }
});
