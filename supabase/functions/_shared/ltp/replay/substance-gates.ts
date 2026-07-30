/**
 * ITEM 253 — Substance gates.
 *
 * Pure evaluators over an assembled AssemblerResult + RenderPlan. Each
 * gate returns hard-failure strings (empty = pass). No mutation.
 *
 * Per Ruling A (docs/courier/ITEM250-RULING-A-GOLDEN-SHAPE-GATE-LOCATION-2026-07-29.md)
 * the golden-shape HARD ASSERT lives here: shortfall_keys non-empty ⇒
 * one hard failure entry per key.
 */
import type { RenderPlan, FactorTableEntry } from "../../render-plan/schema.ts";
import type { AssemblerResult } from "../pass2-assembler.ts";
import type { TemplateInstance } from "../section-composers/cppa-risk.ts";
import { composeSection, KIND_OPENERS } from "../section-composers/cppa-risk.ts";
import { evaluateGoldenShape } from "../golden-shape-quotas.ts";
import { INTAKE_FIELD_DISPLAY_LABELS } from "../grounded-note.ts";
import type { SubstanceGateConfig, SubstanceMetrics } from "./types.ts";

const RATIFIED_STEMS: ReadonlySet<string> = new Set(
  Object.values(KIND_OPENERS),
);
export { RATIFIED_STEMS };

export interface SubstanceEvaluation {
  readonly metrics: SubstanceMetrics;
  readonly hard_failures: readonly string[];
}

/** presence_rate = present factors / total factors. */
export function presenceRate(
  plan: RenderPlan,
  cfg?: SubstanceGateConfig,
): {
  rate: number;
  present: number;
  total: number;
  failure?: string;
  review_band_low?: boolean;
  review_band_high?: boolean;
} {
  const total = plan.factor_table.length;
  const present = plan.factor_table.filter((f) => f.present_in_intake).length;
  const rate = total === 0 ? 0 : present / total;
  let failure: string | undefined;
  if (cfg?.min_presence_rate !== undefined && rate < cfg.min_presence_rate) {
    failure = `presence_rate:${rate.toFixed(3)}<${cfg.min_presence_rate}`;
  }
  // Item 254 — advisory band flags. Only meaningful once we're at/above
  // the hard floor; a rate below the floor is already a hard failure and
  // the low-band flag is redundant noise there.
  let review_band_low: boolean | undefined;
  let review_band_high: boolean | undefined;
  if (cfg?.review_low !== undefined || cfg?.review_high !== undefined) {
    const atOrAboveFloor =
      cfg?.min_presence_rate === undefined || rate >= cfg.min_presence_rate;
    review_band_low =
      atOrAboveFloor && cfg?.review_low !== undefined && rate < cfg.review_low;
    review_band_high =
      cfg?.review_high !== undefined && rate > cfg.review_high;
  }
  return { rate, present, total, failure, review_band_low, review_band_high };
}

/**
 * noteSpecificity: every PRESENT factor must have ≥1 intake_ledger_ref AND
 * a weight_note that is not the "no record evidence" fossil.
 */
export function noteSpecificity(plan: RenderPlan): {
  factors_with_ledger_refs: number;
  note_token_diversity: number;
  failures: readonly string[];
} {
  const failures: string[] = [];
  const presentFactors: FactorTableEntry[] = plan.factor_table.filter(
    (f) => f.present_in_intake,
  );
  let withRefs = 0;
  const noteTokens = new Set<string>();
  for (const f of presentFactors) {
    if (f.intake_ledger_refs.length >= 1) withRefs += 1;
    else failures.push(`note_specificity:no_ledger_ref:${f.factor_id}`);
    const note = (f.weight_note ?? "").trim();
    if (!note) {
      failures.push(`note_specificity:missing_weight_note:${f.factor_id}`);
    } else if (/no record evidence/i.test(note)) {
      failures.push(`note_specificity:fossil_no_record_evidence:${f.factor_id}`);
    } else {
      for (const tok of note.toLowerCase().split(/\W+/).filter(Boolean)) {
        noteTokens.add(tok);
      }
    }
  }
  return {
    factors_with_ledger_refs: withRefs,
    note_token_diversity: noteTokens.size,
    failures,
  };
}

/**
 * actionDiversity: over composed priority_actions instances, no two
 * CONSECUTIVE actions share KIND opener stem AND element label. Ratified
 * stems (KIND_OPENERS values) are exempt from prefix-only checks per
 * SPEC §6 — this evaluator only fails on FULL (stem+label) duplication.
 */
export function actionDiversity(plan: RenderPlan): {
  ok: boolean;
  failures: readonly string[];
} {
  const instances: TemplateInstance[] =
    (composeSection("priority_actions", plan) as TemplateInstance[] | null) ?? [];
  const failures: string[] = [];
  for (let i = 1; i < instances.length; i += 1) {
    const prev = instances[i - 1];
    const cur = instances[i];
    const prevLabel = String((prev.ctx as Record<string, unknown>).element_short_label ?? "");
    const curLabel = String((cur.ctx as Record<string, unknown>).element_short_label ?? "");
    const prevStem = matchStem(prevLabel);
    const curStem = matchStem(curLabel);
    if (
      prevStem !== null &&
      curStem !== null &&
      prevStem === curStem &&
      prevLabel === curLabel
    ) {
      failures.push(`action_diversity:consecutive_dup:${i}:${curStem}`);
    }
  }
  return { ok: failures.length === 0, failures };
}

function matchStem(label: string): string | null {
  for (const stem of RATIFIED_STEMS) {
    if (label.startsWith(stem)) return stem;
  }
  return null;
}

/** goldenShapeHard — Ruling A hard-assert site. */
export function goldenShapeHard(report: Record<string, unknown>): {
  review_flag: boolean;
  shortfall_keys: readonly string[];
  failures: readonly string[];
} {
  const gs = evaluateGoldenShape(report);
  return {
    review_flag: gs.review_flag,
    shortfall_keys: gs.shortfall_keys,
    failures: gs.shortfall_keys.map((k) => `golden_shape:${k}`),
  };
}

/**
 * ITEM 262 — UNRESOLVED-SLOT LITERAL ("entity name" class) HARNESS ASSERT.
 *
 * SPEC §6 structure-side check, sited here per Ruling A. If the assembled
 * report text carries a field LABEL where a VALUE belongs (the ramp-1
 * attempt-6 residue "On entity name's record..."), the run hard-fails.
 *
 * Two literal classes:
 *   (1) the bare "entity name" label — a field label, never plausible
 *       customer prose in an assembled assessment;
 *   (2) any INTAKE_FIELD_DISPLAY_LABELS entry in possessive form
 *       ("<label>'s"), which can only arise from a label/value swap.
 */
export function evaluateLabelResidue(report: Record<string, unknown>): {
  matches: readonly string[];
  failures: readonly string[];
} {
  const text = JSON.stringify(report ?? {});
  const matches: string[] = [];
  const push = (m: string) => {
    if (!matches.includes(m)) matches.push(m);
  };

  if (/\bentity name\b/i.test(text)) push("entity name");

  for (const label of Object.values(INTAKE_FIELD_DISPLAY_LABELS)) {
    const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // possessive form: "<label>'s" (straight or curly apostrophe)
    const re = new RegExp(`\\b${esc}['\u2019]s\\b`, "i");
    if (re.test(text)) push(`${label}'s`);
  }

  return { matches, failures: matches.map((m) => `label_residue:${m}`) };
}

/**
 * ITEM 266 — SAME-SECTION DUPLICATION DETECTOR (loop2 "no verbatim
 * duplication" law as a deterministic check; Ruling-A location).
 *
 * For every top-level LIST section on the shipped report, two items that
 * are byte-identical — or identical after whitespace normalisation —
 * produce a hard failure "section_duplication:<key>:<i>=<j>".
 *
 * Evidence: ramp-1 attempt 8 (job 54a21294) shipped four
 * risk_assessment_by_activity items of 5,506 chars each, items 0 and 1
 * byte-identical.
 */
export function evaluateSectionDuplication(report: Record<string, unknown>): {
  failures: readonly string[];
} {
  const failures: string[] = [];
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  for (const [key, val] of Object.entries(report ?? {})) {
    if (!Array.isArray(val)) continue;
    const items = val.filter((v): v is string => typeof v === "string");
    if (items.length < 2) continue;
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        if (items[i] === items[j] || norm(items[i]) === norm(items[j])) {
          failures.push(`section_duplication:${key}:${i}=${j}`);
        }
      }
    }
  }
  failures.push(...evaluateCrossSectionDuplication(report).failures);
  return { failures };
}

/**
 * ITEM 273 FIX 4 — CROSS-SECTION DUPLICATION (GTM class
 * `section_cross_duplication`, MATERIAL). A passage of ≥200 characters
 * that appears byte-identical (after whitespace normalisation) in TWO
 * DIFFERENT top-level sections is a composition failure — evidence: the
 * balance paragraph duplicated between the executive summary and the
 * assessment summary in the CEO read.
 */
export const CROSS_SECTION_DUP_MIN_CHARS = 200;

export function evaluateCrossSectionDuplication(
  report: Record<string, unknown>,
): { failures: readonly string[] } {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const seen = new Map<string, string>();
  const failures: string[] = [];
  const consider = (key: string, raw: string) => {
    const s = norm(raw);
    if (s.length < CROSS_SECTION_DUP_MIN_CHARS) return;
    const prev = seen.get(s);
    if (prev === undefined) {
      seen.set(s, key);
    } else if (prev !== key) {
      const id = `section_cross_duplication:${prev}=${key}`;
      if (!failures.includes(id)) failures.push(id);
    }
  };
  for (const [key, val] of Object.entries(report ?? {})) {
    if (typeof val === "string") consider(key, val);
    else if (Array.isArray(val)) {
      for (const v of val) if (typeof v === "string") consider(key, v);
    }
  }
  return { failures };
}

/**
 * ITEM 273 FIX 1(e) — OWNER-SLOT PII DETECTOR (GTM class
 * `pii_owner_name`, MATERIAL). Scans the text that follows an "Owner:"
 * label in priority_actions for (i) parenthesised capitalized bigrams
 * and (ii) closed-list narrative verbs — the two shapes in which
 * personnel names and narrative leaked into Owner slots (CEO-read
 * finding 3).
 *
 * HONEST LIMITS: heuristic, not a name recogniser. A single-token
 * surname, a name with no capitalisation, or a name in a role-shaped
 * segment ("Officer Trent") will not trip it; a legitimate two-word
 * capitalized proper title inside parentheses would false-positive. It
 * catches the observed defect shapes, nothing more.
 */
export const OWNER_SLOT_NARRATIVE_TOKENS: readonly string[] = [
  "is", "are", "has", "have", "been", "was", "remains", "vacant",
  "following", "assigned", "departure", "since",
];

export function evaluateOwnerSlotPii(report: Record<string, unknown>): {
  matches: readonly string[];
  failures: readonly string[];
} {
  const actions = (report ?? {})["priority_actions"];
  const texts: string[] = [];
  const collect = (v: unknown) => {
    if (typeof v === "string") texts.push(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === "object") Object.values(v as Record<string, unknown>).forEach(collect);
  };
  collect(actions);

  const matches: string[] = [];
  const push = (m: string) => {
    if (!matches.includes(m)) matches.push(m);
  };
  const narrativeRe = new RegExp(
    `\\b(?:${OWNER_SLOT_NARRATIVE_TOKENS.join("|")})\\b`,
    "i",
  );

  for (const t of texts) {
    const re = /Owner:\s*([^\n]*)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      const slot = m[1];
      const paren = /\(([^)]*)\)/g;
      let p: RegExpExecArray | null;
      while ((p = paren.exec(slot)) !== null) {
        if (/\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(p[1])) push(`paren_name:${p[1].trim()}`);
      }
      if (narrativeRe.test(slot)) push(`narrative:${slot.trim().slice(0, 80)}`);
    }
  }
  return { matches, failures: matches.map((m) => `pii_owner_name:${m}`) };
}

/**
 * ITEM 273 FIX 4 — ACTIVITY-COUNT CONTRADICTION (GTM class
 * `activity_count_contradiction`, MATERIAL). The executive summary
 * states an activity count in prose; the scope section enumerates the
 * engaged § 7150(b) prongs. PDF4 in the CEO read said "3" while scope
 * showed 4 engaged. Mismatch → hard failure.
 */
const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
};

export function evaluateActivityCountContradiction(
  report: Record<string, unknown>,
): { failures: readonly string[]; stated?: number; engaged?: number } {
  const flatten = (v: unknown, acc: string[]): string[] => {
    if (typeof v === "string") acc.push(v);
    else if (Array.isArray(v)) v.forEach((x) => flatten(x, acc));
    else if (v && typeof v === "object") {
      Object.values(v as Record<string, unknown>).forEach((x) => flatten(x, acc));
    }
    return acc;
  };
  const execText = flatten((report ?? {})["executive_summary"], []).join(" ");
  const scopeText = flatten((report ?? {})["scope"], []).join(" ");
  if (!execText || !scopeText) return { failures: [] };

  const m = execText.match(
    /\b(one|two|three|four|five|six|\d+)\s+(?:processing\s+)?activit(?:y|ies)\b/i,
  );
  if (!m) return { failures: [] };
  const token = m[1].toLowerCase();
  const stated = NUMBER_WORDS[token] ?? Number(token);
  if (!Number.isFinite(stated)) return { failures: [] };

  const prongs = new Set<string>();
  for (const p of scopeText.matchAll(/7150\(b\)\((\d)\)/g)) prongs.add(p[1]);
  const engaged = prongs.size;
  if (engaged === 0) return { failures: [], stated };

  return stated === engaged
    ? { failures: [], stated, engaged }
    : {
      failures: [`activity_count_contradiction:exec=${stated}:scope=${engaged}`],
      stated,
      engaged,
    };
}


/** Aggregate evaluator used by the runner. */
export function evaluateSubstance(
  plan: RenderPlan,
  result: AssemblerResult,
  cfg?: SubstanceGateConfig,
): SubstanceEvaluation {
  const pr = presenceRate(plan, cfg);
  const ns = noteSpecificity(plan);
  const ad = actionDiversity(plan);
  const gs = goldenShapeHard(result.report);
  const lr = evaluateLabelResidue(result.report);
  const sd = evaluateSectionDuplication(result.report);
  const op = evaluateOwnerSlotPii(result.report);
  const ac = evaluateActivityCountContradiction(result.report);
  const failures = [
    ...(pr.failure ? [pr.failure] : []),
    ...ns.failures,
    ...ad.failures,
    ...gs.failures,
    ...lr.failures,
    ...sd.failures,
    ...op.failures,
    ...ac.failures,
  ];

  return {
    metrics: {
      presence_rate: pr.rate,
      present_factor_count: pr.present,
      factors_with_ledger_refs: ns.factors_with_ledger_refs,
      note_token_diversity: ns.note_token_diversity,
      action_kind_diversity_ok: ad.ok,
      ...(pr.review_band_low !== undefined
        ? { review_band_low: pr.review_band_low }
        : {}),
      ...(pr.review_band_high !== undefined
        ? { review_band_high: pr.review_band_high }
        : {}),
      golden_shape: {
        review_flag: gs.review_flag,
        shortfall_keys: gs.shortfall_keys,
      },
    },
    hard_failures: failures,
  };
}
