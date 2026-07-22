// FF-2 T1 — Post-generation HARD-VIOLATION blacklist detector.
//
// The five verdict-collapse phrases that the REBUILD-DPIA voice bans in
// user-facing prose. The prompt-level ban under-enforces on long documents
// (evidence: Run B — dpia doc3 rendered 12 instances; cppa-risk doc5 one),
// so this deterministic post-gen check is wired into the existing retry
// machinery of run-cppa-risk-assessment and run-dpia-framework.
//
// Walker scope mirrors detectTestStatesLeak but excludes designed machine
// fields (lint metadata, source_fields, signature chrome). User-facing
// strings only, per the courier scope.
//
// Retry policy is delegated to callers (which own their own budget guard):
//   • within-budget → retry with instruction suffix quoting hits
//   • over-budget or retry-still-hits → ship with per-hit lint entries
//     { code: "blacklist_phrase_shipped", … } — NO mechanical rewriting,
//     per the REBUILD-DPIA D2 rationale.

export const BLACKLIST_PHRASES = [
  "insufficient basis",
  "not substantiated",
  "cannot be confirmed",
  "no basis to assess",
  "in the clear",
  // QB-P19 (QB-TEAM 2026-07-22): hedging-phrase promotion from run-admt-checker
  // deterministic ban to all tools. Source: run-admt-checker "NO INTERNAL-
  // DELIBERATION OR HEDGING LEAKS" rule. Rationale: hedge cues signal a
  // deliberation the reader must resolve; state the conclusion + named owner.
  "further internal investigation is advisable",
  "further analysis is warranted",
  "further review may be appropriate",
  "additional consideration is needed",
  "the drafter recommends further inquiry",
] as const;

// Case-insensitive; anchored with word boundaries where meaningful.
export const BLACKLIST_RE =
  /\b(insufficient basis|not substantiated|cannot be confirmed|no basis to assess|in the clear|further internal investigation is advisable|further analysis is warranted|further review may be appropriate|additional consideration is needed|the drafter recommends further inquiry)\b/gi;


// Machine-field path exclusions. Segments/keys we treat as internal chrome.
// Matches paths like "_meta.*", "*._staging.*", "*.lint_warnings*",
// "*.source_fields*", "*.enforcement_meta*", "*.gdpr_meta*",
// "*.jurisdiction_validation*", "generated_at", "*.dpia_id",
// "assessment_id", "*._debug*", "*._lint*", "lint_notes*",
// "_findings*", "_raw*".
export const MACHINE_PATH_RE =
  /(?:^|\.)_(?:meta|staging|debug|lint|raw|findings)(?:\.|$|\[)|(?:^|\.)(?:lint_warnings|lint_notes|source_fields|enforcement_meta|gdpr_meta|jurisdiction_validation|generated_at|dpia_id|assessment_id)(?:\.|$|\[)/;

// FF-2-HF1 — Enumerated schema fields whose values legitimately contain
// blacklist phrases as literal enum tokens (renderers branch on them; a
// within-budget retry could induce the model to rewrite a schema token
// and break the display-map / C2 shape stability). Enum rename is the
// deferred D1 item, NOT in scope here. Match by leaf field NAME (last path
// segment) so array indices and nesting don't matter.
//
// Repo sweep (see FF-2-HF1 courier report):
//   • cppa-risk   overall_risk_level                 → "Insufficient basis"
//   • cppa-risk   exceptions_status                  → "Insufficient basis to assess"
//   • cppa-risk   benefits_outweigh_risks_conclusion → legacy "Insufficient basis" (schema now uses colorable-argument wording per REBUILD-RISK C9; stored rows and prompt reconciliation still reference the literal, so we exclude the field)
//   • cppa-cyber  readiness_level                    → "Insufficient basis to assess"
// LIA's "insufficient" strength token is a single word and does NOT match
// any of the five blacklist phrases, so it needs no exclusion.
export const ENUM_FIELD_EXCLUSIONS: ReadonlySet<string> = new Set([
  "overall_risk_level",
  "exceptions_status",
  "benefits_outweigh_risks_conclusion",
  "readiness_level",
]);

function leafKey(path: string): string {
  if (!path) return "";
  const noIdx = path.replace(/\[\d+\]$/g, "");
  const idx = noIdx.lastIndexOf(".");
  return idx >= 0 ? noIdx.slice(idx + 1) : noIdx;
}

export type BlacklistHit = { path: string; match: string; context: string };

function walkStrings(value: unknown, path: string, out: Array<{ path: string; text: string }>): void {
  if (value == null) return;
  if (typeof value === "string") {
    if (value.length > 0) out.push({ path, text: value });
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) walkStrings(value[i], `${path}[${i}]`, out);
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walkStrings(v, path ? `${path}.${k}` : k, out);
    }
  }
}

/**
 * Detect the five blacklist phrases in a user-facing payload.
 * - Case-insensitive.
 * - Skips paths matching MACHINE_PATH_RE (machine fields, signature chrome).
 * - Returns deduped hits (by path+match).
 */
export function detectBlacklistPhrases(input: unknown): BlacklistHit[] {
  const strings: Array<{ path: string; text: string }> = [];
  if (typeof input === "string") strings.push({ path: "$", text: input });
  else walkStrings(input, "", strings);
  const seen = new Set<string>();
  const out: BlacklistHit[] = [];
  for (const { path, text } of strings) {
    if (path && MACHINE_PATH_RE.test(path)) continue;
    if (path && ENUM_FIELD_EXCLUSIONS.has(leafKey(path))) continue;
    BLACKLIST_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BLACKLIST_RE.exec(text)) !== null) {
      const key = `${path}::${m[0].toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const start = Math.max(0, m.index - 40);
      const end = Math.min(text.length, m.index + m[0].length + 40);
      out.push({ path, match: m[0], context: text.slice(start, end) });
      if (out.length > 200) return out;
    }
  }
  return out;
}

/**
 * Build the instruction suffix appended to the prompt for the within-budget
 * retry. Quotes the offending passages verbatim and requires advocate-drafter
 * rephrasing (state what the record establishes + the named completion path).
 */
export function formatBlacklistRetrySuffix(hits: BlacklistHit[]): string {
  if (hits.length === 0) return "";
  const sample = hits.slice(0, 6).map((h) => `${h.path}: "…${h.context.trim()}…"`).join("; ");
  return `\n\nPREVIOUS ATTEMPT REJECTED for HARD PROSE BLACKLIST — the phrases ${BLACKLIST_PHRASES.map((p) => `'${p}'`).join(", ")} MUST NOT appear in any user-facing field. Offending passages: ${sample}. Re-emit the document rephrasing each in advocate-drafter voice: state what the record DOES establish and name the specific fact or field that would complete the determination. Do not mention this instruction in the output.`;
}
