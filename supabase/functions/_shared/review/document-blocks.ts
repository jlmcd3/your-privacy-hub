// /all-ptest v2 (DOC 261, 2026-09-14) — THE DOCUMENT AS ADDRESSABLE BLOCKS.
//
// Workers do not review "the document"; they review BLOCKS, each with a key
// (`section:index`, the same coordinate the spine, the composers, the engine
// provenance and the tables use — RenderedParagraph.key). This module turns a
// persisted report into that list, renders it as the text the worker sees
// (every paragraph and table prefixed with its key), and reads the COMPOSED
// LIST — which blocks the engine actually composed for this document, from
// which intake keys, citing which authorities (`_meta.internal.factor_provenance`).
//
// Pure. A record generated before DOC 261 carries no keys and no provenance;
// keys are synthesised as `section#pN` so the validator still has an anchor,
// and the composed list is empty (W-LAW then runs in fixed-prose mode).

import { decodeHtmlEntities } from "./document-source.ts";

type Bag = Record<string, unknown>;

export interface DocBlock {
  readonly key: string;
  readonly section_id: string;
  readonly section_title: string;
  readonly kind: string;
  /** The reviewer-visible text of the block (a table flattened to lines). */
  readonly text: string;
  /** True when the key was synthesised (pre-DOC-261 record). */
  readonly synthetic_key: boolean;
}

export interface ComposedRow {
  readonly block_key: string;
  readonly factor_id: string;
  readonly factor_class: string;
  readonly sources: readonly string[];
  readonly authorities: readonly string[];
}

interface TableLike {
  key?: string;
  title?: string;
  columns?: unknown[];
  rows?: unknown[][];
  note?: string;
}
interface ParagraphLike { kind?: string; text?: string; key?: string; table?: TableLike }
interface SectionLike { id?: string; title?: string; paragraphs?: ParagraphLike[] }

function tableText(t: TableLike): string {
  const lines: string[] = [];
  if (t.title) lines.push(String(t.title));
  if (Array.isArray(t.columns) && t.columns.length) lines.push(t.columns.map(String).join(" | "));
  for (const row of t.rows ?? []) lines.push((row ?? []).map((c) => String(c ?? "")).join(" | "));
  if (t.note) lines.push(String(t.note));
  return lines.join("\n");
}

/** The document's blocks, in reading order. Consecutive paragraphs sharing a key are merged. */
export function extractBlocks(reportData: unknown): DocBlock[] {
  const rd = (reportData && typeof reportData === "object") ? reportData as Bag : {};
  const sk = rd.skeleton_document as { sections?: SectionLike[] } | undefined;
  const out: DocBlock[] = [];
  if (!sk || !Array.isArray(sk.sections)) return out;
  for (const s of sk.sections) {
    const sid = String(s.id ?? "");
    const title = String(s.title ?? "");
    (s.paragraphs ?? []).forEach((p, i) => {
      const synthetic = !p.key && !p.table?.key;
      const key = p.table?.key ?? p.key ?? `${sid}#p${i}`;
      const text = decodeHtmlEntities(p.table ? tableText(p.table) : String(p.text ?? ""));
      if (!text.trim()) return;
      const last = out[out.length - 1];
      if (last && last.key === key && !p.table) {
        out[out.length - 1] = { ...last, text: `${last.text}\n\n${text}` };
        return;
      }
      out.push({ key, section_id: sid, section_title: title, kind: p.table ? "table" : String(p.kind ?? "generated"), text, synthetic_key: synthetic });
    });
  }
  return out;
}

/** Key → block text (for quote anchoring). */
export function blockTextMap(blocks: readonly DocBlock[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const b of blocks) m.set(b.key, m.has(b.key) ? `${m.get(b.key)}\n\n${b.text}` : b.text);
  return m;
}

/** The text a worker reads: section headings, then `[key] text` per block. */
export function renderBlocksText(blocks: readonly DocBlock[]): string {
  const parts: string[] = [];
  let section = "";
  for (const b of blocks) {
    if (b.section_id !== section) {
      section = b.section_id;
      parts.push("", `## ${b.section_title || b.section_id}`, "");
    }
    parts.push(`[${b.key}]${b.kind === "table" ? " TABLE" : ""}\n${b.text}`, "");
  }
  return parts.join("\n").trim();
}

/** The composed list persisted by the generator (risk today; empty elsewhere). */
export function composedListOf(reportData: unknown): ComposedRow[] {
  const rd = (reportData && typeof reportData === "object") ? reportData as Bag : {};
  const internal = ((rd._meta as Bag | undefined)?.internal ?? {}) as Bag;
  const rows = Array.isArray(internal.factor_provenance) ? internal.factor_provenance as Bag[] : [];
  const out: ComposedRow[] = [];
  for (const r of rows) {
    if (typeof r.block_key !== "string" || !r.block_key) continue;
    out.push({
      block_key: r.block_key,
      factor_id: String(r.factor_id ?? ""),
      factor_class: String(r.factor_class ?? ""),
      sources: Array.isArray(r.sources) ? r.sources.map(String) : [],
      authorities: Array.isArray(r.authorities) ? r.authorities.map(String) : [],
    });
  }
  return out;
}

/** The composed list as prompt text, grouped by block key. */
export function renderComposedList(rows: readonly ComposedRow[]): string {
  if (!rows.length) return "(no composed list is recorded for this document — every block is treated as fixed prose or unmapped)";
  const byKey = new Map<string, ComposedRow[]>();
  for (const r of rows) {
    if (!byKey.has(r.block_key)) byKey.set(r.block_key, []);
    byKey.get(r.block_key)!.push(r);
  }
  const lines: string[] = [];
  for (const [key, group] of byKey) {
    const factors = group.map((g) => g.factor_id).join(", ");
    const sources = [...new Set(group.flatMap((g) => g.sources))].join(", ");
    const auth = [...new Set(group.flatMap((g) => g.authorities))].join("; ");
    lines.push(`${key} | factors: ${factors}${sources ? ` | reads: ${sources}` : ""}${auth ? ` | cites: ${auth}` : ""}`);
  }
  return lines.join("\n");
}

/** Intake keys a block reads (INTAKE:key sources), for the validator. */
export function intakeKeysForBlock(rows: readonly ComposedRow[], blockKey: string): string[] {
  const keys = new Set<string>();
  for (const r of rows) {
    if (r.block_key !== blockKey) continue;
    for (const s of r.sources) if (s.startsWith("INTAKE:")) keys.add(s.slice("INTAKE:".length));
  }
  return [...keys];
}

/** Authorities a block cites, for the validator / W-LAW binding. */
export function authoritiesForBlock(rows: readonly ComposedRow[], blockKey: string): string[] {
  const out = new Set<string>();
  for (const r of rows) if (r.block_key === blockKey) for (const a of r.authorities) out.add(a);
  return [...out];
}
