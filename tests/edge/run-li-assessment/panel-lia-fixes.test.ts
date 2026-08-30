// PANEL FIX BATCH 4 (2026-08-30) — LIA defects from the expert-panel review
// (doc 108), each verified against the published UK sample before fixing:
//   LIA-P1   the direct-marketing conditional fired on ANY non-empty
//            statutory_restrictions answer, so a worker-safety record's
//            Mines Regulations 2014 / HSWA 1974 answer was asserted to
//            "involve direct marketing";
//   LIA-P2   ¶27's C.-Scale sentence double-wrapped recorded free-text
//            ("affects approximately Approximately 480 ... sites people,
//            occurs continuous ...") — spine re-pinned to quoted attribution
//            (hash de3fd62a, prior 90a64832);
//   LIA-P3   necessity alternatives triplicated across paraphrase fields
//            with ";;" seam artifacts;
//   LIA-P3b  quote-then-deny: the special-category boundary implied no
//            Art. 9(2) condition was identified while the record named one.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleLiaSkeletonDocument } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { buildAlternativesConsidered } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";

type Bag = Record<string, unknown>;

const WORKER_SAFETY_RECORD: Bag = {
  organization_name: "Deep Seam Analytics Ltd",
  stated_purpose: "Underground worker-safety telemetry monitoring",
  jurisdictions: ["United Kingdom"],
  purpose_details: {
    interest_type: "Health and safety monitoring",
    specific_benefit: "earlier detection of gas exposure events",
    beneficiary: "Employees",
  },
  necessity_details: {
    alternatives_rationale: "manual checks cannot detect exposure in real time",
    why_consent_not_used: "the employment imbalance makes consent unreliable",
  },
  balancing_details: {
    scale_approx: "Approximately 480 underground shift workers across three UK sites.",
    frequency: "Continuous during underground shifts",
    duration: "Raw telemetry retained 90 days; aggregated safety metrics retained 3 years",
    statutory_restrictions:
      "Mines Regulations 2014 and HSWA 1974 duties on underground atmospheric monitoring",
    potential_harms: ["Workplace monitoring discomfort"],
    safeguards: ["Access controls"],
  },
  attestation_details: {},
};

function allText(record: Bag): string {
  const doc = assembleLiaSkeletonDocument({} as never, record as never, { deterministic: true }) as unknown as {
    document: { sections: Array<{ paragraphs: Array<{ text: string }> }> };
  };
  return doc.document.sections.flatMap((sec) => sec.paragraphs.map((p) => p.text)).join("\n");
}

Deno.test("LIA-P1: a worker-safety interest with statutory restrictions never fires the direct-marketing conditional", () => {
  const text = allText(WORKER_SAFETY_RECORD);
  assert(!text.includes("involves direct marketing"), "marketing conditional fired on a non-marketing interest");
  assertStringIncludes(text, "The company has recorded statutory provisions bearing on this processing");
  // The recorded content is preserved under the neutral lead, not dropped.
  assertStringIncludes(text, "Mines Regulations 2014");
});

Deno.test("LIA-P1: a genuinely marketing interest keeps the original conditional byte-unchanged", () => {
  const record = {
    ...WORKER_SAFETY_RECORD,
    purpose_details: { ...(WORKER_SAFETY_RECORD.purpose_details as Bag), interest_type: "Direct marketing" },
    balancing_details: {
      ...(WORKER_SAFETY_RECORD.balancing_details as Bag),
      statutory_restrictions: "PECR reg. 22 soft opt-in relied on for existing customers",
    },
  };
  const text = allText(record);
  assertStringIncludes(
    text,
    "Because the identified interest involves direct marketing, the analysis must also address the rules specific to that activity",
  );
});

Deno.test("LIA-P2: ¶27 renders quoted attribution — no double-wrap, no adverbial splice", () => {
  const text = allText(WORKER_SAFETY_RECORD);
  assertStringIncludes(
    text,
    'The company describes the scale of the processing as "Approximately 480 underground shift workers across three UK sites"',
  );
  assertStringIncludes(text, 'its frequency as "Continuous during underground shifts"');
  assertStringIncludes(
    text,
    'its duration as "Raw telemetry retained 90 days; aggregated safety metrics retained 3 years"',
  );
  assert(!text.includes("approximately Approximately"), "double-wrapped scale answer");
  assert(!text.includes("sites people"), "old frame's trailing 'people' survived");
  assert(!/occurs [a-z]/.test(text), "old adverbial 'occurs' splice survived");
});

Deno.test("LIA-P3b: a record naming an Art. 9(2) condition is acknowledged, never denied", () => {
  const record = {
    ...WORKER_SAFETY_RECORD,
    balancing_details: {
      ...(WORKER_SAFETY_RECORD.balancing_details as Bag),
      special_category_data: true,
      statutory_restrictions:
        "UK GDPR Art. 9(2)(b) employment-law condition relied on for health data under HSWA 1974",
    },
  };
  const text = allText(record);
  assertStringIncludes(text, "The record names Article 9(2)(b) for that processing");
  assert(!text.includes("until that condition is identified"), "denied a condition the record names");
});

Deno.test("LIA-P3b: with NO condition named, the original boundary sentence is byte-unchanged", () => {
  const record = {
    ...WORKER_SAFETY_RECORD,
    balancing_details: {
      ...(WORKER_SAFETY_RECORD.balancing_details as Bag),
      special_category_data: true,
    },
  };
  const text = allText(record);
  assertStringIncludes(
    text,
    "the determination in this assessment does not extend to that processing until that condition is identified",
  );
});

Deno.test("LIA-P3: a cross-field summary line of the itemised alternatives is dropped, not triplicated", () => {
  const intake = {
    necessity_details: {
      alternatives:
        "Manual paper checklists — rejected because they cannot detect gas exposure in real time.\n" +
        "Spot-check fixed sensors — rejected because coverage gaps leave roving workers unprotected.",
    },
    alternatives_considered:
      "Manual paper checklists and spot-check fixed sensors were considered and rejected.",
  };
  const out = buildAlternativesConsidered(intake) as unknown as {
    alternatives: Array<{ alternative: string; why_inadequate: string }>;
  };
  const labels = out.alternatives.map((a) => a.alternative.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim());
  assertEquals(new Set(labels).size, labels.length, "duplicate alternative labels survived dedup");
  assert(
    !out.alternatives.some((a) => /were considered and rejected\.?$/i.test(a.alternative)),
    "cross-field summary line survived as its own alternative",
  );
  const joined = out.alternatives.map((a) => `${a.alternative} ${a.why_inadequate}`).join(" ");
  assert(!joined.includes(";;"), ";; seam artifact");
  assert(!/[;,.]\s*[;,.]/.test(joined), "doubled-punctuation seam artifact");
});
