// product-test-grade — shared types (doc 272 §6, doc 271 §5).
//
// No model import anywhere in this tree. See tests/edge/product-test/
// no-model-import.test.ts for the deno-info scan that enforces it.

// Mirrors PANEL_TOOLS / PanelTool in src/lib/ptestPanels/types.ts (2026-09-18).
// Inlined (not imported) so this function's deploy closure never reaches
// outside supabase/functions — the frontend source tree is not deployed.
export const PRODUCT_TEST_TOOLS = [
  "cppa-risk",
  "cppa-cyber",
  "cppa-admt",
  "dpia",
  "lia",
  "governance",
  "ir-playbook",
  "biometric",
  "dpa",
  "ropa",
  "us-notice",
  "eu-notice",
  "registration",
] as const;

export type ProductTestTool = typeof PRODUCT_TEST_TOOLS[number];

export type VariantKind =
  | "golden"
  | "thin-all"
  | "thin-one"
  | "blank-required"
  | "contradict"
  | "authored"
  | "wrong-regime";

export interface VariantExpectations {
  /** Labels (contract field label if present, else the key) of keys the
   *  document must report as not recorded / not on the record. */
  must_report_not_recorded: string[];
  /** Strings that must be ABSENT from the rendered document. */
  must_not_contain: string[];
  /** Strings that must be PRESENT in the rendered document. */
  must_contain: string[];
}

export interface Variant {
  variant_id: string;
  kind: VariantKind;
  description: string;
  intake: Record<string, unknown>;
  removed_keys: string[];
  expectations: VariantExpectations;
}

export type CheckFamily =
  | "structure"
  | "fidelity"
  | "cross-block"
  | "legal"
  | "snapshot"
  | "stability";

export type CheckSeverity = "critical" | "high" | "editorial";

export interface Check {
  check_id: string;
  family: CheckFamily;
  severity: CheckSeverity;
  passed: boolean;
  block_key?: string;
  quote?: string;
  expected?: string;
  actual?: string;
  rule_ref?: string;
}

export interface GradeSummary {
  total: number;
  passed: number;
  failed: number;
  critical: number;
  high: number;
  editorial: number;
  document_pass: boolean;
  document_hash: string;
  text_length: number;
}

export interface GradeInput {
  run_id?: string;
  document_id?: string;
  tool: ProductTestTool;
  fixture_id: string;
  variant_id: string;
  intake: Record<string, unknown>;
  /** The object the frontend fetched: report_data merged with text fields,
   *  exactly what assertionRunner (src/lib/tests/assertionRunner.ts:280-420)
   *  produces for that tool. */
  output: Record<string, unknown>;
  expectations?: VariantExpectations;
  panel_companies?: string[];
}

export interface GradeResult {
  checks: Check[];
  summary: GradeSummary;
}
