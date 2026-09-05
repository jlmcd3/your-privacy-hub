/**
 * True when a draft payload carries at least one non-blank scalar.
 *
 * QA batch 2026-09-05 (RA 01 / AD 03): two tool pages compared their live
 * draft against a HAND-WRITTEN empty snapshot to decide whether the customer
 * had typed anything; the snapshots drifted from the forms, the comparison was
 * permanently "touched", and the blank first render autosaved over the
 * customer's server draft. useToolDraft now refuses to write a payload this
 * function rejects, whatever the page's own gate says.
 *
 * Pure module (no React, no client) so the rule is testable in vitest.
 */
export function hasContent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some(hasContent);
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some(hasContent);
  return false;
}
