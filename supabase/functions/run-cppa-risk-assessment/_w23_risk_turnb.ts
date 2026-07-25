// ─────────────────────────────────────────────────────────────────────────
// WAVE23-FIX TURN B (cppa-risk) — deploy turn on run-cppa-risk-assessment.
// Controller dispatch WAVE23-RISK-TURNB-2026-07-25 (five-lens TEAM-REVIEWED).
// Closes wave-23 FINDING B (item 71): internal-note / reasoning-leak scrub
// extension beyond `scope_notes` to all sibling free-text emitters on the
// customer-facing risk surface, plus concatenation-artifact normalization.
//
// SCOPE:
//   T1 — INTERNAL-NOTE SCRUB EXTENSION: patterns previously restricted to
//        scope_notes are now applied to safeguard_gaps, mitigation_gaps,
//        open_items, and any *_gaps / *_notes field. Type case (wave-23
//        doc d8c6dffd, safeguard_gaps):
//          "The intake on profiling and systematic observation does not
//           support this statement; it must be reconciled before use.."
//        Downgrades to a neutral document-and-confirm sentence WHEN the
//        mapped intake facts do NOT assert the underlying claim; leaves
//        intake-supported prose untouched (fact-ledger consultation).
//   T2 — CONCATENATION-ARTIFACT NORMALIZATION: collapses ".." → ".",
//        strips " . " splice-debris, tightens whitespace-before-punct
//        on the same field set.
//   T3 — STAMP-ECHO: exposes {stamp, ...counters} on _meta.internal
//        under key `risk_w23b`; the LEAK-PREV-P2 whitelist serializer
//        preserves _meta.internal unmodified (item-32 gate).
//
// Fail-open, non-blocking. Runs AFTER W22 turnA and BEFORE LEAK-PREV P1.
// Anchor keys never mutated. Never emits "information needed" phrasing.
// ─────────────────────────────────────────────────────────────────────────

import type { FactRow } from "../_shared/intake/fact-ledger.ts";

export const W23_RISK_TURNB_STAMP = "w23-risk-turnb@2026-07-25T16:57:17Z";

// ── Anchor keys (never mutate) ──────────────────────────────────────────
const ANCHOR_KEYS = new Set<string>([
  "source_fields", "field", "intake_field", "intake_field_1", "intake_field_2",
  "provision", "citation", "regulatory_citation", "statutory_basis",
  "proposition_key", "verbatim_quote", "url", "primary_source_url",
  "id", "key", "stamp", "build_stamp",
]);

// Target fields for T1/T2 scrubs — enumerated seams plus *_gaps / *_notes.
const TARGET_FIELD_KEYS = new Set<string>([
  "safeguard_gaps", "mitigation_gaps", "open_items",
  "scope_notes", "notes", "note", "gaps",
]);
function isTargetField(k: string | undefined): boolean {
  if (!k) return false;
  if (TARGET_FIELD_KEYS.has(k)) return true;
  return k.endsWith("_gaps") || k.endsWith("_notes");
}

// ── T1: internal-note / reasoning-leak patterns ─────────────────────────
// Source: customer-messages catalog `ir.intake_mismatch_generic` +
// near-variants that appeared in wave-23 findings.
const INTAKE_MISMATCH_RE =
  /The intake(?:\s+on\s+[^.]{0,200}?)?\s+does not support this statement;?\s*it must be reconciled(?:\s+before\s+use)?\.?/gi;
// Bare fragment ("… must be reconciled before use.") without lead.
const RECONCILE_FRAGMENT_RE =
  /\bmust be reconciled(?:\s+before\s+use)?\.?/gi;
// Chain-of-thought / self-correction fragments that occasionally slip into
// free-text emitters (defensive; not seen in wave-23 but observed in earlier waves).
const COT_FRAGMENT_RE =
  /\b(?:—\s*wait,|correcting:|let me reconsider|on second thought|actually,\s+)/gi;

// Category probes — mirror the W22 scope_notes probe set so we can look up
// whether the intake actually supports the underlying subject before we scrub.
type CategoryProbe = { re: RegExp; field: string };
const CATEGORY_PROBES: readonly CategoryProbe[] = [
  { re: /\bprofiling\b/i, field: "q5b_profiling_observation" },
  { re: /\bsystematic\s+observation\b/i, field: "q5b_profiling_observation" },
  { re: /\bcross[- ]context\s+(?:behavio(?:u)?ral\s+)?(?:advertising|tracking)\b/i, field: "q4_targeted_ads" },
  { re: /\btargeted\s+advertising\b/i, field: "q4_targeted_ads" },
  { re: /\bsell(?:ing)?\s*(?:\/|or|and)?\s*shar(?:e|ing)\b/i, field: "q3_sell_share" },
  { re: /\bsensitive[- ]location\s+profiling\b/i, field: "sensitive_location_basis" },
  { re: /\bsensitive\s+personal\s+information\b/i, field: "q15_sensitive_pi" },
  { re: /\bADMT\b/i, field: "i5_admt_logic" },
];

function ledgerAsserts(ledger: readonly FactRow[] | undefined, field: string): boolean {
  if (!ledger) return false;
  for (const r of ledger) {
    if ((r.key === field || r.source_field === field) && r.polarity === "asserted") return true;
  }
  return false;
}

/**
 * If any subject named in the sentence is asserted in the ledger, the
 * "does not support" phrasing is factually wrong AND unsupported — but we
 * conservatively PRESERVE it (fail-open: never strip intake-supported
 * substantive claims). Returns true when the ledger contradicts the
 * "not-supported" framing (i.e. we should suppress the scrub, since the
 * sentence's own logic already conflicts with facts we must not overwrite).
 */
function anyCategorySupportedByLedger(s: string, ledger: readonly FactRow[] | undefined): boolean {
  for (const p of CATEGORY_PROBES) {
    if (p.re.test(s) && ledgerAsserts(ledger, p.field)) return true;
  }
  return false;
}

const NEUTRAL_DOWNGRADE =
  "The controller should document the relevant facts and confirm whether this issue applies.";

// ── T2: concatenation-artifact normalization ────────────────────────────
function normalizeConcatArtifacts(s: string): string {
  let out = s;
  // ".." (or more) → "."
  out = out.replace(/\.{2,}(?!\.)/g, ".");
  // ". ." → "."
  out = out.replace(/\.\s+\./g, ".");
  // "..," → "."
  out = out.replace(/\.,/g, ".");
  // whitespace-before-punct
  out = out.replace(/\s+([.,;:!?])/g, "$1");
  // collapse runs of spaces
  out = out.replace(/[ \t]{2,}/g, " ");
  return out.trim();
}

// ── Combined per-string scrub for target fields ─────────────────────────
function scrubTargetString(
  s: string,
  ledger: readonly FactRow[] | undefined,
  c: W23Counters,
): string {
  if (typeof s !== "string" || !s) return s;
  const before = s;
  let out = s;

  // T1a — canonical intake-mismatch phrasing.
  if (INTAKE_MISMATCH_RE.test(out)) {
    INTAKE_MISMATCH_RE.lastIndex = 0;
    if (anyCategorySupportedByLedger(out, ledger)) {
      // Ledger asserts the subject; leave the sentence untouched to avoid
      // stripping intake-supported facts. Record as preserved.
      c.intake_supported_preserved += 1;
    } else {
      out = out.replace(INTAKE_MISMATCH_RE, NEUTRAL_DOWNGRADE);
      c.internal_note_scrubs += 1;
    }
  }
  // T1b — bare "must be reconciled" fragment residuals.
  if (RECONCILE_FRAGMENT_RE.test(out)) {
    RECONCILE_FRAGMENT_RE.lastIndex = 0;
    out = out.replace(RECONCILE_FRAGMENT_RE, "");
    c.internal_note_scrubs += 1;
  }
  // T1c — CoT fragments (defensive).
  if (COT_FRAGMENT_RE.test(out)) {
    COT_FRAGMENT_RE.lastIndex = 0;
    out = out.replace(COT_FRAGMENT_RE, "");
    c.cot_scrubs += 1;
  }

  // T2 — normalize concat artifacts.
  const t2before = out;
  out = normalizeConcatArtifacts(out);
  if (out !== t2before) c.concat_normalizations += 1;

  if (out !== before) c.strings_rewritten += 1;
  return out;
}

// ── Walker: touches ONLY string leaves under target-field keys ─────────
function walk(
  node: unknown,
  ledger: readonly FactRow[] | undefined,
  c: W23Counters,
  keyCtx?: string,
  inTarget = false,
): unknown {
  if (node == null) return node;
  if (typeof node === "string") {
    if (keyCtx && ANCHOR_KEYS.has(keyCtx)) return node;
    if (!inTarget) return node;
    c.strings_scanned += 1;
    return scrubTargetString(node, ledger, c);
  }
  if (Array.isArray(node)) {
    return node.map((v) => walk(v, ledger, c, keyCtx, inTarget));
  }
  if (typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k.startsWith("_")) { out[k] = v; continue; } // preserve _meta / _internal
      const childInTarget = inTarget || isTargetField(k);
      out[k] = walk(v, ledger, c, k, childInTarget);
    }
    return out;
  }
  return node;
}

// ── Counters ────────────────────────────────────────────────────────────
export interface W23Counters {
  strings_scanned: number;
  strings_rewritten: number;
  internal_note_scrubs: number;
  intake_supported_preserved: number;
  concat_normalizations: number;
  cot_scrubs: number;
}

const emptyCounters = (): W23Counters => ({
  strings_scanned: 0,
  strings_rewritten: 0,
  internal_note_scrubs: 0,
  intake_supported_preserved: 0,
  concat_normalizations: 0,
  cot_scrubs: 0,
});

export interface ApplyW23Options {
  intake?: Record<string, unknown> | null;
  ledger?: readonly FactRow[];
}

/**
 * Apply WAVE23-FIX TURN B to a risk report. Fail-open: on any error the
 * input report is returned unchanged and empty counters are returned so
 * telemetry still stamps.
 */
export function applyW23RiskTurnB(
  report: Record<string, unknown>,
  opts: ApplyW23Options = {},
): { counters: W23Counters; report: Record<string, unknown> } {
  const counters = emptyCounters();
  if (!report || typeof report !== "object") return { counters, report };
  try {
    const walked = walk(report, opts.ledger, counters) as Record<string, unknown>;
    return { counters, report: walked };
  } catch {
    return { counters, report };
  }
}
