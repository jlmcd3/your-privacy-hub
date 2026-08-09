/**
 * ITEM 422 — LEGACY-SAFETY PROOF (the corruption guard) for ADMT.
 *
 * Two REAL persisted ADMT documents from `quality_run_documents` whose
 * `priority_actions` are arrays of strings are rendered through the CUSTOMER
 * PDF PATH (`renderPriorityActionsOrderedHtml`, the ADMT ordered block) and
 * asserted BYTE-IDENTICAL to the pre-change render captured at HEAD before
 * the ITEM 422 contract extension.
 *
 * If either differs by one byte: STOP. Do NOT adjust the assertion.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { renderPriorityActionsOrderedHtml } from "../../../supabase/functions/generate-report-pdf/_local/priority-actions-html.ts";

const IDS = [
  "6146db76-0838-4cbe-b7b2-d5673c1eacc4",
  "049eb026-79f1-46af-94fd-ae4d1267e1c4",
] as const;

const dir = new URL("../fixtures/item422/", import.meta.url);

for (const id of IDS) {
  Deno.test(`ITEM 422 legacy-safety: ${id} ADMT priority-actions render is byte-identical`, async () => {
    const doc = JSON.parse(await Deno.readTextFile(new URL(`${id}.json`, dir)));
    const pa = doc.report_data.priority_actions;
    assert(Array.isArray(pa) && pa.length > 0, "fixture must carry priority_actions");
    assert(pa.every((x: unknown) => typeof x === "string"), "fixture must be a string array");

    const pre = await Deno.readTextFile(new URL(`${id}.priority-actions.pre.html`, dir));
    const post = renderPriorityActionsOrderedHtml(doc.report_data);

    assertEquals(post.length, pre.length, "byte length drift in ADMT Priority Actions block");
    assertEquals(post, pre, "ADMT Priority Actions block is NOT byte-identical to the pre-change render");
  });
}
