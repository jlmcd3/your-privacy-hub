// product-test-grade — customer-text extraction.
//
// Tries the shared skeleton/document extractor first (covers the seven
// products that persist report_data.skeleton_document / document_text /
// playbook_text / assessment_text — see `_shared/grader/payload.ts`
// `extractCustomerDocument`). Falls back to the remaining field names
// `assertionRunner.ts` (src/lib/tests/assertionRunner.ts:280-420) actually
// merges onto `output` for the tools that don't route through that shared
// extractor, mirroring `getText()` in src/lib/tests/assertionTests.ts:64-81
// (reimplemented here, not imported — that module lives in the frontend
// source tree, not a supabase function's `_local`, and is a five-line
// fallback chain, not a module worth mirroring).

import { extractCustomerDocument } from "../../../_shared/grader/payload.ts";
import type { ProductTestTool } from "../types.ts";

export interface CustomerText {
  readonly field: string;
  readonly text: string;
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function customerTextOf(
  _tool: ProductTestTool,
  output: Record<string, unknown>,
): CustomerText {
  const doc = extractCustomerDocument(output ?? {});
  if (doc) return doc;

  const candidates: ReadonlyArray<readonly [string, unknown]> = [
    ["dpa_text", output?.dpa_text],
    ["playbook_text", output?.playbook_text],
    ["notice_text", output?.notice_text],
    ["document_text", output?.document_text],
    ["report_text", output?.report_text],
    ["content", output?.content],
    ["text", output?.text],
  ];
  for (const [field, v] of candidates) {
    if (typeof v === "string" && v.length > 0) return { field, text: v };
  }
  // RoPA's assertionRunner output is a summary object with no text field at
  // all ({ documentVersionId, activitiesCount, jurisdictionsCovered }) — the
  // JSON stringification is the best available "customer text" and every
  // structure/fidelity check below degrades honestly against it (most will
  // fail the length floor and the leak scan is a no-op on structured JSON).
  return { field: "json", text: safeStringify(output ?? {}) };
}

/** Split a flattened document into paragraph-shaped chunks for "same
 *  paragraph" proximity checks (fidelity.ts, cross-block.ts). Mirrors the
 *  blank-line convention `flattenSkeletonForGrader` / `skeletonDocumentToText`
 *  use to separate blocks. */
export function paragraphsOf(text: string): string[] {
  return text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}
