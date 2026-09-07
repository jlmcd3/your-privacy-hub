// BATCH a81e0240 (2026-09-07) — first live LIA_DETERMINISTIC_ENABLED batch.
//
// The III. Necessity Test "Alternatives Considered" table rendered garbled
// in 3/3 fixtures. Root cause: buildAlternativesConsidered concatenated
// necessity_details.alternatives, alternatives_considered and
// necessity_details.alternatives_rationale into ONE text blob before
// parseAlternatives ever saw it. Where one field's own last line had no
// "label — reason" separator (a bare name, or a description with a missing
// dash), parseAlternatives' "merge into the preceding entry" branch had no
// way to know a source boundary sat between that line and the next field's
// text, so it glued the next field's lines onto the wrong entry's
// why_inadequate. The later cross-field paraphrase dedup (PANEL LIA-P3) then
// often picked that accumulated, contaminated string over the clean
// rationale for the same alternative, because it was simply longer.
//
// Fixed two ways: (1) each source is parsed on its own (build-upgrade4.ts,
// buildAlternativesConsidered), so a source boundary can never be crossed by
// a continuation-merge; (2) the dedup tie-break now ranks a clean
// (unmerged, recorded) reason above a merged (accumulated) one regardless of
// length, only falling back to "longer wins" between two reasons of the same
// rank.
//
// The three intake fixtures below are the exact necessity_details.alternatives
// / alternatives_considered / alternatives_rationale strings read back from
// the batch's own database rows (d34302d7, d22cdc6f, f2f7eeaa) — not
// paraphrased.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildAlternativesConsidered } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";

Deno.test("batch a81e0240 — Velorant: no fragment from one alternative's description leaks into another's reason", () => {
  const result = buildAlternativesConsidered({
    alternatives_considered: "Consent-based opt-in to security monitoring\nContract basis under account terms",
    necessity_details: {
      alternatives: "Consent-based monitoring — users could opt in to security checks\nFull anonymisation of session data before analysis",
      alternatives_rationale: "Consent-based monitoring — users in compromised accounts cannot meaningfully consent at the point of attack\nFull anonymisation of session data — removes the ability to link anomalous behaviour to a specific account requiring intervention",
      why_consent_not_used: "Consent cannot be withdrawn mid-session without undermining security effectiveness, and the purpose is to protect users who may not be able to act during an attack.",
    },
  });
  assertEquals(result.alternatives.length, 2);
  const byAlt = Object.fromEntries(result.alternatives.map((a) => [a.alternative, a.why_inadequate]));
  assertEquals(byAlt["Consent-based monitoring"], "users in compromised accounts cannot meaningfully consent at the point of attack");
  assertEquals(byAlt["Full anonymisation of session data"], "removes the ability to link anomalous behaviour to a specific account requiring intervention");
});

Deno.test("batch a81e0240 — Velantrix: the second alternative's reason is not glued onto bare names from the other field", () => {
  const result = buildAlternativesConsidered({
    alternatives_considered: "Consent-based opt-in analytics\nAggregate cohort analysis without individual profiling",
    necessity_details: {
      alternatives: "Consent-based analytics — would exclude non-consenting users and blind the model to the highest-risk cohort\nAggregate cohort analysis — cannot produce per-user risk scores needed to trigger individual outreach",
      alternatives_rationale: "Consent-based analytics — would systematically under-represent disengaging users who are least likely to consent\nAggregate cohort analysis — loses the individual-level signal required to act before a specific user churns",
      why_consent_not_used: "Requiring opt-in consent for retention analytics would exclude the very users most likely to churn, making the processing ineffective and the product unviable.",
    },
  });
  assertEquals(result.alternatives.length, 2);
  const byAlt = Object.fromEntries(result.alternatives.map((a) => [a.alternative, a.why_inadequate]));
  assertEquals(byAlt["Consent-based analytics"], "would systematically under-represent disengaging users who are least likely to consent");
  assertEquals(byAlt["Aggregate cohort analysis"], "loses the individual-level signal required to act before a specific user churns");
});

Deno.test("batch a81e0240 — Velorex: same defect, third fixture", () => {
  const result = buildAlternativesConsidered({
    alternatives_considered: "Consent-based voluntary disclosure of identity documents\nCapcha and behavioural challenge-response tests only",
    necessity_details: {
      alternatives: "Consent-based identity verification — would exclude genuine users unwilling to share documents\nChallenge-response tests alone — insufficient to catch coordinated bot-driven fraud",
      alternatives_rationale: "Consent-based identity verification — would fail to catch synthetic-identity fraud where documents can be fabricated\nChallenge-response tests alone — would fail to detect low-volume human-operated fraud rings",
      why_consent_not_used: "Fraudsters would simply decline consent, rendering the screening ineffective; consent is not a viable basis for a security control that must apply universally at signup.",
    },
  });
  assertEquals(result.alternatives.length, 2);
  const byAlt = Object.fromEntries(result.alternatives.map((a) => [a.alternative, a.why_inadequate]));
  assertEquals(byAlt["Consent-based identity verification"], "would fail to catch synthetic-identity fraud where documents can be fabricated");
  assertEquals(byAlt["Challenge-response tests alone"], "would fail to detect low-volume human-operated fraud rings");
});
