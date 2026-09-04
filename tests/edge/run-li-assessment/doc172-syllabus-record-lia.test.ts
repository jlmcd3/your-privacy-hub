// DOC 172 (2026-09-04) — SYLLABUS & RECORD, LIA (the third product migrated
// onto the fleet presentation system; doc 151, doc 170 landed the shared
// system + CPPA Risk, doc 171 added DPIA). Testing is scoped per the CEO's
// 2026-09-04 instruction: enough to know the product generates without
// error, plus the invariants that keep the two SR_PRODUCTS gates and the two
// renderers from drifting.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { LIA_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia-perfect.ts";
import { LIA_PERFECT_PINNED } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/lia-perfect-pinned.ts";
import { buildLiaEngagementMap } from "../../../supabase/functions/_shared/engagement-map.ts";
import { attachLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { attachLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { attachPrecedentClassPosture } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";
import { buildDocumentationTyped, buildThreePartTestTyped } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/three-part-test-typed.ts";
import { assembleLiaSkeletonDocument } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { readSyllabus, SR_PRODUCTS, syllabusToText, toneForState } from "../../../supabase/functions/_shared/prose/syllabus.ts";
import { buildSkeletonGraderPayload } from "../../../supabase/functions/run-quality-batch/_local/grader/skeleton-payload.ts";

type Bag = Record<string, unknown>;
const clone = (o: unknown): Bag => JSON.parse(JSON.stringify(o));
const EU = () => clone(LIA_PERFECT_PINNED.find((g) => g.id === "lia-perfect-eu-clean")!.intake);
const UK = () => clone(LIA_PERFECT[0].intake);

function frameworks(intake: Bag): string[] {
  const js = Array.isArray(intake.jurisdictions) ? intake.jurisdictions as string[] : [];
  const out: string[] = [];
  if (js.includes("EU (GDPR)")) out.push("EU_GDPR");
  if (js.includes("United Kingdom (UK GDPR)")) out.push("UK_GDPR");
  return out;
}

function render(intake: Bag): ReturnType<typeof assembleLiaSkeletonDocument> {
  const report: Bag = { authority_exhibit: { entries: [] } };
  attachLiaDeliverables(report, intake);
  attachLiaUpgrade4(report, intake);
  attachPrecedentClassPosture(report, intake);
  const typed = buildThreePartTestTyped(report, intake);
  report.three_part_test = typed.three_part_test;
  if (typed.determination_override) report.lia_determination = typed.determination_override;
  report.information_needed = typed.information_needed;
  report.documentation_recommendations = buildDocumentationTyped(report, "Disclaimer.");
  report.engagement_map = buildLiaEngagementMap(intake, {}, frameworks(intake), (report.eprivacy_short_circuit as Bag).determination as string);
  return assembleLiaSkeletonDocument(report, intake, { deterministic: true });
}

async function pdfModule() {
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = () => ({ finished: Promise.resolve(), shutdown: async () => {}, addr: null });
  Deno.env.set("SUPABASE_URL", "http://localhost:54321");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-stub");
  Deno.env.set("SUPABASE_ANON_KEY", "test-stub");
  return await import("../../../supabase/functions/generate-report-pdf/index.ts");
}
const RECORD = { id: "0abc1234-0000-4000-8000-000000000002", created_at: "2026-09-04T12:00:00Z" };

// ── The projection ──────────────────────────────────────────────────────────

Deno.test("doc172 — the LIA assembler attaches a Determination Syllabus projected from its own determinations, and generates without error", () => {
  const res = render(UK());
  const s = readSyllabus(res.document);
  assert(s, "document.syllabus missing");
  assert(s!.prepared_for, "prepared_for empty");
  assert(s!.disposition, "disposition empty");
  assert(s!.paragraph, "disposition paragraph empty");
  assert(s!.rows.length >= 3, "expected at least the three-part-test rows");
  // The disposition paragraph IS the executive determination lead, verbatim
  // (LIA gives it its own `kind: "lead"` paragraph, unlike DPIA).
  const lead = res.document.sections.find((x) => x.id === "executive_summary")?.paragraphs.find((p) => p.kind === "lead")?.text?.trim();
  assertEquals(s!.paragraph, lead);
  assertEquals(res.conformance.length, 0, JSON.stringify(res.conformance));
});

Deno.test("doc172 — the EU fixture reads through the same projection", () => {
  const res = render(EU());
  const s = readSyllabus(res.document);
  assert(s, "document.syllabus missing");
  assertEquals(res.conformance.length, 0, JSON.stringify(res.conformance));
});

Deno.test("doc172 — the disposition label tracks the typed verdict, and every label is a controlled word", () => {
  const available = render(UK());
  const s1 = readSyllabus(available.document)!;
  assertEquals(s1.disposition, "Available");
  assertEquals(toneForState("Available"), "ok");

  // Not available.
  {
    const intake = UK();
    const report: Bag = { authority_exhibit: { entries: [] } };
    attachLiaDeliverables(report, intake);
    attachLiaUpgrade4(report, intake);
    attachPrecedentClassPosture(report, intake);
    const typed = buildThreePartTestTyped(report, intake);
    report.three_part_test = typed.three_part_test;
    report.lia_determination = { outcome: "not_available" };
    report.information_needed = typed.information_needed;
    report.documentation_recommendations = buildDocumentationTyped(report, "Disclaimer.");
    report.engagement_map = buildLiaEngagementMap(intake, {}, frameworks(intake), (report.eprivacy_short_circuit as Bag).determination as string);
    const doc = assembleLiaSkeletonDocument(report, intake, { deterministic: true });
    const s = readSyllabus(doc.document)!;
    assertEquals(s.disposition, "Not Available");
    assertEquals(toneForState(s.disposition), "hi");
  }

  // Public-authority bar overrides everything else.
  {
    const intake = UK();
    const report: Bag = { authority_exhibit: { entries: [] } };
    attachLiaDeliverables(report, intake);
    attachLiaUpgrade4(report, intake);
    attachPrecedentClassPosture(report, intake);
    const typed = buildThreePartTestTyped(report, intake);
    report.three_part_test = typed.three_part_test;
    report.public_authority_exclusion = { determination: "excluded" };
    report.information_needed = typed.information_needed;
    report.documentation_recommendations = buildDocumentationTyped(report, "Disclaimer.");
    report.engagement_map = buildLiaEngagementMap(intake, {}, frameworks(intake), (report.eprivacy_short_circuit as Bag).determination as string);
    const doc = assembleLiaSkeletonDocument(report, intake, { deterministic: true });
    const s = readSyllabus(doc.document)!;
    assertEquals(s.disposition, "Not Available");
    assert(s.rows.some(([k]) => k === "Public authority bar"));
  }
});

Deno.test("doc172 — LIA has no typed conditions or appendix-lettered back matter, so the syllabus is honest about it", () => {
  const res = render(UK());
  const s = readSyllabus(res.document)!;
  assertEquals(s.conditions.length, 0);
  assertEquals(s.conditions_heading, "");
  assertEquals(s.record_map.length, 0);
});

// ── The PDF renderer ───────────────────────────────────────────────────────

Deno.test("doc172 — LIA renders through Syllabus & Record: page one, no cover block, no raw tokens", async () => {
  const pdf = await pdfModule();
  for (const [label, intake] of [["UK", UK()], ["EU", EU()]] as const) {
    const res = render(intake as Bag);
    const html: string = pdf.buildSkeletonReportHTML(res.document as never, RECORD, "Legitimate Interests Assessment", "lia");
    assert(html.length > 10_000, `${label}: html too short`);
    assertStringIncludes(html, 'class="sr-syllabus"');
    assertStringIncludes(html, `<div class="dv">${readSyllabus(res.document)!.disposition}</div>`);
    assert(!html.includes('class="header"'), `${label}: the navy cover block must not render`);
    assert(!html.includes("[Q] "), `${label}: raw [Q] token reached the PDF`);
    // LIA composes its determination as its own `kind: "lead"` paragraph
    // (unlike DPIA's run-in-labeled chunk), so the existing kind-based
    // suppression already drops the page-one duplicate from THIS section —
    // scoped to the executive_summary section specifically, since LIA's own
    // (pre-existing, ratified) architecture deliberately restates the same
    // sentence again as the Findings section's own lead (SO-11's coherence
    // law), which is not a Syllabus & Record defect to fix.
    const secStart = html.indexOf('data-section="executive_summary"');
    const secEnd = html.indexOf('data-section="', secStart + 1);
    const execSectionHtml = html.slice(secStart, secEnd === -1 ? undefined : secEnd);
    assert(
      !execSectionHtml.includes(readSyllabus(res.document)!.paragraph),
      `${label}: the disposition paragraph repeats inside the executive_summary section`,
    );
  }
});

Deno.test("doc172 — LIA still renders through the legacy template when the product string is withheld (byte-unchanged fallback path)", async () => {
  const pdf = await pdfModule();
  const res = render(UK());
  const html: string = pdf.buildSkeletonReportHTML(res.document as never, RECORD, "Legitimate Interests Assessment");
  assertStringIncludes(html, 'class="header"');
  assert(!html.includes('class="sr-syllabus"'));
});

// ── The grader payload ─────────────────────────────────────────────────────

Deno.test("doc172 — the skeleton grader payload leads with page one for LIA and never carries the [Q] token", () => {
  const res = render(UK());
  const p = buildSkeletonGraderPayload({ skeleton_document: res.document });
  assertStringIncludes(p.text, "[kind=syllabus] === DETERMINATION SYLLABUS (page 1) ===");
  assertStringIncludes(p.text, `DETERMINATION: ${readSyllabus(res.document)!.disposition}`);
  assert(!p.text.includes("[Q] "), "raw [Q] token in the grader payload");
  assertStringIncludes(syllabusToText(readSyllabus(res.document)!), "DETERMINATION SYLLABUS");
});

// ── Gate membership ─────────────────────────────────────────────────────────

Deno.test("doc172 — lia is a member of the shared SR_PRODUCTS gate", () => {
  assert(SR_PRODUCTS.has("lia"));
});
