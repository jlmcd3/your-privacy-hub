// BATCH 09394859 (2026-09-10) — Velorix Digital Services Ltd (44eb2161).
//
// The record listed "Consent-based verification only" as a bare alternative
// in alternatives_considered, listed two other alternatives with reasons in
// necessity_details, and answered why_consent_not_used. The III. Necessity
// Test then reported "Of the 3 alternatives the record lists, 2 carry a
// reason for inadequacy and 1 does not … the alternative left unexplained —
// Consent-based verification only — remains open", and the determination sat
// at pending on a reason the record supplies.
//
// Root cause (build-upgrade4.ts, buildAlternativesConsidered): the synthetic
// "Obtaining consent under Article 6(1)(a)" entry is only pushed when NO
// listed alternative mentions consent; a listed consent alternative
// suppressed it, and why_consent_not_used never reached that listed entry.
// The answer now attaches to a listed consent alternative that carries no
// reason of its own; a listed consent alternative that already has a reason
// keeps it; with no listed consent alternative the synthetic entry is
// unchanged.
//
// The intake strings below are the batch's own row, read back — not
// paraphrased.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildAlternativesConsidered } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";

const WHY_CONSENT =
  "Consent is not appropriate because asking users to consent to fraud screening would undermine its effectiveness and create a perverse incentive for bad actors to decline.";

function velorix(overrides: Record<string, unknown> = {}) {
  return {
    alternatives_considered: "Consent-based verification only\nCAPTCHA and email confirmation only",
    necessity_details: {
      alternatives: "CAPTCHA and email confirmation only\nManual review of all registrations",
      alternatives_rationale:
        "CAPTCHA and email confirmation only — insufficient to detect sophisticated bot networks that pass basic verification\nManual review of all registrations — operationally unscalable at the volume of daily signups and introduces unacceptable delays",
      why_consent_not_used: WHY_CONSENT,
      ...overrides,
    },
  };
}

Deno.test("batch 09394859 — Velorix: why_consent_not_used is the reason for the listed bare consent alternative; no alternative is left unexplained", () => {
  const result = buildAlternativesConsidered(velorix());
  const consent = result.alternatives.find((a) => /\bconsent\b/i.test(a.alternative));
  assertEquals(consent !== undefined, true, "the listed consent alternative must survive the parse");
  assertEquals(consent!.rationale_recorded, true);
  assertEquals(consent!.why_inadequate.startsWith("Consent is not appropriate because"), true);
  assertEquals(result.alternatives.every((a) => a.rationale_recorded), true, "every listed alternative carries a reason");
  // The synthetic entry is not added on top of the listed one.
  assertEquals(result.alternatives.filter((a) => /\bconsent\b/i.test(a.alternative)).length, 1);
});

Deno.test("batch 09394859 — a listed consent alternative that already carries its own reason keeps it (why_consent_not_used does not overwrite)", () => {
  const result = buildAlternativesConsidered(velorix({
    alternatives: "Consent-based verification only — fraudsters would decline and the screen would not run\nManual review of all registrations",
  }));
  const consent = result.alternatives.find((a) => /\bconsent\b/i.test(a.alternative))!;
  assertEquals(consent.rationale_recorded, true);
  assertEquals(consent.why_inadequate.startsWith("fraudsters would decline"), true);
});

Deno.test("batch 09394859 — with no listed consent alternative the synthetic Article 6(1)(a) entry is unchanged", () => {
  const result = buildAlternativesConsidered({
    alternatives_considered: "CAPTCHA and email confirmation only",
    necessity_details: {
      alternatives: "CAPTCHA and email confirmation only\nManual review of all registrations",
      alternatives_rationale:
        "CAPTCHA and email confirmation only — insufficient to detect sophisticated bot networks\nManual review of all registrations — operationally unscalable",
      why_consent_not_used: WHY_CONSENT,
    },
  });
  const consent = result.alternatives.find((a) => /\bconsent\b/i.test(a.alternative))!;
  assertEquals(consent.alternative, "Obtaining consent under Article 6(1)(a)");
  assertEquals(consent.why_inadequate, WHY_CONSENT);
  assertEquals(consent.rationale_recorded, true);
});
