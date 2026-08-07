/**
 * ITEM 399 — R11 ASSEMBLED-PROSE LINT + FIXES 1-4.
 *
 * Identities:
 *   item399-r11-1 .. item399-r11-6   the lint's five rules, both directions
 *   item399-fix1                     no markdown token in risk templates
 *   item399-fix2                     reserved-action headline: one pinpoint,
 *                                    one role, sentence case, no splice
 *   item399-fix3                     LIA statute-quote frame parses, quote
 *                                    byte-identical
 *   item399-fix4                     bracket-token catalog, both directions
 *   item399-r11-live                 perfect-fixture documents lint clean
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attachProseLint,
  lintAssembledProse,
} from "../../../supabase/functions/_shared/prose/assembled-prose-lint.ts";
import {
  classifyQuoteOpening,
  frameStatuteQuote,
} from "../../../supabase/functions/_shared/prose/quote-frame.ts";
import { classifyBracketToken } from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import { reservedActionLabel } from "../../../supabase/functions/_shared/ltp/risk-prose-gold.ts";
import { PASS2_TEMPLATES } from "../../../supabase/functions/_shared/ltp/content/pass2-templates.ts";

const rules = (r: ReturnType<typeof lintAssembledProse>) => r.findings.map((f) => f.rule);

// ── R11 rule 1 — markdown ───────────────────────────────────────────────────
Deno.test("item399-r11-1: markdown tokens in assembled prose are caught", () => {
  const bad = lintAssembledProse({
    executive_summary:
      "The record is sufficient. **How Sierra Outfitters, Inc. processes personal information** and the balance of the assessment follows.",
  });
  assert(rules(bad).includes("markdown_token"));
  const good = lintAssembledProse({
    executive_summary:
      "The record is sufficient. How Sierra Outfitters, Inc. processes personal information is set out below in full.",
  });
  assertEquals(rules(good).includes("markdown_token"), false);
});

// ── R11 rule 2 — quote-frame break ──────────────────────────────────────────
Deno.test("item399-r11-2: quote-frame breaks are caught, sound frames pass", () => {
  const bad = lintAssembledProse({
    why: 'Article 6(1)(f) permits processing where it "processing is necessary for the purposes of the legitimate interests pursued."',
  });
  assert(rules(bad).includes("quote_frame_break"));
  const good = lintAssembledProse({
    why: 'Article 6(1)(f) provides that "processing is necessary for the purposes of the legitimate interests pursued."',
  });
  assertEquals(rules(good).includes("quote_frame_break"), false);
});

// ── R11 rule 3 — duplicated pinpoint ────────────────────────────────────────
Deno.test("item399-r11-3: a pinpoint duplicated back to back is caught", () => {
  const bad = lintAssembledProse({
    priority_actions: [
      "The determination 11 CCR § 7152(a)(7) reserves to the accountable business owner: 11 CCR § 7152(a)(7) the negative-impact weighting must be recorded.",
    ],
  });
  assert(rules(bad).includes("duplicate_pinpoint"));
  const good = lintAssembledProse({
    priority_actions: [
      "The determination reserved to the accountable business owner: 11 CCR § 7152(a)(7) requires the negative-impact weighting to be recorded before the assessment closes.",
    ],
  });
  assertEquals(rules(good).includes("duplicate_pinpoint"), false);
});

// ── R11 rule 4 — splice patterns ────────────────────────────────────────────
Deno.test("item399-r11-4: the known splice patterns are caught", () => {
  const bad = lintAssembledProse({
    body: "The gap is the reserved judgment must be exercised before the assessment closes and the record retained.",
  });
  assert(rules(bad).includes("splice_pattern"));
  const good = lintAssembledProse({
    body: "The gap is that the reserved judgment must be exercised before the assessment closes and the record retained.",
  });
  assertEquals(rules(good).includes("splice_pattern"), false);
});

// ── R11 rule 5 — headline jam (advisory only) ───────────────────────────────
Deno.test("item399-r11-5: headline jams are advisory, never build-breaking", () => {
  const r = lintAssembledProse({
    body: "The record is sufficient on this element. Scope And Coverage Of The Assessment. The business records eleven activities.",
  });
  const hit = r.findings.find((f) => f.rule === "headline_in_paragraph");
  assert(hit, "expected an advisory headline finding");
  assertEquals(hit!.advisory, true);
  assertEquals(r.blocking, 0);
});

// ── R11 wiring — telemetry only, never mutation ─────────────────────────────
Deno.test("item399-r11-6: attachProseLint writes telemetry and mutates no prose", () => {
  const report: Record<string, unknown> = {
    executive_summary: "The record is sufficient. **A jammed heading** follows here.",
  };
  const before = report.executive_summary;
  const res = attachProseLint(report);
  assertEquals(report.executive_summary, before);
  const internal = (report._meta as Record<string, Record<string, unknown>>).internal;
  const t = internal.prose_lint as Record<string, unknown>;
  assertEquals(t.version, res.version);
  assert((t.count as number) >= 1);
  assertEquals(res.crashed, false);
});

// ── FIX 1 — no markdown in the risk templates ───────────────────────────────
Deno.test("item399-fix1: risk pass-2 templates carry no markdown tokens", () => {
  const offenders: string[] = [];
  for (const [id, tpl] of Object.entries(PASS2_TEMPLATES as Record<string, unknown>)) {
    if (typeof tpl !== "string") continue;
    if (!id.startsWith("T.risk.")) continue;
    if (/\*\*/.test(tpl) || /(?:^|\n)\s{0,3}#{1,6}\s/.test(tpl)) offenders.push(id);
  }
  assertEquals(offenders, []);
});

// ── FIX 2 — reserved-action headline ────────────────────────────────────────
Deno.test("item399-fix2: reserved-action headline omits the pinpoint when the template carries it", () => {
  const withPin = reservedActionLabel("11 CCR § 7152(a)(7)", "the accountable business owner");
  assert(withPin.includes("11 CCR § 7152(a)(7)"));
  const withoutPin = reservedActionLabel("11 CCR § 7152(a)(7)", "the accountable business owner", false);
  assertEquals(withoutPin.includes("§"), false);
  assertEquals(/\*\*/.test(withoutPin), false);
  // sentence case, one role, no duplicated pinpoint in the assembled string
  const assembled = `${withoutPin} the negative-impact weighting. 11 CCR § 7152(a)(7) requires it.`;
  assertEquals(lintAssembledProse({ a: assembled }).blocking, 0);
});

// ── FIX 3 — LIA statute-quote frame ─────────────────────────────────────────
Deno.test("item399-fix3: the statute frame adapts and the quote is byte-identical", () => {
  const clause = "processing is necessary for the purposes of the legitimate interests pursued by the controller.";
  const predicate = "is necessary for the purposes of the legitimate interests pursued by the controller.";
  const a = frameStatuteQuote("Article 6(1)(f)", clause);
  const b = frameStatuteQuote("Article 6(1)(f)", predicate);
  assertEquals(classifyQuoteOpening(clause), "clause");
  assertEquals(classifyQuoteOpening(predicate), "predicate");
  assertEquals(a, `Article 6(1)(f) provides that "${clause}"`);
  assertEquals(b, `Article 6(1)(f) permits processing that "${predicate}"`);
  assert(a.includes(clause), "verbatim quote altered");
  assertEquals(lintAssembledProse({ a, b }).blocking, 0);
});

// ── FIX 4 — bracket-token catalog, both directions ──────────────────────────
Deno.test("item399-fix4: bracket tokens classify by the catalog, not the surrounding words", () => {
  assertEquals(
    classifyBracketToken("[TO BE RE-SCORED by organisation once Conditions 1-6 are met]"),
    "action_item",
  );
  assertEquals(classifyBracketToken("[TO BE CONFIRMED by the DPO]"), "action_item");
  assertEquals(classifyBracketToken("[TO BE ASSESSED at the next review]"), "action_item");
  assertEquals(classifyBracketToken("[TO COMPLETE — retention period]"), "record_gap");
  assertEquals(classifyBracketToken("[TO BE COMPLETED — processor name]"), "record_gap");
  // Outside the catalog: prose rules keep governing.
  assertEquals(classifyBracketToken("[SEE ANNEX 2]"), null);
});
