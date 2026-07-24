// S-B INTAKE-FACT-LEDGER — shared enforcement service.
//
// Authoring turn (§2 item 16). Deterministic, post-generation grounding
// enforcement that complements TURN D2 reconciliation from the opposite
// direction:
//
//   D2 answers "did the report reconcile the intake?"  (positive
//   reconciliation of user-provided facts).
//   Fact-ledger answers "is every asserted client-fact supported by the
//   intake, on the SAME field, and does silence never masquerade as a
//   negative fact?"
//
// Blocks three empirical failure classes surfaced across waves 13/14:
//
//   d73f4d44 — cross-attribution: report cites value from field A but
//              anchors it to field B.
//   7bfb69fc — contradiction: report asserts X while intake denies X on
//              the same field (inverse of D2).
//   eefadb3f — fabricated negative: report states "no X is documented"
//              when the intake is SILENT on the topic (silence is not
//              denial; legal drafting standard).
//
// Design constraints (dispatch):
//   * FAIL-OPEN everywhere (any throw returns input unchanged);
//   * telemetry sequestered under `_meta.internal.fact_ledger` only —
//     never leak underscore-prefixed keys onto a customer surface
//     (TURN C1 strip compatibility);
//   * no prompt/rubric/contract loosening; no run-* wiring this turn.

export const FACT_LEDGER_VERSION = "sb-fl-w1-2026-07-24";

// ── Types ────────────────────────────────────────────────────────────────

export type FactPolarity = "asserted" | "denied" | "not_applicable" | "silent";

export interface FactRow {
  /** Dotted-path key (matches intake-contracts convention). */
  key: string;
  /** The originating intake field (== key at the outer level; retained
   *  separately so nested/aliased sources stay traceable). */
  source_field: string;
  /** Exact verbatim string as it appeared in the intake (or "" for
   *  silent/absent rows). */
  verbatim: string;
  /** Normalized value (string | boolean | array | null). */
  value: unknown;
  polarity: FactPolarity;
}

export interface Claim {
  text: string;
  /** Field the claim purports to speak about. When present, cross-
   *  attribution checks require the supporting fact to live on THIS field. */
  field?: string;
  direction: "positive" | "negative";
}

export interface CheckResult {
  ok: boolean;
  /** One of: "supported" | "silence_supports_negative" | "cross_attributed"
   *  | "contradicted" | "unresolved". */
  reason:
    | "supported"
    | "silence_supports_negative"
    | "cross_attributed"
    | "contradicted"
    | "unresolved";
  matchedFact?: FactRow;
}

export interface FactLedgerCounters {
  claims_scanned: number;
  claims_downgraded: number;
  negative_from_silence_blocked: number;
  cross_attribution_blocked: number;
  contradiction_blocked: number;
}

// ── Builder ──────────────────────────────────────────────────────────────

const DENIAL_PREFIXES = [/^no\b/i, /^none\b/i, /^never\b/i];
const NA_PREFIXES = [/^n\/?a\b/i, /^not\s+applicable\b/i];

function classifyPolarity(v: unknown): FactPolarity {
  if (v === null || v === undefined) return "silent";
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return "silent";
    if (NA_PREFIXES.some((r) => r.test(t))) return "not_applicable";
    if (DENIAL_PREFIXES.some((r) => r.test(t))) return "denied";
    if (/^false$/i.test(t)) return "denied";
    return "asserted";
  }
  if (typeof v === "boolean") return v ? "asserted" : "denied";
  if (Array.isArray(v)) return v.length === 0 ? "silent" : "asserted";
  if (typeof v === "object") {
    return Object.keys(v as object).length === 0 ? "silent" : "asserted";
  }
  return "asserted";
}

function verbatimOf(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

/** Enumerate every top-level intake field as a FactRow. Absent/blank
 *  fields become explicit `silent` rows so that later checks can prove
 *  "the intake is silent on X" rather than infer it from absence. */
export function buildFactLedger(
  rawIntake: Record<string, unknown> | null | undefined,
  normalizedIntake?: Record<string, unknown> | null,
): FactRow[] {
  try {
    const source = (normalizedIntake && typeof normalizedIntake === "object")
      ? normalizedIntake
      : (rawIntake && typeof rawIntake === "object" ? rawIntake : {});
    const keys = new Set<string>();
    if (rawIntake && typeof rawIntake === "object") {
      for (const k of Object.keys(rawIntake)) keys.add(k);
    }
    if (normalizedIntake && typeof normalizedIntake === "object") {
      for (const k of Object.keys(normalizedIntake)) keys.add(k);
    }
    const rows: FactRow[] = [];
    for (const k of Array.from(keys).sort()) {
      const v = (source as Record<string, unknown>)[k];
      rows.push({
        key: k,
        source_field: k,
        verbatim: verbatimOf(v),
        value: v ?? null,
        polarity: classifyPolarity(v),
      });
    }
    return rows;
  } catch {
    return [];
  }
}

// ── Assertion checker ────────────────────────────────────────────────────

export function checkAssertion(
  ledger: readonly FactRow[],
  claim: Claim,
): CheckResult {
  try {
    // Cross-attribution / silence rules require a stated field.
    if (claim.field) {
      const onField = ledger.find((r) => r.key === claim.field);
      if (claim.direction === "negative") {
        // Silence never supports a negative assertion.
        if (!onField || onField.polarity === "silent") {
          return { reason: "silence_supports_negative", ok: false };
        }
        if (onField.polarity === "denied" || onField.polarity === "not_applicable") {
          return { reason: "supported", ok: true, matchedFact: onField };
        }
        // Field asserts a value → negative claim contradicts it.
        return { reason: "contradicted", ok: false, matchedFact: onField };
      }
      // Positive claim
      if (!onField || onField.polarity === "silent") {
        return { reason: "unresolved", ok: false };
      }
      if (onField.polarity === "denied" || onField.polarity === "not_applicable") {
        return { reason: "contradicted", ok: false, matchedFact: onField };
      }
      // Guard cross-attribution: some other field asserts a value that
      // looks like the claim, but this field itself is silent/denied.
      return { reason: "supported", ok: true, matchedFact: onField };
    }
    // No field named → treat as unresolved for negatives (silence never
    // supports); positives without a field are advisory.
    if (claim.direction === "negative") {
      return { reason: "silence_supports_negative", ok: false };
    }
    return { reason: "unresolved", ok: false };
  } catch {
    return { reason: "unresolved", ok: false };
  }
}

/** Detect cross-attribution: claim purports value V on field F, but F is
 *  silent/denied/na while some OTHER field G carries V verbatim. */
export function detectCrossAttribution(
  ledger: readonly FactRow[],
  claim: Claim,
  needle: string,
): FactRow | null {
  try {
    if (!claim.field || !needle) return null;
    const onField = ledger.find((r) => r.key === claim.field);
    if (onField && onField.polarity === "asserted") return null;
    const n = needle.toLowerCase();
    for (const r of ledger) {
      if (r.key === claim.field) continue;
      if (r.polarity !== "asserted") continue;
      if (r.verbatim && r.verbatim.toLowerCase().includes(n)) return r;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Rewrite phrasing (consistent with TURN D2 reconciliation) ────────────

export function rewriteUnsupported(claimText: string, fact?: FactRow): string {
  try {
    const t = (claimText || "").trim();
    if (fact && (fact.polarity === "denied" || fact.polarity === "not_applicable")) {
      return `The intake states "${fact.verbatim}" (${fact.source_field}); the statement that ${t} is not supported by the intake and must be reconciled.`;
    }
    if (fact && fact.polarity === "asserted") {
      return `The intake records "${fact.verbatim}" on ${fact.source_field}, which does not support the statement that ${t}; this must be reconciled.`;
    }
    // Silent / unresolved
    return `The intake does not address ${t}; this must be confirmed rather than asserted.`;
  } catch {
    return claimText;
  }
}

// ── Pre-emit walker ──────────────────────────────────────────────────────
//
// Fail-open surface enforcement. Callers (later wiring turns) will pass
// structured claims tied to report surfaces. This turn provides the
// telemetry scaffold and the walker discipline; substantive claim
// extraction lives in the tool-specific wiring turn.

export interface EnforceInput {
  /** Structured claims already extracted upstream, each tied to the
   *  surface path they came from. */
  claims?: Array<Claim & { surfacePath?: string; needle?: string }>;
}

function newCounters(): FactLedgerCounters {
  return {
    claims_scanned: 0,
    claims_downgraded: 0,
    negative_from_silence_blocked: 0,
    cross_attribution_blocked: 0,
    contradiction_blocked: 0,
  };
}

function ensureInternal(report: Record<string, unknown>): Record<string, unknown> {
  const meta = (report._meta && typeof report._meta === "object")
    ? report._meta as Record<string, unknown>
    : (report._meta = {} as Record<string, unknown>);
  const internal = (meta.internal && typeof meta.internal === "object")
    ? meta.internal as Record<string, unknown>
    : (meta.internal = {} as Record<string, unknown>);
  return internal;
}

export interface EnforceResult {
  counters: FactLedgerCounters;
  rewrites: Array<{ surfacePath?: string; from: string; to: string; reason: CheckResult["reason"] }>;
}

/** Fail-open enforcement. Walks provided claims, records what would be
 *  blocked/rewritten, and sequesters telemetry under
 *  `_meta.internal.fact_ledger`. Any throw returns the input unchanged. */
export function enforceLedger(
  report: unknown,
  ledger: readonly FactRow[],
  input: EnforceInput = {},
): EnforceResult {
  const counters = newCounters();
  const rewrites: EnforceResult["rewrites"] = [];
  try {
    if (!report || typeof report !== "object") return { counters, rewrites };
    const r = report as Record<string, unknown>;
    const claims = Array.isArray(input.claims) ? input.claims : [];
    for (const c of claims) {
      counters.claims_scanned += 1;
      try {
        // Cross-attribution takes precedence when a needle is present.
        if (c.needle) {
          const cross = detectCrossAttribution(ledger, c, c.needle);
          if (cross) {
            counters.cross_attribution_blocked += 1;
            counters.claims_downgraded += 1;
            rewrites.push({
              surfacePath: c.surfacePath,
              from: c.text,
              to: rewriteUnsupported(c.text, cross),
              reason: "cross_attributed",
            });
            continue;
          }
        }
        const res = checkAssertion(ledger, c);
        if (res.ok) continue;
        if (res.reason === "silence_supports_negative") {
          counters.negative_from_silence_blocked += 1;
        } else if (res.reason === "contradicted") {
          counters.contradiction_blocked += 1;
        }
        counters.claims_downgraded += 1;
        rewrites.push({
          surfacePath: c.surfacePath,
          from: c.text,
          to: rewriteUnsupported(c.text, res.matchedFact),
          reason: res.reason,
        });
      } catch { /* fail-open per claim */ }
    }
    // Sequester telemetry under _meta.internal.fact_ledger only.
    try {
      const internal = ensureInternal(r);
      internal.fact_ledger = {
        version: FACT_LEDGER_VERSION,
        ledger_rows: ledger.length,
        ...counters,
      };
    } catch { /* fail-open */ }
    return { counters, rewrites };
  } catch {
    return { counters, rewrites };
  }
}
