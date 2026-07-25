// WAVE23-FIX TURN B (cppa-risk) — acceptance tests.
// Coverage targets per dispatch:
//   (a) leak-scrub hit on safeguard_gaps type case
//   (b) intake-supported preserve (fact-ledger consultation)
//   (c) double-period normalization
//   (d) stamp-echo shape (well-formed)
//   (e) idempotency
//   (f) no-crash on empty / degenerate report
//   (g) sibling free-text emitters covered (mitigation_gaps, open_items, *_gaps, *_notes)
//   (h) anchor keys never mutated
//   (i) does NOT touch fields outside the target set

import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  applyW23RiskTurnB,
  W23_RISK_TURNB_STAMP,
} from "../run-cppa-risk-assessment/_w23_risk_turnb.ts";
import { buildFactLedger } from "../_shared/intake/fact-ledger.ts";

const TYPE_CASE =
  "The intake on profiling and systematic observation does not support this statement; it must be reconciled before use.. Civ. Code § 1798.140(ag)/(j) is not documented";

Deno.test("W23B — safeguard_gaps type case scrubbed + double-period normalized", () => {
  const src = {
    risk_register: {
      entries: [
        { id: "RR-001", safeguard_gaps: TYPE_CASE },
      ],
    },
  } as any;
  const { report, counters } = applyW23RiskTurnB(src);
  const out = (report as any).risk_register.entries[0].safeguard_gaps as string;
  assert(!/does not support this statement/i.test(out), `leak survived: ${out}`);
  assert(!/must be reconciled/i.test(out), `fragment survived: ${out}`);
  assert(!/\.\./.test(out), `double-period survived: ${out}`);
  assert(counters.internal_note_scrubs >= 1);
  assert(counters.concat_normalizations >= 1);
});

Deno.test("W23B — mitigation_gaps / open_items / arbitrary *_gaps / *_notes covered", () => {
  const src = {
    mitigation_gaps: TYPE_CASE,
    open_items: [TYPE_CASE, "Legitimate open item."],
    vendor_gaps: TYPE_CASE,
    program_notes: TYPE_CASE,
  } as any;
  const { report, counters } = applyW23RiskTurnB(src);
  const blob = JSON.stringify(report);
  assert(!/does not support this statement/i.test(blob), `leak survived: ${blob}`);
  assert(counters.internal_note_scrubs >= 4);
  assertEquals((report as any).open_items[1], "Legitimate open item.");
});

Deno.test("W23B — intake-supported claim PRESERVED (ledger consulted)", () => {
  const intake = { q5b_profiling_observation: "Yes, we profile users." };
  const ledger = buildFactLedger(intake);
  const src = {
    risk_register: {
      entries: [
        { id: "RR-001", safeguard_gaps: TYPE_CASE },
      ],
    },
  } as any;
  const { report, counters } = applyW23RiskTurnB(src, { intake, ledger });
  const out = (report as any).risk_register.entries[0].safeguard_gaps as string;
  // Sentence with "does not support" preserved because ledger asserts profiling.
  assert(/does not support this statement/i.test(out), `intake-supported claim wrongly stripped: ${out}`);
  assert(counters.intake_supported_preserved >= 1);
});

Deno.test("W23B — fields OUTSIDE target set are NOT touched", () => {
  const src = {
    executive_summary: TYPE_CASE,       // not a target field
    document_metadata: { title: "Risk Assessment" },
    risk_register: {
      entries: [{ id: "RR-001", description: TYPE_CASE }], // description not in target set
    },
  } as any;
  const { report } = applyW23RiskTurnB(src);
  assertEquals((report as any).executive_summary, TYPE_CASE);
  assertEquals((report as any).risk_register.entries[0].description, TYPE_CASE);
});

Deno.test("W23B — anchor keys (citation/field/id) never mutated", () => {
  const src = {
    safeguard_gaps: TYPE_CASE,
    information_needed: [
      { field: "q3_sell_share", citation: "11 CCR § 7150(b)", id: "IN-001" },
    ],
  } as any;
  const { report } = applyW23RiskTurnB(src);
  const row = (report as any).information_needed[0];
  assertEquals(row.field, "q3_sell_share");
  assertEquals(row.citation, "11 CCR § 7150(b)");
  assertEquals(row.id, "IN-001");
});

Deno.test("W23B — idempotent (second pass produces zero additional scrubs)", () => {
  const src = { safeguard_gaps: TYPE_CASE } as any;
  const pass1 = applyW23RiskTurnB(src);
  const pass2 = applyW23RiskTurnB(pass1.report as any);
  assertEquals(pass2.counters.internal_note_scrubs, 0);
  assertEquals(pass2.counters.concat_normalizations, 0);
  assertEquals(
    (pass1.report as any).safeguard_gaps,
    (pass2.report as any).safeguard_gaps,
  );
});

Deno.test("W23B — no crash on empty / degenerate report", () => {
  const { counters: c1 } = applyW23RiskTurnB({} as any);
  assertEquals(c1.internal_note_scrubs, 0);
  const { counters: c2 } = applyW23RiskTurnB(null as any);
  assertEquals(c2.internal_note_scrubs, 0);
  const { counters: c3 } = applyW23RiskTurnB(undefined as any);
  assertEquals(c3.internal_note_scrubs, 0);
});

Deno.test("W23B — _meta subtree preserved (not walked/scrubbed)", () => {
  const src = {
    safeguard_gaps: "clean text.",
    _meta: { internal: { risk_w22a: { placeholder_scrubs: 2 } } },
  } as any;
  const { report } = applyW23RiskTurnB(src);
  assertEquals(
    (report as any)._meta.internal.risk_w22a.placeholder_scrubs,
    2,
  );
});

Deno.test("W23B — concat artifacts also normalized (.. and . . and .,)", () => {
  const src = {
    safeguard_gaps: "First sentence.. Second one . . third one.,",
  } as any;
  const { report, counters } = applyW23RiskTurnB(src);
  const out = (report as any).safeguard_gaps as string;
  assert(!/\.\./.test(out), `double-period survived: ${out}`);
  assert(!/\.\s+\./.test(out), `split-period survived: ${out}`);
  assert(!/\.,/.test(out), `comma-after-period survived: ${out}`);
  assert(counters.concat_normalizations >= 1);
});

Deno.test("W23B — stamp is well-formed", () => {
  assert(
    /^w23-risk-turnb@\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(W23_RISK_TURNB_STAMP),
    `bad stamp: ${W23_RISK_TURNB_STAMP}`,
  );
});
