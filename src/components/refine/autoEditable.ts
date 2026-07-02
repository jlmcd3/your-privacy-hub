import type { EditableFieldSpec } from "@/components/refine/RefinePanel";

const HIDE_KEYS = new Set([
  "id", "user_id", "client_id", "created_at", "updated_at",
  "status", "stage", "preview_signal", "report_data", "document_text",
]);

function humanize(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Given the intake object and lockedFields, derive an ordered set of editable
// field specs by dropping locked/hidden keys. Strings ≥ 80 chars → textarea;
// arrays/objects → textarea (JSON, user edits as JSON). All others → text input.
// The caller is responsible for JSON-parsing on submit if needed — but for now
// RefinePanel emits string values verbatim; the generator's intake_data merge
// preserves whatever type the field already was for keys the user didn't touch,
// so we only auto-convert arrays↔CSV.
export function autoEditableFromIntake(
  intake: Record<string, unknown> | null,
  lockedFields: Record<string, unknown> | null,
): EditableFieldSpec[] {
  if (!intake) return [];
  const locked = new Set(Object.keys(lockedFields ?? {}));
  const out: EditableFieldSpec[] = [];
  for (const key of Object.keys(intake)) {
    if (locked.has(key) || HIDE_KEYS.has(key)) continue;
    const v = intake[key];
    let kind: EditableFieldSpec["kind"] = "text";
    if (typeof v === "string" && v.length > 80) kind = "textarea";
    else if (Array.isArray(v) || (v && typeof v === "object")) kind = "textarea";
    out.push({ key, label: humanize(key), kind });
  }
  return out;
}
