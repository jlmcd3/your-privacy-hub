// ITEM 380 r4 — gate-aware classification fallback.
//
// Proves:
//  1. the two LIVE unmapped asks (dpia_frameworks/84f77c27-…) classify
//     action_item under gate TRUE and record_gap under gate FALSE;
//  2. the banner reaches state (ii) "action_plan" on a gate-true document whose
//     only open items are unmapped asks;
//  3. a value-demand ask NAMING AN EMPTY key stays record_gap even under gate
//     TRUE (genuine gaps survive);
//  4. gate-FALSE behaviour is byte-identical to r3 across a corpus of asks;
//  5. bracket tokens are unaffected by the gate;
//  6. stamps are on item380r5.
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  classifyOpenItem,
  classifyPlaceholders,
  decideBanner,
  RECORD_COMPLETE_VERSION,
} from "../../../supabase/functions/_shared/ltp/record-complete.ts";
import { RISK_PIPELINE_STAMP } from "../../../supabase/functions/_shared/ltp/risk-stamp.ts";
import { DPIA_PERFECT } from "../../../supabase/functions/_shared/golden/dpia.ts";

const intake = {
  ...((DPIA_PERFECT as readonly { intake: Record<string, unknown> }[])[0].intake),
};

/** The two generator-invented asks observed on the live r3 document. */
const LIVE_UNMAPPED = [
  "record a documented prohibition on use of diagnosis data outside the occupational-health function",
  "record outcome of Betriebsvereinbarung assessment",
];

Deno.test("r4: the two live unmapped asks are ACTION ITEMS under gate TRUE", () => {
  for (const text of LIVE_UNMAPPED) {
    const c = classifyOpenItem(text, intake, true);
    assertEquals(c.klass, "action_item", `gate-true: ${text}`);
    assertEquals(c.empty_keys.length, 0, `no empty keys: ${text}`);
  }
});

Deno.test("r4: the same asks stay RECORD GAPS under gate FALSE (conservative direction untouched)", () => {
  for (const text of LIVE_UNMAPPED) {
    assertEquals(classifyOpenItem(text, intake, false).klass, "record_gap", text);
    // default argument must also be the conservative direction
    assertEquals(classifyOpenItem(text, intake).klass, "record_gap", text);
  }
});

Deno.test("r4: a value-demand ask naming an EMPTY key stays a record gap under gate TRUE", () => {
  const sparse = { ...intake, data_subject_rights_mechanisms: "" };
  const text = "State the data_subject_rights_mechanisms the controller provides.";
  assertEquals(classifyOpenItem(text, sparse, true).klass, "record_gap");
  assert(classifyOpenItem(text, sparse, true).empty_keys.length > 0);
});

Deno.test("r4: banner reaches state (ii) action_plan on a gate-true doc carrying only unmapped asks", () => {
  const report = { information_needed: LIVE_UNMAPPED.map((t) => ({ information_needed: t })) };
  const before = classifyPlaceholders(report, intake, false);
  assertEquals(before.counts.record_gap, 2);
  assertEquals(decideBanner(true, before, true).state, "draft_incomplete");

  const after = classifyPlaceholders(report, intake, true);
  assertEquals(after.counts.record_gap, 0);
  assertEquals(after.counts.action_item, 2);
  assertEquals(decideBanner(true, after, true).state, "action_plan");
});

Deno.test("r4: gate FALSE is byte-identical to r3 across a mixed corpus", () => {
  const corpus = [
    ...LIVE_UNMAPPED,
    "Confirm the retention schedule before go-live.",
    "State the organization_name.",
    "Obtain the DPO sign-off.",
    "technical_sheet.completion_date",
    "The record does not yet include a transfer assessment.",
  ];
  const report = { information_needed: corpus.map((t) => ({ information_needed: t })) };
  const gateFalse = classifyPlaceholders(report, intake, false);
  const legacyShape = corpus.map((t) => classifyOpenItem(t, intake).klass);
  assertEquals(gateFalse.items.map((i) => i.klass), legacyShape);
  // and the gate-true run may only move items in the gap → action direction
  const gateTrue = classifyPlaceholders(report, intake, true);
  assert(gateTrue.counts.record_gap <= gateFalse.counts.record_gap);
  assertEquals(gateTrue.counts.total, gateFalse.counts.total);
  for (let i = 0; i < gateTrue.items.length; i++) {
    if (gateFalse.items[i].klass === "action_item") {
      assertEquals(gateTrue.items[i].klass, "action_item", corpus[i]);
    }
  }
});

Deno.test("r4: bracket tokens are unaffected by the gate", () => {
  const report = { s: "text [TO COMPLETE: unmapped thing] more" };
  const t = classifyPlaceholders(report, intake, true);
  const f = classifyPlaceholders(report, intake, false);
  assertEquals(t.items.length, 1);
  assertEquals(t.items[0].origin, "bracket_token");
  assertEquals(t.items[0].klass, f.items[0].klass);
});

Deno.test("r4: risk path classification shape unchanged", () => {
  const report = {
    information_needed: ["Confirm the annual re-score is scheduled."],
  };
  const c = classifyPlaceholders(report, intake, true);
  assertEquals(c.counts.total, 1);
  assertEquals(c.items[0].klass, "action_item");
  assertEquals(c.version, RECORD_COMPLETE_VERSION);
});

Deno.test("r4: stamps are bumped", () => {
  assertEquals(RECORD_COMPLETE_VERSION, "record-complete-2026-08-05-item380r5");
  assertEquals(RISK_PIPELINE_STAMP, "risk-pipeline@item390-2026-08-06");
});
