// /admin/product-test — shared types.
//
// Doc 272 (2026-09-18) §0/§9: one admin page that generates real documents
// through the deployed product functions from panel fixtures (perfect or
// messy), grades every document with code via the `product-test-grade` edge
// function, and stores every check result. These types mirror that
// function's contract exactly (see doc 272 §9 / the task brief) and the
// three tables it and the page read and write:
//   product_test_runs, product_test_documents, product_test_checks.

import type { PanelTool } from "@/lib/ptestPanels/types";

export type { PanelTool } from "@/lib/ptestPanels/types";

// ─── Variants (product-test-grade action: "variants") ─────────────────────────

export type VariantKind =
  | "golden"
  | "thin-all"
  | "thin-one"
  | "blank-required"
  | "contradict"
  | "authored"
  | "wrong-regime";

export interface VariantExpectations {
  must_report_not_recorded: string[];
  must_not_contain: string[];
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

// ─── Grading (product-test-grade action: "grade") ──────────────────────────────

export type CheckFamily = "structure" | "fidelity" | "cross-block" | "legal" | "snapshot" | "stability";
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

export interface GradeResponse {
  checks: Check[];
  summary: GradeSummary;
  persist_error?: string;
}

// ─── Tables ─────────────────────────────────────────────────────────────────

export type RunStatus = "running" | "complete" | "stopped" | "failed";
export type DocumentStatus = "pending" | "generating" | "generated" | "graded" | "failed";
export type CheckStatus = "open" | "fixed-pending-deploy" | "cleared" | "accepted-by-design" | "ceo";
export type CheckClass = "product" | "fixture" | "check" | "ceo-decision";

/** One row of `product_test_runs.settings` / the argument to startRun. */
export interface ProductTestSettings {
  tools: PanelTool[];
  copies: number; // 1-15
  repeatSameFixture: boolean;
  variantKinds: VariantKind[]; // "golden" is always included
  concurrency: number; // default 3
}

export interface ToolSummary {
  documents: number;
  document_pass_rate: number; // 0..1
  checks_total: number;
  checks_passed: number;
  check_pass_rate: number; // 0..1
  critical: number;
  high: number;
  editorial: number;
}

export interface RunSummary {
  overall: ToolSummary;
  byTool: Partial<Record<PanelTool, ToolSummary>>;
}

export interface RunRow {
  id: string;
  created_at: string;
  created_by: string | null;
  status: RunStatus;
  settings: ProductTestSettings;
  log: string[];
  summary: RunSummary | null;
}

export interface DocumentRow {
  id: string;
  run_id: string;
  tool: string;
  fixture_id: string;
  variant_id: string;
  copy_index: number;
  source_table: string | null;
  source_row_id: string | null;
  status: DocumentStatus;
  error: string | null;
  document_hash: string | null;
  checks_total: number;
  checks_failed: number;
  critical: number;
  high: number;
  editorial: number;
  document_pass: boolean | null;
  created_at: string;
  completed_at: string | null;
}

export interface CheckRow {
  id: number;
  run_id: string;
  document_id: string;
  tool: string;
  fixture_id: string;
  variant_id: string;
  check_id: string;
  family: CheckFamily;
  severity: CheckSeverity;
  passed: boolean;
  block_key: string | null;
  quote: string | null;
  expected: string | null;
  actual: string | null;
  rule_ref: string | null;
  status: CheckStatus;
  class: CheckClass | null;
  note: string | null;
  created_at: string;
}
