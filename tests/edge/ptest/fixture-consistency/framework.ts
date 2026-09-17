// FIXTURE CONSISTENCY — framework.
//
// Paid model reviewers keep finding internal contradictions inside /all-ptest
// panel fixtures: a band answer that contradicts a stated number, two
// answers to the same question that disagree, dates out of order, a vendor
// named in one field but missing from the recipients table. Those defects
// are checkable WITHOUT a model — this module is the deterministic harness
// that runs a product's rules over its panel and reports every fixture that
// contradicts itself, before any batch spends a paid review on it.
//
// Deterministic only: no network, no Date.now() (rules read ctx.reportDate).

import type { PanelFixture } from "../../../../src/lib/ptestPanels/types.ts";
import type {
  FieldTrigger,
  IntakeContract,
} from "../../../../supabase/functions/_shared/intake-contracts/types.ts";
// Existing _shared export (not a new one) — reused so the framework's copy of
// the PRESENT-trigger predicate treats a placeholder token as empty exactly
// the way `_shared/ltp/record-complete.ts` does.
import { hasPlaceholderToken } from "../../../../supabase/functions/_shared/prose/ask-categories.ts";

export type Bag = Record<string, unknown>;

export interface RuleContext {
  readonly fixture: PanelFixture;
  readonly reportDate: string;
  readonly otherCompanies: readonly string[];
  readonly contract: IntakeContract | undefined;
}

export interface FixtureRule {
  readonly id: string;
  readonly title: string;
  check(intake: Bag, ctx: RuleContext): string[];
}

export interface Violation {
  readonly fixtureId: string;
  readonly ruleId: string;
  readonly message: string;
}

/** Run every rule over one fixture's intake; never throws — a rule that throws becomes one violation. */
export function runRules(
  rules: readonly FixtureRule[],
  intake: Bag,
  ctx: RuleContext,
): Violation[] {
  const out: Violation[] = [];
  for (const rule of rules) {
    let messages: string[];
    try {
      messages = rule.check(intake, ctx);
    } catch (err) {
      messages = [`rule threw: ${err instanceof Error ? err.message : String(err)}`];
    }
    for (const message of messages) {
      out.push({ fixtureId: ctx.fixture.id, ruleId: rule.id, message });
    }
  }
  return out;
}

// ── small pure helpers ──────────────────────────────────────────────────

/** Trimmed string, or "" for anything else. */
export function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** The string entries of an array value, or [] for anything else (drops non-string entries). */
export function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** v as a plain object bag, or {} for anything else (never an array). */
export function bag(v: unknown): Bag {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Bag) : {};
}

/** The first run of digits (commas allowed) in a string, e.g. "Approximately 680,000 lines" -> 680000. */
export function firstInt(text: unknown): number | null {
  if (typeof text !== "string") return null;
  const m = /\d(?:[\d,]*\d)?/.exec(text);
  if (!m) return null;
  const n = Number(m[0].replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Every run of digits (commas allowed) in a string, in order of appearance. */
export function allInts(text: unknown): number[] {
  if (typeof text !== "string") return [];
  const out: number[] = [];
  const re = /\d(?:[\d,]*\d)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const n = Number(m[0].replace(/,/g, ""));
    if (Number.isFinite(n)) out.push(n);
  }
  return out;
}

/** A strict YYYY-MM-DD string as a real calendar Date, or null (rejects e.g. "2026-02-30"). */
export function parseIsoDate(s: unknown): Date | null {
  if (typeof s !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

/** True when `text` is a string that matches `re` (re's own global flag, if any, is ignored so repeat calls never trip on stale lastIndex). */
export function mentions(text: unknown, re: RegExp): boolean {
  if (typeof text !== "string") return false;
  const flags = re.flags.replace("g", "");
  return new RegExp(re.source, flags).test(text);
}

/** JSON.stringify of the whole intake — a simple haystack for substring/regex scans. */
export function flatText(intake: unknown): string {
  try {
    return JSON.stringify(intake) ?? "";
  } catch {
    return "";
  }
}

/** Read every value reached by a dotted path; "[]" segments fan out over arrays (mirrors record-complete.ts's readPath). */
function readAll(root: unknown, path: string): unknown[] {
  let frontier: unknown[] = [root];
  for (const raw of path.split(".")) {
    const isArraySeg = raw.endsWith("[]");
    const seg = isArraySeg ? raw.slice(0, -2) : raw;
    const next: unknown[] = [];
    for (const node of frontier) {
      if (!node || typeof node !== "object") continue;
      const v = (node as Bag)[seg];
      if (isArraySeg) {
        if (Array.isArray(v)) next.push(...v);
      } else {
        next.push(v);
      }
    }
    frontier = next;
  }
  return frontier;
}

/**
 * Dotted-path read with "[]" array flattening, e.g. "recipients[].recipient_type".
 * A path with no "[]" segment returns the single value found (or undefined);
 * a path with a "[]" segment returns the flattened array of every value found.
 */
export function get(intake: Bag, path: string): unknown {
  const all = readAll(intake, path);
  return path.includes("[]") ? all : all[0];
}

/** True when v is a non-empty string/array/object (mirrors record-complete.ts's isEmptyValue, negated, minus the placeholder-token special case which is handled separately where it matters). */
function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return true;
}

/**
 * Parse one band-number token: a plain comma-grouped integer, or a dollar
 * figure with a thousand/million/billion (k/m/b) suffix, e.g. "10,000",
 * "$25M", "1,000,000". Returns the token's true numeric value.
 */
function parseBandNumber(raw: string): number | null {
  const m = /^\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(thousand|million|billion|k|m|b)?$/i.exec(raw.trim());
  if (!m) return null;
  const base = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(base)) return null;
  const unit = (m[2] ?? "").toLowerCase();
  const mult = unit === "k" || unit === "thousand"
    ? 1e3
    : unit === "m" || unit === "million"
    ? 1e6
    : unit === "b" || unit === "billion"
    ? 1e9
    : 1;
  return Math.round(base * mult);
}

/**
 * Parse a band-option label into an inclusive {min, max} numeric range.
 * Handles "Fewer than 10,000" / "Under $25M" (exclusive upper, no lower),
 * "More than 1,000,000" / "Over $100M" (exclusive lower, no upper),
 * "50,000 or more" (inclusive lower, no upper), "X to under Y" / "X to Y"
 * (en dash, hyphen and " to " all accepted; "under"/"less than"/"fewer than"
 * before the second number makes the upper bound exclusive). Money bands
 * ($25M, $100M, ...) resolve through the same K/M/B suffix parsing. Returns
 * null for "Unsure" or any label this cannot parse.
 */
export function bandRange(label: string): { min: number; max: number } | null {
  const s = str(label);
  if (!s || /unsure/i.test(s)) return null;

  const lower = /^(?:fewer than|less than|under)\s+(.+)$/i.exec(s);
  if (lower) {
    const n = parseBandNumber(lower[1]);
    return n === null ? null : { min: 0, max: n - 1 };
  }

  const moreThan = /^(?:more than|over)\s+(.+)$/i.exec(s);
  if (moreThan) {
    const n = parseBandNumber(moreThan[1]);
    return n === null ? null : { min: n + 1, max: Infinity };
  }

  const orMore = /^(.+?)\s+or more$/i.exec(s);
  if (orMore) {
    const n = parseBandNumber(orMore[1]);
    return n === null ? null : { min: n, max: Infinity };
  }

  const toRange = /^(.+?)\s+to\s+(under|less than|fewer than)?\s*(.+)$/i.exec(s);
  if (toRange) {
    const a = parseBandNumber(toRange[1]);
    const b = parseBandNumber(toRange[3]);
    if (a === null || b === null) return null;
    return { min: a, max: toRange[2] ? b - 1 : b };
  }

  const dashRange = /^(.+?)\s*[–—-]\s*(.+)$/.exec(s);
  if (dashRange) {
    const a = parseBandNumber(dashRange[1]);
    const b = parseBandNumber(dashRange[2]);
    if (a === null || b === null) return null;
    return { min: a, max: b };
  }

  return null;
}

/**
 * Mirrors `conditionalTriggered`'s VALUE-EQUALS / PRESENT branches in
 * supabase/functions/_shared/ltp/record-complete.ts. Copied here rather than
 * imported — that function is internal to record-complete.ts and this
 * framework does not add a new _shared export for it. The ARRAY-ROW legacy
 * shape (no `trigger` on the field at all) is out of scope here: the
 * generic.unasked-conditional-empty rule only evaluates fields that carry an
 * explicit `trigger`.
 *
 * ONE DELIBERATE GENERALIZATION: record-complete.ts's `readPath` only fans a
 * value out into multiple array entries when the KEY ITSELF ends "[]"; a
 * `trigger.key` that names a multi-enum field verbatim (e.g.
 * `q19a_decision_categories`, no "[]") is therefore read back as a single
 * array VALUE, and record-complete.ts's own equals-check
 * (`typeof v === "string" && equals.includes(v)`) can never match it — so
 * the trigger on cppa-risk's `q19b_housing_basis` (key:
 * "q19a_decision_categories", equals: ["Housing (...)"]) can never fire
 * there, even though the contract's own comment on that field says "the
 * evaluator array-wraps the multi-enum, so 'includes Housing' is
 * expressible", and a real panel fixture answers exactly that combination
 * (q19a_decision_categories: ["Housing (...)"] with q19b_housing_basis
 * answered). A byte-literal copy of record-complete.ts would make
 * generic.unasked-conditional-empty flag that correct fixture as a false
 * positive. This copy closes that one gap — if the trigger value is an
 * array, "triggered" means the array contains one of `equals` — which
 * changes nothing for every other (scalar-valued) trigger key in the union.
 */
function triggerFired(intake: Bag, trigger: FieldTrigger): boolean {
  const vals = readAll(intake, trigger.key);
  if (trigger.present) {
    const skip = (trigger.unlessLeadingWord ?? []).map((w) => w.toLowerCase());
    return vals.some((v) => {
      if (typeof v !== "string") return false;
      if (v.trim().length === 0 || hasPlaceholderToken(v)) return false;
      const lead = /^\s*([A-Za-z]+)/.exec(v)?.[1]?.toLowerCase();
      return !(lead !== undefined && skip.includes(lead));
    });
  }
  const equals = trigger.equals ?? [];
  return vals.some((v) => {
    if (typeof v === "string") return equals.includes(v);
    if (Array.isArray(v)) return v.some((item) => typeof item === "string" && equals.includes(item));
    return false;
  });
}

/** Recurse every string leaf in an intake (objects and arrays), reporting it under its own object key. */
function walkStrings(node: unknown, keyName: string, visit: (key: string, value: string) => void): void {
  if (typeof node === "string") {
    visit(keyName, node);
    return;
  }
  if (Array.isArray(node)) {
    for (const item of node) walkStrings(item, keyName, visit);
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Bag)) walkStrings(v, k, visit);
  }
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const APPROVALISH_KEY_RE = /(approval|approved|review(ed)?|sign_?off|assessment|completion|last_audit|verified)/i;
const FUTURE_OK_KEY_RE = /(estimated_end|end_date|target|deadline|renewal|next|launch|planned|due)/i;
const PLACEHOLDER_LITERAL_TOKENS = ["[TO COMPLETE", "TODO", "TBD", "XXX"];

// ── GENERIC_RULES — apply to every product's panel ──────────────────────

/** Catches another fixture's company name leaking into this intake (a copy/paste cross-contamination). */
const genericForeignCompany: FixtureRule = {
  id: "generic.foreign-company",
  title: "no other panel fixture's company appears in this intake",
  check(intake, ctx) {
    const hay = flatText(intake).toLowerCase();
    const out: string[] = [];
    for (const company of ctx.otherCompanies) {
      const c = str(company);
      if (c.length < 6) continue;
      if (hay.includes(c.toLowerCase())) {
        out.push(`intake mentions another fixture's company "${c}"`);
      }
    }
    return out;
  },
};

/** Catches a fixture whose own named company never actually appears in its intake (label/data drift). */
const genericCompanyInIntake: FixtureRule = {
  id: "generic.company-in-intake",
  title: "the fixture's own company name appears somewhere in its intake",
  check(intake, ctx) {
    const hay = flatText(intake).toLowerCase();
    const company = str(ctx.fixture.company).toLowerCase();
    if (!company) return [];
    return hay.includes(company) ? [] : [`fixture.company "${ctx.fixture.company}" does not appear anywhere in the intake`];
  },
};

/** Catches an impossible calendar date, and an approval/review/sign-off date stamped after the report date. */
const genericDatesParse: FixtureRule = {
  id: "generic.dates-parse",
  title: "every YYYY-MM-DD value is a real date, and approval-like dates are not in the future",
  check(intake, ctx) {
    const out: string[] = [];
    const reportDate = parseIsoDate(ctx.reportDate);
    walkStrings(intake, "", (key, value) => {
      if (!ISO_DATE_RE.test(value)) return;
      const d = parseIsoDate(value);
      if (!d) {
        out.push(`${key}: "${value}" is not a real calendar date`);
        return;
      }
      if (APPROVALISH_KEY_RE.test(key) && !FUTURE_OK_KEY_RE.test(key) && reportDate && d.getTime() > reportDate.getTime()) {
        out.push(`${key}: "${value}" is later than the report date ${ctx.reportDate}`);
      }
    });
    return out;
  },
};

/** Catches leftover drafting placeholders ("[TO COMPLETE", TODO, TBD, XXX, lorem ipsum, example@example) shipped as a real answer. */
const genericNoPlaceholders: FixtureRule = {
  id: "generic.no-placeholders",
  title: "no string value carries a drafting placeholder",
  check(intake) {
    const out: string[] = [];
    walkStrings(intake, "", (key, value) => {
      for (const token of PLACEHOLDER_LITERAL_TOKENS) {
        if (value.includes(token)) out.push(`${key}: contains placeholder token "${token}"`);
      }
      if (/lorem/i.test(value)) out.push(`${key}: contains placeholder token "lorem"`);
      if (/example@example/i.test(value)) out.push(`${key}: contains placeholder token "example@example"`);
    });
    return out;
  },
};

/** Keys a page lets the customer answer beyond the contract's trigger — the one
 *  ratified case: under a "Partial" how-it-works answer the ADMT page collects
 *  whichever how-it-works excerpt the notice has (item380 r5b: Partial does
 *  not DEMAND both). Keyed by contract key; the predicate reads the intake. */
const UNASKED_EXEMPT: ReadonlyArray<{ key: string; when: (intake: Bag) => boolean }> = [
  { key: "notice_element_text.howworks_inputs", when: (i) => /^partial\b/i.test(str(i.notice_has_how_it_works)) },
  { key: "notice_element_text.howworks_output", when: (i) => /^partial\b/i.test(str(i.notice_has_how_it_works)) },
];

/** Catches a conditional field answered even though the record's own skip-logic trigger for it never fires. */
const genericUnaskedConditionalEmpty: FixtureRule = {
  id: "generic.unasked-conditional-empty",
  title: "a conditional field is answered though its trigger is not met on this record",
  check(intake, ctx) {
    const contract = ctx.contract;
    if (!contract) return [];
    const out: string[] = [];
    for (const f of contract.fields) {
      if (f.required !== "conditional") continue;
      const trigger = f.trigger;
      if (!trigger) continue;
      if (triggerFired(intake, trigger)) continue;
      if (UNASKED_EXEMPT.some((e) => e.key === f.key && e.when(intake))) continue;
      const values = readAll(intake, f.key);
      const filled = values.some((v) => isFilled(v) && v !== f.hiddenValue);
      if (filled) {
        out.push(`${f.key} is answered but its trigger (${trigger.key}) is not met`);
      }
    }
    return out;
  },
};

export const GENERIC_RULES: readonly FixtureRule[] = [
  genericForeignCompany,
  genericCompanyInIntake,
  genericDatesParse,
  genericNoPlaceholders,
  genericUnaskedConditionalEmpty,
];
