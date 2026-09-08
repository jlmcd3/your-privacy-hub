// Pure mapping + eligibility law for the Legitimate Interest tracker loader.
// No I/O here so the whole gate is unit-testable.

export const LOADER_VERSION = "li-tracker-loader@2026-09-08";

export type LIOutcome = "accepted" | "conditional" | "rejected" | "contested";

const OUTCOMES: readonly LIOutcome[] = ["accepted", "conditional", "rejected", "contested"];

/** Pipeline stages whose rows are considered curated enough to publish. */
export const PUBLISHABLE_STAGES = ["human", "stage3_consistency"] as const;

export interface ProfileRow {
  id: string;
  product: string | null;
  source_table: string | null;
  source_row_id: string | null;
  country: string | null;
  instrument: string | null;
  use_case_class: string | null;
  outcome_posture: string | null;
  rule_statement: string | null;
  extracted_quote: string | null;
  quote_verified: boolean | null;
  self_consistency_agreement: boolean | null;
  pipeline_stage: string | null;
  ratified_at: string | null;
  curated_at: string | null;
}

/** Metadata resolved from whichever corpus table the profile points at. */
export interface SourceMeta {
  dpa_source: string | null;
  jurisdiction: string | null;
  case_reference: string | null;
  source_url: string | null;
  dated_on: string | null;
}

export interface TrackerEntry {
  source_profile_id: string;
  processing_activity: string;
  outcome: LIOutcome;
  signal_type: string;
  dpa_source: string;
  jurisdiction: string;
  case_reference: string | null;
  summary: string;
  confidence: string;
  last_confirmed: string | null;
  source_url: string | null;
  source_enforcement_id: string | null;
  loader_version: string;
}

export type MapResult =
  | { ok: true; entry: TrackerEntry }
  | { ok: false; profile_id: string; reason: string };

const SIGNAL_BY_TABLE: Readonly<Record<string, string>> = {
  enforcement_actions: "Enforcement Decision",
  edpb_guidelines: "Official Guidance",
  regulatory_guidance: "Official Guidance",
  gdpr_articles: "Official Guidance",
};

/** "direct_marketing" -> "Direct marketing". Deterministic, no model. */
export function humanizeActivity(raw: string | null | undefined): string | null {
  const v = (raw ?? "").trim().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
  if (!v) return null;
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

export function normalizeOutcome(raw: string | null | undefined): LIOutcome | null {
  const k = (raw ?? "").trim().toLowerCase();
  return (OUTCOMES as readonly string[]).includes(k) ? (k as LIOutcome) : null;
}

export function confidenceFor(p: ProfileRow): string {
  if (p.pipeline_stage === "human") return "high";
  if (p.self_consistency_agreement === true) return "medium";
  return "low";
}

function dateOnly(v: string | null | undefined): string | null {
  if (!v) return null;
  const m = String(v).match(/^\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : null;
}

/** The publication gate. Only quote-verified, curated LIA rows may load. */
export function mapProfile(p: ProfileRow, meta: SourceMeta | null): MapResult {
  const no = (reason: string): MapResult => ({ ok: false, profile_id: p.id, reason });

  if ((p.product ?? "").toLowerCase() !== "lia") return no("not_lia_product");
  if (p.quote_verified !== true) return no("quote_not_verified");
  if (!(p.extracted_quote ?? "").trim()) return no("no_extracted_quote");
  if (!(PUBLISHABLE_STAGES as readonly string[]).includes(p.pipeline_stage ?? "")) {
    return no("stage_not_publishable");
  }

  const outcome = normalizeOutcome(p.outcome_posture);
  if (!outcome) return no("no_outcome_posture");

  const signal = SIGNAL_BY_TABLE[(p.source_table ?? "").trim()];
  if (!signal) return no("unmapped_source_table");
  if (!meta) return no("source_row_missing");

  const activity = humanizeActivity(p.use_case_class);
  if (!activity) return no("no_use_case_class");

  const summary = (p.rule_statement ?? "").trim() || (p.extracted_quote ?? "").trim();
  if (summary.length < 40) return no("summary_too_short");

  const jurisdiction = (meta.jurisdiction ?? p.country ?? "").trim();
  if (!jurisdiction) return no("no_jurisdiction");

  const dpa = (meta.dpa_source ?? "").trim();
  if (!dpa) return no("no_dpa_source");

  return {
    ok: true,
    entry: {
      source_profile_id: p.id,
      processing_activity: activity,
      outcome,
      signal_type: signal,
      dpa_source: dpa,
      jurisdiction,
      case_reference: (meta.case_reference ?? "").trim() || null,
      summary,
      confidence: confidenceFor(p),
      last_confirmed: dateOnly(meta.dated_on) ?? dateOnly(p.ratified_at) ?? dateOnly(p.curated_at),
      source_url: (meta.source_url ?? "").trim() || null,
      source_enforcement_id: p.source_table === "enforcement_actions" ? p.source_row_id : null,
      loader_version: LOADER_VERSION,
    },
  };
}
