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

// RE-PIN BATCH 21b (doc 113 S8.1, RULING 3.6): section-title numerals went
// arabic (I–IV → 1–4).
function sections() {
  const out = assembleBiometricSkeletonDocument(REPORT as never, INTAKE as never);
  const byTitle = (prefix: string) => out.document.sections.find((s) => s.title.startsWith(prefix));
  return {
    text: skeletonDocumentToText(out.document),
    one: byTitle("1."),
    two: byTitle("2."),
    three: byTitle("3."),
  };
}

// RE-PIN BATCH 18 (Wave C1, doc 109 §2.9 item 1): the duty walk is now an
// h3 pinpoint heading + standalone quote chunk + Record./Conclusion.
// run-ins — the "The provision states:" chapeau retired (the heading names
// the provision), and the verbatim passage still prints exactly once.
Deno.test("BIO-2/C1: each statutory passage prints exactly once, as a quote chunk under its pinpoint heading", () => {
  const { text, one, two, three } = sections();
  assert(!text.includes("The provision states:"), "retired chapeau resurfaced");
  const QUOTE_SNIPPET = "informs the subject or the subject's legally authorized representative";
  assertEquals(text.split(QUOTE_SNIPPET).length - 1, 1, "statutory passage must print exactly once");
  assertExists(two);
  const secText = (s: { paragraphs: Array<{ text: string }> } | undefined) =>
    (s?.paragraphs ?? []).map((p) => p.text).join("\n");
  assert(secText(two).includes(QUOTE_SNIPPET), "Section II lost the verbatim passage");
  assert(secText(two).includes("§ 15(b)(1) — Written notice before collection"), "pinpoint heading absent");
  assert(secText(two).includes("Record. The company has answered that"), "Record run-in absent");
  assert(secText(two).includes("Conclusion. On the company's answers, this duty is met."), "Conclusion run-in absent");
  assert(!secText(one).includes(QUOTE_SNIPPET), "Section I still prints statutory quotes");
  assert(!secText(three).includes(QUOTE_SNIPPET), "Section III still prints statutory quotes");
  // The exec duty scorecard (item 3) renders as the report's first table.
  const { doc } = (() => {
    const out = assembleBiometricSkeletonDocument(REPORT as never, INTAKE as never);
    return { doc: out.document };
  })();
  const exec = doc.sections.find((s2) => s2.id === "executive_summary");
  const scorecard = exec?.paragraphs.find((p) => p.kind === "table");
  assertExists(scorecard, "duty scorecard table missing from the Executive Summary");
  assertEquals((scorecard as { table?: { columns: string[] } }).table?.columns, ["Duty", "Pinpoint", "Status", "Where addressed"]);
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
