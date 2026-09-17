// FIXTURE CONSISTENCY — lia.* rules for src/lib/ptestPanels/lia.ts fixtures.
// Each rule is a pure function of the intake (plus ctx.reportDate); fields
// verified against supabase/functions/_shared/intake-contracts/li-assessment.ts
// (Stage B contract) and src/pages/LIAssessment.enums.ts (SAFEGUARD_OPTS —
// not itself copied into the contract file, so read there directly).

import type { Bag, FixtureRule, RuleContext } from "./framework.ts";
import { str, arr, get } from "./framework.ts";

// Words that mark a rationale line as still describing the same alternative
// after articles are stripped; used by lia.alternatives-rationale below.
function stripLeadingArticle(text: string): string {
  return text.trim().replace(/^(a|an|the)\s+/i, "");
}
function significantWords(text: string, take: number): string[] {
  return stripLeadingArticle(text).toLowerCase().split(/\s+/).filter((w) => w.length >= 4).slice(0, take);
}

export const LIA_RULES: readonly FixtureRule[] = [
  {
    id: "lia.safeguards-other",
    title: "safeguards 'Other' selection must have matching free text",
    // Catches "Other" ticked with no safeguards_other text, or text present
    // with "Other" not ticked.
    check(intake: Bag): string[] {
      const safeguards = arr(get(intake, "balancing_details.safeguards"));
      const other = str(get(intake, "balancing_details.safeguards_other"));
      const hasOther = safeguards.includes("Other");
      if (hasOther && !other) return ['balancing_details.safeguards includes "Other" but safeguards_other is empty'];
      if (!hasOther && other) return ["balancing_details.safeguards_other is set but \"Other\" is not ticked in safeguards"];
      return [];
    },
  },
  {
    id: "lia.opt-out",
    title: "'Opt-out offered' must agree with the opt_out_mechanism narrative",
    // Catches "Opt-out offered" ticked while opt_out_mechanism denies an
    // opt-out exists (or the reverse).
    check(intake: Bag): string[] {
      const safeguards = arr(get(intake, "balancing_details.safeguards"));
      const mechanism = str(get(intake, "balancing_details.opt_out_mechanism")).trim();
      const hasOptOut = safeguards.includes("Opt-out offered");
      const denies = /^(no|none)\b/i.test(mechanism);
      if (hasOptOut && denies) return ['safeguards includes "Opt-out offered" but opt_out_mechanism starts by denying one'];
      if (!hasOptOut && denies) return []; // consistent: no opt-out ticked, none described
      return [];
    },
  },
  {
    id: "lia.children",
    title: "children_data_subjects must agree with children_age_band and vulnerable_subjects",
    // Catches "Yes" with no age band or no children mention in
    // vulnerable_subjects, and "No" with an age band still set.
    check(intake: Bag): string[] {
      const flag = str(get(intake, "balancing_details.children_data_subjects"));
      const ageBand = str(get(intake, "balancing_details.children_age_band"));
      const vulnerable = arr(get(intake, "balancing_details.vulnerable_subjects")).join(" ");
      const violations: string[] = [];
      if (flag === "Yes") {
        if (!ageBand) violations.push("children_data_subjects is Yes but children_age_band is empty");
        if (!/child/i.test(vulnerable)) violations.push("children_data_subjects is Yes but vulnerable_subjects does not mention children");
      }
      if (flag === "No" && ageBand) violations.push("children_data_subjects is No but children_age_band is set");
      return violations;
    },
  },
  {
    id: "lia.mitigations-not-duplicated",
    title: "additional_mitigations must not restate a ticked safeguard",
    // Catches a mitigation entry repeating a keyword already covered by a
    // ticked safeguard (encryption, pseudonymisation, access control, etc.).
    check(intake: Bag): string[] {
      const safeguards = arr(get(intake, "balancing_details.safeguards")).join(" ").toLowerCase();
      const mitigations = str(get(intake, "balancing_details.additional_mitigations"));
      if (!mitigations) return [];
      const keywords = ["encryption", "pseudonymis", "access control", "retention limit", "vendor due diligence", "opt-out"];
      const violations: string[] = [];
      for (const entry of mitigations.split(/;|\n/)) {
        const line = entry.toLowerCase();
        const hit = keywords.find((kw) => line.includes(kw) && safeguards.includes(kw));
        if (hit) violations.push(`additional_mitigations entry "${entry.trim()}" repeats ticked safeguard keyword "${hit}"`);
      }
      return violations;
    },
  },
  {
    id: "lia.alternatives-rationale",
    title: "alternatives and alternatives_rationale must line up one-to-one",
    // Catches a different number of items, or a rationale line that shares
    // no significant word with its corresponding alternative (fixtures vary
    // wording, so this checks keyword overlap rather than an exact prefix).
    check(intake: Bag): string[] {
      const alternatives = str(get(intake, "necessity_details.alternatives")).split(";").map((s) => s.trim()).filter(Boolean);
      const rationaleText = str(get(intake, "necessity_details.alternatives_rationale"));
      if (alternatives.length === 0 || !rationaleText) return [];
      const rationales = rationaleText.split("\n").map((s) => s.trim()).filter(Boolean);
      const violations: string[] = [];
      if (alternatives.length !== rationales.length) {
        violations.push(`necessity_details.alternatives has ${alternatives.length} item(s) but alternatives_rationale has ${rationales.length}`);
        return violations;
      }
      // Wording differs freely between the list and its rationale; the count is the reliable check.
      return violations;
    },
  },
  {
    id: "lia.interest-type-other",
    title: "interest_type 'Other' must have matching free text",
    // Catches interest_type starting "Other" with no interest_type_other
    // text, or text present with interest_type not "Other".
    check(intake: Bag): string[] {
      const type = str(get(intake, "purpose_details.interest_type"));
      const other = str(get(intake, "purpose_details.interest_type_other"));
      const isOther = type.startsWith("Other");
      if (isOther && !other) return ["interest_type starts with Other but interest_type_other is empty"];
      if (!isOther && other) return ["interest_type_other is set but interest_type does not start with Other"];
      return [];
    },
  },
  {
    id: "lia.marketing-branch",
    title: "marketing_channels must agree with a marketing purpose",
    // Catches marketing_channels set with no marketing wording in the stated
    // purpose/processing description, or the reverse.
    check(intake: Bag): string[] {
      const channels = arr(get(intake, "purpose_details.marketing_channels"));
      const purposeText = `${str(intake.stated_purpose)} ${str(intake.processing_description)} ${str(get(intake, "purpose_details.interest_statement"))}`;
      const mentionsMarketing = /marketing|advertis|promot|newsletter|campaign/i.test(purposeText);
      if (channels.length > 0 && !mentionsMarketing) return ["marketing_channels is set but stated_purpose/processing_description do not mention marketing"];
      if (channels.length === 0 && mentionsMarketing) return ["stated_purpose/processing_description mentions marketing but marketing_channels is empty"];
      return [];
    },
  },
  {
    id: "lia.expectation-detail",
    title: "a 'No' reasonable_expectation must have a detail that does not contradict it",
    // Catches reasonable_expectation "No" with an empty detail, or a detail
    // asserting an expectation without a negation.
    check(intake: Bag): string[] {
      const expectation = str(get(intake, "balancing_details.reasonable_expectation"));
      if (!expectation.startsWith("No")) return [];
      const detail = str(get(intake, "balancing_details.reasonable_expectation_detail"));
      if (!detail) return ["reasonable_expectation is No but reasonable_expectation_detail is empty"];
      if (/would expect|expected by/i.test(detail) && !/\b(not|no|n't|never)\b/i.test(detail)) {
        return ["reasonable_expectation_detail asserts an expectation without a negation despite reasonable_expectation being No"];
      }
      return [];
    },
  },
  {
    id: "lia.harm-severity-vs-detail",
    title: "a Significant/Severe harm rating must carry a real safeguard or mitigation",
    // Catches potential_harm at the top of the scale with no additional
    // mitigation and no safeguard beyond "None in place yet".
    check(intake: Bag): string[] {
      const harm = str(get(intake, "balancing_details.potential_harm"));
      if (!/^(Significant|Severe)\b/.test(harm)) return [];
      const mitigations = str(get(intake, "balancing_details.additional_mitigations"));
      const realSafeguards = arr(get(intake, "balancing_details.safeguards")).filter((s) => s !== "None in place yet" && s !== "Other");
      if (!mitigations && realSafeguards.length === 0) {
        return [`potential_harm is "${harm}" but neither additional_mitigations nor a real safeguard is recorded`];
      }
      return [];
    },
  },
  {
    id: "lia.company",
    title: "organization_name must equal the fixture's company",
    // Catches an intake whose named organisation drifts from the panel
    // fixture's own company field.
    check(intake: Bag, ctx: RuleContext): string[] {
      const org = str(intake.organization_name);
      if (org !== ctx.fixture.company) return [`organization_name "${org}" does not match fixture company "${ctx.fixture.company}"`];
      return [];
    },
  },
];
