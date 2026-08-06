// ITEM 396 — ADMT FALSE-ABSENCE DETECTOR GAP.
//
// Identities:
//   item396 linkage every prose-gold absence phrasing is detected
//   item396 linkage resolved labels are never absence
//   item396 a1 repairs a backed element from the record register
//   item396 a1 leaves the machine conclusion enum byte-identical
//   item396 perfect fixture leaves no open-items ledger
//   item396 degraded record keeps the honest unresolved state byte-identical
//   item396 degraded ledger names only the unbacked element
//   item396 a2 detects the prose-gold label class on a backed surface

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  admtCarriesAbsence,
  ADMT_LABEL_ABSENCE_RE,
  runAdmtCsc,
} from "../../../supabase/functions/_shared/ltp/admt-csc.ts";
import {
  ADMT_ABSENCE_LABEL_PHRASINGS,
  ADMT_CONCLUSION_LABELS,
  ADMT_RECORD_BACKED_LABEL,
  applyHedgeLedger,
} from "../../../supabase/functions/_shared/ltp/admt-prose-gold.ts";
import { ADMT_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-admt.ts";

const PERFECT = ADMT_PERFECT[0].intake as Record<string, unknown>;

function adequacyReport(): Record<string, unknown> {
  return {
    adequacy_finding: {
      logic_disclosure: {
        conclusion: "insufficient_basis",
        conclusion_label: ADMT_CONCLUSION_LABELS.insufficient_basis,
        reason:
          "Whether the business can explain how the technology produced its output is not established from the information supplied.",
      },
      human_intervention: {
        conclusion: "insufficient_basis",
        conclusion_label: ADMT_CONCLUSION_LABELS.insufficient_basis,
        reason:
          "Whether a human reviewer's involvement meets the three-part standard is not established from the information supplied.",
      },
      open_items:
        "Open items: the logic-disclosure element and the human-involvement element are unresolved; the intake details that would close them are listed under what the record does not yet state.",
    },
  };
}

Deno.test("item396 linkage every prose-gold absence phrasing is detected", () => {
  for (const phrase of ADMT_ABSENCE_LABEL_PHRASINGS) {
    assert(
      admtCarriesAbsence(phrase, []),
      `prose-gold phrasing escaped the CSC detector: ${phrase}`,
    );
    assert(ADMT_LABEL_ABSENCE_RE.test(phrase), phrase);
  }
});

Deno.test("item396 linkage resolved labels are never absence", () => {
  for (const label of ["adequate", "inadequate", "qualifies", "does not qualify", ADMT_RECORD_BACKED_LABEL]) {
    assertEquals(admtCarriesAbsence(label, []), null, label);
  }
});

Deno.test("item396 a1 repairs a backed element from the record register", () => {
  const report = adequacyReport();
  const t = runAdmtCsc(report, { intake: PERFECT });
  const a1 = t.violations.filter((v) => v.check_id === "a1_element_conclusion_vs_record");
  assertEquals(a1.length, 2);
  assert(a1.every((v) => v.repaired));
  const af = report.adequacy_finding as Record<string, any>;
  assert(String(af.logic_disclosure.reason).includes("plain-language explanation"), af.logic_disclosure.reason);
  assertEquals(af.logic_disclosure.conclusion_label, ADMT_RECORD_BACKED_LABEL);
  assertEquals(af.logic_disclosure.record_backed, true);
  assert(String(af.human_intervention.reason).length > 40);
});

Deno.test("item396 a1 leaves the machine conclusion enum byte-identical", () => {
  const report = adequacyReport();
  runAdmtCsc(report, { intake: PERFECT });
  const af = report.adequacy_finding as Record<string, any>;
  assertEquals(af.logic_disclosure.conclusion, "insufficient_basis");
  assertEquals(af.human_intervention.conclusion, "insufficient_basis");
});

Deno.test("item396 perfect fixture leaves no open-items ledger", () => {
  const report = adequacyReport();
  runAdmtCsc(report, { intake: PERFECT });
  const af = report.adequacy_finding as Record<string, unknown>;
  assertEquals("open_items" in af, false);
  // and the prose-gold ledger writer agrees on a re-run.
  const again = applyHedgeLedger(report);
  assertEquals(again.unresolved, []);
  assertEquals("open_items" in af, false);
});

Deno.test("item396 degraded record keeps the honest unresolved state byte-identical", () => {
  const report = adequacyReport();
  const before = JSON.stringify(report.adequacy_finding);
  const t = runAdmtCsc(report, { intake: { system_name: "ShiftRank" } });
  assertEquals(t.violations.filter((v) => v.check_id === "a1_element_conclusion_vs_record").length, 0);
  assertEquals(JSON.stringify(report.adequacy_finding), before);
});

Deno.test("item396 degraded ledger names only the unbacked element", () => {
  const report = adequacyReport();
  // Only the logic-disclosure backing key is answered.
  runAdmtCsc(report, { intake: { access_logic_disclosure: PERFECT.access_logic_disclosure } });
  const af = report.adequacy_finding as Record<string, any>;
  assertEquals(af.logic_disclosure.record_backed, true);
  assertEquals(af.human_intervention.record_backed, undefined);
  assert(String(af.open_items).includes("the human-involvement element"));
  assertEquals(String(af.open_items).includes("logic-disclosure"), false);
});

Deno.test("item396 a2 detects the prose-gold label class on a backed surface", () => {
  const report: Record<string, unknown> = {
    scope_analysis: {
      human_review_reasoning:
        "Whether a human reviewer's involvement meets the three-part standard is not established from the information supplied.",
    },
  };
  const t = runAdmtCsc(report, { intake: PERFECT });
  const a2 = t.violations.find((v) => v.check_id === "a2_absence_claim_vs_record");
  assert(a2, "expected an a2 violation on the relabelled surface");
  assertEquals(a2!.repaired, true);
});
