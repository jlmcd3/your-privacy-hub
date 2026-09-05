// Batch b83ea3c4 (2026-09-05) — three DPA defects on the first batch after
// doc 182, all on the deterministic path:
//   1. T6 Class B rewrote RATIFIED clause 10.1 ("…all information necessary to
//      demonstrate compliance…") to the neutral prompt — and ate its "10.1"
//      caption — on a US-only engagement whose thin intake shared no content
//      noun with the clause; it rewrote schedule requirement (h) the same way.
//   2. The emit gate degraded schedule requirements (b) and (f) — GDPR Art.
//      28(3) text — to the information-needed literal on every live DPA.
//   3. The us-state mode assembles the jurisdiction-neutral skeleton, so the
//      GDPR Art. 28(3) checklist of it was a checklist for the wrong law: (a)
//      in Section 21, (c) in Section 6, (d) "Absent — requires attention".
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyDpaT6Fix } from "../../../supabase/functions/generate-dpa/_dpa_t6_fix.ts";
import { runEmitGate } from "../../../supabase/functions/_shared/emit-gate.ts";
import { art28CoverageApplies } from "../../../supabase/functions/generate-dpa/_local/dpa-clause-coverage.ts";

const CLAUSE_10_1 =
  "10.1 The Processor shall make available to the Controller all information necessary to demonstrate compliance with the obligations under Applicable Data Protection Law, and shall allow for and contribute to audits, including inspections, conducted by the Controller or another auditor mandated by the Controller.";
const REQ_B = "ensures that persons authorised to process the personal data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality;";
const REQ_F = "assists the controller in ensuring compliance with the obligations pursuant to Articles 32 to 36 taking into account the nature of processing and the information available to the processor;";
const REQ_H = "makes available to the controller all information necessary to demonstrate compliance with the obligations laid down in this Article and allow for and contribute to audits, including inspections, conducted by the controller or another auditor mandated by the controller.";

Deno.test("batch b83ea3c4 — T6 Class B never touches the ratified contract clauses or the statutory coverage schedule", () => {
  const report: any = {
    dpa_contract: { sections: [{ heading: "10. AUDITS AND DEMONSTRATION OF COMPLIANCE", clauses: [CLAUSE_10_1] }] },
    clause_coverage: { clauses: [{ clause: "h", requirement: REQ_H, status: "present", location: "Section 10" }] },
    // A model-path prose leaf beside them is still scrubbed — the exemption is
    // by key, not a blanket switch-off.
    body: { s52: "The record establishes that targeted advertising is not within the scope of the Services." },
  };
  const c = applyDpaT6Fix(report, { intake: { controllerName: "Clarivex Digital Solutions, Inc.", services: "CDN and edge caching" } });
  assertEquals(report.dpa_contract.sections[0].clauses[0], CLAUSE_10_1);
  assertEquals(report.clause_coverage.clauses[0].requirement, REQ_H);
  assertStringIncludes(report.body.s52, "The parties should confirm whether");
  assert(c.classB_downgrades >= 1);
});

Deno.test("batch b83ea3c4 — the emit gate treats dpa_contract and clause_coverage as reserved surfaces", () => {
  const clause = "4.3 (Confidentiality and access.) The Processor shall ensure that persons authorised to process Personal Data are subject to appropriate confidentiality obligations and receive instructions concerning the confidential nature of Personal Data.";
  const report: any = {
    clause_coverage: { clauses: [{ clause: "b", requirement: REQ_B }, { clause: "f", requirement: REQ_F }] },
    dpa_contract: { sections: [{ heading: "4. DATA PROCESSING", clauses: [clause] }] },
    exec_summary: "The parties have recorded the audit arrangement in clause 10.1 and the retention position in clause 3.3, both taken from the intake without modification.",
  };
  runEmitGate(report, { tool: "dpa", intakeRoster: {} });
  assertEquals(report.clause_coverage.clauses[0].requirement, REQ_B);
  assertEquals(report.clause_coverage.clauses[1].requirement, REQ_F);
  assertEquals(report.dpa_contract.sections[0].clauses[0], clause);
});

Deno.test("batch b83ea3c4 — the Art. 28(3) coverage schedule applies to every mode but us-state", () => {
  assertEquals(art28CoverageApplies("us-state"), false);
  for (const m of ["gdpr", "uk", "dual-eu-us", "dual-eu-ca", "canada"]) assertEquals(art28CoverageApplies(m), true, m);
});
