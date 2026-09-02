// DOC 138 (2026-09-02) — regression guard for the LIA public-authority
// "Determination Pending" wiring gap: the record already produces a
// specific, already-ratified concrete ask (DOC 129 LIA-C, 2026-09-01)
// on `public_authority_exclusion.information_needed`
// (build.ts's buildPublicAuthorityExclusion, ~line 419) whenever the
// exclusion is unresolved, but no LIA renderer ever surfaced it — the exact
// same "declared but dead" pattern doc 137 fixed for the ePrivacy/PECR
// engagement-map entry, except here even the dedicated spine section
// ("information_needed", lia.spine.ts) had no composer wired to it at all.
// Fixed here by publicAuthorityInformationNeededSentence
// (lia-skeleton-assemble.ts), appended to the existing "findings:1" block
// right after the pending sentence it explains.
//
// DO NOT TOUCH boundary: this must never change the public-authority
// determination itself (the "Determination Pending" outcome, or the gate
// logic that decides whether it resolves) — it only renders an
// already-computed fact. Confirmed here by comparing readTypedVerdicts
// (which reads `lia_determination.outcome` / `public_authority_exclusion`)
// with and without the rendered sentence.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleLiaSkeletonDocument,
  readTypedVerdicts,
} from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-skeleton-assemble.ts";
import { buildLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";

type Bag = Record<string, unknown>;

const BASE_INTAKE: Bag = {
  organization_name: "Glacier Creek Mining Corporation",
  sector: "Mining and resource extraction",
  stated_purpose: "Site access monitoring",
  processing_description: "CCTV monitoring of restricted site perimeters.",
  jurisdictions: ["United Kingdom"],
  purpose_details: {
    interest_type: "Security",
    specific_benefit: "reduced unauthorized site access",
    beneficiary: "Glacier Creek Mining Corporation",
  },
  necessity_details: {
    alternatives_rationale: "manual patrols cannot cover the full perimeter",
    why_consent_not_used: "not applicable — security monitoring only",
  },
  balancing_details: {
    scale_approx: "Site visitors and personnel",
    frequency: "Continuous",
    duration: "30-day retention",
    safeguards: ["Access restricted to security staff"],
  },
  attestation_details: {},
};

function unresolvedIntake(): Bag {
  // No purpose_details.controller_is_public_authority at all — the gate
  // this whole wiring gap concerns.
  return { ...BASE_INTAKE, purpose_details: { ...(BASE_INTAKE.purpose_details as Bag) } };
}

function resolvedNoIntake(): Bag {
  return {
    ...BASE_INTAKE,
    purpose_details: {
      ...(BASE_INTAKE.purpose_details as Bag),
      controller_is_public_authority: "No",
    },
  };
}

function resolvedYesTasksNoIntake(): Bag {
  return {
    ...BASE_INTAKE,
    purpose_details: {
      ...(BASE_INTAKE.purpose_details as Bag),
      controller_is_public_authority: "Yes",
      public_task_processing: "No",
    },
  };
}

function resolvedYesTasksYesIntake(): Bag {
  return {
    ...BASE_INTAKE,
    purpose_details: {
      ...(BASE_INTAKE.purpose_details as Bag),
      controller_is_public_authority: "Yes",
      public_task_processing: "Yes",
    },
  };
}

const ASK_SENTENCE = "The information needed to resolve that threshold issue is confirmation of whether the controller is a public authority";

function paragraphs(report: Bag, record: Bag): string[] {
  const doc = assembleLiaSkeletonDocument(report, record, { deterministic: true }) as unknown as {
    document: { sections: Array<{ paragraphs: Array<{ text: string }> }> };
  };
  return doc.document.sections.flatMap((sec) => sec.paragraphs.map((p) => p.text));
}

function documentText(report: Bag, record: Bag): string {
  return paragraphs(report, record).join("\n");
}

Deno.test("doc138 — LIA: the ratified public-authority ask renders when the exclusion is unresolved", () => {
  const intake = unresolvedIntake();
  const report = buildLiaDeliverables(intake) as unknown as Bag;
  assertEquals((report.public_authority_exclusion as Bag).determination, "undetermined_on_the_record");

  const text = documentText(report, intake);
  assertStringIncludes(text, "The information provided does not establish whether the public-authority exclusion applies.");
  assertStringIncludes(text, ASK_SENTENCE);
  assertStringIncludes(
    text,
    "and if so whether this processing is carried out in the performance of its tasks",
  );
});

Deno.test("doc138 — LIA: no ask renders once the exclusion is resolved (public authority: No)", () => {
  const intake = resolvedNoIntake();
  const report = buildLiaDeliverables(intake) as unknown as Bag;
  assertEquals((report.public_authority_exclusion as Bag).determination, "exclusion_does_not_apply");

  const text = documentText(report, intake);
  assert(!text.includes("The information needed to resolve that threshold issue"), "ask must not render once resolved");
});

Deno.test("doc138 — LIA: no ask renders once the exclusion is resolved (public authority: Yes, tasks: No)", () => {
  const intake = resolvedYesTasksNoIntake();
  const report = buildLiaDeliverables(intake) as unknown as Bag;
  assertEquals((report.public_authority_exclusion as Bag).determination, "exclusion_does_not_apply");

  const text = documentText(report, intake);
  assert(!text.includes("The information needed to resolve that threshold issue"), "ask must not render once resolved");
});

Deno.test("doc138 — LIA: no ask renders once the exclusion applies (public authority: Yes, tasks: Yes)", () => {
  const intake = resolvedYesTasksYesIntake();
  const report = buildLiaDeliverables(intake) as unknown as Bag;
  assertEquals((report.public_authority_exclusion as Bag).determination, "exclusion_applies");
  assertEquals((report.public_authority_exclusion as Bag).basis_unavailable, true);

  const text = documentText(report, intake);
  assert(!text.includes("The information needed to resolve that threshold issue"), "ask must not render once the exclusion applies");
});

Deno.test("doc138 — LIA: the Article 6(1)(f) determination is byte-identical whether or not the ask renders", () => {
  const intake = unresolvedIntake();
  const report = buildLiaDeliverables(intake) as unknown as Bag;

  // Toggle ONLY the field the new sentence reads — everything the
  // determination itself turns on (`lia_determination`, and
  // `public_authority_exclusion.determination` /
  // `.basis_unavailable`) is untouched.
  const paBag = report.public_authority_exclusion as Bag;
  const reportNoAsk: Bag = {
    ...report,
    public_authority_exclusion: { ...paBag, information_needed: undefined },
  };

  const withAsk = readTypedVerdicts(report);
  const withoutAsk = readTypedVerdicts(reportNoAsk);
  assertEquals(withAsk, withoutAsk, "readTypedVerdicts must not vary with the rendered ask present or absent");

  const outcomeFields = (r: Bag) => {
    const d = r.lia_determination as Bag;
    return { outcome: d.outcome, why: d.why, citation: d.citation, authority_verbatim: d.authority_verbatim, status: d.status };
  };
  assertEquals(outcomeFields(report), outcomeFields(reportNoAsk), "lia_determination must not vary with the rendered ask present or absent");

  // The rest of the rendered document — every paragraph other than the one
  // carrying the pending sentence — must also be untouched by the toggle.
  const withAskParas = paragraphs(report, intake);
  const withoutAskParas = paragraphs(reportNoAsk, intake);
  const normalize = (t: string) => t.replace(ASK_SENTENCE, "[ASK REMOVED]").split(/\s+/).filter(Boolean);
  assert(
    withAskParas.some((p) => p.includes(ASK_SENTENCE)),
    "expected the ask sentence to appear in at least one paragraph",
  );
  const diffIdx = withAskParas.findIndex((p) => p.includes(ASK_SENTENCE));
  for (let i = 0; i < withAskParas.length; i++) {
    if (i === diffIdx) continue;
    assertEquals(withAskParas[i], withoutAskParas[i], `paragraph ${i} must be byte-identical regardless of the ask`);
  }
});
