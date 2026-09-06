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
//
// WAVE C1 (2026-08-23, doc 62 §11 — the READER-VALUE LAW, CEO-ratified):
// two fields land with this wave's schema deltas.
//   - `purpose_class` — required on every render_eligible row (mapInvariants
//     enforces). Closed enum; a row that cannot name its class does not
//     render (doc 62 §11.2).
//   - `citation_source` — optional structured facts behind a rendered
//     enforcement/authority citation, checked against the free-text display
//     by the display-consistency invariant (doc 62 §11.5) so a typo in
//     ratified prose can never misname a case.
//   - `trail_impact` — optional ratified micro-tag (2-6 words) for the S3
//     ToA trail (doc 62 §11's R1 amendment). Per the R2 admission rule,
//     only logic-bearing rows and render-surface pointers may carry one;
//     plain support/provenance (FC-J) rows never do, and never print to
//     the trail. Where several logic-bearing rows on one factor would
//     otherwise each print a citation, ONE representative row carries the
//     aggregate tag (curation-time choice, keeps the ToA cell to ≤2 tags —
//     doc 62 §11.4's aggregate budget).

export type CamRole = "AQ" | "FC" | "AP" | "SB" | "AOW";
export type CamSurface = "S0" | "S1" | "S2" | "S3" | "S4" | "S5";
export type CamPurposeClass = "action" | "misreading" | "consequence" | "authority";

/** Structured facts behind a rendered citation (doc 62 §11.5's
 * citation-form law). Every field is copied from a live-verified source
 * row at curation, never composed at generation. `case_reference` is
 * omitted (not invented, not paraphrased) unless the source's reference is
 * docket-shaped — see `isDocketShaped` in citation-forms.ts. */
export interface CamCitationSource {
  readonly regulator: string;
  readonly subject: string;
  readonly jurisdiction: string;
  readonly decision_date: string; // ISO YYYY-MM-DD
  readonly case_reference?: string;
}

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

/**
 * DOC 189 (2026-09-05, CEO-approved attribute set) — the RELEVANCE PROFILE:
 * curation-time attributes that let a product select and rank enforcement
 * authorities against the customer's own typed intake states, deterministically
 * (cam-relevance.ts). Authored from the source row and the curation note, never
 * at generation; a profile is data about the authority, not customer prose.
 * Products may inline it on the row (`CamRow.relevance_profile`) or keep a
 * sidecar keyed by row id (LIA: lia-relevance-profiles.ts) — the scorer takes
 * whichever the product resolves.
 */
export interface CamRelevanceProfile {
  /** ISO-2 country of the deciding authority ("IE", "FR", "ES", "GB"…). */
  readonly country: string;
  /** The instrument the decision was taken under. */
  readonly instrument: "EU GDPR" | "UK GDPR" | "EU GDPR (pre-2021 UK)" | "Directive 95/46";
  // "Directive 95/46" (doc 205 §12 item 3 / doc 205B §5): pre-GDPR decisions
  // (before 2018-05-25). Registered for classification/history only — never
  // ranked as an authority (see the explicit exclusion in cam-relevance.ts's
  // rankByRelevance, doc 205 §12 item 3).
  /** Every factor (the product's own vocabulary) the authority bears on —
   *  multi-valued, so one profile covers what the map used to split across
   *  sibling rows. */
  readonly factor_ids: readonly string[];
  /** The product's use-case class vocabulary (LIA: the classifier's eight
   *  classes); null where the matter does not fit any class honestly. */
  readonly use_case_class: string | null;
  /** What the regulator did with the legitimate-interests (or analogous) reliance. */
  readonly outcome_posture: "accepted" | "conditional" | "rejected" | "contested";
  /** The data-subject relationship the matter concerned. */
  readonly relationship: "employee" | "customer" | "prospect" | "public" | "child" | null;
  /** Data categories, in the product's intake vocabulary. */
  readonly data_categories: readonly string[];
  /** Cross-cutting flags: "special_category", "children",
   *  "eprivacy_terminal_equipment", "electronic_marketing",
   *  "public_authority", "large_scale", "automated_decision". */
  readonly flags: readonly string[];
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
  /** Required iff render_eligible (doc 62 §11.2, wave C1). Never present on
   * a dark row — purpose_class is a claim about what the READER gets, and a
   * row that never renders makes no such claim. */
  readonly purpose_class?: CamPurposeClass;
  /** Present only on rows whose display cites a specific enforcement
   * decision or dated authority; feeds the display-consistency invariant. */
  readonly citation_source?: CamCitationSource;
  /** Optional ratified ToA trail tag (doc 62 §11's R1 amendment; see the
   * file-header note on the R2 admission rule and the one-row-per-factor
   * aggregation convention). */
  readonly trail_impact?: string;
  /** Typed-state tokens; the row renders iff EVERY token is present in the
   * report's fired-state set (pure set inclusion — the determinism law's
   * generation-plane mechanism). Required for render-eligible AP/AOW rows.
   * Risk tokens: "trigger_engaged", "7150(b)(N)", "record_incomplete". */
  readonly render_when?: readonly string[];
  /** Required iff role === "AP" and render_eligible. */
  readonly display?: CamApDisplay;
  /** Required iff role === "AOW" and render_eligible. Ratified wording. */
  readonly warning_text?: string;
  /** DOC 132 (advisory-surfacing, Track A, CEO-ratified 2026-09-01) —
   * curated subject-matter nouns/phrases authored at curation time.
   * Present ONLY on AP rows with a `display` block (external enforcement-
   * action precedent) — never on FC/AQ commentary or statute-pin rows,
   * which already render deterministically on their own gates, and never
   * on AOW rows (a warning row shares its underlying case with a sibling
   * AP row, which is what the matcher scans). Runtime matching is dumb:
   * word-bounded, case-insensitive substring match over the product's
   * free-text intake fields, never a model call. Advisory surfacing
   * decides NOTHING — it is a signpost, never a determination input. */
  readonly advisory_terms?: readonly string[];
  /** DOC 189 — optional inline relevance profile (see CamRelevanceProfile). */
  readonly relevance_profile?: CamRelevanceProfile;
  /** For S0 rows: the intake field/rail key the callout attaches to. */
  readonly s0_field?: string;
  readonly direction: "supports" | "limits" | "neutral";
  readonly logic_bearing: boolean;
  readonly logic_disposition?: LogicDisposition; // required iff logic_bearing
  readonly provenance: { page_ref?: string; source_url?: string; verified_on: string };
  readonly curation_note: string; // WHY this row bears on this factor
}

export interface CorpusMap {
  // LIA Conversion L-CA (2026-08-25) widens the union by one member, same
  // law as the phase-2 `render_eligible: boolean` widening above: additive,
  // scoped by mapInvariants, no other member's behavior changes.
  // Notices groundwork audit (2026-08-26, doc 61 §1.1 / CMP-B8) widens the
  // union again for the same reason: an AQ-only map, authored in full,
  // every row dark (no s2_ratification stamp) — banking the manifest→CAM
  // wrap CMP-B8 ratified, per the render-readiness law's "author now, wire
  // never before the product's own Conversion" rule (doc 48 §II.6).
  readonly product: "cppa-risk" | "cppa-admt" | "dpia" | "cppa-cyber" | "lia" | "notices";
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
  /** C1.2 (2026-08-25) — the AQ/S2 analog of s4_ratification. Present ONLY
   * when the CEO has ratified THIS map's S2 AQ rows by name (a table-
   * renderer landing has actually built the surface those rows pin). A
   * map-level fact, same shape and same law as s4_ratification: no stamp,
   * no render-eligible AQ, however many rows exist. */
  readonly s2_ratification?: {
    readonly ratified_by: string;
    readonly ratified_on: string; // ISO date
    readonly ledger_ref: string;
  };
}
