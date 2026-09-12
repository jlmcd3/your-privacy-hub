// DOC 259D (2026-09-11) — the CEO's decisions on the four post-259A items
// (V3 hook drafting rule / corpus attribution, print-layout treatments, DPA
// counsel wording, ledger ratification), following up on doc 259C. Covers
// only the parts that were actually executable in code; see doc 259D's own
// text for the two corrections (the V3 hook fix and the CCPA-addendum
// "duplication" turned out not to be code-executable / not to be a defect).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CPPA_CYBER_GOLDEN, CYBER_PERFECT } from "../../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-cyber.ts";
import { buildCyberDeliverables } from "../../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/build.ts";
import { buildCyberComponentRecommendations, buildCyberNextSteps } from "../../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cppa-cyber-deliverables/cyber-recommendations.ts";
import { attachCyberCorpus } from "../../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-corpus-attach.ts";
import { assembleCyberSkeletonDocumentV4 } from "../../../../supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts";
import { assembleDpaDocument, type DpaAssembleInput } from "../../../../supabase/functions/generate-dpa/_local/clause-library/dpa-assemble.ts";

type Bag = Record<string, unknown>;
const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));

// ── Cyber: two wide § 7123(c) registers render as cards, not landscape ─────

function renderCyber(intake: Bag) {
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
  return await import("../../../../supabase/functions/generate-report-pdf/index.ts");
}
const RECORD = { id: "0abc1234-0000-4000-8000-000000000009", created_at: "2026-09-11T12:00:00Z" };

/** The markup for one sr-table block, up to (not including) the next
 *  sr-table or the closing </section> — whichever comes first. */
function tableBlock(html: string, surface: string): string {
  const start = html.indexOf(`sr-${surface}`);
  assert(start >= 0, `surface not found: ${surface}`);
  const nextTable = html.indexOf('class="sr-table', start + 1);
  const nextSection = html.indexOf("</section>", start);
  const end = [nextTable, nextSection].filter((i) => i > start);
  return html.slice(start, end.length ? Math.min(...end) : html.length);
}

Deno.test("doc259D — Cyber's Component Readiness Matrix and Readiness Action Register render as cards, never as a 7-9 column table, and never inside a rotated/landscape page", async () => {
  const pdf = await pdfModule();
  // A genuinely gapped fixture, not the perfect record, so the action
  // register carries real per-component rows (Type/Priority/Target/Owner).
  const gapped = CPPA_CYBER_GOLDEN.find((g) => g.id === "cyber-nist-mid-tuning")!;
  const sk = renderCyber(clone(gapped.intake as Bag));
  const html: string = pdf.buildSkeletonReportHTML(sk.document as never, RECORD, "Cybersecurity Audit Readiness Assessment", "cppa-cyber");
  assertStringIncludes(html, "sr-cyber_v4_component_matrix");
  assertStringIncludes(html, "sr-cyber_v4_action_register");
  // No wide <table> for either surface — a card block only.
  const matrixBlock = tableBlock(html, "cyber_v4_component_matrix");
  assert(!/<table/i.test(matrixBlock), "component matrix must not render as a <table>");
  const actionBlock = tableBlock(html, "cyber_v4_action_register");
  assert(!/<table/i.test(actionBlock), "action register must not render as a <table>");
  // Landscape was tried and removed (batch be0f9e02) — never reintroduced.
  assert(!/landscape/i.test(html), "no landscape/rotated-page treatment");
  // Field labels present on the action register's first card.
  assertStringIncludes(actionBlock, "Rank 1 —");
  for (const label of ["Action:", "Type:", "Priority:", "Target:", "Owner:"]) {
    assertStringIncludes(actionBlock, label);
  }
});

// ── DPA: schedules and execution no longer each force a fresh page ─────────

Deno.test("doc259D — DPA formal-instrument CSS: only new instruments/addenda force a fresh page; a short schedule and its execution block can share one", async () => {
  const src = await Deno.readTextFile(new URL("../../../../supabase/functions/generate-report-pdf/_local/dpa-formal-instrument.ts", import.meta.url));
  assertStringIncludes(src, ".fi-annexes, .fi-addendum, .fi-schedule { page-break-before: always; break-before: page; }");
  assertStringIncludes(src, ".fi-execution { page-break-inside: avoid; break-inside: avoid; }");
  assert(!src.includes(".fi-execution, .fi-annexes, .fi-addendum, .fi-schedule { page-break-before: always"), "the old combined rule must be gone");
});

// ── DPA clause 3.3: the retention-tail bracket is now conditional ──────────

const DPA_BASE: DpaAssembleInput = {
  documentType: "gdpr", controllerName: "Acme GmbH", controllerJurisdiction: "Germany", processorName: "CloudOps GmbH", processorJurisdiction: "Germany",
  services: "cloud hosting", dataCategories: ["General personal data"], retention: "90 days from contract termination", hasSubProcessors: false, subProcessorList: "",
  subprocessorAuthorizationModel: "general", subprocessorNoticeDays: 30, auditRights: "Annual audit", includeTransferClause: false, transferMechanism: "",
  securityMeasuresSelected: ["encryption_at_rest"], securityMeasuresDetails: "AES-256", californiaEngaged: false,
};

Deno.test("doc259D — DPA clause 3.3: a plain conditional sentence replaces the always-on retention-event bracket (gdpr, uk and us-state, byte-identical)", () => {
  for (const documentType of ["gdpr", "uk"] as const) {
    const t = assembleDpaDocument({ ...DPA_BASE, documentType }).document_text;
    assertStringIncludes(t, "To the extent a retention period stated above does not identify the event from which it runs, the Parties shall record that event in Annex B before execution.");
    assert(!t.includes("the event marking the start of the retention period"), "the old always-on bracket must be gone");
  }
  const us = assembleDpaDocument({ ...DPA_BASE, documentType: "us-state", controllerJurisdiction: "United States", processorJurisdiction: "United States", californiaEngaged: true }).document_text;
  assertStringIncludes(us, "To the extent a retention period stated above does not identify the event from which it runs, the Parties shall record that event in Annex B before execution.");
});
