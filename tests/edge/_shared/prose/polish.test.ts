/**
 * ITEM 340 — tests for the entailment-gated polish layer.
 *
 * The gate is the product here, so the tests are adversarial: each one is a
 * realistic way a fluency model degrades a legal document, and each must
 * REJECT. The accept cases prove the gate is not merely a rubber stamp on
 * "identical text".
 */
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1";
import {
  contentTokens,
  ENTAILMENT_VALIDATOR_VERSION,
  extractAnchors,
  normaliseTypography,
  properNouns,
  validateEntailment,
} from "../../../../supabase/functions/_shared/prose/entailment.ts";
import {
  polishSection,
  runPolishStage,
  type PolishCallFn,
  type PolishSection,
} from "../../../../supabase/functions/_shared/prose/polish.ts";
import { POLISH_FLAGS, POLISH_PRODUCTS, polishEnabledFor, polishShipsFor } from "../../../../supabase/functions/_shared/prose/polish-flags.ts";

const DET = [
  'The Company must complete a risk assessment under § 7152(a)(5). The record states an annual',
  'consumer volume of 100,000 and a decision date of 12 March 2026. The regulation requires',
  '"a plain language explanation of the logic" before deployment. The record does not state the',
  "retention period. This document is not legal advice and must be reviewed by qualified legal",
  "counsel before any operational use or reliance.",
].join(" ");

// ---------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------

Deno.test("extract: anchors are separated by class and citation digits are not free numbers", () => {
  const a = extractAnchors(normaliseTypography(DET));
  assert(a.citations.some((c) => c.includes("7152")), `citations: ${a.citations}`);
  assertEquals(a.numbers.map((n) => n.replace(/,/g, "")).includes("7152"), false);
  assert(a.numbers.some((n) => n.replace(/,/g, "") === "100000"), `numbers: ${a.numbers}`);
  assert(a.dates.includes("12 March 2026"), `dates: ${a.dates}`);
  assertStringIncludes(a.quotes.join(" "), "plain language explanation");
});

Deno.test("extract: money shapes are read as money, not as bare numbers", () => {
  const a = extractAnchors(normaliseTypography("The authority imposed a fine of EUR 1,200,000 in total."));
  assertEquals(a.money, ["EUR 1,200,000"]);
});

Deno.test("extract: sentence-initial capitals are not proper nouns", () => {
  const names = properNouns("Processing is described. Northwind Data Ltd operates the platform.");
  assertEquals(names.includes("Processing"), false);
  assert(names.includes("Northwind"));
});

Deno.test("normalisation is typography only and never semantic", () => {
  assertEquals(
    normaliseTypography("\u201cthe\u00a0logic\u201d \u2013 as stated"),
    '"the logic" - as stated',
  );
  assertEquals(contentTokens("The record does not state the retention period").includes("record"), true);
});

// ---------------------------------------------------------------------
// R1 — no new anchors
// ---------------------------------------------------------------------

Deno.test("R1: a fluent re-wording that invents no value is ACCEPTED", () => {
  const polished = [
    'Under § 7152(a)(5), the Company must complete a risk assessment. The record states an annual',
    'consumer volume of 100,000, with a decision date of 12 March 2026. Before deployment the',
    'regulation requires "a plain language explanation of the logic". The record does not state the',
    "retention period. This document is not legal advice and must be reviewed by qualified legal",
    "counsel before any operational use or reliance.",
  ].join(" ");
  const r = validateEntailment({ deterministic: DET, polished });
  assertEquals(r.ok, true, r.reject_reason);
});

Deno.test("R1: an invented citation is REJECTED", () => {
  const r = validateEntailment({
    deterministic: DET,
    polished: DET.replace("under § 7152(a)(5)", "under § 7152(a)(5) and § 7153(b)"),
  });
  assertEquals(r.ok, false);
  assertEquals(r.rules.no_new_anchors, false);
  assertStringIncludes(r.reject_reason, "new_citation");
});

Deno.test("R1: an invented number is REJECTED", () => {
  const r = validateEntailment({
    deterministic: DET,
    polished: DET.replace("volume of 100,000", "volume of 100,000 across 14 jurisdictions"),
  });
  assertEquals(r.ok, false);
  assertStringIncludes(r.reject_reason, "new_number");
});

Deno.test("R1: a shifted date is REJECTED", () => {
  const r = validateEntailment({
    deterministic: DET,
    polished: DET.replace("12 March 2026", "13 March 2026"),
  });
  assertEquals(r.ok, false);
  assertStringIncludes(r.reject_reason, "new_date");
});

Deno.test("R1: an invented monetary amount is REJECTED", () => {
  const det = "The regulator issued a decision. The record states no penalty figure.";
  const r = validateEntailment({
    deterministic: det,
    polished: "The regulator issued a decision, with no penalty figure of EUR 20,000,000 on the record.",
  });
  assertEquals(r.ok, false);
  assertStringIncludes(r.reject_reason, "new_money");
});

Deno.test("R1: a named entity the input never carried is REJECTED", () => {
  const r = validateEntailment({
    deterministic: DET,
    polished: DET.replace("The Company must", "Northwind Data Ltd must"),
  });
  assertEquals(r.ok, false);
  assertStringIncludes(r.reject_reason, "new_entity");
});

Deno.test("R1: an entity the PRODUCT carries is admitted, and its possessive too", () => {
  const det = "The controller operates a survey programme. The record states the fleet size.";
  const r = validateEntailment({
    deterministic: det,
    polished: "Northwind's survey programme is operated by the controller, and the record states the fleet size.",
    carried_entities: ["Northwind Data Ltd"],
  });
  assertEquals(r.ok, true, r.reject_reason);
});

Deno.test("R1: thousands separators and typography are not new values", () => {
  const det = "The record states a volume of 100,000 and a \u201cclear\u201d purpose \u2013 stated once.";
  const r = validateEntailment({
    deterministic: det,
    polished: 'The record states a volume of 100000 and a "clear" purpose - stated once.',
  });
  assertEquals(r.ok, true, r.reject_reason);
});

// ---------------------------------------------------------------------
// R2 — no lost anchors
// ---------------------------------------------------------------------

Deno.test("R2: dropping a citation is REJECTED", () => {
  const r = validateEntailment({
    deterministic: DET,
    polished: DET.replace(" under § 7152(a)(5)", ""),
  });
  assertEquals(r.ok, false);
  assertStringIncludes(r.reject_reason, "citation_dropped");
});

Deno.test("R2: smoothing away a 'record does not state' disclosure is REJECTED", () => {
  const r = validateEntailment({
    deterministic: DET,
    polished: DET.replace("The record does not state the retention period. ", ""),
  });
  assertEquals(r.ok, false);
  assertStringIncludes(r.reject_reason, "disclosure_dropped");
});

Deno.test("R2: dropping the counsel-voice close is REJECTED", () => {
  const r = validateEntailment({
    deterministic: DET,
    polished: DET.slice(0, DET.indexOf("This document is not legal advice")),
  });
  assertEquals(r.ok, false);
  assertStringIncludes(r.reject_reason, "counsel_close_dropped");
});

Deno.test("R2: summarising a quotation instead of reproducing it is REJECTED", () => {
  const r = validateEntailment({
    deterministic: DET,
    polished: DET.replace(
      '"a plain language explanation of the logic"',
      "an understandable account of how the decision is made",
    ),
  });
  assertEquals(r.ok, false);
  assertStringIncludes(r.reject_reason, "quote_dropped");
});

// ---------------------------------------------------------------------
// R3 — protected spans
// ---------------------------------------------------------------------

Deno.test("R3: paraphrasing a customer record value is REJECTED", () => {
  const det =
    "The record states the purpose as \u201cScoring applicants for credit eligibility\u201d. The record does not state the retention period.";
  const r = validateEntailment({
    deterministic: det,
    polished: 'The record states the purpose as "Scoring applicants for creditworthiness". The record does not state the retention period.',
    protected_spans: ["Scoring applicants for credit eligibility"],
  });
  assertEquals(r.ok, false);
  assertEquals(r.rules.no_paraphrase_of_protected_spans, false);
});

Deno.test("R3: a protected span the deterministic text does not carry is not this gate's business", () => {
  const det = "The record states the purpose. The record does not state the retention period.";
  const r = validateEntailment({
    deterministic: det,
    polished: "The record states the purpose. The record does not state the retention period at all.",
    protected_spans: ["a span from some other document"],
  });
  assertEquals(r.ok, true, r.reject_reason);
});


// ---------------------------------------------------------------------
// R4 — sentence coverage
// ---------------------------------------------------------------------

Deno.test("R4: an added conclusion sentence is REJECTED even when it invents no anchor", () => {
  const r = validateEntailment({
    deterministic: DET,
    polished: DET + " Overall the programme appears broadly mature and well managed across its operations.",
  });
  assertEquals(r.ok, false);
  assertEquals(r.rules.sentence_coverage, false);
  assertStringIncludes(r.reject_reason, "sentence_not_traceable");
});

Deno.test("R4: short connective sentences are exempt", () => {
  const det = "The record states the purpose clearly. The record does not state the retention period.";
  const r = validateEntailment({
    deterministic: det,
    polished: "The record states the purpose clearly. It does not. The record does not state the retention period.",
  });
  assertEquals(r.ok, true, r.reject_reason);
});

Deno.test("fail-closed: an empty polish is a rejection, never a pass", () => {
  const r = validateEntailment({ deterministic: DET, polished: "   " });
  assertEquals(r.ok, false);
  assertStringIncludes(r.reject_reason, "empty_polish");
  assertEquals(r.version, ENTAILMENT_VALIDATOR_VERSION);
});

// ---------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------

const analytic = (over: Partial<PolishSection> = {}): PolishSection => ({
  section_id: "risk_analysis",
  deterministic: DET,
  analytic: true,
  ...over,
});

const echo: PolishCallFn = ({ deterministic }) => Promise.resolve({ text: deterministic });

Deno.test("runner: a non-analytic section is never polished", async () => {
  const r = await polishSection(analytic({ analytic: false }), echo);
  assertEquals(r.ran, false);
  assertEquals(r.skipped_reason, "not_analytic");
  assertEquals(r.text, DET);
});

Deno.test("runner: an accepted polish ships and reports the polished surface", async () => {
  const r = await polishSection(analytic(), ({ deterministic }) =>
    Promise.resolve({ text: deterministic.replace("The Company must complete", "The Company is required to complete") }));
  assertEquals(r.accepted, true);
  assertEquals(r.shipped_surface, "polished");
  assertStringIncludes(r.text, "is required to complete");
});

Deno.test("runner: rejection ships the deterministic text after the attempt budget", async () => {
  let calls = 0;
  const r = await polishSection(analytic(), () => {
    calls += 1;
    return Promise.resolve({ text: "The programme is mature and the controller is plainly diligent throughout." });
  });
  assertEquals(calls, 2, "max 2 attempts");
  assertEquals(r.accepted, false);
  assertEquals(r.shipped_surface, "deterministic");
  assertEquals(r.text, DET);
  assert(r.findings.length > 0);
});

Deno.test("runner: the retry carries the rejection reason back verbatim", async () => {
  const seen: (string | undefined)[] = [];
  await polishSection(analytic(), ({ deterministic, rejectReason }) => {
    seen.push(rejectReason);
    return Promise.resolve({ text: deterministic + " An extra unfounded assertion about maturity appears here." });
  });
  assertEquals(seen[0], undefined);
  assert(seen[1] && seen[1].includes("sentence_not_traceable"), `retry reason: ${seen[1]}`);
});

Deno.test("runner: a throwing provider never blocks delivery", async () => {
  const r = await polishSection(analytic(), () => Promise.reject(new Error("transport down")));
  assertEquals(r.accepted, false);
  assertEquals(r.text, DET);
  assertEquals(r.attempts.every((a) => a.outcome === "error"), true);
});

Deno.test("runner: a timeout aborts and the deterministic text ships", async () => {
  const r = await polishSection(analytic(), ({ signal }) =>
    new Promise((_res, rej) => {
      signal.addEventListener("abort", () => rej(new DOMException("aborted", "TimeoutError")));
    }), { perAttemptTimeoutMs: 1_000, maxAttempts: 1 });
  assertEquals(r.text, DET);
  assertEquals(r.attempts[0].outcome, "abort");
});

Deno.test("stage: a flag-off product never calls the provider", async () => {
  let calls = 0;
  const res = await runPolishStage("cppa-risk", [analytic()], () => {
    calls += 1;
    return Promise.resolve({ text: DET });
  });
  assertEquals(calls, 0);
  assertEquals(res.telemetry.enabled, false);
  assertEquals(res.sections[0].skipped_reason, "flag_off");
  assertEquals(res.telemetry.shipped_surface, "deterministic");
});

Deno.test("stage: shadow mode records the acceptance but ships deterministic", async () => {
  const res = await runPolishStage(
    "cppa-risk",
    [analytic()],
    ({ deterministic }) => Promise.resolve({ text: deterministic.replace("must complete", "is required to complete") }),
    { forceEnabled: true, forceShips: false },
  );
  assertEquals(res.telemetry.sections_accepted, 1);
  assertEquals(res.sections[0].text, DET);
  assertEquals(res.telemetry.shipped_surface, "deterministic");
});

Deno.test("stage: live mode ships the accepted polish", async () => {
  const res = await runPolishStage(
    "cppa-risk",
    [analytic()],
    ({ deterministic }) => Promise.resolve({ text: deterministic.replace("must complete", "is required to complete") }),
    { forceEnabled: true, forceShips: true },
  );
  assertEquals(res.telemetry.shipped_surface, "polished");
  assertStringIncludes(res.sections[0].text, "is required to complete");
});

// ---------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------

Deno.test("flags: every product lands OFF and dpa-generator carries no flag", () => {
  for (const p of POLISH_PRODUCTS) {
    assertEquals(POLISH_FLAGS[p].enabled, false, `${p} must land off`);
    assertEquals(polishShipsFor(p), false);
  }
  assertEquals(POLISH_PRODUCTS.includes("dpa-generator" as never), false);
  assertEquals(polishEnabledFor("dpa-generator"), false);
  assertEquals(polishEnabledFor("not-a-product"), false);
});
