// DOC 252 §10 (CEO-ruled 2026-09-11) — DPIA rulings.
//   Item 2: the Art. 22 register row (r8) is answered only by the record's
//           own human-intervention measure; "Staff training" + "Access
//           controls" no longer reduce it (batch 7bd29982 grader finding).
//   Item 5: Appendix B — Enforcement Precedents renders the six release-1
//           matters, so Appendix A's "(precedent appendix)" pointer resolves.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildDpiaDeliverables, readHumanInterventionSpan } from "../../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { DPIA_RISK_SPECS } from "../../../../supabase/functions/_shared/ltp/dpia-deliverables/elements.ts";
import { assembleDpiaSkeletonDocument, buildDpiaEnforcementPrecedentsTable } from "../../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-skeleton-assemble.ts";
import { DPIA_SKELETON_SECTIONS, DPIA_SKELETON_VERSION } from "../../../../supabase/functions/run-dpia-framework/_local/prose/plans/dpia.spine.ts";
import { DPIA_CORPUS_MAP } from "../../../../supabase/functions/run-dpia-framework/_local/corpus/maps/dpia-corpus-map.ts";
import { skeletonDocumentToText } from "../../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;
const OP = "User Behavioural Analytics and Engagement Profiling";

// Batch 916c33a8's Velantrix record, trimmed to the register's inputs: an
// evaluation/scoring reason (r8 fires), Staff training + Access controls
// ticked, and a narrative whose only "human review" is aggregate-level.
function velantrix(): Bag {
  return {
    organization_name: "Velantrix Digital Services Ltd",
    processing_activity_name: OP,
    description: "Velantrix aggregates clickstream events and inferred interest signals from registered users to build engagement profiles that drive personalised content ranking.",
    purpose: "To improve platform engagement and deliver personalised service experiences by predicting user content preferences.",
    data_subjects: "Registered platform users across EU and UK",
    jurisdictions: ["EU (GDPR)"],
    data_categories: ["Customer records", "Location data"],
    retention_period: "Raw event logs: 13 months.",
    legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
    reasons_to_conduct: ["Evaluation or scoring (incl. profiling / prediction)", "Data processed on a large scale"],
    existing_safeguards: ["Encryption at rest", "Access controls", "Data minimisation", "Pseudonymisation", "Staff training"],
    nature_scope_context:
      "A recommendation engine applies these vectors to surface content without human review of individual outputs; humans review model performance metrics at an aggregate level on a monthly basis and can adjust model weights.",
    residual_risks: "Users may not fully anticipate the extent to which their in-session behaviour is aggregated into persistent preference profiles.",
  };
}
const HUMAN_DECISION = "Flagged accounts receive a human decision by a trust-and-safety analyst before any block is finalised.";

function r8(intake: Bag) {
  const d = buildDpiaDeliverables(intake);
  return d.risk_register.find((r) => r.risk_id === "r8_automated_significant_effect")!;
}

Deno.test("doc252 item 2 — r8 carries no ticked-option safeguard; Staff training + Access controls leave it High and open", () => {
  const spec = DPIA_RISK_SPECS.find((x) => x.risk_id === "r8_automated_significant_effect")!;
  assertEquals(spec.mitigating_safeguards, []);
  assertEquals(spec.human_intervention_measure, true);
  const row = r8(velantrix());
  assertEquals(row.measures, []);
  assertEquals(row.likelihood, "Likely");
  assertEquals(row.residual_band, "high");
  assertEquals(row.status, "record_insufficient");
  assertStringIncludes(String(row.information_needed), "The measure by which an individual can obtain human intervention in, express a view on, or contest a decision the automated evaluation produces (Art. 22(3))");
  assert(!String(row.information_needed).includes("names none of:"), "the generic list ask must not render for r8");
});

Deno.test("doc252 item 2 — the record's own individual-level human-decision sentence answers r8, in the company's words", () => {
  const intake = { ...velantrix(), nature_scope_context: `${velantrix().nature_scope_context as string} ${HUMAN_DECISION}` };
  const row = r8(intake);
  assertEquals(row.measures, [HUMAN_DECISION.replace(/\.$/, "")]);
  assertEquals(row.likelihood, "Unlikely");
  assertEquals(row.residual_band, "moderate");
  assertEquals(row.status, "analysed");
  assertEquals(row.information_needed, undefined);
});

Deno.test("doc252 item 2 — aggregate or model-level review is not an Art. 22 measure; individual review, contest and human-in-the-loop are", () => {
  assertEquals(readHumanInterventionSpan(velantrix()), "");
  assertEquals(readHumanInterventionSpan({ nature_scope_context: "Model outputs are reviewed by a data scientist quarterly against performance dashboards." }), "");
  assertEquals(readHumanInterventionSpan({ dp_by_design_measures: "Every declined application is reviewed by a caseworker before the decision is issued." }), "Every declined application is reviewed by a caseworker before the decision is issued");
  // Clause-level read: the measure is the clause that carries it, in the company's words.
  assertEquals(readHumanInterventionSpan({ data_subject_rights_mechanisms: "Objection: dedicated form; individuals can contest the decision and obtain human intervention within 30 days." }), "individuals can contest the decision and obtain human intervention within 30 days");
  // Negated mentions describe the risk, never a measure.
  assertEquals(readHumanInterventionSpan({ nature_scope_context: "Decisions are issued without human review of individual outputs." }), "");
  assertEquals(readHumanInterventionSpan({ description: "Applications are not reviewed by a person before the decision is sent." }), "");
  // A neighbouring aggregate clause does not veto the individual-level clause.
  assertEquals(readHumanInterventionSpan({ data_quality_measures: "Model output is benchmarked quarterly; the occupational-health advisers review every individual flag before any outreach, and false positives are fed back to the quarterly model review." }), "the occupational-health advisers review every individual flag before any outreach");
  assertEquals(readHumanInterventionSpan({ description: "A human-in-the-loop check precedes every account block." }), "A human-in-the-loop check precedes every account block");
});

Deno.test("doc252 item 2 — every other register row still reads coverage off the ticked options (byte-unchanged path)", () => {
  const d = buildDpiaDeliverables(velantrix());
  const other = d.risk_register.filter((r) => r.risk_id !== "r8_automated_significant_effect");
  assert(other.length > 0);
  for (const r of other) {
    const spec = DPIA_RISK_SPECS.find((x) => x.risk_id === r.risk_id)!;
    assert(spec.mitigating_safeguards.length > 0, r.risk_id);
    assert(!spec.human_intervention_measure, r.risk_id);
    for (const m of r.measures) assert(spec.mitigating_safeguards.includes(m), `${r.risk_id}: ${m}`);
  }
});

Deno.test("doc252 item 5 — Appendix B renders the six release-1 precedents in their ratified prose on a record that carries every gated fact, and the spine is v4.13", () => {
  assertEquals(DPIA_SKELETON_VERSION, "dpia-v4.14-2026-09-19") // RE-PIN 2026-09-19 (doc 275 §15 items 1, 2, 4): v4.14;
  const last = DPIA_SKELETON_SECTIONS[DPIA_SKELETON_SECTIONS.length - 1];
  assertEquals(last.id, "enforcement_precedents");
  assertEquals(last.title, "Appendix B — Enforcement Precedents");
  assertEquals(last.blocks.map((b) => b.kind), ["skeleton", "table"]);
  // doc 263 run 2 (2026-09-17) — three bearings assert record facts and render only where the record carries them.
  const table = buildDpiaEnforcementPrecedentsTable({ data_subjects: "employees of the company", article_9_condition: "Art. 9(2)(b) employment", estimated_launch_date: "2099-01-01" })!;
  const gated = buildDpiaEnforcementPrecedentsTable({ data_subjects: "consumer loan applicants", estimated_launch_date: "2022-02-01" })!;
  assertEquals(gated.rows.length, 3);
  assert(!gated.rows.some((r) => r[0].includes("International Card Services") || r[0].includes("CARTONAJES") || r[0].includes("Bolzano")));
  assertEquals(table.columns, ["Matter", "What happened", "Bearing on this assessment", "Authority"]);
  const expected = DPIA_CORPUS_MAP.rows.filter((r) => r.role === "AP" && r.render_when?.includes("dpia_ap_record"));
  assertEquals(table.rows.length, expected.length);
  assertEquals(table.rows.length, 6);
  assertEquals(table.rows.map((r) => r[0]), expected.map((r) => r.display!.matter));
  assert(table.rows.some((r) => r[0] === "AEPD (Spain) — AENA, S.M.E., S.A. (2025)"));
  assert(table.rows.some((r) => r[0] === "AP (Netherlands) — International Card Services B.V. (2024)"));
});

Deno.test("doc252 item 5 — the rendered document carries Appendix B after Appendix A, so the '(precedent appendix)' pointer resolves", () => {
  const intake = velantrix();
  const report = buildDpiaDeliverables(intake) as unknown as Bag;
  const doc = assembleDpiaSkeletonDocument(report as never, intake as never).document;
  const ids = doc.sections.map((s) => s.id);
  assert(ids.indexOf("enforcement_precedents") > ids.indexOf("table_of_authorities"), ids.join(","));
  const text = skeletonDocumentToText(doc);
  assertStringIncludes(text, "Appendix B — Enforcement Precedents");
  assertStringIncludes(text, "This appendix records the supervisory-authority decisions this DPIA cites as persuasive authority.");
  assertStringIncludes(text, "AEPD (Spain) — AENA, S.M.E., S.A. (2025)");
  assertStringIncludes(text, "persuasive (precedent appendix): AEPD, AENA (2025); AP (NL), ICS (2024)");
});
