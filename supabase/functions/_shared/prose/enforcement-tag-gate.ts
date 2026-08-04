// ITEM 372 (SECOND CORRECTION ROUND, 4) — ENFORCEMENT TAG CITE-OR-STRIP.
//
// THE DEFECT
// ----------
// Enforcement-context ids (E1, E2, …) exist for the structured annotations
// array. `stripEnforcementTags` removes them from prose unconditionally, but a
// bracketed tag also survives on surfaces the stripper does not reach, and on
// a degraded record the annotations array itself comes back empty. The reader
// then meets "[E3]" in a sentence with nothing anywhere in the document that
// "[E3]" points at — a citation to a thing that does not render.
//
// THE RULE
// --------
// CITE OR STRIP. A tag renders only if the item it names renders. The caller
// supplies the set of ids that ACTUALLY reach the document (annotations rows,
// enforcement precedent entries). Every tag naming an id outside that set is
// removed from prose, and the sentence is tidied behind it. When the set is
// empty, every tag goes.
//
// Deterministic, in-place, never throws. Telemetry on
// `_meta.internal.enforcement_tag_gate`.

export const ENFORCEMENT_TAG_GATE_VERSION = "enf-tag-gate-2026-08-05-item372r2";

/** `[E1]`, `[E2, E8]`, `(E3)`, `(E4, E7)` — the shapes the model emits. */
const TAG_RE = /[\[(]\s*(E\d+(?:\s*,\s*E?\d+)*)\s*[\])]/gi;

const SKIP_KEYS = new Set(["_meta", "_staging"]);

export interface EnforcementTagGateCounters {
  version: string;
  /** tags found in prose */
  found: number;
  /** tags kept because every id they name renders */
  kept: number;
  /** tags removed because at least one id they name does not render */
  stripped: number;
  /** ids the caller declared as rendering */
  rendered_ids: string[];
  /** tags still present after the pass */
  remaining: number;
  crashed: boolean;
}

/** Normalise a caller-supplied id ("e3", "E3", 3) to "E3". */
export function normalizeEnforcementId(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const m = s.match(/^E?(\d+)$/i);
  return m ? `E${m[1]}` : null;
}

/** The ids named by one tag body ("E2, E8" → ["E2","E8"]). */
function idsInTag(body: string): string[] {
  return body
    .split(",")
    .map((p) => normalizeEnforcementId(p))
    .filter((x): x is string => !!x);
}

/** Tidy the whitespace and punctuation a removed tag leaves behind. */
function tidy(text: string): string {
  return text
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([.,;:)])/g, "$1")
    .replace(/\(\s+/g, "(")
    .replace(/,\s*,/g, ",")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

/** Count enforcement tags anywhere in a document (test + telemetry helper). */
export function countEnforcementTags(doc: unknown): number {
  const json = typeof doc === "string" ? doc : JSON.stringify(doc ?? {});
  const hits = json.match(TAG_RE);
  return hits ? hits.length : 0;
}

/**
 * Collect the ids that actually render, from the two surfaces the reader can
 * follow a tag to: the structured annotations array and the enforcement
 * precedent list.
 */
export function renderedEnforcementIds(
  report: Record<string, unknown> | null | undefined,
): string[] {
  const out = new Set<string>();
  const collect = (rows: unknown) => {
    if (!Array.isArray(rows)) return;
    for (const r of rows) {
      if (!r || typeof r !== "object") continue;
      const rec = r as Record<string, unknown>;
      const id = normalizeEnforcementId(rec.id ?? rec.enforcement_id ?? rec.ref);
      if (id) out.add(id);
    }
  };
  collect(report?.annotations);
  collect(report?.enforcement_precedents);
  collect((report?.enforcement_context as Record<string, unknown> | undefined)?.items);
  return [...out].sort();
}

/**
 * Remove every enforcement tag whose ids do not all render. Mutates in place.
 */
export function applyEnforcementTagGate(
  report: Record<string, unknown> | null | undefined,
  opts: { renderedIds?: readonly string[] } = {},
): EnforcementTagGateCounters {
  const c: EnforcementTagGateCounters = {
    version: ENFORCEMENT_TAG_GATE_VERSION,
    found: 0,
    kept: 0,
    stripped: 0,
    rendered_ids: [],
    remaining: 0,
    crashed: false,
  };
  try {
    if (!report || typeof report !== "object") return c;

    const rendered = new Set(
      (opts.renderedIds ?? renderedEnforcementIds(report))
        .map((x) => normalizeEnforcementId(x))
        .filter((x): x is string => !!x),
    );
    c.rendered_ids = [...rendered].sort();

    const rewrite = (value: string): string => {
      TAG_RE.lastIndex = 0;
      if (!TAG_RE.test(value)) return value;
      TAG_RE.lastIndex = 0;
      let changed = false;
      const out = value.replace(TAG_RE, (whole, body: string) => {
        c.found += 1;
        const ids = idsInTag(body);
        const all = ids.length > 0 && ids.every((id) => rendered.has(id));
        if (all) {
          c.kept += 1;
          return whole;
        }
        c.stripped += 1;
        changed = true;
        return "";
      });
      return changed ? tidy(out) : out;
    };

    const walk = (node: unknown): unknown => {
      if (typeof node === "string") return rewrite(node);
      if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) node[i] = walk(node[i]);
        return node;
      }
      if (node && typeof node === "object") {
        const obj = node as Record<string, unknown>;
        for (const k of Object.keys(obj).sort()) {
          if (SKIP_KEYS.has(k)) continue;
          // The structured surfaces are where a tag legitimately lives as data.
          if (k === "annotations" || k === "enforcement_precedents" || k === "enforcement_context") continue;
          obj[k] = walk(obj[k]);
        }
        return obj;
      }
      return node;
    };

    walk(report);
    c.remaining = countEnforcementTags(report);

    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.enforcement_tag_gate = { ...c };
  } catch (e) {
    c.crashed = true;
    console.warn("[enforcement-tag-gate] failed (non-fatal):", (e as Error)?.message);
  }
  return c;
}
