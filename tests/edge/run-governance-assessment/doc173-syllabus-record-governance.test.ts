// DOC 173 (2026-09-04) — SYLLABUS & RECORD, Governance (the fourth product
// migrated onto the fleet presentation system; doc 151, doc 170 landed the
// shared system + CPPA Risk, doc 171 added DPIA, doc 172 added LIA). Testing
// is scoped per the CEO's 2026-09-04 instruction: enough to know the
// product generates without error, plus the invariants that keep the two
// SR_PRODUCTS gates and the two renderers from drifting.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { GOVERNANCE_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/governance-perfect.ts";
import { attachGovernanceDeliverables } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import { buildDomainFindingsTyped, composeExecutiveSummaryTyped } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-domain-tables.ts";
import { assembleGovernanceSkeletonDocument, deriveGovernanceScoreboard } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-skeleton-assemble.ts";
import { attachReadinessDetermination } from "../../../supabase/functions/_shared/ltp/governance-readiness.ts";
import { readSyllabus, SR_PRODUCTS, syllabusToText, toneForState } from "../../../supabase/functions/_shared/prose/syllabus.ts";
import { buildSkeletonGraderPayload } from "../../../supabase/functions/run-quality-batch/_local/grader/skeleton-payload.ts";

type Bag = Record<string, unknown>;
const clone = (o: unknown): Bag => JSON.parse(JSON.stringify(o));
const PERFECT = () => clone(GOVERNANCE_PERFECT[0].intake);

function render(intake: Bag): ReturnType<typeof assembleGovernanceSkeletonDocument> {
  const report: Bag = { authority_exhibit: { entries: [] } };
  const domains = buildDomainFindingsTyped(intake);
  report.domain_findings = domains;
  report.executive_summary = composeExecutiveSummaryTyped(domains);
  attachGovernanceDeliverables(report, intake);
  attachReadinessDetermination(report);
  return assembleGovernanceSkeletonDocument(report, intake);
}

async function pdfModule() {
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = () => ({ finished: Promise.resolve(), shutdown: async () => {}, addr: null });
  Deno.env.set("SUPABASE_URL", "http://localhost:54321");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-stub");
  Deno.env.set("SUPABASE_ANON_KEY", "test-stub");
  return await import("../../../supabase/functions/generate-report-pdf/index.ts");
}
const RECORD = { id: "0abc1234-0000-4000-8000-000000000003", created_at: "2026-09-04T12:00:00Z" };

// ── The projection ──────────────────────────────────────────────────────────

Deno.test("doc173 — the Governance assembler attaches a Determination Syllabus projected from its own determinations, and generates without error", () => {
  const res = render(PERFECT());
  const s = readSyllabus(res.document);
  assert(s, "document.syllabus missing");
  assert(s!.prepared_for, "prepared_for empty");
  assert(s!.disposition, "disposition empty");
  assert(s!.paragraph, "disposition paragraph empty");
  assertEquals(res.conformance.length, 0, JSON.stringify(res.conformance));
});

Deno.test("doc173 — the disposition rows are the programme scoreboard's own rows, verbatim", () => {
  const intake = PERFECT();
  const report: Bag = { authority_exhibit: { entries: [] } };
  const domains = buildDomainFindingsTyped(intake);
  report.domain_findings = domains;
  report.executive_summary = composeExecutiveSummaryTyped(domains);
  attachGovernanceDeliverables(report, intake);
  attachReadinessDetermination(report);
  const scoreboard = deriveGovernanceScoreboard(report);
  const res = assembleGovernanceSkeletonDocument(report, intake);
  const s = readSyllabus(res.document)!;
  if (scoreboard) {
    assertEquals(s.rows.length, scoreboard.rows.length);
    for (let i = 0; i < scoreboard.rows.length; i++) {
      assertEquals(s.rows[i][0], scoreboard.rows[i][0]);
      assertEquals(s.rows[i][1], scoreboard.rows[i][1]);
    }
  }
});

Deno.test("doc173 — the disposition label is the readiness rating verbatim, and every label is a controlled word", () => {
  const rated = render(PERFECT());
  const s1 = readSyllabus(rated.document)!;
  assert(["Evidenced", "Partly evidenced", "Not evidenced", "Not yet determinable"].includes(s1.disposition), s1.disposition);
  assert(toneForState(s1.disposition) !== null, `no tone for ${s1.disposition}`);

  for (const rating of ["Evidenced", "Partly evidenced", "Not evidenced", "Not yet determinable"] as const) {
    const intake = PERFECT();
    const report: Bag = { authority_exhibit: { entries: [] } };
    const domains = buildDomainFindingsTyped(intake);
    report.domain_findings = domains;
    report.executive_summary = composeExecutiveSummaryTyped(domains);
    attachGovernanceDeliverables(report, intake);
    attachReadinessDetermination(report);
    report.readiness_determination = { rating };
    const doc = assembleGovernanceSkeletonDocument(report, intake);
    const s = readSyllabus(doc.document)!;
    assertEquals(s.disposition, rating);
  }
  assertEquals(toneForState("Evidenced"), "ok");
  assertEquals(toneForState("Partly evidenced"), "hold");
  assertEquals(toneForState("Not evidenced"), "hi");
  assertEquals(toneForState("Not yet determinable"), "hold");
});

Deno.test("doc173 — Governance has no typed conditions, key dates, or appendix-lettered back matter, so the syllabus is honest about it", () => {
  const res = render(PERFECT());
  const s = readSyllabus(res.document)!;
  assertEquals(s.conditions.length, 0);
  assertEquals(s.conditions_heading, "");
  assertEquals(s.key_dates.length, 0);
  assertEquals(s.record_map.length, 0);
});

// ── The PDF renderer ───────────────────────────────────────────────────────

Deno.test("doc173 — Governance renders through Syllabus & Record: page one, no cover block, no raw tokens, no page-one/exec-summary duplicate", async () => {
  const pdf = await pdfModule();
  const res = render(PERFECT());
  const html: string = pdf.buildSkeletonReportHTML(res.document as never, RECORD, "GDPR Accountability Assessment", "governance");
  assert(html.length > 10_000, "html too short");
  assertStringIncludes(html, 'class="sr-syllabus"');
  assertStringIncludes(html, `<div class="dv">${readSyllabus(res.document)!.disposition}</div>`);
  assert(!html.includes('class="header"'), "the navy cover block must not render");
  assert(!html.includes("[Q] "), "raw [Q] token reached the PDF");
  // Governance composes its determination as its own `kind: "lead"`
  // paragraph (same shape as Risk/LIA), so the existing suppression already
  // drops the page-one duplicate from the executive_summary section.
  const secStart = html.indexOf('data-section="executive_summary"');
  const secEnd = html.indexOf('data-section="', secStart + 1);
  const execSectionHtml = html.slice(secStart, secEnd === -1 ? undefined : secEnd);
  assert(
    !execSectionHtml.includes(readSyllabus(res.document)!.paragraph),
    "the disposition paragraph repeats inside the executive_summary section",
  );
});

Deno.test("doc173 — Governance still renders through the legacy template when the product string is withheld (byte-unchanged fallback path)", async () => {
  const pdf = await pdfModule();
  const res = render(PERFECT());
  const html: string = pdf.buildSkeletonReportHTML(res.document as never, RECORD, "GDPR Accountability Assessment");
  assertStringIncludes(html, 'class="header"');
  assert(!html.includes('class="sr-syllabus"'));
});

// ── The grader payload ─────────────────────────────────────────────────────

Deno.test("doc173 — the skeleton grader payload leads with page one for Governance and never carries the [Q] token", () => {
  const res = render(PERFECT());
  const p = buildSkeletonGraderPayload({ skeleton_document: res.document });
  assertStringIncludes(p.text, "[kind=syllabus] === DETERMINATION SYLLABUS (page 1) ===");
  assertStringIncludes(p.text, `DETERMINATION: ${readSyllabus(res.document)!.disposition}`);
  assert(!p.text.includes("[Q] "), "raw [Q] token in the grader payload");
  assertStringIncludes(syllabusToText(readSyllabus(res.document)!), "DETERMINATION SYLLABUS");
});

// ── Gate membership ─────────────────────────────────────────────────────────

Deno.test("doc173 — governance is a member of the shared SR_PRODUCTS gate", () => {
  assert(SR_PRODUCTS.has("governance"));
});
