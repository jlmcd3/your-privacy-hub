// Pure verification helpers over a CorpusMap. No I/O, no DB access — pin
// checks run against a committed SNAPSHOT fixture (doc 52 §1: local tests
// cannot reach Supabase; live re-verification is a T2 review concern).

import type { CamRow, CorpusMap } from "./cam-types.ts";

export interface CorpusSnapshot {
  readonly captured_at: string;
  readonly rows: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

/** True iff row.pinned_excerpt is an exact contiguous substring of the
 * snapshot's text for row.source_row_id / row.excerpt_field. */
export function excerptPinned(row: CamRow, snapshot: CorpusSnapshot): boolean {
  const fields = snapshot.rows[row.source_row_id];
  if (!fields) return false;
  const text = fields[row.excerpt_field];
  if (typeof text !== "string") return false;
  return text.includes(row.pinned_excerpt);
}

/** Schema invariants over a whole map. Returns a list of violation
 * messages; empty means the map is valid. Phase-1 locks enforced here
 * (role === "FC" only; render_eligible === false on every row) because
 * the CamRow TS type alone can't express the phase-1-only role
 * restriction. */
export function mapInvariants(map: CorpusMap): string[] {
  const problems: string[] = [];
  const seenIds = new Set<string>();

  for (const row of map.rows) {
    if (seenIds.has(row.id)) {
      problems.push(`duplicate CamRow id: ${row.id}`);
    }
    seenIds.add(row.id);

    if (row.role !== "FC") {
      problems.push(`${row.id}: role must be "FC" in phase 1 (found "${row.role}")`);
    }
    if (row.render_eligible !== false) {
      problems.push(`${row.id}: render_eligible must be false in phase 1`);
    }
    if (row.logic_bearing && !row.logic_disposition) {
      problems.push(`${row.id}: logic_bearing rows require logic_disposition`);
    }
    if (!row.logic_bearing && row.logic_disposition) {
      problems.push(`${row.id}: logic_disposition set on a non-logic_bearing row`);
    }
    if (row.pinned_excerpt.length > 300) {
      problems.push(`${row.id}: pinned_excerpt exceeds 300 chars (${row.pinned_excerpt.length})`);
    }
    if (row.pinned_excerpt.length === 0) {
      problems.push(`${row.id}: pinned_excerpt is empty`);
    }
    if (!row.curation_note.trim()) {
      problems.push(`${row.id}: curation_note is empty`);
    }
    if (!row.provenance.verified_on.trim()) {
      problems.push(`${row.id}: provenance.verified_on is empty`);
    }
  }

  return problems;
}
