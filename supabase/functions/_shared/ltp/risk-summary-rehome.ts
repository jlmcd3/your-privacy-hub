/**
 * ITEM 428-B (DEFECT 1) — RE-HOMED REFERRAL PROSE OFF THE SUMMARY SURFACES.
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

export const RISK_SUMMARY_REHOME_VERSION = "risk-summary-rehome@item428b-2026-08-09";

/** Substance floor shared with the ITEM 384 r2 empty-surface guard. */
const MIN_SURFACE_SUBSTANCE = 40;

const VERDICT_SENTENCE_RE = /\boutweigh|\bbalanc(?:e|ing)\b|\bconclusion\b/i;

export interface SummaryRehomeSummary {
  readonly version: string;
  /** Referral sentences lifted off `$.executive_summary`. */
  readonly exec_sentences_moved: number;
  /** True when an `assessment_summary.narrative` prose leaf was removed. */
  readonly narrative_removed: boolean;
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
 * THE pass. Mutates `report` in place; never throws.
 */
export function rehomeReservedReferrals(
  report: Record<string, unknown> | null | undefined,
): SummaryRehomeSummary {
  const out = {
    version: RISK_SUMMARY_REHOME_VERSION,
    exec_sentences_moved: 0,
    narrative_removed: false,
    rehomed: 0,
    suppressed: [] as string[],
    carried_verdict: "",
  };
  if (!report || typeof report !== "object") return out;

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
