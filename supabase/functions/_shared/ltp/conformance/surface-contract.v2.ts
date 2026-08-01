/**
 * ITEM 357 — CPPA-RISK CUSTOMER SURFACE CONTRACT, v2 (2026-08-01).
 *
 * SUPERSEDES surface-contract.v1.ts (Item 354). v1 was derived from
 * `assembleReport` output — an intermediate value — which is why it did not
 * predict the Item-355(#6) live surface (34 keys against a 32-key contract).
 *
 * v2 is REGENERATED FROM THE PERSISTED PAYLOAD: the exact object returned by
 * `generateCppaRiskReport().report`, which is the object written verbatim to
 * `cppa_assessments.report_data`. Nothing is added downstream of the module,
 * so contract and shipped payload can no longer diverge.
 *
 * FOUR-TEAM ADJUDICATION of the two Item-355(#6) live-only keys:
 *   - `risk_assessment_by_activity` — legitimate customer content (the § 7152
 *     per-activity carrier). DECLARED here. Optional by presence: the
 *     deterministic Pass-1 path emits it only when the plan carries covered
 *     activity rows (fill-or-omit); the model Pass-1 path emits it live.
 *   - `_engine_path` — telemetry. RELOCATED to `_meta.internal.engine_path`.
 *     Never a top-level customer key. Enforced by INTERNAL_TOP_LEVEL_FORBIDDEN.
 *
 * Declared keys: 33.
 *
 * Contract kinds:
 *   "prose"      — rendered-prose string (or array of prose strings/blocks)
 *   "scalar"     — rendered scalar: human value or null. NEVER a structure.
 *   "shaped"     — structured-but-customer-shaped (entry keys are customer keys)
 *   "internal"   — internal-forbidden on the customer surface; _meta only
 */
export const CPPA_RISK_SURFACE_CONTRACT_VERSION = "cppa-risk-surface-contract@v2-item357";

export type SurfaceKind = "prose" | "scalar" | "shaped" | "internal";

export interface SurfaceContractEntry {
  readonly key: string;
  readonly kind: SurfaceKind;
  /** Permitted JSON types: "string" | "number" | "boolean" | "object" | "array" | "null" */
  readonly types: readonly string[];
  /** When true the key may be absent (fill-or-omit); when present it must type-check. */
  readonly optional?: boolean;
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
  { key: "_meta", kind: "internal", types: ["object"], note: "The ONLY permitted home for factor tables, render plan, gate nodes, engine_path and LTP telemetry." },

  // Item 353 FAILURE 1 keys.
  { key: "overall_score", kind: "scalar", types: ["number", "null"], note: "LTP ships a band, not a 0-100 score: null." },
  { key: "risk_level", kind: "scalar", types: ["string"], note: "Low | Moderate | High | Critical | Insufficient basis." },
  { key: "risk_register", kind: "shaped", types: ["array"], note: "title/description/citation/status." },
  { key: "top_risks", kind: "shaped", types: ["array"], note: "title/description/citation/status." },

  { key: "submission_summary", kind: "prose", types: ["string"] },
  { key: "executive_summary", kind: "prose", types: ["string"] },
  { key: "assessment_summary", kind: "shaped", types: ["object"] },
  { key: "scope_and_triggers", kind: "shaped", types: ["array", "object"] },
  { key: "processing_narrative", kind: "prose", types: ["array"], note: "Prose blocks; non-empty and free of raw JSON." },
  { key: "activity_analytics", kind: "shaped", types: ["array"] },

  // ITEM 357 adjudication — § 7152 per-activity carrier, customer content.
  {
    key: "risk_assessment_by_activity",
    kind: "shaped",
    types: ["array"],
    optional: true,
    note: "Item 355(#6) live-only key, adjudicated as customer content. Emitted when the plan carries covered activity rows.",
  },

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
  { key: "enforcement_context", kind: "prose", types: ["string", "object"] },
  { key: "methodology_note", kind: "prose", types: ["string"] },
];

export const CPPA_RISK_SURFACE_KEYS: readonly string[] =
  CPPA_RISK_SURFACE_CONTRACT.map((e) => e.key);

export const CPPA_RISK_REQUIRED_SURFACE_KEYS: readonly string[] =
  CPPA_RISK_SURFACE_CONTRACT.filter((e) => !e.optional).map((e) => e.key);

/**
 * Keys that are TELEMETRY and must never appear at the top level of the
 * persisted payload. `_engine_path` / `_ltp` were the Item-355(#6) offenders.
 */
export const INTERNAL_TOP_LEVEL_FORBIDDEN: readonly string[] = [
  "_engine_path",
  "_ltp",
  "_debug",
  "_internal",
];
