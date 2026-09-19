// DOC 275 §19.1 rows 9 & 11 (CEO-approved 2026-09-19) — wiring two answered
// intake questions into the deterministic three-part test:
//
//   Row 9  necessity_details.achievable_without_personal_data — the
//   necessity limb ITSELF (Article 6(1)(f) step 2): "Yes" is the Company's
//   own affirmative statement that the purpose could be achieved without
//   personal data, so processing personal data is not necessary for it
//   (EDPB Guidelines 3/2019 ¶24; EDPB Opinion 28/2024 ¶73–74; CJEU
//   C-621/22 KNLTB). "No" leaves the alternatives-comparison verdict as
//   before and quotes the Company's own rationale onto the necessity
//   analysis. "Not assessed"/blank changes nothing already covered by the
//   existing corpus rule lia/rule/necessity-anonymised-alternative
//   (product_improvement / research_analytics record classes); every other
//   class gets a fresh information_needed ask instead of silence.
//
//   Row 11 purpose_details.stated_purpose_status — bears on the BALANCING
//   step through reasonable expectations (Recital 47: what the data
//   subject has been told), never on any of the three limbs directly.
//   "Published…" only SUPPORTS the expectations finding; it never flips a
//   verdict. The two unpublished answers add a warning sentence and a
//   numbered Section V condition, never a failing verdict on this field
//   alone.
//
// These tests pin both wirings on the typed surfaces, the rendered
// determination, and (row 11) the numbered-conditions block.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildThreePartTestTyped,
  necessityVerdict,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import {
  attachLiaDeliverables,
  buildDetermination,
  buildReasonableExpectations,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { attachLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { attachPrecedentClassPosture } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";
import {
  collectLiaConditions,
  composeLiaConditionsBlock,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { LIA_PERFECT_PINNED } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia-perfect-pinned.ts";

type Bag = Record<string, unknown>;

/** The deterministic path's attach order (mirrors doc142-lia-necessity-state.test.ts). */
function typedReportFor(intake: Bag): Bag {
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  report.three_part_test = typed.three_part_test;
  if (typed.determination_override) report.lia_determination = typed.determination_override;
  report.information_needed = typed.information_needed;
  return report;
}

/** LIA_PERFECT_PINNED[0] already answers both fields ("No" with a rationale,
 * "Published…"); tests mutate a clone rather than relying on the base
 * shape staying exactly as-is. */
function baseIntake(): Bag {
  return structuredClone(LIA_PERFECT_PINNED[0].intake) as Bag;
}

const NECESSITY_FAILS_SENTENCE =
  "The Company states that this purpose could be achieved without personal data. " +
  "Processing personal data is therefore not necessary for it, and Article 6(1)(f) is not available on that basis.";

// ── Row 9 — "Yes" fails necessity. ──────────────────────────────────────────

Deno.test("doc275 row 9 — achievable_without_personal_data 'Yes' fails necessityVerdict directly", () => {
  const intake = baseIntake();
  (intake.necessity_details as Bag).achievable_without_personal_data =
    "Yes — the purpose could be achieved without personal data, or with anonymised or synthetic data";
  const report = typedReportFor(intake);
  const u4 = {
    alternatives_considered: report.alternatives_considered,
  } as unknown as Parameters<typeof necessityVerdict>[0];
  assertEquals(necessityVerdict(u4, intake), "fails");
});

Deno.test("doc275 row 9 — 'Yes' renders the necessity-fails sentence and fails the typed necessity_test", () => {
  const intake = baseIntake();
  (intake.necessity_details as Bag).achievable_without_personal_data =
    "Yes — the purpose could be achieved without personal data, or with anonymised or synthetic data";
  const report = typedReportFor(intake);
  const nec = (report.three_part_test as Bag).necessity_test as Bag;
  assertEquals(nec.verdict, "fails");
  assertEquals(nec.analysis, NECESSITY_FAILS_SENTENCE);
  assertStringIncludes(
    (nec.risk_factors as string[]).join(" "),
    "personal data is not necessary",
  );
});

Deno.test("doc275 row 9 — 'Yes' flows to the overall determination as not available, with no mitigation for necessity", () => {
  const intake = baseIntake();
  (intake.necessity_details as Bag).achievable_without_personal_data =
    "Yes — the purpose could be achieved without personal data, or with anonymised or synthetic data";
  const report = typedReportFor(intake);
  const det = report.lia_determination as Bag;
  assertEquals(det.outcome, "legitimate_interests_not_available");
  assert(
    (det.driving_factors as string[]).includes("necessity"),
    "necessity must be a driving factor of the not-available outcome",
  );
  assertStringIncludes(
    String(det.why),
    "the Company states that this purpose could be achieved without personal data",
  );
  const necMitigation = (det.mitigations as Bag[]).find((m) => m.factor === "necessity");
  assertEquals(necMitigation, undefined, "a defeated necessity limb takes no mitigation — no mitigation reaches the point");
  // Never degraded to the mitigatable outcome the general `failing.length > 0`
  // branch would otherwise produce.
  assert(det.outcome !== "available_only_with_mitigations");
});

Deno.test("doc275 row 9 — buildDetermination alone (unit-level): necessity fails independent of every other limb passing", () => {
  const intake = baseIntake();
  (intake.necessity_details as Bag).achievable_without_personal_data =
    "Yes — the purpose could be achieved without personal data, or with anonymised or synthetic data";
  const expectations = buildReasonableExpectations(intake);
  const report = typedReportFor(intake);
  const det = buildDetermination(
    intake,
    expectations,
    report.child_factor as never,
    report.public_authority_exclusion as never,
  );
  assertEquals(det.outcome, "legitimate_interests_not_available");
});

// ── Row 9 — "No" quotes the rationale. ──────────────────────────────────────

Deno.test("doc275 row 9 — 'No' with a rationale quotes it verbatim onto the necessity analysis, verdict unaffected", () => {
  const intake = baseIntake();
  const rationale = "Because this fixture's own rationale text is quoted, not paraphrased.";
  (intake.necessity_details as Bag).achievable_without_personal_data =
    "No — personal data is required (explain why below)";
  (intake.necessity_details as Bag).achievable_without_personal_data_rationale = rationale;
  const report = typedReportFor(intake);
  const nec = (report.three_part_test as Bag).necessity_test as Bag;
  assertStringIncludes(
    String(nec.analysis),
    `The Company explains why personal data is required: “${rationale}”.`,
  );
  // The alternatives comparison, not this field, still decides the verdict.
  assert(nec.verdict === "passes" || nec.verdict === "uncertain");
});

Deno.test("doc275 row 9 — 'No' with a blank rationale drops the quote sentence rather than rendering an empty quote", () => {
  const intake = baseIntake();
  (intake.necessity_details as Bag).achievable_without_personal_data =
    "No — personal data is required (explain why below)";
  (intake.necessity_details as Bag).achievable_without_personal_data_rationale = "";
  const report = typedReportFor(intake);
  const nec = (report.three_part_test as Bag).necessity_test as Bag;
  assertEquals(String(nec.analysis).includes('The Company explains why personal data is required: “”'), false);
  assertEquals(String(nec.analysis).includes("The Company explains why personal data is required"), false);
});

// ── Row 9 — "Not assessed"/blank: no duplicate ask where the corpus rule covers it. ──

Deno.test("doc275 row 9 — 'Not assessed' on a product_improvement record does not duplicate the corpus rule's own ask", () => {
  const intake = baseIntake();
  // LIA_PERFECT_PINNED[0] is already use_case_code_confirmed: product_improvement.
  assertEquals(intake.use_case_code_confirmed, "product_improvement");
  (intake.necessity_details as Bag).achievable_without_personal_data = "Not assessed";
  (intake.necessity_details as Bag).achievable_without_personal_data_rationale = "";
  const report = typedReportFor(intake);
  const typed = buildThreePartTestTyped(report, intake);
  const dims = typed.information_needed.map((i) => String((i as Bag).dimensions));
  const achievableAsks = dims.filter((d) => /achieved without personal data/i.test(d));
  assertEquals(
    achievableAsks.length,
    0,
    "three-part-test-typed.ts must not add its own ask for a class the corpus rule already covers",
  );
});

Deno.test("doc275 row 9 — 'Not assessed' on a non-covered record class adds the ask once", () => {
  const intake = baseIntake();
  intake.use_case_code_confirmed = "fraud_prevention";
  (intake.necessity_details as Bag).achievable_without_personal_data = "Not assessed";
  (intake.necessity_details as Bag).achievable_without_personal_data_rationale = "";
  const report = typedReportFor(intake);
  const typed = buildThreePartTestTyped(report, intake);
  const dims = typed.information_needed.map((i) => String((i as Bag).dimensions));
  const achievableAsks = dims.filter((d) => /achieved without personal data/i.test(d));
  assertEquals(achievableAsks.length, 1);
});

Deno.test("doc275 row 9 — blank (unanswered) is treated the same as 'Not assessed'", () => {
  const intake = baseIntake();
  intake.use_case_code_confirmed = "fraud_prevention";
  (intake.necessity_details as Bag).achievable_without_personal_data = "";
  (intake.necessity_details as Bag).achievable_without_personal_data_rationale = "";
  const report = typedReportFor(intake);
  const nec = (report.three_part_test as Bag).necessity_test as Bag;
  assert(nec.verdict !== "fails", "a blank answer must never fail necessity — only an affirmative Yes does");
  const typed = buildThreePartTestTyped(report, intake);
  const dims = typed.information_needed.map((i) => String((i as Bag).dimensions));
  assert(dims.some((d) => /achieved without personal data/i.test(d)));
});

// ── Row 11 — stated_purpose_status bears on reasonable expectations. ───────

Deno.test("doc275 row 11 — 'Published…' supports the expectations finding without changing its verdict", () => {
  const publishedIntake = baseIntake();
  (publishedIntake.purpose_details as Bag).stated_purpose_status = "Published in our current privacy notice";
  const published = buildReasonableExpectations(publishedIntake);

  const unansweredIntake = baseIntake();
  delete (unansweredIntake.purpose_details as Bag).stated_purpose_status;
  const unanswered = buildReasonableExpectations(unansweredIntake);

  // Same verdict either way — the field only supports, it never decides.
  assertEquals(published.verdict, unanswered.verdict);
  assertStringIncludes(
    published.application,
    "The purpose is published in the Company's current privacy notice, which supports the expectation.",
  );
  assert(
    !unanswered.application.includes("supports the expectation"),
    "an unanswered status must not fabricate support",
  );
});

for (
  const status of [
    "Proposed wording — not yet published",
    "Not yet drafted",
  ] as const
) {
  Deno.test(`doc275 row 11 — '${status}' adds the warning sentence and a Section V condition, verdict unaffected`, () => {
    const publishedIntake = baseIntake();
    (publishedIntake.purpose_details as Bag).stated_purpose_status = "Published in our current privacy notice";
    const publishedVerdict = buildReasonableExpectations(publishedIntake).verdict;

    const intake = baseIntake();
    (intake.purpose_details as Bag).stated_purpose_status = status;
    const expectations = buildReasonableExpectations(intake);

    // The field alone never flips a passing expectations verdict to failing.
    assertEquals(expectations.verdict, publishedVerdict);
    assertStringIncludes(
      expectations.application,
      "The purpose is not yet published to the people concerned, so it does not yet support their expectation; the Company should publish it before relying on legitimate interests.",
    );

    const report = typedReportFor(intake);
    const typed = buildThreePartTestTyped(report, intake);
    const condition = typed.information_needed.find((i) =>
      String((i as Bag).dimensions).startsWith("Publish the stated purpose in the privacy notice")
    ) as Bag | undefined;
    assert(condition, "the publish condition must be present in information_needed");
    assertEquals(condition!.provision, "GDPR Arts. 13(1)(c), 14(1)(c)");
    assertEquals(condition!.enables, "the balancing test");

    // And it renders as a numbered condition through the same mechanism the
    // skeleton uses (collectLiaConditions / composeLiaConditionsBlock).
    report.information_needed = typed.information_needed;
    const conditions = collectLiaConditions(report, []);
    const block = composeLiaConditionsBlock(conditions);
    assertStringIncludes(block, "Publish the stated purpose in the privacy notice before relying on legitimate interests.");
    assertStringIncludes(block, "GDPR Arts. 13(1)(c), 14(1)(c)");
    assertStringIncludes(block, "This completes the balancing test.");
  });
}

Deno.test("doc275 row 11 — determination outcome never turns on stated_purpose_status alone", () => {
  const publishedIntake = baseIntake();
  (publishedIntake.purpose_details as Bag).stated_purpose_status = "Published in our current privacy notice";
  const publishedOutcome = (typedReportFor(publishedIntake).lia_determination as Bag).outcome;

  const draftIntake = baseIntake();
  (draftIntake.purpose_details as Bag).stated_purpose_status = "Not yet drafted";
  const draftOutcome = (typedReportFor(draftIntake).lia_determination as Bag).outcome;

  assertEquals(publishedOutcome, draftOutcome);
});
