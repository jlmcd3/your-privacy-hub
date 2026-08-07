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

export const RECORD_COMPLETE_VERSION = "record-complete-2026-08-05-item380r5";

// ITEM 383 leg 1 — "lia" joins the union. LIA has NO coverage matrix and NO
// CSC yet (those land in later legs), so the fail-closed rules keep the LIA
// gate value FALSE with `coverage_orphans` + `csc_false_absence` in
// failed_conditions. That is correct and intended for this leg.
// ITEM 393 leg B — "cppa-admt" joins the union, FAIL-CLOSED. ADMT has NO
// coverage matrix and NO CSC pass yet (the CSC leg follows), so the
// fail-closed arms keep the ADMT gate value FALSE with `coverage_orphans` +
// `csc_false_absence` in failed_conditions. That is correct for this leg.
// ITEM 401 leg B — "governance" joins the union, FAIL-CLOSED. Governance has
// NO coverage matrix and NO CSC pass yet (the CSC leg follows), so the
// fail-closed arms keep the governance gate value FALSE with
// `coverage_orphans` + `csc_false_absence` in failed_conditions. That is
// correct and intended for this leg.
export type RecordCompleteProduct = "dpia" | "cppa-risk" | "lia" | "cppa-admt" | "governance";

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
  /** ITEM 380 r5 — ASKED contract keys that are empty (capped at 40). */
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
 * SYSTEM KEYS — contract entries that are not questions at all.
 *
 * ITEM 380 r5b. `source_assessment_id` is a revision pointer the app writes;
 * no form control ever presents it, so the gate must never count it as an
 * unanswered ask. Add keys here only when the intake UI presents no control
 * for them.
 */
export const SYSTEM_KEYS: ReadonlySet<string> = new Set<string>([
  "source_assessment_id",
  // ITEM 383 leg 1 — the LIA Stage-B payload carries the id of the preview row
  // the app created; no form control presents it. It is a pointer, not a
  // question. No other contract in the union declares this key, so DPIA and
  // Risk gate behaviour is byte-identical.
  "preview_assessment_id",
]);

/**
 * A conditional field counts as TRIGGERED only when the record itself shows the
 * trigger. Two deterministic predicate shapes are supported:
 *
 *   1. ARRAY-ROW (legacy): the field sits inside an array segment ("rows[].x")
 *      and that array has at least one row.
 *   2. VALUE-EQUALS (ITEM 380 r5b): the field carries `trigger: { key, equals }`
 *      mirroring the form's show/hide condition; triggered when the value at
 *      `trigger.key` is verbatim one of `equals`.
 *
 * Conditionals whose predicate is prose we cannot parse are left unchecked
 * (they cannot make the claim false, and they cannot make it true).
 */
function conditionalTriggered(intake: Record<string, unknown>, f: IntakeField): boolean {
  if (f.trigger) {
    const vals = readPath(intake, f.trigger.key);
    return vals.some((v) => typeof v === "string" && f.trigger!.equals.includes(v));
  }
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

/**
 * ITEM 380 r5 — the keys the intake ACTUALLY ASKED of this record and that the
 * record leaves empty.
 *
 * The affirmative sentence the gate licenses is "every question the intake asks
 * has been answered". `emptyRequiredKeys` could not test that sentence: it
 * ignored `required: "optional"` fields entirely, so a record that answered the
 * eleven always-required DPIA questions and skipped thirty-nine presented ones
 * still read as complete. This function tests the sentence literally:
 *
 *   asked  = every contract field
 *   EXCEPT conditionals whose trigger is not met (skip-logic questions the form
 *          never put on screen — they were not asked, so they cannot be
 *          unanswered).
 *
 * Optional-but-presented fields COUNT. Computed on the raw customer record.
 */
export function emptyAskedKeys(
  contract: IntakeContract,
  intake: unknown,
): string[] {
  const rec = (intake && typeof intake === "object" ? intake : {}) as Record<string, unknown>;
  const out: string[] = [];
  for (const f of contract.fields) {
    // System/revision keys are not questions (r5b).
    if (SYSTEM_KEYS.has(f.key)) continue;
    // ITEM 380 r5c — the contract marks this control as one the form presents
    // unconditionally AND whose empty state IS a substantive answer, so an
    // empty value is an answer, not an unanswered ask.
    if (f.emptyIsAnswer === true) continue;
    // Skip-logic: a conditional whose trigger the record does not show was
    // never asked.
    if (f.required === "conditional" && !conditionalTriggered(rec, f)) continue;

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
  // ITEM 385 LEG 2 — the LIA CSC pass (`_shared/ltp/lia-csc.ts`) now runs, so
  // the gate reads real evidence: an UNREPAIRED l2 violation is a false
  // absence claim about a record that supplies the fact.
  lia: ["l2_absence_claim_vs_record"],
  // ITEM 394 LEG C — the ADMT CSC pass (`_shared/ltp/admt-csc.ts`) now runs,
  // so the gate reads real evidence: an UNREPAIRED a2 violation is a false
  // absence claim about a record that supplies the fact.
  "cppa-admt": ["a2_absence_claim_vs_record"],
  // ITEM 401 LEG B — governance has no CSC pass yet; the empty list means the
  // gate can never count a governance false-absence violation, and the
  // absent-telemetry arm holds the gate shut until the CSC leg lands.
  governance: [],

};

export interface RecordCompleteInput {
  readonly product: RecordCompleteProduct;
  readonly contract: IntakeContract;
  readonly intake: unknown;
  /** `_meta.internal.<product>_coverage` telemetry. */
  readonly coverage?: { counts?: { orphans?: number }; crashed?: boolean } | null;
  /** `_meta.internal.<product>_csc` telemetry. */
  readonly csc?: { violations?: Array<{ check_id?: string; repaired?: boolean }>; crashed?: boolean } | null;
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
    // ITEM 380 r5 — the condition now tests the sentence it licenses: every
    // question the intake ASKED must be answered (optional-but-presented
    // fields included; untriggered skip-logic questions excluded).
    const empties = emptyAskedKeys(input.contract, input.intake);
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
    // ITEM 380 r2 (DEFECT A) — count only UNREPAIRED false-absence violations.
    // A violation the CSC pass REPAIRED proves the record SUPPLIED the fact:
    // the absence phrasing was generator error, not record incompleteness, and
    // the shipped document no longer carries it. Counting repaired violations
    // held the gate shut on every live document (CSC repairs are routine).
    // Fail-closed behaviour for absent/crashed telemetry is unchanged.
    const falseAbsence = (csc?.violations ?? []).filter((v) =>
      ids.includes(String(v?.check_id ?? "")) && v?.repaired !== true
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
  /\b(confirm|confirming|confirmation|verify|verif(?:ying|ication)|validate|validation|re-?check|cross-?check|audit|test(?:ing)?|monitor(?:ing)?|review(?:ing)?|obtain|schedule[ds]?|scheduling|publish|re-?score|re-?assess|sign(?:-| )off|implement|deploy|train(?:ing)?|update|assign(?:ing|ed)?|appoint(?:ing)?|designate(?:d)?|designating|attach(?:ing|ed)?|conclude|concluding|draw up|drawing up)\b/i;

export const PRECONDITION_RE =
  /\b(before (?:the )?(?:processing|launch|go[- ]?live|deployment|roll[- ]?out|first use|any processing)|prior to (?:the )?(?:processing|launch|go[- ]?live|deployment|start)|pre[- ]?launch|precondition|before proceeding|before this assessment can be signed)\b/i;

/**
 * Asks that demand a VALUE the intake could have carried.
 *
 * ITEM 380 r2 (DEFECT D) — "record" is BOTH a verb ("record the retention
 * period") and, far more often in our prose, a NOUN ("The record does not yet
 * include …"). The bare `\brecord\b` alternative therefore matched nearly
 * every ask and forced it down the record-gap branch. The verb sense is now
 * matched explicitly and ONLY when it is used imperatively — `record` followed
 * by a determiner/wh-word — and never when it is preceded by a determiner
 * (the/this/that/present/a/our/its/their/no/each/whose), which marks the noun.
 */
export const VALUE_DEMAND_RE =
  /\b(state|provide|supply|specify|name|identify|list|give|enter|fill in|complete the (?:field|entry)|answer)\b|(?<!\b(?:the|this|that|present|a|our|its|their|no|each|whose)\s)\brecord\s+(?:the|a|an|each|every|all|its|their|this|these|any|both|when|who|what|which|how|where|why)\b/i;

export const BRACKET_TOKEN_RE = /\[TO (?:BE )?(?:COMPLETE|COMPLETED|ASSESSED|CONFIRMED|DETERMINED|RE-SCORED)[^\]]*\]/gi;

// ---------------------------------------------------------------------------
// ITEM 399 (FIX 4) — THE BRACKET TOKEN CATALOG
// ---------------------------------------------------------------------------
//
// THE DEFECT (doc afa8c910-d1ba-4f01-90a7-e06be9c99daf, batch 3cb1f213)
// ---------------------------------------------------------------------
// "[TO BE RE-SCORED by organisation once Conditions 1-6 are met]" fell through
// the prose rule chain to the conservative rule-4 fallback and classified
// `record_gap`, because its phrasing matched no ask-category vocabulary and
// bracket tokens are (correctly) excluded from the r4 gate-aware fallback. On
// the PERFECT fixture that single token re-created the DRAFT-banner-over-an-
// affirmative-record contradiction.
//
// THE FIX, AT THE HONEST LEVEL
// ----------------------------
// A bracket token is not prose. Its verb IS its classification, and the verb
// is fixed by the catalog below, regardless of the words that follow it:
//
//   ACTION class  — [TO BE RE-SCORED / RE-ASSESSED / ASSESSED / CONFIRMED /
//                    DETERMINED / VALIDATED / VERIFIED / REVIEWED]
//                   These name an act a human performs ON the finished
//                   document. No intake answer closes them.
//   RECORD-GAP    — [TO COMPLETE / TO BE COMPLETED / TO BE PROVIDED /
//     class         TO BE SPECIFIED / TO BE SUPPLIED]
//                   These name a VALUE the record should have carried.
//
// A token matching neither list returns `null` and keeps the prose rule chain
// exactly as it was. The gate-FALSE banner decision is byte-identical by
// construction: `decideBanner` ignores the classification counts entirely when
// `recordComplete` is false.
const BRACKET_ACTION_RE =
  /\[\s*TO\s+BE\s+(?:RE-?\s?SCORED|RE-?\s?ASSESSED|ASSESSED|CONFIRMED|DETERMINED|VALIDATED|VERIFIED|REVIEWED|SIGNED(?:\s+OFF)?)\b/i;

const BRACKET_RECORD_GAP_RE =
  /\[\s*TO\s+(?:COMPLETE|BE\s+(?:COMPLETED|PROVIDED|SPECIFIED|SUPPLIED|STATED|NAMED))\b/i;

/**
 * Classify a bracket completion token by the TOKEN CATALOG alone.
 * Returns `null` when the token is outside the catalog (prose rules apply).
 */
export function classifyBracketToken(token: string): PlaceholderClass | null {
  const t = String(token ?? "");
  if (BRACKET_ACTION_RE.test(t)) return "action_item";
  if (BRACKET_RECORD_GAP_RE.test(t)) return "record_gap";
  return null;
}




/**
 * ITEM 380 r2 (DEFECTS B + D) — BY-DESIGN ACTION SURFACES.
 *
 * Deterministic substring anchors naming surfaces that are, by construction,
 * post-generation ACTS a human performs on the finished document — never facts
 * an intake form could have carried. An ask anchored to any of these is an
 * ACTION ITEM regardless of the other rules:
 *
 *   DPIA  · technical_sheet.completion_date        (the date the sheet is completed)
 *         · technical_sheet.formal_validation_date (the date the DPO/controller validates)
 *         · sign_off_template                      (the signature block itself)
 *   RISK  · 11 CCR § 7152(a)(7) — the decision whether to INITIATE the
 *           processing, which the regulation reserves to the business.
 *
 * Anchors are matched case-insensitively as plain substrings on the ask text.
 */
export const BY_DESIGN_ACTION_ANCHORS: readonly string[] = [
  "technical_sheet.completion_date",
  "technical_sheet.formal_validation_date",
  "sign_off_template",
  "section_6_conclusion.sign_off",
];

/** Risk: the reserved § 7152(a)(7) initiate-the-processing decision. */
export const RESERVED_INITIATE_RE =
  /7152\(a\)\(7\)|decision whether to initiate the processing/i;

export function isByDesignActionSurface(text: string): boolean {
  const hay = String(text ?? "").toLowerCase();
  if (BY_DESIGN_ACTION_ANCHORS.some((a) => hay.includes(a))) return true;
  return RESERVED_INITIATE_RE.test(String(text ?? ""));
}

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
 *
 * ITEM 380 r4 — GATE-AWARE FALLBACK. Rule 4 is conservative because an
 * unplaceable ask must never BUY the affirmative claim. But when the truth gate
 * has ALREADY held on independent evidence (contract complete, coverage clean,
 * CSC clean), an ask that maps to NO intake key and names NO empty key is by
 * construction not fillable from the record — the customer answered everything
 * we ask — so it is an ACTION ITEM. `recordComplete` is the gate value computed
 * by `computeRecordComplete` BEFORE classification; when it is FALSE (the
 * default) behaviour is byte-identical to r3.
 */
export function classifyOpenItem(
  text: string,
  intake: unknown,
  recordComplete = false,
): ClassifiedPlaceholder {
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
  const nothingEmpty = emptyKeys.length === 0 && namedEmpty.length === 0;

  let klass: PlaceholderClass;
  // ITEM 380 r2 — BY-DESIGN ACTION SURFACES are evaluated ahead of the rule
  // chain (including the conservative rule-4 fallback): these surfaces are
  // never intake-fillable, so no empty-key evidence can make them record gaps.
  if (isByDesignActionSurface(text)) klass = "action_item";
  // ITEM 380 r4 — gate-aware fallback (gate TRUE only, nothing empty).
  else if (recordComplete && nothingEmpty) klass = "action_item";
  else if (demandsValue && (emptyKeys.length > 0 || namedEmpty.length > 0)) klass = "record_gap";
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
  /** ITEM 380 r4 — the gate value; FALSE (default) reproduces r3 exactly. */
  recordComplete = false,
): PlaceholderClassification {
  const items: ClassifiedPlaceholder[] = [];
  try {
    for (const tok of collectBracketTokens(report)) {
      // Bracket tokens are UNAFFECTED by the r4 fallback: they classify by
      // their own token rule and never ride the gate.
      // ITEM 399 (FIX 4) — and that token rule is the TOKEN CATALOG, not the
      // surrounding words. See `classifyBracketToken`.
      const base = classifyOpenItem(tok, intake);
      const catalog = classifyBracketToken(tok);
      items.push({
        ...base,
        origin: "bracket_token",
        klass: catalog ?? base.klass,
        precondition: (catalog ?? base.klass) === "action_item" && PRECONDITION_RE.test(tok),
      });
    }
    const asks = Array.isArray((report as Record<string, unknown>)?.information_needed)
      ? ((report as Record<string, unknown>).information_needed as unknown[])
      : [];
    for (const ask of asks) {
      const t = textOf(ask);
      if (!t) continue;
      items.push(classifyOpenItem(t, intake, recordComplete === true));
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
