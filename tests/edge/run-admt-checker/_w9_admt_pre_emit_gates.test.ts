// ADMT-FIX-W9 — unit tests for the pre-emit deterministic gates.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyW9AdmtPreEmitGates,
  W9_ADMT_PRE_EMIT_STAMP,
  _internals,
} from "../../../supabase/functions/run-admt-checker/_w9_admt_pre_emit_gates.ts";

Deno.test("W9 pre-emit / G1: § 7001 sole-anchor duty sentence gains operative fallback", () => {
  const report: any = {
    executive_summary:
      "The business must respond to access requests under 11 CCR § 7001(e)(1).",
  };
  const c = applyW9AdmtPreEmitGates(report);
  assertEquals(c.g1_h6_rewrites, 1);
  assert(report.executive_summary.includes("11 CCR §§ 7220–7222"));
  // Downstream re-grade against the h6 predicate would now clear.
  assert(_internals.G1_OPERATIVE_ANCHOR_RE.test(report.executive_summary));
});

Deno.test("W9 pre-emit / G1: sentence with operative anchor is untouched", () => {
  const report: any = {
    scope_analysis: {
      summary:
        "The access response must state the sole factor under § 7222(b)(3), applying the § 7001(e)(1) definitional element.",
    },
  };
  const before = report.scope_analysis.summary;
  const c = applyW9AdmtPreEmitGates(report);
  assertEquals(c.g1_h6_rewrites, 0);
  assertEquals(report.scope_analysis.summary, before);
});

Deno.test("W9 pre-emit / G2: body-text counsel referral is stripped", () => {
  const report: any = {
    notice_gaps: [
      {
        finding:
          "The Pre-use Notice lacks the how-it-works element. Consult outside legal counsel before rolling out remediation. The business must correct the omission per § 7220(c)(5).",
      },
    ],
  };
  const c = applyW9AdmtPreEmitGates(report);
  assertEquals(c.g2_e6_strips, 1);
  assert(!/consult\s+outside\s+legal\s+counsel/i.test(report.notice_gaps[0].finding));
  // Substantive sentences remain.
  assert(/how-it-works/.test(report.notice_gaps[0].finding));
  assert(/§ 7220\(c\)\(5\)/.test(report.notice_gaps[0].finding));
});

Deno.test("W9 pre-emit / G2: ownership-disclaimer sentence is preserved", () => {
  const disclaimer =
    "Your qualified Data Protection Officer or legal counsel must review, complete, and own it.";
  const report: any = { preamble: disclaimer };
  const c = applyW9AdmtPreEmitGates(report);
  assertEquals(c.g2_e6_strips, 0);
  assertEquals(report.preamble, disclaimer);
});

Deno.test("W9 pre-emit / G3: FSOR bracket echo is stripped", () => {
  const report: any = {
    triggers_identified: [
      "[Agency position — FSOR: 11 CCR § 7001(ddd), Appendix p. 20]: behavioural advertising was removed. The record confirms the deployment is not in scope.",
    ],
  };
  const c = applyW9AdmtPreEmitGates(report);
  assertEquals(c.g3_reasoning_leak_strips, 1);
  assert(!/Agency position/i.test(report.triggers_identified[0]));
  assert(/record confirms/.test(report.triggers_identified[0]));
});

Deno.test("W9 pre-emit / G3: normalizer-token leak is stripped", () => {
  const report: any = {
    scope_analysis: {
      human_review_reasoning:
        "The _normalized_intake key indicates fully_automated=true. The record shows no human interposition.",
    },
  };
  const c = applyW9AdmtPreEmitGates(report);
  assertEquals(c.g3_reasoning_leak_strips, 1);
  assert(!/_normalized_intake/.test(report.scope_analysis.human_review_reasoning));
});

Deno.test("W9 pre-emit / G3: hedging deliberation cue is stripped", () => {
  const report: any = {
    priority_actions: [
      {
        action:
          "Publish the Pre-use Notice on the collection surface. Further internal investigation is advisable regarding vendor scope.",
      },
    ],
  };
  const c = applyW9AdmtPreEmitGates(report);
  assertEquals(c.g3_reasoning_leak_strips, 1);
  assert(!/further internal investigation/i.test(report.priority_actions[0].action));
  assert(/Pre-use Notice/.test(report.priority_actions[0].action));
});

Deno.test("W9 pre-emit / G4: § 7223 and § 7175 tokens rewrite to subchapter fallback", () => {
  const report: any = {
    documentation_to_maintain: [
      { finding: "Cross-reference § 7223(a) and 11 CCR § 7175(b) for retention." },
    ],
  };
  const c = applyW9AdmtPreEmitGates(report);
  assertEquals(c.g4_invented_section_rewrites, 2);
  assert(!/§\s*7223/i.test(report.documentation_to_maintain[0].finding));
  assert(!/§\s*7175/i.test(report.documentation_to_maintain[0].finding));
  const hits = (report.documentation_to_maintain[0].finding.match(/11 CCR §§ 7220–7222/g) || []).length;
  assertEquals(hits, 2);
});

Deno.test("W9 pre-emit / G4: § 7200–7222 span is preserved", () => {
  const report: any = { note: "See § 7220(c)(5) and 11 CCR § 7222(b)(3)." };
  const before = report.note;
  const c = applyW9AdmtPreEmitGates(report);
  assertEquals(c.g4_invented_section_rewrites, 0);
  assertEquals(report.note, before);
});

Deno.test("W9 pre-emit / reserved-key skip: citation field is not walked", () => {
  const report: any = {
    notice_gaps: [
      { finding: "The record does not disclose the ADMT logic.", citation: "§ 7001(e)(1)" },
    ],
  };
  const c = applyW9AdmtPreEmitGates(report);
  // finding has no defect; citation is a reserved key (resolver owns it)
  assertEquals(c.g1_h6_rewrites, 0);
  assertEquals(report.notice_gaps[0].citation, "§ 7001(e)(1)");
});

Deno.test("W9 pre-emit / mixed report exercises all four gates", () => {
  const report: any = {
    executive_summary:
      "The business must respond to access requests under § 7001(e)(1). Consult outside legal counsel about vendor scope. [Agency position — FSOR: 11 CCR § 7001(ddd)]: behavioural ads carved out. Cross-reference § 7250(a).",
  };
  const c = applyW9AdmtPreEmitGates(report);
  assertEquals(c.g1_h6_rewrites, 1);
  assertEquals(c.g2_e6_strips, 1);
  assertEquals(c.g3_reasoning_leak_strips, 1);
  assertEquals(c.g4_invented_section_rewrites, 1);
  assertEquals(c.fields_mutated, 1);
  assertEquals(c.stamp, W9_ADMT_PRE_EMIT_STAMP);
});
