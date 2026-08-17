// PROMPT 12E — RENDERED-DOCUMENT SCOPE FOR THE IFF-CITED ToA GATE.
//
// CEO ruling (2026-08-17): the Table of Authorities gate tests against what the
// CUSTOMER SEES. The customer's PDF is the assembled skeleton body PLUS the
// legacy conclusion surfaces that `generate-report-pdf` still renders from the
// persisted report row. The review-schedule sentence lives there and cites
// GDPR Art. 35(11); an authority the customer reads must be listed.
//
// This module is an ENUMERATION, not a scan. Exactly the surfaces the PDF
// renderer reads under "6. Conclusion and Decision" are listed below, mirroring
// `generate-report-pdf/index.ts` (the `cc = report.section_6_conclusion` block).
// No open-ended report walk: an unenumerated field contributes nothing.
//
// Renderer surfaces mirrored (generate-report-pdf, section 6):
//   section_6_conclusion.decision
//   section_6_conclusion.conditions[]                      (string list)
//   section_6_conclusion.supervisory_authority_consultation_required
//   section_6_conclusion.validation_approval.text
//   section_6_conclusion.validation_approval.approved_by_name
//   section_6_conclusion.validation_approval.approved_by_title
//   section_6_conclusion.validation_approval.approval_date
//   section_6_conclusion.validation_approval.basis_for_sign_off
//   section_6_conclusion.validation_approval.information_needed
//   section_6_conclusion.validation_approval.template_ref
//   section_6_conclusion.review_schedule
//   section_6_conclusion.justification
// NOT included: section_6_conclusion.sign_off_template — a boolean flag that
// renders a fixed signature block carrying no record-supplied text.

type Bag = Record<string, unknown>;

/** Enumerated leaf paths, relative to `section_6_conclusion`. */
export const DPIA_RENDERED_CONCLUSION_SURFACES: readonly string[] = [
  "decision",
  "conditions",
  "supervisory_authority_consultation_required",
  "validation_approval.text",
  "validation_approval.approved_by_name",
  "validation_approval.approved_by_title",
  "validation_approval.approval_date",
  "validation_approval.basis_for_sign_off",
  "validation_approval.information_needed",
  "validation_approval.template_ref",
  "review_schedule",
  "justification",
];

function leaf(root: unknown, path: string): unknown {
  let cur: unknown = root;
  for (const part of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Bag)[part];
  }
  return cur;
}

function flatten(v: unknown, out: string[]): void {
  if (typeof v === "string") {
    if (v.trim()) out.push(v);
    return;
  }
  if (Array.isArray(v)) {
    for (const x of v) flatten(x, out);
    return;
  }
  if (v && typeof v === "object") {
    for (const x of Object.values(v as Bag)) flatten(x, out);
  }
}

/**
 * The text of the enumerated legacy conclusion surfaces, in renderer order.
 * Returns "" when the record carries none of them.
 */
export function dpiaRenderedConclusionText(report: unknown): string {
  const cc = (report && typeof report === "object")
    ? (report as Bag).section_6_conclusion
    : undefined;
  if (!cc || typeof cc !== "object") return "";
  const parts: string[] = [];
  for (const path of DPIA_RENDERED_CONCLUSION_SURFACES) {
    flatten(leaf(cc, path), parts);
  }
  return parts.join("\n");
}
