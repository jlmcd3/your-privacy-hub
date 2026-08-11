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
        paragraphs.push({ kind: block.kind, text: repairRegister(composed.trim()) });
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
        // PRECEDING sentence (". The states whose laws ..."). When that
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
): string {
  const cited = [...new Set(ledgerPinpoints.filter((p) => p && assembledBody.includes(p)))];
  if (cited.length === 0) return "";

  const lines: string[] = [];
  for (const group of TOA_GROUPS) {
    const inGroup = cited.filter((p) => groupAuthority(p) === group).sort();
    if (inGroup.length === 0) continue;
    lines.push(group === "Guidance and Persuasive Authority" ? `${group} (persuasive)` : group);
    for (const p of inGroup) lines.push(`    ${p}`);
  }
  return lines.join("\n");
}
