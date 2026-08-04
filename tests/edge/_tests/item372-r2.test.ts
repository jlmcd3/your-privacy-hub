// ITEM 372 — SECOND CORRECTION ROUND, VERIFICATION BATTERY.
//
// One degraded fixture carrying every defect the CEO's post-pilot batches
// (messy 6e63a995 + clean d6cb1e27) surfaced, run through the pipeline's
// deterministic passes in production order, then measured against the
// verification counts the dispatch asks for:
//   placeholder tokens in the determination        → 0
//   neutral scaffold repeats                       → within the pool floor
//   "on the record"                                → 0
//   bare enforcement tags                          → 0
//   brackets in prose                              → 0
//   bare advisory closes                           → 0

import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { applyBracketTagPass, countProseInterruptions } from "../../../supabase/functions/_shared/prose/bracket-tags.ts";
import {
  applyEnforcementTagGate,
  countEnforcementTags,
  renderedEnforcementIds,
} from "../../../supabase/functions/_shared/prose/enforcement-tag-gate.ts";
import {
  applyAdvisoryCloseRepair,
  countBareAdvisoryCloses,
  isBareAdvisoryClose,
} from "../../../supabase/functions/_shared/prose/advisory-close-repair.ts";
import { applyInferredGeneralisation } from "../../../supabase/functions/_shared/prose/inferred-generalisation.ts";
import { buildDeterminationBlock } from "../../../supabase/functions/_shared/report-exhibits/determination.ts";
import { hasPlaceholderToken, rollUpAskCategories } from "../../../supabase/functions/_shared/prose/ask-categories.ts";
import { GENERIC_ABSENCE } from "../../../supabase/functions/_shared/prose/frame-substitution.ts";
import { lintScaffoldPool, MIN_SCAFFOLD_POOL_SIZE } from "../../../supabase/functions/_shared/prose/register-lint.ts";

function degradedReport() {
  return {
    executive_summary:
      "The controller operates a loyalty programme. The assessment date is [DD/MM/YYYY]. Risks are recorded below.",
    framework_disclaimer: "This framework follows the EDPB DPIA template v1.0.",
    information_needed: [
      { dimensions: "The retention period for the loyalty records has not been stated." },
      { dimensions: "[TO COMPLETE — controller legal name]" },
      { dimensions: "No accountability owner is named for the programme." },
      { dimensions: "DD/MM/YYYY" },
    ],
    has_unresolved_placeholders: true,
    annotations: [{ id: "E1", subject: "Alpha Retail", regulator: "CNIL" }],
    section_1_description: {
      processed_personal_data: [
        {
          item: "Behavioural data",
          explanation:
            "Inferred engagement signals, e.g. portal login frequency, wishlist additions and abandoned-cart events.",
          source: { basis: "inferred" },
        },
        {
          item: "Contact data",
          explanation: "Stated in intake, such as email address.",
          source: { basis: "stated" },
        },
      ],
    },
    section_2_analysis: {
      lawfulness:
        "The French regulator has fined comparable loyalty operators [E1]. A similar Spanish action is also relevant [E7]. The retention position is unclear [E3, E9].",
      security:
        "The record does not state the encryption arrangements [TO BE ASSESSED]. Further clarification is advisable.",
      transfers: "Further clarification is advisable.",
    },
    section_6_conclusion: { decision: "Draft — must not be signed." },
  };
}

Deno.test("r2 (1) determination enumerates categories, never placeholder tokens", () => {
  const report = degradedReport();
  const block = buildDeterminationBlock({ report, organizationName: "Alpha Retail SAS" });
  assert(block, "determination must build");
  const text = block!.paragraphs.join(" ");

  assertEquals(hasPlaceholderToken(text), false, `placeholder token leaked: ${text}`);
  assert(!/DD\/MM\/YYYY/i.test(text));
  assert(!/\[TO COMPLETE/i.test(text));
  // Counsel-language categories, not raw ask strings.
  assert(block!.missing_foundations.length > 0);
  assert(block!.missing_foundations.length <= 6, "roll-up caps at six categories");
  for (const f of block!.missing_foundations) {
    assertEquals(hasPlaceholderToken(f), false);
    assert(!/^\[/.test(f), `raw ask string survived: ${f}`);
  }
});

Deno.test("r2 (1) roll-up de-duplicates and drops token-only asks", () => {
  const cats = rollUpAskCategories([
    "The retention period is not stated.",
    "Retention schedule missing for the same records.",
    "DD/MM/YYYY",
    "[TO COMPLETE]",
  ]);
  assertEquals(cats.some((c) => hasPlaceholderToken(c.label)), false);
  const ids = cats.map((c) => c.id);
  assertEquals(new Set(ids).size, ids.length, "categories are unique");
});

Deno.test("r2 (3) neutral scaffold pool is on-register and wide enough", () => {
  const report = lintScaffoldPool("frame_substitution.generic_absence", GENERIC_ABSENCE, {
    enforceSize: true,
  });
  assertEquals(
    GENERIC_ABSENCE.filter((s) => /on the record/i.test(s)).length,
    0,
    "'on the record' must be gone from the neutral pool",
  );
  assert(
    report.size >= MIN_SCAFFOLD_POOL_SIZE,
    `pool has ${report.size} distinct sentences, floor is ${MIN_SCAFFOLD_POOL_SIZE}`,
  );
  assertEquals(report.duplicates.length, 0);
  assertEquals(
    report.clean,
    true,
    `scaffold pool findings: ${JSON.stringify(report.findings, null, 2)}`,
  );
});

Deno.test("r2 (4) cite-or-strip: only tags whose items render survive", () => {
  const report = degradedReport();
  assertEquals(renderedEnforcementIds(report), ["E1"]);
  const c = applyEnforcementTagGate(report);
  const prose = report.section_2_analysis.lawfulness;

  assertStringIncludes(prose, "[E1]");
  assert(!/E7/.test(prose), "E7 renders nowhere and must be stripped");
  assert(!/E3|E9/.test(prose), "E3/E9 render nowhere and must be stripped");
  assertEquals(c.stripped, 2);
  assertEquals(c.kept, 1);
  // No dangling punctuation left behind.
  assert(!/\s+\./.test(prose), `punctuation artefact: ${prose}`);
});

Deno.test("r2 (4) with no rendering annotations, every tag goes", () => {
  const report = degradedReport();
  report.annotations = [];
  applyEnforcementTagGate(report);
  assertEquals(countEnforcementTags(report), 0);
});

Deno.test("r2 (6) bare advisory close is named or removed", () => {
  assertEquals(isBareAdvisoryClose("Further clarification is advisable."), true);
  assertEquals(
    isBareAdvisoryClose(
      "The record does not state who owns the retention schedule, and further clarification is advisable.",
    ),
    false,
  );

  const report = degradedReport();
  const c = applyAdvisoryCloseRepair(report);
  assertEquals(c.bare_remaining, 0, "no bare advisory close may ship");
  assert(c.bare >= 1);
  assertEquals(countBareAdvisoryCloses(report), 0);
});

Deno.test("r2 (7) inferred rows lose unsupported examples, stated rows untouched", () => {
  const report = degradedReport();
  const intake = { data_categories: "email address, loyalty card number" };
  const c = applyInferredGeneralisation(report, intake);

  const inferred = report.section_1_description.processed_personal_data[0];
  const stated = report.section_1_description.processed_personal_data[1];

  assertEquals(c.inferred_rows, 1);
  assert(c.enumerations_removed >= 1);
  assert(!/portal login frequency/i.test(inferred.explanation), inferred.explanation);
  assert(!/abandoned-cart/i.test(inferred.explanation), inferred.explanation);
  assertStringIncludes(inferred.explanation, "Inferred engagement signals");
  assert(/[.!?]$/.test(inferred.explanation), "row still ends as a sentence");
  // A stated row is never generalised.
  assertStringIncludes(stated.explanation, "email address");
});

Deno.test("r2 (8) residual bracket forms route out of prose", () => {
  const report = {
    section_2_analysis: {
      a: "The transfer mechanism is [TBD] for the US importer.",
      b: "The review date is [DD/MM/YYYY].",
      c: "The processor list is [AWAITING confirmation from procurement].",
      d: "The owner is [PLACEHOLDER].",
    },
    information_needed: [] as unknown[],
  };
  applyBracketTagPass(report as never);
  assertEquals(countProseInterruptions(report), 0, JSON.stringify(report.section_2_analysis));
});

Deno.test("r2 full-order integration: every verification count is zero", () => {
  const report = degradedReport();
  const intake = { data_categories: "email address" };

  // Production order.
  applyBracketTagPass(report as never);
  applyInferredGeneralisation(report as never, intake);
  applyAdvisoryCloseRepair(report as never);
  applyEnforcementTagGate(report as never);
  const determination = buildDeterminationBlock({ report, organizationName: "Alpha Retail SAS" });

  assertEquals(countProseInterruptions(report), 0, "brackets in prose");
  assertEquals(countBareAdvisoryCloses(report), 0, "bare advisory closes");
  assertEquals(
    countEnforcementTags(JSON.stringify(report.section_2_analysis)),
    1,
    "only the rendering tag survives",
  );
  assertEquals(/on the record/i.test(JSON.stringify(report)), false, "'on the record'");
  assert(determination, "determination present");
  assertEquals(hasPlaceholderToken(determination!.paragraphs.join(" ")), false, "placeholders");
});
