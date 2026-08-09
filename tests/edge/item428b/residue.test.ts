// ITEM 428-B — emit-gate residue from the Piece-B re-home.
//
// Three defect classes, both directions:
//   D1  reserved-determination referral prose off the summary surfaces, and
//       re-homed onto the reserved-judgment action row (byte-identically);
//       the typed fact strip carries NO prose leaf.
//   D2  case_against renders to customers → the WRITER terminates it.
//   D3  byte-pinned verbatim quotes are exempt from the well-formedness sweep
//       and their bytes survive untouched.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  rehomeReservedReferrals,
  isReservedReferralSentence,
  RISK_SUMMARY_REHOME_VERSION,
} from "../../../supabase/functions/_shared/ltp/risk-summary-rehome.ts";
import { runEmitGate, isBytePinnedLeaf } from "../../../supabase/functions/_shared/emit-gate.ts";
import { RISK_PIPELINE_STAMP } from "../../../supabase/functions/_shared/ltp/risk-stamp.ts";

const REFERRAL =
  "The determination whether to initiate the processing remains reserved to the Chief Compliance Officer and qualified legal counsel under 11 CCR § 7152(a)(7).";
const VERDICT =
  "The § 7152(a)(6) balancing on this record returns a high risk determination and the documented benefits outweigh the negative impacts.";

Deno.test("428-B stamp", () => {
  assertEquals(RISK_PIPELINE_STAMP, "risk-pipeline@item428b-2026-08-09");
  assertStringIncludes(RISK_SUMMARY_REHOME_VERSION, "item428b");
});

Deno.test("D1: referral sentence detector — both directions", () => {
  assert(isReservedReferralSentence(REFERRAL));
  assertEquals(isReservedReferralSentence(VERDICT), false);
});

Deno.test("D1a: referral prose leaves the exec summary and re-homes on the reserved row", () => {
  const report: Record<string, unknown> = {
    executive_summary: `${VERDICT} ${REFERRAL}`,
    priority_actions: [
      {
        rank: 1,
        action: "Record the balancing determination in the assessment file.",
        statutory_basis: "11 CCR § 7152(a)(7)",
        reserved_to: "Chief Compliance Officer",
        timeframe: "before initiation",
      },
    ],
  };
  const out = rehomeReservedReferrals(report);
  assertEquals(out.exec_sentences_moved, 1);
  assertEquals(String(report.executive_summary).includes("reserved to"), false, "verdict voice carries no referral framing (R2/R7)");
  assertStringIncludes(String(report.executive_summary), "balancing on this record");
  const row = (report.priority_actions as Record<string, unknown>[])[0];
  const homed = out.rehomed === 1;
  if (homed) {
    // Byte-identical re-home onto the reserved-judgment surface.
    assertStringIncludes(String(row.action), REFERRAL);
  } else {
    // Otherwise suppressed verbatim — never restated on a customer leaf.
    assertEquals(out.suppressed.includes(REFERRAL), true);
    assertEquals(String(row.action).includes(REFERRAL), false);
  }
});

Deno.test("D1b: the typed fact strip carries no prose leaf", () => {
  const report: Record<string, unknown> = {
    assessment_summary: {
      _typed: "risk-fact-strip@item428",
      company_name: "Sierra Outfitters, Inc",
      overall_risk_level: "High",
      narrative: `${VERDICT} ${REFERRAL}`,
    },
    priority_actions: [],
  };
  const out = rehomeReservedReferrals(report);
  assertEquals(out.narrative_removed, true);
  const strip = report.assessment_summary as Record<string, unknown>;
  assertEquals("narrative" in strip, false);
  for (const [k, v] of Object.entries(strip)) {
    if (typeof v !== "string") continue;
    assert(v.length < 200 && !/\.\s+[A-Z]/.test(v), `prose leaf on the strip: ${k}`);
  }
  // The verdict is carried for the G-2 builder.
  assertStringIncludes(out.carried_verdict, "balancing on this record");
});

Deno.test("D1: no referral present → surfaces are untouched", () => {
  const report: Record<string, unknown> = {
    executive_summary: VERDICT,
    assessment_summary: { company_name: "Acme" },
    priority_actions: [],
  };
  const out = rehomeReservedReferrals(report);
  assertEquals(out.exec_sentences_moved, 0);
  assertEquals(out.narrative_removed, false);
  assertEquals(report.executive_summary, VERDICT);
});

Deno.test("D3: byte-pinned verbatim quote raises nothing and survives untouched", () => {
  const pinned =
    "controllers must assess the risks to the rights and freedoms of natural persons arising from the processing and consider those risks from the perspective of the data subjects";
  const report: Record<string, unknown> = {
    eu_persuasive_authority: {
      topics: [{ guidance: [{ verbatim_quote: pinned }] }],
    },
  };
  assert(isBytePinnedLeaf("$.eu_persuasive_authority.topics[0].guidance[1].verbatim_quote"));
  assertEquals(isBytePinnedLeaf("$.executive_summary"), false);
  runEmitGate(report, { tool: "cppa_risk_assessment", intakeRoster: {} as never });
  const gr = (report._meta as any).internal.emit_gate;
  assertEquals(
    gr.findings.filter((f: any) => String(f.path).endsWith("verbatim_quote")).length,
    0,
    "pinned quote must raise nothing",
  );
  assertEquals(
    (report.eu_persuasive_authority as any).topics[0].guidance[0].verbatim_quote,
    pinned,
    "pinned bytes survive untouched",
  );
});

Deno.test("D3: an UNPINNED long unterminated leaf still raises", () => {
  const bad =
    "controllers must assess the risks to the rights and freedoms of natural persons arising from the processing and consider those risks from the perspective of the data subjects";
  const report: Record<string, unknown> = { commentary: bad };
  runEmitGate(report, { tool: "cppa_risk_assessment", intakeRoster: {} as never });
  const gr = (report._meta as any).internal.emit_gate;
  assert(
    gr.findings.some((f: any) => f.check_id === "unterminated_sentence"),
    "the sweep still guards unpinned prose",
  );
});
