// BATCH e74fdbfd (2026-09-09) — cppa_risk run d6159d51 (Velostream). The
// recipient DoubleVerify carried contractual_protections = "Written contract
// without confirmed CCPA restriction terms": § 2.F said the reliance on the
// contractual control was "reduced accordingly in § 4.A", and then nothing
// in § 4.D — no Condition, Follow-Up or Recommendation — asked the Company
// to confirm the terms (claude rubric_actionability, verified on the PDF).
// Fixed in risk-factor-engine.ts (mirrored to ltp-risk-doc-gen): the state
// draws a Follow-Up naming the recipient and the regulation for its
// recorded role (§ 7053 third party / § 7051 service provider or
// contractor), and the § 2.F sentence points at it (DOC 152 promise parity).
// "Unsure" already drew the written-contract Recommendation; its sentence
// now says so.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleRiskSkeletonDocument } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

function fixture(name: string): Bag {
  return JSON.parse(Deno.readTextFileSync(new URL(`../fixtures/batch14/${name}.json`, import.meta.url))) as Bag;
}
const VELOSPAN = fixture("velospan");

const B1 = "Engaged — 11 CCR § 7150(b)(1) (selling or sharing personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.";
const B2 = "Engaged — 11 CCR § 7150(b)(2) (processing sensitive personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.";

function docText(intake: Bag): string {
  const res = assembleRiskSkeletonDocument({ scope_and_triggers: { narrative: [B1, B2] } } as never, intake as never);
  return skeletonDocumentToText(res.document);
}

const DOUBLEVERIFY: Bag = {
  recipient_name_or_category: "DoubleVerify (ad-audience delivery)",
  recipient_type: "Third party",
  pi_categories_made_available: ["Device identifiers (IP, cookies, device IDs)", "Internet or network activity", "General location (city, region, ZIP, IP-derived)"],
  disclosure_purpose: "Delivery of behavioral audience segments for targeted advertising on behalf of Velostream's advertising partners",
  contractual_protections: "Written contract without confirmed CCPA restriction terms",
};
const SEGMENT: Bag = {
  recipient_name_or_category: "Segment.io (data routing)",
  recipient_type: "Service provider",
  pi_categories_made_available: ["Contact identifiers (name, email, phone)", "Device identifiers (IP, cookies, device IDs)", "Internet or network activity"],
  disclosure_purpose: "Routing and orchestration of event-level behavioral data between Velostream platform and downstream analytics systems",
  contractual_protections: "Written contract with the CCPA-required restrictions in place",
};

const CONFIRM_DV =
  "Confirm that the written contract with “DoubleVerify (ad-audience delivery)” carries the CCPA-required restriction terms, and record them in the assessment record, so the contractual control can be credited in § 4.A (Cal. Civ. Code § 1798.100(d); 11 CCR § 7053)";

Deno.test("batch e74fdbfd — an unconfirmed-terms third party draws a § 7053 Follow-Up, and § 2.F points at it", () => {
  const text = docText({ ...VELOSPAN, recipients: [DOUBLEVERIFY, SEGMENT] });
  assertStringIncludes(
    text,
    "For DoubleVerify (ad-audience delivery), the required restriction terms are not confirmed, and the reliance the assessment can place on the contractual control is reduced accordingly in § 4.A; confirming those terms appears among the Follow-Ups in § 4.D.",
  );
  assertStringIncludes(text, CONFIRM_DV);
  assert(!text.includes("Confirm that the written contract with “Segment.io"), "a confirmed contract draws no Follow-Up");
});

Deno.test("batch e74fdbfd — the same state on a service provider cites § 7051", () => {
  const text = docText({ ...VELOSPAN, recipients: [{ ...SEGMENT, contractual_protections: "Written contract without confirmed CCPA restriction terms" }] });
  assertStringIncludes(
    text,
    "Confirm that the written contract with “Segment.io (data routing)” carries the CCPA-required restriction terms, and record them in the assessment record, so the contractual control can be credited in § 4.A (Cal. Civ. Code § 1798.100(d); 11 CCR § 7051)",
  );
});

Deno.test("batch e74fdbfd — 'Unsure' keeps its written-contract Recommendation and § 2.F now says so", () => {
  const text = docText({ ...VELOSPAN, recipients: [{ ...DOUBLEVERIFY, contractual_protections: "Unsure" }] });
  assertStringIncludes(
    text,
    "For DoubleVerify (ad-audience delivery), the required restriction terms are not confirmed, and the reliance the assessment can place on the contractual control is reduced accordingly in § 4.A; remediation appears among the Recommendations in § 4.D.",
  );
  assertStringIncludes(text, "Put a written contract with the required restrictions in place for “DoubleVerify (ad-audience delivery)”");
  assert(!text.includes(CONFIRM_DV), "the Follow-Up belongs to the unconfirmed-terms state only");
});
