/**
 * ITEM 428 (PIECE A) — STRUCTURAL CONFORMANCE.
 *
 * R11 pinned GRAMMAR through assembly. This pins STRUCTURE through assembly:
 * the plan-fidelity batteries pin each SPINE against its plan row, but nothing
 * pinned the ASSEMBLED DOCUMENT against the plan. This does.
 *
 * THE RULE, for every product carrying an approved plan:
 *   - every REQUIRED section is CARRIED by the assembled document;
 *   - when the caller supplies the renderer's section order, the sections
 *     appear in PLAN ORDER;
 *   - a section is either present-with-content, HONESTLY EMPTY (an empty
 *     collection — "there is nothing here"), or honestly ABSENT.
 *     PRESENT-AND-HOLLOW FAILS: a surface occupied by "Not recorded.", "N/A",
 *     "None." and nothing else is padding. That is the rule that stops a rigid
 *     outline manufacturing a "Not recorded." litany to fill its own shape.
 *
 * Pure, allocation-light, and FAIL-OPEN at runtime: the finalize seams attach
 * the result at `_meta.internal.structure_conformance` and mutate nothing.
 */

import { planSectionsFor, type PlanSection } from "./plans/approved-plans.ts";

export const STRUCTURE_CONFORMANCE_VERSION = "structure-conformance@item428-2026-08-09";

/**
 * Plan `source_key`s name the COMPOSER's input slot. Where the assembled
 * customer document names that same content differently, the candidate keys
 * are declared here — a section is satisfied by ANY candidate. Every alias was
 * READ OFF a persisted document at HEAD (2026-08-09); none is invented.
 *
 * Candidate syntax: `a.b` (dotted path), `a[].b` (fan out over an array),
 * `a[id=x]` / `a[key~=x]` (address a collection element by exact id or by a
 * substring of its `key`). A bare segment also resolves against `sections`,
 * `forms`, `items`, `entries` or `rows` collections addressed by element id.
 */
export const SECTION_KEY_ALIASES: Readonly<Record<string, readonly string[]>> = Object.freeze({
  // ── cppa-risk ─────────────────────────────────────────────────────
  "cppa-risk:executive_lead": ["executive_summary"],
  "cppa-risk:normalised_intake": ["processing_narrative"],
  "cppa-risk:eu_persuasive_authority": ["eu_persuasive_authority", "authority_exhibit"],
  "cppa-risk:priority_actions": ["priority_actions", "next_steps"],

  // ── cppa-cyber ────────────────────────────────────────────────────
  // the programme facts and the auditor-engagement finding ship on the
  // executive summary / independence determination (see CYBER_COVERAGE_LINKS).
  "cppa-cyber:programme_record": ["programme_record", "executive_summary"],
  "cppa-cyber:audit_schedule": ["audit_schedule", "independence_determination"],

  // ── biometric (item409 v2 plan) ───────────────────────────────────
  "biometric:processing_record": ["processing_record", "biometric_deliverables.narrative.part1_overview"],
  // S-B1 (doc 80, 2026-08-27): the § 15(b) duty split into 15b1_/15b2_/15b3_
  // rows; the alias pattern drops the trailing underscore so all three match.
  "biometric:consent_and_notice": ["consent_and_notice", "duty_findings[key~=15b]"],
  "biometric:retention_and_destruction": ["retention_and_destruction", "duty_findings[key~=15a_]"],
  "biometric:security_and_disclosure": [
    "security_and_disclosure", "duty_findings[key~=15e_]", "duty_findings[key~=15d_]",
  ],
  "biometric:information_needed": [
    "information_needed", "biometric_deliverables.attestation.information_needed",
  ],

  // ── governance ────────────────────────────────────────────────────
  "governance:enforcement_context": ["enforcement_context", "enforcement_precedents", "enforcement_meta"],

  // ── dpia ──────────────────────────────────────────────────────────
  "dpia:executive_summary": ["executive_summary", "determination"],

  // ── registration (deterministic product; the register is nested) ──
  "registration:determinations": ["registration_deliverables.determinations"],
  "registration:determinations[].threshold": ["registration_deliverables.determinations[].threshold"],
  "registration:representative_determinations": ["registration_deliverables.representative_determinations"],
  "registration:dpo_determination": ["registration_deliverables.dpo_determination", "obligations_summary.dpo_required"],
  "registration:schedules": ["registration_deliverables.schedules"],
  "registration:filing_readiness": ["registration_deliverables.filing_readiness"],
  "registration:filing_steps": ["registration_deliverables.filing_steps", "registration_deliverables.schedules"],
  "registration:corpus_pending": ["registration_deliverables.corpus_pending"],
  // registration's deterministic pipeline records unmet record needs as
  // `warnings`; there is no `information_needed` surface on this product.
  "registration:information_needed": [
    "registration_deliverables.information_needed", "information_needed", "warnings",
  ],
  "registration:attestation": ["registration_deliverables.attestation"],
});

/**
 * Sections the DOCUMENT does not carry because the RENDERER emits them
 * unconditionally on every copy (the standard disclaimer). Declared, not
 * silently tolerated: conformance reports them as `renderer_supplied`.
 */
export const RENDERER_SUPPLIED_SECTIONS: readonly string[] = Object.freeze([
  "cppa-cyber:disclaimer",
  "biometric:disclaimer",
]);

export type ConformanceStatus =
  | "present"
  | "empty_honest"
  | "renderer_supplied"
  | "absent_conditional"
  | "missing_required"
  | "padded_empty"
  | "out_of_order";

export interface SectionConformance {
  readonly id: string;
  readonly key: string;
  readonly required: boolean;
  readonly status: ConformanceStatus;
}

export interface StructureConformanceResult {
  readonly version: string;
  readonly product: string;
  readonly artifact?: string;
  readonly ok: boolean;
  readonly checked: number;
  readonly order_checked: boolean;
  readonly sections: readonly SectionConformance[];
  readonly missing_required: readonly string[];
  readonly padded_empty: readonly string[];
  readonly out_of_order: readonly string[];
  readonly absent_conditional: readonly string[];
  readonly empty_honest: readonly string[];
}

/** Strings that occupy a surface without saying anything. */
const HOLLOW = new Set([
  "", "-", "—", "–", "n/a", "na", "none", "none.", "not applicable", "not applicable.",
  "not recorded", "not recorded.", "not stated", "not stated.", "not provided", "not provided.",
  "null", "undefined", "[object object]", "tbd", "tbd.", "pending", "pending.",
]);

const COLLECTION_KEYS = ["sections", "forms", "items", "entries", "rows"];

function hollowString(s: string): boolean {
  return HOLLOW.has(s.trim().toLowerCase());
}

/** Does this value say anything a reader could act on? */
export function hasSubstance(value: unknown, depth = 0): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return true;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") return !hollowString(value);
  if (depth > 6) return false;
  if (Array.isArray(value)) return value.some((v) => hasSubstance(v, depth + 1));
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([k]) => !k.startsWith("_"))
      .some(([, v]) => hasSubstance(v, depth + 1));
  }
  return false;
}

/** An empty collection is honest emptiness, never padding. */
export function isEmptyCollection(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0;
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>).filter((k) => !k.startsWith("_")).length === 0;
  }
  return value === null || value === undefined || value === "";
}

function addressCollection(bag: Record<string, unknown>, segment: string): unknown {
  // `duty_findings[key~=15b_]` / `sections[id=severity_matrix]`
  const m = segment.match(/^([A-Za-z0-9_]+)\[([A-Za-z0-9_]+)(~?=)([^\]]+)\]$/);
  if (m) {
    const [, coll, field, op, want] = m;
    const arr = bag[coll];
    if (!Array.isArray(arr)) return undefined;
    return arr.find((el) => {
      const v = (el as Record<string, unknown>)?.[field];
      return typeof v === "string" && (op === "=" ? v === want : v.includes(want));
    });
  }
  // bare id addressed against a nested collection (IR sections/forms)
  for (const coll of COLLECTION_KEYS) {
    const arr = bag[coll];
    if (!Array.isArray(arr)) continue;
    const hit = arr.find((el) => {
      const r = el as Record<string, unknown>;
      return r?.id === segment || r?.key === segment;
    });
    if (hit !== undefined) return hit;
  }
  return undefined;
}

/**
 * Plan `source_key`s may be dotted paths into a nested artifact
 * (`standing_playbook.severity_matrix`), array-element paths
 * (`determinations[].threshold`) or collection addresses.
 */
export function resolvePath(doc: unknown, path: string): { found: boolean; value: unknown } {
  const parts = path.split(".");
  let cur: unknown = doc;
  for (let i = 0; i < parts.length; i++) {
    const rawPart = parts[i];
    const fanOut = rawPart.endsWith("[]");
    const key = fanOut ? rawPart.slice(0, -2) : rawPart;
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return { found: false, value: undefined };
    const bag = cur as Record<string, unknown>;

    if (key in bag) {
      cur = bag[key];
    } else {
      const addressed = addressCollection(bag, rawPart);
      if (addressed === undefined) return { found: false, value: undefined };
      cur = addressed;
      continue;
    }

    if (fanOut) {
      if (!Array.isArray(cur)) return { found: false, value: undefined };
      const rest = parts.slice(i + 1).join(".");
      if (!rest) return { found: true, value: cur };
      if ((cur as unknown[]).length === 0) return { found: true, value: [] }; // honestly empty
      const hits = (cur as unknown[]).map((el) => resolvePath(el, rest)).filter((r) => r.found);
      return hits.length ? { found: true, value: hits.map((h) => h.value) } : { found: false, value: undefined };
    }
  }
  return { found: true, value: cur };
}

function candidateKeys(product: string, section: PlanSection): string[] {
  const alias = SECTION_KEY_ALIASES[`${product}:${section.source_key}`];
  return alias ? [...alias] : [section.source_key];
}

export interface ConformanceOptions {
  /** IR only: the artifact whose register is being checked. */
  readonly artifact?: string;
  /**
   * The RENDERER's section order (document keys or plan section ids, in the
   * order the reader meets them). Order is evaluated only when supplied —
   * a JSON object's key order is not a rendered order and is never used.
   */
  readonly renderOrder?: readonly string[];
}

export function checkStructureConformance(
  product: string,
  document: Record<string, unknown> | null | undefined,
  options: ConformanceOptions = {},
): StructureConformanceResult {
  const { artifact, renderOrder } = options;
  const sections = planSectionsFor(product, artifact);
  const doc = (document && typeof document === "object" ? document : {}) as Record<string, unknown>;

  const rows: SectionConformance[] = [];
  const missing_required: string[] = [];
  const padded_empty: string[] = [];
  const out_of_order: string[] = [];
  const absent_conditional: string[] = [];
  const empty_honest: string[] = [];

  for (const section of sections) {
    if (RENDERER_SUPPLIED_SECTIONS.includes(`${product}:${section.source_key}`)) {
      rows.push({ id: section.id, key: section.source_key, required: section.required, status: "renderer_supplied" });
      continue;
    }

    const keys = candidateKeys(product, section);
    const resolved = keys.map((k) => ({ k, ...resolvePath(doc, k) }));
    const hit = resolved.find((r) => r.found && hasSubstance(r.value));
    if (hit) {
      rows.push({ id: section.id, key: hit.k, required: section.required, status: "present" });
      continue;
    }

    const occupied = resolved.find((r) => r.found);
    if (occupied) {
      if (isEmptyCollection(occupied.value)) {
        empty_honest.push(section.id);
        rows.push({ id: section.id, key: occupied.k, required: section.required, status: "empty_honest" });
      } else {
        // Present on the surface, saying nothing — THE PADDING FAILURE.
        padded_empty.push(section.id);
        rows.push({ id: section.id, key: occupied.k, required: section.required, status: "padded_empty" });
      }
      continue;
    }

    if (section.required) {
      missing_required.push(section.id);
      rows.push({ id: section.id, key: keys[0], required: true, status: "missing_required" });
    } else {
      absent_conditional.push(section.id);
      rows.push({ id: section.id, key: keys[0], required: false, status: "absent_conditional" });
    }
  }

  // ── ORDER, only against a real rendered order ─────────────────────
  const order_checked = Array.isArray(renderOrder) && renderOrder.length > 0;
  if (order_checked) {
    let highWater = -1;
    for (const row of rows) {
      if (row.status !== "present") continue;
      const idx = Math.max(
        renderOrder!.indexOf(row.id),
        renderOrder!.indexOf(row.key),
        renderOrder!.indexOf(row.key.split(/[.[]/)[0]),
      );
      if (idx < 0) continue; // the renderer does not name this section
      if (idx < highWater) out_of_order.push(row.id);
      else highWater = idx;
    }
  }

  return {
    version: STRUCTURE_CONFORMANCE_VERSION,
    product,
    ...(artifact ? { artifact } : {}),
    ok: missing_required.length === 0 && padded_empty.length === 0 && out_of_order.length === 0,
    checked: sections.length,
    order_checked,
    sections: rows,
    missing_required,
    padded_empty,
    out_of_order,
    absent_conditional,
    empty_honest,
  };
}

/** Compact, FAIL-OPEN telemetry for `_meta.internal.structure_conformance`. */
export function structureConformanceTelemetry(
  product: string,
  document: Record<string, unknown> | null | undefined,
  options: ConformanceOptions = {},
): Record<string, unknown> {
  try {
    const r = checkStructureConformance(product, document, options);
    return {
      version: r.version,
      product: r.product,
      ...(r.artifact ? { artifact: r.artifact } : {}),
      ok: r.ok,
      checked: r.checked,
      order_checked: r.order_checked,
      missing_required: r.missing_required,
      padded_empty: r.padded_empty,
      out_of_order: r.out_of_order,
      absent_conditional: r.absent_conditional,
      empty_honest: r.empty_honest,
    };
  } catch (e) {
    return {
      version: STRUCTURE_CONFORMANCE_VERSION,
      product,
      ok: null,
      error: (e as Error)?.message ?? "unknown",
    };
  }
}
