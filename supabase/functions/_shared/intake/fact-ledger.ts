// S-B INTAKE-FACT-LEDGER — shared enforcement service.
//
// v1 (sb-fl-w1-2026-07-24): initial authoring turn (§2 item 16).
// v2 (sb-fl-w2-2026-07-25) — FACT-LEDGER-W16-HOTFIX: matcher SKIP on
//   unresolvable field/silent-positive; nested intake flattening;
//   answer-first rewrite; production-scale safety valve.
//
// v3 (sb-fl-w3-2026-07-25) — FACT-LEDGER-W17-GAP (§2 item 25):
//   Wave-17 evidence surfaced three escape classes that v2's per-item
//   scan and matcher did not close:
//
//     (a) AGGREGATED MULTI-FACT NEGATIVES (admt doc 2b071620): a single
//         scope-prose sentence bundles several intake facts into one
//         negative/aggregate assertion, e.g. "the intake reflects no
//         MFA, encryption, or SSO controls". Per-item extraction sees
//         ONE claim; individual constituent facts (some of which may
//         be explicitly asserted in the intake) are never checked. v3
//         adds `splitAggregatedClaim` which decomposes such claims
//         into per-constituent Claim entries via list-boundary parsing
//         (commas / "and" / "or" / semicolons after a negation head).
//
//     (b) FREE-PROSE inconsistency_flags CONTRADICTIONS (risk doc
//         52dfb9a1): the wiring layers already `scan()` inconsistency
//         flags at container level, but assertions embedded WITHIN
//         the `description` prose (multi-sentence) are collapsed into
//         one blob and only the aggregate is checked. v3 adds
//         `extractProseClaims` — a sentence-level extractor that
//         returns one Claim per sentence with direction inferred from
//         negation heads, honours a caller-supplied anchor-key skip
//         list (source_fields / field / intake_field_1 /
//         intake_field_2 / provision subtrees stay untouched), and
//         accepts an optional field-token map so callers can attribute
//         subclaims to specific ledger rows.
//
//     (c) PROFILE-FIELD NARRATIVE PROJECTION + COMPARATIVE-FRAMEWORK
//         ASSERTIONS (cyber doc f22f2550): narrative that projects
//         profile fields into claims the intake does not state
//         ("the entity operates within a HITRUST-certified perimeter"
//         when the intake profile records a different or absent
//         framework), and comparative-framework claims ("exceeds NIST
//         baseline", "surpasses ISO 27001 requirements") that have no
//         ledger basis. v3 adds `extractComparativeClaims` (pattern-
//         driven; binds each match to a caller-supplied profile field
//         so the standard matcher can contradict or SKIP as
//         appropriate).
//
//   HARD GUARDRAILS (v3):
//     - No loosening of v2 matcher semantics. `checkAssertion` still
//       SKIPS on unresolvable field and silent-positive; only explicit
//       ledger outcomes downgrade. The safety valve stays intact.
//     - Extractors are pure helpers: they synthesise Claim entries
//       from prose. They do NOT rewrite anything themselves.
//     - `rewriteUnsupported` remains answer-first, plain-language,
//       customer-safe (no meta-commentary, no internal field IDs, no
//       pipeline references).
//     - `ANCHOR_SKIP_KEYS` published as the canonical skip list so
//       wiring layers can reuse it (matches RISK-INTERNAL-VOCAB-SCRUB).
//     - FAIL-OPEN everywhere: any throw returns [] / input unchanged.

// v4 (sb-fl-w4-2026-07-25) — LEAK-PREV-P0: rewriteUnsupported branches
//   now route through the customer-messages catalog and humanize
//   `fact.source_field` via `labelForField`. NO raw intake IDs may
//   appear in customer-visible strings. Matcher / safety-valve /
//   builder untouched.
export const FACT_LEDGER_VERSION = "sb-fl-w4-2026-07-25";

import { renderMessage, P, labelForField } from "../customer-messages.ts";

/** Canonical anchor-subtree skip list. Wiring layers walking report
 *  surfaces MUST skip these keys so structured citation anchors are
 *  not misread as prose claims. Mirrors RISK-INTERNAL-VOCAB-SCRUB. */
export const ANCHOR_SKIP_KEYS: readonly string[] = [
  "source_fields",
  "field",
  "intake_field_1",
  "intake_field_2",
  "provision",
] as const;

// Safety-valve triggers only in production-scale runs.
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

// LEAK-PREV-P0: humanizeField retained only as an internal debug helper.
// Customer-facing text goes through `labelForField` in customer-messages.ts.
function humanizeField(f?: string): string {
  return labelForField(f);
}

export function rewriteUnsupported(claimText: string, fact?: FactRow): string {
  try {
    if (fact) {
      if (fact.polarity === "denied" || fact.polarity === "not_applicable") {
        return renderMessage("unsupported.denied", {
          field: P.field(fact.source_field),
          verbatim: P.verbatim(fact.verbatim || ""),
        });
      }
      if (fact.polarity === "asserted") {
        return renderMessage("unsupported.asserted", {
          field: P.field(fact.source_field),
          verbatim: P.verbatim(fact.verbatim || ""),
        });
      }
      // silent
      return renderMessage("unsupported.silent", {
        field: P.field(fact.source_field),
      });
    }
    // No matched fact — generic caveat. Never re-emits `claimText`.
    void claimText;
    void humanizeField;
    return renderMessage("unsupported.silent", { field: P.field("") });
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

// ═══════════════════════════════════════════════════════════════════════
// v3 (sb-fl-w3-2026-07-25) — FACT-LEDGER-W17-GAP claim extractors
// ═══════════════════════════════════════════════════════════════════════
//
// These are PURE helpers. They synthesise additional Claim entries
// that wiring layers can concatenate into their existing per-item
// scan list, so `enforceLedger` can then apply the v2 matcher to each
// constituent assertion individually. No matcher semantics are
// touched. All helpers fail-open (return [] on any throw).

/** Options common to all v3 extractors. */
export interface ExtractOptions {
  /** Surface path prefix applied to each synthesised Claim. */
  surfacePath?: string;
  /** Optional token→field-id map. Callers that know the intake
   *  schema pass this to attribute subclaims to specific ledger
   *  rows. Matching is case-insensitive word-boundary. */
  fieldTokenMap?: Record<string, string>;
}

// Regex head for negation cues that flip a claim to `negative`.
const NEG_HEAD_RE =
  /\b(no|none|not|never|absence of|without|does not|do not|is not|are not|nor|neither)\b/i;

/** Detect direction from a leading negation cue. */
function directionOf(text: string): "positive" | "negative" {
  return NEG_HEAD_RE.test(text) ? "negative" : "positive";
}

/** Case-insensitive first-hit token → field lookup. Returns undefined
 *  when no token in the map appears in `text`. */
function pickFieldFromTokens(
  text: string,
  fieldTokenMap?: Record<string, string>,
): string | undefined {
  if (!fieldTokenMap || !text) return undefined;
  const lo = text.toLowerCase();
  for (const [tok, field] of Object.entries(fieldTokenMap)) {
    if (!tok) continue;
    const t = tok.toLowerCase();
    // Word-boundary-ish: require non-alnum on either side (or edge).
    const idx = lo.indexOf(t);
    if (idx < 0) continue;
    const before = idx === 0 ? " " : lo[idx - 1];
    const after = idx + t.length >= lo.length ? " " : lo[idx + t.length];
    if (!/[a-z0-9_]/i.test(before) && !/[a-z0-9_]/i.test(after)) {
      return field;
    }
  }
  return undefined;
}

// ── Class (a) — aggregated multi-fact splitter ────────────────────────
//
// A single sentence like:
//   "The intake reflects no MFA, encryption, or SSO controls"
// bundles three facts under one negation head. `splitAggregatedClaim`
// decomposes it into per-constituent Claim entries so the matcher
// can check each fact individually against the ledger.
//
// Behaviour:
//   - If the claim text contains a list of ≥2 items after a negation
//     head, emit one Claim per item, each inheriting `direction`
//     from the head. Each subclaim's `field` is attributed via
//     `fieldTokenMap` when provided; otherwise left undefined
//     (matcher will SKIP — v2 semantics preserved).
//   - If the input is not aggregated, return `[claim]` unchanged.
//   - Fail-open: any throw returns `[claim]`.

const LIST_SPLIT_RE = /\s*,\s*|\s+(?:and|or|nor)\s+|\s*;\s*/i;

export function splitAggregatedClaim(
  claim: Claim,
  opts: ExtractOptions = {},
): Claim[] {
  try {
    if (!claim || typeof claim.text !== "string") return [claim];
    const text = claim.text.trim();
    if (!text) return [claim];
    // Must lead with a negation cue AND contain a list separator.
    if (!NEG_HEAD_RE.test(text)) return [claim];
    // Slice the segment after the FIRST negation-head match so we
    // don't chop the preamble ("The intake reflects").
    const m = text.match(NEG_HEAD_RE);
    if (!m || m.index === undefined) return [claim];
    const tail = text.slice(m.index + m[0].length).trim();
    if (!tail) return [claim];
    const parts = tail.split(LIST_SPLIT_RE)
      .map((s) => s.replace(/[.;:]+$/, "").trim())
      .filter((s) => s.length >= 2);
    if (parts.length < 2) return [claim];
    return parts.map((p, i) => ({
      text: `${m[0]} ${p}`,
      direction: claim.direction ?? "negative",
      field: pickFieldFromTokens(p, opts.fieldTokenMap) ?? claim.field,
    }));
  } catch { return [claim]; }
}

// ── Class (b) — free-prose sentence extractor ─────────────────────────
//
// Given a blob of prose (e.g. `inconsistency_flags[i].description`),
// emit one Claim per sentence. Direction is inferred per-sentence
// from its own negation head. Fields are attributed via
// `fieldTokenMap` when possible; otherwise undefined (SKIPPED by
// matcher — v2 semantics preserved so unsupported extraction never
// downgrades supported prose).
//
// Callers walking report subtrees must skip `ANCHOR_SKIP_KEYS` so
// structured citation anchors are not misread as prose claims.

const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+(?=[A-Z"“(])/;

export function extractProseClaims(
  prose: string,
  opts: ExtractOptions = {},
): Array<Claim & { surfacePath?: string }> {
  try {
    if (typeof prose !== "string") return [];
    const t = prose.trim();
    if (!t) return [];
    const sentences = t.split(SENTENCE_SPLIT_RE)
      .map((s) => s.trim())
      .filter((s) => s.length >= 8);
    if (sentences.length === 0) return [];
    return sentences.map((s, i) => ({
      text: s,
      direction: directionOf(s),
      field: pickFieldFromTokens(s, opts.fieldTokenMap),
      surfacePath: opts.surfacePath
        ? `${opts.surfacePath}.sentence[${i}]`
        : undefined,
    }));
  } catch { return []; }
}

// ── Class (c) — comparative-framework extractor ───────────────────────
//
// Cyber wave-17 evidence: narrative asserts the entity's controls
// "exceed the NIST baseline" or "surpass ISO 27001 requirements"
// with no ledger basis. We synthesise a positive Claim bound to a
// caller-supplied `profileField` (typically `profile.framework`) so
// the standard matcher can contradict / SKIP as appropriate.
//
// Recognised comparators (case-insensitive):
//   exceeds / exceed / exceeding
//   surpasses / surpass / surpassing
//   meets or exceeds
//   goes beyond / beyond
//   above (the) … baseline / standard / benchmark
//
// Recognised framework tokens: NIST (CSF), ISO 27001, SOC 2, HITRUST,
// PCI (DSS). Match is case-insensitive and permissive on spacing.

const COMPARATIVE_RE =
  /\b(exceeds?|exceeding|surpass(?:es|ing)?|meets? or exceeds?|goes? beyond|beyond|above)\b[^.?!]{0,80}?\b(NIST(?:\s+CSF)?|ISO\s*27001|SOC\s*2|HITRUST|PCI(?:\s+DSS)?)\b/i;

export interface ComparativeExtractOptions extends ExtractOptions {
  /** Ledger field to bind synthesised claims to (e.g.
   *  "profile.framework"). Required for the matcher to act; when
   *  omitted, claims are still emitted but will SKIP per v2 rules. */
  profileField?: string;
}

export function extractComparativeClaims(
  text: string,
  opts: ComparativeExtractOptions = {},
): Array<Claim & { surfacePath?: string }> {
  try {
    if (typeof text !== "string" || !text.trim()) return [];
    const out: Array<Claim & { surfacePath?: string }> = [];
    // Scan every sentence so multiple assertions in one blob are
    // all surfaced.
    const sentences = text.split(SENTENCE_SPLIT_RE);
    sentences.forEach((s, i) => {
      const trimmed = s.trim();
      if (!trimmed) return;
      const m = trimmed.match(COMPARATIVE_RE);
      if (!m) return;
      out.push({
        text: trimmed,
        direction: "positive",
        field: opts.profileField,
        surfacePath: opts.surfacePath
          ? `${opts.surfacePath}.comparative[${i}]`
          : undefined,
      });
    });
    return out;
  } catch { return []; }
}

