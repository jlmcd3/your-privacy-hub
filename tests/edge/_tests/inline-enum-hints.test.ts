// PANEL FIX (2026-08-31) — the JSON skeleton in every fixture prompt must
// carry the verbatim closed list for closed-list fields. These are the exact
// fields that failed the contract gate in batch b8c21317.
import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { withInlineOptions } from "../../../supabase/functions/generate-stress-fixtures/_local/enum-appendix.ts";

Deno.test("closed-list placeholders are replaced by verbatim options", () => {
  const skeleton = `{
  "q7_right_delete": "string",
  "q11_policy_review": "string",
  "privacy_policy": "string",
  "dpo_status": "string",
  "cause": "string",
  "affectedCount": "string",
  "opt_out_no_cookie_banner": "Yes or No",
  "access_response_timeline": "string",
  "biometricTypes": ["array"],
  "reasonable_expectation": "string"
}`;
  const out = withInlineOptions(skeleton, ["cppaRisk", "governance", "irPlaybook", "biometric", "cppaAdmt", "lia"]);
  for (const line of out.split("\n").slice(1, -1)) {
    assert(/VERBATIM from: /.test(line), `not constrained: ${line}`);
    assert(!/: "string"|Yes or No|\["array"\]/.test(line), `placeholder survived: ${line}`);
  }
  assertStringIncludes(out, "'Ransomware or malware'");
  assertStringIncludes(out, "'Facial geometry / facial recognition'");
});

// BATCH 66b383d8 (2026-09-10) — reasons_to_conduct must resolve for the exact
// CALL B (EU) tool list, not just for ["dpia"] alone: leafOptionMap drops a
// leaf that two listed contracts define differently, and a silent drop here
// is exactly how the DPIA fixture lost the key.
Deno.test("reasons_to_conduct inlines the verbatim DPIA_REASONS list under the CALL B (EU) tool set", () => {
  const out = withInlineOptions(`{\n  "reasons_to_conduct": ["array"]\n}`, ["lia", "dpia", "cppaAdmt"]);
  assert(!out.includes('["array"]'), `placeholder survived: ${out}`);
  assertStringIncludes(out, "choose 1+ VERBATIM from:");
  assertStringIncludes(out, "'Evaluation or scoring (incl. profiling / prediction)'");
  assertStringIncludes(out, "'Automated decision-making with legal or significant effect'");
  assertStringIncludes(out, "'Systematic, extensive evaluation / profiling with significant effects (Art. 35(3)(a))'");
});
