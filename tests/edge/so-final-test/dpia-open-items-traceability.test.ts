// DPIA — the executive summary's "N points left unanswered" count must be
// traceable to visible content in the SAME document the reader receives.
// Regression: for any run with information_needed.length > 0, every entry's
// `dimensions` (or `field`) text appears in the rendered skeleton_document.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleDpiaSkeletonDocument,
} from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

const INTAKE = {
  organization_name: "Acme Health GmbH",
  processing_activity_name: "Patient triage analytics",
  description: "Automated triage scoring of patient intake records.",
  purpose: "Prioritise urgent cases",
};

const INFO_NEEDED = [
  {
    field: "retention_period",
    dimensions: "the retention period applied to triage scores, stated in months",
    provision: "GDPR Art. 5(1)(e)",
    enables: "The retention analysis in Section III",
  },
  {
    field: "transfer_safeguard",
    dimensions: "the Article 46 instrument relied on for the processor in the United States",
    provision: "GDPR Art. 46",
    enables: "The transfer determination",
  },
  {
    field: "dpo_name",
    dimensions: "the name and contact details of the data protection officer",
    provision: "GDPR Art. 37",
  },
];

function reportWith(entries: unknown[]): Record<string, unknown> {
  return {
    information_needed: entries,
    determination: "DRAFT — not yet cleared",
    risk_register: [],
  };
}

Deno.test("dpia skeleton: every information_needed entry is visible in the document", () => {
  const { document } = assembleDpiaSkeletonDocument(reportWith(INFO_NEEDED), INTAKE);
  const text = skeletonDocumentToText(document);

  for (const e of INFO_NEEDED) {
    const needle = (e.dimensions ?? e.field) as string;
    assert(text.includes(needle), `missing from skeleton_document: ${needle}`);
  }

  // The stated count matches the number of items actually rendered.
  // RE-PIN BATCH 19b (doc 113 S4.4): the open points render as the Rule-4
  // dash list under the byte-unchanged count lead; at three or fewer items
  // the list is complete ("They are:" then one "— " line per item).
  assert(/three points are still open/.test(text), text.slice(0, 800));
  assert(text.includes("They are:\n— "), text.slice(0, 800));
});

Deno.test("dpia skeleton: no count sentence when there are no open items", () => {
  const { document } = assembleDpiaSkeletonDocument(reportWith([]), INTAKE);
  const text = skeletonDocumentToText(document);
  assertEquals(/points open|point open/.test(text), false);
});
