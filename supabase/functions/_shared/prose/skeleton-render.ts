// ITEM SO-1/SO-2 WIRE-IN — GENERIC SKELETON DOCUMENT RENDERER.
//
// The byte-pinned skeletons (`plans/*.spine.ts`) are render law. This module is
// the ONE place that turns a spine + a slot-value bag + composed generated
// blocks into the assembled customer document. It is product-agnostic: it knows
// nothing about CPPA Risk or ADMT, only about the block kinds the spines use.
//
// LAW ENFORCED HERE:
//   * fixed prose is byte-pinned OUTSIDE its {slots}; the literal segments are
//     extracted from the spine and re-checked against the assembled text by
//     `verifySkeletonConformance` — a mismatch is a conformance failure.
//   * a conditional/lead/generated block with no composed content is OMITTED
//     ENTIRELY. Never padded, never announced.
//   * a sentence-level slot resolved to `null` drops its whole sentence; an
//     inline clause slot resolved to `""` drops just the clause.
//   * D3 SUPERSESSION: every COMPOSED block is swept through `repairRegister`
//     on the way into the document, so no composer — model-authored or a
//     hardcoded template string — can land the v3 banned register family in a
//     shipped document. Fixed spine prose is byte-pinned law and untouched.

import { repairRegister } from "../ltp/register-repair.ts";

export interface SpineBlockLike {
  readonly kind: string;
  readonly text: string;
}

export interface SpineSectionLike {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly SpineBlockLike[];
}

/**
 * `null`  → the sentence containing the slot is dropped entirely.
 * `""`    → the slot renders as nothing, the surrounding sentence survives.
 * string  → substituted verbatim.
 */
export type SlotValues = Record<string, string | null | undefined>;

/** Composed prose for the non-fixed blocks, keyed `${sectionId}:${index}`. */
export type ComposedBlocks = Record<string, string | null | undefined>;

/**
 * PROMPT 8 (CEO-ratified 2026-08-11) — TABLE BLOCKS.
 *
 * A `table` block in a spine carries NO prose at all: its `text` names the
 * typed surface it renders (e.g. `processing_inventory.controllers`). The
 * product's assembler supplies the rendered table, keyed `${sectionId}:${i}`
 * exactly like a composed block. Cells are verbatim from the typed surface —
 * this module never writes a cell and never invents a row.
 *
 * NO-PADDING LAW applies unchanged: a table block with no rows is OMITTED
 * ENTIRELY, never rendered as an empty grid and never announced.
 */
export interface RenderedTable {
  /** `${sectionId}:${blockIndex}` — the block this table answers. */
  readonly key: string;
  /** The typed surface path the spine named. */
  readonly surface: string;
  readonly title: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly string[])[];
  /** Optional single-line note printed under the table (verbatim). */
  readonly note?: string;
  /**
   * CEO report review 2026-08-24 — a label/value table (e.g. the cover
   * summary) whose column headers ("Field", "Value") add no information
   * the row's own first cell doesn't already state. When true, the
   * renderer omits the header row entirely; `columns` still governs cell
   * count/order.
   */
  readonly hideHeader?: boolean;
}

export type SkeletonTables = Record<string, RenderedTable | null | undefined>;

export interface RenderedParagraph {
  readonly kind: string;
  readonly text: string;
  /** Present only on `kind: "table"` paragraphs. */
  readonly table?: RenderedTable;
}

export interface RenderedSection {
  readonly id: string;
  readonly title: string;
  readonly paragraphs: readonly RenderedParagraph[];
}

export interface RenderedSkeletonDocument {
  readonly _typed: "skeleton-document@so-wire-in";
  readonly spine_version: string;
  readonly title: string;
  readonly subtitle: string;
  readonly sections: readonly RenderedSection[];
  /** PROMPT 8 — every table rendered in this document, in document order. */
  readonly tables?: readonly RenderedTable[];
}

const SENTINEL = "\u0000";

/** Slot name as written in the spine, i.e. everything before ` - ` or `=`. */
export function slotName(raw: string): string {
  return raw.split(" - ")[0].split("=")[0].trim();
}

/** Every slot name appearing in a block, in order. */
export function slotsIn(text: string): string[] {
  return [...text.matchAll(/\{([^{}]+)\}/g)].map((m) => slotName(m[1]));
}

/**
 * The byte-pinned literal segments of a fixed-prose string — everything outside
 * the braces. These are what conformance byte-matches.
 */
export function fixedLiterals(text: string): string[] {
  return text
    .split(/\{[^{}]+\}/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Substitute slots into one fixed-prose string, applying the drop rules. */
export function renderFixed(text: string, values: SlotValues): string {
  let out = text.replace(/\{([^{}]+)\}/g, (_m, raw: string) => {
    const name = slotName(raw);
    const v = values[name];
    if (v === null || v === undefined) return SENTINEL;
    return v;
  });

  if (out.includes(SENTINEL)) {
    // Drop any sentence that carries a dropped sentence-level slot.
    out = out
      .split(/(?<=\.)\s+/)
      .filter((s) => !s.includes(SENTINEL))
      .join(" ");
    // A sentinel that survived (mid-sentence) leaves nothing behind.
    out = out.split(SENTINEL).join("");
  }

  return out.replace(/\s{2,}/g, " ").replace(/\s+([.,;])/g, "$1").trim();
}

/**
 * ITEM 4 — FIRST ToA FIX (presentation only). Applies the deterministic
 * register repair line by line so multi-line composed blocks (the Table of
 * Authorities above all) keep their vertical layout and leading indent.
 */
export function repairLinePreserving(text: string): string {
  if (!text.includes("\n")) return repairRegister(text);
  return text
    .split("\n")
    .map((line) => {
      const indent = /^\s*/.exec(line)?.[0] ?? "";
      const repaired = repairRegister(line);
      return repaired ? indent + repaired : "";
    })
    .join("\n");
}

/**
 * ITEM 4 — FIRST ToA FIX (CEO-directed, 2026-08-15; presentation only).
 *
 * The single source of truth for laying a Table of Authorities section out
 * VERTICALLY: one authority (or group heading) per line, single column, in the
 * ledger's own order. Shared by every product whose spine carries a
 * `table_of_authorities` section — cppa-risk, cppa-cyber, cppa-admt,
 * governance, dpia, lia, ir-playbook, biometric, registration and RoPA.
 *
 * Never joins two citations onto one line. Legacy documents whose ToA was
 * persisted already flattened are re-split on the citation boundary so the
 * vertical layout holds for them too. Entry bytes, order and count are
 * unchanged.
 */
export interface ToaLine {
  readonly text: string;
  readonly is_heading: boolean;
}

export function toaLines(text: string): ToaLine[] {
  const raw = String(text ?? "");
  let lines = raw.split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim());
  if (lines.length === 1) {
    // Legacy flattened ledger: break before each group heading and each
    // citation start, without touching the citation text itself.
    const one = lines[0];
    const marked = one
      .replace(/\s*(Regulations|Statutes|Guidance and Persuasive Authority(?: \(persuasive\))?)\s+/g, "\n$1\n    ")
      .replace(/\s+(?=(?:UK )?GDPR Art\.|(?:UK )?GDPR Recital|EDPB |Directive |Regulation \(EU\))/g, "\n    ");
    lines = marked.split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim());
  }
  return lines.map((l) => ({ text: l.trim(), is_heading: !/^\s/.test(l) }));
}



export interface RenderSkeletonArgs {
  readonly sections: readonly SpineSectionLike[];
  readonly title: string;
  readonly subtitle: string;
  readonly spineVersion: string;
  readonly values: SlotValues;
  readonly composed: ComposedBlocks;
  /** PROMPT 8 — rendered tables for `table` blocks, keyed `${sectionId}:${i}`. */
  readonly tables?: SkeletonTables;
}

export function renderSkeletonDocument(args: RenderSkeletonArgs): RenderedSkeletonDocument {
  const sections: RenderedSection[] = [];
  const tables: RenderedTable[] = [];

  for (const section of args.sections) {
    const paragraphs: RenderedParagraph[] = [];
    section.blocks.forEach((block, i) => {
      const key = `${section.id}:${i}`;
      if (block.kind === "skeleton") {
        const text = renderFixed(block.text, args.values);
        if (text) paragraphs.push({ kind: "skeleton", text });
        return;
      }
      if (block.kind === "table") {
        const t = args.tables?.[key];
        // NO-PADDING LAW: a table with no rows is honestly absent.
        if (!t || !Array.isArray(t.rows) || t.rows.length === 0) return;
        const table: RenderedTable = { ...t, key, surface: t.surface || block.text.trim() };
        tables.push(table);
        paragraphs.push({ kind: "table", text: "", table });
        return;
      }
      // lead / generated / conditional / rule — all supplied by the product
      // composer. No content means the block is honestly absent.
      const composed = args.composed[key];
      if (composed && composed.trim()) {
        // ITEM 4 — FIRST ToA FIX (CEO-directed, 2026-08-15; presentation only).
        // `repairRegister` collapses runs of whitespace, which flattened the
        // Table of Authorities' one-authority-per-line layout into a run-on
        // paragraph. Repair is applied PER LINE, preserving line structure and
        // the leading indent. Entry bytes, order and count are untouched.
        //
        // PROMPT 9I (CEO-ratified 2026-08-15; presentation only) — a composed
        // block separated by BLANK LINES renders as one paragraph per part, so
        // a composer can paragraph its own analysis. Bytes are untouched.
        for (const part of composed.trim().split(/\n{2,}/)) {
          const text = repairLinePreserving(part.trim());
          if (text) paragraphs.push({ kind: block.kind, text });
        }
      }


    });
    if (paragraphs.length > 0) {
      sections.push({ id: section.id, title: section.title, paragraphs });
    }
  }

  return {
    _typed: "skeleton-document@so-wire-in",
    spine_version: args.spineVersion,
    title: args.title,
    subtitle: renderFixed(args.subtitle, args.values),
    sections,
    ...(tables.length > 0 ? { tables } : {}),
  };
}

/** Flatten one rendered table to text (title, header row, cells). */
export function skeletonTableToText(t: RenderedTable): string {
  const lines: string[] = [];
  if (t.title) lines.push(t.title);
  if (t.columns.length) lines.push(t.columns.join(" | "));
  for (const row of t.rows) lines.push(row.join(" | "));
  if (t.note) lines.push(t.note);
  return lines.join("\n");
}

export interface ConformanceFinding {
  readonly section_id: string;
  readonly missing_literal: string;
}

/**
 * CONFORMANCE (SO step 5): the assembled document must byte-match the skeleton
 * outside the slots. Every literal segment of every fixed-prose block must
 * appear, verbatim and in order, in the rendered section.
 *
 * A fixed block whose sentence was legitimately dropped by a `null` slot is
 * exempt only for the literals that sat inside that dropped sentence, so the
 * check runs per surviving paragraph rather than per source block.
 *
 * ITEM SO-11 refinement: when the caller passes the SAME `values` the renderer
 * used, the exemption is computed EXACTLY rather than inferred. Each sentence of
 * the block is rendered on its own; a sentence that renders empty was dropped by
 * a null slot and its literals are exempt, and every OTHER sentence must byte-
 * match in full. Without `values` the previous whole-literal heuristic stands,
 * so every pre-SO-11 caller is unaffected. The heuristic could not see a literal
 * that STRADDLES a sentence boundary — the tail of a surviving sentence plus the
 * whole of a dropped one — and reported the survivor's tail as missing.
 */
export function verifySkeletonConformance(
  doc: RenderedSkeletonDocument,
  sections: readonly SpineSectionLike[],
  values?: SlotValues,
): ConformanceFinding[] {
  const findings: ConformanceFinding[] = [];
  const bySection = new Map(doc.sections.map((s) => [s.id, s]));

  for (const section of sections) {
    const rendered = bySection.get(section.id);
    if (!rendered) continue;
    const body = rendered.paragraphs
      .filter((p) => p.kind === "skeleton")
      .map((p) => p.text)
      .join(" ");
    if (!body) continue;

    for (const block of section.blocks) {
      if (block.kind !== "skeleton") continue;

      if (values) {
        for (const sentence of block.text.split(/(?<=\.)\s+/)) {
          if (!sentence.trim()) continue;
          // A sentence the renderer dropped is honestly absent, not missing.
          if (!renderFixed(sentence, values)) continue;
          // A bare lettered sub-head ("C. Scale.") governs the sentences after
          // it. When every one of those was dropped, the product's assembler
          // prunes the orphaned heading — that is the skeleton's own no-padding
          // rule, not a conformance breach.
          if (/^[A-D]\.\s+[A-Z][^.]*\.$/.test(sentence.trim()) && !body.includes(sentence.trim())) continue;
          for (const literal of fixedLiterals(sentence)) {
            if (literal.length < 12) continue;
            const needle = literal.replace(/\s{2,}/g, " ");
            const stubless = needle.replace(/^[.!?;:,]+\s*/, "");
            if (!body.includes(needle) && !body.includes(stubless)) {
              findings.push({ section_id: section.id, missing_literal: needle.slice(0, 120) });
            }
          }
        }
        continue;
      }

      for (const literal of fixedLiterals(block.text)) {

        // Literals shorter than a clause are noise; the substantive spans are
        // what the panel ratified.
        if (literal.length < 12) continue;
        const needle = literal.replace(/\s{2,}/g, " ");
        // A literal that begins mid-sentence can open with the stop of the
        // PRECEDING sentence (". The jurisdictions whose laws ..."). When that
        // preceding sentence is legitimately dropped by a null slot, its stop
        // goes with it, so the surviving span is the needle minus the stub.
        const stubless = needle.replace(/^[.!?;:,]+\s*/, "");
        if (!body.includes(needle) && !body.includes(stubless)) {
          // Tolerate only the case where the whole sentence was dropped. A
          // literal that begins mid-sentence can start with a bare "." (the
          // stop of the PRECEDING sentence); that stub is punctuation, not a
          // substantive span, so it is not evidence the sentence survived.
          const dropped = needle
            .split(/(?<=\.)\s+/)
            .filter((s) => s.trim().length >= 12)
            .every((s) => !body.includes(s.trim()));

          if (!dropped) findings.push({ section_id: section.id, missing_literal: needle.slice(0, 120) });
        }

      }
    }
  }
  return findings;
}

/** Flatten to plain text — used by conformance tests and the pilot proof. */
export function skeletonDocumentToText(doc: RenderedSkeletonDocument): string {
  const parts: string[] = [doc.title, doc.subtitle, ""];
  for (const s of doc.sections) {
    parts.push(s.title, "");
    for (const p of s.paragraphs) {
      // PROMPT 8 — table cells are document content: the Table of Authorities'
      // iff-cited test and the grader both read this flattening.
      parts.push(p.table ? skeletonTableToText(p.table) : p.text, "");
    }
  }
  return parts.join("\n").trimEnd();
}

// ── Table of Authorities ────────────────────────────────────────────────────
// Deterministic, iff-cited, brief order. Shared by every product whose
// skeleton carries a Table of Authorities section.

export const TOA_GROUPS = [
  "Regulations",
  "Statutes",
  "Guidance and Persuasive Authority",
] as const;

export function groupAuthority(pinpoint: string): typeof TOA_GROUPS[number] {
  if (/\b\d+\s*CCR\b|\bC\.F\.R\.\b|\bCFR\b/.test(pinpoint)) return "Regulations";
  if (/§\s*1798|Civ\.\s*Code|U\.S\.C\.|ILCS|\bAct\b/.test(pinpoint)) return "Statutes";
  return "Guidance and Persuasive Authority";
}

/**
 * Renders the Table of Authorities from the document's citation ledger, keeping
 * only authorities actually cited in the assembled body (the iff-cited test).
 */
export function renderTableOfAuthorities(
  ledgerPinpoints: readonly string[],
  assembledBody: string,
  // RK3-D (risk doc 33 D-L8) — factor-authority provenance records. The risk
  // spine's App G descriptor sanctions this second source ("Phase C adds
  // factor-authority provenance records"). These authorities underpin factor
  // determinations whose prose is deliberately citation-free, so they render
  // in their own labelled group rather than passing the iff-cited filter;
  // authorities already cited in the body are not repeated. Callers that pass
  // two arguments (cyber, ADMT) are byte-unchanged.
  factorAuthorities: readonly string[] = [],
): string {
  // PANEL CYB-6 (2026-08-30): plain .sort() is ASCII order, which filed
  // "§ 7123(c)(10)" between "(1)" and "(2)" in every ToA with two-digit
  // pinpoints. Numeric-aware comparison sorts subsections as counsel
  // expects; lists without multi-digit pinpoints are ordered as before.
  const naturalCompare = (a: string, b: string): number =>
    a.localeCompare(b, "en", { numeric: true, sensitivity: "variant" });
  const cited = [...new Set(ledgerPinpoints.filter((p) => p && assembledBody.includes(p)))];
  const relied = [...new Set(factorAuthorities.filter(Boolean))]
    .filter((a) => !cited.includes(a))
    .sort(naturalCompare);
  if (cited.length === 0 && relied.length === 0) return "";

  const lines: string[] = [];
  for (const group of TOA_GROUPS) {
    const inGroup = cited.filter((p) => groupAuthority(p) === group).sort(naturalCompare);
    if (inGroup.length === 0) continue;
    lines.push(group === "Guidance and Persuasive Authority" ? `${group} (persuasive)` : group);
    for (const p of inGroup) lines.push(`    ${p}`);
  }
  if (relied.length) {
    lines.push("Authorities Relied On in the Analysis (factor determinations; not pinpoint-cited in the text)");
    for (const a of relied) lines.push(`    ${a}`);
  }
  return lines.join("\n");
}
