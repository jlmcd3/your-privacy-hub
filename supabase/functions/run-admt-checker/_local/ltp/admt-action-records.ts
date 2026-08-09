/**
 * ITEM 422 — ADMT PRIORITY ACTIONS: THE TYPED RECORD WRITER.
 *
 * ADMT already shipped the correct shape one key away: `top_3_actions` is an
 * array of records (action · citation · deadline · proposition_key ·
 * insufficient_basis) while `priority_actions` was an array of pre-composed
 * strings. This module is the SINGLE WRITE SITE that brings
 * `priority_actions` to the item420 canonical action record.
 *
 * LAW 3 (single writer): `normalizeAdmtPriorityActions` is the only place that
 * assigns `report.priority_actions`. It is called exactly once per run in
 * run-admt-checker/index.ts, before the W-battery walkers (which are already
 * object-entry oriented and therefore see the canonical shape).
 *
 * ONE HOME PER FACT:
 *   - the pinpoint lives in `citation` (ADMT's registry-resolved home, which
 *     the W-walkers own) — never additionally in `statutory_basis`;
 *   - the role lives in `owner_role`;
 *   - the deadline lives in `deadline`;
 *   - the severity token (IMMEDIATE / SCHEDULED / ONGOING) lives in
 *     `severity`;
 * and each is REMOVED from the action prose when it is lifted out of it.
 *
 * No stored row is read for mutation or written here.
 */

import {
  type ActionRecord,
  isActionRecord,
} from "../../../_shared/report-contracts/action-record.ts";

export const ADMT_ACTION_RECORD_WRITER_VERSION = "admt-action-records@item422-2026-08-09";

const SEVERITY_RE = /^\s*(IMMEDIATE|SCHEDULED|ONGOING|IMPORTANT|MONITOR)\b\s*[—–\-:|.]*\s*/i;
const LEADING_NUM_RE = /^(\s*\d+[.)]\s*)+/;
const OWNER_LABEL_RE = /^\s*(?:Owner|Owners|Responsible|Accountable)\s*:\s*([^|]{2,120}?)\s*(?:\||$)/i;
const DEADLINE_LEAD_RE = /^\s*(?:by|due|complete(?:\s+and\s+document)?\s+by|deadline)\s*[:\-]?\s*([^|.]{3,120})/i;
const ROLE_PREFIX_RE = /^([A-Z][A-Za-z'’\-]+(?:\s+[A-Za-z'’\-]+){0,5}(?:\s*\/\s*[A-Z][A-Za-z'’\-]+(?:\s+[A-Za-z'’\-]+){0,5})*)\s*:\s+/;

function clean(s: string): string {
  return s.replace(/\s+/g, " ").replace(/^[\s|—–\-.:]+/, "").replace(/\s+$/, "").trim();
}

/**
 * Parse ONE legacy pre-composed priority-action string into the canonical
 * record. Fail-open: whatever cannot be lifted stays in `action`.
 */
export function parseLegacyActionString(raw: string, index: number): ActionRecord {
  let text = String(raw ?? "");
  const rec: ActionRecord = { action: "" };

  const numMatch = text.match(LEADING_NUM_RE);
  if (numMatch) {
    const first = numMatch[0].match(/\d+/);
    if (first) rec.rank = Number(first[0]);
    text = text.slice(numMatch[0].length);
  }
  if (typeof rec.rank !== "number" || !Number.isFinite(rec.rank)) rec.rank = index + 1;

  const sev = text.match(SEVERITY_RE);
  if (sev) {
    rec.severity = sev[1].toUpperCase();
    text = text.slice(sev[0].length);
  }

  // Deadline: either a leading "by <date>" clause, or an "Owner:"-delimited
  // pipe segment carrying one.
  const segments = text.split("|").map((s) => s.trim()).filter(Boolean);
  if (segments.length > 1) {
    const kept: string[] = [];
    for (const seg of segments) {
      const owner = seg.match(OWNER_LABEL_RE);
      if (owner && !rec.owner_role) { rec.owner_role = clean(owner[1]); continue; }
      const dl = seg.match(DEADLINE_LEAD_RE);
      if (dl && !rec.deadline && seg.length <= 140) { rec.deadline = clean(dl[1]); continue; }
      kept.push(seg);
    }
    text = kept.join(" ");
  } else {
    const dl = text.match(DEADLINE_LEAD_RE);
    if (dl) {
      rec.deadline = clean(dl[1]);
      text = clean(text.slice(dl[0].length));
    }
  }

  text = clean(text);

  if (!rec.owner_role) {
    const role = text.match(ROLE_PREFIX_RE);
    if (role) {
      rec.owner_role = clean(role[1]);
      text = clean(text.slice(role[0].length));
    }
  }

  rec.action = clean(text) || clean(String(raw ?? ""));
  return rec;
}

/** Normalise ONE already-typed entry emitted by the model. */
export function coerceModelActionRecord(entry: Record<string, unknown>, index: number): ActionRecord {
  const rec: ActionRecord = { action: clean(String(entry.action ?? "")) };
  const str = (k: string): string => (typeof entry[k] === "string" ? clean(entry[k] as string) : "");

  // Pinpoint: ONE home. ADMT's home is `citation` (the W-walkers own it).
  const citation = str("citation") || str("statutory_basis");
  if (citation) rec.citation = citation;
  const pk = str("proposition_key");
  if (pk) rec.proposition_key = pk;

  const severity = str("severity") || str("priority");
  if (severity) rec.severity = severity.toUpperCase();

  const deadline = str("deadline");
  if (deadline) rec.deadline = deadline;
  const deadlineBasis = str("deadline_basis");
  if (deadlineBasis && deadlineBasis !== rec.citation) rec.deadline_basis = deadlineBasis;

  const owner = str("owner_role") || str("owner");
  if (owner) rec.owner_role = owner;

  if (entry.insufficient_basis === true) rec.insufficient_basis = true;

  const rank = typeof entry.rank === "number" ? entry.rank : Number.NaN;
  rec.rank = Number.isFinite(rank) ? rank : index + 1;

  // A record with no substantive action is worthless; fall back to whatever
  // prose the entry carries.
  if (!rec.action) {
    for (const k of ["finding", "remediation", "text", "description", "detail"]) {
      const v = str(k);
      if (v) { rec.action = v; break; }
    }
  }
  return rec;
}

export interface AdmtActionRecordDiag {
  version: string;
  from_string: number;
  from_record: number;
  dropped: number;
  total: number;
}

/**
 * THE SINGLE WRITE SITE. Dual-read on input (string OR record), canonical
 * record on output. Fail-open: on any throw the original value is left
 * untouched.
 */
export function normalizeAdmtPriorityActions(report: unknown): AdmtActionRecordDiag {
  const diag: AdmtActionRecordDiag = {
    version: ADMT_ACTION_RECORD_WRITER_VERSION,
    from_string: 0,
    from_record: 0,
    dropped: 0,
    total: 0,
  };
  try {
    const r = report as Record<string, unknown> | null;
    if (!r || typeof r !== "object") return diag;
    const raw = r.priority_actions;
    if (!Array.isArray(raw) || raw.length === 0) return diag;

    const out: ActionRecord[] = [];
    raw.forEach((entry, i) => {
      if (typeof entry === "string") {
        if (!entry.trim()) { diag.dropped++; return; }
        out.push(parseLegacyActionString(entry, i));
        diag.from_string++;
        return;
      }
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        const rec = coerceModelActionRecord(entry as Record<string, unknown>, i);
        if (!isActionRecord(rec)) { diag.dropped++; return; }
        out.push(rec);
        diag.from_record++;
        return;
      }
      diag.dropped++;
    });

    if (out.length === 0) return diag;
    diag.total = out.length;
    (r as { priority_actions: unknown }).priority_actions = out;
  } catch { /* fail-open — leave the original value in place */ }
  return diag;
}
