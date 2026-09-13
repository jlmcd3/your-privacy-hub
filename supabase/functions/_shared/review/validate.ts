// /all-ptest — finding validation.
//
// QUOTE LAW: a finding with no locatable quote is dropped. The whole loop
// depends on every finding pointing at real text — an unlocatable quote is
// either a paraphrase (so the fix would be applied to the wrong sentence) or
// a fabrication. Dropped findings are counted and reported, never hidden.

export interface ReviewFinding {
  id: string;
  section: string | null;
  defect_type: string;
  severity: string;
  confidence: string | null;
  quote: string;
  why: string;
  proposed_change: string | null;
  decision_required: string | null;
  cause_layer: string | null;
  code_focus: string | null;
  regression_test: string | null;
}

/** Whitespace- and quote-mark-insensitive containment test. */
function normalise(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export interface ValidationResult {
  findings: ReviewFinding[];
  droppedNoQuote: number;
  droppedUnlocatable: string[];
}

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim() : null;

export function validateFindings(raw: unknown, documentText: string): ValidationResult {
  const haystack = normalise(documentText);
  const out: ReviewFinding[] = [];
  const unlocatable: string[] = [];
  let noQuote = 0;
  const list = Array.isArray(raw) ? raw : [];

  for (let i = 0; i < list.length; i++) {
    const f = (list[i] ?? {}) as Record<string, unknown>;
    const quote = str(f.quote);
    if (!quote) { noQuote++; continue; }
    const needle = normalise(quote);
    // Very short quotes are not evidence of anything — they match everywhere.
    if (needle.length < 12 || !haystack.includes(needle)) {
      unlocatable.push(quote.slice(0, 120));
      continue;
    }
    out.push({
      id: str(f.id) ?? `f${i + 1}`,
      section: str(f.section),
      defect_type: str(f.defect_type) ?? "editorial",
      severity: str(f.severity) ?? "editorial",
      confidence: str(f.confidence),
      quote,
      why: str(f.why) ?? "",
      proposed_change: str(f.proposed_change),
      decision_required: str(f.decision_required),
      cause_layer: str(f.cause_layer),
      code_focus: str(f.code_focus),
      regression_test: str(f.regression_test),
    });
  }
  return { findings: out, droppedNoQuote: noQuote, droppedUnlocatable: unlocatable };
}
