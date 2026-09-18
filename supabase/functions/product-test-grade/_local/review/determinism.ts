// /all-ptest v2 (DOC 261, 2026-09-14) — DETERMINISM CHECK helpers.
//
// Stage 0 of the grounded improvement loop: a golden intake is regenerated
// twice with the SAME injected report date and the customer text must hash
// identically. A mismatch is a P0 on its own — a nondeterministic engine
// cannot be improved by testing, because no before/after delta on it means
// anything.
//
// What is hashed. EXACTLY the text a reviewer sees: the flattened
// `skeleton_document` (the same `extractCustomerDocument` + entity decoding
// the review worker's document source uses), never `report_data` as a whole
// — `_meta` carries stamps, telemetry and timings that legitimately differ
// run to run.
//
// What must be pinned for the comparison to be meaningful. Every model-backed
// layer dark and the clock injected (`report_date` in the request body, read
// by `_shared/report-date.ts` for internal callers only):
//
//   cppa-risk   RISK_PASS1_DETERMINISTIC=1, RISK_PASS2R_ENABLED unset/0,
//               RISK_V3_ENABLED unset/false  (the production setting on
//               2026-09-14: _meta.internal.ltp.shipped_surface = "deterministic")
//   cppa-cyber  CYBER_DETERMINISTIC_ENABLED=true (ON in production; the code
//               default is false, so a harness must set it explicitly)
//   cppa-admt   the V3 hook-selection layer keys off `assessment_id`; a
//               regeneration by direct `intake_data` plans no selection and
//               makes no call. ADMT has no clock.
//
// No database, no network: pure functions over a report_data object, so the
// offline test (tests/edge/ptest/determinism.test.ts) and the driver's
// production check share one definition of "identical".

import { extractCustomerDocument } from "../../../_shared/grader/payload.ts";
import { decodeHtmlEntities } from "../../../_shared/review/document-source.ts";

export type DeterminismProduct = "cppa-risk" | "cppa-cyber" | "cppa-admt";

/** The environment/flag settings a determinism run asserts, per product. */
export const DETERMINISM_SETTINGS: Record<DeterminismProduct, Readonly<Record<string, string>>> = {
  "cppa-risk": {
    RISK_PASS1_DETERMINISTIC: "1",
    RISK_PASS2R_ENABLED: "0",
    RISK_V3_ENABLED: "false",
  },
  "cppa-cyber": {
    CYBER_DETERMINISTIC_ENABLED: "true",
  },
  "cppa-admt": {
    // Dark by construction on the harness path (direct intake_data, no
    // assessment_id). Recorded so a batch row states it.
    ADMT_V3_ENABLED: "dark (no assessment_id)",
  },
};

/**
 * The reviewer-visible text of a report — the flattened skeleton document
 * with HTML entities decoded — or, for a legacy record with no document
 * field, the pretty-printed report. Mirrors `documentTextFrom` in
 * document-source.ts so the hash covers exactly what a worker reviews.
 */
export function reviewTextOf(reportData: unknown): { field: string; text: string } {
  const rd = (reportData && typeof reportData === "object") ? reportData as Record<string, unknown> : {};
  const doc = extractCustomerDocument(rd);
  if (doc) return { field: doc.field, text: decodeHtmlEntities(doc.text) };
  let s: string;
  try { s = JSON.stringify(rd, null, 2); } catch { s = String(rd); }
  return { field: "report_data", text: decodeHtmlEntities(s) };
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface DocumentHash {
  readonly field: string;
  readonly chars: number;
  readonly hash: string;
}

/** SHA-256 of the reviewer-visible text of a report. */
export async function documentHash(reportData: unknown): Promise<DocumentHash> {
  const { field, text } = reviewTextOf(reportData);
  return { field, chars: text.length, hash: await sha256Hex(text) };
}

export interface TextDivergence {
  readonly line: number;
  readonly a: string;
  readonly b: string;
}

/**
 * First differing line between two texts (1-based), or null when identical.
 * The driver records this beside a failed hash comparison so the P0 names the
 * block, not just the fact.
 */
export function firstDivergence(a: string, b: string): TextDivergence | null {
  if (a === b) return null;
  const la = a.split("\n");
  const lb = b.split("\n");
  const n = Math.max(la.length, lb.length);
  for (let i = 0; i < n; i++) {
    if (la[i] !== lb[i]) return { line: i + 1, a: la[i] ?? "<end>", b: lb[i] ?? "<end>" };
  }
  return { line: n, a: "<end>", b: "<end>" };
}

/** Today (UTC) as YYYY-MM-DD — the value the products stamp when no date is injected. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "September 14, 2026" for "2026-09-14" — the long form the cyber cover prints. */
export function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${d}, ${y}`;
}
