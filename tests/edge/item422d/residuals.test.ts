/**
 * ITEM 422-D — the three residual defects from the 422-C acceptance pilot.
 *   D1 finding → action pinpoint inheritance (both directions)
 *   D2 writer-side operator-instruction sweep, linked to the e4/e6 detector
 *   D3 diagnosis only (checker-side; see the item report) — no test here
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  linkAdmtActionsToFindings,
  findSourceFinding,
  resolveFindingPinpoint,
  isBlanketAnchor,
  ADMT_ACTION_LINKAGE_VERSION,
} from "../../../supabase/functions/run-admt-checker/_local/ltp/admt-action-finding-linkage.ts";
import {
  resolveAdmtActionCitations,
  ADMT_SUBCHAPTER_FALLBACK,
} from "../../../supabase/functions/run-admt-checker/_local/ltp/admt-action-citations.ts";
import { ADMT_VERIFIED_AUTHORITIES } from "../../../supabase/functions/run-admt-checker/_local/registry/admt-verified-authorities.ts";
import {
  sweepAdmtOperatorInstructions,
  sweepLeaf,
  sentenceLeaks,
  MIN_SUBSTANCE,
} from "../../../supabase/functions/run-admt-checker/_local/ltp/admt-operator-instruction-sweep.ts";
import { ADMT_PIPELINE_STAMP } from "../../../supabase/functions/run-admt-checker/_local/prose/plans/admt.spine.ts";

Deno.test("item422d — stamps", () => {
  assertEquals(ADMT_PIPELINE_STAMP, "admt-pipeline@item422d-2026-08-09");
  assertEquals(ADMT_ACTION_LINKAGE_VERSION, "admt-action-finding-linkage@item422d-2026-08-09");
});

const OPTOUT_FINDING = {
  status: "gap",
  element: "Two or more designated opt-out submission methods, including online form with compliant link title",
  element_id: "optout_designated_methods",
  citation: "11 CCR § 7221",
  finding:
    "The opt-out link title recorded in the intake is 'Decide My Application Without Automated Scoring.' The link title must state what the consumer is opting out of; the current title describes an outcome rather than naming the right being exercised.",
  remediation: "Revise the opt-out link title so it identifies the ADMT opt-out right.",
};

Deno.test("item422d D1 — a finding-derived action inherits the finding's pinpoint", () => {
  const report: Record<string, unknown> = {
    opt_out_gaps: [OPTOUT_FINDING],
    priority_actions: [{
      rank: 1,
      action:
        "Revise the opt-out link title in the Pre-use Notice and leasing portal to expressly identify the right being exercised, naming the automated decisionmaking opt-out.",
      citation: "11 CCR § 7221(a)",
      proposition_key: "optout_offer",
    }],
  };
  const diag = linkAdmtActionsToFindings(report, {});
  assertEquals(diag.linked, 1);
  const a = (report.priority_actions as Record<string, unknown>[])[0];
  // Byte-identical to the pinpoint the document resolves for that element.
  assertEquals(a.citation, resolveFindingPinpoint(OPTOUT_FINDING, {}));
  assertEquals(a.citation, "11 CCR § 7221(c)");
  assertEquals(a._citation_inherited, true);
  assertEquals((a._source_finding as Record<string, unknown>).element_id, "optout_designated_methods");
  // The catch-all proposition is cleared, not re-asserted.
  assertEquals(a.proposition_key, "");

  // ...and the 422-C anchor gate leaves the inherited pinpoint alone.
  const gate = resolveAdmtActionCitations(report, ADMT_VERIFIED_AUTHORITIES);
  assertEquals(gate.untouched, 1);
  assertEquals(a.citation, "11 CCR § 7221(c)");
});

Deno.test("item422d D1 — a standalone action is still anchor-gated", () => {
  const report: Record<string, unknown> = {
    opt_out_gaps: [OPTOUT_FINDING],
    priority_actions: [{
      rank: 1,
      action: "Retain the vendor onboarding checklist in the shared compliance drive for audit purposes.",
      citation: "11 CCR § 7999(z)",
    }],
  };
  const diag = linkAdmtActionsToFindings(report, {});
  assertEquals(diag.linked, 0);
  assertEquals(diag.unlinked, 1);
  const a = (report.priority_actions as Record<string, unknown>[])[0];
  assert(a._citation_inherited === undefined);
  resolveAdmtActionCitations(report, ADMT_VERIFIED_AUTHORITIES);
  assertEquals(a.citation, ADMT_SUBCHAPTER_FALLBACK);
  assertEquals(a.proposition_key, "");
});

Deno.test("item422d D1 — ambiguous match takes no link", () => {
  const twin = { ...OPTOUT_FINDING, element_id: "optout_confirmation" };
  const report: Record<string, unknown> = {
    opt_out_gaps: [OPTOUT_FINDING, twin],
    priority_actions: [{ rank: 1, action: OPTOUT_FINDING.finding }],
  };
  const diag = linkAdmtActionsToFindings(report, {});
  assertEquals(diag.linked, 0);
  assertEquals(findSourceFinding(OPTOUT_FINDING.finding, report), null);
});

Deno.test("item422d D1 — blanket anchors never inherit", () => {
  assert(isBlanketAnchor("11 CCR §§ 7200–7222"));
  assert(isBlanketAnchor("the applicable ADMT-subchapter provision"));
  assertEquals(resolveFindingPinpoint({ citation: "11 CCR §§ 7200–7222" }, {}), "");
});

const LEAK =
  "Insert this block into the access-response template as its own labeled section; the Consumer-Request Handler must complete each bracketed field from the applicant's record before sending the response, and the Privacy Officer should confirm with the Product Owner which future-use scenario applies so the correct alternative language is selected.";

Deno.test("item422d D2 — linkage: whatever the detector detects, the writer removes first", () => {
  assert(sentenceLeaks(LEAK), "detector must flag the pilot's leaked instruction");
  const body =
    "The access response states the band the Tenancy Fit Index returned and the tenancy decision that followed, which satisfies the outcome-of-decisionmaking requirement for past decisions. " +
    LEAK +
    " The record documents the response channel used for each applicant.";
  const { out, removed } = sweepLeaf(body);
  assertEquals(removed.length, 1);
  assert(!out.includes("Insert this block"));
  assert(!out.includes("bracketed field"));
});

Deno.test("item422d D2 — sweep relocates to the operator leaf and clears the detector", () => {
  const report: Record<string, unknown> = {
    access_readiness_findings: [{
      element: "Outcome disclosure",
      finding:
        "The access response records the band returned and the decision issued, which satisfies the outcome-of-decisionmaking requirement for past decisions on this record. " +
        LEAK,
    }],
  };
  const diag = sweepAdmtOperatorInstructions(report);
  assertEquals(diag.sentences_removed, 1);
  const f = (report.access_readiness_findings as Record<string, unknown>[])[0];
  assert(!String(f.finding).includes("bracketed field"));
  assertEquals((report._operator_notes as string[]).length, 1);
  assert((report._operator_notes as string[])[0].includes("Insert this block"));
});

Deno.test("item422d D2 — ITEM 384 r2 empty-surface guard keeps the original", () => {
  const only = LEAK;
  const { out, removed } = sweepLeaf(only);
  assertEquals(removed.length, 0);
  assertEquals(out, only);
  assert(MIN_SUBSTANCE === 40);
});

Deno.test("item422d D2 — clean prose is untouched", () => {
  const clean =
    "The business must provide the opt-out through two or more designated methods, and the record documents both the online form and the toll-free number in use today.";
  const { out, removed } = sweepLeaf(clean);
  assertEquals(removed.length, 0);
  assertEquals(out, clean);
});
