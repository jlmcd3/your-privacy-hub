/**
 * ITEM 341 — types for the cppa-risk "Persuasive authority from EU practice"
 * section.
 *
 * SEPARATION LAW: this section is emitted under its OWN top-level report key
 * (`eu_persuasive_authority`). It is never folded into `enforcement_context`
 * or `enforcement_precedents`, which are CPPA-scoped surfaces.
 *
 * DEGRADATION LAW: when the record engages a topic but the corpus carries no
 * qualifying material (no byte-exact guidance pin, no matching Art. 60 entry,
 * no VERIFIED enforcement row), the section says so in terms — it never
 * reaches for an unverified row and never softens the statement.
 */
import type { EuTopicId } from "./pinned-guidance.ts";

export type { EuTopicId };

/** Deterministic reason a topic was engaged, quoted from the record. */
export interface EuTopicTrigger {
  readonly intake_key: string;
  readonly intake_value: string;
  readonly rule_id: string;
}

export interface EuGuidanceElement {
  readonly guideline_ref: string;
  readonly citation: string;
  readonly source_url: string;
  readonly corpus_row_id: string;
  /** VERBATIM EDPB text; re-queried byte-exact at build time. */
  readonly verbatim_quote: string;
  readonly authority_weight: "persuasive_non_binding";
  readonly regime: "EU/EEA (GDPR)";
}

/** Pattern-level observation over the Art. 60 / case-digest register.
 *  Counts only — no quotation, no characterisation of any single case. */
export interface EuPatternObservation {
  readonly basis: "gdpr_provision" | "topic_tag";
  readonly basis_value: string;
  readonly decision_count: number;
  readonly observation: string;
  readonly authority_weight: "persuasive_non_binding";
}

/** A VERIFIED enforcement row. Unverified rows are never admitted here. */
export interface EuVerifiedPrecedent {
  readonly subject: string;
  readonly regulator: string;
  readonly jurisdiction: string;
  readonly decision_date: string;
  readonly provisions: readonly string[];
  readonly fine_eur: number | null;
  readonly source_url: string;
  readonly verification_status: "verified";
  readonly authority_weight: "persuasive_non_binding";
}

export type EuTopicStatus = "authority_available" | "no_qualifying_authority";

export interface EuAuthorityTopic {
  readonly topic_id: EuTopicId;
  readonly topic_label: string;
  readonly triggers: readonly EuTopicTrigger[];
  readonly guidance: readonly EuGuidanceElement[];
  readonly pattern_observations: readonly EuPatternObservation[];
  readonly verified_precedents: readonly EuVerifiedPrecedent[];
  readonly status: EuTopicStatus;
  /** Present whenever a sub-surface is empty. Honest, not hedged. */
  readonly information_needed?: string;
}

export interface EuAuthorityFraming {
  readonly regime_label: string;
  readonly persuasive_note: string;
  readonly weight_reservation: string;
  readonly carve_out_note: string;
}

export interface EuAuthoritySection {
  readonly section_title: string;
  readonly version: string;
  readonly status: "authority_available" | "no_qualifying_authority";
  readonly framing: EuAuthorityFraming;
  readonly topics: readonly EuAuthorityTopic[];
  readonly information_needed?: string;
}

/** Corpus payload handed to the pure builder by ./fetch.ts. */
export interface EuAuthorityCorpus {
  /** pin_id → the re-queried excerpt_text of its corpus row. */
  readonly guidance_excerpts: Readonly<Record<string, string>>;
  /** Art. 60 register counts, keyed "provision:Article 22" / "tag:Children". */
  readonly oss_counts: Readonly<Record<string, number>>;
  /** VERIFIED enforcement rows only, already filtered by the fetcher. */
  readonly verified_enforcement: readonly EuVerifiedPrecedent[];
  readonly fetched_at?: string;
}
