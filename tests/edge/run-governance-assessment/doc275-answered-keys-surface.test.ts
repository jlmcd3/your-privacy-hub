// DOC 275 §19.1 rows 6-9 (2026-09-19, CEO-approved) — four record-fidelity
// changes so intake keys the pipeline already collects and computes reach the
// customer document instead of being read and discarded:
//
//   row 6 — territorial_scope_basis (Article 3): surfaced as a "Why the GDPR
//     applies" sentence in organisation_and_data (organisation_and_data's
//     fixed skeleton prose is hash-pinned and carries no table/generated
//     block for this section — the fact rides the existing EU_UK_SENTENCE
//     slot's own value instead of a new slot).
//   row 7 — processor_count: appended after the vendor-domain prose in
//     processors_and_transfers.
//   row 8 — dsr_rights_tested: the DOC 162 record-fact tail subjectRights()
//     already composes into current_state, now stated at the "Individuals'
//     rights" ICO crosswalk row (the one place that domain's finding
//     reaches the customer).
//   row 9 — dpia_ai_coverage: the DOC 162 record-fact tail dpiaStatus()
//     already composes into current_state, now stated at the "Risks and
//     DPIAs" ICO crosswalk row, regardless of whether that row's base text
//     came from the risk-calibration verdict or the DPIA domain severity.
//
// Every change is additive prose only: no determination, verdict or severity
// changes. Fixture: PANEL_GOVERNANCE[0] (Solara Cloudworks B.V.) — the same
// panel doc 275 was verified against, chosen because it answers all four
// keys and has UK in scope (the ICO crosswalk section renders only when
// hasGovernanceUkInScope() is true).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PANEL_GOVERNANCE } from "../../../src/lib/ptestPanels/governance.ts";
import { attachGovernanceDeliverables } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import { buildDomainFindingsTyped, composeExecutiveSummaryTyped } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-domain-tables.ts";
import { assembleGovernanceSkeletonDocument } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";
import { attachReadinessDetermination } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-readiness.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;
const clone = (o: unknown): Bag => JSON.parse(JSON.stringify(o));
const PANEL0 = () => clone(PANEL_GOVERNANCE[0].intake);

function renderText(intake: Bag): string {
  const report: Bag = { authority_exhibit: { entries: [] } };
  const domains = buildDomainFindingsTyped(intake);
  report.domain_findings = domains;
  report.executive_summary = composeExecutiveSummaryTyped(domains);
  attachGovernanceDeliverables(report, intake);
  attachReadinessDetermination(report);
  const { document } = assembleGovernanceSkeletonDocument(report, intake);
  return skeletonDocumentToText(document);
}

// ── Baseline: all four record facts present on the answered panel ──────────

Deno.test("doc275 — PANEL_GOVERNANCE[0] surfaces territorial_scope_basis as a 'Why the GDPR applies' sentence in organisation_and_data", () => {
  const text = renderText(PANEL0());
  assertStringIncludes(text, "Why the GDPR applies");
  assertStringIncludes(text, "Established in the EU or EEA");
});

Deno.test("doc275 — PANEL_GOVERNANCE[0] surfaces processor_count after the vendor-domain prose in processors_and_transfers", () => {
  const text = renderText(PANEL0());
  assertStringIncludes(text, "The Company reports its processors as:");
  assertStringIncludes(text, "Microsoft 365 / Copilot");
});

Deno.test("doc275 — PANEL_GOVERNANCE[0] surfaces dsr_rights_tested at the Individuals' rights crosswalk row", () => {
  const text = renderText(PANEL0());
  assertStringIncludes(text, "Access, Erasure, Portability, Rectification");
});

Deno.test("doc275 — PANEL_GOVERNANCE[0] surfaces dpia_ai_coverage at the Risks and DPIAs crosswalk row", () => {
  const text = renderText(PANEL0());
  assertStringIncludes(text, "recorded as assessed");
});

// ── Each key is load-bearing: deleting it changes the rendered text ────────

Deno.test("doc275 — deleting territorial_scope_basis changes the text and yields the 'Not stated' row", () => {
  const withKey = renderText(PANEL0());
  const intake = PANEL0();
  delete intake.territorial_scope_basis;
  const withoutKey = renderText(intake);
  assert(withKey !== withoutKey, "removing territorial_scope_basis had no effect on the rendered text");
  assertStringIncludes(
    withoutKey,
    "Why the GDPR applies: Not stated — this assessment proceeds on the Company's instruction that the GDPR applies to it.",
  );
});

Deno.test("doc275 — deleting processor_count changes the text", () => {
  const withKey = renderText(PANEL0());
  const intake = PANEL0();
  delete intake.processor_count;
  const withoutKey = renderText(intake);
  assert(withKey !== withoutKey, "removing processor_count had no effect on the rendered text");
});

Deno.test("doc275 — deleting dsr_rights_tested changes the text", () => {
  const withKey = renderText(PANEL0());
  const intake = PANEL0();
  delete intake.dsr_rights_tested;
  const withoutKey = renderText(intake);
  assert(withKey !== withoutKey, "removing dsr_rights_tested had no effect on the rendered text");
});

Deno.test("doc275 — deleting dpia_ai_coverage changes the text", () => {
  const withKey = renderText(PANEL0());
  const intake = PANEL0();
  delete intake.dpia_ai_coverage;
  const withoutKey = renderText(intake);
  assert(withKey !== withoutKey, "removing dpia_ai_coverage had no effect on the rendered text");
});

// ── No determination moves: conformance stays clean ─────────────────────────

Deno.test("doc275 — the four additive changes do not break skeleton conformance", () => {
  const report: Bag = { authority_exhibit: { entries: [] } };
  const intake = PANEL0();
  const domains = buildDomainFindingsTyped(intake);
  report.domain_findings = domains;
  report.executive_summary = composeExecutiveSummaryTyped(domains);
  attachGovernanceDeliverables(report, intake);
  attachReadinessDetermination(report);
  const res = assembleGovernanceSkeletonDocument(report, intake);
  assertEquals(res.conformance.length, 0, JSON.stringify(res.conformance));
});
