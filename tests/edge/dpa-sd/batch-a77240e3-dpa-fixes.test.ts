// BATCH a77240e3 (2026-09-12) — ChatGPT's "Report Prose Review v5" plus
// Claude's independent code check agreed on two real DPA defects.
//
// DPA5-02 (Velorix, CCPA) — the main-body clause 12.0 asserted the
// Controller/Processor are a CCPA "Business"/"Service Provider" flatly,
// while the CCPA Addendum's own clause 1.2 correctly conditions the same
// defined terms ("to the extent it qualifies"). The doc-81 D-7 ratified
// clause 12.0 text is UNCHANGED (still pinned by sd1r-doc81-redline.test.ts)
// — this only adds a second, additive sentence bringing 12.0 in line with
// the addendum's own conditional scope.
// DPA5-03 (Velorix, Delaware) — Schedule 3 fell through to the generic
// "Other Covered State" catch-all for a Delaware-only record, unlike every
// other listed state, because Delaware carried no `supplement`.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleDpaDocument, type DpaAssembleInput } from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-assemble.ts";
import { usMultiStateAddendum, type DpaAddendaCtx } from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-addenda.ts";
import { DPA_US_COVERED_STATE_LAWS } from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-v2-supplement.ts";

const BASE: DpaAssembleInput = {
  documentType: "us-state",
  controllerName: "Velorix Media Corp.",
  controllerJurisdiction: "Delaware",
  processorName: "ContextStream Inc.",
  processorJurisdiction: "California",
  services: "programmatic ad delivery",
  dataCategories: ["General personal data"],
  retention: "For the duration of the principal agreement, then delete or return",
  hasSubProcessors: false,
  subProcessorList: "",
  subprocessorAuthorizationModel: "general",
  subprocessorNoticeDays: 30,
  auditRights: "Annual audit",
  includeTransferClause: false,
  transferMechanism: "",
  securityMeasuresSelected: [],
  securityMeasuresDetails: "",
  californiaEngaged: true,
};

// ── DPA5-02 ──────────────────────────────────────────────────────────────

Deno.test("DPA5-02 — clause 12.0's ratified D-7 text is unchanged, and a new conditional sentence is appended", () => {
  const t = assembleDpaDocument(BASE).document_text;
  // D-7 (doc-81 ratified) bytes still present, untouched.
  assertStringIncludes(t, 'the Controller is a "Business" and the Processor is a "Service Provider"');
  assertStringIncludes(t, "Cal. Civ. Code § 1798.140");
  // The new, additive conditional sentence.
  assertStringIncludes(t, 'This characterization applies to the extent the Controller in fact meets the CCPA\'s threshold definition of "business"');
  assertStringIncludes(t, "nothing in this Section itself establishes that the threshold is met");
});

Deno.test("DPA5-02 — the addendum's own clause 1.2 conditional phrasing is untouched (no regression)", () => {
  const t = assembleDpaDocument(BASE).document_text;
  assertStringIncludes(t, '"Business" means the Controller to the extent it qualifies as a "business" under the CCPA');
});

// ── DPA5-03 ──────────────────────────────────────────────────────────────

function delawareCtx(over: Partial<DpaAddendaCtx> = {}): DpaAddendaCtx {
  const delaware = DPA_US_COVERED_STATE_LAWS.find((l) => l.state === "Delaware")!;
  return {
    controllerName: "Velorix Media Corp.", controllerJurisdiction: "Delaware",
    processorName: "ContextStream Inc.", processorJurisdiction: "California",
    services: "programmatic ad delivery", dataCategories: ["General personal data"],
    retention: "Duration of the agreement", auditRights: "Annual audit",
    hasSubProcessors: false, subProcessorRows: [],
    subprocessorAuthorizationModel: "general", subprocessorNoticeDays: 30,
    securityMeasureLabels: [], securityMeasuresDetails: "",
    includeTransferClause: false, transferMechanism: "",
    engagement: { gdprEngaged: false, ukEngaged: false, californiaEngaged: false, usStatesEngaged: ["Delaware"] } as never,
    coveredLaws: [delaware],
    ...over,
  };
}

Deno.test("DPA5-03 — Delaware now carries its own Schedule 3 supplement instead of falling to the generic catch-all alone", () => {
  const addendum = usMultiStateAddendum(delawareCtx());
  const schedule3 = addendum.schedules.find((s) => s.title.startsWith("Schedule 3"))!;
  const delawareRow = schedule3.rows.find((r) => r[0] === "Delaware");
  assert(delawareRow, "expected a Delaware-specific Schedule 3 row");
  assertStringIncludes(delawareRow![1], "Delaware Personal Data Privacy Act requires of processors");
  // The generic catch-all still exists as a backstop for any OTHER state.
  assert(schedule3.rows.some((r) => r[0] === "Other Covered State"));
});

Deno.test("DPA5-03 — the Delaware supplement states only processor-contract terms, not controller-only duties (per ChatGPT's own caution)", () => {
  const addendum = usMultiStateAddendum(delawareCtx());
  const schedule3 = addendum.schedules.find((s) => s.title.startsWith("Schedule 3"))!;
  const delawareRow = schedule3.rows.find((r) => r[0] === "Delaware")!;
  const text = delawareRow[1].toLowerCase();
  assert(!text.includes("universal opt-out"), "must not add a controller-only universal opt-out duty");
  assert(!text.includes("cure period"), "must not add a controller-only cure-period duty");
  assert(!text.includes("data protection assessment"), "must not add a controller-only assessment duty");
});
