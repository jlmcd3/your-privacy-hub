// ADMT master review (2026-09-15, F07) — the sole-use test is branch-specific
// and an exception covers only the decisions it names.
//
// Before: one sole-use question, worded and cited for hiring/admission
// (§ 7221(b)(2)(A)), served the work-allocation/compensation branch too; and
// a record listing an eligible domain beside a non-eligible one was reported
// as fully covered. The engine now cites § 7221(b)(3)(A) on the work branch
// (registry row optout_exc_work, verified 2026-09-16) and reports PARTIAL
// eligibility with the uncovered decisions named.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeOptOut, computeOptOutPath } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";
import { ADMT_VERIFIED_AUTHORITIES } from "../../../supabase/functions/run-admt-checker-v2/_local/registry/admt-verified-authorities.ts";

const HIRE_EXC = "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination";
const WORK_EXC = "Work allocation/compensation exception (§ 7221(b)(3)) — ADMT used solely for allocation/compensation; no unlawful discrimination";
const HIRE = "Hiring or admission decisions";
const WORK = "Work allocation, scheduling, or compensation";
const FIN = "Financial or lending services (credit decisions, loans, accounts)";

function run(intake: Record<string, unknown>) {
  const path = computeOptOutPath(intake);
  return computeOptOut(intake, path);
}
const finding = (r: ReturnType<typeof run>, criterion: string) => r.findings.find((f) => f.criterion === criterion);

Deno.test("F07 — the registry carries § 7221(b)(3) verbatim", () => {
  const row = (ADMT_VERIFIED_AUTHORITIES as Record<string, { subsection: string; verbatim_quote: string }>).optout_exc_work;
  assert(row, "optout_exc_work row missing");
  assertEquals(row.subsection, "11 CCR § 7221(b)(3)");
  assert(row.verbatim_quote.includes("solely for the business’s allocation/assignment of work or compensation"));
});

Deno.test("F07 — the work branch's sole-use finding names its own condition and subsection", () => {
  const r = run({ decision_domains: [WORK], opt_out_exception: WORK_EXC, admt_detail: { sole_use_attestation: "No — the output is also used for other purposes" } });
  const f = finding(r, "Sole-use condition");
  assert(f, "sole-use finding missing on a No answer");
  assert(f.factual_basis.includes("§ 7221(b)(3)(A)"), f.factual_basis);
  assert(f.factual_basis.includes("allocation/assignment of work or compensation"), f.factual_basis);
  assertEquals(f.authority, "11 CCR § 7221(b)(3)");
});

Deno.test("CEO item 1 — the work branch's own Yes string scores MEETS_REPORTED and the contract accepts both branch sets", async () => {
  const { cppaAdmtContract, ADMT_SOLE_USE_ATTESTATION_WORK_OPTS, ADMT_SOLE_USE_ATTESTATION_OPTS } = await import("../../../supabase/functions/_shared/intake-contracts/cppa-admt.ts");
  const workYes = ADMT_SOLE_USE_ATTESTATION_WORK_OPTS[0];
  assert(workYes.startsWith("Yes — solely for the allocation/assignment of work or compensation"), workYes);
  const r = run({ decision_domains: [WORK], opt_out_exception: WORK_EXC, admt_detail: { sole_use_attestation: workYes } });
  const f = finding(r, "Sole-use condition");
  // A MEETS_REPORTED factor raises no finding; the hiring Yes on the same branch scores the same way.
  assertEquals(f, undefined);
  const hireYesOnWork = run({ decision_domains: [WORK], opt_out_exception: WORK_EXC, admt_detail: { sole_use_attestation: ADMT_SOLE_USE_ATTESTATION_OPTS[0] } });
  assertEquals(finding(hireYesOnWork, "Sole-use condition"), undefined);
  const field = cppaAdmtContract.fields.find((x) => x.key === "admt_detail.sole_use_attestation")!;
  for (const o of [...ADMT_SOLE_USE_ATTESTATION_OPTS, ...ADMT_SOLE_USE_ATTESTATION_WORK_OPTS]) assert((field.options as readonly string[]).includes(o), o);
});

Deno.test("F07 — the hiring branch keeps the ability-to-perform condition", () => {
  const r = run({ decision_domains: [HIRE], opt_out_exception: HIRE_EXC, admt_detail: { sole_use_attestation: "No — the output is also used for other purposes" } });
  const f = finding(r, "Sole-use condition")!;
  assert(f.factual_basis.includes("§ 7221(b)(2)(A)"), f.factual_basis);
  assert(!f.factual_basis.includes("(b)(3)"), f.factual_basis);
});

Deno.test("F07 — mixed purposes: an exception covers only the decisions it names (PARTIAL, uncovered named)", () => {
  const r = run({ decision_domains: [HIRE, FIN], opt_out_exception: HIRE_EXC });
  const f = finding(r, "Exception eligibility");
  assert(f, "eligibility finding missing on a mixed record");
  assertEquals(f.substantive_state, "PARTIAL");
  assert(f.factual_basis.includes(FIN), f.factual_basis);
  assert(f.factual_basis.includes("keep the right to opt out"), f.factual_basis);
});

Deno.test("F07 — a fully eligible record reports no eligibility finding; an ineligible one reports GAP", () => {
  const ok = run({ decision_domains: [HIRE], opt_out_exception: HIRE_EXC });
  assertEquals(finding(ok, "Exception eligibility"), undefined);
  const gap = run({ decision_domains: [FIN], opt_out_exception: WORK_EXC });
  assertEquals(finding(gap, "Exception eligibility")?.substantive_state, "GAP");
});
