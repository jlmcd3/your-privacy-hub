/**
 * ITEM 428-B (DEFECT 1) — RE-HOMED REFERRAL PROSE OFF THE SUMMARY SURFACES.
 *
 * CEO RATIFICATION (2026-08-09, ITEM 428-C): the SUPPRESSION path is law.
 * Where a lifted referral sentence is a restatement the deterministic reserved
 * `priority_actions` rows already own, and it would not keep its host leaf
 * gate-clean under `isSanctionedCounselRegister`, the sentence is suppressed
 * from every customer surface and preserved VERBATIM under `_meta.internal`
 * (a machine surface the gate never walks). No exemption is ever added to the
 * gate for `e6_counsel_referral`.
 *
 * ITEM 428-C (DEFECT 1) adds a THIRD surface to this pass:
 * `$.risk_assessment_by_activity`. The emit gate runs inside `seal(...)`,
 * BEFORE the ITEM-427 canonical re-emission in `risk-activity-emit.ts`, so the
 * gate honestly walks the pre-gate (model/template-composed) activity surface —
 * on which a writer parked the reserved-determination referral sentence the
 * reserved rows already carry. The sentence never reaches the persisted record
 * (the 427 emitter rewrites the shape), so the fix is at the WRITER side of the
 * gate: the same deterministic strip, over every string leaf of that surface.

 *
 * The Piece-B consolidation left two writers parking reserved-determination /
 * counsel-referral prose on SUMMARY surfaces:
 *
 *   $.executive_summary            — the one verdict voice (G-2), and
 *   $.assessment_summary.narrative — a prose leaf on what the 428 spec makes
 *                                    a TYPED FACT STRIP.
 *
 * The G-3 register rule says reserved-determination content lives in the
 * reserved-judgment block of the weighing/actions architecture — the typed
 * `priority_actions` rows that carry `reserved_to`. This pass is the SINGLE
 * WRITE SITE that enforces both halves of that rule, and it runs BEFORE the
 * emit gate, because the defect is a WRITER defect: the gate was correctly
 * flagging what the writers still wrote.
 *
 * THREE LAWS:
 *   (a) reserved-determination referral sentences are lifted OFF the summary
 *       surfaces and re-homed BYTE-IDENTICALLY onto the reserved-judgment
 *       action row that owns the pinpoint they cite. A sentence is appended
 *       ONLY when the host leaf stays gate-clean under the gate's OWN
 *       sanctioned-register predicate (`isSanctionedCounselRegister`, read,
 *       never edited). When it would not, the sentence is a RESTATEMENT of
 *       what the deterministic reserved row already says: it is suppressed
 *       from every customer surface and preserved verbatim under
 *       `_meta.internal` (a machine surface the gate never walks).
 *   (b) `assessment_summary` carries NO prose leaf. The `narrative` key is
 *       removed here, and its non-referral verdict sentence is carried on
 *       `_meta.internal` so the G-2 executive-summary builder keeps the same
 *       verdict it had before.
 *   (c) the verdict voice never carries counsel-referral framing (R2/R7).
 *
 * Pure, fail-open, mutates in place, never reads or writes a stored row.
 */

import { isSanctionedCounselRegister } from "../emit-gate.ts";
import { isActionRecord } from "../report-contracts/action-record.ts";

export const RISK_SUMMARY_REHOME_VERSION = "risk-summary-rehome@item428c-2026-08-09";

/** Substance floor shared with the ITEM 384 r2 empty-surface guard. */
const MIN_SURFACE_SUBSTANCE = 40;

const VERDICT_SENTENCE_RE = /\boutweigh|\bbalanc(?:e|ing)\b|\bconclusion\b/i;

export interface SummaryRehomeSummary {
  readonly version: string;
  /** Referral sentences lifted off `$.executive_summary`. */
  readonly exec_sentences_moved: number;
  /** True when an `assessment_summary.narrative` prose leaf was removed. */
  readonly narrative_removed: boolean;
  /** ITEM 428-C — referral sentences lifted off `$.risk_assessment_by_activity`. */
  readonly activity_sentences_moved: number;
  /** Sentences appended to a reserved-judgment action row. */
  readonly rehomed: number;
  /** Restatements suppressed (kept verbatim below, never on a customer leaf). */
  readonly suppressed: readonly string[];
  /** Non-referral verdict sentence carried for the G-2 builder. */
  readonly carried_verdict: string;
  readonly crashed?: boolean;
}


function splitSentences(s: string): string[] {
  return String(s ?? "")
    .split(/(?<=[.!?])\s+(?=[A-Z“"(])/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/**
 * A reserved-determination / counsel-referral sentence: it names counsel AND
 * frames a reservation or a consultation. Deterministic, no model.
 */
export function isReservedReferralSentence(s: string): boolean {
  const t = String(s ?? "");
  if (!/\bcounsel\b/i.test(t)) return false;
  return /\breserv/i.test(t) || /\bin consultation with\b/i.test(t) || /\bconsult\b/i.test(t);
}

function asParagraph(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string").join("\n\n");
  return "";
}

/** Strip referral sentences from a paragraph block; returns kept text + moved. */
function strip(text: string): { kept: string; moved: string[] } {
  const moved: string[] = [];
  const paras = String(text ?? "").split(/\n{2,}/);
  const keptParas: string[] = [];
  for (const p of paras) {
    const kept: string[] = [];
    for (const s of splitSentences(p)) {
      if (isReservedReferralSentence(s)) moved.push(s);
      else kept.push(s);
    }
    const joined = kept.join(" ").trim();
    if (joined) keptParas.push(joined);
  }
  return { kept: keptParas.join("\n\n").trim(), moved };
}

/** The reserved-judgment row that owns the pinpoint the sentence cites. */
function pickReservedRow(
  rows: unknown[],
  sentence: string,
): Record<string, unknown> | null {
  const reserved = rows.filter(
    (r) =>
      isActionRecord(r) &&
      typeof (r as Record<string, unknown>).reserved_to === "string" &&
      String((r as Record<string, unknown>).reserved_to ?? "").trim().length > 0,
  ) as Record<string, unknown>[];
  if (reserved.length === 0) return null;
  const byPinpoint = reserved.find((r) => {
    const pin = String(r.statutory_basis ?? "").trim();
    return pin.length > 0 && sentence.includes(pin);
  });
  return byPinpoint ?? reserved[0];
}

/**
 * ITEM 428-C (DEFECT 1) — strip referral sentences from EVERY string leaf of
 * the pre-gate `risk_assessment_by_activity` surface (legacy strings and typed
 * records alike). Determination machinery is never swept: this walks customer
 * prose leaves only, and a leaf whose whole content is the referral sentence
 * becomes empty and is dropped from the array it sat in.
 */
function sweepActivityReferrals(report: Record<string, unknown>): string[] {
  const moved: string[] = [];
  const surface = report.risk_assessment_by_activity;
  if (!Array.isArray(surface)) return moved;

  const scrub = (value: unknown): unknown => {
    if (typeof value === "string") {
      if (!isReservedReferralSentence(value) && !/\bcounsel\b/i.test(value)) return value;
      const { kept, moved: m } = strip(value);
      if (m.length === 0) return value;
      moved.push(...m);
      return kept;
    }
    if (Array.isArray(value)) {
      const next = value.map(scrub).filter((v) => !(typeof v === "string" && v.trim() === ""));
      return next;
    }
    if (value && typeof value === "object") {
      const rec = value as Record<string, unknown>;
      for (const [k, v] of Object.entries(rec)) {
        if (k.startsWith("_")) continue; // machine leaves
        rec[k] = scrub(v);
      }
      return rec;
    }
    return value;
  };

  const next = (surface as unknown[])
    .map(scrub)
    .filter((v) => !(typeof v === "string" && v.trim() === ""));
  report.risk_assessment_by_activity = next;
  return moved;
}

/**
 * THE pass. Mutates `report` in place; never throws.
 * RK2: pass `{ detectOnly: true }` to run without any mutations.
 */
export function rehomeReservedReferrals(
  report: Record<string, unknown> | null | undefined,
  opts?: { detectOnly?: boolean },
): SummaryRehomeSummary {
  const out = {
    version: RISK_SUMMARY_REHOME_VERSION,
    exec_sentences_moved: 0,
    narrative_removed: false,
    activity_sentences_moved: 0,
    rehomed: 0,
    suppressed: [] as string[],
    carried_verdict: "",
  };
  if (!report || typeof report !== "object") return out;
  // RK2 detect-only: return empty telemetry without mutations.
  if (opts?.detectOnly) return out;


  try {
    const moved: string[] = [];

    // (b) NO PROSE LEAF ON THE FACT STRIP.
    const summary = report.assessment_summary;
    if (summary && typeof summary === "object" && !Array.isArray(summary)) {
      const rec = summary as Record<string, unknown>;
      if (typeof rec.narrative === "string") {
        const { kept, moved: m } = strip(rec.narrative);
        moved.push(...m);
        const verdict = splitSentences(kept).find((s) => VERDICT_SENTENCE_RE.test(s)) ?? "";
        out.carried_verdict = verdict;
        delete rec.narrative;
        out.narrative_removed = true;
      }
    }

    // (a)/(c) THE VERDICT VOICE CARRIES NO REFERRAL FRAMING.
    const execRaw = report.executive_summary;
    if (typeof execRaw === "string" || Array.isArray(execRaw)) {
      const { kept, moved: m } = strip(asParagraph(execRaw));
      if (m.length > 0) {
        moved.push(...m);
        out.exec_sentences_moved = m.length;
        // The verdict surface is rebuilt downstream by the G-2 builder, so an
        // empty residue is safe; below the substance floor we leave "" rather
        // than a sentence fragment.
        report.executive_summary = kept.length >= MIN_SURFACE_SUBSTANCE ? kept : "";
      }
    }

    // (d) ITEM 428-C — the activity surface carries no referral prose either.
    const activityMoved = sweepActivityReferrals(report);
    out.activity_sentences_moved = activityMoved.length;
    moved.push(...activityMoved);



    // (a) RE-HOME, BYTE-IDENTICALLY, ONTO THE RESERVED-JUDGMENT ROW.
    const rows = Array.isArray(report.priority_actions) ? report.priority_actions : [];
    for (const sentence of moved) {
      const row = pickReservedRow(rows, sentence);
      if (!row) {
        out.suppressed.push(sentence);
        continue;
      }
      const action = String(row.action ?? "");
      if (action.includes(sentence)) continue; // already homed, byte-identical
      const next = action ? `${action} ${sentence}` : sentence;
      // The host leaf must remain gate-clean under the gate's own predicate.
      if (isSanctionedCounselRegister(next)) {
        row.action = next;
        out.rehomed += 1;
      } else {
        // A restatement of what the deterministic reserved row already says:
        // referenced by the row, never restated on a customer leaf.
        out.suppressed.push(sentence);
      }
    }
  } catch {
    return { ...out, crashed: true };
  }
  return out;
}
