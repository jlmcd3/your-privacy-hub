// S-B INTAKE-FACT-LEDGER — shared enforcement service.
//
// v1 (sb-fl-w1-2026-07-24): initial authoring turn (§2 item 16). Wired
// into run-cppa-{risk,admt,cyber} 2026-07-24 23:20–23:42Z.
//
// v2 (sb-fl-w2-2026-07-25) — FACT-LEDGER-W16-HOTFIX:
//   Wave-16 telemetry (cppa_assessments _meta.internal.fact_ledger)
//   proved that v1 misfired identically in all three CPPA generators:
//   `claims_downgraded == claims_scanned` on every run (3/3, 3/3, 7/7,
//   27/27). Two root causes:
//
//     (a) MATCHER treated any claim with an unresolvable `field`
//         (missing OR not present in the ledger) as evidence AGAINST
//         the claim. In practice, wiring layers extract `field` from
//         `o.intake_field_1`/`o.source_fields` — which are almost
//         never set — so `claim.field` is undefined. `checkAssertion`
//         then returned `{ ok: false, reason: "unresolved" }` for
//         positives and `{ ok: false, reason: "silence_supports_negative" }`
//         for negatives, and `enforceLedger` rewrote the claim. This
//         inverted the rule ("silence about a field is not evidence
//         against a claim about that field") into a per-report
//         demolition. v2 treats missing-field / missing-ledger-row as
//         SKIP; only explicit ledger outcomes can downgrade.
//
//     (b) LEDGER BUILD only iterated TOP-LEVEL intake keys. Cyber's
//         `intake_data` shape (controls[], scoping[], etc.) produced
//         `ledger_rows = 2` — starving the matcher of the very rows
//         needed to prove support for controls like "MFA via Okta".
//         v2 flattens nested objects/arrays to dotted paths.
//
//   Additional v2 hardening:
//     - REWRITE TEXT: never prepends the caveat template onto the
//       full original claim; produces a short answer-first sentence
//       (REPORT FLOW rule) referencing the resolved intake field.
//     - SAFETY VALVE: for real production runs (≥3 claims), if the
//       ledger has fewer than 5 rows OR the would-be downgrade rate
//       exceeds 50 %, enforcement is skipped entirely. Guarantees a
//       matcher fault can never again rewrite an entire report.
//       Telemetry records `enforcement_skipped_reason` and the raw
//       counts under `_meta.internal.fact_ledger`.
//     - Telemetry additions: `match_path` counters (`resolved`,
//       `skipped_no_field`, `skipped_field_unknown`, `skipped_silent_positive`)
//       stay under `_meta.internal.fact_ledger`. TURN C1 leak-guard
//       compatible — no customer-surface keys are added.
//
//   FAIL-OPEN everywhere: any throw returns input unchanged.

export const FACT_LEDGER_VERSION = "sb-fl-w2-2026-07-25";

// Safety-valve triggers only in production-scale runs. Single-claim
// unit tests (isolated matcher semantics) are unaffected. The wave-16
// misfires were all ≥3 claims; every wave-16 evidence class is caught
// at this threshold.
const SAFETY_VALVE_MIN_CLAIMS = 3;
const SAFETY_VALVE_MIN_LEDGER_ROWS = 5;
const SAFETY_VALVE_MAX_DOWNGRADE_RATE = 0.5;

// ── Types ────────────────────────────────────────────────────────────────

export type FactPolarity = "asserted" | "denied" | "not_applicable" | "silent";

export interface FactRow {
  /** Dotted-path key (matches intake-contracts convention; nested paths
   *  use `.` and array indices use `[n]`, e.g. `controls[0].status`). */
  key: string;
  /** The originating intake field. Equal to `key` for flattened rows;
   *  retained separately for downstream traceability. */
  source_field: string;
  /** Exact verbatim string as it appeared in the intake (or "" for
   *  silent/absent rows). */
  verbatim: string;
  /** Normalized value (string | boolean | array | object | null). */
  value: unknown;
  polarity: FactPolarity;
}

export interface Claim {
  text: string;
  /** Field the claim purports to speak about. When present, cross-
   *  attribution checks require the supporting fact to live on THIS
   *  field. When absent OR not present in the ledger, the claim is
   *  SKIPPED (v2 rule — silence is never evidence against). */
  field?: string;
  direction: "positive" | "negative";
}

export interface CheckResult {
  ok: boolean;
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
  // v2 match-path telemetry.
  skipped_no_field: number;
  skipped_field_unknown: number;
  skipped_silent_positive: number;
  supported: number;
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
  try { return JSON.stringify(v); } catch { return String(v); }
}

/** Recursively flatten nested objects/arrays into dotted-path entries.
 *  We record BOTH the container (as an asserted row) and every leaf
 *  child. This lets the matcher answer both "does the intake have
 *  controls at all?" and "what is controls[3].status?". */
function flattenInto(obj: unknown, prefix: string, out: Map<string, unknown>): void {
  if (obj === null || obj === undefined) {
    if (prefix) out.set(prefix, obj);
    return;
  }
  if (typeof obj !== "object") {
    if (prefix) out.set(prefix, obj);
    return;
  }
  if (Array.isArray(obj)) {
    if (prefix) out.set(prefix, obj);
    obj.forEach((v, i) => flattenInto(v, `${prefix}[${i}]`, out));
    return;
  }
  if (prefix) out.set(prefix, obj);
  for (const k of Object.keys(obj as Record<string, unknown>)) {
    const child = (obj as Record<string, unknown>)[k];
    const key = prefix ? `${prefix}.${k}` : k;
    if (child !== null && typeof child === "object") {
      flattenInto(child, key, out);
    } else {
      out.set(key, child);
    }
  }
}

/** Enumerate every intake field (recursively) as a FactRow. Absent/
 *  blank leaves become explicit `silent` rows so later checks can
 *  prove "the intake is silent on X" rather than infer it from
 *  absence. Fail-open: any throw returns an empty ledger. */
export function buildFactLedger(
  rawIntake: Record<string, unknown> | null | undefined,
  normalizedIntake?: Record<string, unknown> | null,
): FactRow[] {
  try {
    const source = (normalizedIntake && typeof normalizedIntake === "object")
      ? normalizedIntake
      : (rawIntake && typeof rawIntake === "object" ? rawIntake : null);
    if (!source) return [];
    const map = new Map<string, unknown>();
    flattenInto(source, "", map);
    const rows: FactRow[] = [];
    const entries = Array.from(map.entries()).sort(
      ([a], [b]) => a.localeCompare(b),
    );
    for (const [k, v] of entries) {
      rows.push({
        key: k,
        source_field: k,
        verbatim: verbatimOf(v),
        value: v ?? null,
        polarity: classifyPolarity(v),
      });
    }
    return rows;
  } catch { return []; }
}

// ── Assertion checker (v2 semantics) ─────────────────────────────────────

export function checkAssertion(
  ledger: readonly FactRow[],
  claim: Claim,
): CheckResult {
  try {
    // v2 rule: no stated field OR field not in ledger → SKIP.
    // Silence about a field is not evidence against a claim about
    // that field.
    if (!claim.field) {
      return { reason: "unresolved", ok: true };
    }
    const onField = ledger.find((r) => r.key === claim.field);
    if (!onField) {
      return { reason: "unresolved", ok: true };
    }
    if (claim.direction === "negative") {
      if (onField.polarity === "denied" || onField.polarity === "not_applicable") {
        return { reason: "supported", ok: true, matchedFact: onField };
      }
      if (onField.polarity === "silent") {
        return { reason: "silence_supports_negative", ok: false, matchedFact: onField };
      }
      // asserted → the negative contradicts.
      return { reason: "contradicted", ok: false, matchedFact: onField };
    }
    // Positive claim.
    if (onField.polarity === "asserted") {
      return { reason: "supported", ok: true, matchedFact: onField };
    }
    if (onField.polarity === "denied" || onField.polarity === "not_applicable") {
      return { reason: "contradicted", ok: false, matchedFact: onField };
    }
    // silent positive → SKIP (unresolved). We cannot affirm nor deny;
    // do not downgrade legitimate model output on absence of positive
    // support (v2 correction for wave-16 misfire).
    return { reason: "unresolved", ok: true };
  } catch {
    return { reason: "unresolved", ok: true };
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
      // Prefer scalar / string rows so we don't cross-attribute to a
      // container object whose JSON stringification happens to contain
      // the needle.
      if (typeof r.value === "object") continue;
      if (r.verbatim && r.verbatim.toLowerCase().includes(n)) return r;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Rewrite phrasing (D2-consistent; v2 never prepends claimText) ────────

function humanizeField(f?: string): string {
  if (!f) return "the underlying point";
  return f.replace(/[_.]/g, " ")
          .replace(/\[(\d+)\]/g, " $1")
          .replace(/\s+/g, " ")
          .trim() || "the underlying point";
}

export function rewriteUnsupported(claimText: string, fact?: FactRow): string {
  try {
    if (fact) {
      if (fact.polarity === "denied" || fact.polarity === "not_applicable") {
        return `The intake states "${fact.verbatim}" on ${fact.source_field}; the assertion is not supported by the intake and must be reconciled.`;
      }
      if (fact.polarity === "asserted") {
        // Short-form verbatim to avoid dumping large JSON blobs into a
        // customer-facing sentence.
        const v = (fact.verbatim || "").length > 160
          ? fact.verbatim.slice(0, 157) + "…"
          : fact.verbatim;
        return `The intake records "${v}" on ${fact.source_field}, which does not support this assertion and must be reconciled.`;
      }
      // silent
      return `The intake does not address ${humanizeField(fact.source_field)}; this must be confirmed rather than asserted.`;
    }
    // No matched fact — generic caveat. Never re-emits `claimText`.
    void claimText;
    return `The intake does not address the underlying point; this must be confirmed rather than asserted.`;
  } catch {
    return claimText;
  }
}

// ── Pre-emit walker ──────────────────────────────────────────────────────

export interface EnforceInput {
  claims?: Array<Claim & { surfacePath?: string; needle?: string }>;
}

function newCounters(): FactLedgerCounters {
  return {
    claims_scanned: 0,
    claims_downgraded: 0,
    negative_from_silence_blocked: 0,
    cross_attribution_blocked: 0,
    contradiction_blocked: 0,
    skipped_no_field: 0,
    skipped_field_unknown: 0,
    skipped_silent_positive: 0,
    supported: 0,
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
  enforcement_skipped_reason?: string;
}

/** Fail-open enforcement. Walks provided claims and records what would
 *  be blocked/rewritten. In production-scale runs (≥3 claims) the
 *  safety valve trips when the ledger is too small OR the downgrade
 *  rate exceeds 50 %, in which case NO rewrites are returned and the
 *  telemetry records `enforcement_skipped_reason`. Telemetry lives
 *  only under `_meta.internal.fact_ledger`. Any throw returns the
 *  input unchanged. */
export function enforceLedger(
  report: unknown,
  ledger: readonly FactRow[],
  input: EnforceInput = {},
): EnforceResult {
  const counters = newCounters();
  const rewrites: EnforceResult["rewrites"] = [];
  let skipReason: string | undefined;
  try {
    if (!report || typeof report !== "object") return { counters, rewrites };
    const r = report as Record<string, unknown>;
    const claims = Array.isArray(input.claims) ? input.claims : [];

    // Pre-flight safety valve #1 — ledger too small in a production
    // run. Cyber wave-16 evidence: ledger_rows=2 (top-level-only
    // build) drove 27/27 downgrades. Never enforce in this regime.
    if (
      claims.length >= SAFETY_VALVE_MIN_CLAIMS &&
      ledger.length < SAFETY_VALVE_MIN_LEDGER_ROWS
    ) {
      skipReason = "ledger_too_small";
      counters.claims_scanned = claims.length;
    } else {
      // Dry pass: gather candidate rewrites; apply only if the safety
      // valve doesn't trip on the downgrade-rate check.
      const candidates: EnforceResult["rewrites"] = [];
      const candidateCounters = newCounters();
      for (const c of claims) {
        candidateCounters.claims_scanned += 1;
        try {
          if (!c || typeof c.text !== "string") {
            candidateCounters.skipped_no_field += 1;
            continue;
          }
          // Cross-attribution takes precedence when a needle is present
          // AND the claim names a field.
          if (c.needle && c.field) {
            const cross = detectCrossAttribution(ledger, c, c.needle);
            if (cross) {
              candidateCounters.cross_attribution_blocked += 1;
              candidateCounters.claims_downgraded += 1;
              candidates.push({
                surfacePath: c.surfacePath,
                from: c.text,
                to: rewriteUnsupported(c.text, cross),
                reason: "cross_attributed",
              });
              continue;
            }
          }
          if (!c.field) {
            candidateCounters.skipped_no_field += 1;
            continue;
          }
          const onField = ledger.find((r0) => r0.key === c.field);
          if (!onField) {
            candidateCounters.skipped_field_unknown += 1;
            continue;
          }
          const res = checkAssertion(ledger, c);
          if (res.ok) {
            if (res.reason === "supported") candidateCounters.supported += 1;
            else if (res.reason === "unresolved") {
              // Positive claim, field present but silent.
              candidateCounters.skipped_silent_positive += 1;
            }
            continue;
          }
          if (res.reason === "silence_supports_negative") {
            candidateCounters.negative_from_silence_blocked += 1;
          } else if (res.reason === "contradicted") {
            candidateCounters.contradiction_blocked += 1;
          }
          candidateCounters.claims_downgraded += 1;
          candidates.push({
            surfacePath: c.surfacePath,
            from: c.text,
            to: rewriteUnsupported(c.text, res.matchedFact),
            reason: res.reason,
          });
        } catch { /* per-claim fail-open */ }
      }

      // Pre-flight safety valve #2 — downgrade-rate. If the matcher
      // wants to rewrite more than half of a production-scale scan,
      // treat that as a matcher fault and skip enforcement entirely.
      const scanned = candidateCounters.claims_scanned;
      const rate = scanned > 0 ? candidateCounters.claims_downgraded / scanned : 0;
      if (
        scanned >= SAFETY_VALVE_MIN_CLAIMS &&
        rate > SAFETY_VALVE_MAX_DOWNGRADE_RATE
      ) {
        skipReason = "downgrade_rate_exceeded";
        counters.claims_scanned = scanned;
      } else {
        // Commit candidate outcomes.
        Object.assign(counters, candidateCounters);
        for (const rw of candidates) rewrites.push(rw);
      }
    }

    // Sequester telemetry under _meta.internal.fact_ledger only.
    try {
      const internal = ensureInternal(r);
      const payload: Record<string, unknown> = {
        version: FACT_LEDGER_VERSION,
        ledger_rows: ledger.length,
        ...counters,
      };
      if (skipReason) payload.enforcement_skipped_reason = skipReason;
      internal.fact_ledger = payload;
    } catch { /* fail-open */ }

    return skipReason
      ? { counters, rewrites, enforcement_skipped_reason: skipReason }
      : { counters, rewrites };
  } catch {
    return { counters, rewrites };
  }
}
