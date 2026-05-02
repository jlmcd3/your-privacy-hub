import type { Question } from "./types";
import { UNIVERSAL_EU_NOTICE_QUESTIONS } from "./universal-questions";
import {
  GDPR_ART13_QUESTIONS,
  UKGDPR_ADDITIONS,
  CHADP_ADDITIONS,
} from "./gdpr-questions";
import {
  LGPD_QUESTIONS,
  APPI_QUESTIONS,
  DPDPA_QUESTIONS,
  POPIA_QUESTIONS,
} from "./international-questions";
import type { EuFrameworkCode } from "./types";

export {
  UNIVERSAL_EU_NOTICE_QUESTIONS,
  GDPR_ART13_QUESTIONS,
  UKGDPR_ADDITIONS,
  CHADP_ADDITIONS,
  LGPD_QUESTIONS,
  APPI_QUESTIONS,
  DPDPA_QUESTIONS,
  POPIA_QUESTIONS,
};

export interface EuQuestionSection {
  key: string;
  label: string;
  questions: Question[];
}

/**
 * Build the ordered question sections for a given set of selected frameworks.
 * GDPR Art.13 questions are deduplicated across EU/UK/CH selections.
 */
export function buildEuQuestionSections(
  frameworks: EuFrameworkCode[],
): EuQuestionSection[] {
  const has = (code: EuFrameworkCode) => frameworks.includes(code);
  const sections: EuQuestionSection[] = [];

  // 1. Universal — always
  sections.push({
    key: "universal",
    label: "About your organisation",
    questions: UNIVERSAL_EU_NOTICE_QUESTIONS,
  });

  // 2. GDPR (single block, deduped)
  if (has("EU_GDPR") || has("UK_GDPR") || has("CH_FADP")) {
    const filtered = GDPR_ART13_QUESTIONS.filter((q) => {
      if (!q.jurisdictionOnly) return true;
      return q.jurisdictionOnly.some((j) => frameworks.includes(j as EuFrameworkCode));
    });
    sections.push({
      key: "gdpr",
      label: "GDPR Article 13 disclosures",
      questions: filtered,
    });
  }

  if (has("UK_GDPR")) {
    sections.push({ key: "uk", label: "UK GDPR additions", questions: UKGDPR_ADDITIONS });
  }
  if (has("CH_FADP")) {
    sections.push({ key: "ch", label: "Swiss FADP additions", questions: CHADP_ADDITIONS });
  }
  if (has("BR_LGPD")) {
    sections.push({ key: "lgpd", label: "Brazil LGPD", questions: LGPD_QUESTIONS });
  }
  if (has("JP_APPI")) {
    sections.push({ key: "appi", label: "Japan APPI", questions: APPI_QUESTIONS });
  }
  if (has("IN_DPDPA")) {
    sections.push({ key: "dpdpa", label: "India DPDPA", questions: DPDPA_QUESTIONS });
  }
  if (has("ZA_POPIA")) {
    sections.push({ key: "popia", label: "South Africa POPIA", questions: POPIA_QUESTIONS });
  }
  return sections;
}
