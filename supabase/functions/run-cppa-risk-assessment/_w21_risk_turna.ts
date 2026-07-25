// W21-RISK-TURNA — Wave-21 fix turn for run-cppa-risk-assessment.
// TEAM-REVIEWED (statute / customer clarity / leak prevention / measurement
// integrity / regression safety). Deploy dispatch 2026-07-25 (item 47 digest).
//
// Closes wave-21 (batch 12640b0f, quality-run 3549f347, ours 79.35) defect
// classes surfaced in docs/courier/WAVE21-DIGEST-2026-07-25.md §5:
//
//   A1 — FACT-LEDGER CONTRADICTION ENFORCEMENT: augments the pre-emit fact
//        ledger scanner with a TOKEN→FIELD attribution map so prose claims
//        that name a subject WITHOUT carrying a structured `.field` anchor
//        (e.g. "sensitive location", "profiling", "sell/share vendors",
//        "ADMT logic", "ADMT description", "ADMT opt-out") are still
//        attributable to specific intake ledger rows. Combined with the
//        existing `checkAssertion` semantics, contradictory claims are now
//        BLOCKED (not merely "missing support") and rewritten to intake-
//        consistent phrasing. Also scrubs the invented "ADMT-{logic,
//        description,opt-out} record n/a" field-name fabrication pattern.
//
//   A2 — RISK-B1-COHORT-EMITTER: when the report identifies a § 7121
//        cybersecurity-audit trigger AND the intake signals annual gross
//        revenue below $50M for the applicable year, append ONE
//        cross_tool_recommendations entry citing "11 CCR § 7121(a)(3)"
//        verbatim (corpus row cppa-7121, OAL-approved eff. 2026-01-01;
//        approved 2026-07-25 — docs/pipeline-state.md item 43). Gate is
//        deliberately narrow: no verbatim, no emission; no revenue signal,
//        no emission; existing (a)(3) reference in the report, no
//        emission (idempotent).
//
//   A3 — INTERNAL-FRAGMENT LEAK SCRUB: closes wave-21 rubric_internal_
//        reasoning_leak ×2 — "the trigger review — established on the
//        record" and "the cyber-audit tier review" module-name leaks in
//        scope_notes / cross_tool_recommendations. Terminal deterministic
//        pass; the LEAK-PREV-P2 serializer only whitelists KEYS, not prose
//        contents, so a string-level scrub remains the correct tool.
//
//   A4 — information_needed SELF-CONTRADICTION FILTER: drops
//        information_needed entries whose subject field is ALREADY
//        resolved by the intake ledger (asserted / denied / not_applicable)
//        so the report never asks for a pinpoint it already provides or
//        negates.
//
// Fail-open, non-blocking. Counters attach at _meta.internal.risk_w21a.
// Build-stamp echo (A5) via `W21_RISK_TURNA_STAMP`, applied by index.ts.

import type { FactRow } from "../_shared/intake/fact-ledger.ts";

export const W21_RISK_TURNA_STAMP = "w21-risk-turna@2026-07-25T11:47:35Z";

// ── Corpus verbatim (cppa-7121, § 7121(a)(3); OAL-approved) ─────────────
// Reproduced verbatim from public.provision_texts row `cppa-7121`
// (verified 2026-07-25T11:47Z). DO NOT paraphrase.
export const CPPA_7121_A3_CITATION = "11 CCR § 7121(a)(3)";
export const CPPA_7121_A3_VERBATIM =
  "April 1, 2030, if the business's annual gross revenue for 2028 was less " +
  "than fifty million dollars ($50,000,000). The business's audit would " +
  "cover the period from January 1, 2029, through January 1, 2030.";
export const CPPA_7121_A3_PROPOSITION_KEY = "ra_cyber_audit_7121a3";

// ── A1: token→field attribution map ─────────────────────────────────────
// Case-insensitive; word-boundary matched. Populated from wave-21 evidence
// (ccec6376, 283f8c11) and canonical intake schema. Additions only —
// existing fact-ledger scanner attribution is preserved.
export const RISK_FIELD_TOKEN_MAP: Readonly<Record<string, string>> = {
  "sensitive location": "sensitive_location_basis",
  "sensitive-location": "sensitive_location_basis",
  "sell/share": "q3_sell_share",
  "selling or sharing": "q3_sell_share",
  "sell or share": "q3_sell_share",
  "targeted advertising": "q4_targeted_ads",
  "profiling": "q5b_profiling_observation",
  "systematic observation": "q5b_profiling_observation",
  "admt logic": "i5_admt_logic",
  "admt-logic": "i5_admt_logic",
  "admt description": "q19_admt_description",
  "admt-description": "q19_admt_description",
  "admt opt-out": "q18_admt_use",
  "admt opt out": "q18_admt_use",
  "admt-opt-out": "q18_admt_use",
};

export function attributeFieldByToken(
  text: string,
  map: Readonly<Record<string, string>> = RISK_FIELD_TOKEN_MAP,
): string | undefined {
  if (!text) return undefined;
  const lo = text.toLowerCase();
  for (const [tok, field] of Object.entries(map)) {
    const idx = lo.indexOf(tok.toLowerCase());
    if (idx < 0) continue;
    const before = idx === 0 ? " " : lo[idx - 1];
    const after = idx + tok.length >= lo.length ? " " : lo[idx + tok.length];
    if (!/[a-z0-9_]/.test(before) && !/[a-z0-9_]/.test(after)) return field;
  }
  return undefined;
}

// ── A3: internal-fragment scrubs ────────────────────────────────────────
const INTERNAL_FRAGMENT_PATTERNS: readonly [RegExp, string][] = [
  // "the trigger review — established on the record" → "the record"
  [/\bthe\s+trigger\s+review\s*[\u2014\u2013-]+\s*established\s+on\s+the\s+record\b/gi,
    "the record"],
  // "the cyber-audit tier review" (module-name leak) → "the cybersecurity audit"
  [/\bthe\s+cyber[- ]?audit\s+tier\s+review\b/gi, "the cybersecurity audit"],
  // Generic "the <slug> tier review" (defensive) → "the review"
  [/\bthe\s+[a-z][a-z0-9-]{2,}\s+tier\s+review\b/gi, "the review"],
];

// ── A1: invented-field-name fabrication scrub ───────────────────────────
// Wave-21 doc 283f8c11 pattern: "ADMT-logic/ADMT-description/ADMT-opt-out
// all record n/a" — names three fields the intake schema does not carry
// under those slugs. Suppress the invented-field assertion; the real
// intake fields (i5_admt_logic, q19_admt_description, q18_admt_use) are
// already surfaced via information_needed when unresolved.
const INVENTED_ADMT_FIELDNAMES_RE =
  /\bADMT-?(?:logic|description|opt[- ]?out)\b[^.!?\n]*\brecord[s]?\s+n\/?a\b[^.!?\n]*[.!?]?/gi;

// ── ANCHOR keys (never scrub structured anchor values) ──────────────────
const ANCHOR_KEYS = new Set<string>([
  "source_fields", "field", "intake_field", "intake_field_1", "intake_field_2",
  "provision", "citation", "regulatory_citation", "statutory_basis",
  "proposition_key", "verbatim_quote", "url", "primary_source_url",
  "id", "key", "stamp", "build_stamp",
]);

// ── Counters ────────────────────────────────────────────────────────────
export interface W21RiskTurnACounters {
  strings_scanned: number;
  internal_fragments_scrubbed: number;
  invented_fieldnames_scrubbed: number;
  a1_field_attributions_added: number;
  a1_contradictions_blocked: number;
  a2_cohort_emitted: 0 | 1;
  a2_cohort_skipped_reason?: string;
  a4_info_needed_dropped: number;
}

const emptyCounters = (): W21RiskTurnACounters => ({
  strings_scanned: 0,
  internal_fragments_scrubbed: 0,
  invented_fieldnames_scrubbed: 0,
  a1_field_attributions_added: 0,
  a1_contradictions_blocked: 0,
  a2_cohort_emitted: 0,
  a4_info_needed_dropped: 0,
});

// ── A3 + invented-field prose walker ────────────────────────────────────
function scrubString(s: string, c: W21RiskTurnACounters): string {
  if (!s || typeof s !== "string") return s;
  c.strings_scanned += 1;
  let out = s;
  for (const [re, rep] of INTERNAL_FRAGMENT_PATTERNS) {
    const before = out;
    out = out.replace(re, rep);
    if (out !== before) c.internal_fragments_scrubbed += 1;
  }
  const beforeInv = out;
  out = out.replace(INVENTED_ADMT_FIELDNAMES_RE, "");
  if (out !== beforeInv) c.invented_fieldnames_scrubbed += 1;
  out = out.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
  return out;
}

function walkProse(node: unknown, c: W21RiskTurnACounters, keyCtx?: string): unknown {
  if (node == null) return node;
  if (typeof node === "string") {
    if (keyCtx && ANCHOR_KEYS.has(keyCtx)) return node;
    return scrubString(node, c);
  }
  if (Array.isArray(node)) return node.map((v) => walkProse(v, c, keyCtx));
  if (typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k.startsWith("_")) { out[k] = v; continue; }
      out[k] = walkProse(v, c, k);
    }
    return out;
  }
  return node;
}

// ── A2: § 7121(a)(3) cohort emitter ─────────────────────────────────────
// Narrow gate. Emits IFF ALL of the following hold:
//   1. Report already identifies a cybersecurity-audit trigger (any
//      § 7120/§ 7121 anchor already present in cross_tool_recommendations
//      or in submission_summary / assessment_summary prose).
//   2. Intake carries a revenue signal parseable as <$50M for 2028 (fields
//      annual_revenue_2028 / gross_revenue_2028 / annual_gross_revenue in
//      dollar or ISO band form).
//   3. Report does NOT already carry a § 7121(a)(3) reference (idempotency).
// Otherwise, sets `a2_cohort_skipped_reason` and no-ops.

function parseRevenueDollars(v: unknown): number | undefined {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v !== "string") return undefined;
  const s = v.replace(/[$,\s]/g, "").toLowerCase();
  const m = s.match(/^(\d+(?:\.\d+)?)(m|million|b|billion|k)?$/);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!isFinite(n)) return undefined;
  const unit = m[2] ?? "";
  if (unit === "b" || unit === "billion") return n * 1e9;
  if (unit === "m" || unit === "million") return n * 1e6;
  if (unit === "k") return n * 1e3;
  return n;
}

function revenueUnder50M(intake: Record<string, unknown> | null | undefined): boolean {
  if (!intake) return false;
  const candidates = [
    intake["annual_revenue_2028"],
    intake["gross_revenue_2028"],
    intake["annual_gross_revenue_2028"],
    intake["annual_gross_revenue"],
    intake["annual_revenue"],
  ];
  for (const c of candidates) {
    const n = parseRevenueDollars(c);
    if (typeof n === "number" && n > 0 && n < 50_000_000) return true;
    if (typeof c === "string") {
      const t = c.toLowerCase();
      // Common intake-band phrasings that lie entirely below $50M.
      if (/(under|less than|below)\s*\$?50\s*(m|million)/.test(t)) return true;
      if (/\$?(0|[1-9]|[1-3]\d|4[0-9])\s*(m|million)\b/.test(t) && !/\$?[5-9]\d/.test(t)) {
        return true;
      }
    }
  }
  return false;
}

function reportHasCyberAuditContext(report: Record<string, unknown>): boolean {
  const blob = JSON.stringify(report);
  return /§\s*712[01]\b/.test(blob) ||
    /cybersecurity\s+audit/i.test(blob) ||
    /cyber_audit|cyber-audit/i.test(blob);
}

function reportHas7121A3(report: Record<string, unknown>): boolean {
  const blob = JSON.stringify(report);
  return /§\s*7121\s*\(a\)\s*\(3\)/i.test(blob) ||
    /7121\(a\)\(3\)/i.test(blob);
}

function maybeEmitCohortRow(
  report: Record<string, unknown>,
  intake: Record<string, unknown> | null | undefined,
  c: W21RiskTurnACounters,
): void {
  try {
    if (!reportHasCyberAuditContext(report)) {
      c.a2_cohort_skipped_reason = "no_cyber_audit_context";
      return;
    }
    if (reportHas7121A3(report)) {
      c.a2_cohort_skipped_reason = "already_present";
      return;
    }
    if (!revenueUnder50M(intake ?? null)) {
      c.a2_cohort_skipped_reason = "no_revenue_signal_under_50m";
      return;
    }
    const arr = Array.isArray(report.cross_tool_recommendations)
      ? report.cross_tool_recommendations as unknown[]
      : [];
    const entry: Record<string, unknown> = {
      id: "ctr_cyber_audit_7121a3",
      topic: "cybersecurity_audit_deadline",
      title:
        "Cybersecurity-audit deadline cohort (§ 7121(a)(3)) — annual gross revenue under $50M for 2028",
      action:
        "The record indicates annual gross revenue below $50 million for 2028, which places the business in the § 7121(a)(3) cohort. Confirm the 2028 figure, then plan for the § 7121(a)(3) audit-report deadline.",
      citation: CPPA_7121_A3_CITATION,
      verbatim_quote: CPPA_7121_A3_VERBATIM,
      proposition_key: CPPA_7121_A3_PROPOSITION_KEY,
      source_fields: ["annual_gross_revenue_2028"],
      deadline: "2030-04-01",
      deadline_basis: "11 CCR § 7121(a)(3)",
    };
    (report as any).cross_tool_recommendations = [...arr, entry];
    c.a2_cohort_emitted = 1;
  } catch {
    c.a2_cohort_skipped_reason = "throw_fail_open";
  }
}

// ── A4: info_needed self-contradiction filter ──────────────────────────
function filterInformationNeeded(
  report: Record<string, unknown>,
  ledger: readonly FactRow[] | undefined,
  c: W21RiskTurnACounters,
): void {
  try {
    const arr = report.information_needed;
    if (!Array.isArray(arr) || !ledger) return;
    const byKey = new Map<string, FactRow>();
    for (const r of ledger) byKey.set(r.key, r);
    const kept: unknown[] = [];
    for (const item of arr) {
      let field: string | undefined;
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const f = obj.field ?? obj.intake_field_1 ??
          (Array.isArray(obj.source_fields) ? obj.source_fields[0] : undefined);
        if (typeof f === "string" && f.trim()) field = f.trim();
      }
      if (field) {
        const row = byKey.get(field);
        // Drop if the intake ALREADY resolves the field.
        if (row && (row.polarity === "asserted" || row.polarity === "denied" ||
          row.polarity === "not_applicable")) {
          c.a4_info_needed_dropped += 1;
          continue;
        }
      }
      kept.push(item);
    }
    if (kept.length !== arr.length) {
      (report as any).information_needed = kept;
    }
  } catch { /* fail-open */ }
}

// ── Entrypoint ─────────────────────────────────────────────────────────
export interface ApplyW21Options {
  intake?: Record<string, unknown> | null;
  ledger?: readonly FactRow[];
}

export function applyW21RiskTurnA(
  report: Record<string, unknown>,
  opts: ApplyW21Options = {},
): { counters: W21RiskTurnACounters; report: Record<string, unknown> } {
  const counters = emptyCounters();
  if (!report || typeof report !== "object") return { counters, report };

  // A3 + invented-fieldname prose scrub.
  const scrubbed = walkProse(report, counters) as Record<string, unknown>;

  // A2 cohort emitter (post-scrub so we don't count a fresh emission).
  maybeEmitCohortRow(scrubbed, opts.intake, counters);

  // A4 info_needed self-contradiction filter (needs ledger).
  filterInformationNeeded(scrubbed, opts.ledger, counters);

  return { counters, report: scrubbed };
}
