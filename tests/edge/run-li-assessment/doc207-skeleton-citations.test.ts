// DOC 207 TRACK 3b — RENDERING. Pins `renderRuleClause` (the test-lead
// clause), the determinative/contrary split in `buildLiaPersuasiveAuthority`,
// and the Table of Authorities pin: a fired rule's `authority_citation`
// reaches the body at least once and the ToA exactly once. `report.
// rule_applications` is built here as plain literal objects (the shape
// rule-interpreter.ts's `RuleApplication` documents) — this file is testing
// the RENDERER's consumption of that shape, not the interpreter or the
// rule-pass adapter (already exhaustively covered by
// tests/edge/corpus/rule-interpreter.test.ts and doc207-rule-pass.test.ts).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildThreePartTestTyped, buildDocumentationTyped } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import { attachLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { attachLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { attachPrecedentClassPosture } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";
import { assembleLiaSkeletonDocument } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import {
  buildLiaPersuasiveAuthority,
  LIA_PERSUASIVE_AUTHORITY_LEAD,
  LIA_PERSUASIVE_AUTHORITY_LEAD_WITH_RULES,
  LIA_RULES_LEAD_RATIFIED,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-persuasive-authority.ts";
import { LIA_PERFECT_PINNED } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia-perfect-pinned.ts";

type Bag = Record<string, unknown>;

/** The deterministic path's attach order, reproduced for the harness
 *  (same shape as l1-l3-deterministic.test.ts's typedReportFor). */
function typedReportFor(intake: Bag): Bag {
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  report.three_part_test = typed.three_part_test;
  if (typed.determination_override) report.lia_determination = typed.determination_override;
  report.information_needed = typed.information_needed;
  report.documentation_recommendations = buildDocumentationTyped(report, "Test disclaimer.");
  return report;
}

// The known LinkedIn (DPC, Ireland) source row — one of the four ratified
// AP rows the L2 battery already proves renders for LIA_PERFECT_PINNED[0]
// (l1-l3-deterministic.test.ts "L2 — the Persuasive Authority section
// renders the four ratified decisions with a ToA trail").
const LINKEDIN_SOURCE_ROW_ID = "69eee35f-a280-47be-8159-bf778767ff31";

function determinativeFixture(overrides: Partial<Bag> = {}): Bag {
  return {
    rule_id: "test/determinative-balancing",
    effect: { kind: "cap_verdict", element: "balancing", max: "likely_fails" },
    before: "likely_passes",
    after: "likely_fails",
    changed: true,
    concurred: false,
    reason_sentence: "Test determinative reason sentence for the balancing finding.",
    authority_citation: "GDPR, Test Determinative Citation Art. 99",
    sources: [{ table: "enforcement_actions", row_id: LINKEDIN_SOURCE_ROW_ID }],
    ...overrides,
  };
}

function flagRiskFixture(): Bag {
  return {
    rule_id: "test/flag-risk-purpose",
    effect: { kind: "flag_risk", element: "purpose", text: "Some risk text for information_needed purposes." },
    changed: true,
    concurred: false,
    reason_sentence: "Test flag-risk reason sentence for the purpose finding.",
    authority_citation: "EDPB Guidance, Test Flag-Risk Citation",
    sources: [{ table: "regulatory_guidance", row_id: "test-flag-row" }],
  };
}

function contraryAuthorityFixture(): Bag {
  return {
    rule_id: "test/contrary-authority",
    effect: { kind: "recognise_interest", element: "balancing", value: "likely_passes" },
    changed: false,
    concurred: false,
    suppressed_by: "test/determinative-balancing",
    contrary_authority: true,
    reason_sentence: "Test contrary-authority reason sentence.",
    authority_citation: "Some Contrary Authority Citation",
    sources: [{ table: "enforcement_actions", row_id: "test-contrary-row" }],
  };
}

function sectionSlice(text: string, startTitle: string, endTitle: string): string {
  const start = text.indexOf(startTitle);
  assert(start >= 0, `section "${startTitle}" not found`);
  const end = text.indexOf(endTitle, start + startTitle.length);
  assert(end >= 0, `section "${endTitle}" not found after "${startTitle}"`);
  return text.slice(start, end);
}

// ── Lead bytes unchanged while LIA_RULES_LEAD_RATIFIED = false ──────────

Deno.test("LIA_RULES_LEAD_RATIFIED is false; LIA_PERSUASIVE_AUTHORITY_LEAD stays byte-identical to its ratified form", () => {
  assertEquals(LIA_RULES_LEAD_RATIFIED, false);
  assertEquals(
    LIA_PERSUASIVE_AUTHORITY_LEAD,
    "This section collects enforcement decisions issued under the GDPR or UK GDPR that bear on factors assessed in this report. Each entry names the factor it bears on. They are enforcement context, persuasive rather than binding as to this processing, and none decides the outcome recorded above, which turns on the facts the company has provided.",
  );
  assert(LIA_PERSUASIVE_AUTHORITY_LEAD_WITH_RULES.length > 0);
  assert((LIA_PERSUASIVE_AUTHORITY_LEAD_WITH_RULES as string) !== (LIA_PERSUASIVE_AUTHORITY_LEAD as string));
});

Deno.test("buildLiaPersuasiveAuthority renders the byte-frozen lead even with determinative applications present, while the flag is false", () => {
  const report = typedReportFor(LIA_PERFECT_PINNED[0].intake as Bag);
  report.rule_applications = [determinativeFixture()];
  const result = buildLiaPersuasiveAuthority(report, false, { intake: LIA_PERFECT_PINNED[0].intake as Bag });
  assertStringIncludes(result.body, LIA_PERSUASIVE_AUTHORITY_LEAD);
  assert(!result.body.includes(LIA_PERSUASIVE_AUTHORITY_LEAD_WITH_RULES));
});

// ── renderRuleClause — the clause lands in the right section ─────────────

Deno.test("a purpose-element application's clause renders inside Section II (Purpose Test) only", () => {
  const report = typedReportFor(LIA_PERFECT_PINNED[0].intake as Bag);
  report.rule_applications = [flagRiskFixture()];
  const sk = assembleLiaSkeletonDocument(report, LIA_PERFECT_PINNED[0].intake as Bag, { deterministic: true });
  const text = skeletonDocumentToText(sk.document);
  const purposeSection = sectionSlice(text, "II. The Purpose Test", "III. The Necessity Test");
  assertStringIncludes(purposeSection, "Test flag-risk reason sentence for the purpose finding.");
  assertStringIncludes(purposeSection, "EDPB Guidance, Test Flag-Risk Citation");
  const necessitySection = sectionSlice(text, "III. The Necessity Test", "IV. The Balancing Test");
  assert(!necessitySection.includes("Test flag-risk reason sentence"), "clause leaked into the necessity section");
  const balancingSection = sectionSlice(text, "IV. The Balancing Test", "V. Findings");
  assert(!balancingSection.includes("Test flag-risk reason sentence"), "clause leaked into the balancing section");
});

Deno.test("a balancing-element application's clause renders inside Section IV (Balancing Test) only", () => {
  const report = typedReportFor(LIA_PERFECT_PINNED[0].intake as Bag);
  report.rule_applications = [determinativeFixture()];
  const sk = assembleLiaSkeletonDocument(report, LIA_PERFECT_PINNED[0].intake as Bag, { deterministic: true });
  const text = skeletonDocumentToText(sk.document);
  const balancingSection = sectionSlice(text, "IV. The Balancing Test", "V. Findings");
  assertStringIncludes(balancingSection, "Test determinative reason sentence for the balancing finding.");
  assertStringIncludes(balancingSection, "GDPR, Test Determinative Citation Art. 99");
  const purposeSection = sectionSlice(text, "II. The Purpose Test", "III. The Necessity Test");
  assert(!purposeSection.includes("Test determinative reason sentence"), "clause leaked into the purpose section");
});

Deno.test("the model path (deterministic:false) never renders a rule clause, even with rule_applications present", () => {
  const report = typedReportFor(LIA_PERFECT_PINNED[0].intake as Bag);
  report.rule_applications = [determinativeFixture(), flagRiskFixture()];
  const sk = assembleLiaSkeletonDocument(report, LIA_PERFECT_PINNED[0].intake as Bag);
  const text = skeletonDocumentToText(sk.document);
  assert(!text.includes("Test determinative reason sentence"));
  assert(!text.includes("Test flag-risk reason sentence"));
});

// ── override_outcome — the determination section already renders `why`;
// the citation is appended there, not to a test lead. ───────────────────

Deno.test("an override_outcome application's citation is appended to the determination's why, in the findings section", () => {
  const report = typedReportFor(LIA_PERFECT_PINNED[0].intake as Bag);
  const overrideApp = {
    rule_id: "test/override-outcome",
    effect: { kind: "override_outcome", outcome: "legitimate_interests_not_available" },
    before: (report.lia_determination as Bag).outcome,
    after: "legitimate_interests_not_available",
    changed: true,
    concurred: false,
    reason_sentence: "Test override reason sentence.",
    authority_citation: "Test Override Authority Citation",
    sources: [{ table: "regulatory_guidance", row_id: "test-override-row" }],
  };
  report.rule_applications = [overrideApp];
  (report.lia_determination as Bag).why = `Test override reason sentence. ${(report.lia_determination as Bag).why}`;
  const sk = assembleLiaSkeletonDocument(report, LIA_PERFECT_PINNED[0].intake as Bag, { deterministic: true });
  const text = skeletonDocumentToText(sk.document);
  const findingsSection = sectionSlice(text, "V. Findings", "Authorities Cited");
  assertStringIncludes(findingsSection, "Test override reason sentence.");
  assertStringIncludes(findingsSection, "(Test Override Authority Citation.)");
});

// ── Determinative list precedes persuasive; a source never in both ──────

Deno.test("determinative entries precede the ranked persuasive candidates in the Persuasive Authority section", () => {
  const report = typedReportFor(LIA_PERFECT_PINNED[0].intake as Bag);
  report.rule_applications = [determinativeFixture()];
  const sk = assembleLiaSkeletonDocument(report, LIA_PERFECT_PINNED[0].intake as Bag, { deterministic: true });
  const text = skeletonDocumentToText(sk.document);
  const persuasiveSection = sectionSlice(text, "VI. Persuasive Authority", "Authorities Cited");
  const determinativeIdx = persuasiveSection.indexOf("Test determinative reason sentence for the balancing finding.");
  const persuasiveIdx = persuasiveSection.indexOf("CNIL (France), Cegedim");
  assert(determinativeIdx >= 0, "determinative entry not found");
  assert(persuasiveIdx >= 0, "a ranked persuasive entry not found");
  assert(determinativeIdx < persuasiveIdx, "determinative entry did not precede the ranked persuasive candidate");
});

Deno.test("a source cited as determinative is removed from the ranked persuasive candidates — never appears in both lists", () => {
  const report = typedReportFor(LIA_PERFECT_PINNED[0].intake as Bag);
  // Without any rule application, LinkedIn (DPC Ireland) is one of the four
  // ratified rows that renders as a plain persuasive entry (L2 battery).
  const withoutRule = buildLiaPersuasiveAuthority(report, false, { intake: LIA_PERFECT_PINNED[0].intake as Bag });
  assertStringIncludes(withoutRule.body, "DPC (Ireland), LinkedIn, decision of 22 October 2024 — persuasive authority");
  const plainOccurrences = withoutRule.body.split("DPC (Ireland), LinkedIn").length - 1;
  assertEquals(plainOccurrences, 1);

  // With a determinative rule citing that same source_row_id, the plain
  // persuasive entry is excluded entirely — the source now renders only as
  // the determinative entry, never both.
  report.rule_applications = [determinativeFixture()];
  const withRule = buildLiaPersuasiveAuthority(report, false, { intake: LIA_PERFECT_PINNED[0].intake as Bag });
  assertStringIncludes(withRule.body, "determinative: see balancing finding.");
  assert(
    !withRule.body.includes("LinkedIn"),
    "the LinkedIn CAM row still rendered as a plain persuasive entry alongside the determinative one",
  );
  assert(
    !withRule.body.includes("DPC (Ireland), LinkedIn, decision of 22 October 2024 — persuasive authority"),
    "LinkedIn rendered as BOTH determinative and plain persuasive",
  );
});

Deno.test("a suppressed favorable application (contrary_authority) renders in the persuasive list with the contrary-authority suffix", () => {
  const report = typedReportFor(LIA_PERFECT_PINNED[0].intake as Bag);
  report.rule_applications = [determinativeFixture(), contraryAuthorityFixture()];
  const result = buildLiaPersuasiveAuthority(report, false, { intake: LIA_PERFECT_PINNED[0].intake as Bag });
  assertStringIncludes(result.body, "Test contrary-authority reason sentence.");
  assertStringIncludes(result.body, "Some Contrary Authority Citation — contrary authority (persuasive)");
});

// ── ToA — a fired rule's authority_citation appears in the body >= 1 and
// in the ToA exactly once. ───────────────────────────────────────────────

Deno.test("pin — a fired rule's authority_citation appears in the body at least once and in the Table of Authorities exactly once", () => {
  const report = typedReportFor(LIA_PERFECT_PINNED[0].intake as Bag);
  report.rule_applications = [determinativeFixture(), flagRiskFixture()];
  const sk = assembleLiaSkeletonDocument(report, LIA_PERFECT_PINNED[0].intake as Bag, { deterministic: true });
  const text = skeletonDocumentToText(sk.document);

  const bodyEnd = text.indexOf("Authorities Cited");
  const body = text.slice(0, bodyEnd);
  const toa = text.slice(bodyEnd);

  for (const citation of ["GDPR, Test Determinative Citation Art. 99", "EDPB Guidance, Test Flag-Risk Citation"]) {
    const bodyOccurrences = body.split(citation).length - 1;
    assert(bodyOccurrences >= 1, `"${citation}" did not appear in the body`);
    const toaOccurrences = toa.split(citation).length - 1;
    assertEquals(toaOccurrences, 1, `"${citation}" appeared ${toaOccurrences} times in the ToA, expected exactly once`);
  }
});
