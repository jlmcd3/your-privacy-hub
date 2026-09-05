// Batch b83ea3c4 (2026-09-05): the generated EU-notice fixtures wrote prose
// into the yes/no `transfer_outside_eea` and `dpo_details` questions and
// label-plus-commentary into the code-valued `lawful_basis`; nothing refused
// them, and every notice in the batch denied the transfers the record
// described and omitted the DPO it named. The EU notice's token- and
// code-read questions are now contract-gated (see _shared/intake-contracts/
// eu-notice.ts).
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { blockingContractViolations } from "../../../supabase/functions/run-stress-job/_local/intake-gate.ts";
import { euNoticeContract } from "../../../supabase/functions/_shared/intake-contracts/eu-notice.ts";
import { UNIVERSAL_EU_NOTICE_QUESTIONS } from "../../../src/data/eu-notice-questions/universal-questions.ts";

Deno.test("batch b83ea3c4 — gate: prose in the EU notice's yes/no and code questions blocks; free text still passes", () => {
  const prose = blockingContractViolations("eu-notice", {
    controller_name: "Velantrix Web Solutions Ltd",
    contact_email: "privacy@velantrix.io",
    dpo_details: "Miriam Estève, appointed DPO, contactable at dpo@velantrix.io",
    transfer_outside_eea: "Some processors are based in the United States. Transfers are protected by Standard Contractual Clauses (SCCs) approved by the European Commission.",
    lawful_basis: ["Contract (Art. 6(1)(b)) — account and service delivery", "Legitimate interest (Art. 6(1)(f)) — behavioural analytics"],
    automated_decisions: "The churn prediction engine produces a risk score; no solely automated decisions are made.",
    retention_period: "Account data: contract term plus 2 years.",
  });
  for (const k of ["dpo_details:", "transfer_outside_eea:", "lawful_basis:", "automated_decisions:"]) {
    assert(prose.some((v) => v.startsWith(k)), `${k} must block — got ${prose.join("; ")}`);
  }
  assert(!prose.some((v) => v.startsWith("retention_period:")), "free-text questions are not token-gated");
});

Deno.test("batch b83ea3c4 — gate: the form's own tokens pass; a key from another notice framework is advisory, never blocking", () => {
  const tokens = blockingContractViolations("eu-notice", {
    controller_name: "Velantrix Web Solutions Ltd",
    controller_address: "14 Harbourview Quay, Dublin 2, Ireland",
    contact_email: "privacy@velantrix.io",
    dpo_details: "yes",
    dpo_name: "Miriam Estève",
    dpo_email: "dpo@velantrix.io",
    processing_purposes: ["service_delivery", "analytics", "marketing"],
    data_categories: ["identifiers", "internet_activity", "financial"],
    lawful_basis: ["contract", "legitimate_interests", "consent"],
    third_party_recipients: ["service_providers", "analytics"],
    transfer_outside_eea: "yes",
    transfer_safeguards: ["sccs"],
    transfer_destinations: "United States",
    retention_period: "Account data: contract term plus 2 years.",
    automated_decisions: "no",
    collection_source: "direct",
    establishment_jurisdiction: "eea",
    gdpr_dpa_contact: "Data Protection Commission (Ireland)",
    gdpr_profiling: "yes",
    gdpr_profiling_info: "Churn-risk scoring to time retention prompts.",
  });
  assertEquals(tokens, [], tokens.join("; "));
  assertEquals(blockingContractViolations("eu-notice", { lgpd_children: "no" }), []);
});

Deno.test("batch b83ea3c4 — the contract's closed lists are the form's own option values, key for key", () => {
  const byKey = new Map(UNIVERSAL_EU_NOTICE_QUESTIONS.map((q) => [q.key, q]));
  for (const f of euNoticeContract.fields) {
    const q = byKey.get(f.key);
    if (!q || !q.options) continue;
    const formValues = q.options.map((o) => o.value).sort();
    assertEquals([...(f.options ?? [])].sort(), formValues, `${f.key}: contract options must equal the form's values`);
    assertEquals(f.kind, q.type === "multi_choice" ? "multi-enum" : "enum", `${f.key}: kind must follow the form's control`);
  }
  for (const key of ["dpo_details", "transfer_outside_eea"]) {
    assertEquals(byKey.get(key)?.type, "yes_no");
    assertEquals([...(euNoticeContract.fields.find((f) => f.key === key)!.options ?? [])], ["yes", "no"]);
  }
  assertEquals(byKey.get("automated_decisions")?.type, "yes_no_unsure");
});
