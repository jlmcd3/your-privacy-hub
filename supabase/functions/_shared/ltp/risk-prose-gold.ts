/**
 * ITEM 384 — CPPA RISK PROSE GOLD-STANDARD ENCODE (G-1 … G-6).
 *
 * Ratified by the CEO review panel from the live render of
 * quality_run_documents 03192701-58ff-4caa-ac0b-42501837372b. Every defect
 * below was verified on that document before this module was written.
 *
 *   G-1 ONE SUFFICIENCY VOICE — three overlapping sufficiency statements
 *       (the item-380 affirmative, T.risk.record_sufficiency.prose.v2's
 *       "…has adequately documented 13 … 1 of these elements remain
 *       enumerated…", and T.risk.record_sufficiency.prose's "The record
 *       supporting this assessment is …") shipped stacked. One voice now
 *       speaks; the per-element pinpoint list survives untouched.
 *   G-2 EXEC SUMMARY OPENS WITH THE VERDICT — the shipped exec summary was
 *       the emit-gate's "We could not verify this item…" placeholder with
 *       the affirmative bolted underneath. The verdict now leads.
 *   G-3 RESERVED-JUDGMENT ACTIONS IN COUNSEL'S REGISTER — see
 *       `reservedActionLabel` / `ownerSentence` / `sentenceTerminate`,
 *       consumed by the priority-action composer.
 *   G-4 ATTESTATION BLOCK REGISTER-CLEAN — "not stated on the record" and a
 *       `record_insufficient` status on a gate-TRUE document.
 *   G-5 NEXT STEPS CARRY ACTIONS ONLY — the "Confirm X is documented" filler
 *       class is removed at its source in `composeNextSteps`.
 *   G-6 ONE OPEN-ELEMENT LEDGER — open elements are listed once, under
 *       "Items for your review"; no other surface re-lists them.
 *
 * THIS MODULE CONSUMES the item-380 record-complete machinery. It never
 * edits it: no determination outcome, no gate condition, no banner state, no
 * CSC / coverage / refinement logic is touched here.
 */

export const RISK_PROSE_GOLD_VERSION = "risk-prose-gold@item384-2026-08-06";

/** Register-clean absence value. Replaces "not stated on the record". */
export const NOT_RECORDED = "Not recorded";

/** The emit-gate degradation placeholders, as they land in prose leaves. */
export const DEGRADED_OPENER_RES: readonly RegExp[] = [
  /^\s*We could not verify this item from the information provided;[^\n]{0,200}?information needed\.\s*/i,
  /^\s*The information provided does not resolve this question;[^\n]{0,200}?information needed\.\s*/i,
  /^\s*Insufficient information to state a top action for this system\.\s*/i,
];

/** G-2 — a degraded placeholder may never open a customer surface. */
export function stripDegradedOpeners(text: string): string {
  let out = String(text ?? "");
  let changed = true;
  while (changed) {
    changed = false;
    for (const re of DEGRADED_OPENER_RES) {
      const next = out.replace(re, "");
      if (next !== out) { out = next; changed = true; }
    }
  }
  return out.trim();
}

/** The two legacy sufficiency voices retired by G-1. */
export const SUFFICIENCY_VOICE_V2_RE =
  /has adequately documented\s+\d+\s+of the § 7152\(a\) elements listed below/i;
export const SUFFICIENCY_VOICE_PROSE_RE =
  /^\s*The record supporting this assessment is\s/i;

export function isLegacySufficiencyVoice(s: unknown): boolean {
  const t = String(s ?? "");
  return SUFFICIENCY_VOICE_V2_RE.test(t) || SUFFICIENCY_VOICE_PROSE_RE.test(t);
}

// ---------------------------------------------------------------------------
// Sentence utilities (G-3 splice class)
// ---------------------------------------------------------------------------

/** Terminate a clause so the next clause cannot splice onto it. */
export function sentenceTerminate(s: string, capitalize = false): string {
  let t = String(s ?? "").trim().replace(/[;,]\s*$/, "");
  if (!t) return "";
  // A clause promoted to a sentence mid-run must also OPEN like one. The first
  // clause after a colon keeps its lower-case lead-in.
  if (capitalize) t = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/** First sentence of a paragraph, abbreviation-safe enough for openers. */
export function firstSentence(s: string): string {
  const t = String(s ?? "").trim();
  if (!t) return "";
  const m = t.match(/^[\s\S]*?[.!?](?=\s+[A-Z“"(]|$)/);
  return (m ? m[0] : t).trim();
}

// ---------------------------------------------------------------------------
// G-3 — counsel's register for reserved judgments
// ---------------------------------------------------------------------------

/**
 * The ratified reserved-judgment opener. Reads as a statement of who holds
 * the determination, not as "qualified counsel should be consulted for
 * further consideration of …" (the shipped stem, which read as boilerplate
 * advice and carried an internal `Owner:` tail).
 *
 * NOTE (emit-gate parity, NOT an emit-gate change): the counsel form
 * "…reserves to qualified legal counsel" matches the existing sanctioned
 * register pattern `/reserv(?:es|ed)[^.]{0,120}\bto qualified legal counsel\b/i`
 * in `_shared/emit-gate.ts`, so these actions keep the same exemption the old
 * stem had. Nothing in the emit gate is edited.
 */
export function reservedActionLabel(pinpoint: string, reservedTo: string): string {
  const pin = String(pinpoint ?? "").trim() || "11 CCR § 7152(a)";
  const who = String(reservedTo ?? "").trim() || "the accountable business owner";
  return `The determination ${pin} reserves to ${who}:`;
}

/** Replaces the internal `Owner: X.` scaffolding with a plain sentence. */
export function ownerSentence(owner: string): string {
  const o = String(owner ?? "").trim();
  if (!o) return "";
  return `Responsibility for this action sits with ${o}.`;
}

// ---------------------------------------------------------------------------
// G-2 — executive summary
// ---------------------------------------------------------------------------

const VERDICT_SENTENCE_RE = /\boutweigh|\bbalanc(?:e|ing)\b|\bconclusion\b/i;

function splitSentences(s: string): string[] {
  return String(s ?? "")
    .split(/(?<=[.!?])\s+(?=[A-Z“"(])/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function asParagraph(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.filter((x) => typeof x === "string").join("\n\n");
  return "";
}

/**
 * G-2 — the exec summary opens with the finding. Order:
 *   1. the § 7152(a)(6) verdict (from the assessment summary's own words),
 *   2. one sentence naming what the processing is,
 *   3. the item-380 action-plan paragraph.
 * The degraded placeholder can never lead (R1: open with the finding).
 */
export function buildExecutiveSummary(
  report: Record<string, unknown>,
  affirmative: string,
): string {
  const summary = report.assessment_summary;
  const narrative = summary && typeof summary === "object" && !Array.isArray(summary)
    ? String((summary as Record<string, unknown>).narrative ?? "")
    : asParagraph(summary);
  const verdict =
    splitSentences(narrative).find((s) => VERDICT_SENTENCE_RE.test(s)) ??
    (typeof report.risk_level === "string" && report.risk_level.trim()
      ? `The § 7152(a)(6) balancing on this record returns a ${String(report.risk_level).toLowerCase()} risk determination.`
      : "");
  const processing = firstSentence(asParagraph(report.processing_narrative));
  const existing = stripDegradedOpeners(asParagraph(report.executive_summary));
  const lead = [verdict, processing].map((s) => s.trim()).filter(Boolean).join(" ");
  const carried = existing && !existing.includes(affirmative.slice(0, 40))
    ? existing.split(/\n{2,}/).filter((p) => !isLegacySufficiencyVoice(p)).join("\n\n").trim()
    : "";
  const paras = [lead, carried, affirmative]
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p, i, a) => a.indexOf(p) === i);
  return paras.join("\n\n").trim();
}

// ---------------------------------------------------------------------------
// G-1 / G-6 — record sufficiency
// ---------------------------------------------------------------------------

/**
 * The reserved-judgment sentence that joins the one sufficiency voice. A
 * reserved determination is NOT a record gap: the regulation assigns it, and
 * no intake answer closes it (this is exactly the item-380 `action_item`
 * class — consumed here, never recomputed).
 */
export function reservedJudgmentSentence(count: number): string {
  if (count <= 0) return "";
  const noun = count === 1 ? "one determination" : `${count} determinations`;
  const subject = count === 1 ? "It is" : "They are";
  return `The record also carries ${noun} the regulation reserves to the business and to qualified legal counsel. ${subject} listed under Items for your review as an action, not as a deficiency in the record.`;
}

/**
 * G-1 — collapse the sufficiency surface to ONE voice plus the per-element
 * pinpoint list. Shape is preserved: an array stays an array of paragraphs.
 */
export function buildRecordSufficiency(
  current: unknown,
  affirmative: string,
  reservedSentence: string,
): string[] {
  const rows = Array.isArray(current)
    ? current.filter((x): x is string => typeof x === "string")
    : typeof current === "string"
      ? [current]
      : [];
  const elements = rows.filter(
    (r) => !isLegacySufficiencyVoice(r) && !r.includes(affirmative.slice(0, 40)),
  );
  const voice = [affirmative, reservedSentence].map((s) => s.trim()).filter(Boolean).join(" ");
  return [voice, ...elements];
}

// ---------------------------------------------------------------------------
// G-4 — attestation block
// ---------------------------------------------------------------------------

const LEGACY_ABSENCE_RE = /^not stated on the record$/i;

/**
 * G-4 — register-clean absence values, and no `record_insufficient` status on
 * a document whose truth gate holds. The gate value is READ, never computed
 * here.
 */
export function normalizeAttestationBlock(
  block: unknown,
  recordComplete: boolean,
): void {
  if (!block || typeof block !== "object" || Array.isArray(block)) return;
  const ab = block as Record<string, unknown>;
  for (const key of ["review_date", "approval_date"]) {
    if (typeof ab[key] === "string" && LEGACY_ABSENCE_RE.test(ab[key] as string)) {
      ab[key] = NOT_RECORDED;
    }
  }
  for (const a of Array.isArray(ab.approvers) ? ab.approvers : []) {
    if (!a || typeof a !== "object") continue;
    const row = a as Record<string, unknown>;
    for (const key of ["name", "position"]) {
      if (typeof row[key] === "string" && LEGACY_ABSENCE_RE.test(row[key] as string)) {
        row[key] = NOT_RECORDED;
      }
    }
  }
  if (recordComplete) {
    ab.status = "analysed";
    // G-6 — the open-element ledger lives in one place only.
    delete ab.information_needed;
  }
}

// ---------------------------------------------------------------------------
// The single entry point
// ---------------------------------------------------------------------------

export interface RiskProseGoldTelemetry {
  version: string;
  applied: boolean;
  exec_degraded_opener_stripped: boolean;
  sufficiency_voices_retired: number;
  attestation_normalized: boolean;
}

/**
 * Applies G-1, G-2, G-4 and G-6 to an assembled risk report IN PLACE.
 * Gate-aware: with `recordComplete === false` only the register repairs that
 * are true on any record (degraded-opener strip, attestation absence wording)
 * run, so draft documents keep their honest draft framing.
 */
export function applyRiskProseGold(
  report: Record<string, unknown>,
  opts: {
    recordComplete: boolean;
    affirmative: string;
    reservedCount: number;
  },
): RiskProseGoldTelemetry {
  const t: RiskProseGoldTelemetry = {
    version: RISK_PROSE_GOLD_VERSION,
    applied: false,
    exec_degraded_opener_stripped: false,
    sufficiency_voices_retired: 0,
    attestation_normalized: false,
  };
  try {
    // G-2 (register repair, every record).
    const esBefore = typeof report.executive_summary === "string" ? report.executive_summary : "";
    if (esBefore) {
      const stripped = stripDegradedOpeners(esBefore);
      if (stripped !== esBefore.trim()) t.exec_degraded_opener_stripped = true;
      report.executive_summary = stripped;
    }

    // G-4 (register repair, every record; status swap gate-aware).
    if (report.attestation_block) {
      normalizeAttestationBlock(report.attestation_block, opts.recordComplete === true);
      t.attestation_normalized = true;
    }

    if (opts.recordComplete !== true) return t;

    // G-2 (verdict-first assembly, gate-true only). Shape is never changed:
    // the legacy OBJECT envelope is left to the item-380 object branch in
    // `applyRiskRecordCompleteFraming`; only the live STRING shape is rebuilt.
    if (typeof report.executive_summary === "string" || report.executive_summary == null) {
      report.executive_summary = buildExecutiveSummary(report, opts.affirmative);
    }

    // G-1 / G-6 (one sufficiency voice, gate-true only).
    const rs = report.record_sufficiency;
    const rsRewritable = Array.isArray(rs) || typeof rs === "string";
    const before = Array.isArray(rs)
      ? (rs as unknown[]).filter(isLegacySufficiencyVoice).length
      : 0;
    // Shape law: the ARRAY/STRING live shapes are collapsed here; the legacy
    // OBJECT envelope keeps the item-380 `.prose` write and is untouched.
    if (rsRewritable) {
      report.record_sufficiency = buildRecordSufficiency(
        rs,
        opts.affirmative,
        reservedJudgmentSentence(opts.reservedCount),
      );
    }
    t.sufficiency_voices_retired = before;
    t.applied = true;
  } catch {
    /* fail-open: the document ships exactly as assembled */
  }
  return t;
}
