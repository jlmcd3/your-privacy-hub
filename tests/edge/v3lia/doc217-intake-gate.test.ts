// DOC 217 §3 — lia-intake-gate: pre-checks, code vocabulary, span verification.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  GATE_REASON_CODES,
  isLiaFreeTextField,
} from "../../../supabase/functions/lia-intake-gate/_local/codes.ts";
import {
  isPlaceholder,
  nonLatinRatio,
  precheckFields,
} from "../../../supabase/functions/lia-intake-gate/_local/precheck.ts";
import {
  isByteSubstring,
  verifyGateItem,
} from "../../../supabase/functions/lia-intake-gate/_local/verify.ts";
import { GATE_SYSTEM } from "../../../supabase/functions/lia-intake-gate/_local/prompts.ts";

Deno.test("SIX reason codes, and other_limb_field is not one of them", () => {
  assertEquals(GATE_REASON_CODES.length, 6);
  assertEquals((GATE_REASON_CODES as readonly string[]).includes("other_limb_field"), false);
  assertEquals(GATE_SYSTEM.includes("other_limb_field to the"), true);
});

Deno.test("pre-check: placeholders, short answers, script, duplicates — no model call", () => {
  const f = (id: string, answer: string) => ({ field_id: id, question_text: "q", answer });
  const pre = precheckFields([
    f("purpose_details.stated_purpose", "n/a"),
    f("purpose_details.specific_benefit", "too short"),
    f("necessity_details.alternatives", "мы обрабатываем персональные данные клиентов"),
    f("balancing_details.collection_context", "We collect contact details at sign-up."),
    f("balancing_details.additional_context", "We collect contact details at sign-up."),
    f("processing_description", "We screen payment records for fraud indicators."),
  ]);
  assertEquals(pre.get("purpose_details.stated_purpose")!.reason_codes, ["placeholder"]);
  assertEquals(pre.get("purpose_details.specific_benefit")!.reason_codes, ["non_responsive"]);
  assertEquals(pre.get("necessity_details.alternatives")!.reason_codes, ["unintelligible"]);
  assertEquals(pre.has("balancing_details.collection_context"), false);
  assertEquals(pre.get("balancing_details.additional_context")!.reason_codes, ["non_responsive"]);
  assertEquals(
    pre.get("balancing_details.additional_context")!.precheck,
    "duplicate_of:balancing_details.collection_context",
  );
  assertEquals(pre.has("processing_description"), false);
});

Deno.test("placeholder lexicon and repeated punctuation", () => {
  for (const p of ["N/A", "tbd", "See above", "none", "-", ".", "...", "??", "  "]) {
    assertEquals(isPlaceholder(p), true, p);
  }
  assertEquals(isPlaceholder("We retain records for seven years."), false);
  assertEquals(nonLatinRatio("абвгд") > 0.5, true);
  assertEquals(nonLatinRatio("plain english"), 0);
});

Deno.test("verify: unknown codes dropped, span must be a byte-substring", () => {
  const answer = "We profile customers to detect payment fraud.";
  const v = verifyGateItem({
    field_id: "processing_description",
    verdict: "non_conforming",
    reason_codes: ["legal_conclusion_not_fact", "other_limb_field", "invented"],
    other_limb_field: null,
    evidence_span: "detect payment fraud",
  }, answer)!;
  assertEquals(v.reason_codes, ["legal_conclusion_not_fact"]);
  assertEquals(v.checks.codes_ok, false);
  assertEquals(v.evidence_span, "detect payment fraud");

  const bad = verifyGateItem({
    field_id: "processing_description",
    verdict: "conforms",
    reason_codes: [],
    other_limb_field: null,
    evidence_span: "never said this",
  }, answer)!;
  assertEquals(bad.evidence_span, null);
  assertEquals(bad.checks.span_ok, false);
  assertEquals(isByteSubstring("payment", answer), true);
});

Deno.test("verify: other_limb_field only with its code and only a known field id", () => {
  const answer = "We record health conditions to tailor the offer.";
  const ok = verifyGateItem({
    field_id: "purpose_details.stated_purpose",
    verdict: "non_conforming",
    reason_codes: ["fact_belongs_to_other_limb"],
    other_limb_field: "processing_description",
    evidence_span: "health conditions",
  }, answer)!;
  assertEquals(ok.other_limb_field, "processing_description");

  const unknownField = verifyGateItem({
    field_id: "purpose_details.stated_purpose",
    verdict: "non_conforming",
    reason_codes: ["fact_belongs_to_other_limb"],
    other_limb_field: "made.up_field",
    evidence_span: null,
  }, answer)!;
  assertEquals(unknownField.other_limb_field, null);
  assertEquals(isLiaFreeTextField("made.up_field"), false);

  const noCode = verifyGateItem({
    field_id: "purpose_details.stated_purpose",
    verdict: "conforms",
    reason_codes: [],
    other_limb_field: "processing_description",
    evidence_span: null,
  }, answer)!;
  assertEquals(noCode.other_limb_field, null);
  assertEquals(noCode.verdict, "conforms");
});
