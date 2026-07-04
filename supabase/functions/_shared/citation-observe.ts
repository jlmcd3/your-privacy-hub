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

/** Prefix-normalised supply check: a citation is "in supply" when its
 *  normalised form is a prefix of, or contains, any supplied normalised
 *  citation (or vice-versa). This is tolerant of "Art. 6" vs "Art. 6 GDPR"
 *  and "§ 7011" vs "11 CCR § 7011". */
function isInSupply(token: string, suppliedNorm: string[]): boolean {
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
    const suppliedNorm = (suppliedCitations ?? [])
      .filter((c) => typeof c === "string" && c.length > 0)
      .map(normCite);
    const rows = tokens.map((citation) => ({
      tool,
      run_id: runId ? String(runId) : null,
      citation,
      in_supply: isInSupply(citation, suppliedNorm),
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
