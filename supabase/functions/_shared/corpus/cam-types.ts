// The Curated Attachment Map (CAM) — the single primitive through which
// corpus content is allowed to enter a product's document (doc 48 §II.2).
// PHASE 1 (doc 52): every row's render_eligible is the literal `false` —
// a type-level ratchet. Phase 2 must consciously widen this type to admit
// customer-visible rows; that widening is CEO-redline work, not a phase-1
// change.

export type CamRole = "AQ" | "FC" | "AP" | "SB" | "AOW";
export type CamSurface = "S0" | "S1" | "S2" | "S3" | "S4" | "S5";

export type LogicDisposition =
  | { kind: "implemented"; branch_ref: string } // "file.ts:symbolOrConstant"
  | { kind: "extension_filed"; queue_ref: string } // decision-queue entry id
  | { kind: "declined"; reason: string }; // legal reasoning, 1-3 sentences

export interface CamRow {
  readonly id: string; // "<product>/<factor_id>/<nn>"
  readonly factor_id: string; // EXACT Determination-appendix label
  readonly role: CamRole; // phase 1: "FC" only (see below)
  readonly source_table:
    | "cppa_fsor_commentary"
    | "cppa_authorities"
    | "provision_texts"
    | "edpb_guidelines"
    | "gdpr_articles"
    | "gdpr_recitals"
    | "enforcement_actions";
  readonly source_row_id: string;
  readonly excerpt_field: string; // e.g. "agency_position_summary"
  readonly pinned_excerpt: string; // exact substring of that field; ≤300 chars
  readonly render_eligible: false; // PHASE-1 TYPE-LEVEL LOCK (literal false)
  readonly direction: "supports" | "limits" | "neutral";
  readonly logic_bearing: boolean;
  readonly logic_disposition?: LogicDisposition; // required iff logic_bearing
  readonly provenance: { page_ref?: string; source_url?: string; verified_on: string };
  readonly curation_note: string; // WHY this row bears on this factor
}

export interface CorpusMap {
  readonly product: "cppa-risk" | "cppa-admt" | "dpia";
  readonly map_version: string; // "<product>-cam-v1-2026-08-XX"
  readonly snapshot_file: string; // the fixture this map pins against
  readonly rows: readonly CamRow[];
}
