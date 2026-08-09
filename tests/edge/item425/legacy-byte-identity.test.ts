/**
 * ITEM 425 — LEGACY-SAFETY PROOF (the corruption guard).
 *
 * Two REAL persisted legacy documents from `quality_run_documents` (captured
 * verbatim from the DB, md5-verified against the live rows) whose
 * `record_sufficiency` is an array of prose strings are rendered through the
 * CUSTOMER PDF PATH (`renderRecordSufficiencySectionHtml`, which index.ts now
 * calls for that section) and asserted BYTE-IDENTICAL to the pre-change render.
 *
 * The pre-change goldens were produced by the HEAD-as-of-ITEM-424 expression:
 *   listSection("record_sufficiency", "Record Sufficiency",
 *               coerceNarrativeList(report.record_sufficiency))
 *
 * If either differs by one byte: STOP. Do NOT adjust the assertion.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { renderRecordSufficiencySectionHtml } from "../../../supabase/functions/generate-report-pdf/_local/record-sufficiency-html.ts";

const CASES = [
  {
    id: "bd76fc07-b57a-473b-9d33-c54a480e2d57",
    doc: new URL("../fixtures/item420/bd76fc07-b57a-473b-9d33-c54a480e2d57.json", import.meta.url),
  },
  {
    id: "ae70c6f0-3329-487d-981e-624eea58b155",
    doc: new URL("../fixtures/item425/ae70c6f0-3329-487d-981e-624eea58b155.json", import.meta.url),
  },
] as const;

for (const c of CASES) {
  Deno.test(`ITEM 425 legacy-safety: ${c.id} record-sufficiency render is byte-identical`, async () => {
    const doc = JSON.parse(await Deno.readTextFile(c.doc));
    const rs = doc.report_data.record_sufficiency;
    assert(Array.isArray(rs) && rs.length > 0, "fixture must carry record_sufficiency");
    assert(rs.every((x: unknown) => typeof x === "string"), "fixture must be a string array");

    const pre = await Deno.readTextFile(
      new URL(`../fixtures/item425/${c.id}.record-sufficiency.pre.html`, import.meta.url),
    );
    const post = renderRecordSufficiencySectionHtml(doc.report_data);

    assertEquals(post.length, pre.length, "byte length drift in Record Sufficiency section");
    assertEquals(post, pre, "Record Sufficiency section is NOT byte-identical to the pre-change render");
  });
}
