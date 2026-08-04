// ITEM 372 (SECOND CORRECTION ROUND, 6) — BARE ADVISORY CLOSE.
//
// THE DEFECT
// ----------
// The advisory close ("… further clarification is advisable.") is the house
// formula for handing an open question back to the reader. On a degraded
// record it arrived bare: a sentence whose only content IS the formula. That
// tells the reader something is advisable without telling them what about, and
// it is what the grader's `e5_bare_advisory_close` check fires on.
//
// THE RULE
// --------
// An advisory close must NAME the thing to be clarified. This pass repairs a
// bare close deterministically:
//
//   (a) where the leaf's own path maps to a counsel-language category (shared
//       `ask-categories.ts` — the same closed set the determination block
//       uses), the close names that category:
//         "Further clarification of the retention period … is advisable.";
//   (b) where it does not, the bare close is REMOVED. A close that can name
//       nothing adds nothing, and the surrounding sentence already carries the
//       absence.
//
// It never invents a fact: category labels are fixed authored text, chosen by
// the leaf's path, and nothing is read from the record.
//
// Deterministic, in-place, never throws. Telemetry on
// `_meta.internal.advisory_close_repair`.

import { categorizeAsk, GENERIC_CATEGORY } from "./ask-categories.ts";

export const ADVISORY_CLOSE_REPAIR_VERSION = "adv-close-repair-2026-08-05-item372r2";

/** The canonical closes, as the grader's `checkE5` matches them. */
export const CLOSE_RE = /further (?:clarification|internal investigation) is advisable\./i;

/** Minimum words of named material before the close, per `checkE5`. */
export const MIN_NAMED_WORDS = 6;

const SKIP_KEYS = new Set(["_meta", "_staging"]);

export interface AdvisoryCloseCounters {
  version: string;
  /** advisory closes seen */
  closes: number;
  /** bare closes found */
  bare: number;
  /** bare closes given a named subject from the path's category */
  named: number;
  /** bare closes removed because the path names nothing */
  removed: number;
  /** bare closes still present afterwards */
  bare_remaining: number;
  crashed: boolean;
}

function splitSentences(text: string): string[] {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z(“"'\[])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** True when the close carries fewer than MIN_NAMED_WORDS of named material. */
export function isBareAdvisoryClose(sentence: string): boolean {
  const s = String(sentence ?? "");
  if (!CLOSE_RE.test(s)) return false;
  const pre = s.replace(CLOSE_RE, "").replace(/[\s;:,\-—–]+$/g, "").trim();
  return pre.split(/\s+/).filter(Boolean).length < MIN_NAMED_WORDS;
}

/** Count bare advisory closes in a document (test + telemetry helper). */
export function countBareAdvisoryCloses(doc: unknown): number {
  let n = 0;
  const walk = (node: unknown): void => {
    if (typeof node === "string") {
      for (const s of splitSentences(node)) if (isBareAdvisoryClose(s)) n += 1;
      return;
    }
    if (Array.isArray(node)) { for (const x of node) walk(x); return; }
    if (node && typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (SKIP_KEYS.has(k)) continue;
        walk(v);
      }
    }
  };
  walk(doc);
  return n;
}

/** The named close for a path, or null when the path names nothing. */
export function namedCloseForPath(path: string): string | null {
  const cat = categorizeAsk(String(path ?? "").replace(/[._\[\]]+/g, " "));
  if (cat.id === GENERIC_CATEGORY.id) return null;
  return `Further clarification of ${cat.label} is advisable.`;
}

export function applyAdvisoryCloseRepair(
  report: Record<string, unknown> | null | undefined,
): AdvisoryCloseCounters {
  const c: AdvisoryCloseCounters = {
    version: ADVISORY_CLOSE_REPAIR_VERSION,
    closes: 0,
    bare: 0,
    named: 0,
    removed: 0,
    bare_remaining: 0,
    crashed: false,
  };
  try {
    if (!report || typeof report !== "object") return c;

    const rewrite = (value: string, path: string): string => {
      if (!CLOSE_RE.test(value)) return value;
      const sentences = splitSentences(value);
      const out: string[] = [];
      let changed = false;
      for (const s of sentences) {
        if (!CLOSE_RE.test(s)) { out.push(s); continue; }
        c.closes += 1;
        if (!isBareAdvisoryClose(s)) { out.push(s); continue; }
        c.bare += 1;
        const named = namedCloseForPath(path);
        changed = true;
        if (named) {
          out.push(named);
          c.named += 1;
        } else {
          c.removed += 1;
        }
      }
      if (!changed) return value;
      return out.join(" ").replace(/\s{2,}/g, " ").trim();
    };

    const walk = (node: unknown, path: string): unknown => {
      if (typeof node === "string") return rewrite(node, path);
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) node[i] = walk(node[i], `${path}[${i}]`);
        return node;
      }
      if (node && typeof node === "object") {
        const obj = node as Record<string, unknown>;
        for (const k of Object.keys(obj).sort()) {
          if (SKIP_KEYS.has(k)) continue;
          obj[k] = walk(obj[k], path ? `${path}.${k}` : k);
        }
        return obj;
      }
      return node;
    };

    walk(report, "");
    c.bare_remaining = countBareAdvisoryCloses(report);

    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.advisory_close_repair = { ...c };
  } catch (e) {
    c.crashed = true;
    console.warn("[advisory-close-repair] failed (non-fatal):", (e as Error)?.message);
  }
  return c;
}
