/**
 * ITEM 426 — LEGACY-SAFETY PROOF (the corruption guard).
 *
 * Four REAL persisted states of `exception_analysis`, captured verbatim from
 * `quality_run_documents`, rendered through the CUSTOMER PDF PATH
 * (`renderExceptionAnalysisSectionHtml`, which index.ts now calls for that
 * section) and asserted BYTE-IDENTICAL to the pre-change render.
 *
 * The pre-change goldens were produced by the HEAD-as-of-ITEM-425 expression:
 *   listSection("exception_analysis", "Exception Analysis",
 *               coerceNarrativeList(report.exception_analysis))
 *
 * If any differs by one byte: STOP. Do NOT adjust the assertion.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { renderExceptionAnalysisSectionHtml } from "../../../supabase/functions/generate-report-pdf/_local/exception-analysis-html.ts";

const CASES = [
  // strings — INCLUDING the hole defect, preserved byte-for-byte.
  { id: "23261656-88c3-459d-bf9b-f32d6f305811", dir: "item426", shape: "strings" },
  // legacy objects
  { id: "996e895e-b1b0-451a-9977-952d5b610df9", dir: "item426", shape: "legacy_objects" },
  // empty array (the padding state)
  { id: "7e023e1e-2a7e-4a58-a612-049a8c8e9c1d", dir: "item426", shape: "empty" },
] as const;

for (const c of CASES) {
  Deno.test(`ITEM 426 legacy-safety: ${c.id} (${c.shape}) render is byte-identical`, async () => {
    const doc = JSON.parse(
      await Deno.readTextFile(new URL(`../fixtures/${c.dir}/${c.id}.json`, import.meta.url)),
    );
    const pre = await Deno.readTextFile(
      new URL(`../fixtures/item426/${c.id}.exception-analysis.pre.html`, import.meta.url),
    );
    const post = renderExceptionAnalysisSectionHtml(doc.report_data);
    assertEquals(post.length, pre.length, "byte length drift in Exception Analysis section");
    assertEquals(post, pre, "Exception Analysis section is NOT byte-identical to the pre-change render");
  });
}

Deno.test("ITEM 426 legacy-safety: key ABSENT (bd76fc07-…) renders nothing, as before", async () => {
  const doc = JSON.parse(
    await Deno.readTextFile(
      new URL("../fixtures/item420/bd76fc07-b57a-473b-9d33-c54a480e2d57.json", import.meta.url),
    ),
  );
  assert(!("exception_analysis" in doc.report_data), "fixture must lack the key");
  assertEquals(renderExceptionAnalysisSectionHtml(doc.report_data), "");
});
