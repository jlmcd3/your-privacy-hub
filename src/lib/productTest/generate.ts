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
export async function generateDocument(
  tool: PanelTool,
  intake: Record<string, unknown>,
  opts: GenerateDocumentOptions,
): Promise<GenerateDocumentResult> {
  const template = TOOL_TEMPLATE[tool];
  if (!template) throw new Error(`generateDocument: no generation template for tool "${tool}"`);

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
