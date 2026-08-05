// ITEM 380 — RECORD-COMPLETE FRAMING (DPIA + CPPA RISK).
//
// THE TRUTH GATE. The affirmative claim ("the record before this assessment is
// complete") may ONLY render when it is deterministically TRUE. This module
// computes that predicate from machinery that already exists — the intake
// contract, the bidirectional coverage matrix, the cross-surface consistency
// pass, and (for risk) the LTP `record_needs` count — with NO model
// involvement, and classifies the document's open items into the two classes
// the banner and the determination distinguish.
//
// LAWS
//   * DETERMINISTIC — pure functions of (report, intake, telemetry).
//   * FAIL-CLOSED ON THE CLAIM — any error, any unreadable input, any missing
//     telemetry ⇒ recordComplete is FALSE and today's draft framing renders
//     byte-identically.
//   * NO REPAIRS — this module never rewrites document prose.
//
// Telemetry rides `_meta.internal.record_complete` and
// `_meta.internal.placeholder_classification`.

import type { IntakeContract, IntakeField } from "../intake-contracts/types.ts";
import {
  ASK_CATEGORY_INTAKE_KEYS,
  categorizeAsk,
  hasPlaceholderToken,
  intakeKeyFilled,
} from "../prose/ask-categories.ts";

export const RECORD_COMPLETE_VERSION = "record-complete-2026-08-05-item380";

export type RecordCompleteProduct = "dpia" | "cppa-risk";

export type FailedCondition =
  | "contract_incomplete"
  | "coverage_orphans"
  | "csc_false_absence"
  | "risk_record_needs_missing_data"
  | "gate_error";

export interface RecordCompleteTelemetry {
  version: string;
  product: RecordCompleteProduct;
  value: boolean;
  failed_conditions: FailedCondition[];
  /** Contract keys that are empty (capped for telemetry sanity). */
  empty_required_keys: string[];
  counts: {
    empty_required_keys: number;
    coverage_orphans: number;
    csc_false_absence: number;
    record_needs_missing_data: number;
  };
}

// ---------------------------------------------------------------------------
// (a) contract completeness
// ---------------------------------------------------------------------------

function isEmptyValue(v: unknown): boolean {
  if (v === "" || v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

/** Read `a.b[].c` — returns every value reached (array segments fan out). */
function readPath(root: unknown, key: string): unknown[] {
  let frontier: unknown[] = [root];
  for (const raw of key.split(".")) {
    const isArr = raw.endsWith("[]");
    const seg = isArr ? raw.slice(0, -2) : raw;
    const next: unknown[] = [];
    for (const node of frontier) {
      if (!node || typeof node !== "object") continue;
      const v = (node as Record<string, unknown>)[seg];
      if (isArr) {
        if (Array.isArray(v)) next.push(...v);
      } else next.push(v);
    }
    frontier = next;
  }
  return frontier;
}

/**
 * A conditional field counts as TRIGGERED only when the record itself shows the
 * trigger: the field sits inside an array segment and that array has at least
 * one row. Conditionals whose predicate is prose we cannot parse are left
 * unchecked (they cannot make the claim false, and they cannot make it true).
 */
function conditionalTriggered(intake: Record<string, unknown>, f: IntakeField): boolean {
  if (!f.key.includes("[]")) return false;
  const parent = f.key.slice(0, f.key.indexOf("[]") + 2);
  return readPath(intake, parent).length > 0;
}

/** Contract keys that are required (always, or a triggered conditional) and empty. */
export function emptyRequiredKeys(
  contract: IntakeContract,
  intake: unknown,
): string[] {
  const rec = (intake && typeof intake === "object" ? intake : {}) as Record<string, unknown>;
  const out: string[] = [];
  for (const f of contract.fields) {
    const required = f.required === "always" ||
      (f.required === "conditional" && conditionalTriggered(rec, f));
    if (!required) continue;
    const values = readPath(rec, f.key);
    if (values.length === 0 || values.every(isEmptyValue)) out.push(f.key);
  }
  return out;
}

// ---------------------------------------------------------------------------
// (b)+(c) the gate
// ---------------------------------------------------------------------------

/** CSC check ids whose violations are false-absence statements. */
export const FALSE_ABSENCE_CHECK_IDS: Readonly<Record<RecordCompleteProduct, readonly string[]>> = {
  dpia: ["c2_absence_claim_vs_record"],
  "cppa-risk": ["r1_benefits_vs_intake", "r2_exception_vs_record"],
};

export interface RecordCompleteInput {
  readonly product: RecordCompleteProduct;
  readonly contract: IntakeContract;
  readonly intake: unknown;
  /** `_meta.internal.<product>_coverage` telemetry. */
  readonly coverage?: { counts?: { orphans?: number }; crashed?: boolean } | null;
  /** `_meta.internal.<product>_csc` telemetry. */
  readonly csc?: { violations?: Array<{ check_id?: string }>; crashed?: boolean } | null;
  /** RISK only — `_meta.internal.record_needs.missing_data`. */
  readonly recordNeedsMissingData?: number | null;
}

export function computeRecordComplete(input: RecordCompleteInput): RecordCompleteTelemetry {
  const base: RecordCompleteTelemetry = {
    version: RECORD_COMPLETE_VERSION,
    product: input?.product ?? "dpia",
    value: false,
    failed_conditions: [],
    empty_required_keys: [],
    counts: {
      empty_required_keys: 0,
      coverage_orphans: 0,
      csc_false_absence: 0,
      record_needs_missing_data: 0,
    },
  };
  try {
    const empties = emptyRequiredKeys(input.contract, input.intake);
    base.empty_required_keys = empties.slice(0, 40);
    base.counts.empty_required_keys = empties.length;
    if (empties.length > 0) base.failed_conditions.push("contract_incomplete");

    // Coverage telemetry is REQUIRED evidence: absent or crashed ⇒ fail-closed.
    const cov = input.coverage;
    const orphans = Number(cov?.counts?.orphans ?? NaN);
    base.counts.coverage_orphans = Number.isFinite(orphans) ? orphans : 0;
    if (!cov || cov.crashed || !Number.isFinite(orphans) || orphans > 0) {
      base.failed_conditions.push("coverage_orphans");
    }

    // CSC telemetry is REQUIRED evidence: absent or crashed ⇒ fail-closed.
    const csc = input.csc;
    const ids = FALSE_ABSENCE_CHECK_IDS[input.product] ?? [];
    const falseAbsence = (csc?.violations ?? []).filter((v) =>
      ids.includes(String(v?.check_id ?? ""))
    ).length;
    base.counts.csc_false_absence = falseAbsence;
    if (!csc || csc.crashed || falseAbsence > 0) base.failed_conditions.push("csc_false_absence");

    if (input.product === "cppa-risk") {
      const md = Number(input.recordNeedsMissingData ?? NaN);
      base.counts.record_needs_missing_data = Number.isFinite(md) ? md : 0;
      if (!Number.isFinite(md) || md > 0) {
        base.failed_conditions.push("risk_record_needs_missing_data");
      }
    }

    base.value = base.failed_conditions.length === 0;
    return base;
  } catch (e) {
    return {
      ...base,
      value: false,
      failed_conditions: [...new Set([...base.failed_conditions, "gate_error" as FailedCondition])],
    };
  }
}

// ---------------------------------------------------------------------------
// 1. PLACEHOLDER CLASSIFICATION
// ---------------------------------------------------------------------------
//
// THE RULE (deterministic, in this order):
//   0. The population is (i) every bracket completion token the document still
//      carries ("[TO COMPLETE …]", "[TO BE ASSESSED …]", "[TO BE COMPLETED …]")
//      and (ii) every `information_needed` ask.
//   1. FUTURE-ACT TEST — text naming an act to be performed (confirm, verify,
//      validate, audit, test, review, monitor, obtain, schedule, publish,
//      re-check, complete before …) and NOT naming a record the intake asks
//      for is an ACTION-ITEM.
//   2. RECORD-KEY TEST — the item is categorised with the shared ask-category
//      map; if the category maps to intake keys and AT LEAST ONE mapped key is
//      empty, it is a RECORD-GAP (the customer could have filled it).
//   3. If every mapped key is filled, it is an ACTION-ITEM (the fact is on the
//      record; what remains is an act).
//   4. Unmapped and non-future-act ⇒ RECORD-GAP (conservative: an item we
//      cannot place never buys the affirmative claim).
// A PRECONDITION is an action-item whose text ties it to a moment before
// processing begins (before launch / go-live / prior to processing / before
// deployment / precondition / pre-launch).

export const ACTION_ITEM_RE =
  /\b(confirm|confirming|confirmation|verify|verif(?:ying|ication)|validate|validation|re-?check|cross-?check|audit|test(?:ing)?|monitor(?:ing)?|review(?:ing)?|obtain|schedule[ds]?|scheduling|publish|re-?score|re-?assess|sign(?:-| )off|implement|deploy|train(?:ing)?|update)\b/i;

export const PRECONDITION_RE =
  /\b(before (?:the )?(?:processing|launch|go[- ]?live|deployment|roll[- ]?out|first use|any processing)|prior to (?:the )?(?:processing|launch|go[- ]?live|deployment|start)|pre[- ]?launch|precondition|before proceeding|before this assessment can be signed)\b/i;

/** Asks that demand a VALUE the intake could have carried. */
export const VALUE_DEMAND_RE =
  /\b(state|provide|supply|specify|record|name|identify|list|give|enter|fill in|complete the (?:field|entry)|answer)\b/i;

export const BRACKET_TOKEN_RE = /\[TO (?:BE )?(?:COMPLETE|COMPLETED|ASSESSED|CONFIRMED|DETERMINED|RE-SCORED)[^\]]*\]/gi;


export type PlaceholderClass = "record_gap" | "action_item";

export interface ClassifiedPlaceholder {
  text: string;
  origin: "bracket_token" | "information_needed";
  category_id: string;
  klass: PlaceholderClass;
  precondition: boolean;
  /** Mapped intake keys that are EMPTY — the evidence for a record-gap. */
  empty_keys: string[];
}

export interface PlaceholderClassification {
  version: string;
  items: ClassifiedPlaceholder[];
  counts: {
    total: number;
    record_gap: number;
    action_item: number;
    preconditions: number;
  };
}

function textOf(v: unknown): string {
  if (typeof v === "string") return v;
  if (!v || typeof v !== "object") return "";
  const o = v as Record<string, unknown>;
  return ["dimensions", "question", "information_needed", "topic", "field", "item", "enables", "note", "action"]
    .map((k) => (typeof o[k] === "string" ? (o[k] as string) : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
}

function collectBracketTokens(report: unknown): string[] {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === "string") {
      for (const m of node.matchAll(BRACKET_TOKEN_RE)) out.push(m[0]);
      return;
    }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (k === "_meta" || k === "_staging") continue;
        walk(v);
      }
    }
  };
  walk(report);
  return out;
}

/**
 * THE CLASSIFICATION RULE, in order:
 *   1. An ask that DEMANDS A VALUE ("state / provide / specify / record …") and
 *      points at an intake key the record leaves EMPTY is a RECORD GAP: the
 *      customer could have filled it in.
 *   2. Otherwise an ask phrased as a FUTURE ACT (confirm, verify, audit, test,
 *      schedule, publish, re-score, obtain, sign off …) is an ACTION ITEM: no
 *      intake answer closes it.
 *   3. Otherwise an ask whose category maps to an empty intake key is a RECORD
 *      GAP; an ask whose mapped keys the record supplies is an ACTION ITEM.
 *   4. An ask that maps nowhere falls back to RECORD GAP (fail-closed: it may
 *      not silently license the affirmative claim).
 */
export function classifyOpenItem(text: string, intake: unknown): ClassifiedPlaceholder {
  const cat = categorizeAsk(text);
  const keys = ASK_CATEGORY_INTAKE_KEYS[cat.id] ?? [];
  const emptyKeys = keys.filter((k) => !intakeKeyFilled(intake, k));
  // Keys the ask NAMES outright (snake_case tokens present in the record).
  const rec = (intake && typeof intake === "object" ? intake : {}) as Record<string, unknown>;
  const hay = String(text ?? "").toLowerCase();
  const namedEmpty = Object.keys(rec).filter((k) =>
    k.includes("_") && hay.includes(k.toLowerCase()) && !intakeKeyFilled(rec, k)
  );
  const demandsValue = VALUE_DEMAND_RE.test(text);
  const futureAct = ACTION_ITEM_RE.test(text);

  let klass: PlaceholderClass;
  if (demandsValue && (emptyKeys.length > 0 || namedEmpty.length > 0)) klass = "record_gap";
  else if (futureAct) klass = "action_item";
  else if (emptyKeys.length > 0 || namedEmpty.length > 0) klass = "record_gap";
  else if (keys.length > 0) klass = "action_item";
  else klass = "record_gap";

  return {
    text: text.replace(/\s+/g, " ").trim().slice(0, 240),
    origin: "information_needed",
    category_id: cat.id,
    klass,
    precondition: klass === "action_item" && PRECONDITION_RE.test(text),
    empty_keys: [...new Set([...emptyKeys, ...namedEmpty])],
  };
}


export function classifyPlaceholders(
  report: unknown,
  intake: unknown,
): PlaceholderClassification {
  const items: ClassifiedPlaceholder[] = [];
  try {
    for (const tok of collectBracketTokens(report)) {
      items.push({ ...classifyOpenItem(tok, intake), origin: "bracket_token" });
    }
    const asks = Array.isArray((report as Record<string, unknown>)?.information_needed)
      ? ((report as Record<string, unknown>).information_needed as unknown[])
      : [];
    for (const ask of asks) {
      const t = textOf(ask);
      if (!t) continue;
      items.push(classifyOpenItem(t, intake));
    }
  } catch { /* fail-open: whatever was classified stands */ }
  const record_gap = items.filter((i) => i.klass === "record_gap").length;
  const action_item = items.length - record_gap;
  return {
    version: RECORD_COMPLETE_VERSION,
    items,
    counts: {
      total: items.length,
      record_gap,
      action_item,
      preconditions: items.filter((i) => i.precondition).length,
    },
  };
}

// ---------------------------------------------------------------------------
// 2/3 — the affirmative paragraph and the banner
// ---------------------------------------------------------------------------

/** The item-380 affirmative paragraph. N = action items, M = preconditions. */
export function affirmativeParagraph(n: number, m: number): string {
  const head = "The record before this assessment is complete: every question the intake asks has been answered.";
  if (!n) return head;
  const itemWord = n === 1 ? "item" : "items";
  return `${head} What follows carries an action plan of ${n} ${itemWord} — ${m} ${
    m === 1 ? "precondition" : "preconditions"
  } to be completed before processing begins, and the remainder scheduled after launch.`;
}

export type BannerState = "draft_incomplete" | "action_plan" | "none";

export interface BannerDecision {
  state: BannerState;
  action_items: number;
  preconditions: number;
}

/**
 * The three-state banner decision. `recordComplete` is the truth gate; the
 * counts come from the classification. Absent telemetry ⇒ today's behaviour.
 */
export function decideBanner(
  recordComplete: boolean,
  classification: { counts?: { record_gap?: number; action_item?: number; preconditions?: number } } | null | undefined,
  legacyHasUnresolvedPlaceholders: boolean,
): BannerDecision {
  const c = classification?.counts ?? {};
  const actionItems = Number(c.action_item ?? 0);
  const preconditions = Number(c.preconditions ?? 0);
  if (!recordComplete) {
    return {
      state: legacyHasUnresolvedPlaceholders ? "draft_incomplete" : "none",
      action_items: actionItems,
      preconditions,
    };
  }
  if (Number(c.record_gap ?? 0) > 0) {
    return { state: "draft_incomplete", action_items: actionItems, preconditions };
  }
  return {
    state: actionItems > 0 ? "action_plan" : "none",
    action_items: actionItems,
    preconditions,
  };
}

export const DRAFT_BANNER_HTML =
  `<div style="background:#7c1a1a;color:#fff;padding:10px 16px;font-size:12px;font-weight:600;border-radius:6px;margin-bottom:16px;letter-spacing:0.03em;">⚠ DRAFT — REQUIRED INPUTS INCOMPLETE — DO NOT SIGN OR RELY ON THIS DOCUMENT until all fields marked [TO COMPLETE] and [TO BE ASSESSED] have been resolved.</div>`;

export function actionPlanBannerText(n: number, m: number): string {
  return `ACTION PLAN — This assessment records a complete intake and carries ${n} action ${
    n === 1 ? "item" : "items"
  }, ${m} of which ${m === 1 ? "is a precondition" : "are preconditions"} to the processing start date.`;
}

export function renderBannerHtml(decision: BannerDecision): string {
  if (decision.state === "draft_incomplete") return DRAFT_BANNER_HTML;
  if (decision.state !== "action_plan") return "";
  const txt = actionPlanBannerText(decision.action_items, decision.preconditions)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div style="background:#eef3f6;color:#0c2a44;border:1px solid #cfdde6;border-left:5px solid #0c2a44;padding:10px 16px;font-size:12px;font-weight:600;border-radius:6px;margin-bottom:16px;letter-spacing:0.02em;">${txt}</div>`;
}

// ---------------------------------------------------------------------------
// attach
// ---------------------------------------------------------------------------

export function attachRecordComplete(
  report: Record<string, unknown>,
  telemetry: RecordCompleteTelemetry,
  classification: PlaceholderClassification,
): void {
  const meta = (report._meta ??= {}) as Record<string, unknown>;
  const internal = (meta.internal ??= {}) as Record<string, unknown>;
  internal.record_complete = { ...telemetry };
  internal.placeholder_classification = classification;
}

export { hasPlaceholderToken };
