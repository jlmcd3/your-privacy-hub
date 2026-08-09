/**
 * ITEM 427 — LEGACY-SAFETY PROOF (the corruption guard).
 *
 * THREE REAL persisted anchors of `risk_assessment_by_activity`, captured
 * verbatim from `quality_run_documents`, rendered through the CUSTOMER PDF PATH
 * (`renderActivityAnalysisSectionHtml`, which index.ts now calls for that
 * section) and asserted BYTE-IDENTICAL to the pre-change render.
 *
 * The pre-change goldens were produced by the HEAD-as-of-ITEM-426 expression:
 *   listSection("risk_assessment_by_activity", "Risk Assessment by Activity",
 *               coerceNarrativeList(report.risk_assessment_by_activity))
 *
 * If any differs by one byte: STOP. Do NOT adjust the assertion.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { renderActivityAnalysisSectionHtml } from "../../../supabase/functions/generate-report-pdf/_local/activity-analysis-html.ts";

const CASES = [
  { id: "bd76fc07-b57a-473b-9d33-c54a480e2d57", dir: "item420", n: 1 },
  { id: "55bc938d-06ba-4f8c-8046-705f9c06f571", dir: "item420", n: 2 },
  // carries the item384-r4 stray placeholder as element 0 — preserved verbatim.
  { id: "ae70c6f0-3329-487d-981e-624eea58b155", dir: "item427", n: 2 },
] as const;

for (const c of CASES) {
  Deno.test(`ITEM 427 legacy-safety: ${c.id} (string[] ×${c.n}) render is byte-identical`, async () => {
    const doc = JSON.parse(
      await Deno.readTextFile(new URL(`../fixtures/${c.dir}/${c.id}.json`, import.meta.url)),
    );
    const raw = doc.report_data.risk_assessment_by_activity;
    assert(Array.isArray(raw) && raw.length === c.n, "fixture must carry the anchor shape");
    assert(raw.every((x: unknown) => typeof x === "string"), "fixture must be a string array");

    const pre = await Deno.readTextFile(
      new URL(`../fixtures/item427/${c.id}.activity-analysis.pre.html`, import.meta.url),
    );
    const post = renderActivityAnalysisSectionHtml(doc.report_data);
    assertEquals(post.length, pre.length, "byte length drift in Risk Assessment by Activity section");
    assertEquals(post, pre, "Risk Assessment by Activity section is NOT byte-identical to the pre-change render");
  });
}

Deno.test("ITEM 427 legacy-safety: empty array and absent key render nothing, as before", () => {
  assertEquals(renderActivityAnalysisSectionHtml({ risk_assessment_by_activity: [] }), "");
  assertEquals(renderActivityAnalysisSectionHtml({}), "");
});
