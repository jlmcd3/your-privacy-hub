// CPPA ADMT v2 — engine verification against the fleet's existing golden
// fixtures (the same intakes run-admt-checker v1 is graded against).
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { CPPA_ADMT_GOLDEN } from "../../../supabase/functions/_shared/golden/cppa-admt.ts";
import { computeAdmtV2 } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";

function fixture(id: string) {
  const f = CPPA_ADMT_GOLDEN.find((g) => g.id === id);
  if (!f) throw new Error(`fixture not found: ${id}`);
  return f.intake as Record<string, unknown>;
}

Deno.test("admt-hr-perfect-record: in-scope, human review qualifies, hiring exception, no material gaps expected to block", () => {
  const intake = fixture("admt-hr-perfect-record");
  const c = computeAdmtV2(intake);
  assertEquals(c.scope.scopeState, "OUT_OF_SCOPE", "human_review = qualifying Yes should take this OUT of ADMT scope");
  assertEquals(c.scope.humanInvolvementEffect, "WEIGHS_AGAINST");
  console.log("hr-perfect posture:", c.overallPostureLabel, "grade:", c.overallRecordGrade, "findings:", c.allFindings.length);
});

Deno.test("admt-credit-significant-tuning: partial human review -> IN_SCOPE", () => {
  const intake = fixture("admt-credit-significant-tuning");
  const c = computeAdmtV2(intake);
  assertEquals(c.scope.scopeState, "IN_SCOPE");
  assertEquals(c.scope.humanInvolvementEffect, "SUPPORTS");
  assertEquals(c.optOutPath, "FULL_OPT_OUT");
  console.log("credit-tuning posture:", c.overallPostureLabel, "grade:", c.overallRecordGrade, "opt-out posture:", c.optOut.posture);
});

Deno.test("admt-advertising-adversarial: solely-advertising -> OUT_OF_SCOPE via advertising exclusion, not human review", () => {
  const intake = fixture("admt-advertising-adversarial");
  const c = computeAdmtV2(intake);
  // decision_domains selects a regulated domain (financial) but solely_advertising=Yes -> conflict per spine rule.
  assertEquals(c.scope.scopeState, "INCONSISTENT_RECORD", "financial domain + solely_advertising=Yes is a defined conflict case in the spine");
  assert(c.allFindings.some((f) => f.priority === 1 && f.criterion === "Scope conflict"));
});

Deno.test("admt-service-eligibility-conservative: fully automated, no domain conflict -> IN_SCOPE, no human review", () => {
  const intake = fixture("admt-service-eligibility-conservative");
  const c = computeAdmtV2(intake);
  assertEquals(c.scope.scopeState, "IN_SCOPE");
  assertEquals(c.scope.humanInvolvementLabel, "No human review reported");
  console.log("conservative posture:", c.overallPostureLabel);
});

Deno.test("admt-ca-tenant-screening-perfect (ADMT_PERFECT pin): full document assembles with sentence-cited legal blocks, no ToA", async () => {
  const { ADMT_PERFECT } = await import("../../../supabase/functions/_shared/golden/cppa-admt.ts");
  const intake = ADMT_PERFECT[0].intake as Record<string, unknown>;
  const c = computeAdmtV2(intake);
  const doc = assembleAdmtV2Document({ intake, computed: c, exhibit: null, organizationName: String(intake.organization_name ?? ""), systemName: String(intake.system_name ?? "") });

  assert(doc.sections.length > 0, "document must have sections");
  assert(doc.sections.some((s) => s.id === "executive_summary"), "must have an executive summary");
  assert(!doc.sections.some((s) => s.id === "table_of_authorities"), "v3.2 removes the Table of Authorities appendix — must never render");
  console.log("perfect fixture sections:", doc.sections.map((s) => s.id).join(", "));
  console.log("perfect fixture posture:", c.overallPostureLabel, "grade:", c.overallRecordGrade);
});

// v3.2: the old ToA/footnote-marker mechanism is gone (Part I §C — legal
// citations are now inline parentheticals in the fixed legal-requirement
// blocks; Appendix C is replaced by Appendix B). This test now checks the
// ACTUAL v3.2 replacement end-to-end on an IN_SCOPE fixture: every duty
// section opens with a "legal_requirement" paragraph carrying real 11 CCR
// pinpoint citations, no raw DECISION_EFFECT/SUPPORTS/etc. token reaches a
// table cell, and Appendix A/B render with real per-report content (not a
// static menu of every possible outcome).
Deno.test("end-to-end: IN_SCOPE report renders sentence-cited legal blocks, reader-facing effect labels, and Appendix A/B", () => {
  const intake = fixture("admt-credit-significant-tuning");
  const c = computeAdmtV2(intake);

  const doc = assembleAdmtV2Document({
    intake, computed: c, exhibit: null,
    organizationName: String((intake as any).organization_name ?? ""),
    systemName: String((intake as any).system_name ?? ""),
  });

  assert(!doc.sections.some((s) => s.id === "table_of_authorities"), "v3.2 must never render a Table of Authorities appendix");

  const applicability = doc.sections.find((s) => s.id === "applicability");
  assert(applicability, "applicability section must render");
  const legalPara = applicability!.paragraphs.find((p) => p.kind === "legal_requirement");
  assert(legalPara, "applicability section must open with a legal_requirement paragraph");
  assert(/11 CCR § 7200\(a\)/.test(legalPara!.text), "legal block must carry a real pinpoint citation, sentence-level not paragraph-level");
  assert(/11 CCR § 7001\(ddd\)\(6\)/.test(legalPara!.text), "legal block must carry the advertising-exclusion pinpoint");

  // No raw implementation vocabulary anywhere in the rendered document —
  // scan every paragraph and every table cell, not just plain text, since
  // most of the old raw-token leaks lived in table cells.
  const RAW_TOKENS = ["DECISION_EFFECT", "SUBSTANTIVE_STATE", "EVIDENCE_STATE", "PATH_STATE"];
  const RAW_EFFECT_VALUES = [
    "SUPPORTS", "WEIGHS_AGAINST", "CONDITION", "NEUTRAL", // DecisionEffect
    "MEETS_REPORTED", "GAP", "PARTIAL", "INSUFFICIENT_RECORD", "NOT_APPLICABLE", // SubstantiveState
    "DOCUMENTED", "NOT_DOCUMENTED", // EvidenceState (NOT_APPLICABLE/INSUFFICIENT_RECORD already covered)
  ];
  const allCells: string[] = [];
  for (const s of doc.sections) {
    for (const p of s.paragraphs) {
      allCells.push(p.text);
      if (p.table) for (const row of p.table.rows) allCells.push(...row);
    }
  }
  const blob = allCells.join("\n");
  for (const tok of RAW_TOKENS) {
    assert(!blob.includes(tok), `raw implementation token "${tok}" leaked into rendered output`);
  }
  // Raw effect values as standalone table-cell values (not as part of
  // ordinary English, which never spells these in caps) — check exact cell
  // equality, not substring, since "Not applicable" etc are fine.
  for (const row_cell of allCells) {
    for (const raw of RAW_EFFECT_VALUES) {
      assert(row_cell.trim() !== raw, `raw DECISION_EFFECT value "${raw}" leaked into a table cell verbatim`);
    }
  }

  // CEO review 2026-08-23/24 reorder: appendix_a is now the Factor,
  // Determination, and Authority Matrix (formerly appendix_b); appendix_c
  // is now the Assessment Fact Record (formerly appendix_a). No content
  // lost — see admt-v2-assemble.ts's reorder comment.
  const appendixA = doc.sections.find((s) => s.id === "appendix_a");
  assert(appendixA, "Appendix A (Factor, Determination, and Authority Matrix) must render for an in-scope report");
  const appendixC = doc.sections.find((s) => s.id === "appendix_c");
  assert(appendixC, "Appendix C (Assessment Fact Record) must render for an in-scope report");
  const matrixTable = appendixA!.paragraphs.find((p) => p.kind === "table")!.table!;
  // Fleet-wide 3-column convention (doc 46; a062af92e for DPIA/Risk, now
  // ADMT too): "Company's reported answer" and "What the report says" merge
  // into one Report Determination cell.
  assertEquals(matrixTable.columns, ["Factor", "Report Determination", "Primary Authority"]);
  // Only the ONE selected opt-out pathway's row should appear, not all four.
  const pathwayRows = matrixTable.rows.filter((r) => r[0] === "Opt-out pathway");
  assertEquals(pathwayRows.length, 1, "Appendix A must show exactly one opt-out-pathway row, matching the Company's selected path");
  // The merged determination cell (column 2, formerly column 3's content)
  // must never show a "trigger → phrase" pattern (comment-42 rule): it
  // should be short, quoted-style outcome language, not the condition.
  for (const row of matrixTable.rows) {
    assert(!row[1].includes(" reported →"), `Appendix A determination cell leaked a trigger condition: "${row[1]}"`);
    assert(!row[1].includes(" reported met →"), `Appendix A determination cell leaked a trigger condition: "${row[1]}"`);
  }
});

Deno.test("no-crash sweep: every CPPA_ADMT_GOLDEN fixture computes and assembles without throwing", async () => {
  for (const g of CPPA_ADMT_GOLDEN) {
    let c;
    try {
      c = computeAdmtV2(g.intake as Record<string, unknown>);
      const doc = assembleAdmtV2Document({
        intake: g.intake as Record<string, unknown>, computed: c, exhibit: null,
        organizationName: String((g.intake as any).organization_name ?? ""),
        systemName: String((g.intake as any).system_name ?? ""),
      });
      assert(doc.sections.length > 0, `${g.id}: must produce at least one section`);
    } catch (e) {
      throw new Error(`fixture ${g.id} threw: ${(e as Error).message}\n${(e as Error).stack}`);
    }
  }
});

Deno.test("admt-full-optout-strong-compliance: IN_SCOPE, FULL_OPT_OUT, meets on reported facts", () => {
  const intake = fixture("admt-full-optout-strong-compliance");
  const c = computeAdmtV2(intake);
  assertEquals(c.scope.scopeState, "IN_SCOPE");
  assertEquals(c.optOutPath, "FULL_OPT_OUT");
  assertEquals(c.notice.posture, "MEETS_REPORTED");
  assertEquals(c.optOut.posture, "MEETS_REPORTED");
  assertEquals(c.access.posture, "MEETS_REPORTED");
  assertEquals(c.overallPostureLabel, "Meets on reported facts");
  assert(c.allFindings.filter((f) => f.priority === 1).length === 0, "a strong-compliance fixture should have no Priority-1 conditions");
});

Deno.test("admt-human-appeal-exception-strong: IN_SCOPE, HUMAN_APPEAL_EXCEPTION, meets on reported facts", () => {
  const intake = fixture("admt-human-appeal-exception-strong");
  const c = computeAdmtV2(intake);
  assertEquals(c.scope.scopeState, "IN_SCOPE");
  assertEquals(c.optOutPath, "HUMAN_APPEAL_EXCEPTION");
  assertEquals(c.optOut.appealTraining.status, "MEETS_REPORTED");
  assertEquals(c.optOut.appealAuthority.status, "MEETS_REPORTED");
  assertEquals(c.optOut.posture, "MEETS_REPORTED");
  assertEquals(c.overallPostureLabel, "Meets on reported facts");
});

Deno.test("admt-hiring-admission-exception-strong: IN_SCOPE, HIRING_ADMISSION_EXCEPTION, meets on reported facts", () => {
  const intake = fixture("admt-hiring-admission-exception-strong");
  const c = computeAdmtV2(intake);
  assertEquals(c.scope.scopeState, "IN_SCOPE");
  assertEquals(c.optOutPath, "HIRING_ADMISSION_EXCEPTION");
  assertEquals(c.optOut.exceptionSoleUse.status, "MEETS_REPORTED");
  assertEquals(c.optOut.exceptionTesting.status, "MEETS_REPORTED");
  assertEquals(c.optOut.posture, "MEETS_REPORTED");
  assertEquals(c.overallPostureLabel, "Meets on reported facts");
});

Deno.test("admt-work-allocation-compensation-exception-strong: IN_SCOPE, WORK_ALLOCATION_COMP_EXCEPTION, meets on reported facts", () => {
  const intake = fixture("admt-work-allocation-compensation-exception-strong");
  const c = computeAdmtV2(intake);
  assertEquals(c.scope.scopeState, "IN_SCOPE");
  assertEquals(c.optOutPath, "WORK_ALLOCATION_COMP_EXCEPTION");
  assertEquals(c.optOut.exceptionSoleUse.status, "MEETS_REPORTED");
  assertEquals(c.optOut.exceptionTesting.status, "MEETS_REPORTED");
  assertEquals(c.optOut.posture, "MEETS_REPORTED");
  assertEquals(c.overallPostureLabel, "Meets on reported facts");
});

Deno.test("finding ids are stable/unique per run (findingSeq resets)", () => {
  const intake = fixture("admt-credit-significant-tuning");
  const c1 = computeAdmtV2(intake);
  const c2 = computeAdmtV2(intake);
  assertEquals(c1.allFindings.map((f) => f.finding_id), c2.allFindings.map((f) => f.finding_id), "same intake must produce identical finding ids across runs");
  const ids = c1.allFindings.map((f) => f.finding_id);
  assertEquals(new Set(ids).size, ids.length, "finding ids must be unique within one run");
});
