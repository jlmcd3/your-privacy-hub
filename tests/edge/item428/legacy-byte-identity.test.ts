/**
 * ITEM 428 (PIECE B) — LEGACY-SAFETY PROOF for the summary-voice sections.
 *
 * Two REAL persisted anchors rendered through the CUSTOMER PDF PATH
 * (`summary-voice-html.ts`, which index.ts now calls for those three
 * sections) and asserted BYTE-IDENTICAL to the pre-change render captured
 * from the HEAD-as-of-ITEM-427 inline expressions in
 * generate-report-pdf/index.ts (buildCPPARiskLtpHTML).
 *
 * If any differs by one byte: STOP. Do NOT adjust the assertion.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  renderAssessmentSummarySectionHtml,
  renderExecutiveSummarySectionHtml,
  renderSubmissionSummarySectionHtml,
} from "../../../supabase/functions/generate-report-pdf/_local/summary-voice-html.ts";

const CASES = [
  { id: "bd76fc07-b57a-473b-9d33-c54a480e2d57", dir: "item420" },
  { id: "ae70c6f0-3329-487d-981e-624eea58b155", dir: "item427" },
] as const;

const SECTIONS = [
  ["executive-summary", renderExecutiveSummarySectionHtml],
  ["assessment-summary", renderAssessmentSummarySectionHtml],
  ["submission-summary", renderSubmissionSummarySectionHtml],
] as const;

for (const c of CASES) {
  Deno.test(`ITEM 428 legacy-safety: ${c.id} summary sections are byte-identical`, async () => {
    const doc = JSON.parse(
      await Deno.readTextFile(new URL(`../fixtures/${c.dir}/${c.id}.json`, import.meta.url)),
    );
    for (const [slug, render] of SECTIONS) {
      const pre = await Deno.readTextFile(
        new URL(`../fixtures/item428/${c.id}.${slug}.pre.html`, import.meta.url),
      );
      const post = render(doc.report_data ?? {});
      assertEquals(post.length, pre.length, `byte length drift in ${slug}`);
      assertEquals(post, pre, `${slug} is NOT byte-identical to the pre-change render`);
    }
  });
}

Deno.test("ITEM 428 legacy-safety: absent surfaces render nothing", () => {
  for (const [, render] of SECTIONS) {
    assertEquals(render({}), "");
  }
  assertEquals(renderAssessmentSummarySectionHtml({ assessment_summary: {} }), "");
  assertEquals(renderSubmissionSummarySectionHtml({ submission_summary: "  " }), "");
});

Deno.test("ITEM 428: the canonical fact strip renders as a table, never prose", () => {
  const html = renderAssessmentSummarySectionHtml({
    assessment_summary: {
      _typed: "risk-fact-strip@item428",
      company_name: "Sierra Outfitters, Inc",
      sector: "Retail",
      assessment_date: "2026-08-09",
      overall_risk_level: "Moderate",
      triggered_activities: ["Consumer credit underwriting"],
      exceptions_claimed: [],
      exceptions_status: "No exception claimed",
      admt_disclosure_required: true,
      cybersecurity_audit_required: false,
    },
  });
  assert(html.includes('<table class="fact-strip">'), "the fact strip must render as a table");
  assert(html.includes("<th>Company</th><td>Sierra Outfitters, Inc</td>"));
  assert(html.includes("<th>ADMT disclosure required</th><td>Yes</td>"));
  assert(html.includes("<th>Cybersecurity audit required</th><td>No</td>"));
  assert(!html.includes("<p>"), "the fact strip must carry no prose paragraph");
});
