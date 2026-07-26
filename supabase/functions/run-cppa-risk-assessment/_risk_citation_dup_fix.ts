// RISK-CITATION-DUP-FIX (2026-07-26) — deterministic post-pass.
//
// Discharges the two generator-owned classes surfaced in
// docs/courier/PERFECT-INTAKE-EXPERIMENT-2026-07-26.md (run f3674428):
//
// (A) CITATION-DUPLICATION invariant. Any two-trigger comparison
//     sentence ("X and Y" / "neither X nor Y" / "both X and Y") that
//     names two § 7150(b) pinpoints MUST carry two DISTINCT pinpoints.
//     Where the two sides collapse to the SAME pinpoint (either the
//     bare "§ 7150(b)" repeated or a shared "§ 7150(b)(N)"), the
//     comparison is defective — restructure to single-trigger phrasing
//     by whole-sentence excision. Model NEVER writes the replacement.
//     (This is a "restructured to single-trigger phrasing" outcome per
//     dispatch: the two-trigger claim is dropped and the surrounding
//     surface is left to render whatever single-trigger prose already
//     lives there.)
//
// (B) ADMT-CONSEQUENCE gate. When q18_admt_use resolves NEGATIVE in
//     the intake, suppress ADMT-consequence assertions — specifically
//     any sentence citing § 7001(ddd) (the decision-effects home
//     section) or asserting ADMT-driven decision effects. The
//     § 7150(b)(4) profiling trigger itself is NOT touched: only the
//     downstream ADMT-consequence extrapolation is gated.
//
// EXPLICIT NON-TARGET (per dispatch): intake-value misquote class
// (sensitive_location_basis fabrication) is RESERVED for the two-pass
// architecture. This module does NOT stack a fifth string-guard for it.
//
// SCOPE: model-written narrative surfaces ONLY. NEVER touches
// opening_summary, anchor fields, or reserved subtrees (_meta /
// _internal / engagement_map / annotations). Runs AFTER
// applyRiskIntakeContradiction, BEFORE LEAK-PREV P1 emit gate.
// Fail-open at every seam. Idempotent (a second pass finds nothing).
//
// Telemetry: report._meta.internal.risk_citation_dup_fix = {
//   version, stamp, build_stamp, dup_sentence_excisions,
//   admt_consequence_excisions, admt_gated, criteria_checked,
//   scanned_string_nodes, errors
// }

export const RISK_CITATION_DUP_FIX_VERSION =
  "risk-citation-dup-fix-v1-2026-07-26";
export const RISK_CITATION_DUP_FIX_STAMP =
  "risk-citation-dup-fix@2026-07-26T06:20:00Z";

const RESERVED_KEYS = new Set([
  "_meta", "_internal", "engagement_map", "annotations", "opening_summary",
]);
const ANCHOR_KEYS = new Set([
  "citation", "verbatim_quote", "deadline", "deadline_basis", "source_fields",
  "primary_source_url", "subsection", "governing_anchor", "depth_class",
  "proposition_key", "field", "field_ids", "citation_ids", "intake_field_1",
  "intake_field_2", "canonical_fields", "element_id",
]);

type Polarity = "yes" | "no" | "indefinite";

export interface CdfCounters {
  version: string;
  stamp: string;
  build_stamp?: string;
  dup_sentence_excisions: number;
  admt_consequence_excisions: number;
  admt_gated: boolean;
  criteria_checked: string[];
  scanned_string_nodes: number;
  errors: string[];
}

function polarityOf(v: unknown): Polarity {
  if (v === true) return "yes";
  if (v === false) return "no";
  if (typeof v !== "string") return "indefinite";
  const s = v.trim().toLowerCase();
  if (!s) return "indefinite";
  if (s === "yes" || s === "y" || s === "true" || s === "both" ||
      s.startsWith("yes ") || s.startsWith("yes—") || s.startsWith("yes -") ||
      s.startsWith("yes,") || s.startsWith("yes.")) return "yes";
  if (s === "no" || s === "n" || s === "false" || s === "none" ||
      s.startsWith("no ") || s.startsWith("no—") || s.startsWith("no -") ||
      s.startsWith("no,") || s.startsWith("no.")) return "no";
  return "indefinite";
}

// Sentence splitter that preserves terminators and trailing whitespace.
function splitSentences(text: string): string[] {
  const out: string[] = [];
  const re = /[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[0]);
  return out.length ? out : [text];
}

// Extract every § 7150(b) or § 7150(b)(N) pinpoint token in-sentence,
// normalised to canonical form (with or without the "11 CCR " prefix
// stripped, and any leading depth marker collapsed).
const PIN_RE = /(?:11\s*CCR\s*)?§\s*7150\(b\)(?:\((\d+)\))?/gi;

function pinpointsIn(sentence: string): string[] {
  const out: string[] = [];
  for (const m of sentence.matchAll(PIN_RE)) {
    out.push(m[1] ? `§ 7150(b)(${m[1]})` : "§ 7150(b)");
  }
  return out;
}

// Comparison connective probes. We accept any of:
//   "A and B"
//   "both A and B"
//   "neither A nor B"
//   "either A or B"
//   "A or B"                       (only when clearly a comparison, i.e. two pinpoints)
// where A and B are both § 7150(b) tokens.
const COMPARISON_CONNECTIVES = /\b(?:and|nor|or)\b/i;

// A sentence exhibits the citation-duplication defect iff it contains
// at least two § 7150(b) pinpoint tokens, at least two of those tokens
// are IDENTICAL, and a comparison connective sits between two identical
// tokens.
export function isDefectiveTriggerComparison(sentence: string): boolean {
  const pins = pinpointsIn(sentence);
  if (pins.length < 2) return false;
  if (!COMPARISON_CONNECTIVES.test(sentence)) return false;
  // Find any two occurrences that share the SAME normalised pinpoint
  // AND sit on either side of a comparison connective.
  const matches: Array<{ pin: string; start: number; end: number }> = [];
  for (const m of sentence.matchAll(PIN_RE)) {
    const pin = m[1] ? `§ 7150(b)(${m[1]})` : "§ 7150(b)";
    const start = m.index ?? 0;
    matches.push({ pin, start, end: start + m[0].length });
  }
  for (let i = 0; i < matches.length; i++) {
    for (let j = i + 1; j < matches.length; j++) {
      if (matches[i].pin !== matches[j].pin) continue;
      const between = sentence.slice(matches[i].end, matches[j].start);
      if (/\b(?:and|nor|or)\b/i.test(between)) return true;
    }
  }
  return false;
}

// ADMT-consequence gate: sentence asserts an ADMT decision-effects
// consequence (or cites § 7001(ddd)). Runs only when admt polarity is
// "no". Deliberately narrow: never touches sentences that merely name
// § 7150(b)(4) as an engaged profiling trigger.
const ADMT_CONSEQUENCE_CITE = /§\s*7001\(ddd\)/i;
const ADMT_CONSEQUENCE_PROSE =
  /\bADMT\b[^.!?]{0,120}\b(?:decisions?|decision[- ]effects?|significant decisions?|consequences?|affects? decisions?|may affect|adversely affect|will affect)\b/i;

export function isAdmtConsequence(sentence: string): boolean {
  if (ADMT_CONSEQUENCE_CITE.test(sentence)) return true;
  if (ADMT_CONSEQUENCE_PROSE.test(sentence)) return true;
  // Bare decision-effects prose keyed on the § 7001(ddd) subject.
  if (/decisions? (?:enumerated|described|listed) in\b[^.!?]{0,40}§\s*7001\(ddd\)/i.test(sentence)) return true;
  return false;
}

interface WalkCtx {
  admtPol: Polarity;
  counters: CdfCounters;
}

function scrubString(text: string, ctx: WalkCtx): string {
  if (!text || typeof text !== "string") return text;
  ctx.counters.scanned_string_nodes++;
  const sentences = splitSentences(text);
  let mutated = false;
  const kept: string[] = [];
  for (const sent of sentences) {
    let drop = false;
    // (A) Citation-duplication invariant.
    if (isDefectiveTriggerComparison(sent)) {
      drop = true;
      ctx.counters.dup_sentence_excisions++;
    }
    // (B) ADMT-consequence gate — only when q18=No.
    if (!drop && ctx.admtPol === "no" && isAdmtConsequence(sent)) {
      drop = true;
      ctx.counters.admt_consequence_excisions++;
    }
    if (drop) { mutated = true; continue; }
    kept.push(sent);
  }
  if (!mutated) return text;
  return kept.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function walk(node: unknown, ctx: WalkCtx, parentKey?: string): unknown {
  if (node === null || node === undefined) return node;
  if (typeof node === "string") {
    if (parentKey && ANCHOR_KEYS.has(parentKey)) return node;
    return scrubString(node, ctx);
  }
  if (Array.isArray(node)) {
    return node.map((v) => walk(v, ctx, parentKey));
  }
  if (typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (RESERVED_KEYS.has(k)) { out[k] = v; continue; }
      if (ANCHOR_KEYS.has(k)) { out[k] = v; continue; }
      out[k] = walk(v, ctx, k);
    }
    return out;
  }
  return node;
}

export interface CdfOptions { buildStamp?: string }

export function applyRiskCitationDupFix(
  intake: Record<string, unknown> | null | undefined,
  report: unknown,
  opts: CdfOptions = {},
): { counters: CdfCounters; report: unknown } {
  const counters: CdfCounters = {
    version: RISK_CITATION_DUP_FIX_VERSION,
    stamp: RISK_CITATION_DUP_FIX_STAMP,
    build_stamp: opts.buildStamp,
    dup_sentence_excisions: 0,
    admt_consequence_excisions: 0,
    admt_gated: false,
    criteria_checked: [],
    scanned_string_nodes: 0,
    errors: [],
  };
  try {
    if (!report || typeof report !== "object" || Array.isArray(report)) {
      return { counters, report };
    }
    const intakeObj = (intake && typeof intake === "object" && !Array.isArray(intake))
      ? intake as Record<string, unknown>
      : {};
    const admtPol = polarityOf(intakeObj["q18_admt_use"]);
    counters.admt_gated = admtPol === "no";
    counters.criteria_checked.push("citation_duplication_invariant");
    if (admtPol === "no") counters.criteria_checked.push("q18_admt_use=no");
    const ctx: WalkCtx = { admtPol, counters };
    const next = walk(report, ctx) as Record<string, unknown>;
    return { counters, report: next };
  } catch (e) {
    counters.errors.push((e as Error)?.message ?? String(e));
    return { counters, report };
  }
}
