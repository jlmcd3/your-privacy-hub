// QA round two (ROPA-B-02 / ROPA-C02, 2026-09-06) — RoPA version numbering.
//
// start-ropa-refresh took the next version number as MAX(version_number) over
// the whole client. A workspace that documents several companies against one
// client row therefore shares a single counter: the QA account produced
// versions 1–5 for customer A, then 6–8 for customer B, then 9–11 for
// customer C, so a refresh the UI promised as "v2" was generated as
// "Version 9".
//
// A version belongs to its own register. The sequence is scoped to the refresh
// LINEAGE — the chain of parent_session_id links a session descends from.

export interface LineageRow {
  id: string;
  parent_session_id: string | null;
  version_number: number | null;
}

/**
 * The root of the chain `sourceId` belongs to. Guarded against a cycle and
 * against a parent that is not among the supplied rows.
 */
export function lineageRoot(rows: readonly LineageRow[], sourceId: string): string {
  const byId = new Map(rows.map((r) => [r.id, r]));
  let rootId = sourceId;
  const seen = new Set<string>([rootId]);
  for (;;) {
    const parent = byId.get(rootId)?.parent_session_id ?? null;
    if (!parent || seen.has(parent) || !byId.has(parent)) return rootId;
    rootId = parent;
    seen.add(parent);
  }
}

/** Every session descended from `rootId`, including the root itself. */
export function lineageMembers(rows: readonly LineageRow[], rootId: string): Set<string> {
  const lineage = new Set<string>([rootId]);
  for (let grew = true; grew;) {
    grew = false;
    for (const r of rows) {
      if (r.parent_session_id && lineage.has(r.parent_session_id) && !lineage.has(r.id)) {
        lineage.add(r.id);
        grew = true;
      }
    }
  }
  return lineage;
}

/**
 * The version number a refresh of `sourceId` should carry: one past the
 * highest version already in that register's lineage. Never lower than
 * `sourceVersion + 1`, so a session whose siblings are not visible still
 * advances.
 */
export function nextLineageVersion(
  rows: readonly LineageRow[],
  sourceId: string,
  sourceVersion: number,
): number {
  const lineage = lineageMembers(rows, lineageRoot(rows, sourceId));
  const max = rows
    .filter((r) => lineage.has(r.id))
    .reduce((m, r) => Math.max(m, Number(r.version_number ?? 0)), 0);
  return Math.max(max, Number(sourceVersion ?? 0)) + 1;
}
