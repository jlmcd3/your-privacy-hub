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
