// /admin/product-test — document generation (doc 272 §1, §9).
//
// Reuses the exact insert → invoke → poll → fetch-output sequence a
// customer's browser performs, via assertionRunner's `generateForTool`
// (extracted from runSingleTool for this purpose — see that file's
// comment above the export). No new generation logic lives here: this
// module only maps a PanelTool id to the AssertionTest template that
// carries the right edge function and poll config, swaps in the intake
// under test, and records which table/row the document came from.

import {
  ADMT_TEST,
  BIOMETRIC_TEST,
  CPPA_CYBER_TEST,
  CPPA_RISK_TEST,
  DPA_TEST,
  DPIA_TEST,
  EU_NOTICE_TEST,
  GOVERNANCE_TEST,
  IR_TEST,
  LIA_TEST,
  REGISTRATION_TEST,
  ROPA_TEST,
  US_NOTICE_TEST,
  type AssertionTest,
} from "@/lib/tests/assertionTests";
import { generateForTool } from "@/lib/tests/assertionRunner";
import type { PanelTool } from "@/lib/ptestPanels/types";

/** PanelTool → the AssertionTest template that carries its edgeFunction and
 *  pollConfig (the assertion tests' fields are the source of truth per the
 *  task brief; ADMT is run-admt-checker-v2 / module admt_v2). testInput on
 *  the template is a fixed fixture — generateDocument always overrides it
 *  with the intake under test. */
const TOOL_TEMPLATE: Record<PanelTool, AssertionTest> = {
  "cppa-risk": CPPA_RISK_TEST,
  "cppa-cyber": CPPA_CYBER_TEST,
  "cppa-admt": ADMT_TEST,
  "dpia": DPIA_TEST,
  "lia": LIA_TEST,
  "governance": GOVERNANCE_TEST,
  "ir-playbook": IR_TEST,
  "biometric": BIOMETRIC_TEST,
  "dpa": DPA_TEST,
  "ropa": ROPA_TEST,
  "us-notice": US_NOTICE_TEST,
  "eu-notice": EU_NOTICE_TEST,
  "registration": REGISTRATION_TEST,
};

/** PanelTool → the table generateForTool's recordId belongs to (mirrors the
 *  table each arm inserts into / polls, per assertionRunner.ts). */
const TOOL_SOURCE_TABLE: Record<PanelTool, string> = {
  "cppa-risk": "cppa_assessments",
  "cppa-cyber": "cppa_assessments",
  "cppa-admt": "cppa_assessments",
  "dpia": "dpia_frameworks",
  "lia": "li_assessments",
  "governance": "governance_assessments",
  "ir-playbook": "ir_playbooks",
  "biometric": "biometric_assessments",
  "dpa": "dpa_documents",
  "ropa": "ropa_sessions",
  "us-notice": "us_notice_sessions",
  "eu-notice": "eu_notice_sessions",
  "registration": "registration_orders",
};

export interface GenerateDocumentResult {
  sourceTable: string;
  sourceRowId: string;
  output: Record<string, unknown>;
}

export interface GenerateDocumentOptions {
  log: (line: string) => void;
  signal?: AbortSignal;
  userId: string;
}

/**
 * Generates one document for `tool` from `intake` through the deployed
 * product function — identical to a customer's browser session, and to what
 * the assertion runner does per tool. Excludes the brief and word-export
 * tools (not products; not in PanelTool at all).
 *
 * KNOWN LIMITATION (pre-existing in assertionRunner.ts, unchanged here):
 * RoPA's generation arm (setupAndRunRopa) always builds its session from the
 * fixed ROPA_TEST_FIXTURE persona; it does not consume `intake`. A messy or
 * alternate RoPA intake therefore has no effect on what gets generated for
 * that tool. Every other tool consumes `intake` directly.
 */
/**
 * li_assessments is a COLUMN table, not an intake_data jsonb: the LIA arm
 * spreads the intake into the insert, so any key that is not a column fails
 * the whole insert ("Could not find the 'use_case_code_confirmed' column").
 * The panel fixtures carry form keys beyond the columns. This is the same
 * whitelist run-stress-job applies (supabase/functions/run-stress-job/
 * index.ts LIA_COLUMNS); keep the two in step. Lead fix 2026-09-18 after run
 * 72e9a63c, where all 28 LIA inserts failed.
 */
const LIA_COLUMNS = new Set([
  "alternatives_considered", "attestation", "balancing_details", "client_id",
  "data_categories", "is_subscriber_credit", "jurisdictions", "necessity_details",
  "organization_name", "preview_signal", "processing_description",
  "purchase_price_cents", "purchased_as_standalone", "purpose_details",
  "relationship_type", "report_version", "sector", "stage", "stated_purpose",
  "status", "subject_anchor", "supplemental_context", "supplemental_responses",
]);

function intakeForInsert(tool: PanelTool, intake: Record<string, unknown>, log: (l: string) => void): Record<string, unknown> {
  if (tool !== "lia") return intake;
  const kept: Record<string, unknown> = {};
  const dropped: string[] = [];
  for (const [k, v] of Object.entries(intake)) {
    if (LIA_COLUMNS.has(k)) kept[k] = v; else dropped.push(k);
  }
  if (dropped.length) log(`lia: ${dropped.length} non-column key(s) not inserted (${dropped.slice(0, 6).join(", ")}${dropped.length > 6 ? ", …" : ""})`);
  return kept;
}

export async function generateDocument(
  tool: PanelTool,
  intake: Record<string, unknown>,
  opts: GenerateDocumentOptions,
): Promise<GenerateDocumentResult> {
  const template = TOOL_TEMPLATE[tool];
  if (!template) throw new Error(`generateDocument: no generation template for tool "${tool}"`);
  intake = intakeForInsert(tool, intake, opts.log);

  const signal = opts.signal ?? new AbortController().signal;
  const test: Pick<AssertionTest, "toolId" | "edgeFunction" | "testInput" | "pollConfig"> = {
    toolId: template.toolId,
    edgeFunction: template.edgeFunction,
    testInput: intake,
    pollConfig: template.pollConfig,
  };

  const { output, recordId } = await generateForTool(test, opts.userId, opts.log, signal);
  if (!recordId) {
    throw new Error(`generateDocument: ${tool} generation returned no record id`);
  }

  return {
    sourceTable: TOOL_SOURCE_TABLE[tool],
    sourceRowId: recordId,
    output: (output ?? {}) as Record<string, unknown>,
  };
}
