// PROMPT 9J (CEO-ruled 2026-08-16) — QUOTE-THE-SPAN-THAT-MATCHED.
//
// Assembled-document sentinels (the 9I.1 pattern): the impact quote must be the
// span that actually matched IMPACT_LEXICON, never the first clause of the
// whole necessity_proportionality field.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildDpiaDeliverables,
  buildProportionality,
  IMPACT_LEXICON,
  impactSpan,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { assembleDpiaSkeletonDocument, boundedClause } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { DPIA_PERFECT_PINNED } from "../../../supabase/functions/_shared/golden/dpia-perfect-pinned.ts";
import { checkPerfectDpiaIntake } from "../../../supabase/functions/_shared/quality/perfect-closed-loop.ts";
import { matchRatifiedTemplate } from "../../../supabase/functions/run-quality-batch/_local/grader/skeleton-calibration.shared.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

const seam = (v: unknown) => String(v ?? "").replace(/[.!?]+$/, "");


const QUOTE_BOUND = 400;
const intakeOf = (f: Any) => f.intake ?? f.intake_data ?? f;
const FIXTURES = (DPIA_PERFECT_PINNED as Any[]).map(intakeOf);

function s3Paras(intake: Any): string[] {
  const report = buildDpiaDeliverables(intake) as Any;
  const { document } = assembleDpiaSkeletonDocument(report, intake);
  const sec = document.sections.find((x: Any) => x.id === "section_3_necessity_proportionality")!;
  return sec.paragraphs.map((p: Any) => String(p.text ?? ""));
}

Deno.test("9J — impactSpan returns the first IMPACT_LEXICON sentence, clause-bounded", () => {
  const text =
    "Underwriting each application individually is necessary to price risk accurately. " +
    "Applicants are subject to an automated pricing decision they cannot avoid once they apply.";
  const span = impactSpan(text);
  assert(!span.startsWith("Underwriting each application individually"), span);
  assert(IMPACT_LEXICON.some((r) => r.test(span)), span);
  assertEquals(impactSpan("Nothing here argues either side."), "");
  assertEquals(impactSpan(""), "");
});

Deno.test("9J — every pinned fixture's impact quote matches the lexicon and is not the necessity opening", () => {
  for (const intake of FIXTURES) {
    const combined = [String(intake.necessity_proportionality ?? ""), String(intake.data_minimisation_justification ?? "")]
      .filter(Boolean).join(" ");
    const necessityOpening = boundedClause(combined);
    for (const p of buildProportionality(intake) as Any[]) {
      const quote = String(p.impact_argument ?? "");
      if (!quote || quote === "Not stated") continue;
      assert(IMPACT_LEXICON.some((r) => r.test(quote)), `no impact language: ${quote}`);
      if (necessityOpening) {
        assert(quote !== necessityOpening, `impact quote is the necessity opening: ${quote}`);
      }
      assert(quote.length <= QUOTE_BOUND, `${quote.length}: ${quote.slice(0, 80)}`);
    }
  }
});

Deno.test("9J — Harrowgate secondary operation quotes ITS OWN impact statement", () => {
  const harrowgate = FIXTURES.find((f) =>
    JSON.stringify(f).includes("Quarterly portfolio pricing calibration")
  )!;
  assert(harrowgate, "Harrowgate fixture missing");
  const props = buildProportionality(harrowgate) as Any[];
  const secondary = props.find((p) => p.operation_id === "op_secondary")!;
  assert(secondary, "secondary operation missing");
  const secondaryText = String(harrowgate.secondary_uses ?? "");
  // 9K item 1 — stored spans are TERMINATED; consumers strip at the quote seam.
  assert(secondaryText.includes(seam(secondary.impact_argument)), secondary.impact_argument);
  const primary = props.find((p) => p.operation_id === "op_primary")!;
  assert(primary.impact_argument !== secondary.impact_argument, "secondary reuses the primary quote");
});

Deno.test("9J — §3 impact paragraphs quote the span, and every §3 quote stays bounded", () => {
  for (const intake of FIXTURES) {
    const paras = s3Paras(intake);
    const impacts = paras.filter((p) => p.startsWith("The impact on individual privacy rights is stated by the company separately from the benefit:"));
    for (const p of impacts) {
      const m = p.match(/"([^"]+)"/);
      assert(m, p);
      assert(IMPACT_LEXICON.some((r) => r.test(m![1])), m![1]);
      assert(m![1].length <= QUOTE_BOUND, `${m![1].length}`);
    }
    for (const m of paras.join("\n").matchAll(/"([^"]+)"/g)) {
      assert(m[1].length <= QUOTE_BOUND, `${m[1].length}: ${m[1].slice(0, 80)}`);
    }
  }
});

Deno.test("9J — proportionality verdicts are byte-identical to the pre-9J pins", () => {
  const seen = FIXTURES.map((f) => (buildProportionality(f) as Any[]).map((p) => p.verdict));
  for (const verdicts of seen) {
    for (const v of verdicts) {
      assert(
        ["proportionate_on_the_record", "disproportionate_on_the_record", "undetermined_on_the_record"].includes(v),
        v,
      );
    }
  }
  // The pinned perfect fixtures all argue both sides and record safeguards.
  for (const verdicts of seen) assert(verdicts.every((v) => v === "proportionate_on_the_record"), verdicts.join(","));
});

Deno.test("9J — pin guard: every pinned perfect fixture still passes the closed-loop check", () => {
  for (const f of FIXTURES) {
    const res = checkPerfectDpiaIntake(f);
    assert(res.ok, JSON.stringify(res));
  }
});

Deno.test("9J item 2 — the elided run-2b21e54a scoring-head quotation now matches cal_skeleton_1", () => {
  const ev =
    '[kind=generated] Section 4: "Unauthorised access to, or disclosure of, the personal data held is assessed at ' +
    'Unlikely likelihood and Significant severity... Loss of control over the data in the processor chain is assessed ' +
    'at Unlikely likelihood and Moderate severity..." The risk analysis applies pre-set taxonomy labels but the ' +
    "generated prose does not explain WHY each rating was assigned.";
  assertEquals(matchRatifiedTemplate(ev), "tmpl_risk_scoring_head");
});

Deno.test("9J item 2 — elision tolerance does not make the matcher fuzzy", () => {
  assertEquals(matchRatifiedTemplate("The risk is rated likely and severe under our internal taxonomy..."), null);
  assertEquals(matchRatifiedTemplate("Some unrelated prose with an ellipsis..."), null);
});
