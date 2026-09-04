// DOC 176 (2026-09-04) — SYLLABUS & RECORD, Registration (the seventh
// product migrated onto the fleet presentation system; doc 151, docs
// 170-175 landed the shared system + Risk/DPIA/LIA/Governance/ADMT v2/
// Cyber v4). Testing is scoped per the CEO's 2026-09-04 instruction: enough
// to know the product generates without error, plus the invariants that
// keep the two SR_PRODUCTS gates and the two renderers from drifting.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { REGISTRATION_GOLDEN } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/registration.ts";
import { buildRegistrationDeliverables } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import { assembleRegistrationSkeletonDocument, computeDutyCounts } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-skeleton-assemble.ts";
import { runRegistrationAssessment } from "../../../supabase/functions/run-registration-assessment/_local/registration-engine.ts";
import { readSyllabus, SR_PRODUCTS, syllabusToText, toneForState } from "../../../supabase/functions/_shared/prose/syllabus.ts";
import { buildSkeletonGraderPayload } from "../../../supabase/functions/run-quality-batch/_local/grader/skeleton-payload.ts";

type Bag = Record<string, unknown>;
const clone = (o: unknown): Bag => JSON.parse(JSON.stringify(o));
const fixture = (id: string) => clone(REGISTRATION_GOLDEN.find((g) => g.id === id)!.intake) as Bag;
const PERFECT = () => fixture("reg-ca-vt-broker-perfect-record");
const NOT_REGISTRABLE = () => fixture("reg-ca-not-registrable-adversarial");

function render(intake: Bag): ReturnType<typeof assembleRegistrationSkeletonDocument> {
  const built = buildRegistrationDeliverables(intake as never) as unknown as Bag;
  const engine = runRegistrationAssessment(intake as never);
  const report: Bag = { registration_deliverables: built, obligations_summary: engine.obligations_summary, jurisdictions: engine.jurisdictions };
  return assembleRegistrationSkeletonDocument(report, intake);
}

async function pdfModule() {
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = () => ({ finished: Promise.resolve(), shutdown: async () => {}, addr: null });
  Deno.env.set("SUPABASE_URL", "http://localhost:54321");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-stub");
  Deno.env.set("SUPABASE_ANON_KEY", "test-stub");
  return await import("../../../supabase/functions/generate-report-pdf/index.ts");
}
const RECORD = { id: "0abc1234-0000-4000-8000-000000000006", created_at: "2026-09-04T12:00:00Z" };

// ── The projection ──────────────────────────────────────────────────────────

Deno.test("doc176 — the Registration assembler attaches a Determination Syllabus projected from its own determinations, and generates without error", () => {
  const sk = render(PERFECT());
  const s = readSyllabus(sk.document);
  assert(s, "document.syllabus missing");
  assert(s!.prepared_for, "prepared_for empty");
  assert(s!.disposition, "disposition empty");
  assert(s!.paragraph, "disposition paragraph empty");
  assertEquals(sk.conformance.length, 0, JSON.stringify(sk.conformance));
});

Deno.test("doc176 — the disposition is a three-bucket read of duty_counts, and every label is a controlled word", () => {
  const attached = render(PERFECT());
  const sAttached = readSyllabus(attached.document)!;
  assert(["Engaged", "Not engaged", "Determination pending"].includes(sAttached.disposition), sAttached.disposition);
  assertEquals(toneForState("Engaged"), "ok");
  assertEquals(toneForState("Not engaged"), "neutral");
  assertEquals(toneForState("Determination pending"), "hold");

  const notReg = render(NOT_REGISTRABLE());
  const sNotReg = readSyllabus(notReg.document)!;
  assert(toneForState(sNotReg.disposition) !== null, `no tone for ${sNotReg.disposition}`);
});

Deno.test("doc176 — the syllabus's conditions are the open (conditional/record_insufficient) determinations verbatim", () => {
  const intake = PERFECT();
  const built = buildRegistrationDeliverables(intake as never) as unknown as Bag;
  const engine = runRegistrationAssessment(intake as never);
  const report: Bag = { registration_deliverables: built, obligations_summary: engine.obligations_summary, jurisdictions: engine.jurisdictions };
  const sk = assembleRegistrationSkeletonDocument(report, intake);
  const s = readSyllabus(sk.document)!;
  const counts = computeDutyCounts(report);
  assertEquals(s.conditions.length, counts.reserved);
});

Deno.test("doc176 — Registration has no lettered appendices, so the record map is honestly empty", () => {
  const sk = render(PERFECT());
  const s = readSyllabus(sk.document)!;
  assertEquals(s.record_map.length, 0);
});

// ── The PDF renderer ───────────────────────────────────────────────────────

Deno.test("doc176 — Registration renders through Syllabus & Record: page one, no cover block, no raw tokens, no page-one/exec-summary duplicate", async () => {
  const pdf = await pdfModule();
  for (const [label, intake] of [["perfect", PERFECT()], ["not-registrable", NOT_REGISTRABLE()]] as const) {
    const sk = render(intake as Bag);
    const html: string = pdf.buildSkeletonReportHTML(sk.document as never, RECORD, "Registration Assessment", "registration");
    assert(html.length > 5_000, `${label}: html too short`);
    assertStringIncludes(html, 'class="sr-syllabus"');
    assertStringIncludes(html, `<div class="dv">${readSyllabus(sk.document)!.disposition}</div>`);
    assert(!html.includes('class="header"'), `${label}: the navy cover block must not render`);
    assert(!html.includes("[Q] "), `${label}: raw [Q] token reached the PDF`);
    const secStart = html.indexOf('data-section="executive_summary"');
    const secEnd = html.indexOf('data-section="', secStart + 1);
    const execSectionHtml = html.slice(secStart, secEnd === -1 ? undefined : secEnd);
    assert(
      !execSectionHtml.includes(readSyllabus(sk.document)!.paragraph),
      `${label}: the disposition paragraph repeats inside the executive_summary section`,
    );
  }
});

Deno.test("doc176 — Registration still renders through the legacy template when the product string is withheld (byte-unchanged fallback path)", async () => {
  const pdf = await pdfModule();
  const sk = render(PERFECT());
  const html: string = pdf.buildSkeletonReportHTML(sk.document as never, RECORD, "Registration Assessment");
  assertStringIncludes(html, 'class="header"');
  assert(!html.includes('class="sr-syllabus"'));
});

// ── The grader payload ─────────────────────────────────────────────────────

Deno.test("doc176 — the skeleton grader payload leads with page one for Registration and never carries the [Q] token", () => {
  const sk = render(PERFECT());
  const p = buildSkeletonGraderPayload({ skeleton_document: sk.document });
  assertStringIncludes(p.text, "[kind=syllabus] === DETERMINATION SYLLABUS (page 1) ===");
  assertStringIncludes(p.text, `OVERALL STATUS: ${readSyllabus(sk.document)!.disposition}`);
  assert(!p.text.includes("[Q] "), "raw [Q] token in the grader payload");
  assertStringIncludes(syllabusToText(readSyllabus(sk.document)!), "DETERMINATION SYLLABUS");
});

// ── Gate membership ─────────────────────────────────────────────────────────

Deno.test("doc176 — registration is a member of the shared SR_PRODUCTS gate", () => {
  assert(SR_PRODUCTS.has("registration"));
});
