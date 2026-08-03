/**
 * UPGRADE-4 (ITEM 4) — BOILERPLATE SOURCE FIX for run-li-assessment.
 *
 * THE DEFECT, AND WHERE IT ACTUALLY COMES FROM
 * --------------------------------------------
 * Two exact strings were repeating inside a single LIA document:
 *
 *   ×25  "We could not verify this item from the information provided; it is
 *         listed under information needed."
 *   ×5   "The organisation should confirm whether the described position
 *         applies here."
 *
 * Neither is model output. Both are emitted by deterministic post-passes that
 * run in THIS function's pipeline:
 *
 *   • the ×25 string is the single replacement literal in `degrade()` in
 *     `_shared/emit-gate.ts` (rendered through `renderMessage("information.
 *     needed")`). The gate degrades every leaf that fails its checks, and it
 *     writes the SAME sentence into each one. Twenty-five degraded leaves →
 *     twenty-five identical sentences.
 *   • the ×5 string is `NEUTRAL_DOWNGRADE` in `./_lia_t6_fix.ts`, substituted
 *     for each unsupported assertive sentence.
 *
 * WHY THE FIX LIVES HERE AND NOT IN THE SHARED MODULES
 * ----------------------------------------------------
 * `emit-gate.ts` and `customer-messages.ts` are shared by every product, and
 * the identical-replacement behaviour is load-bearing for the other tools'
 * gate tests (they assert the exact literal). Changing the literal, or making
 * it vary, at that layer would be a cross-product change and is out of scope.
 * So this is a LIA-owned post-pass that runs immediately after the two
 * emitters, and enforces the document-level invariant the specification asks
 * for: neither phrase appears more than twice in any one document.
 *
 * WHAT IT DOES
 * ------------
 * Deterministic walk in stable key order. The first two occurrences of a
 * controlled phrase are left byte-identical (so existing gate/downgrade tests
 * that look for the literal still pass). From the third occurrence onward the
 * sentence is replaced by the next phrasing in that phrase's variant pool —
 * same meaning, same neutrality, no new facts and no new advice. The pool is
 * cycled by occurrence index, so the same input always yields the same output.
 *
 * Nothing is deleted: an item that needed flagging is still flagged, only in
 * different words. Fail-open — any error leaves the report untouched.
 */

export const LIA_BOILERPLATE_CAP = 2;

/** The exact literals the two upstream emitters write. */
export const INFO_NEEDED_LITERAL =
  "We could not verify this item from the information provided; it is listed under information needed.";
export const NEUTRAL_DOWNGRADE_LITERAL =
  "The organisation should confirm whether the described position applies here.";

/**
 * Variant pools. Each variant is a drop-in replacement for its literal:
 * neutral, non-advisory, asserts nothing the literal did not assert, and
 * keeps the reader pointed at the same place (the information-needed list /
 * the unconfirmed position).
 */
const INFO_NEEDED_VARIANTS: readonly string[] = [
  "The record as it stands does not resolve this point; it is carried in the information needed list.",
  "This point is unresolved on the present record and appears among the items of information needed.",
  "The information supplied does not settle this item; see the information needed list.",
  "This item remains open on the record and is tracked under information needed.",
  "The record does not yet answer this point; it is listed with the other information needed.",
  "No answer to this point appears in the record; it is carried under information needed.",
  "This point is not resolved by the material supplied and sits in the information needed list.",
];

const NEUTRAL_DOWNGRADE_VARIANTS: readonly string[] = [
  "Whether the described position applies here is not settled by the record.",
  "The record does not establish that the described position applies here.",
  "It remains to be confirmed whether the described position holds in this case.",
  "The described position is stated without support in the record for this case.",
  "Nothing in the record confirms that the described position applies here.",
];

interface Controlled {
  literal: string;
  variants: readonly string[];
}

const CONTROLLED: readonly Controlled[] = [
  { literal: INFO_NEEDED_LITERAL, variants: INFO_NEEDED_VARIANTS },
  { literal: NEUTRAL_DOWNGRADE_LITERAL, variants: NEUTRAL_DOWNGRADE_VARIANTS },
];

export interface LiaBoilerplateCounters {
  scanned_strings: number;
  /** occurrences seen per literal (before rewriting) */
  occurrences: Record<string, number>;
  /** occurrences rewritten to a variant */
  rewrites: number;
  crashed: boolean;
}

function emptyCounters(): LiaBoilerplateCounters {
  return {
    scanned_strings: 0,
    occurrences: { info_needed: 0, neutral_downgrade: 0 },
    rewrites: 0,
    crashed: false,
  };
}

const OCC_KEY = ["info_needed", "neutral_downgrade"] as const;

/**
 * Replace occurrences of `literal` beyond the cap with pool variants.
 * `seen` is carried across the whole document so the cap is document-wide.
 */
function rewriteString(
  s: string,
  seen: number[],
  c: LiaBoilerplateCounters,
): string {
  let out = s;
  for (let i = 0; i < CONTROLLED.length; i++) {
    const { literal, variants } = CONTROLLED[i];
    if (!out.includes(literal)) continue;
    let cursor = 0;
    let rebuilt = "";
    for (;;) {
      const at = out.indexOf(literal, cursor);
      if (at === -1) {
        rebuilt += out.slice(cursor);
        break;
      }
      rebuilt += out.slice(cursor, at);
      const n = seen[i];
      seen[i] = n + 1;
      c.occurrences[OCC_KEY[i]] = seen[i];
      if (n < LIA_BOILERPLATE_CAP) {
        rebuilt += literal;
      } else {
        rebuilt += variants[(n - LIA_BOILERPLATE_CAP) % variants.length];
        c.rewrites += 1;
      }
      cursor = at + literal.length;
    }
    out = rebuilt;
  }
  return out;
}

function walk(node: unknown, seen: number[], c: LiaBoilerplateCounters): unknown {
  if (node == null) return node;
  if (typeof node === "string") {
    c.scanned_strings += 1;
    return rewriteString(node, seen, c);
  }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) node[i] = walk(node[i], seen, c);
    return node;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    // Stable order: the walk must be deterministic for the same input.
    for (const k of Object.keys(obj).sort()) {
      if (k === "_meta") continue; // never rewrite internal telemetry
      obj[k] = walk(obj[k], seen, c);
    }
    return obj;
  }
  return node;
}

/**
 * Enforce the document-wide repetition cap. Mutates in place, returns counters.
 * Never throws.
 */
export function applyLiaBoilerplateCap(
  report: Record<string, unknown> | null | undefined,
): LiaBoilerplateCounters {
  const c = emptyCounters();
  try {
    if (!report || typeof report !== "object") return c;
    walk(report, [0, 0], c);
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = ((meta as any).internal ??= {}) as Record<string, unknown>;
    internal.lia_boilerplate_cap = {
      cap: LIA_BOILERPLATE_CAP,
      ...c,
    };
  } catch (e) {
    c.crashed = true;
    console.warn(
      "[lia-boilerplate-cap] failed (non-fatal):",
      (e as Error)?.message,
    );
  }
  return c;
}

/** Test helper: count literal occurrences in a serialized document. */
export function countLiaBoilerplate(doc: unknown): Record<string, number> {
  const json = typeof doc === "string" ? doc : JSON.stringify(doc ?? {});
  const count = (lit: string) => json.split(lit).length - 1;
  return {
    info_needed: count(INFO_NEEDED_LITERAL),
    neutral_downgrade: count(NEUTRAL_DOWNGRADE_LITERAL),
  };
}
