/**
 * ITEM 337 (PROSE PROGRAM 1 of 4, Part E) — REGISTRY CITATION LINT.
 *
 * Post-generation lint over MODEL-AUTHORED narrative fields. Every
 * citation-shaped string is checked against the verified-authority registry
 * keys / corpus provisions supplied by the caller. A citation that is not in
 * supply is:
 *   • recorded to `citation_lint_events` (observe channel; the existing table
 *     from _shared/citation-observe.ts — columns tool, run_id, citation,
 *     in_supply), and
 *   • degraded in the prose: the sentence carrying it is replaced by the
 *     registry-anchored equivalent when the caller supplies one, otherwise the
 *     sentence is dropped and a named information-needed item is returned
 *     (MANDATORY DEGRADATION LAW — never leave an unverifiable cite standing).
 *
 * Known-bad recorded examples this catches:
 *   "Art. 20(1)(c)"                     — does not exist
 *   "UK GDPR Art. 44" as operative law  — post-DUAA framing
 *   pre-CPRA § 1798.140 lettering       — repealed lettering
 */

import { splitSentencesSafe, rejoinSentences } from "./segment.ts";

export const CITATION_LINT_VERSION = "prose-citation-lint-2026-08-01-item337";

/** Citation shapes we lint. Mirrors _shared/citation-verifier.ts patterns. */
const CITE_PATTERNS: readonly RegExp[] = [
  /(?:UK\s+GDPR|EU\s+GDPR|GDPR)\s+Art(?:icle|\.)\s*\d+[A-Za-z]?(?:\(\d+\))?(?:\([a-z]\))?/g,
  /Art(?:icle|\.)\s*\d+[A-Za-z]?(?:\(\d+\))?(?:\([a-z]\))?/g,
  /§+\s*\d+(?:\.\d+)?(?:\([a-z0-9]+\))*/g,
  /\b\d{2}\s*CCR\s*§*\s*\d+(?:\.\d+)?/g,
  /\b45\s*CFR\s*§*\s*\d+(?:\.\d+)+/g,
];

/** Cites that are never operative, regardless of supply. */
export const REPEALED_OR_NONEXISTENT: readonly RegExp[] = [
  /^Art(?:icle|\.)\s*20\(1\)\(c\)$/i,
  /^UK\s+GDPR\s+Art(?:icle|\.)\s*44$/i,
];

export function normaliseCite(s: string): string {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .replace(/Article/gi, "Art.")
    .replace(/§§/g, "§")
    .trim()
    .toLowerCase();
}

export function extractCitations(text: string): string[] {
  const found = new Set<string>();
  const t = String(text ?? "");
  for (const re of CITE_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      const hit = m[0].trim();
      if (hit) found.add(hit);
    }
  }
  return [...found];
}

export interface CitationLintEvent {
  tool: string;
  run_id: string | null;
  citation: string;
  in_supply: boolean;
  field: string;
  action: "kept" | "degraded_to_registry" | "degraded_to_information_needed";
}

export interface CitationLintResult {
  events: CitationLintEvent[];
  information_needed: { item: string; reason: string; field: string }[];
  fields_changed: string[];
}

export interface CitationLintOptions {
  tool: string;
  runId?: string | null;
  /** Citations actually supplied to the model / carried by the registry. */
  supplied: readonly string[];
  /** Optional replacement prose keyed by normalised bad cite. */
  registryEquivalents?: Record<string, string>;
}

function isSupplied(cite: string, suppliedNorm: Set<string>): boolean {
  const n = normaliseCite(cite);
  if (suppliedNorm.has(n)) return true;
  // A pinpoint is in supply when its parent provision is supplied.
  const parent = n.replace(/\([^)]*\)\s*$/, "").trim();
  return parent.length > 0 && suppliedNorm.has(parent);
}

function isBanned(cite: string): boolean {
  const c = String(cite ?? "").replace(/\s+/g, " ").trim();
  return REPEALED_OR_NONEXISTENT.some((re) => re.test(c));
}

/**
 * Lint (and degrade) the given narrative fields in place.
 * `fields` maps field label → current text; returns the corrected texts.
 */
export function lintNarrativeCitations(
  fields: Record<string, string>,
  opts: CitationLintOptions,
): CitationLintResult & { fields: Record<string, string> } {
  const suppliedNorm = new Set((opts.supplied ?? []).map(normaliseCite));
  const equivalents = opts.registryEquivalents ?? {};
  const events: CitationLintEvent[] = [];
  const information_needed: { item: string; reason: string; field: string }[] = [];
  const fields_changed: string[] = [];
  const out: Record<string, string> = {};

  for (const [field, original] of Object.entries(fields ?? {})) {
    const text = String(original ?? "");
    if (!text.trim()) {
      out[field] = text;
      continue;
    }
    const sentences = splitSentencesSafe(text);
    const kept: string[] = [];
    let changed = false;

    for (const sentence of sentences) {
      const cites = extractCitations(sentence);
      const bad = cites.filter((c) => isBanned(c) || !isSupplied(c, suppliedNorm));
      if (bad.length === 0) {
        for (const c of cites) {
          events.push({ tool: opts.tool, run_id: opts.runId ?? null, citation: c, in_supply: true, field, action: "kept" });
        }
        kept.push(sentence);
        continue;
      }
      const replacement = equivalents[normaliseCite(bad[0])];
      if (replacement) {
        kept.push(replacement);
        changed = true;
        for (const c of bad) {
          events.push({ tool: opts.tool, run_id: opts.runId ?? null, citation: c, in_supply: false, field, action: "degraded_to_registry" });
        }
      } else {
        changed = true;
        for (const c of bad) {
          events.push({ tool: opts.tool, run_id: opts.runId ?? null, citation: c, in_supply: false, field, action: "degraded_to_information_needed" });
          information_needed.push({
            item: `Verified authority for the proposition previously cited as "${c}"`,
            reason: "The citation is not present in the verified-authority registry for this report; the sentence relying on it was removed rather than published unverified.",
            field,
          });
        }
      }
    }

    out[field] = rejoinSentences(kept);
    if (changed) fields_changed.push(field);
  }

  return { fields: out, events, information_needed, fields_changed };
}

/**
 * Write lint events to the observe table. Reuses `citation_lint_events`
 * (tool, run_id, citation, in_supply) — the same channel
 * _shared/citation-observe.ts already writes and the admin observe views
 * already read. NEVER throws.
 */
export async function recordCitationLintEvents(
  supabase: { from: (t: string) => { insert: (rows: unknown[]) => Promise<{ error: { message: string } | null }> } },
  events: readonly CitationLintEvent[],
): Promise<void> {
  try {
    if (!events || events.length === 0) return;
    const rows = events.map((e) => ({
      tool: e.tool,
      run_id: e.run_id,
      citation: e.citation,
      in_supply: e.in_supply,
    }));
    const { error } = await supabase.from("citation_lint_events").insert(rows);
    if (error) console.warn(JSON.stringify({ evt: "citation_lint_insert_failed", error: error.message }));
  } catch (e) {
    console.warn(JSON.stringify({ evt: "citation_lint_threw", error: (e as Error)?.message ?? String(e) }));
  }
}
