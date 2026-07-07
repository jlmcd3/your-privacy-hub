// Doc Q Phase 1 / Part 4 -- Re-run intake highlighting (Risk).
//
// Pure derivation from the prior assessment's report_data. Reads ONLY
// inconsistency_flags[].source_fields and information_needed[].field
// (the Section-A sources the Kit derives from -- Doc P W4/E1). The
// strengthen_items array is DELIBERATELY NEVER READ here (Doc Q 2b,
// P3/D5 binding: highlighting NEVER fires on strengthen-only changes).
//
// Callers gate the RENDER of these fields behind IMPROVEMENT_KIT_ENABLED
// and the Professional check; this function itself has no gating so it
// is testable directly.
//
// Return shape: fieldId -> ordered list of item_ids that named that
// field. Used to build the per-field chip ("From your open items
// (item_id, ...)") and the top count banner ("N fields relate to open
// items from your last run").

export type ReportDataLike = {
  inconsistency_flags?: unknown;
  information_needed?: unknown;
  // strengthen_items is intentionally omitted from the type used here.
} | null | undefined;

export interface ResolveFieldMap {
  fields: Record<string, string[]>; // fieldId -> item_ids
  fieldOrder: string[];             // insertion order, for scroll-to-first
  count: number;                    // fieldOrder.length
}

export function deriveResolveFields(report: ReportDataLike): ResolveFieldMap {
  const fields: Record<string, string[]> = {};
  const fieldOrder: string[] = [];

  function push(fieldId: string, itemId: string) {
    if (!fieldId) return;
    if (!fields[fieldId]) {
      fields[fieldId] = [];
      fieldOrder.push(fieldId);
    }
    if (!fields[fieldId].includes(itemId)) fields[fieldId].push(itemId);
  }

  const flags = Array.isArray(report?.inconsistency_flags)
    ? (report!.inconsistency_flags as Array<Record<string, unknown>>)
    : [];
  for (let i = 0; i < flags.length; i++) {
    const f = flags[i];
    const itemId = String(f.id ?? `C-${i + 1}`);
    const sf = Array.isArray(f.source_fields) ? (f.source_fields as unknown[]) : [];
    for (const raw of sf) {
      if (typeof raw === "string" && raw) push(raw, itemId);
    }
    // Some historical rows carry intake_field_1/2 instead of source_fields.
    if (!sf.length) {
      const f1 = typeof f.intake_field_1 === "string" ? f.intake_field_1 : undefined;
      const f2 = typeof f.intake_field_2 === "string" ? f.intake_field_2 : undefined;
      if (f1) push(f1, itemId);
      if (f2 && f2 !== f1) push(f2, itemId);
    }
  }

  const needs = Array.isArray(report?.information_needed)
    ? (report!.information_needed as Array<Record<string, unknown>>)
    : [];
  for (let i = 0; i < needs.length; i++) {
    const n = needs[i];
    const itemId = String(n.id ?? `N-${i + 1}`);
    const field =
      (typeof n.field === "string" && n.field) ||
      (typeof n.field_id === "string" && n.field_id) ||
      "";
    if (field) push(field as string, itemId);
  }

  return { fields, fieldOrder, count: fieldOrder.length };
}
