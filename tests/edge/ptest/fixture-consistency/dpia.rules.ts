// FIXTURE CONSISTENCY — dpia.* rules for src/lib/ptestPanels/dpia.ts fixtures.
// Each rule is a pure function of the intake (plus ctx.reportDate); fields
// verified against supabase/functions/_shared/intake-contracts/dpia-framework.ts.

import type { Bag, FixtureRule } from "./framework.ts";
import { str, arr, firstInt, parseIsoDate } from "./framework.ts";

// Common non-EEA/non-UK country names/abbreviations a "No transfer" record
// must not mention in its processor narrative. Kept short and defensive;
// word-boundary matched so "US" does not hit inside another word.
const NON_EEA_TERMS = [
  "United States", "USA", "US", "India", "China", "Russia", "Brazil",
  "Japan", "Australia", "Canada", "Singapore", "Mexico", "South Africa",
];

function findNonEeaTerm(text: string): string | null {
  for (const term of NON_EEA_TERMS) {
    if (new RegExp(`\\b${term}\\b`, "i").test(text)) return term;
  }
  return null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December",
];

// Last calendar day of a given 1-based month/year.
function monthEnd(monthIndex0: number, year: number): Date {
  return new Date(year, monthIndex0 + 1, 0);
}

function firstWords(phrase: string, n: number): string {
  return phrase.trim().toLowerCase().split(/\s+/).slice(0, n).join(" ");
}

export const DPIA_RULES: readonly FixtureRule[] = [
  {
    id: "dpia.transfer-presence",
    title: "transfer_presence must agree with transfer_flows and the processor narrative",
    // Catches a stated "no cross-border transfer" contradicted by populated
    // transfer_flows rows, a "Yes" answer with zero rows, or a non-EEA/UK
    // country named in the processor narrative despite a "No" answer.
    check(intake: Bag): string[] {
      const presence = str(intake.transfer_presence);
      const flows = Array.isArray(intake.transfer_flows) ? intake.transfer_flows as unknown[] : [];
      const violations: string[] = [];
      if (presence.startsWith("No") && flows.length > 0) {
        violations.push(`transfer_presence is "No" but transfer_flows has ${flows.length} row(s)`);
      }
      if (presence.startsWith("Yes") && flows.length === 0) {
        violations.push('transfer_presence is "Yes" but transfer_flows is empty');
      }
      if (presence.startsWith("No")) {
        const narrative = `${str(intake.processor_obligations)} ${arr(intake.third_party_processors).join(" ")}`;
        const term = findNonEeaTerm(narrative);
        if (term) violations.push(`transfer_presence is "No" but the processor narrative mentions "${term}"`);
      }
      return violations;
    },
  },
  {
    id: "dpia.processors-are-processors",
    title: "third_party_processors entries must be processors, not independent controllers",
    // Catches an independent controller (credit bureau, bank, authority,
    // regulator, insurer, court) mis-listed as a processor.
    check(intake: Bag): string[] {
      const re = /credit[- ]bureau|credit reference|bank\b|authority|regulator|insurer\b|court\b/i;
      const violations: string[] = [];
      for (const entry of arr(intake.third_party_processors)) {
        if (re.test(entry)) violations.push(`third_party_processors entry "${entry}" reads as an independent controller, not a processor`);
      }
      return violations;
    },
  },
  {
    id: "dpia.dates-order",
    title: "dpia_approval_date and estimated_end_date must not precede their reference dates",
    // Catches an approval date earlier than the review date it cites, and an
    // end date that is not later than the launch date.
    check(intake: Bag): string[] {
      const violations: string[] = [];
      const approval = parseIsoDate(str(intake.dpia_approval_date));
      const signoff = str(intake.dpia_signoff_basis);
      if (approval) {
        for (const m of signoff.matchAll(/\b(\d{4}-\d{2}-\d{2})\b/g)) {
          const reviewed = parseIsoDate(m[1]);
          if (reviewed && approval.getTime() < reviewed.getTime()) {
            violations.push(`dpia_approval_date ${str(intake.dpia_approval_date)} is earlier than the reviewed date ${m[1]} in dpia_signoff_basis`);
          }
        }
      }
      const launch = parseIsoDate(str(intake.estimated_launch_date));
      const end = parseIsoDate(str(intake.estimated_end_date));
      if (launch && end && end.getTime() <= launch.getTime()) {
        violations.push(`estimated_end_date ${str(intake.estimated_end_date)} is not later than estimated_launch_date ${str(intake.estimated_launch_date)}`);
      }
      return violations;
    },
  },
  {
    id: "dpia.narrative-periods",
    title: "narrative reporting periods must not run past the DPIA approval date",
    // Catches a "twelve months to <Month YYYY>" / "in the year to …" /
    // "as of …" / "Q[1-4] YYYY" phrase describing a period ending after the
    // DPIA was approved.
    check(intake: Bag): string[] {
      const approval = parseIsoDate(str(intake.dpia_approval_date));
      if (!approval) return [];
      const fields = ["nature_scope_context", "description", "functional_description", "residual_risks"];
      const monthPattern = MONTHS.join("|");
      const periodRe = new RegExp(
        `(?:twelve months to|in the year to|as of)\\s+(${monthPattern})\\s+(\\d{4})|\\bQ([1-4])\\s+(\\d{4})\\b`,
        "gi",
      );
      const violations: string[] = [];
      for (const field of fields) {
        const text = str(intake[field]);
        for (const m of text.matchAll(periodRe)) {
          let end: Date;
          if (m[1]) {
            end = monthEnd(MONTHS.findIndex((mo) => mo.toLowerCase() === m[1].toLowerCase()), Number(m[2]));
          } else {
            end = monthEnd(Number(m[3]) * 3 - 1, Number(m[4]));
          }
          if (end.getTime() > approval.getTime()) {
            violations.push(`${field} states a period ending ${m[0]}, after dpia_approval_date ${str(intake.dpia_approval_date)}`);
          }
        }
      }
      return violations;
    },
  },
  {
    id: "dpia.automated-nature",
    title: "automated_decision_nature must agree with the human-review narrative and reasons_to_conduct",
    // Catches "solely automated" contradicted by a human-review claim, "with
    // meaningful human review" unsupported by any reviewer mention, and "no
    // legal-effect decisions" contradicted by the Art. 22 reason being ticked.
    check(intake: Bag): string[] {
      const nature = str(intake.automated_decision_nature);
      if (!nature) return [];
      const fields = ["description", "nature_scope_context", "functional_description", "dp_by_design_measures"]
        .map((f) => str(intake[f])).join(" ");
      const violations: string[] = [];
      if (nature.startsWith("Solely automated")) {
        if (/human (review|check|approval) of (each|every|all) (decision|application|case)/i.test(fields)
          || /reviewed by a (human|person|underwriter) before/i.test(fields)) {
          violations.push("automated_decision_nature is solely automated but a narrative field claims per-case human review");
        }
      } else if (nature.startsWith("Automated processing with meaningful human review")) {
        if (!/review|underwriter|analyst|officer/i.test(fields)) {
          violations.push("automated_decision_nature claims meaningful human review but no narrative field mentions a reviewer");
        }
      } else if (nature.startsWith("No decisions with legal")) {
        if (arr(intake.reasons_to_conduct).includes("Automated decision-making with legal or significant effect")) {
          violations.push('automated_decision_nature says no legal-effect decisions but reasons_to_conduct includes the Art. 22 reason');
        }
      }
      return violations;
    },
  },
  {
    id: "dpia.special-categories",
    title: "special-category data_categories must have an article_9_condition",
    // Catches health/biometric/genetic/"special"-labelled data with no
    // Art. 9(2) condition recorded (verbatim SPECIAL_CATEGORY_CATS gate).
    check(intake: Bag): string[] {
      const cats = arr(intake.data_categories);
      const isSpecial = cats.some((c) =>
        c === "Health or medical data" || c === "Biometric data" || c === "Genetic data" || /special/i.test(c));
      if (!isSpecial) return [];
      const condition = str(intake.article_9_condition);
      return condition ? [] : ["data_categories includes a special category but article_9_condition is empty"];
    },
  },
  {
    id: "dpia.measures-vs-description",
    title: "measures claimed as excluded must not be described as used elsewhere",
    // Catches "excludes X" / "does not use X" / "X are not used" in the
    // measures fields where X (its first three words) reappears in
    // description/functional_description without a surrounding negation.
    check(intake: Bag): string[] {
      const sources = [str(intake.dp_by_design_measures), str(intake.data_minimisation_justification)];
      const target = `${str(intake.description)} ${str(intake.functional_description)}`.toLowerCase();
      const patterns = [/\bexcludes\s+([a-z0-9][^.;]*?)(?=[.;]|$)/gi, /\bdoes not use\s+([a-z0-9][^.;]*?)(?=[.;]|$)/gi,
        /\b([a-z0-9][^.;]*?)\s+(?:is|are)\s+not\s+used\b/gi];
      const violations: string[] = [];
      for (const src of sources) {
        if (!src) continue;
        for (const pattern of patterns) {
          for (const m of src.matchAll(pattern)) {
            const phrase = firstWords(m[1], 3);
            if (phrase.length < 4) continue;
            const idx = target.indexOf(phrase);
            if (idx === -1) continue;
            const before = target.slice(Math.max(0, idx - 40), idx);
            if (!/\b(no|not|never|without|excludes|excluding)\b/i.test(before)) {
              violations.push(`"${phrase}" is described as excluded/unused but reappears in description/functional_description`);
            }
          }
        }
      }
      return violations;
    },
  },
  {
    id: "dpia.dpa-vs-processors",
    title: "DPA-signed safeguard and named processors must imply each other's supporting fields",
    // Catches "DPA signed with processor" ticked with no processor named,
    // and a named processor with no processor_obligations narrative.
    check(intake: Bag): string[] {
      const hasDpaSafeguard = arr(intake.existing_safeguards).includes("DPA signed with processor");
      const hasProcessors = arr(intake.third_party_processors).length > 0;
      const violations: string[] = [];
      if (hasDpaSafeguard && !hasProcessors) violations.push('existing_safeguards includes "DPA signed with processor" but third_party_processors is empty');
      if (hasProcessors && !str(intake.processor_obligations)) violations.push("third_party_processors is non-empty but processor_obligations is empty");
      return violations;
    },
  },
  {
    id: "dpia.views",
    title: "a declined data-subject consultation must record the reason",
    // Catches data_subjects_views_sought "No" with no explanatory reason.
    check(intake: Bag): string[] {
      const sought = str(intake.data_subjects_views_sought);
      if (!sought.startsWith("No")) return [];
      return str(intake.data_subjects_views) ? [] : ['data_subjects_views_sought is "No" but data_subjects_views is empty'];
    },
  },
  {
    id: "dpia.approval-fields",
    title: "a named approver must have a date and a title",
    // Catches dpia_approved_by_name set without dpia_approval_date or
    // dpia_approved_by_title.
    check(intake: Bag): string[] {
      if (!str(intake.dpia_approved_by_name)) return [];
      const violations: string[] = [];
      if (!str(intake.dpia_approval_date)) violations.push("dpia_approved_by_name is set but dpia_approval_date is empty");
      if (!str(intake.dpia_approved_by_title)) violations.push("dpia_approved_by_name is set but dpia_approved_by_title is empty");
      return violations;
    },
  },
  {
    id: "dpia.volume-consistency",
    title: "a monthly figure in volume_frequency must match nature_scope_context",
    // Catches two different monthly counts stated for the same processing.
    check(intake: Bag): string[] {
      const re = /([\d][\d,]*)\s*(?:[a-z-]+\s+){0,3}(?:per month|a month\b|monthly)/i;
      const volume = re.exec(str(intake.volume_frequency));
      const scope = re.exec(str(intake.nature_scope_context));
      if (!volume || !scope) return [];
      const a = firstInt(volume[1]);
      const b = firstInt(scope[1]);
      if (a !== null && b !== null && a !== b) {
        return [`volume_frequency states ${a} per month but nature_scope_context states ${b} per month`];
      }
      return [];
    },
  },
  {
    id: "dpia.team-roster",
    title: "every dpia_prepared_by name must appear in dpia_team",
    // Catches a preparer listed in dpia_prepared_by who is missing from the
    // dpia_team roster.
    check(intake: Bag): string[] {
      const preparedBy = str(intake.dpia_prepared_by);
      const team = str(intake.dpia_team);
      if (!preparedBy || !team) return [];
      const violations: string[] = [];
      for (const entry of preparedBy.split(";")) {
        const name = entry.trim().split(/\s+—\s+|\s+\(/)[0].trim();
        if (name && !team.includes(name)) violations.push(`"${name}" appears in dpia_prepared_by but not in dpia_team`);
      }
      return violations;
    },
  },
  {
    id: "dpia.retention-covers-categories",
    title: "retention_period must name every recorded data category",
    // doc 263 run 3 (2026-09-17, batch 3edc00df, DPIA D6) — a category selected in data_categories
    // must be nameable within retention_period (case-insensitive, on the
    // category label or one of its recognised synonyms — build.ts's
    // DATA_CATEGORY_RETENTION_KEYWORDS mirrors this list independently, so
    // the two files can drift without one importing the other, per this
    // fixture-consistency suite's own convention). "Other" is free-text and
    // is not checked — see the same carve-out in build.ts.
    check(intake: Bag): string[] {
      const retention = str(intake.retention_period);
      const categories = arr(intake.data_categories);
      if (!retention || categories.length === 0) return [];
      const keywords: Record<string, readonly string[]> = {
        "Contact details": ["contact detail", "contact information", "address", "phone", "email"],
        "Employee records": ["employee", "personnel", "hr record", "staff record"],
        "Customer records": ["customer", "client record"],
        "Health or medical data": ["health", "medical", "clinical"],
        "Financial data": ["financial", "payment", "billing", "bank"],
        "Biometric data": ["biometric", "fingerprint", "facial", "iris", "voiceprint", "template"],
        "Children's data": ["child", "pupil", "minor", "student"],
        "Location data": ["location", "gps", "geolocation"],
        "Communications content": ["communication", "message", "call recording"],
      };
      const lc = retention.toLowerCase();
      const violations: string[] = [];
      for (const category of categories) {
        if (/^other\b/i.test(category)) continue;
        const terms = keywords[category] ?? [category.toLowerCase()];
        if (!terms.some((t) => lc.includes(t))) {
          violations.push(`data_categories includes "${category}" but retention_period does not name it (or a recognised synonym)`);
        }
      }
      return violations;
    },
  },
];
