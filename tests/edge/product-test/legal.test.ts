// product-test-grade — legal family: cross-regime contamination.
//
// NOT RUN by this agent (hard rule: no `deno test`). Run with:
//   deno test -A tests/edge/product-test/legal.test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { checkLegal } from "../../../supabase/functions/product-test-grade/_local/grade/legal.ts";

function skeletonDoc(text: string) {
  return {
    _typed: "skeleton-document@so-wire-in" as const,
    spine_version: "test",
    title: "t", subtitle: "s",
    sections: [{ id: "body", title: "Body", paragraphs: [{ kind: "skeleton", text, key: "body:0" }] }],
  };
}

Deno.test("legal: GDPR vocabulary in a CCPA product fails critical", () => {
  const checks = checkLegal(
    "cppa-risk",
    { q1_revenue: "Over $100M" },
    { skeleton_document: skeletonDoc("The lawful basis under Article 6 GDPR relied on for this processing is legitimate interests.") },
  );
  const c = checks.find((ch) => ch.check_id === "legal.cross_regime_contamination");
  assert(c, "expected a legal.cross_regime_contamination check");
  assertEquals(c!.passed, false);
  assertEquals(c!.severity, "critical");
});

Deno.test("legal: CPPA vocabulary in a GDPR product fails critical", () => {
  const checks = checkLegal(
    "dpia",
    { organization_name: "Acme" },
    { skeleton_document: skeletonDoc("This record requires a § 7150 risk assessment under the CPPA regulations.") },
  );
  const c = checks.find((ch) => ch.check_id === "legal.cross_regime_contamination");
  assert(c);
  assertEquals(c!.passed, false);
  assertEquals(c!.severity, "critical");
});

Deno.test("legal: clean document passes contamination check", () => {
  const checks = checkLegal(
    "cppa-risk",
    { q1_revenue: "Over $100M" },
    { skeleton_document: skeletonDoc("The Company's revenue exceeds the § 7120 threshold and a risk assessment is required.") },
  );
  const c = checks.find((ch) => ch.check_id === "legal.cross_regime_contamination");
  assert(c);
  assertEquals(c!.passed, true);
});

Deno.test("legal: ADMT v2 IN_SCOPE row fails when the duties sentence is absent", () => {
  const checks = checkLegal(
    "cppa-admt",
    {
      human_review: "No — fully automated, no human review",
      decision_domains: ["Employment (hiring, promotion, discipline, termination)"],
    },
    {
      skeleton_document: skeletonDoc("The system makes hiring decisions without a human in the loop."),
      _meta: { internal: { scope_state: "IN_SCOPE" } },
    },
  );
  const row = checks.find((c) => c.check_id === "legal.admt_v2.duties_sentence");
  assert(row);
  assertEquals(row!.passed, false);
});

Deno.test("legal: ADMT v2 full-opt-out row passes when opt_out_path matches", () => {
  const checks = checkLegal(
    "cppa-admt",
    { opt_out_exception: "No exception — we provide a full opt-out right" },
    { skeleton_document: skeletonDoc("n/a"), _meta: { internal: { opt_out_path: "FULL_OPT_OUT" } } },
  );
  const row = checks.find((c) => c.check_id === "legal.admt_v2.full_opt_out_path");
  assert(row);
  assertEquals(row!.passed, true);
});
