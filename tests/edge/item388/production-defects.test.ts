// ITEM 388 — the four proven production defects from the item-387 burn.
// Each fix is asserted in BOTH directions.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  RISK_INTAKE_LABELS,
  RISK_INTAKE_FIELD_IDS,
  NEUTRAL_LABEL,
  scrubProseString,
} from "../../../supabase/functions/run-cppa-risk-assessment/_w18_risk_vocab.ts";
import { LIA_VERIFIED_AUTHORITIES } from "../../../supabase/functions/_shared/registry/lia-verified-authorities.ts";
import { GRADER_STAMP } from "../../../supabase/functions/ql3-orchestrator/index.ts";
import { BUILD_STAMP as GRADER_BUILD_STAMP } from "../../../supabase/functions/grade-single-assessment/index.ts";

// ---------- FIX 1 — RISK_INTAKE_LABELS covers the whole contract ----------

Deno.test("FIX1: primary_activity_name renders its label, not the neutral fallback", () => {
  const out = scrubProseString("The intake records 'Loyalty scoring' on primary_activity_name.");
  assertEquals(out.includes("primary_activity_name"), false);
  assert(out.includes(RISK_INTAKE_LABELS.primary_activity_name), out);
  assertEquals(out.includes(NEUTRAL_LABEL), false, `collapsed to neutral: ${out}`);
});

Deno.test("FIX1: every contract-derived intake id has a label (zero delta)", () => {
  const missing = RISK_INTAKE_FIELD_IDS.filter((id) => !RISK_INTAKE_LABELS[id]);
  assertEquals(missing, [], `unlabelled contract keys: ${missing.join(", ")}`);
});

Deno.test("FIX1 negative: an id outside the contract still collapses to the neutral label", () => {
  // Not a contract key → no rewrite happens at all, and nothing raw is invented.
  const out = scrubProseString("See zz_not_a_contract_key for context.");
  assertEquals(out, "See zz_not_a_contract_key for context.");
  assertEquals(RISK_INTAKE_LABELS["zz_not_a_contract_key"] ?? NEUTRAL_LABEL, NEUTRAL_LABEL);
});

// ---------- FIX 2 — LIA registry byte-matches the EU row it cites ----------

const EU_ART_5_1_C_APPROVED =
  "adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed ('data minimisation');";

Deno.test("FIX2: principle_data_minimisation byte-matches approved provision_texts gdpr-art-5-1-c", () => {
  const row = (LIA_VERIFIED_AUTHORITIES as Record<string, any>).principle_data_minimisation;
  assertEquals(row.subsection, "GDPR Art. 5(1)(c)");
  assertEquals(row.verbatim_quote, EU_ART_5_1_C_APPROVED);
});

Deno.test("FIX2 negative: no curly quotation marks survive in the entry", () => {
  const row = (LIA_VERIFIED_AUTHORITIES as Record<string, any>).principle_data_minimisation;
  assert(!/[\u2018\u2019\u201C\u201D]/.test(row.verbatim_quote), row.verbatim_quote);
});

// ---------- FIX 3 — GRADER_STAMP mirror invariant ----------

Deno.test("FIX3: ql3-orchestrator.GRADER_STAMP === grade-single-assessment.BUILD_STAMP", () => {
  assertEquals(GRADER_STAMP, GRADER_BUILD_STAMP);
});

Deno.test("FIX3 negative: the drifted pre-item-388 value is gone", () => {
  assertEquals(String(GRADER_STAMP) === "ql3-qlbf3-grader-payload@2026-07-15T02:00Z", false);
});

// ---------- FIX 4 — dead V1 helper removed, live V2 path intact ----------

Deno.test("FIX4: the dead V1 helper and its missing constant are gone from the module", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-cppa-risk-assessment/_risk_cohort_date.ts", import.meta.url),
  );
  assertEquals(/\bWRONG_DATE_RE_25_50M\b/.test(src), false);
  assertEquals(/function exciseWrongCohortSentences\b/.test(src), false);
});

Deno.test("FIX4 negative: the live V2 excision path is untouched", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-cppa-risk-assessment/_risk_cohort_date.ts", import.meta.url),
  );
  assert(/function exciseAnyWrongCohortSentences\(/.test(src));
  assert(src.includes("exciseAnyWrongCohortSentences(node, correctDate, c)"));
});
