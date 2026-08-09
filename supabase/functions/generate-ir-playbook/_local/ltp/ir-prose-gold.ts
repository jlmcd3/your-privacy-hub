// ─────────────────────────────────────────────────────────────────────────────
// ITEM 414 — IR PROSE GOLD (P9, LEG A). Deterministic register repairs over the
// two assembled artifacts.
//
// PLACEMENT: colocated in `generate-ir-playbook/_local/ltp/` for the same
// reason as `ir.spine.ts` — exactly one function's closure reaches it, so no
// other function pays its bytes (post-402-C-3 rule).
//
// THE WORK LIST came from the render walk of `quality_run_documents`
// b6e26ca0-194d-4dd5-8ef7-3b3204f84f45 (94.95 / 97, full-batch render
// 2026-08-07) and 333770f8-de66-4da1-98d8-652f6ea0e36a (94.15 / 93,
// 2026-08-02; a pre-item369 render carrying neither artifact, so every
// artifact-level defect below is evidenced by the first).
//
//   IR-1  ABSENCE LITANY (R6/R7/R8). Seven sections shipped empty, each with
//         its own ask, and `standing_playbook.information_needed` carried nine
//         entries of which two were BYTE-IDENTICAL (the breach-notice-contract
//         ask, emitted once by the finding and once by the table). PANEL
//         DECISION: keep the honesty, change its register — ONE ledger sentence
//         naming the incomplete sections, plus a per-section sentence saying
//         what would fill it. The list is deduplicated. A complete record emits
//         no ledger at all. Rationale: the bare repeated fragment is exactly as
//         honest but reads as machine output; a reader cannot act on nine
//         parenthesised field names, and can act on "record the standing
//         triggers, their source and what each activates".
//
//   IR-2  FIELD-LABEL LEAK (R4). Every ask ended "(intake field: activationCriteria)"
//         / "(intake fields: severityMatrix, severityThresholds)". A form field
//         name is machinery.
//
//   IR-3  APPARATUS IN A TABLE CELL (R1/R9). The first-hour checklist's counsel
//         row rendered "We could not verify this item from the information
//         provided; it is listed under information needed." in the ACTION
//         column. The first-hour items are FIXED TEMPLATE TEXT that the intake
//         never authors (the section's own note says so), so an unverifiability
//         notice cannot be a correct value there. This pass restores the
//         canonical item by row index. It is not invention: nothing in that
//         column is a record claim.
//
//   IR-4  WORKSHEET PLACEHOLDER IN THE STANDING REGISTER. "[TO BE COMPLETED]"
//         belongs to the blank forms. In a durable reference the same absence
//         is an instruction to the organisation.
//
//   IR-5  BANNED PHRASE (A6/R8 — the item 413-B lesson). "not answerable on
//         this record" and "recorded on this intake" shipped in the contractual
//         finding.
//
//   IR-6  MOULD LITANY (R7). Four consecutive Art. 33(3) rows built from one
//         mould ("Notification content — GDPR Art. 33(3)(x): supply the element
//         as the provision states it.").
//
// NOT A DEFECT — stated so it is not "fixed" later by mistake:
//   * The eight identical "Not confirmed" cells in the first-hour checklist's
//     STANDING CONFIRMATION column. That is a table cell recording a fact about
//     the organisation's record, not prose. R7 is a prose rule and this pass
//     exempts fixed-vocabulary status columns.
//   * `verdict` values such as `undetermined_on_the_record`. Determination
//     machinery, protected here, and asserted by R11 never to reach a prose
//     surface.
//   * The worksheet's empty cells. Blank by design.
// ─────────────────────────────────────────────────────────────────────────────

import {
  IR_PIPELINE_STAMP,
  IR_TEMPLATE_AUTHORITY_RES,
  unverifiedCfrAnchors,
} from "../prose/ir.spine.ts";

export const IR_PROSE_GOLD_VERSION = "ir-prose-gold-2026-08-09-item414";
export { IR_PIPELINE_STAMP };

// ── PROTECTED LEAVES ────────────────────────────────────────────────────────
// Determination machinery, verbatim corpus bytes and identity fields.

const PROTECTED_KEYS = new Set<string>([
  "verdict",
  "status",
  "decision",
  "rule_id",
  "rule_ids",
  "element",
  "citation",
  "citations",
  "as_cited",
  "standard_citation",
  "corpus_key",
  "pinpoint",
  "requirement_verbatim",
  "verbatim",
  "verbatim_excerpt",
  "excerpt",
  "authority_class",
  "proposition_key",
  "artifact",
  "kind",
  "id",
  "report_keys",
  "columns",
  "section_order",
  "_meta",
  "_staging",
]);

export function isProtectedIrKey(key: string): boolean {
  return PROTECTED_KEYS.has(key) || /_stamp$|_version$|_id$|_at$|_url$|_key$/.test(key);
}

// ── IR-2 — FIELD-LABEL LEAK ─────────────────────────────────────────────────

const FIELD_PARENTHETICAL_RE = /\s*\((?:intake fields?|field):[^)]*\)/gi;

export function stripIntakeFieldParenthetical(text: string): string {
  if (!/\(intake fields?:|\(field:/i.test(text)) return text;
  return text.replace(FIELD_PARENTHETICAL_RE, "").replace(/\s+([.,;])/g, "$1").trim();
}

// ── IR-3 — APPARATUS IN A TABLE CELL ────────────────────────────────────────

export const DEGRADED_CELL_RES: readonly RegExp[] = [
  /^we could not verify/i,
  /^the information provided does not resolve/i,
  /^insufficient information/i,
  /it is listed under information needed/i,
];

export function isDegradedCell(text: string): boolean {
  const t = String(text ?? "").trim();
  if (!t) return false;
  return DEGRADED_CELL_RES.some((re) => re.test(t));
}

/**
 * Restores the fixed first-hour checklist actions by row index. `canonical` is
 * the builder's own FIRST_HOUR_ITEMS list, passed in so this module keeps no
 * second copy of the template text.
 */
export function restoreFixedChecklistActions(
  rows: unknown,
  canonical: readonly string[],
): { rows: unknown; restored: number } {
  if (!Array.isArray(rows)) return { rows, restored: 0 };
  let restored = 0;
  const out = rows.map((row, i) => {
    if (!Array.isArray(row) || typeof row[0] !== "string") return row;
    if (!isDegradedCell(row[0])) return row;
    const fixed = canonical[i];
    if (!fixed) return row;
    restored += 1;
    const next = [...row];
    next[0] = fixed;
    return next;
  });
  return { rows: out, restored };
}

// ── IR-4 — WORKSHEET PLACEHOLDER IN THE STANDING REGISTER ───────────────────

export const STANDING_TO_COMPLETE = "To be completed by the organisation";

export function repairStandingPlaceholder(text: string): string {
  return text.includes("[TO BE COMPLETED]")
    ? text.split("[TO BE COMPLETED]").join(STANDING_TO_COMPLETE)
    : text;
}

// ── IR-5 — BANNED PHRASES (A6 / R8) ─────────────────────────────────────────

const BANNED_PHRASE_REPAIRS: ReadonlyArray<[RegExp, string]> = [
  [/\bnot answerable on this record\b/gi, "not answerable from what the organisation has recorded"],
  [/\bon the present record\b/gi, "from what the organisation has recorded"],
  [/\bon this record\b/gi, "from what the organisation has recorded"],
  [/\bon the record\b/gi, "in what the organisation has recorded"],
  [/\brecorded on this intake\b/gi, "recorded by the organisation"],
];

export function repairBannedPhrases(text: string): string {
  let out = text;
  for (const [re, rep] of BANNED_PHRASE_REPAIRS) out = out.replace(re, rep);
  return out;
}

// ── ITEM 416 LEG C — THE ABSENCE-LABEL REGISTER (the item396 linkage rule) ──
//
// EVERY absence phrasing this product's builders and this pass can WRITE is
// enumerated here, and `ir-csc.ts` builds its detector FROM this list. The
// linkage test in `tests/edge/item416` asserts that each phrasing is matched by
// the detector, so a relabel in a builder can never escape its own detector —
// the item396 defect class.
//
// These strings are honest output on a silent record and are preserved
// byte-for-byte there. They are a DEFECT only on a surface the record backs,
// which is exactly the predicate `ir-csc.ts` applies before it reads them.
export const IR_ABSENCE_LABEL_PHRASINGS: readonly string[] = [
  // standing-playbook.ts — the contractual determination on a silent record.
  "The organisation has recorded no agreement carrying a breach-notice clause.",
  "The determination cannot be made",
  "is not answerable from what the organisation has recorded",
  // standing-playbook.ts — the IR-1 ledger sentence.
  "the organisation has not yet recorded what it requires",
  "the organisation has not yet recorded what they require",
  // ir-prose-gold.ts — the customer register's own replacement vocabulary.
  "the organisation has not yet recorded this",
  "what this playbook still needs",
  // the pre-item414 apparatus the register replaces, kept detectable because a
  // post-assembly pass can still reintroduce it.
  "We could not verify this item from the information provided",
  "it is listed under information needed",
];

/**
 * DESIGNED OUTPUT on their own surfaces. These read like absence and are not:
 * each records a fact about the organisation's own arrangements, or is the
 * IR-4 standing placeholder that a durable reference is supposed to carry.
 * `ir-csc.ts` strips them before it looks for a false absence.
 */
export const IR_DESIGNED_ABSENCE_EXEMPTIONS: readonly RegExp[] = [
  /Privilege protocol not recorded\./gi,
  /No privilege protocol recorded[^.]*\./gi,
  new RegExp(STANDING_TO_COMPLETE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
  /Not confirmed/gi,
];


// ── THE CUSTOMER REGISTER (one voice per surface) ───────────────────────────

const INTERNAL_VOCABULARY: ReadonlyArray<[RegExp, string]> = [
  [/\brecord_insufficient\b/g, "the organisation has not yet recorded this"],
  [/\binformation_needed\b/g, "what this playbook still needs"],
  [/\bstanding_playbook\b/g, "the standing playbook"],
  [/\bincident_worksheet\b/g, "the incident worksheet"],
];

export function stripInternalVocabulary(text: string): string {
  let out = text;
  for (const [re, rep] of INTERNAL_VOCABULARY) out = out.replace(re, rep);
  return out;
}

/** All of the string-level repairs, in the order the register applies them. */
export function repairIrProse(text: string): string {
  if (!text || text.length < 2) return text;
  let out = text;
  out = stripIntakeFieldParenthetical(out);
  out = repairStandingPlaceholder(out);
  out = repairBannedPhrases(out);
  out = stripInternalVocabulary(out);
  out = out.replace(/[ \t]{2,}/g, " ").replace(/\s+([.,;])/g, "$1");
  return out.trim();
}

// ── DETECTORS used by the seam battery ──────────────────────────────────────

/** A template source named as if it were the operative requirement. */
export function templateReadsAsAuthority(text: string): boolean {
  return IR_TEMPLATE_AUTHORITY_RES.some((re) => re.test(String(text ?? "")));
}

export { unverifiedCfrAnchors };

// ── THE PASS ────────────────────────────────────────────────────────────────

export interface IrProseGoldResult {
  readonly report: Record<string, unknown>;
  readonly repaired_paths: readonly string[];
  readonly restored_checklist_cells: number;
}

/**
 * Applies the register over the assembled report. FAIL-OPEN is the caller's
 * job (`ir-finalize.ts`); this function is pure.
 *
 * `firstHourItems` is the builder's canonical fixed-item list, used by IR-3.
 */
export function applyIrProseGold(
  input: Record<string, unknown>,
  firstHourItems: readonly string[] = [],
): IrProseGoldResult {
  const repaired: string[] = [];

  const walk = (value: unknown, key: string, path: string): unknown => {
    if (typeof value === "string") {
      if (isProtectedIrKey(key)) return value;
      const next = repairIrProse(value);
      if (next !== value) repaired.push(path);
      return next;
    }
    if (Array.isArray(value)) return value.map((v, i) => walk(v, key, `${path}[${i}]`));
    if (value && typeof value === "object") {
      const src = value as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(src)) {
        // Protected keys are copied whole: determination machinery, corpus
        // bytes and telemetry buckets are never rewritten by the register.
        out[k] = isProtectedIrKey(k) ? v : walk(v, k, `${path}.${k}`);
      }
      return out;
    }
    return value;
  };

  let report = walk(input, "", "$") as Record<string, unknown>;

  // IR-3 — restore the fixed first-hour actions a post-assembly pass degraded.
  let restored = 0;
  const sp = report.standing_playbook as Record<string, unknown> | undefined;
  if (sp && Array.isArray(sp.sections) && firstHourItems.length) {
    const sections = sp.sections.map((s) => {
      const sec = s as Record<string, unknown>;
      if (sec?.id !== "first_hour_checklist") return s;
      const r = restoreFixedChecklistActions(sec.rows, firstHourItems);
      if (r.restored === 0) return s;
      restored += r.restored;
      repaired.push("$.standing_playbook.sections.first_hour_checklist.rows");
      return { ...sec, rows: r.rows };
    });
    report = { ...report, standing_playbook: { ...sp, sections } };
  }

  // IR-1 — the ledger's own list is deduplicated after the string repairs, so
  // two sections that ask for the same thing are named once.
  const sp2 = report.standing_playbook as Record<string, unknown> | undefined;
  if (sp2 && Array.isArray(sp2.information_needed)) {
    const seen = new Set<string>();
    const deduped = (sp2.information_needed as unknown[]).filter((x) => {
      const k = String(x).trim().toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    if (deduped.length !== sp2.information_needed.length) {
      repaired.push("$.standing_playbook.information_needed");
    }
    report = { ...report, standing_playbook: { ...sp2, information_needed: deduped } };
  }

  report = stampIrPipeline(report);
  return { report, repaired_paths: repaired, restored_checklist_cells: restored };
}

/** The finalize-point stamp. Idempotent. */
export function stampIrPipeline(report: Record<string, unknown>): Record<string, unknown> {
  const meta = { ...((report._meta as Record<string, unknown> | undefined) ?? {}) };
  const internal = { ...((meta.internal as Record<string, unknown> | undefined) ?? {}) };
  internal.ir_pipeline_stamp = IR_PIPELINE_STAMP;
  internal.ir_prose_gold_version = IR_PROSE_GOLD_VERSION;
  meta.internal = internal;
  return { ...report, _meta: meta };
}
