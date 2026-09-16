// LIA free-preview precedent selection and heuristic strength — SHARED, pure.
//
// LIA master review (2026-09-15, F04): the preview took the latest 80 tracker
// rows, kept those whose processing_activity contained any keyword of the
// inferred class, preferred rows whose jurisdiction contained the first
// space-delimited token of a selected jurisdiction label ("EU (GDPR)" → "eu";
// "United Kingdom (UK GDPR)" and "United States — Federal" → "united"),
// used the preferred pool only when it held three or more rows, and rated
// strength on the unfiltered pool. None of this was disclosed. This module
// makes the selection explicit, normalises jurisdictions to a token table,
// rates strength on the pool actually shown where one exists, and returns
// the method and its limits so the page can state them. Population, data
// categories and mechanism are NOT compared — the response says so.

import { USE_CASE_KEYWORDS } from "./lia-use-case-classifier.ts";

export interface TrackerPrecedent {
  processing_activity: string | null;
  outcome: string | null;
  jurisdiction: string | null;
  dpa_source: string | null;
  summary: string | null;
  case_reference?: string | null;
  last_confirmed?: string | null;
}

/** Selected-jurisdiction label → tokens matched (as whole words) against a
 *  precedent's free-text jurisdiction. EU membership tokens name the member
 *  states so a national-DPA decision counts as an EU (GDPR) precedent. */
export const LIA_JURISDICTION_TOKENS: Readonly<Record<string, readonly string[]>> = {
  "EU (GDPR)": [
    "eu", "eea", "european union", "edpb", "europe",
    "austria", "belgium", "bulgaria", "croatia", "cyprus", "czech", "czechia", "denmark", "estonia", "finland", "france",
    "germany", "greece", "hungary", "ireland", "italy", "latvia", "lithuania", "luxembourg", "malta", "netherlands",
    "poland", "portugal", "romania", "slovakia", "slovenia", "spain", "sweden", "norway", "iceland", "liechtenstein",
    "cnil", "garante", "aepd", "dpc", "autoriteit persoonsgegevens", "datatilsynet", "bfdi",
  ],
  "United Kingdom (UK GDPR)": ["uk", "united kingdom", "ico", "great britain", "gb", "england", "scotland", "wales", "northern ireland"],
  "United States — Federal": ["us", "usa", "united states", "ftc", "federal"],
  "California (CCPA/CPRA)": ["california", "cppa", "ccpa", "cpra"],
  "Other US States": ["us", "usa", "united states", "colorado", "virginia", "connecticut", "texas", "utah", "oregon", "washington"],
  "Canada": ["canada", "opc", "quebec", "cai"],
  "Brazil (LGPD)": ["brazil", "brasil", "anpd", "lgpd"],
  "Australia": ["australia", "oaic"],
  "Singapore": ["singapore", "pdpc"],
  "Other": [],
};

function wordMatch(hay: string, token: string): boolean {
  const esc = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z])${esc}([^a-z]|$)`, "i").test(hay);
}

/** True when the precedent's jurisdiction text matches any selected label. */
export function precedentMatchesJurisdictions(precedentJurisdiction: string | null | undefined, selected: readonly string[]): boolean {
  const hay = (precedentJurisdiction ?? "").toLowerCase();
  if (!hay) return false;
  for (const label of selected) {
    const tokens = LIA_JURISDICTION_TOKENS[label];
    if (!tokens) continue;
    if (tokens.some((t) => wordMatch(hay, t))) return true;
  }
  return false;
}

export interface PrecedentSelection {
  /** The rows shown (up to `limit`). */
  readonly top: readonly TrackerPrecedent[];
  /** Every keyword-matched row (the strength pool when no jurisdiction match exists). */
  readonly matched: readonly TrackerPrecedent[];
  /** Keyword-matched rows whose jurisdiction matches a selected label. */
  readonly preferred: readonly TrackerPrecedent[];
  /** The rows strength was rated on. */
  readonly ratingPool: readonly TrackerPrecedent[];
  readonly method: {
    readonly pool_size: number;
    readonly matched_count: number;
    readonly preferred_count: number;
    /** True when no selected-jurisdiction row matched and rows from other jurisdictions are shown. */
    readonly jurisdiction_fallback: boolean;
    readonly keyword_terms: readonly string[];
    readonly selected_jurisdictions: readonly string[];
    /** What the selection does NOT compare — stated so the page can say it. */
    readonly not_compared: readonly string[];
    readonly description: string;
  };
}

export function selectLiaPrecedents(input: {
  useCase: string;
  jurisdictions: readonly string[];
  pool: readonly TrackerPrecedent[];
  limit?: number;
}): PrecedentSelection {
  const limit = input.limit ?? 3;
  const keywords = USE_CASE_KEYWORDS[input.useCase] ?? [];
  const matched = input.pool.filter((p) => {
    const a = (p.processing_activity ?? "").toLowerCase();
    return keywords.some((k) => a.includes(k));
  });
  const preferred = input.jurisdictions.length > 0
    ? matched.filter((p) => precedentMatchesJurisdictions(p.jurisdiction, input.jurisdictions))
    : [];
  const jurisdictionFallback = input.jurisdictions.length > 0 && preferred.length === 0 && matched.length > 0;
  const ratingPool = preferred.length > 0 ? preferred : matched;
  const top = ratingPool.slice(0, limit);
  const notCompared = [
    "the population affected (for example adults only or a child-directed service)",
    "the categories of data processed",
    "the mechanism of the processing",
  ];
  const description = input.jurisdictions.length === 0
    ? `Tracked regulator decisions whose recorded activity shares a term with the detected use case (${keywords.length} terms), newest first. No jurisdiction was selected, so decisions from every jurisdiction are shown.`
    : jurisdictionFallback
      ? `Tracked regulator decisions whose recorded activity shares a term with the detected use case (${keywords.length} terms). None of them is from a selected jurisdiction, so decisions from other jurisdictions are shown as cautionary context, not as your regulator's position.`
      : `Tracked regulator decisions whose recorded activity shares a term with the detected use case (${keywords.length} terms), limited to the jurisdictions you selected, newest first.`;
  return {
    top,
    matched,
    preferred,
    ratingPool,
    method: {
      pool_size: input.pool.length,
      matched_count: matched.length,
      preferred_count: preferred.length,
      jurisdiction_fallback: jurisdictionFallback,
      keyword_terms: keywords,
      selected_jurisdictions: input.jurisdictions,
      not_compared: notCompared,
      description,
    },
  };
}

export type LiaStrengthRating = "Strong" | "Moderate" | "Weak" | "High Risk";

export interface LiaStrength {
  readonly rating: LiaStrengthRating;
  readonly rationale: string;
  /** How the rating was reached, for display beside it. */
  readonly basis: "special_category_rule" | "use_case_rule" | "precedent_outcomes" | "no_precedent";
  /** Counts on the pool the rating used. */
  readonly accepted: number;
  readonly rejected: number;
  readonly pool: "selected_jurisdictions" | "all_jurisdictions" | "none";
}

/**
 * Heuristic strength. Rules first (special-category data; behavioural
 * advertising; employee monitoring of employees), then precedent outcomes on
 * the pool that is shown. Contradictory precedents are counted, never
 * suppressed; the rationale states both counts and which pool they came from.
 */
export function heuristicLiaStrength(input: {
  useCase: string;
  dataCategories: readonly string[];
  relationship: string;
  selection: PrecedentSelection;
}): LiaStrength {
  const { useCase, dataCategories, relationship, selection } = input;
  const poolRows = selection.ratingPool;
  const accepted = poolRows.filter((p) => p.outcome === "accepted").length;
  const rejected = poolRows.filter((p) => p.outcome === "rejected").length;
  const poolKind: LiaStrength["pool"] = poolRows.length === 0
    ? "none"
    : selection.preferred.length > 0 ? "selected_jurisdictions" : "all_jurisdictions";
  const poolPhrase = poolKind === "selected_jurisdictions"
    ? "in the jurisdictions you selected"
    : poolKind === "all_jurisdictions" ? "across all tracked jurisdictions (none from a selected jurisdiction matched)" : "";
  const hasSpecialCategory =
    dataCategories.includes("Special category data") ||
    dataCategories.includes("Health or medical data") ||
    dataCategories.includes("Biometric data");

  if (hasSpecialCategory) {
    return {
      rating: "High Risk",
      rationale: "Special category data cannot be processed under Article 6(1)(f) alone — Article 9 GDPR requires an additional condition. The full assessment records the Article 9(2) condition you identify.",
      basis: "special_category_rule", accepted, rejected, pool: poolKind,
    };
  }
  if (useCase === "behavioral_advertising") {
    return {
      rating: "Weak",
      rationale: "Regulators have repeatedly found that behavioural advertising based on tracking requires consent under the ePrivacy rules, so legitimate interests is rarely accepted for it. If this is not the activity you described, correct the detected use case above.",
      basis: "use_case_rule", accepted, rejected, pool: poolKind,
    };
  }
  if (useCase === "employee_monitoring" && relationship.toLowerCase().includes("employee")) {
    return {
      rating: "Weak",
      rationale: "The imbalance of power in the employment relationship makes the balancing test hard to satisfy without strong safeguards; regulators scrutinise employee monitoring closely.",
      basis: "use_case_rule", accepted, rejected, pool: poolKind,
    };
  }
  if (accepted >= 2 && rejected === 0) {
    return {
      rating: "Strong",
      rationale: `${accepted} tracked decisions ${poolPhrase} accepted legitimate interests for activities sharing terms with yours, and none rejected it. The decisions were matched on the activity described, not on the population, data or mechanism.`,
      basis: "precedent_outcomes", accepted, rejected, pool: poolKind,
    };
  }
  if (rejected > accepted) {
    return {
      rating: "Weak",
      rationale: `${rejected} tracked decisions ${poolPhrase} rejected legitimate interests for activities sharing terms with yours, against ${accepted} accepted. The decisions were matched on the activity described, not on the population, data or mechanism.`,
      basis: "precedent_outcomes", accepted, rejected, pool: poolKind,
    };
  }
  if (poolRows.length >= 1) {
    return {
      rating: "Moderate",
      rationale: `Mixed or limited precedent ${poolPhrase}: ${accepted} accepted, ${rejected} rejected, ${poolRows.length - accepted - rejected} with another outcome. The outcome depends on the necessity and balancing analysis in the full assessment.`,
      basis: "precedent_outcomes", accepted, rejected, pool: poolKind,
    };
  }
  return {
    rating: "Moderate",
    rationale: "No tracked decision shares a term with the activity you described. Strength will depend on the necessity and balancing assessment in the full report.",
    basis: "no_precedent", accepted, rejected, pool: "none",
  };
}
