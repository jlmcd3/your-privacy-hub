// BATCH d573cc4f (2026-09-12) — ChatGPT's "Report Prose Review v6" plus
// Claude's independent code check agreed on two real Governance defects.
//
// GOV6-01 — the UK GDPR Art. 44A(1) transfer principle is one sentence that
// runs on into the paragraph (2) routes ("...only if [(a) ... or (b) ...]").
// Quoting only "...only if" and closing the sentence there read as a
// complete statutory command when it is a mid-sentence fragment. The fix
// joins the fragment into the surrounding sentence with a dash instead of a
// period, so nothing downstream can read the closing quotation mark as a
// sentence boundary. No completing statutory text is fabricated or appended.
//
// GOV6-02 — the intake carries only ONE transfer_mechanism field for the
// whole record. In a dual-regime record (EU + UK both in scope) whose
// recorded mechanism belongs to just one chapter, that chapter's leg has a
// NAMED mechanism (missing only the executed document) while the OTHER leg
// has NO mechanism recorded at all — a materially different gap. The
// generic remediation ask conflated the two legs into one sentence asking
// for "the executed instrument for each transfer leg" as if both were
// equally close to closed.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildTransferAnalysis } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";

type Bag = Record<string, unknown>;

// ── GOV6-01 ──────────────────────────────────────────────────────────────

Deno.test("GOV6-01 — the Art. 44A(1) quote joins into the surrounding sentence instead of closing on 'only if'", () => {
  const out = buildTransferAnalysis({
    jurisdictions: ["United Kingdom (UK GDPR)"],
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "UK Addendum to EU SCCs",
  } as never) as unknown as Bag;
  const application = String(out.application);
  // The verbatim (1) fragment is unchanged and still quoted in full.
  assertStringIncludes(
    application,
    '"A controller or processor may transfer personal data to a third country or an international organisation only if"',
  );
  // It is joined with a dash into a lowercase continuation, never a period
  // immediately followed by a new capitalized sentence — the shape that
  // reads as (and can be silently punctuated into) a false complete command.
  assertStringIncludes(
    application,
    '"A controller or processor may transfer personal data to a third country or an international organisation only if" — a condition Article 44A(2) fixes as met only where',
  );
  assert(
    !application.includes('only if." Under Article 44A(2)'),
    "must not read as a complete sentence ending at 'only if'",
  );
});

// ── GOV6-02 ──────────────────────────────────────────────────────────────

Deno.test("GOV6-02 — a dual-regime record with a UK-only mechanism asks per-leg, not a conflated generic ask", () => {
  const out = buildTransferAnalysis({
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "UK Addendum to EU SCCs",
    tools: ["Salesforce", "Zendesk"],
  } as never) as unknown as Bag;
  assertEquals(out.verdict, "partially_satisfied");
  const ask = String(out.information_needed);
  assertStringIncludes(ask, "For the UK leg");
  assertStringIncludes(ask, "Salesforce, Zendesk");
  assertStringIncludes(ask, "the record names the mechanism type but not the executed document");
  assertStringIncludes(ask, "For the EU leg, no mechanism is recorded at all");
  assertStringIncludes(ask, "adopt and execute the Commission clause set and its transfer impact assessment");
  assert(
    !ask.includes("The executed instrument for each transfer leg"),
    "the two legs must not be conflated into one generic ask when only one is named",
  );
});

Deno.test("GOV6-02 — a dual-regime record with an EU-only mechanism asks per-leg the other way round", () => {
  const out = buildTransferAnalysis({
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "EU Standard Contractual Clauses (SCCs)",
  } as never) as unknown as Bag;
  const ask = String(out.information_needed);
  assertStringIncludes(ask, "For the EU leg, the record names the mechanism type but not the executed document");
  assertStringIncludes(ask, "For the UK leg, no mechanism is recorded at all");
  assertStringIncludes(ask, "adopt and execute the IDTA or the Addendum as executed and the exporter's own Article 46(6) assessment");
});

Deno.test("GOV6-02 — a single-regime record (EU only) keeps the prior generic per-leg phrasing, unchanged", () => {
  const out = buildTransferAnalysis({
    jurisdictions: ["EU (GDPR)"],
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "EU Standard Contractual Clauses (SCCs)",
  } as never) as unknown as Bag;
  assertEquals(
    out.information_needed,
    "The executed instrument for each transfer leg — for a UK leg, the IDTA or the Addendum as executed and the exporter's own Article 46(6) assessment; for an EU leg, the Commission clause set and its transfer impact assessment. The record names the mechanism type but not the executed document, so the leg cannot be closed as satisfied.",
  );
});

Deno.test("GOV6-02 — a dual-regime record with a regime-neutral mechanism (Binding Corporate Rules) keeps the generic ask, unchanged", () => {
  const out = buildTransferAnalysis({
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "Binding Corporate Rules",
  } as never) as unknown as Bag;
  assertStringIncludes(String(out.information_needed), "The executed instrument for each transfer leg");
});
