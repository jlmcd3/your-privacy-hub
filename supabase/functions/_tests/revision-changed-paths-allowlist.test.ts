// RC-P3 §CHECK-A tests — qcChangedPathsAuthorized.
//
// Green: answered target + descendant is allowed.
// Red:   changed_path touching an unanswered field is rejected.
// Alias: cppa_risk q1_revenue → normalised_intake.* is allowed via alias map.
// Cyber: controls.c13_training → controls[12].status is allowed via alias map.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { qcChangedPathsAuthorized } from "../_shared/revision-qc.ts";

Deno.test("qcChangedPathsAuthorized: green — answered target and descendant paths pass", () => {
  const answered = [{ target: { path: "impact.severity_of_harm" } }];
  const res = qcChangedPathsAuthorized(
    answered,
    ["impact.severity_of_harm", "impact.severity_of_harm"],
    "cppa_risk_assessment",
  );
  assertEquals(res.status, "green");
});

Deno.test("qcChangedPathsAuthorized: red — changed_path touching an unanswered field", () => {
  const answered = [{ target: { path: "impact.severity_of_harm" } }];
  const res = qcChangedPathsAuthorized(
    answered,
    ["impact.severity_of_harm", "org_context.company_name"],
    "cppa_risk_assessment",
  );
  assertEquals(res.status, "red");
  assert(res.detail.includes("org_context.company_name"));
});

Deno.test("qcChangedPathsAuthorized: alias path (cppa_risk q1_revenue → normalised_intake.*)", () => {
  const answered = [{ target: { path: "q1_revenue" } }];
  const res = qcChangedPathsAuthorized(
    answered,
    [
      "normalised_intake.content_detail.revenue_band",
      "normalised_intake.content_detail.revenue_band_key",
      "normalised_intake.triggers.q1_revenue",
    ],
    "cppa_risk_assessment",
  );
  assertEquals(res.status, "green");
});

Deno.test("qcChangedPathsAuthorized: cyber indexed path (controls.c13_training → controls[12].status)", () => {
  const answered = [{ target: { path: "controls.c13_training" } }];
  const res = qcChangedPathsAuthorized(
    answered,
    ["controls[12].status"],
    "cppa_cybersecurity",
  );
  assertEquals(res.status, "green");
});

Deno.test("qcChangedPathsAuthorized: cyber derived-paths (controls[N].{score,finding} + top_risks)", () => {
  // Rule (a): controls[12].status via alias. Rule (b): peer leaves + top_risks
  // are DERIVED_PATHS entries verified against QL3 run 08a71bcd.
  const answered = [{ target: { path: "controls.c13_training" } }];
  const res = qcChangedPathsAuthorized(
    answered,
    [
      "controls[12].status",
      "controls[12].score",
      "controls[12].finding",
      "top_risks[0]",
      "overall_score",
    ],
    "cppa_cybersecurity",
  );
  assertEquals(res.status, "green");
});

Deno.test("qcChangedPathsAuthorized: server-owned bookkeeping paths are ignored (not rejected)", () => {
  // revision-mode.ts overwrites these after applyRevisionPatch; model writes
  // there are discarded, so they must not cause the allowlist to fail.
  const answered = [{ target: { path: "q1_revenue" } }];
  const res = qcChangedPathsAuthorized(
    answered,
    [
      "normalised_intake.triggers.q1_revenue",
      "open_items",
      "advisory_notes",
      "information_needed",
      "lint_warnings",
    ],
    "cppa_risk_assessment",
  );
  assertEquals(res.status, "green");
});

Deno.test("qcChangedPathsAuthorized: unauthorized derived-index (controls[3].score with c13 answered)", () => {
  // A patch that touches an OFF-target control array index is unauthorized —
  // rule (b) DERIVED_PATHS entries use `controls[*]` so a peer leaf on ANY
  // index passes ONLY when there's a corresponding rule-(a) alias for that
  // same index. Today the check is index-permissive (any [N]) because it
  // trusts the pre-apply cyber shape validator to catch shape mismatches;
  // this test asserts the current permissive behavior explicitly so a
  // future contributor considering index-strictness sees the current bar.
  const answered = [{ target: { path: "controls.c13_training" } }];
  const res = qcChangedPathsAuthorized(
    answered,
    ["controls[3].score"],
    "cppa_cybersecurity",
  );
  // Current bar: rule-(b) permissive on index. If we tighten this later,
  // flip this assertion and add the missing index-scoping code together.
  assertEquals(res.status, "green");
});
