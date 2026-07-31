/**
 * ITEM 317 — types for the biometric analytic deliverables.
 *
 * SHAPE LAW (Items 305/308/310/311/312/313/315/316): every finding carries
 * standard (verbatim corpus text) → record fact → application → verdict, and
 * degrades to `record_insufficient` with a named `information_needed` rather
 * than asserting. Nothing here is a boolean and nothing here paraphrases a
 * statute.
 *
 * SEPARATION GUARD (Items 308/310/312): duty-satisfaction findings say what the
 * statute requires and whether the record shows it. They say NOTHING about
 * litigation exposure, damages, penalties, or private suits. That material
 * lives only in `ConsequenceDetermination` and may not bleed backwards.
 */

export type FindingStatus = "analysed" | "record_insufficient";

export type Verdict =
  | "satisfied"
  | "not_satisfied"
  | "not_applicable"
  | "record_insufficient";

/** The common four-part analysis shape. */
export interface Finding {
  key: string;
  label: string;
  /** Pinpoint as rendered to the reader. */
  citation: string;
  /** Verbatim corpus text — never paraphrased. */
  standard: string;
  /** What the intake record actually says. */
  record_fact: string;
  /** Application of the standard to the record fact. */
  application: string;
  verdict: Verdict;
  status: FindingStatus;
  information_needed?: string;
}

export type StatuteKey = "us_il_bipa" | "us_tx_cubi" | "us_wa_19375";

export interface StatuteRef {
  statute_key: StatuteKey;
  statute_short: string;
  statute_long: string;
  jurisdiction: string;
}

// ── Op. 1 — identifier characterization ──────────────────────────────────────

export type IdentifierVerdict =
  | "within_definition"
  | "outside_definition"
  | "record_insufficient";

export interface IdentifierCharacterization extends StatuteRef {
  /** The statute's own definition, verbatim. */
  definition_citation: string;
  definition_standard: string;
  /** Each described data type, measured against THIS statute's definition. */
  per_type: Array<{
    described_type: string;
    citation: string;
    within_enumeration: boolean | null;
    reasoning: string;
  }>;
  /** Exclusions the statute names that the record actually engages. */
  exclusions_engaged: Array<{
    exclusion: string;
    citation: string;
    standard: string;
    record_fact: string;
    reasoning: string;
    engaged: boolean | null;
  }>;
  record_fact: string;
  application: string;
  verdict: IdentifierVerdict;
  status: FindingStatus;
  information_needed?: string;
}

// ── Op. 2 — entity characterization ──────────────────────────────────────────

export type ActorVerdict =
  | "within_actor_scope"
  | "outside_actor_scope"
  | "record_insufficient";

export interface EntityCharacterization {
  /** Reasoned role, not the intake label echoed back. */
  role: string;
  role_reasoning: string;
  /** The intake label this was reasoned FROM, kept visible for audit. */
  intake_label: string | null;
  per_statute: Array<
    StatuteRef & {
      citation: string;
      standard: string;
      record_fact: string;
      application: string;
      verdict: ActorVerdict;
      status: FindingStatus;
      information_needed?: string;
    }
  >;
}

// ── Op. 3 — per-duty satisfaction ────────────────────────────────────────────

export interface DutyFinding extends Finding {
  statute_key: StatuteKey;
  statute_short: string;
  /** Qualifier rows that changed the analysis (e.g. CUBI (c-1)/(c-2)). */
  qualifiers_applied: Array<{
    citation: string;
    standard: string;
    record_fact: string;
    effect: string;
  }>;
}

// ── Op. 4 — multi-state divergence ───────────────────────────────────────────

export interface DivergenceItem {
  key: string;
  topic: string;
  /** Statutes actually in scope on this record that this divergence concerns. */
  statutes: StatuteKey[];
  /** One entry per statute, each anchored to a real row. */
  positions: Array<{
    statute_short: string;
    citation: string;
    standard: string;
    position: string;
  }>;
  /** Which statute has no analogue at all, where that is the point. */
  no_analogue_in: string[];
  /** Where THIS record lands, reasoned from the duty findings above. */
  record_consequence: string;
}

// ── Op. 5 — consequence ──────────────────────────────────────────────────────

export interface ExposureSurface extends StatuteRef {
  /** Verbatim enforcement provision, where one is in corpus. */
  citation: string;
  standard: string | null;
  mechanism: string;
  /** Populated only where the corpus cannot support specifics. */
  reserved: string | null;
  corpus_status: "in_corpus" | "not_ingested";
}

export interface ConsequenceDetermination {
  /** What the record shows is out of compliance NOW — duty findings only. */
  unlawful_now: Array<{
    statute_short: string;
    citation: string;
    duty: string;
    why: string;
  }>;
  /** Duties the record cannot resolve either way. */
  unresolved_on_record: Array<{
    statute_short: string;
    citation: string;
    duty: string;
    information_needed: string;
  }>;
  /** Kept strictly separate from the two lists above. */
  exposure_surfaces: ExposureSurface[];
  separation_note: string;
}

// ── Narrative ────────────────────────────────────────────────────────────────

export interface BiometricNarrative {
  part1_overview: string;
  part4_determination: string;
}

// ── Envelope ─────────────────────────────────────────────────────────────────

export interface ScopeGatedCorpusFlag {
  citation: string;
  status: "scope_gated_pending";
  note: string;
}

export interface BiometricDeliverables {
  version: string;
  statutes_in_scope: StatuteRef[];
  identifier_characterizations: IdentifierCharacterization[];
  entity_characterization: EntityCharacterization;
  duty_findings: DutyFinding[];
  divergence_analysis: DivergenceItem[];
  consequence_determination: ConsequenceDetermination;
  narrative: BiometricNarrative;
  /** Corpus that exists but is deliberately not in product scope. */
  scope_gated: ScopeGatedCorpusFlag[];
}
