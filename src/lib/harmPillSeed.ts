/**
 * Doc 261-review (2026-09-15, CL-T03; CEO decision doc 262 §9.5 item 2) —
 * the nine legacy "types of harm" pills seed structured § 7152(a)(5) rows.
 *
 * Why: 299 of 543 live risk records answered the harm question through the
 * legacy pills and 189 through the structured pathway rows. The pills stay
 * (the engine maps them to the same factor codes), and selecting one now
 * scaffolds a pathway row with the category pre-selected so the quick pick
 * becomes a record the user then completes.
 *
 * The pill-to-category map is a FRONTEND MIRROR of the engine's
 * HARM_TYPE_TEXT_TO_CODE in
 * supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/factor-presence.ts,
 * pinned by tests/edge/run-cppa-risk-assessment/harm-pill-seed-mirror.test.ts.
 * "Loss of availability of personal information" maps to (A) on both sides:
 * the canonical category (A) label itself includes loss of availability, and
 * the engine adopted the same reading on the CEO's ruling (doc 262 §9.8).
 */
import { HARM_PATHWAY_OPTS, HARM_TYPES } from "../pages/CPPARiskAssessment.enums.ts";

const BY_LETTER = new Map<string, string>(HARM_PATHWAY_OPTS.map((o) => [o.slice(1, 2), o]));

/** Legacy pill text → canonical category letter (A–H). */
export const HARM_PILL_TO_CODE: Readonly<Record<string, string>> = {
  "Unauthorised access, destruction, use, modification, or disclosure": "A",
  "Loss of availability of personal information": "A",
  "Unlawful discrimination": "B",
  "Impairment of consumer control over personal information": "C",
  "Coercion or dark patterns": "D",
  "Economic harm": "E",
  "Physical harm": "F",
  "Reputational harm": "G",
  "Psychological harm": "H",
};

/** The canonical HARM_PATHWAY_OPTS entry a legacy pill maps to, or null. */
export function harmCategoryForPill(pill: string): string | null {
  const code = HARM_PILL_TO_CODE[pill];
  return code ? BY_LETTER.get(code) ?? null : null;
}

export interface HarmRowLike {
  readonly harm: string;
  readonly data_involved: string;
  readonly actor: string;
  readonly source: string;
  readonly cause: string;
  readonly likelihood: string;
  readonly severity: string;
}

export function blankHarmRow(harm = ""): HarmRowLike {
  return { harm, data_involved: "", actor: "", source: "", cause: "", likelihood: "", severity: "" };
}

/**
 * Given the pills now selected and the current rows, return the rows with
 * one new blank row per newly selected pill whose category has no row yet.
 * Never removes or edits an existing row (rows are the user's), never adds
 * a duplicate category, and returns the same array when nothing changes.
 */
export function seedHarmRowsFromPills<T extends HarmRowLike>(
  selectedPills: readonly string[],
  rows: readonly T[],
  makeRow: (harm: string) => T,
): readonly T[] {
  const present = new Set(rows.map((r) => r.harm).filter(Boolean));
  const additions: T[] = [];
  for (const pill of selectedPills) {
    const cat = harmCategoryForPill(pill);
    if (!cat || present.has(cat)) continue;
    present.add(cat);
    additions.push(makeRow(cat));
  }
  if (!additions.length) return rows;
  // A single untouched blank row is the scaffold the page starts with; reuse it.
  const base = rows.length === 1 && !rows[0].harm && Object.values(rows[0]).every((v) => !String(v ?? "").trim())
    ? []
    : rows;
  return [...base, ...additions];
}

/** Every legacy pill maps to a canonical category — the dictionary is closed. */
export const ALL_PILLS_MAPPED: boolean = HARM_TYPES.every((p) => harmCategoryForPill(p) !== null);
