/**
 * ITEM 354 — CPPA-RISK CUSTOMER SURFACE CONTRACT, v1 (2026-08-01).
 *
 * Versioned fixture. Enumerates EVERY top-level key the LTP cppa-risk report
 * ships, walked exhaustively from the persisted report_data of both smoke
 * fixtures (tests/edge/fixtures/item350/perfect-a073d9c5.json and
 * messy-bd458f0d.json) — no sampling.
 *
 * Contract kinds:
 *   "prose"      — rendered-prose string (or array of prose strings/blocks)
 *   "scalar"     — rendered scalar: human value or null. NEVER a structure.
 *   "shaped"     — structured-but-customer-shaped (entry keys are customer keys)
 *   "internal"   — internal-forbidden on the customer surface; _meta only
 */
export const CPPA_RISK_SURFACE_CONTRACT_VERSION = "cppa-risk-surface-contract@v1-item354";

export type SurfaceKind = "prose" | "scalar" | "shaped" | "internal";

export interface SurfaceContractEntry {
  readonly key: string;
  readonly kind: SurfaceKind;
  /** Permitted JSON types: "string" | "number" | "boolean" | "object" | "array" | "null" */
  readonly types: readonly string[];
  readonly note?: string;
}

export const CPPA_RISK_SURFACE_CONTRACT: readonly SurfaceContractEntry[] = [
  { key: "schema_version", kind: "scalar", types: ["string"] },
  { key: "document_metadata", kind: "shaped", types: ["object"], note: "tool / render_plan_version / build_stamp / jurisdiction_tag (human label)." },
  { key: "attestation_block", kind: "shaped", types: ["object"] },
  { key: "disclaimer", kind: "prose", types: ["string"] },
  { key: "framework_disclaimer", kind: "prose", types: ["string"] },
  { key: "accuracy_caveat", kind: "prose", types: ["string"] },
  { key: "domains", kind: "shaped", types: ["array"] },
  { key: "_meta", kind: "internal", types: ["object"], note: "The ONLY permitted home for factor tables, render plan and gate nodes." },

  // Item 353 FAILURE 1 keys.
  { key: "overall_score", kind: "scalar", types: ["number", "null"], note: "LTP ships a band, not a 0-100 score: null." },
  { key: "risk_level", kind: "scalar", types: ["string"], note: "Low | Moderate | High | Critical | Insufficient basis." },
  { key: "risk_register", kind: "shaped", types: ["array"], note: "title/description/citation/status." },
  { key: "top_risks", kind: "shaped", types: ["array"], note: "title/description/citation/status." },

  { key: "submission_summary", kind: "prose", types: ["string"] },
  { key: "executive_summary", kind: "prose", types: ["string"] },
  { key: "assessment_summary", kind: "shaped", types: ["object"] },
  { key: "scope_and_triggers", kind: "shaped", types: ["array"] },
  { key: "processing_narrative", kind: "prose", types: ["array"], note: "Prose blocks; non-empty and free of raw JSON." },
  { key: "activity_analytics", kind: "shaped", types: ["array"] },
  { key: "eu_persuasive_authority", kind: "shaped", types: ["object"] },
  { key: "priority_actions", kind: "shaped", types: ["array"] },
  { key: "next_steps", kind: "shaped", types: ["array"] },
  { key: "inconsistency_flags", kind: "shaped", types: ["array"] },
  { key: "record_sufficiency", kind: "prose", types: ["array"] },
  { key: "information_needed", kind: "shaped", types: ["array"] },
  { key: "part_a", kind: "shaped", types: ["object"] },
  { key: "part_b", kind: "shaped", types: ["object"] },
  { key: "gating", kind: "shaped", types: ["object"] },
  { key: "annotations", kind: "shaped", types: ["array"], note: "title/citation only." },
  { key: "requires_attorney_review", kind: "scalar", types: ["boolean"] },
  { key: "citation_ledger", kind: "shaped", types: ["array"] },
  { key: "enforcement_context", kind: "prose", types: ["string"] },
  { key: "methodology_note", kind: "prose", types: ["string"] },
];

export const CPPA_RISK_SURFACE_KEYS: readonly string[] =
  CPPA_RISK_SURFACE_CONTRACT.map((e) => e.key);
