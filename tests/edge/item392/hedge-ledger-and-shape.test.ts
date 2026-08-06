// ITEM 392 — HEDGE LEDGER (AG-1) BOTH DIRECTIONS + SHAPE HYGIENE (AG-3).
//
// AG-1 acceptance: a complete record carries no hedge and NO ledger; a degraded
// record carries exactly ONE ledger sentence naming every unresolved element —
// honest degradation preserved, only de-duplicated.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyAdmtProseGold, isHedgeLitany } from "../../../supabase/functions/_shared/ltp/admt-prose-gold.ts";

const HEDGE =
  "The information provided does not resolve this question; the missing intake dimensions are listed under information needed.";

function degraded(): any {
  return {
    overall_status: "gaps_identified",
    adequacy_finding: {
      logic_disclosure: { conclusion: "insufficient_basis", reason: HEDGE },
      human_intervention: { conclusion: "insufficient_basis", reason: HEDGE },
      significant_decision: {
        conclusion: "qualifies",
        reason: "The output determines whether an application advances, which is a significant decision.",
      },
    },
    information_needed: [{}, { item: "The published pre-use notice text.", why: "It evidences the notice element." }],
    consolidated_notice_analysis: { applicable: false, basis: "One system, one purpose.", consolidation_risk: "", conditions_to_consolidate: "" },
  };
}

function complete(): any {
  return {
    overall_status: "compliant",
    adequacy_finding: {
      logic_disclosure: {
        conclusion: "adequate",
        reason: "The business supplied the published explanation of how the technology produces its output.",
      },
      significant_decision: {
        conclusion: "qualifies",
        reason: "The output determines whether an application advances, which is a significant decision.",
      },
    },
    information_needed: [],
    consolidated_notice_analysis: { applicable: false, basis: "One system, one purpose." },
  };
}

Deno.test("AG-1 — complete record: no hedge, no ledger", () => {
  const r = complete();
  const t = applyAdmtProseGold(r);
  assertEquals(t.hedges_rewritten, 0);
  assertEquals(t.ledger_written, false);
  assertEquals(t.unresolved_elements, []);
  assertEquals(r.adequacy_finding.open_items, undefined);
  assertEquals(JSON.stringify(r).includes("does not resolve this question"), false);
});

Deno.test("AG-1 — degraded record: exactly ONE ledger naming every unresolved element", () => {
  const r = degraded();
  const t = applyAdmtProseGold(r);
  assert(t.hedges_rewritten >= 2, `expected the repeated hedge to be de-duplicated, got ${t.hedges_rewritten}`);
  assertEquals(t.ledger_written, true);
  assertEquals(t.unresolved_elements.sort(), ["the human-involvement element", "the logic-disclosure element"]);

  // ONE ledger, on the adequacy surface, and nowhere else.
  const ledger: string = r.adequacy_finding.open_items;
  assertEquals(typeof ledger, "string");
  // ONE sentence.
  assertEquals(ledger.trim().split(/(?<=[.!?])\s+/).length, 1);
  // Names every unresolved element, in reader words.
  assert(/logic/i.test(ledger), ledger);
  assert(/human/i.test(ledger), ledger);
  // The information is never lost.
  assert(/does not yet state/i.test(ledger), ledger);
});

Deno.test("AG-1 — the litany is gone from every element and the resolved element is untouched", () => {
  const r = degraded();
  applyAdmtProseGold(r);
  const json = JSON.stringify(r.adequacy_finding);
  assertEquals(json.includes("does not resolve this question"), false);
  for (const el of Object.values<any>(r.adequacy_finding)) {
    if (el.reason) assert(!isHedgeLitany(el.reason), el.reason);
  }
  assertEquals(
    r.adequacy_finding.significant_decision.reason,
    "The output determines whether an application advances, which is a significant decision.",
  );
});

Deno.test("AG-1 — the ledger is idempotent over its own output", () => {
  const r = degraded();
  applyAdmtProseGold(r);
  const first = JSON.parse(JSON.stringify(r));
  const t2 = applyAdmtProseGold(r);
  assertEquals(t2.hedges_rewritten, 0);
  assertEquals(r.adequacy_finding.open_items, first.adequacy_finding.open_items);
});

Deno.test("AG-3 — hollow fields and empty objects never ship", () => {
  const r = degraded();
  const t = applyAdmtProseGold(r);
  assertEquals("consolidation_risk" in r.consolidated_notice_analysis, false);
  assertEquals("conditions_to_consolidate" in r.consolidated_notice_analysis, false);
  assertEquals(r.consolidated_notice_analysis.basis, "One system, one purpose.");
  assertEquals(r.information_needed.length, 1);
  assertEquals(r.information_needed[0].item, "The published pre-use notice text.");
  assert(t.fields_omitted >= 2);
  assert(t.entries_dropped >= 1);
  assert(t.paths.some((p) => p.includes("consolidation_risk")), JSON.stringify(t.paths));
});

Deno.test("AG-3 — substantive content is never treated as hollow", () => {
  const r = complete();
  const t = applyAdmtProseGold(r);
  assertEquals(t.fields_omitted, 0);
  assertEquals(t.entries_dropped, 0);
  assertEquals(r.consolidated_notice_analysis.basis, "One system, one purpose.");
});
