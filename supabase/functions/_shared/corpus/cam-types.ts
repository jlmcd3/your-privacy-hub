// The Curated Attachment Map (CAM) — the single primitive through which
// corpus content is allowed to enter a product's document (doc 48 §II.2).
//
// PHASE 2 (2026-08-22, CEO-directed): the phase-1 type-level ratchet
// (`render_eligible: false` literal) is consciously widened to `boolean`.
// The widening is scoped by mapInvariants (cam-verify.ts), not left open:
//   - FC rows may render on surface S0 (intake callouts) freely, OR on S4
//     (report-side regulator-commentary) ONLY where the map carries a
//     `s4_ratification` stamp — the PN-CORPUS-1 fleet law (ratified
//     2026-08-22, doc 53 Phase A): default-dark, with CEO-curated
//     deterministic carve-outs. No stamp, no S4 FC — machine-enforced, as
//     the S0 rule already was pre-ratification.
//   - AP rows render only on S5 with a full `display` block and a
//     `render_when` typed-state predicate (verified-only law applies at
//     curation: source rows must be verification_status='verified').
//   - AOW rows render only with `warning_text` + `render_when`.
// Roles SB/AQ remain schema-present but unproven in any map (SB deferred
// per doc 51 §1 note: "SB candidate once S5 ships").

export type CamRole = "AQ" | "FC" | "AP" | "SB" | "AOW";
export type CamSurface = "S0" | "S1" | "S2" | "S3" | "S4" | "S5";

export type LogicDisposition =
  | { kind: "implemented"; branch_ref: string } // "file.ts:symbolOrConstant"
  | { kind: "extension_filed"; queue_ref: string } // decision-queue entry id
  | { kind: "declined"; reason: string }; // legal reasoning, 1-3 sentences

/** AP-row render fields — every string is CEO-ratifiable customer prose
 * (the ratified annotation layer, doc 48 §II.3), never raw corpus text. */
export interface CamApDisplay {
  /** e.g. "AEPD (Spain) — AENA, S.M.E., S.A. (2025)" */
  readonly matter: string;
  /** What the regulator found and imposed. */
  readonly what_happened: string;
  /** Why it bears on this product's factor — carries the GDPR≠CPPA frame. */
  readonly bearing: string;
  /** Full citation cell, always ending in the persuasive-only label. */
  readonly authority_label: string;
  /** Compact cite for the S3 interpretive trail (Factor-Bearing Law II.2a). */
  readonly trail_cite: string;
}

export interface CamRow {
  readonly id: string; // "<product>/<factor_id>/<nn>"
  readonly factor_id: string; // EXACT Determination-appendix label
  readonly role: CamRole;
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
  /** Exact substring of the source field. ≤300 chars for build-time-only
   * rows; render-eligible S0 rows may carry the full rendered summary
   * (the intake shows the whole position — a truncated pin would leave
   * the rendered bytes unpinned). May be "" ONLY for AP/AOW rows, which
   * render from the ratified annotation fields, not from corpus text
   * (doc 48 §II.2 schema note). */
  readonly pinned_excerpt: string;
  readonly render_eligible: boolean;
  /** Required iff render_eligible. */
  readonly render_surface?: CamSurface;
  /** Typed-state tokens; the row renders iff EVERY token is present in the
   * report's fired-state set (pure set inclusion — the determinism law's
   * generation-plane mechanism). Required for render-eligible AP/AOW rows.
   * Risk tokens: "trigger_engaged", "7150(b)(N)", "record_incomplete". */
  readonly render_when?: readonly string[];
  /** Required iff role === "AP" and render_eligible. */
  readonly display?: CamApDisplay;
  /** Required iff role === "AOW" and render_eligible. Ratified wording. */
  readonly warning_text?: string;
  /** For S0 rows: the intake field/rail key the callout attaches to. */
  readonly s0_field?: string;
  readonly direction: "supports" | "limits" | "neutral";
  readonly logic_bearing: boolean;
  readonly logic_disposition?: LogicDisposition; // required iff logic_bearing
  readonly provenance: { page_ref?: string; source_url?: string; verified_on: string };
  readonly curation_note: string; // WHY this row bears on this factor
}

export interface CorpusMap {
  readonly product: "cppa-risk" | "cppa-admt" | "dpia";
  readonly map_version: string; // "<product>-cam-vN-YYYY-MM-DD"
  readonly snapshot_file: string; // the fixture this map pins against
  readonly rows: readonly CamRow[];
  /** The PN-CORPUS-1 lawful carve-out (doc 53 Phase A): present ONLY when
   * the CEO has ratified THIS map's S4 FC rows by name. A map-level fact,
   * not per-row — "a CEO-ratified map for that product exists" is what the
   * fleet law tests. Absent means the default-dark posture still governs
   * every FC row in this map, however many there are. */
  readonly s4_ratification?: {
    readonly ratified_by: string;
    readonly ratified_on: string; // ISO date
    readonly ledger_ref: string; // decision-queue or ratification-ledger entry id
  };
}
