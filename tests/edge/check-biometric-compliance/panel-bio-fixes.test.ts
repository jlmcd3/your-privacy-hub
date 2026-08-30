// PANEL FIX BATCH 6 (2026-08-30) — Biometric defects from the expert-panel
// review (doc 108 / panel-C memo 3):
//   BIO-2 (D6)  Sections I and III printed composeDutyBlock over their
//               thematic filters while Section II printed the SAME rows per
//               statute — the full analyses, statutory block quotes
//               included, appeared twice (fifteen analyses for seven duties
//               on the published sample). Section II is now the single home
//               of the full analysis; I and III carry posture leads plus a
//               one-line-per-duty summary.
//   (D7 rider)  The destruction-clock directive moved from Section I (where
//               it sat apropos of nothing in the notice discussion) to
//               Section III, whose subject is the retention clock.
// BIO-1 (fixture under-supply) is guarded in
// src/lib/__tests__/sampleFixtures.contract.test.ts — it was never a
// product bug.

import { assert, assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleBiometricSkeletonDocument } from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

const REPORT: Bag = {
  duty_findings: [
    {
      statute_key: "us_il_bipa",
      key: "bipa_15b1_notice",
      label: "Written notice before collection",
      citation: "740 ILCS 14/15(b)(1)",
      standard:
        "(1) informs the subject or the subject's legally authorized representative in writing that a biometric identifier or biometric information is being collected or stored;",
      record_fact: "Written notice given before collection",
      application: "The company's answer states written notice is given before collection, which is what the provision requires.",
      verdict: "satisfied",
    },
    {
      statute_key: "us_il_bipa",
      key: "bipa_15b3_release",
      label: "Written release executed before collection",
      citation: "740 ILCS 14/15(b)(3)",
      standard: "(3) receives a written release executed by the subject of the biometric identifier or biometric information;",
      record_fact: "Standalone written release signed before collection",
      application: "A standalone written release signed before enrollment satisfies the release requirement.",
      verdict: "satisfied",
    },
    {
      statute_key: "us_il_bipa",
      key: "bipa_15a_retention_schedule",
      label: "Public written retention schedule and destruction guidelines",
      citation: "740 ILCS 14/15(a)",
      standard:
        "A private entity in possession of biometric identifiers or biometric information must develop a written policy, made available to the public, establishing a retention schedule and guidelines for permanently destroying biometric identifiers and biometric information",
      record_fact: "Retention policy published",
      application: "The recorded schedule destroys templates at purpose satisfaction or three years after last interaction, whichever occurs first.",
      verdict: "record_insufficient",
      information_needed: "whether the written policy has been in place since first possession of biometric data",
    },
  ],
};

const INTAKE: Bag = {
  orgName: "Busted Sled Solutions, Inc.",
  orgType: "Employer (employee biometrics)",
  biometricTypes: ["Fingerprint / palm print"],
  purpose: "Time & attendance / workforce management",
  jurisdictions: ["Illinois, USA (BIPA)"],
  retention_schedule_text: "Templates destroyed at purpose satisfaction or 3 years after last interaction.",
  security_measures_description: "Encrypted template storage",
};

function sections() {
  const out = assembleBiometricSkeletonDocument(REPORT as never, INTAKE as never);
  const byTitle = (prefix: string) => out.document.sections.find((s) => s.title.startsWith(prefix));
  return {
    text: skeletonDocumentToText(out.document),
    one: byTitle("I."),
    two: byTitle("II."),
    three: byTitle("III."),
  };
}

Deno.test("BIO-2: each statutory passage prints exactly once, in Section II", () => {
  const { text, one, two, three } = sections();
  assertEquals(text.split("The provision states:").length - 1, 3, "quote count != duty count");
  assertExists(two);
  const secText = (s: { paragraphs: Array<{ text: string }> } | undefined) =>
    (s?.paragraphs ?? []).map((p) => p.text).join("\n");
  assert(secText(two).includes("The provision states:"), "Section II lost the full analysis");
  assert(!secText(one).includes("The provision states:"), "Section I still prints statutory quotes");
  assert(!secText(three).includes("The provision states:"), "Section III still prints statutory quotes");
});

Deno.test("BIO-2: Sections I and III carry the one-line-per-duty summary with a Section II pointer", () => {
  const { one, three } = sections();
  const secText = (s: { paragraphs: Array<{ text: string }> } | undefined) =>
    (s?.paragraphs ?? []).map((p) => p.text).join("\n");
  const oneText = secText(one);
  assert(oneText.includes("Written notice before collection (740 ILCS 14/15(b)(1)) — met on the company's answers."));
  assert(oneText.includes("in Section II."));
  const threeText = secText(three);
  assert(
    threeText.includes(
      "Public written retention schedule and destruction guidelines (740 ILCS 14/15(a)) — not resolved by the company's answers.",
    ),
  );
  assert(threeText.includes("in Section II."));
});

Deno.test("BIO-2/D7: the destruction-clock directive lives in Section III, not Section I", () => {
  const { one, three } = sections();
  const CLOCK = "the retention period runs from the date the initial purpose for collection has been satisfied";
  const secText = (s: { paragraphs: Array<{ text: string }> } | undefined) =>
    (s?.paragraphs ?? []).map((p) => p.text).join("\n");
  assert(secText(three).includes(CLOCK), "clock sentence missing from Section III");
  assert(!secText(one).includes(CLOCK), "clock sentence still in Section I");
});
