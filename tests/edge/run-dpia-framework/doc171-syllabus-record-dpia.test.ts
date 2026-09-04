// DOC 171 (2026-09-04) — SYLLABUS & RECORD, DPIA (the second product
// migrated onto the fleet presentation system; doc 151, doc 170 landed the
// shared system + CPPA Risk). Testing is scoped per the CEO's 2026-09-04
// instruction: enough to know the product generates without error, plus the
// invariants that keep the two SR_PRODUCTS gates and the two renderers from
// drifting.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { DPIA_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/dpia.ts";
import { attachDpiaDeliverables } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { assembleDpiaSkeletonDocument } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { readSyllabus, SR_PRODUCTS, syllabusToText, toneForState } from "../../../supabase/functions/_shared/prose/syllabus.ts";
import { buildSkeletonGraderPayload } from "../../../supabase/functions/run-quality-batch/_local/grader/skeleton-payload.ts";

type Bag = Record<string, unknown>;
const clone = (o: unknown): Bag => JSON.parse(JSON.stringify(o));
const EU = () => clone(DPIA_PERFECT.find((g) => g.id === "dpia-perfect-eu-complete")!.intake);
const UK = () => clone(DPIA_PERFECT.find((g) => g.id.startsWith("dpia-perfect-uk"))!.intake);

function render(intake: Bag): ReturnType<typeof assembleDpiaSkeletonDocument> {
  const report: Bag = {};
  attachDpiaDeliverables(report, intake, { unitsMinimal: true });
  return assembleDpiaSkeletonDocument(report, intake);
}

/** The PDF entrypoint calls Deno.serve and builds a Supabase client at module
 * scope; both are stubbed so the builder can be imported without serving or
 * contacting anything (the same stubs doc170's test uses). */
async function pdfModule() {
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = () => ({ finished: Promise.resolve(), shutdown: async () => {}, addr: null });
  Deno.env.set("SUPABASE_URL", "http://localhost:54321");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-stub");
  Deno.env.set("SUPABASE_ANON_KEY", "test-stub");
  return await import("../../../supabase/functions/generate-report-pdf/index.ts");
}
const RECORD = { id: "0abc1234-0000-4000-8000-000000000001", created_at: "2026-09-04T12:00:00Z" };

// ── The projection ──────────────────────────────────────────────────────────

Deno.test("doc171 — the DPIA assembler attaches a Determination Syllabus projected from its own determinations, and generates without error", () => {
  const res = render(EU());
  const s = readSyllabus(res.document);
  assert(s, "document.syllabus missing");
  assert(s!.prepared_for, "prepared_for empty");
  assert(s!.activity, "activity empty");
  assert(s!.disposition, "disposition empty");
  assert(s!.paragraph, "disposition paragraph empty");
  assert(s!.rows.length > 0, "no determination rows");
  // Sections, hash pin and conformance are untouched by the projection.
  assertEquals(res.conformance.length, 0, JSON.stringify(res.conformance));
});

Deno.test("doc171 — the UK fixture names the Commissioner in the instrument line and reads through the same projection", () => {
  const res = render(UK());
  const s = readSyllabus(res.document);
  assert(s, "document.syllabus missing");
  assertStringIncludes(s!.instrument_line, "UK GDPR Art. 35");
  assertEquals(res.conformance.length, 0, JSON.stringify(res.conformance));
});

Deno.test("doc171 — the disposition label tracks the determination the pipeline recorded, and every label is a controlled word", () => {
  // Approved (the perfect fixture's default outcome).
  const approved = render(EU());
  assertEquals(readSyllabus(approved.document)!.disposition, "Approved");
  assertEquals(toneForState("Approved"), "ok");

  // Article 36 prior consultation required.
  {
    const report: Bag = {};
    attachDpiaDeliverables(report, EU(), { unitsMinimal: true });
    report.art36_consultation = { ...(report.art36_consultation as Bag), determination: "consultation_required", status: "determined" };
    report.decision = { ...(report.decision as Bag), determination: "consultation_required" };
    const doc = assembleDpiaSkeletonDocument(report, EU());
    const s = readSyllabus(doc.document)!;
    assertEquals(s.disposition, "Prior Consultation Required");
    assertEquals(toneForState(s.disposition), "hi");
  }

  // Conditionally approved, with conditions carried onto the syllabus verbatim.
  {
    const report: Bag = {};
    attachDpiaDeliverables(report, EU(), { unitsMinimal: true });
    report.decision = { ...(report.decision as Bag), determination: "conditionally_approved", conditions: ["Complete the pending DPO review.", "Confirm the retention schedule."] };
    const doc = assembleDpiaSkeletonDocument(report, EU());
    const s = readSyllabus(doc.document)!;
    assertEquals(s.disposition, "Conditionally Approved");
    assertEquals(toneForState(s.disposition), "hold");
    assertEquals(s.conditions.length, 2);
    assertEquals(s.conditions[0].name, "Condition 1");
    assertEquals(s.conditions[0].text, "Complete the pending DPO review.");
    assert(s.conditions_heading.length > 0);
  }

  // Draft incomplete — no determination reached.
  {
    const report: Bag = {};
    attachDpiaDeliverables(report, EU(), { unitsMinimal: true });
    report.decision = { ...(report.decision as Bag), determination: "draft_incomplete" };
    const doc = assembleDpiaSkeletonDocument(report, EU());
    const s = readSyllabus(doc.document)!;
    assertEquals(s.disposition, "Determination pending");
    assertEquals(toneForState(s.disposition), "hold");
  }
});

// ── The PDF renderer ───────────────────────────────────────────────────────

Deno.test("doc171 — DPIA renders through Syllabus & Record: page one, no cover block, no Contents page, no raw tokens, divider present", async () => {
  const pdf = await pdfModule();
  for (const [label, intake] of [["EU", EU()], ["UK", UK()]] as const) {
    const res = render(intake as Bag);
    const html: string = pdf.buildSkeletonReportHTML(res.document as never, RECORD, "Data Protection Impact Assessment", "dpia");
    assert(html.length > 20_000, `${label}: html too short`);
    assertStringIncludes(html, 'class="sr-syllabus"');
    assertStringIncludes(html, `<div class="dv">${readSyllabus(res.document)!.disposition}</div>`);
    assertStringIncludes(html, "Supporting Assessment Record");
    assert(!html.includes(">Contents<"), `${label}: the Contents page must not render`);
    assert(!html.includes('class="header"'), `${label}: the navy cover block must not render`);
    assert(!html.includes("[Q] "), `${label}: raw [Q] token reached the PDF`);
  }
});

Deno.test("doc171 — DPIA still renders through the legacy template when the product string is withheld (byte-unchanged fallback path)", async () => {
  const pdf = await pdfModule();
  const res = render(EU());
  const html: string = pdf.buildSkeletonReportHTML(res.document as never, RECORD, "Data Protection Impact Assessment");
  assertStringIncludes(html, 'class="header"');
  assert(!html.includes('class="sr-syllabus"'));
});

// ── The grader payload ─────────────────────────────────────────────────────

Deno.test("doc171 — the skeleton grader payload leads with page one for DPIA and never carries the [Q] token", () => {
  const res = render(EU());
  const p = buildSkeletonGraderPayload({ skeleton_document: res.document });
  assertStringIncludes(p.text, "[kind=syllabus] === DETERMINATION SYLLABUS (page 1) ===");
  assertStringIncludes(p.text, `DETERMINATION: ${readSyllabus(res.document)!.disposition}`);
  assert(!p.text.includes("[Q] "), "raw [Q] token in the grader payload");
  assertStringIncludes(syllabusToText(readSyllabus(res.document)!), "DETERMINATION SYLLABUS");
});

// ── Gate membership ─────────────────────────────────────────────────────────

Deno.test("doc171 — dpia is a member of the shared SR_PRODUCTS gate", () => {
  assert(SR_PRODUCTS.has("dpia"));
});
