// PROMPT 9J.1 (CEO-ruled 2026-08-16) — CLAUSE-GRANULAR IMPACT SPAN.
//
// 9J selected sentence-granularly and bounded clause-granularly, so a match
// that lived in a sentence's SECOND clause (eu-complete / Helvetia) was
// selected and then bounded away, leaving the necessity head quoted.
// Assembled-document sentinels over ALL FOUR pins.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildDpiaDeliverables,
  buildProportionality,
  IMPACT_LEXICON,
  impactSpan,
} from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { assembleDpiaSkeletonDocument } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { boundedClause, splitClauses } from "../../../supabase/functions/_shared/ltp/clause-bound.ts";
import { DPIA_PERFECT_PINNED } from "../../../supabase/functions/_shared/golden/dpia-perfect-pinned.ts";
import { DPIA_PERFECT } from "../../../supabase/functions/_shared/golden/dpia.ts";
import { checkPerfectDpiaIntake } from "../../../supabase/functions/_shared/quality/perfect-closed-loop.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

const seam = (v: unknown) => String(v ?? "").replace(/[.!?]+$/, "");


const QUOTE_BOUND = 400;
const intakeOf = (f: Any) => f.intake ?? f.intake_data ?? f;
const PINS: Any[] = [...(DPIA_PERFECT as Any[]), ...(DPIA_PERFECT_PINNED as Any[])];
const FIXTURES = PINS.map(intakeOf);

// The recorded defect, verbatim: the Helvetia necessity head that must never
// again be rendered as an impact quote.
const HELVETIA_NECESSITY_HEAD =
  "The occupational-health team needs the certified diagnosis category to set duty adjustments";

const matchesImpact = (t: string) => IMPACT_LEXICON.some((r: RegExp) => r.test(t));

function impactParas(intake: Any): string[] {
  const { document } = assembleDpiaSkeletonDocument(buildDpiaDeliverables(intake) as Any, intake);
  const sec = document.sections.find((x: Any) => x.id === "section_3_necessity_proportionality")!;
  return (sec.paragraphs as Any[])
    .map((p) => String(p.text ?? ""))
    .filter((t) => t.startsWith("The impact on individual privacy rights is stated by the company separately from the benefit:"));
}

Deno.test("9J.1 — splitClauses is the single writer of the bound boundedClause applies", () => {
  const s = "The team needs the certified diagnosis category to set duty adjustments; the processing is intrusive here.";
  assertEquals(splitClauses(s)[0].text, boundedClause(s));
  assert(splitClauses(s).length >= 2, JSON.stringify(splitClauses(s)));
});

Deno.test("9J.1 — a match in the SECOND clause selects that clause, not the necessity head", () => {
  const s =
    "The occupational-health team needs the certified diagnosis category to set duty adjustments; " +
    "the processing is intrusive because it exposes an employee's health condition to their own employer.";
  const span = impactSpan(s);
  assert(!span.startsWith("The occupational-health team needs"), span);
  assert(matchesImpact(span), span);
});

Deno.test("9J.1 — the returned span always itself matches IMPACT_LEXICON", () => {
  for (const intake of FIXTURES) {
    for (const f of ["necessity_proportionality", "data_minimisation_justification", "secondary_uses"]) {
      const span = impactSpan(String(intake[f] ?? ""));
      if (span) assert(matchesImpact(span), `${f}: ${span}`);
    }
  }
  assertEquals(impactSpan("Nothing here argues either side."), "");
  assertEquals(impactSpan(""), "");
});

Deno.test("9J.1 — all four pins: every rendered impact quote is impact prose, never the necessity opening", () => {
  for (const intake of FIXTURES) {
    const combined = [String(intake.necessity_proportionality ?? ""), String(intake.data_minimisation_justification ?? "")]
      .filter(Boolean).join(" ");
    const necessityOpening = boundedClause(combined);
    const paras = impactParas(intake);
    assert(paras.length >= 1, "no impact paragraph rendered");
    for (const p of paras) {
      const m = p.match(/"([^"]+)"/)!;
      assert(m, p);
      const quote = m[1];
      assert(matchesImpact(quote), quote);
      assert(!quote.startsWith(HELVETIA_NECESSITY_HEAD), quote);
      if (necessityOpening) assert(quote !== necessityOpening, `necessity opening quoted: ${quote}`);
      assert(quote.length <= QUOTE_BOUND, `${quote.length}`);
    }
  }
});

Deno.test("9J.1 — Helvetia (eu-complete) renders impact prose about the intrusion", () => {
  const helvetia = intakeOf(PINS.find((f) => f.id === "dpia-perfect-eu-complete")!);
  assert(helvetia, "eu-complete pin missing");
  const quote = impactParas(helvetia)[0].match(/"([^"]+)"/)![1];
  assert(!quote.includes(HELVETIA_NECESSITY_HEAD), quote);
  assert(/intrusi|impact on the data subjects|exposes/i.test(quote), quote);
});

Deno.test("9J.1 — Harrowgate secondary still quotes its own secondary_uses impact statement", () => {
  const harrowgate = FIXTURES.find((f) => JSON.stringify(f).includes("Quarterly portfolio pricing calibration"))!;
  const props = buildProportionality(harrowgate) as Any[];
  const secondary = props.find((p) => p.operation_id === "op_secondary")!;
  const primary = props.find((p) => p.operation_id === "op_primary")!;
  // 9K item 1 — stored spans are TERMINATED; consumers strip at the quote seam.
  assert(String(harrowgate.secondary_uses ?? "").includes(seam(secondary.impact_argument)), secondary.impact_argument);
  assert(primary.impact_argument !== secondary.impact_argument);
});

Deno.test("9J.1 — verdicts byte-identical on all four pins; pin guard green", () => {
  for (const intake of FIXTURES) {
    assert(checkPerfectDpiaIntake(intake).ok, "pin guard red");
    for (const p of buildProportionality(intake) as Any[]) {
      assertEquals(p.verdict, "proportionate_on_the_record");
    }
  }
});
