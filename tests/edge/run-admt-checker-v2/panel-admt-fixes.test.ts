// PANEL FIX BATCH 9 (2026-08-30) — ADMT defects from the expert-panel
// review (doc 108 / panel-B memo 2), verified against the published
// out-of-scope sample:
//   ADMT-1 (a-c) the out-of-scope path RETURNED after Section 2 — no
//          conclusion, governance table, fact-record appendix, signature,
//          or ToA — while the Executive Summary pointed at two of the
//          missing destinations and promised four questions its one-row
//          table never accounted for. The path now renders the fixed
//          section structure with not-reached stubs for §§3-6 (the
//          numbering pattern §6 already used for the no-vendor case),
//          "Not reached" exec/governance rows, an applicability-only
//          factor matrix, and duty findings filtered out of Priority
//          Matters and §8.
//        (e) the fragility of the one-fact determination is now stated
//          with it ("Conditions on this determination"), with a lexical
//          auto-band caveat drawn from the Company's own description.
//   ADMT-2 (d) the title said COMPLIANCE AUDIT while the scope statement
//          disclaims an audit — retitled Compliance Assessment, with the
//          in-body "audit" self-references aligned; (h) "Article 11 of
//          the California Code of Regulations governing ADMT audits" is
//          not a citation — now Cal. Code Regs. tit. 11, §§ 7200–7222.

import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { CPPA_ADMT_GOLDEN } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-admt.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";

type Bag = Record<string, unknown>;

function fixture(id: string): Bag {
  const f = CPPA_ADMT_GOLDEN.find((g) => g.id === id);
  if (!f) throw new Error(`fixture not found: ${id}`);
  return f.intake as Bag;
}

function docFor(intake: Bag) {
  const computed = computeAdmtV2(intake);
  const doc = assembleAdmtV2Document({
    intake,
    computed,
    organizationName: String((intake as Bag).organization_name ?? "Test Org"),
    systemName: String((intake as Bag).system_name ?? "the System"),
  });
  const text = doc.sections.map((s) => `${s.title}\n${s.paragraphs.map((p) => p.text || (p.table ? p.table.rows.map((r) => r.join(" | ")).join("\n") : "")).join("\n")}`).join("\n\n");
  return { computed, doc, text };
}

Deno.test("ADMT-1: the out-of-scope document renders the full fixed structure, not a truncation", () => {
  const { computed, doc } = docFor(fixture("admt-hr-perfect-record"));
  assertEquals(computed.scope.scopeState, "OUT_OF_SCOPE");
  const ids = doc.sections.map((s) => s.id);
  for (const id of ["cover", "executive_summary", "system_profile", "applicability", "notice", "optout", "access", "vendor", "governance", "actions", "conclusion", "review_of_assessment", "appendix_a", "appendix_c"]) {
    assert(ids.includes(id), `out-of-scope document is missing section '${id}'`);
  }
});

Deno.test("ADMT-1: no orphan pointers — the destinations the summary names exist, and the four questions are accounted for", () => {
  const { doc, text } = docFor(fixture("admt-hr-perfect-record"));
  const exec = doc.sections.find((s) => s.id === "executive_summary")!;
  const execTable = exec.paragraphs.find((p) => p.table)?.table;
  assert(execTable, "exec summary table missing");
  const areas = execTable!.rows.map((r) => r[0]);
  for (const area of ["Applicability", "Pre-use Notice", "Opt-out / exception", "Access and explanation"]) {
    assert(areas.includes(area), `exec table missing area row: ${area}`);
  }
  assert(execTable!.rows.some((r) => r[1] === "Not reached"), "duty rows must read Not reached");
  assert(text.includes("7. Governance, Record Sufficiency"), "Governance section absent while the summary points to it");
  assert(/Appendix [BC] — Assessment Fact Record/.test(text), "fact-record appendix absent while the summary points to it");
});

Deno.test("ADMT-1: §§3-6 render as not-reached stubs, and duty content stays out", () => {
  const { doc } = docFor(fixture("admt-hr-perfect-record"));
  for (const id of ["notice", "optout", "access", "vendor"]) {
    const sec = doc.sections.find((s) => s.id === id)!;
    assertEquals(sec.paragraphs.length, 1, `${id} must be a one-paragraph stub`);
    assert(sec.paragraphs[0].text.startsWith("Not reached."), `${id} stub must open 'Not reached.'`);
  }
});

Deno.test("ADMT-1: the conditions-on-determination caveat renders, with the auto-band sentence only on a lexical signal", () => {
  const base = fixture("admt-hr-perfect-record");
  const { text } = docFor(base);
  assert(text.includes("Scope qualification — conditions on this determination"), "caveat heading absent");
  assert(text.includes("rests on the reported human review operating in practice"), "fragility sentence absent");
  const banded = docFor({
    ...base,
    system_description: "Scores below 40 are automatically declined; scores above 65 are auto-approved; the middle band goes to a human underwriter.",
  });
  assert(banded.text.includes("routes some outcomes automatically"), "auto-band caveat did not fire on the Company's own description");
  assert(!text.includes("routes some outcomes automatically"), "auto-band caveat fired without a lexical signal");
});

Deno.test("ADMT-1: the factor matrix restates only the applicability factors out of scope", () => {
  const { doc } = docFor(fixture("admt-hr-perfect-record"));
  const appA = doc.sections.find((s) => s.id === "appendix_a")!;
  const matrix = appA.paragraphs.find((p) => p.table)?.table;
  assert(matrix, "factor matrix missing");
  assertEquals(matrix!.rows.length, 4, "out-of-scope matrix must carry the four applicability factors only");
});

Deno.test("ADMT-1: governance duty rows read Not reached; §8 and Priority Matters carry no duty-area findings", () => {
  const { doc, text } = docFor(fixture("admt-hr-perfect-record"));
  const gov = doc.sections.find((s) => s.id === "governance")!;
  const grades = gov.paragraphs.find((p) => p.table)?.table;
  assert(grades!.rows.some((r) => r[0] === "Pre-use Notice" && r[1] === "Not reached"));
  assert(!/\(Pre-use Notice —|\(Opt-Out —|\(Access —/.test(text), "duty-area findings surfaced on an out-of-scope report");
});

Deno.test("ADMT-2: the document is titled Compliance Assessment and cites Article 11 precisely", () => {
  const { doc, text } = docFor(fixture("admt-hr-perfect-record"));
  assertEquals(doc.title, "CPPA ADMT Compliance Assessment");
  assert(!text.includes("Article 11 of the California Code of Regulations"), "imprecise citation survived");
  assert(text.includes("Article 11 of the CCPA regulations (Cal. Code Regs. tit. 11, §§ 7200–7222)"));
  assert(!text.includes("This audit addresses four questions"), "audit self-reference survived");
});

Deno.test("ADMT-1: the in-scope path is unchanged — full duty sections and the full factor matrix", () => {
  const { computed, doc } = docFor(fixture("admt-credit-significant-tuning"));
  assertEquals(computed.scope.scopeState, "IN_SCOPE");
  const notice = doc.sections.find((s) => s.id === "notice")!;
  assert(notice.paragraphs.length > 1, "in-scope notice section lost its content");
  const appA = doc.sections.find((s) => s.id === "appendix_a")!;
  const matrix = appA.paragraphs.find((p) => p.table)?.table;
  assert(matrix!.rows.length > 4, "in-scope matrix lost its duty rows");
});
