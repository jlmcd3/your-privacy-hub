// Observe-only citation linter. Extracts citation tokens from AI output using
// the same regex patterns as _shared/citation-verifier.ts and logs each
// distinct token to `citation_lint_events` with `in_supply` computed against
// the citations actually supplied to the model. NEVER throws — failures log a
// console.warn and return.
//
// Wire this in AFTER the tool's response is final. It never mutates output
// and never affects the response.

import { STAT_PATTERNS } from "./citation-verifier.ts";

/** Same normalisation as citation-verifier.normCite (kept local to avoid
 *  changing that module's public surface). */
function normCite(s: string): string {
  return s
    .replace(/§§/g, "§")
    .replace(/\bSection\b/gi, "§")
    .replace(/\bSec\.?\b/gi, "§")
    .replace(/\s+/g, " ")
    .replace(/\s*§\s*/g, " § ")
    .trim()
    .toLowerCase();
}

function extractCitations(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  const found = new Set<string>();
  for (const pat of STAT_PATTERNS) {
    const re = new RegExp(pat.source, pat.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      found.add(m[0]);
    }
  }
  return Array.from(found);
}

/** Canonicalise a citation (from either side) to a stable key form used ONLY
 *  for matching. Bridges the supply side (corpus keys like `gdpr:eu:6`) with
 *  the extraction side (statutory tokens like "Article 6 GDPR" / "Art. 6(1)(f)
 *  GDPR" / "UK GDPR Article 33" / "Articolul 5(1)(a) din GDPR"). Article
 *  number only — subsection detail is dropped for the match. The full original
 *  token is still stored verbatim on the lint row. Returns null when the
 *  citation is not a GDPR-family form; the caller then falls back to the
 *  existing loose matcher (unchanged for CCR / Civ Code / everything else). */
function canonicalize(raw: string): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  // Corpus key already: gdpr:eu:6, gdpr:uk:33, gdpr:eu:6(1)(f) -> article only.
  const keyMatch = /^gdpr:(eu|uk):([0-9]+)/i.exec(s);
  if (keyMatch) return `gdpr:${keyMatch[1].toLowerCase()}:${keyMatch[2]}`;
  // Statutory forms. Require GDPR/RGPD to be present in the token.
  const hasGdpr = /\b(?:GDPR|RGPD|Regulamentului)\b/i.test(s);
  if (!hasGdpr) return null;
  const isUk = /\bUK[\s-]?GDPR\b/i.test(s) || /\bUnited Kingdom GDPR\b/i.test(s);
  const jur = isUk ? "uk" : "eu";
  const artMatch = /\b(?:Articolul|Article|Art\.?)\s*([0-9]{1,3})/i.exec(s);
  if (!artMatch) return null;
  return `gdpr:${jur}:${artMatch[1]}`;
}

/** Supply check. First tries canonical-key equality (bridges corpus keys and
 *  statutory GDPR tokens). Falls back to the previous prefix/contains matcher
 *  so CCR / Civ Code / non-GDPR behaviour is unchanged. */
function isInSupply(
  token: string,
  suppliedNorm: string[],
  suppliedCanon: (string | null)[],
): boolean {
  const canonTok = canonicalize(token);
  if (canonTok) {
    for (const c of suppliedCanon) {
      if (c && c === canonTok) return true;
    }
  }
  const t = normCite(token);
  if (!t) return false;
  for (const s of suppliedNorm) {
    if (!s) continue;
    if (t === s) return true;
    if (t.startsWith(s) || s.startsWith(t)) return true;
    if (t.includes(s) || s.includes(t)) return true;
  }
  return false;
}

export async function observeCitations(
  supabase: any,
  tool: string,
  runId: string | null | undefined,
  outputText: string,
  suppliedCitations: string[],
): Promise<void> {
  try {
    const tokens = extractCitations(outputText);
    if (tokens.length === 0) return;
    const suppliedClean = (suppliedCitations ?? []).filter(
      (c) => typeof c === "string" && c.length > 0,
    );
    const suppliedNorm = suppliedClean.map(normCite);
    const suppliedCanon = suppliedClean.map(canonicalize);
    const rows = tokens.map((citation) => ({
      tool,
      run_id: runId ? String(runId) : null,
      citation,
      in_supply: isInSupply(citation, suppliedNorm, suppliedCanon),
    }));
    const { error } = await supabase.from("citation_lint_events").insert(rows);
    if (error) {
      console.warn(
        JSON.stringify({ evt: "citation_observe_insert_failed", tool, run_id: runId, error: error.message }),
      );
    }
  } catch (e) {
    console.warn(
      JSON.stringify({ evt: "citation_observe_threw", tool, run_id: runId, error: (e as Error)?.message ?? String(e) }),
    );
  }
}
