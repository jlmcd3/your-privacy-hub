/**
 * ITEM 422-D DEFECT 2 — WRITER-SIDE OPERATOR-INSTRUCTION SWEEP.
 *
 * The 422-C pilot shipped operational template instructions inside customer
 * prose ("Insert this block into the access-response template as its own
 * labeled section; the Consumer-Request Handler must complete each bracketed
 * field ... the Privacy Officer should confirm with the Product Owner ...").
 * That is the internal-instruction-leak class (the M6 lineage) and the e6 /
 * e4 detectors caught it — but only AFTER the writer had already emitted it,
 * so the deterministic-check ledger carried a graded HIGH finding.
 *
 * THE 396 LINKAGE DISCIPLINE, APPLIED TO THIS CLASS: whatever phrasings the
 * detector detects, the WRITER sweep must catch first. Rather than copy the
 * detector's vocabulary (which drifts), this sweep RUNS THE DETECTOR ITSELF
 * per sentence — linkage holds by construction, forever.
 *
 * BEHAVIOUR: for each customer prose leaf, sentences that the detector marks
 * as an instruction leak (e4) or a counsel referral (e6) are REMOVED from the
 * customer surface and preserved verbatim on an operator-facing internal leaf
 * (`_operator_notes`), which never renders. The ITEM 384 r2 empty-surface
 * guard applies: if stripping would leave under `MIN_SUBSTANCE` characters,
 * the ORIGINAL leaf is kept unchanged (a degraded surface is worse than a
 * detectable one, and the emit gate remains the backstop).
 *
 * Deterministic. No model, no clock, no I/O. Fail-open.
 */

import { runFormatChecksGeneric } from "../../../_shared/grader/format-checks.ts";

export const ADMT_OPERATOR_SWEEP_VERSION =
  "admt-operator-instruction-sweep@item422d-2026-08-09";

/** ITEM 384 r2 — empty-surface guard. */
export const MIN_SUBSTANCE = 40;

/** The leak classes the writer must catch before the detector does. */
export const SWEPT_CHECK_IDS = new Set([
  "e4_instruction_leak",
  "e6_counsel_referral",
]);

/** Machinery / non-prose keys are never swept. */
const SKIP_KEYS = new Set([
  "citation", "citations", "proposition_key", "element_id", "decision",
  "rule_ids", "status", "verdict", "conclusion", "label", "id", "check_id",
  "requirement_id", "severity", "deadline", "owner_role", "rank",
  "anchor_keys", "spine_id", "disclaimer",
]);

/** Sentence split that keeps terminal punctuation with the sentence. */
export function splitSentences(text: string): string[] {
  const out: string[] = [];
  const re = /[^.!?\n]+(?:[.!?]+|\n+|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (!m[0]) break;
    out.push(m[0]);
  }
  return out.length > 0 ? out : [text];
}

/** True when the detector marks this sentence as an operator-instruction leak. */
export function sentenceLeaks(sentence: string): boolean {
  const s = sentence.trim();
  if (s.length < 12) return false;
  try {
    const findings = runFormatChecksGeneric(s, { intakeRoster: "" });
    return findings.some((f) => !f.passed && SWEPT_CHECK_IDS.has(f.check_id));
  } catch {
    return false; // fail-open: never degrade a leaf on a detector crash
  }
}

export interface AdmtOperatorSweepDiag {
  version: string;
  leaves_scanned: number;
  leaves_swept: number;
  sentences_removed: number;
  guard_kept_original: number;
  crashed: boolean;
}

/**
 * Sweep ONE string. Returns the cleaned text plus the removed sentences.
 * The empty-surface guard returns the original untouched.
 */
export function sweepLeaf(text: string): { out: string; removed: string[] } {
  const sentences = splitSentences(text);
  const removed: string[] = [];
  const kept: string[] = [];
  for (const s of sentences) {
    if (sentenceLeaks(s)) removed.push(s.trim());
    else kept.push(s);
  }
  if (removed.length === 0) return { out: text, removed };
  const next = kept.join("").replace(/[ \t]+\n/g, "\n").replace(/\s+$/g, "");
  if (next.replace(/\s+/g, " ").trim().length < MIN_SUBSTANCE) {
    // ITEM 384 r2 guard — keep the original rather than ship a stub.
    return { out: text, removed: [] };
  }
  return { out: next, removed };
}

export function sweepAdmtOperatorInstructions(report: unknown): AdmtOperatorSweepDiag {
  const diag: AdmtOperatorSweepDiag = {
    version: ADMT_OPERATOR_SWEEP_VERSION,
    leaves_scanned: 0,
    leaves_swept: 0,
    sentences_removed: 0,
    guard_kept_original: 0,
    crashed: false,
  };
  const notes: string[] = [];
  try {
    const r = report as Record<string, unknown> | null;
    if (!r || typeof r !== "object") return diag;

    const walk = (node: unknown, key?: string): unknown => {
      if (typeof node === "string") {
        if (key && (SKIP_KEYS.has(key) || key.startsWith("_"))) return node;
        if (node.length < 60) return node;
        diag.leaves_scanned++;
        const { out, removed } = sweepLeaf(node);
        if (removed.length === 0) {
          if (out === node && /\S/.test(node) && sentenceLeaks(node) ) diag.guard_kept_original++;
          return node;
        }
        diag.leaves_swept++;
        diag.sentences_removed += removed.length;
        for (const s of removed) notes.push(s);
        return out;
      }
      if (Array.isArray(node)) return node.map((v) => walk(v, key));
      if (node && typeof node === "object") {
        const o = node as Record<string, unknown>;
        for (const k of Object.keys(o)) {
          if (k.startsWith("_")) continue;
          o[k] = walk(o[k], k);
        }
        return o;
      }
      return node;
    };

    for (const k of Object.keys(r)) {
      if (k.startsWith("_") || k === "_meta") continue;
      r[k] = walk(r[k], k);
    }
    if (notes.length > 0) {
      const prior = Array.isArray((r as Record<string, unknown>)._operator_notes)
        ? ((r as Record<string, unknown>)._operator_notes as string[])
        : [];
      (r as Record<string, unknown>)._operator_notes = [...prior, ...notes];
    }
  } catch (err) {
    diag.crashed = true;
    console.warn("[admt-operator-instruction-sweep] failed (non-fatal):", (err as Error)?.message);
  }
  return diag;
}
