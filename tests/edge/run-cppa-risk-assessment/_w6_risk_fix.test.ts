import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  applyW6RiskFix,
  computeIntakeSelectedSubsections,
} from "../../../supabase/functions/run-cppa-risk-assessment/_w6_risk_fix.ts";

Deno.test("computeIntakeSelectedSubsections — (b)(4) from systematic observation", () => {
  const s = computeIntakeSelectedSubsections({
    q5b_profiling_observation: "Yes — systematic observation of workers/students/applicants",
  });
  assertEquals(s.has("4"), true);
  assertEquals(s.has("5"), false);
});

Deno.test("intake-state discipline: rewrites (b)(5) 'asserted in the intake' when unsupported", () => {
  const report = {
    findings: [{
      description: "The § 7150(b)(5) sensitive-location profiling trigger was asserted in the intake.",
    }],
  };
  const { report: r, counters } = applyW6RiskFix(report, {
    q5b_profiling_observation: "Yes — systematic observation of workers/students/applicants",
  });
  const out = r.findings[0].description as string;
  if (!/not present in the intake/i.test(out)) throw new Error("did not reframe: " + out);
  if (/asserted in the intake/i.test(out)) throw new Error("residual assertion: " + out);
  assertEquals(counters.intake_state_rewrites >= 1, true);
});

Deno.test("intake-state discipline: leaves supported subsection intact", () => {
  const report = {
    findings: [{ description: "The § 7150(b)(4) trigger was asserted in the intake." }],
  };
  const { report: r } = applyW6RiskFix(report, {
    q5b_profiling_observation: "Yes — systematic observation of workers/students/applicants",
  });
  const out = r.findings[0].description as string;
  if (!/asserted in the intake/i.test(out)) throw new Error("wrongly rewrote supported (b)(4): " + out);
});

Deno.test("de-bundle: strips (b)(5) limb from (b)(4)/(b)(5) bundling", () => {
  const report = {
    prose: "structured indicators for § 7150(b)(4) systematic-observation profiling and § 7150(b)(5) sensitive-location triggers",
  };
  const { report: r, counters } = applyW6RiskFix(report, {});
  const out = r.prose as string;
  if (/\(b\)\(5\)/.test(out)) throw new Error("residual (b)(5): " + out);
  if (!/\(b\)\(4\)/.test(out)) throw new Error("lost (b)(4): " + out);
  assertEquals(counters.bundled_pairs_debundled >= 1, true);
});

Deno.test("de-bundle: '§ 7150(b)(4) and § 7150(b)(5)' → '§ 7150(b)(4)'", () => {
  const report = { p: "See § 7150(b)(4) and § 7150(b)(5) for details." };
  const { report: r } = applyW6RiskFix(report, {});
  if (/\(b\)\(5\)/.test(r.p)) throw new Error(r.p);
});

Deno.test("subsection-label consistency: mixed labels for one trigger → parent § 7150(b)", () => {
  const report = {
    p: "Systematic observation is captured by § 7150(b)(5). Elsewhere, systematic observation is captured by § 7150(b)(6).",
  };
  const { report: r, counters } = applyW6RiskFix(report, {});
  if (/\(b\)\(\d+\)/.test(r.p)) throw new Error("still has subsection depth: " + r.p);
  if (!/§ 7150\(b\)/.test(r.p)) throw new Error("lost parent cite: " + r.p);
  assertEquals(counters.subsection_normalized >= 2, true);
});

Deno.test("anchor keys (source_fields) not scrubbed", () => {
  const report = { information_needed: [{ field: "q5b_profiling_observation", description: "The § 7150(b)(5) sensitive-location profiling trigger was asserted in the intake." }] };
  const { report: r } = applyW6RiskFix(report, {});
  assertEquals(r.information_needed[0].field, "q5b_profiling_observation");
  if (!/not present in the intake/i.test(r.information_needed[0].description)) throw new Error("desc not rewritten");
});

Deno.test("fail-open: null intake does not throw", () => {
  const { counters } = applyW6RiskFix({ p: "hello" }, null);
  assertEquals(counters.scanned_string_nodes, 1);
});
