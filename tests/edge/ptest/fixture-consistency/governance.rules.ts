// FIXTURE CONSISTENCY — gov.* rules for src/lib/ptestPanels/governance.ts
// fixtures. Each rule is a pure function of the intake (plus ctx.reportDate);
// fields verified against
// supabase/functions/_shared/intake-contracts/governance-assessment.ts.

import type { Bag, FixtureRule, RuleContext } from "./framework.ts";
import { str, firstInt, parseIsoDate } from "./framework.ts";

// processor_count is "<N> — <vendor>, <vendor>, ...". Splits the vendor list
// after the em dash; used by gov.dpa-coverage and gov.transfer-routes.
function vendorNames(processorCount: string): string[] {
  const idx = processorCount.indexOf("—");
  if (idx === -1) return [];
  return processorCount.slice(idx + 1).split(",").map((s) => s.trim()).filter(Boolean);
}

// Narrative-only fields for gov.dpia below. Deliberately excludes the
// dpia_status enum itself, whose value ("Yes, ... DPIA ... completed")
// would otherwise trivially satisfy an /DPIA/i scan of the whole intake.
const NARRATIVE_FIELDS = [
  "additional_context", "processing_nature", "processing_scope",
  "processing_context", "processing_purposes", "sc_core_activity_explanation", "sc_data_volume",
];

export const GOVERNANCE_RULES: readonly FixtureRule[] = [
  {
    id: "gov.dpa-coverage",
    title: "dpa_status must match the counted uncovered vendors",
    // Catches "Yes, all vendors"/"Most"/"Some"/"No" claiming a coverage
    // fraction the processor_count/uncovered_vendors figures do not support.
    check(intake: Bag): string[] {
      const processorCount = str(intake.processor_count);
      const n = firstInt(processorCount);
      if (n === null) return [];
      const vendors = vendorNames(processorCount);
      const uncoveredText = str(intake.uncovered_vendors);
      // A vendor counts as uncovered when it is named in a clause that says so
      // ("no signed agreement", "not covered", "missing"); a clause that says a
      // vendor IS covered ("only X has been addressed") does not count it.
      let u = 0;
      if (uncoveredText) {
        // "X has no signed Art. 28 agreement on file; Y and Z are covered": a
        // clause with a negation counts its vendors as uncovered unless the clause
        // itself says they are covered/addressed/signed.
        const negative = /\b(no|not|never|missing|absent|uncovered|outstanding|without|lacks?|unsigned|pending)\b/i;
        const positive = /\b(are|is|has been|have been|were|was)\s+(covered|addressed|signed|in place|executed|verified)\b/i;
        const clauses = uncoveredText.split(/;|\.\s|\n/).map((s) => s.trim()).filter(Boolean);
        const named = new Set<string>();
        let negativeClauses = 0;
        for (const clause of clauses) {
          if (!negative.test(clause) || positive.test(clause)) continue;
          negativeClauses += 1;
          for (const v of vendors) if (clause.includes(v)) named.add(v);
        }
        u = named.size > 0 ? named.size : negativeClauses;
      }
      const status = str(intake.dpa_status);
      const violations: string[] = [];
      if (status === "Yes, all vendors" && u !== 0) violations.push(`dpa_status is "Yes, all vendors" but ${u} vendor(s) look uncovered`);
      if (status === "Most vendors" && !(u > 0 && u < n / 2)) violations.push(`dpa_status is "Most vendors" but uncovered count ${u} of ${n} is out of range`);
      if (status === "Some vendors" && !(u >= n / 2 && u < n && u >= 1)) violations.push(`dpa_status is "Some vendors" but uncovered count ${u} of ${n} is out of range`);
      if (status === "No" && u !== n) violations.push(`dpa_status is "No" but uncovered count ${u} does not equal processor_count ${n}`);
      return violations;
    },
  },
  {
    id: "gov.transfer-routes",
    title: "transfer_status must agree with transfer_mechanism, transfer_routes and processor_count",
    // Catches a "Yes" transfer status missing a mechanism or a
    // processor_count vendor absent from transfer_routes, and an "all tools
    // in EU/UK" status that still carries routes or a mechanism.
    check(intake: Bag): string[] {
      const status = str(intake.transfer_status);
      const mechanism = str(intake.transfer_mechanism);
      const routes = str(intake.transfer_routes);
      const violations: string[] = [];
      if (status.startsWith("Yes")) {
        if (!mechanism) violations.push("transfer_status starts with Yes but transfer_mechanism is empty");
        for (const v of vendorNames(str(intake.processor_count))) {
          if (!routes.includes(v)) violations.push(`vendor "${v}" from processor_count is missing from transfer_routes`);
        }
      } else if (status.startsWith("All tools store data in EU/UK")) {
        if (routes) violations.push("transfer_status says all tools store data in EU/UK but transfer_routes is non-empty");
        if (mechanism && mechanism !== "n/a") violations.push("transfer_status says all tools store data in EU/UK but transfer_mechanism is not empty/n-a");
      }
      return violations;
    },
  },
  {
    id: "gov.dpo-wording",
    title: "an informal/absent DPO must not be narrated as an existing DPO",
    // Catches a narrative field asserting a DPO exists ("the DPO advised…")
    // when dpo_status is informal or "No", allowing negated mentions
    // ("no DPO", "not a DPO", "informal").
    check(intake: Bag): string[] {
      const status = str(intake.dpo_status);
      if (!/informal/i.test(status) && !status.startsWith("No")) return [];
      const violations: string[] = [];
      const re = /\bDPO\b|data protection officer/gi;
      for (const field of NARRATIVE_FIELDS.concat(["remediation_default_owner"])) {
        const text = str(intake[field]);
        for (const m of text.matchAll(re)) {
          const before = text.slice(Math.max(0, m.index! - 60), m.index!);
          if (!/\b(no|not|informal|without|whether|formal|designat\w*|need\w*|require\w*|consider\w*|appoint\w*|absen\w*)\b/i.test(before)) {
            violations.push(`dpo_status is "${status}" but ${field} asserts a DPO: "…${before.trim()} ${m[0]}…"`);
          }
        }
      }
      return violations;
    },
  },
  {
    id: "gov.training",
    title: "training_status must agree with training_ai_coverage",
    // Catches "Yes" training with no AI-coverage answer, and "No" training
    // with an AI-coverage answer still set.
    check(intake: Bag): string[] {
      const status = str(intake.training_status);
      const coverage = str(intake.training_ai_coverage);
      const violations: string[] = [];
      if (status.startsWith("Yes") && !coverage) violations.push("training_status starts with Yes but training_ai_coverage is empty");
      if (status.startsWith("No") && coverage && coverage !== "n/a") violations.push("training_status starts with No but training_ai_coverage is set");
      return violations;
    },
  },
  {
    id: "gov.notice-vs-transfers",
    title: "a live cross-border transfer must not have an uncovering privacy notice",
    // Catches transfer_status "Yes" paired with privacy_notice_coverage
    // starting "No".
    check(intake: Bag): string[] {
      const status = str(intake.transfer_status);
      const notice = str(intake.privacy_notice_coverage);
      if (status.startsWith("Yes") && notice.startsWith("No")) {
        return [`transfer_status is "${status}" but privacy_notice_coverage starts with "No"`];
      }
      return [];
    },
  },
  {
    id: "gov.eu-uk-gate",
    title: "dpa_status must be 'n/a' exactly when eu_uk_data is not Yes",
    // Catches dpa_status answered while eu_uk_data isn't "Yes", or "n/a"
    // while eu_uk_data is "Yes" (the contract's own trigger for the field).
    check(intake: Bag): string[] {
      const euUk = str(intake.eu_uk_data);
      const dpaStatus = str(intake.dpa_status);
      const violations: string[] = [];
      if (dpaStatus === "n/a" && euUk === "Yes") violations.push('dpa_status is "n/a" but eu_uk_data is "Yes"');
      if (dpaStatus !== "n/a" && euUk !== "Yes") violations.push(`dpa_status is answered ("${dpaStatus}") but eu_uk_data is not "Yes"`);
      return violations;
    },
  },
  {
    id: "gov.company",
    title: "organization_name must equal the fixture's company",
    // Catches an intake whose named organisation drifts from the panel
    // fixture's own company field.
    check(intake: Bag, ctx: RuleContext): string[] {
      const org = str(intake.organization_name);
      if (org !== ctx.fixture.company) return [`organization_name "${org}" does not match fixture company "${ctx.fixture.company}"`];
      return [];
    },
  },
  {
    id: "gov.dates",
    title: "no *_date field may fall after the report date",
    // Catches a past-tense date field (review, approval, signoff) recorded
    // after ctx.reportDate; skips keys naming a target/next/renewal date.
    check(intake: Bag, ctx: RuleContext): string[] {
      const reportDate = parseIsoDate(ctx.reportDate);
      if (!reportDate) return [];
      const violations: string[] = [];
      for (const [key, value] of Object.entries(intake)) {
        if (!/_date$/i.test(key) || /target|next|renewal/i.test(key)) continue;
        const d = parseIsoDate(str(value));
        if (d && d.getTime() > reportDate.getTime()) {
          violations.push(`${key} ("${str(value)}") is after the report date ${ctx.reportDate}`);
        }
      }
      return violations;
    },
  },
];
