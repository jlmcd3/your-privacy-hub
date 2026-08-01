/**
 * ITEM 337 (PROSE PROGRAM 1, Part D1) — HEDGE-ONLY VALUE DEGRADATION.
 *
 * The counsel hedge ("The organisation should confirm whether the described
 * position applies here.") is a QUALIFIER, never a finding. In the 2026-08-01
 * governance and dpia reports the hedge had replaced the ENTIRE
 * `engaged_because` / rationale value, so the customer read a report that
 * asserted nothing and named nothing.
 *
 * MANDATORY DEGRADATION LAW: an engagement that cannot be verified from the
 * record degrades to a NAMED information-needed item — never to a bare hedge.
 *
 * Pure. Never throws.
 */

export const HEDGE_DEGRADE_VERSION = "prose-hedge-degrade-2026-08-01-item337";

/** Fields whose value must carry a finding, not a qualifier. */
export const RATIONALE_KEYS: ReadonlySet<string> = new Set([
  "engaged_because",
  "engagement_rationale",
  "rationale",
  "basis",
  "reasoning",
  "why_engaged",
  "determination_basis",
]);

export interface HedgeDegradeResult {
  degraded: number;
  items: { question: string; field: string; element?: string }[];
}

function hedgeOnly(value: unknown, hedges: readonly string[]): boolean {
  const t = String(value ?? "").trim();
  if (!t) return false;
  return hedges.some((h) => t === h.trim());
}

function labelOf(parent: Record<string, unknown>): string | undefined {
  for (const k of ["element", "requirement", "topic", "title", "name", "chapter", "id"]) {
    const v = parent[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

/**
 * Walk the report; wherever a rationale-class field holds ONLY the hedge,
 * clear it, flag the node, and return a named information-needed item.
 * The caller appends the items to the report's information_needed surface.
 */
export function degradeHedgeOnlyValues(
  report: unknown,
  hedges: readonly string[],
): HedgeDegradeResult {
  const res: HedgeDegradeResult = { degraded: 0, items: [] };
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== "object") return;
    const obj = node as Record<string, unknown>;
    for (const [k, v] of Object.entries(obj)) {
      if (RATIONALE_KEYS.has(k) && hedgeOnly(v, hedges)) {
        const label = labelOf(obj);
        obj[k] = "";
        obj.information_needed = true;
        obj.insufficient_basis = true;
        res.degraded += 1;
        res.items.push({
          question: label
            ? `Provide the record evidence that establishes whether "${label}" is engaged — the assessment record does not support a determination.`
            : `Provide the record evidence for the "${k}" determination — the assessment record does not support a determination.`,
          field: k,
          element: label,
        });
        continue;
      }
      if (v && typeof v === "object") walk(v);
    }
  };
  try {
    walk(report);
  } catch {
    /* fail-open — never block emission */
  }
  return res;
}

/** Append degradation items to a report's information_needed array. */
export function appendInformationNeeded(
  report: unknown,
  items: readonly { question: string; field: string; element?: string }[],
): void {
  try {
    if (!report || typeof report !== "object" || items.length === 0) return;
    const r = report as Record<string, unknown>;
    const arr = Array.isArray(r.information_needed) ? r.information_needed as unknown[] : [];
    const seen = new Set(arr.map((x) => JSON.stringify(x)));
    for (const it of items) {
      const row = { question: it.question, source_field: it.field, element: it.element ?? null };
      const k = JSON.stringify(row);
      if (!seen.has(k)) {
        arr.push(row);
        seen.add(k);
      }
    }
    r.information_needed = arr;
  } catch {
    /* fail-open */
  }
}
