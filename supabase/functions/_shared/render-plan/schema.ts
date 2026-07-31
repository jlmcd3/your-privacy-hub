/**
 * RENDERPLAN SCHEMA v1 (Two-Pass Architecture, Phase-1 authoring)
 * ----------------------------------------------------------------
 * Types for the Pass-1 derivation artifact consumed by Pass G, Pass 2,
 * and Pass V, per docs/design/LEGAL-TEST-PIPELINE.md §3 + §2.7 (Q4(e)
 * jurisdiction-tag scoping) and LEGAL-TEST.md v2.1.
 *
 * All fields are pure data — no runtime behavior. Validators live in
 * ./validators.ts and are the enforceable contract at the boundaries.
 */

import type {
  ConclusionSpec,
  EpistemicType,
  JurisdictionTag,
  StatutoryAnchor,
} from "../legal-test/cppa-risk-conclusions.ts";
import type { FactorRow, GuidanceRef } from "../factors/cppa-risk-factors.ts";

export type { EpistemicType, JurisdictionTag, StatutoryAnchor, ConclusionSpec, FactorRow, GuidanceRef };

/** Deterministic reference to an intake value that Pass 2 must not paraphrase. */
export interface IntakeLedgerEntry {
  readonly ledger_id: string;      // e.g. "L.revenue_band"
  readonly intake_field: string;   // e.g. "revenue_band"
  readonly value: string | number | boolean | null;
  readonly display: string;        // exact rendering token used in Pass 2
}

/**
 * v2.2: every corpus reference carries an authority-weight tier.
 * v2.3 (CEO-CORRECTED 2026-07-26): `JurisdictionTag` gains `"us-federal"` —
 * U.S. Federal law + federal agency rulings (e.g., FTC). For any U.S.-forum
 * plan (cppa-ca, us-state-*), us-federal binding-tier entries are admissible.
 * Sister-state binding-tier crossings are rejected by V8 (persuasive-only).
 * GDPR/UK plans remain untouched: no U.S. material in any tier.
 */
export type AuthorityWeight = "binding" | "persuasive";

/** Pinpoint the model is allowed to cite via {{cite:PINPOINT_REF}} tokens. */
export interface CitationBinding {
  readonly pinpoint_ref: string;   // token id used in template
  readonly corpus_key: string;     // matches provision_texts.key / cppa_authorities citation
  readonly pinpoint: string;       // "11 CCR § 7152(a)(5)(A)"
  readonly jurisdiction_tag: JurisdictionTag;
  /** v2.2 — Type R proposition anchors resolve only to binding bindings. Defaults to "binding" if omitted. */
  readonly authority_weight?: AuthorityWeight;
}

/** One proposition Pass 2 must render (Type R = deterministic, Type W = weighed). */
export interface Proposition {
  readonly id: string;
  readonly conclusion_id: string;              // ref to ConclusionSpec.id
  readonly epistemic_type: EpistemicType;      // R | W | J
  readonly jurisdiction_tag: JurisdictionTag;  // v2.1 domain tag
  readonly polarity?: "positive" | "negative" | "not_applicable";  // Type R only
  readonly anchor: StatutoryAnchor;
  readonly intake_ledger_refs: readonly string[];   // ids into intake_ledger
  readonly citation_binding_refs: readonly string[]; // ids into citation_bindings
  /** ITEM 240 CP4 — display_label projected from the ConclusionSpec; composers use this ONLY. */
  readonly display_label?: string;
  /** For Type W: which weighing_frame entry supports this proposition. */
  readonly weighing_frame_ref?: string;
  /** Optional narrative template slot; final wording is Pass-2's job within template bounds. */
  readonly template_slot?: string;
}

/** Factor-table row for the Type-W balance (populated deterministically in Pass 1). */
export interface FactorTableEntry {
  readonly factor_id: string;                  // ref to FactorRow.id
  readonly kind: "benefit" | "negative_impact" | "safeguard";
  readonly jurisdiction_tag: JurisdictionTag;
  readonly present_in_intake: boolean;
  readonly intake_ledger_refs: readonly string[];
  readonly guidance_refs: readonly GuidanceRef[];
  readonly anchor: StatutoryAnchor;
  /** ITEM 240 CP4 — customer-facing label projected from the FactorRow. */
  readonly display_label?: string;
  /** Optional model-authored weight note (adapter passthrough). */
  readonly weight_note?: string;
}

/** Pass-G output row: an authority the model may draw on for the weighing narrative. */
export interface WeighingFrameEntry {
  readonly frame_id: string;
  readonly test_id: string;                    // ref to WeighingTest.test_id
  readonly jurisdiction_tag: JurisdictionTag;  // must equal test's jurisdiction_tag
  readonly source: "fsor_commentary" | "fsor_callout" | "enforcement_action_fsor_analogy" | "edpb_guideline" | "enforcement_action_edpb_analogy";
  readonly corpus_ref: string;                 // e.g. "cppa_fsor_commentary#<hash>"
  readonly anchor_hint: string;                // short quote / summary
  readonly pinpoint: string;                   // regulation citation
  readonly closeness_contribution: number;     // 0..1
  readonly tier_label: "primary" | "supporting" | "analogy_fsor_internal";
  /** v2.2 — binding = CA interpretive material; persuasive = FSOR-mediated non-CA (CPPA products only, requires fsor_mediation_ref). Defaults to "binding" if omitted. */
  readonly authority_weight?: AuthorityWeight;
  /** v2.2 — REQUIRED when authority_weight="persuasive": id of the CPPA-domain FSOR row that discusses this non-CA source. */
  readonly fsor_mediation_ref?: string;
}

/** Gate outcomes captured in Pass 1 for downstream layers to key on. */
export interface GateRuleOutcome {
  readonly gate_id: string;                    // e.g. "G.q18.admt_consequence"
  readonly outcome: "pass" | "block" | "not_applicable";
  readonly reason?: string;                    // short deterministic explanation
}

/** Silent write-around when Pass 1 exceeded retry budget (Q6 pilot ruling). */
export interface ConservativeWriteAround {
  readonly triggered: boolean;
  readonly reason?: string;
  readonly disclosure: "silent+telemetry" | "customer_visible_banner";
}

export interface RenderPlan {
  readonly plan_version: "v1";
  /** Widened Phase-1 LTP-LIA (item 138) so GDPR + future products can carry render plans without changing shared validators. */
  readonly product: "cppa-risk-assessment" | "li-assessment" | string;
  readonly build_stamp: string;
  readonly jurisdiction_tag: JurisdictionTag;
  readonly intake_ledger: readonly IntakeLedgerEntry[];
  readonly citation_bindings: readonly CitationBinding[];
  readonly propositions: readonly Proposition[];
  readonly factor_table: readonly FactorTableEntry[];
  readonly weighing_frame: readonly WeighingFrameEntry[];
  readonly gate_outcomes: readonly GateRuleOutcome[];
  readonly conservative_write_around: ConservativeWriteAround;
  /**
   * ITEM 305 — per-activity ANALYTIC DELIVERABLES (cppa-risk only).
   * Optional so existing plan constructors for other products remain
   * valid. Typed loosely here to keep the shared plan schema free of a
   * product-specific import; the authoritative shape is
   * `../ltp/analytic-deliverables/types.ts` → ActivityAnalytics[].
   */
  readonly activity_analytics?: readonly Record<string, unknown>[];
}


/** Words forbidden in Pass-2 output when the plan is CPPA-domain only. */
export const FORBIDDEN_COMPARATIVE_TOKENS: readonly string[] = [
  "GDPR practice suggests",
  "under the GDPR",
  "EDPB guidance",
  "as under the GDPR",
];

/** v2.2 — persuasive-marking phrases required in Pass-2 sentences that render a persuasive frame entry. */
export const PERSUASIVE_MARKERS: readonly string[] = [
  "by way of analogy",
  "persuasive but not binding",
  "as persuasive authority",
  "for persuasive comparison",
];
