// DOC 175 (2026-09-04) — SYLLABUS & RECORD, Cyber v4 (the sixth product
// migrated onto the fleet presentation system, opening Tier 2; doc 151, doc
// 170-174 landed the shared system + Risk/DPIA/LIA/Governance/ADMT v2).
// Testing is scoped per the CEO's 2026-09-04 instruction: enough to know
// the product generates without error, plus the invariants that keep the
// two SR_PRODUCTS gates and the two renderers from drifting. Cyber shares
// its "cppa-cyber" product string with the untouched v3 assembler, so a
// dedicated test confirms a v3 (syllabus-less) document is NOT pulled into
// SR mode.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CYBER_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-cyber.ts";
import { buildCyberDeliverables } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import { buildCyberComponentRecommendations, buildCyberNextSteps } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts";
import { attachCyberCorpus } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-corpus-attach.ts";
import { assembleCyberSkeletonDocumentV4 } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";
import { assembleCyberSkeletonDocument } from "../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble.ts";
import { readSyllabus, SR_PRODUCTS, syllabusToText, toneForState } from "../../../supabase/functions/_shared/prose/syllabus.ts";
import { buildSkeletonGraderPayload } from "../../../supabase/functions/run-quality-batch/_local/grader/skeleton-payload.ts";

type Bag = Record<string, unknown>;
const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));
const PERFECT = () => clone(CYBER_PERFECT[0].intake as Bag);

function render(intake: Bag): ReturnType<typeof assembleCyberSkeletonDocumentV4> {
  const d = buildCyberDeliverables(intake);
  const s4 = attachCyberCorpus();
  const recs = buildCyberComponentRecommendations(d.component_coverage, d.evidence_sufficiency, s4);
  const next = buildCyberNextSteps(recs, "");
  const view: Bag = {
    ...(d as unknown as Bag),
    _meta: { internal: { cyber_corpus_s4: s4, cyber_recommendations: { recommendations: recs, next_steps: next } } },
  };
  return assembleCyberSkeletonDocumentV4(view, intake, "", "2026-09-04");
}

async function pdfModule() {
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = () => ({ finished: Promise.resolve(), shutdown: async () => {}, addr: null });
  Deno.env.set("SUPABASE_URL", "http://localhost:54321");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-stub");
  Deno.env.set("SUPABASE_ANON_KEY", "test-stub");
  return await import("../../../supabase/functions/generate-report-pdf/index.ts");
}
const RECORD = { id: "0abc1234-0000-4000-8000-000000000005", created_at: "2026-09-04T12:00:00Z" };

// ── The projection ──────────────────────────────────────────────────────────

Deno.test("doc175 — the Cyber v4 assembler attaches a Determination Syllabus projected from its own determinations, and generates without error", () => {
  const sk = render(PERFECT());
  const s = readSyllabus(sk.document);
  assert(s, "document.syllabus missing");
  assert(s!.prepared_for, "prepared_for empty");
  assert(s!.disposition, "disposition empty");
  assert(s!.paragraph, "disposition paragraph empty");
  assertEquals(sk.conformance.length, 0, JSON.stringify(sk.conformance));
});

Deno.test("doc175 — the disposition is coverVerdictPhrase(readiness_determination.conclusion), verbatim, and every label is a controlled word", () => {
  const sk = render(PERFECT());
  const s = readSyllabus(sk.document)!;
  assert([
    "Ready for the independent audit on the Company's answers",
    "Ready subject to the named remediation",
    "Not yet ready — blocking items named in this report",
    "No readiness conclusion on the information provided",
  ].includes(s.disposition), s.disposition);
  assert(toneForState(s.disposition) !== null, `no tone for ${s.disposition}`);
  for (const label of [
    "Ready for the independent audit on the Company's answers",
    "Ready subject to the named remediation",
    "Not yet ready — blocking items named in this report",
    "No readiness conclusion on the information provided",
  ]) {
    assert(toneForState(label) !== null, `no tone registered for Cyber disposition word: ${label}`);
  }
  assertEquals(toneForState("Ready for the independent audit on the Company's answers"), "ok");
  assertEquals(toneForState("Not yet ready — blocking items named in this report"), "hi");
});

Deno.test("doc175 — the syllabus's conditions are readiness_determination.blocking_components verbatim", () => {
  const intake = PERFECT();
  const d = buildCyberDeliverables(intake);
  const s4 = attachCyberCorpus();
  const recs = buildCyberComponentRecommendations(d.component_coverage, d.evidence_sufficiency, s4);
  const next = buildCyberNextSteps(recs, "");
  const view: Bag = { ...(d as unknown as Bag), _meta: { internal: { cyber_corpus_s4: s4, cyber_recommendations: { recommendations: recs, next_steps: next } } } };
  const sk = assembleCyberSkeletonDocumentV4(view, intake, "", "2026-09-04");
  const s = readSyllabus(sk.document)!;
  const blocking = d.readiness_determination.blocking_components;
  assertEquals(s.conditions.length, blocking.length);
  for (let i = 0; i < blocking.length; i++) {
    assertEquals(s.conditions[i].name, blocking[i].label);
    assertEquals(s.conditions[i].text, blocking[i].reason);
  }
});

Deno.test("doc175 — the record map covers Cyber v4's four lettered appendices", () => {
  const sk = render(PERFECT());
  const s = readSyllabus(sk.document)!;
  const appendixSections = sk.document.sections.filter((sec) => /^Appendix ([A-Z]) — /.test(sec.title ?? ""));
  assertEquals(s.record_map.length, appendixSections.length);
  assert(s.record_map.length > 0, "Cyber v4 must carry at least one lettered appendix");
});

// ── The PDF renderer ───────────────────────────────────────────────────────

Deno.test("doc175 — Cyber v4 renders through Syllabus & Record: page one, no cover block, no raw tokens, divider present", async () => {
  const pdf = await pdfModule();
  const sk = render(PERFECT());
  const html: string = pdf.buildSkeletonReportHTML(sk.document as never, RECORD, "CPPA Cybersecurity Audit Readiness Report", "cppa-cyber");
  assert(html.length > 10_000, "html too short");
  assertStringIncludes(html, 'class="sr-syllabus"');
  // Cyber's disposition text carries an apostrophe ("Company's answers"),
  // HTML-escaped on render — compare against the escaped form.
  const dispositionHtml = readSyllabus(sk.document)!.disposition.replace(/'/g, "&#39;");
  assertStringIncludes(html, `<div class="dv">${dispositionHtml}</div>`);
  assertStringIncludes(html, "Supporting Assessment Record");
  assert(!html.includes('class="header"'), "the navy cover block must not render");
  assert(!html.includes("[Q] "), "raw [Q] token reached the PDF");
});

Deno.test("doc175 — a Cyber v3 document (no persisted syllabus) does NOT enter Syllabus & Record mode, even carrying the same 'cppa-cyber' product string", async () => {
  const pdf = await pdfModule();
  const intake = PERFECT();
  const d = buildCyberDeliverables(intake);
  const s4 = attachCyberCorpus();
  const recs = buildCyberComponentRecommendations(d.component_coverage, d.evidence_sufficiency, s4);
  const next = buildCyberNextSteps(recs, "");
  const view: Bag = { ...(d as unknown as Bag), _meta: { internal: { cyber_corpus_s4: s4, cyber_recommendations: { recommendations: recs, next_steps: next } } } };
  const v3 = assembleCyberSkeletonDocument(view, intake, "", false);
  assert(!readSyllabus(v3.document), "a v3 document must not carry a syllabus");
  const html: string = pdf.buildSkeletonReportHTML(v3.document as never, RECORD, "CPPA Cybersecurity Audit Readiness Report", "cppa-cyber");
  assertStringIncludes(html, 'class="header"');
  assert(!html.includes('class="sr-syllabus"'), "a v3 (no-syllabus) row must not render the SR page one");
});

Deno.test("doc175 — Cyber v4 still renders through the legacy template when the product string is withheld", async () => {
  const pdf = await pdfModule();
  const sk = render(PERFECT());
  const html: string = pdf.buildSkeletonReportHTML(sk.document as never, RECORD, "CPPA Cybersecurity Audit Readiness Report");
  assertStringIncludes(html, 'class="header"');
  assert(!html.includes('class="sr-syllabus"'));
});

// ── The grader payload ─────────────────────────────────────────────────────

Deno.test("doc175 — the skeleton grader payload leads with page one for Cyber v4 and never carries the [Q] token", () => {
  const sk = render(PERFECT());
  const p = buildSkeletonGraderPayload({ skeleton_document: sk.document });
  assertStringIncludes(p.text, "[kind=syllabus] === DETERMINATION SYLLABUS (page 1) ===");
  assertStringIncludes(p.text, `OVERALL ASSESSMENT: ${readSyllabus(sk.document)!.disposition}`);
  assert(!p.text.includes("[Q] "), "raw [Q] token in the grader payload");
  assertStringIncludes(syllabusToText(readSyllabus(sk.document)!), "DETERMINATION SYLLABUS");
});

// ── Gate membership ─────────────────────────────────────────────────────────

Deno.test("doc175 — cppa-cyber is a member of the shared SR_PRODUCTS gate", () => {
  assert(SR_PRODUCTS.has("cppa-cyber"));
});
