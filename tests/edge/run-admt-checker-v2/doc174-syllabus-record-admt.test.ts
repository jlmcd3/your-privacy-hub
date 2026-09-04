// DOC 174 (2026-09-04) — SYLLABUS & RECORD, ADMT v2 (the fifth product
// migrated onto the fleet presentation system, closing Tier 1; doc 151, doc
// 170 landed the shared system + CPPA Risk, doc 171 DPIA, doc 172 LIA, doc
// 173 Governance). Testing is scoped per the CEO's 2026-09-04 instruction:
// enough to know the product generates without error, plus the invariants
// that keep the two SR_PRODUCTS gates and the two renderers from drifting.
// ADMT's pathway/opt-out logic is CEO-ratified and DISAGREED-3x closed —
// nothing here touches it; every assertion reads already-computed values.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { ADMT_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-admt.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";
import { readSyllabus, SR_PRODUCTS, syllabusToText, toneForState } from "../../../supabase/functions/_shared/prose/syllabus.ts";
import { buildSkeletonGraderPayload } from "../../../supabase/functions/run-quality-batch/_local/grader/skeleton-payload.ts";

type Bag = Record<string, unknown>;
const clone = (o: unknown): Bag => JSON.parse(JSON.stringify(o));
const PERFECT = () => clone(ADMT_PERFECT[0].intake);

function render(intake: Bag): ReturnType<typeof assembleAdmtV2Document> {
  const c = computeAdmtV2(intake);
  return assembleAdmtV2Document({
    intake,
    computed: c,
    exhibit: null,
    organizationName: String(intake.organization_name ?? ""),
    systemName: String(intake.system_name ?? ""),
  });
}

async function pdfModule() {
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = () => ({ finished: Promise.resolve(), shutdown: async () => {}, addr: null });
  Deno.env.set("SUPABASE_URL", "http://localhost:54321");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-stub");
  Deno.env.set("SUPABASE_ANON_KEY", "test-stub");
  return await import("../../../supabase/functions/generate-report-pdf/index.ts");
}
const RECORD = { id: "0abc1234-0000-4000-8000-000000000004", created_at: "2026-09-04T12:00:00Z" };

// ── The projection ──────────────────────────────────────────────────────────

Deno.test("doc174 — the ADMT v2 assembler attaches a Determination Syllabus projected from its own determinations, and generates without error", () => {
  const doc = render(PERFECT());
  const s = readSyllabus(doc);
  assert(s, "document.syllabus missing");
  assert(s!.prepared_for, "prepared_for empty");
  assert(s!.activity, "activity empty");
  assert(s!.disposition, "disposition empty");
  assert(s!.paragraph, "disposition paragraph empty");
  assert(doc.sections.length > 0, "document must have sections");
});

Deno.test("doc174 — the disposition is the cover table's own 'Overall assessment' expression, verbatim, and every label is a controlled word", () => {
  const intake = PERFECT();
  const c = computeAdmtV2(intake);
  const doc = assembleAdmtV2Document({
    intake, computed: c, exhibit: null,
    organizationName: String(intake.organization_name ?? ""), systemName: String(intake.system_name ?? ""),
  });
  const s = readSyllabus(doc)!;
  const expected = c.scope.pathwayDependent ? "Pathway-dependent" : c.overallPostureLabel;
  assertEquals(s.disposition, expected);
  assert(toneForState(s.disposition) !== null, `no tone for ${s.disposition}`);

  for (const label of [
    "Meets on reported facts",
    "Qualified — follow-up needed",
    "Gaps identified",
    "Out of scope on reported facts",
    "Record conflict — resolve before a determination can be reached",
    "Unable to assess — scope cannot be determined on the current record",
    "Pathway-dependent",
  ]) {
    assert(toneForState(label) !== null, `no tone registered for ADMT v2 disposition word: ${label}`);
  }
  assertEquals(toneForState("Meets on reported facts"), "ok");
  assertEquals(toneForState("Gaps identified"), "hi");
  assertEquals(toneForState("Pathway-dependent"), "hold");
});

Deno.test("doc174 — the syllabus's conditions are the priority-1 findings verbatim, count-matched, never re-derived", () => {
  const intake = PERFECT();
  const c = computeAdmtV2(intake);
  const doc = assembleAdmtV2Document({
    intake, computed: c, exhibit: null,
    organizationName: String(intake.organization_name ?? ""), systemName: String(intake.system_name ?? ""),
  });
  const s = readSyllabus(doc)!;
  const expectedConditions = c.allFindings.filter((f) => f.priority === 1);
  assertEquals(s.conditions.length, expectedConditions.length);
  for (let i = 0; i < expectedConditions.length; i++) {
    assertEquals(s.conditions[i].text, expectedConditions[i].action_text);
  }
});

Deno.test("doc174 — the record map covers ADMT v2's lettered appendices", () => {
  const doc = render(PERFECT());
  const s = readSyllabus(doc)!;
  const appendixSections = doc.sections.filter((sec) => /^Appendix ([A-Z]) — /.test(sec.title ?? ""));
  assertEquals(s.record_map.length, appendixSections.length);
  assert(s.record_map.length > 0, "ADMT v2 must carry at least one lettered appendix");
});

// ── The PDF renderer ───────────────────────────────────────────────────────

Deno.test("doc174 — ADMT v2 renders through Syllabus & Record: page one, no cover block, no raw tokens, divider present", async () => {
  const pdf = await pdfModule();
  const doc = render(PERFECT());
  const html: string = pdf.buildSkeletonReportHTML(doc as never, RECORD, "CPPA ADMT Compliance Assessment", "cppa-admt-v2");
  assert(html.length > 10_000, "html too short");
  assertStringIncludes(html, 'class="sr-syllabus"');
  assertStringIncludes(html, `<div class="dv">${readSyllabus(doc)!.disposition}</div>`);
  assertStringIncludes(html, "Supporting Assessment Record");
  assert(!html.includes('class="header"'), "the navy cover block must not render");
  assert(!html.includes("[Q] "), "raw [Q] token reached the PDF");
});

Deno.test("doc174 — ADMT v2 still renders through the legacy template when the product string is withheld (legacy v1 rows are unaffected)", async () => {
  const pdf = await pdfModule();
  const doc = render(PERFECT());
  const html: string = pdf.buildSkeletonReportHTML(doc as never, RECORD, "CPPA ADMT Compliance Assessment");
  assertStringIncludes(html, 'class="header"');
  assert(!html.includes('class="sr-syllabus"'));
});

// ── The grader payload ─────────────────────────────────────────────────────

Deno.test("doc174 — the skeleton grader payload leads with page one for ADMT v2 and never carries the [Q] token", () => {
  const doc = render(PERFECT());
  const p = buildSkeletonGraderPayload({ skeleton_document: doc });
  assertStringIncludes(p.text, "[kind=syllabus] === DETERMINATION SYLLABUS (page 1) ===");
  assertStringIncludes(p.text, `OVERALL ASSESSMENT: ${readSyllabus(doc)!.disposition}`);
  assert(!p.text.includes("[Q] "), "raw [Q] token in the grader payload");
  assertStringIncludes(syllabusToText(readSyllabus(doc)!), "DETERMINATION SYLLABUS");
});

// ── Gate membership ─────────────────────────────────────────────────────────

Deno.test("doc174 — cppa-admt-v2 is a member of the shared SR_PRODUCTS gate", () => {
  assert(SR_PRODUCTS.has("cppa-admt-v2"));
});
