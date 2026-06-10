// Shared JSON-shape validators for AI enrichment payloads.
//
// Goal: catch malformed or missing fields in model output so we never write
// junk into the `updates` table. Validators are intentionally permissive —
// they enforce the *shape* (types, allowed enum values, non-empty strings on
// core fields) without rejecting otherwise-usable AI output for cosmetic
// reasons. When validation fails, the helper logs a structured error line
// (parseable from edge-function logs) and the caller skips the bad field.

export type ValidationCtx = {
  fn: string;          // edge function name, e.g. "fetch-updates"
  articleId?: string;  // updates.id when known
  title?: string;      // article title for grep-ability
  url?: string;
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: string[] };

// ── Enum vocabularies (kept loose; unknown values are warned, not rejected) ──
const URGENCY = ["Immediate", "This quarter", "Monitor"];
const LEGAL_WEIGHT = ["Binding", "Enforcement", "Guidance", "Proposal", "Commentary", "Soft Guidance"];
const RISK_LEVEL = ["Low", "Medium", "High", "Critical"];
const PRECEDENT_NOVELTY = ["new_theory", "confirms_existing", "reverses_prior", "reverses", "routine"];
const SIGNAL_KIND = ["pattern", "precedent", "trend"];

// ── Primitive checks ─────────────────────────────────────────────────────────
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isNonEmptyString = (v: unknown, min = 1): v is string =>
  typeof v === "string" && v.trim().length >= min;

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

// ── ai_summary (full enrichment object) ──────────────────────────────────────
export interface AISummary {
  why_it_matters: string;
  why_it_matters_short?: string;
  takeaways: string[];
  compliance_impact: string;
  who_should_care?: string;
  urgency?: string;
  legal_weight?: string;
  source_strength?: string;
  cross_jurisdiction_signal?: string | null;
  risk_level?: string;
  affected_jurisdictions?: string[];
  precedent_novelty?: string;
  regulatory_theory?: string | null;
  action_items?: unknown[];
  related_signals?: unknown[];
  key_date?: string | null;
  entities?: Record<string, unknown>;
  defense_considerations?: string | null;
  [k: string]: unknown;
}

export function validateAISummary(
  raw: unknown,
  ctx: ValidationCtx,
): ValidationResult<AISummary> {
  const errs: string[] = [];

  if (!isObject(raw)) {
    return logFail({ ...ctx, kind: "ai_summary" }, ["root: not an object"]);
  }

  // ── Required core fields ───────────────────────────────────────────────
  if (!isNonEmptyString(raw.why_it_matters, 10)) {
    errs.push("why_it_matters: missing or too short");
  }
  if (!isNonEmptyString(raw.compliance_impact, 5)) {
    errs.push("compliance_impact: missing or too short");
  }
  if (!Array.isArray(raw.takeaways) ||
      raw.takeaways.length < 1 ||
      raw.takeaways.length > 8 ||
      !raw.takeaways.every((t) => isNonEmptyString(t))) {
    errs.push("takeaways: must be 1–8 non-empty strings");
  }

  // ── Enum-bounded optional fields ───────────────────────────────────────
  if (raw.urgency !== undefined && raw.urgency !== null &&
      !URGENCY.includes(String(raw.urgency))) {
    errs.push(`urgency: invalid value "${raw.urgency}"`);
  }
  if (raw.legal_weight !== undefined && raw.legal_weight !== null &&
      !LEGAL_WEIGHT.includes(String(raw.legal_weight))) {
    errs.push(`legal_weight: invalid value "${raw.legal_weight}"`);
  }
  if (raw.risk_level !== undefined && raw.risk_level !== null &&
      !RISK_LEVEL.includes(String(raw.risk_level))) {
    errs.push(`risk_level: invalid value "${raw.risk_level}"`);
  }
  if (raw.precedent_novelty !== undefined && raw.precedent_novelty !== null &&
      !PRECEDENT_NOVELTY.includes(String(raw.precedent_novelty))) {
    errs.push(`precedent_novelty: invalid value "${raw.precedent_novelty}"`);
  }

  // ── Shape-only optional fields ─────────────────────────────────────────
  if (raw.affected_jurisdictions !== undefined && raw.affected_jurisdictions !== null &&
      !isStringArray(raw.affected_jurisdictions)) {
    errs.push("affected_jurisdictions: must be array of strings");
  }
  if (raw.action_items !== undefined && raw.action_items !== null) {
    const aiErr = checkActionItems(raw.action_items);
    if (aiErr) errs.push(`action_items: ${aiErr}`);
  }
  if (raw.related_signals !== undefined && raw.related_signals !== null) {
    const rsErr = checkRelatedSignals(raw.related_signals);
    if (rsErr) errs.push(`related_signals: ${rsErr}`);
  }
  if (raw.key_date !== undefined && raw.key_date !== null &&
      !(typeof raw.key_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.key_date))) {
    errs.push("key_date: must be YYYY-MM-DD or null");
  }
  if (raw.entities !== undefined && raw.entities !== null && !isObject(raw.entities)) {
    errs.push("entities: must be object");
  }

  if (errs.length > 0) return logFail({ ...ctx, kind: "ai_summary" }, errs);
  return { ok: true, data: raw as AISummary };
}

// ── Signals patch (backfill-update-signals) ─────────────────────────────────
export interface SignalsPatch {
  why_it_matters_short?: string;
  related_signals?: unknown[];
  [k: string]: unknown;
}

export function validateSignalsPatch(
  raw: unknown,
  ctx: ValidationCtx,
): ValidationResult<SignalsPatch> {
  const errs: string[] = [];
  if (!isObject(raw)) {
    return logFail({ ...ctx, kind: "signals_patch" }, ["root: not an object"]);
  }
  if (raw.why_it_matters_short !== undefined && raw.why_it_matters_short !== null &&
      !isNonEmptyString(raw.why_it_matters_short)) {
    errs.push("why_it_matters_short: must be non-empty string");
  }
  if (raw.related_signals !== undefined && raw.related_signals !== null) {
    const rsErr = checkRelatedSignals(raw.related_signals);
    if (rsErr) errs.push(`related_signals: ${rsErr}`);
  }
  if (errs.length > 0) return logFail({ ...ctx, kind: "signals_patch" }, errs);
  return { ok: true, data: raw as SignalsPatch };
}

// ── Action-items patch (backfill-action-items) ──────────────────────────────
export interface ActionItemsPatch {
  action_items?: unknown[];
  precedent_novelty?: string;
  [k: string]: unknown;
}

export function validateActionItemsPatch(
  raw: unknown,
  ctx: ValidationCtx,
): ValidationResult<ActionItemsPatch> {
  const errs: string[] = [];
  if (!isObject(raw)) {
    return logFail({ ...ctx, kind: "action_items_patch" }, ["root: not an object"]);
  }
  if (raw.action_items !== undefined && raw.action_items !== null) {
    const aiErr = checkActionItems(raw.action_items);
    if (aiErr) errs.push(`action_items: ${aiErr}`);
  }
  if (raw.precedent_novelty !== undefined && raw.precedent_novelty !== null &&
      !PRECEDENT_NOVELTY.includes(String(raw.precedent_novelty))) {
    errs.push(`precedent_novelty: invalid value "${raw.precedent_novelty}"`);
  }
  if (errs.length > 0) return logFail({ ...ctx, kind: "action_items_patch" }, errs);
  return { ok: true, data: raw as ActionItemsPatch };
}

// ── Sub-validators ───────────────────────────────────────────────────────────
function checkActionItems(v: unknown): string | null {
  if (!Array.isArray(v)) return "must be array";
  if (v.length > 10) return "too many items (>10)";
  for (let i = 0; i < v.length; i++) {
    const it = v[i];
    if (!isObject(it)) return `item[${i}] not an object`;
    if (!isNonEmptyString(it.action, 5)) return `item[${i}].action missing or too short`;
  }
  return null;
}

function checkRelatedSignals(v: unknown): string | null {
  if (!Array.isArray(v)) return "must be array";
  if (v.length > 6) return "too many items (>6)";
  for (let i = 0; i < v.length; i++) {
    const it = v[i];
    if (!isObject(it)) return `item[${i}] not an object`;
    if (!isNonEmptyString(it.label)) return `item[${i}].label missing`;
    if (it.kind !== undefined && it.kind !== null &&
        !SIGNAL_KIND.includes(String(it.kind))) {
      return `item[${i}].kind invalid "${it.kind}"`;
    }
  }
  return null;
}

// ── Structured logging ───────────────────────────────────────────────────────
function logFail(
  ctx: ValidationCtx & { kind: string },
  errors: string[],
): { ok: false; errors: string[] } {
  // Single-line JSON so it greps cleanly in edge-function logs.
  console.error(JSON.stringify({
    type: "ai_schema_validation_failed",
    fn: ctx.fn,
    payload_kind: ctx.kind,
    article_id: ctx.articleId ?? null,
    url: ctx.url ?? null,
    title: ctx.title ? ctx.title.slice(0, 140) : null,
    errors,
  }));
  return { ok: false, errors };
}

// ── Date consistency checker ─────────────────────────────────────────────────
// Deterministic, read-only check that flags likely year-drift in AI-written
// text. Never mutates; never throws. Designed for near-zero false positives —
// historical references like "GDPR (2016)" are not flagged.

export interface DateIssue {
  found: string;
  reason: "month_prior_year" | "stale_event_year" | "future_year";
}

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7,
  aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const EVENT_VERB_RE = /\b(adopted|published|issued|announced|released|launched|held|met|opened|finalized|finalised|enacted|signed|today|this week|this month|plenary|session|latest)\b/i;

export function checkDateConsistency(
  text: string,
  publishedAt: string,
  ctx: ValidationCtx,
): { ok: boolean; issues: DateIssue[] } {
  if (typeof text !== "string" || text.length === 0) {
    return { ok: true, issues: [] };
  }
  const pub = new Date(publishedAt);
  if (isNaN(pub.getTime())) return { ok: true, issues: [] };
  const pubYear = pub.getUTCFullYear();
  const pubMonth = pub.getUTCMonth() + 1;
  const nowYear = new Date().getUTCFullYear();

  const issues: DateIssue[] = [];
  const seen = new Set<string>();
  const push = (it: DateIssue) => {
    if (seen.has(it.found)) return;
    seen.add(it.found);
    issues.push(it);
    console.warn(JSON.stringify({
      evt: "date_inconsistency",
      fn: ctx.fn,
      articleId: ctx.articleId ?? null,
      title: ctx.title ? ctx.title.slice(0, 140) : null,
      found: it.found,
      reason: it.reason,
      publishedAt,
    }));
  };

  // (2) MONTH + PRIOR-YEAR DRIFT
  const monthRe = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\s+(\d{4})\b/gi;
  for (const m of text.matchAll(monthRe)) {
    const monthNum = MONTHS[m[1].toLowerCase()];
    const year = parseInt(m[2], 10);
    if (!monthNum) continue;
    if (monthNum === pubMonth && year === pubYear - 1) {
      push({ found: m[0], reason: "month_prior_year" });
    }
    if (year > pubYear + 3) {
      push({ found: m[0], reason: "future_year" });
    }
  }

  // (3) STALE EVENT YEAR — bare YYYY near event language
  const yearRe = /\b(19[9]\d|20\d{2})\b/g;
  for (const m of text.matchAll(yearRe)) {
    const year = parseInt(m[1], 10);
    const idx = m.index ?? 0;
    if (year === pubYear - 1) {
      const start = Math.max(0, idx - 40);
      const end = Math.min(text.length, idx + m[0].length + 40);
      const window = text.slice(start, end);
      if (EVENT_VERB_RE.test(window)) {
        push({ found: m[0], reason: "stale_event_year" });
      }
    }
    // (4) FUTURE YEAR
    if (year > pubYear + 3 && year <= 2099) {
      push({ found: m[0], reason: "future_year" });
    }
  }

  void nowYear; // reserved for future heuristics; pubYear is the primary anchor

  return { ok: issues.length === 0, issues };
}

// Expected behaviour examples:
//   "adopted at its June 2025 plenary"   pub 2026-06-10 → month_prior_year ("June 2025")
//   "GDPR (2016)"                         pub 2026-06-10 → NOT flagged (no event verb nearby, not pubYear-1)
//   "CCPA of 2018"                        pub 2026-06-10 → NOT flagged (historical reference)
//   "April 1, 2028 certification deadline" pub 2026-06-10 → NOT flagged (2028 ≤ 2026+3)
//   "by 2035"                             pub 2026-06-10 → future_year ("2035")
//   "issued in 2025"                      pub 2026-06-10 → stale_event_year ("2025", "issued" within 40 chars)
//   "since 2025"                          pub 2026-06-10 → NOT flagged (no event verb nearby)

