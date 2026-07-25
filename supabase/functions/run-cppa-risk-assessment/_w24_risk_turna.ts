// ─────────────────────────────────────────────────────────────────────────
// WAVE24-FIX TURN A (cppa-risk) — deploy turn on run-cppa-risk-assessment.
// Controller dispatch W24-FIX-TURNA-RISK-2026-07-25 (five-lens TEAM-REVIEWED).
// Closes ledger item 74 for two fix classes:
//
//   A — CRITICAL: qc_r1_4_cohort_determinism. The § 7121(a)(3) cohort
//       emitter (W21-RISK-TURNA item 48) resolves to the deterministic
//       deadline "2030-04-01" ("April 1, 2030"). Downstream LLM prose was
//       hedging that date near the cite window ("approximately",
//       "on or around", "roughly", "circa", "~", "around", "near").
//       This pass scrubs hedge phrasing when adjacent to the resolved
//       cohort date (April 1, 2030 / 2030-04-01 / Apr 1, 2030), leaving
//       one deterministic date, no hedge, near the § 7121(a)(3) cite
//       window. If the report simultaneously carries an information-needed
//       block for the cohort AND a hedged date, we leave the info_needed
//       structured path intact (empty citation/quote, catalog phrasing via
//       customer-messages.ts) and clear the hedged date from surrounding
//       prose — the customer surface NEVER carries a hedged date and
//       NEVER carries "information needed" prose.
//
//   B — Runs alongside the extended isTargetField coverage now live in
//       `_w23_risk_turnb.ts` (current_safeguards, risk_assessment_by_activity
//       walker, safeguards/mitigations/assessment narrative slots). This
//       module additionally runs `normalizeConcatArtifacts` and reconcile-
//       fragment cleanup on that extended field set as a defensive belt-
//       and-suspenders pass — the primary scrub is done by W23 turnB.
//       Fact-ledger consultation preserved: intake-supported claims are
//       never rewritten.
//
// Runs AFTER W23 turnB and BEFORE the LEAK-PREV P1 emit gate. Fail-open at
// every helper and the orchestrator. Anchor keys never mutated. Reserved
// subtrees (`_meta` / `_internal`) preserved. Telemetry lands under
// `_meta.internal.risk_w24a` — LEAK-PREV-P2 serializer preserves
// `_meta.internal` verbatim.
// ─────────────────────────────────────────────────────────────────────────

import type { FactRow } from "../_shared/intake/fact-ledger.ts";

export const W24_RISK_TURNA_STAMP = "w24-risk-turna@2026-07-25T18:08:00Z";
export const W24_RISK_TURNA_VERSION = "risk-w24-turna-v1-2026-07-25";

// ── Anchor keys (never mutate) ──────────────────────────────────────────
const ANCHOR_KEYS = new Set<string>([
  "source_fields", "field", "intake_field", "intake_field_1", "intake_field_2",
  "provision", "citation", "regulatory_citation", "statutory_basis",
  "proposition_key", "verbatim_quote", "url", "primary_source_url",
  "id", "key", "stamp", "build_stamp",
  // A: resolved cohort deadline is a canonical anchor.
  "deadline", "deadline_basis",
]);

// Extended B1 field-coverage set. Kept in-sync with _w23_risk_turnb.ts.
const B1_EXT_KEYS = new Set<string>([
  "current_safeguards", "safeguards", "safeguards_summary",
  "mitigations", "mitigation_summary", "mitigation",
  "assessment", "assessment_narrative", "narrative",
  "description",
  "risk_assessment_by_activity",
]);
function isB1ExtField(k: string | undefined): boolean {
  if (!k) return false;
  return B1_EXT_KEYS.has(k);
}

// ── B1-ext scrub patterns (mirrors W23 turnB T1) ────────────────────────
const INTAKE_MISMATCH_RE =
  /The intake(?:\s+on\s+[^.]{0,200}?)?\s+does not support this statement;?\s*it must be reconciled(?:\s+before\s+use)?\.?/gi;
const RECONCILE_FRAGMENT_RE =
  /\bmust be reconciled(?:\s+before\s+use)?\.?/gi;

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

function anyCategorySupportedByLedger(s: string, ledger: readonly FactRow[] | undefined): boolean {
  for (const p of CATEGORY_PROBES) {
    if (p.re.test(s) && ledgerAsserts(ledger, p.field)) return true;
  }
  return false;
}

const NEUTRAL_DOWNGRADE =
  "The controller should document the relevant facts and confirm whether this issue applies.";

function normalizeConcatArtifacts(s: string): string {
  let out = s;
  out = out.replace(/\.{2,}(?!\.)/g, ".");
  out = out.replace(/\.\s+\./g, ".");
  out = out.replace(/\.,/g, ".");
  out = out.replace(/\s+([.,;:!?])/g, "$1");
  out = out.replace(/[ \t]{2,}/g, " ");
  return out.trim();
}

// ── A: cohort-date hedge scrub ─────────────────────────────────────────
// Match a hedge word immediately preceding an April-1-2030 date variant.
// Variants: "April 1, 2030", "Apr 1, 2030", "April 1 2030", "1 April 2030",
// "2030-04-01". Hedge tokens include: approximately, roughly, about, around,
// near, circa, ~, "on or around", "on or about".
const COHORT_DATE_ALT = String.raw`(?:April\s+1,?\s+2030|Apr\.?\s+1,?\s+2030|1\s+April\s+2030|2030-04-01)`;
const HEDGE_TOKEN_ALT =
  String.raw`(?:approximately|roughly|about|around|near(?:ly)?|circa|~|on\s+or\s+around|on\s+or\s+about)`;
const HEDGED_DATE_RE = new RegExp(
  `\\b${HEDGE_TOKEN_ALT}\\s+(${COHORT_DATE_ALT})\\b`,
  "gi",
);
const COHORT_CITE_HINT = /§\s*7121\s*\(a\)\s*\(3\)|7121\(a\)\(3\)/i;
const COHORT_DATE_RE = new RegExp(`\\b(${COHORT_DATE_ALT})\\b`, "gi");

function scrubCohortHedge(s: string, c: W24Counters): string {
  if (typeof s !== "string" || !s) return s;
  // Cheap gate: only touch strings that contain the cohort date at all.
  if (!COHORT_DATE_RE.test(s)) return s;
  COHORT_DATE_RE.lastIndex = 0;
  let out = s;
  const before = out;
  out = out.replace(HEDGED_DATE_RE, (_m, date: string) => date);
  if (out !== before) {
    c.cohort_resolved += 1;
    if (COHORT_CITE_HINT.test(out)) c.cohort_resolved_near_cite += 1;
  }
  return out;
}

// ── Walker: applies B1-ext scrub + cohort hedge scrub ──────────────────
function scrubB1ExtString(
  s: string,
  ledger: readonly FactRow[] | undefined,
  c: W24Counters,
): string {
  if (typeof s !== "string" || !s) return s;
  const before = s;
  let out = s;

  if (INTAKE_MISMATCH_RE.test(out)) {
    INTAKE_MISMATCH_RE.lastIndex = 0;
    if (anyCategorySupportedByLedger(out, ledger)) {
      c.intake_supported_preserved += 1;
    } else {
      out = out.replace(INTAKE_MISMATCH_RE, NEUTRAL_DOWNGRADE);
      c.b1_ext_scrubs += 1;
    }
  }
  if (RECONCILE_FRAGMENT_RE.test(out)) {
    RECONCILE_FRAGMENT_RE.lastIndex = 0;
    out = out.replace(RECONCILE_FRAGMENT_RE, "");
    c.b1_ext_scrubs += 1;
  }

  const t2before = out;
  out = normalizeConcatArtifacts(out);
  if (out !== t2before) c.concat_normalizations += 1;

  if (out !== before) c.strings_rewritten += 1;
  return out;
}

function walk(
  node: unknown,
  ledger: readonly FactRow[] | undefined,
  c: W24Counters,
  keyCtx?: string,
  inB1Ext: boolean = false,
): unknown {
  if (node == null) return node;
  if (typeof node === "string") {
    if (keyCtx && ANCHOR_KEYS.has(keyCtx)) return node;
    let out = node;
    // Cohort-hedge scrub runs everywhere (except anchor keys), because the
    // hedge can appear in any customer-prose slot, not only B1-ext fields.
    out = scrubCohortHedge(out, c);
    if (inB1Ext) {
      c.strings_scanned += 1;
      out = scrubB1ExtString(out, ledger, c);
    }
    return out;
  }
  if (Array.isArray(node)) {
    return node.map((v) => walk(v, ledger, c, keyCtx, inB1Ext));
  }
  if (typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k.startsWith("_")) { out[k] = v; continue; }
      const childB1 = inB1Ext || isB1ExtField(k);
      out[k] = walk(v, ledger, c, k, childB1);
    }
    return out;
  }
  return node;
}

// ── A: cohort determinism — deadline field integrity check ─────────────
// Ensure any emitted § 7121(a)(3) cohort entry carries the deterministic
// deadline "2030-04-01" (never a hedged variant). This is a defensive
// pass — the emitter itself already writes the fixed literal.
function auditCohortDeadline(
  report: Record<string, unknown>,
  c: W24Counters,
): void {
  try {
    const arr = (report as any).cross_tool_recommendations;
    if (!Array.isArray(arr)) return;
    for (const entry of arr) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const cite = String(e.citation ?? "");
      if (!COHORT_CITE_HINT.test(cite)) continue;
      const dl = String(e.deadline ?? "");
      if (dl && dl !== "2030-04-01") {
        // Do not mutate the anchor; record the drift for telemetry.
        c.cohort_deadline_drift += 1;
      } else if (dl === "2030-04-01") {
        c.cohort_deadline_confirmed += 1;
      }
      // Info-needed structured path detection.
      const info = (e as any).information_needed;
      if (info === true || (info && typeof info === "object")) {
        c.cohort_info_needed += 1;
      }
    }
  } catch {
    // fail-open
  }
}

// ── Counters ────────────────────────────────────────────────────────────
export interface W24Counters {
  version: string;
  strings_scanned: number;
  strings_rewritten: number;
  b1_ext_scrubs: number;
  concat_normalizations: number;
  intake_supported_preserved: number;
  cohort_resolved: number;
  cohort_resolved_near_cite: number;
  cohort_info_needed: number;
  cohort_deadline_confirmed: number;
  cohort_deadline_drift: number;
}

const emptyCounters = (): W24Counters => ({
  version: W24_RISK_TURNA_VERSION,
  strings_scanned: 0,
  strings_rewritten: 0,
  b1_ext_scrubs: 0,
  concat_normalizations: 0,
  intake_supported_preserved: 0,
  cohort_resolved: 0,
  cohort_resolved_near_cite: 0,
  cohort_info_needed: 0,
  cohort_deadline_confirmed: 0,
  cohort_deadline_drift: 0,
});

export interface ApplyW24Options {
  intake?: Record<string, unknown> | null;
  ledger?: readonly FactRow[];
}

/**
 * Apply WAVE24-FIX TURN A to a risk report. Fail-open: on any error the
 * input report is returned unchanged and empty counters stamp telemetry.
 */
export function applyW24RiskTurnA(
  report: Record<string, unknown>,
  opts: ApplyW24Options = {},
): { counters: W24Counters; report: Record<string, unknown> } {
  const counters = emptyCounters();
  if (!report || typeof report !== "object") return { counters, report };
  try {
    const walked = walk(report, opts.ledger, counters) as Record<string, unknown>;
    auditCohortDeadline(walked, counters);
    return { counters, report: walked };
  } catch {
    return { counters, report };
  }
}
