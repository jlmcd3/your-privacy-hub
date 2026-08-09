/**
 * ITEM 420 — LEGACY-SAFETY PROOF (the corruption guard).
 *
 * Two REAL persisted legacy documents from `quality_run_documents` (captured
 * verbatim from the DB, 406-B fixture idiom) whose `priority_actions` are
 * arrays of strings are rendered through the CUSTOMER PDF PATH
 * (`renderPriorityActionsSectionHtml`, which index.ts now calls for that
 * section) and asserted BYTE-IDENTICAL to the pre-change render.
 *
 * The pre-change goldens were produced by the HEAD-as-of-ITEM-419 expression:
 *   listSection("priority_actions", "Priority Actions",
 *               coerceNarrativeList(report.priority_actions))
 *
 * If either differs by one byte: STOP. Do NOT adjust the assertion.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { renderPriorityActionsSectionHtml } from "../../../supabase/functions/generate-report-pdf/_local/priority-actions-html.ts";

const IDS = [
  "bd76fc07-b57a-473b-9d33-c54a480e2d57",
  "55bc938d-06ba-4f8c-8046-705f9c06f571",
] as const;

const dir = new URL("../fixtures/item420/", import.meta.url);

for (const id of IDS) {
  Deno.test(`ITEM 420 legacy-safety: ${id} priority-actions render is byte-identical`, async () => {
    const doc = JSON.parse(await Deno.readTextFile(new URL(`${id}.json`, dir)));
    const pa = doc.report_data.priority_actions;
    assert(Array.isArray(pa) && pa.length > 0, "fixture must carry priority_actions");
    assert(pa.every((x: unknown) => typeof x === "string"), "fixture must be a string array");

    const pre = await Deno.readTextFile(new URL(`${id}.priority-actions.pre.html`, dir));
    const post = renderPriorityActionsSectionHtml(doc.report_data);

    assertEquals(post.length, pre.length, "byte length drift in Priority Actions section");
    assertEquals(post, pre, "Priority Actions section is NOT byte-identical to the pre-change render");
  });
}
