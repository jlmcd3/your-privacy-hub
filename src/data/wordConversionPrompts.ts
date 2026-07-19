// WORD-PROMPTS-1 — curated conversion prompts per document type.
//
// Word (.docx) is NOT a product deliverable. Each downloadable document type
// ships a copy-and-paste prompt the subscriber runs in their own AI tool to
// convert the PDF we produced into a Word file. Formatting fidelity and
// citation integrity of the converted file are the user's to verify.
//
// Every entry MUST retain these guardrails — the test suite locks them:
//   - VERBATIM preservation of clauses, numbering, headings, defined terms,
//     citations. No paraphrase, no renumbering, no "improvements".
//   - [EXTRACTION GAP] marker for anything the AI cannot cleanly extract.
//   - Explicit Word-style requirements (Heading 1–3, numbered lists, tables).
//   - Self-check list at the end enumerating omissions and gaps.
//   - No added content, commentary, or legal advice.
//   - Do not paste client-confidential material beyond the document itself.
//
// `structureAnchors` are literal section labels the prompt must reference.
// If a document's underlying structure changes, the anchor list has to move
// with it — which trips the staleness test and forces a review.

export type WordPromptDocumentType =
  | "dpa_generator"
  | "ir_playbook"
  | "dpia_framework"
  | "li_assessment"
  | "governance_assessment"
  | "biometric_checker"
  | "cppa_risk"
  | "cppa_cybersecurity"
  | "cppa_admt"
  | "cppa_scope"
  | "cppa_suite"
  | "registration_assessment"
  | "registration_document"
  | "ropa_document"
  | "us_notice"
  | "eu_notice";

export interface WordPromptEntry {
  documentType: WordPromptDocumentType;
  label: string;
  /** Anchors the prompt body MUST literally reference. Staleness guard. */
  structureAnchors: string[];
  /** The prompt the subscriber pastes into their own AI tool. */
  prompt: string;
}

// -----------------------------------------------------------------------------
// Shared blocks (kept as literals inside each prompt so the content tests can
// scan the compiled body — do not remove any of these sentences).
// -----------------------------------------------------------------------------

const VERBATIM_RULE =
  "Preserve ALL clause numbering, section numbering, heading hierarchy, defined terms, and citations VERBATIM. Do not paraphrase, renumber, reorder, summarise, or otherwise 'improve' the legal text.";

const GAP_RULE =
  "If any text cannot be extracted cleanly from the source PDF (illegible, cut off, ambiguous table cell, unclear footnote target, etc.), insert the literal marker [EXTRACTION GAP] at that position rather than guessing.";

const STYLE_RULE =
  "Produce a Microsoft Word document using proper Word styles: Heading 1 for top-level sections, Heading 2 for sub-sections, Heading 3 for deeper sub-sections, native numbered/bulleted lists (not manual '1.' prefixes), and native Word tables wherever the source has tables.";

const SELF_CHECK_RULE =
  "End the output with a section titled 'Self-check' that lists (a) every [EXTRACTION GAP] you inserted with its location, (b) any tables you could not reconstruct, (c) any citations you were unable to read cleanly, and (d) any headings you had to infer.";

const NO_ADDITIONS_RULE =
  "Do not add content, commentary, editorial notes, or legal advice. Do not resolve ambiguities. Do not merge or split sections.";

const NO_CONFIDENTIAL_RULE =
  "Work only from the attached document. Do not request or paste any additional client-confidential material.";

function buildPrompt(intro: string, anchors: string[], closing?: string): string {
  return [
    intro.trim(),
    "",
    "RULES (all mandatory):",
    `1. ${VERBATIM_RULE}`,
    `2. ${GAP_RULE}`,
    `3. ${STYLE_RULE}`,
    `4. ${NO_ADDITIONS_RULE}`,
    `5. ${NO_CONFIDENTIAL_RULE}`,
    "",
    "Expected structural anchors (these labels appear in the source — keep them exact):",
    ...anchors.map((a) => `  • ${a}`),
    "",
    closing ? closing.trim() + "\n" : "",
    SELF_CHECK_RULE,
  ]
    .filter(Boolean)
    .join("\n");
}

// -----------------------------------------------------------------------------
// Entries
// -----------------------------------------------------------------------------

export const WORD_CONVERSION_PROMPTS: Record<WordPromptDocumentType, WordPromptEntry> = {
  dpa_generator: {
    documentType: "dpa_generator",
    label: "Data Processing Agreement",
    structureAnchors: [
      "Definitions",
      "Subject-matter and duration",
      "Nature and purpose of processing",
      "Sub-processors",
      "Schedule 1",
      "Schedule 2",
      "Schedule 3",
      "NOTE FOR LEGAL REVIEW",
    ],
    prompt: buildPrompt(
      "Convert the attached Data Processing Agreement PDF into a Microsoft Word (.docx) file suitable for legal review. This is a contract — treat every clause as load-bearing.",
      [
        "Definitions",
        "Subject-matter and duration",
        "Nature and purpose of processing",
        "Sub-processors",
        "Schedule 1",
        "Schedule 2",
        "Schedule 3",
        "NOTE FOR LEGAL REVIEW",
      ],
      "Recreate every Schedule as a Word table where the PDF uses a table. Keep any 'NOTE FOR LEGAL REVIEW' blocks exactly as written — they are drafter annotations, not commentary you should remove.",
    ),
  },

  ir_playbook: {
    documentType: "ir_playbook",
    label: "Incident Response Playbook",
    structureAnchors: [
      "Section 1",
      "Section 2",
      "Section 3",
      "Section 4",
      "Section 5",
      "Section 6",
      "Section 7",
      "Notification timelines",
    ],
    prompt: buildPrompt(
      "Convert the attached Incident Response Playbook PDF into a Microsoft Word (.docx) file. Preserve the operational structure so the playbook remains usable during a live incident.",
      [
        "Section 1",
        "Section 2",
        "Section 3",
        "Section 4",
        "Section 5",
        "Section 6",
        "Section 7",
        "Notification timelines",
      ],
      "Regulator names, statute references, and notification deadlines must be VERBATIM. Reconstruct notification-timeline tables as native Word tables with the same columns.",
    ),
  },

  dpia_framework: {
    documentType: "dpia_framework",
    label: "DPIA Framework",
    structureAnchors: [
      "Processing description",
      "Necessity and proportionality",
      "Risks to rights and freedoms",
      "Mitigating measures",
      "Consultation",
      "Supervisory authority",
    ],
    prompt: buildPrompt(
      "Convert the attached Data Protection Impact Assessment PDF into a Microsoft Word (.docx) file suitable for filing and internal review under Article 35 GDPR.",
      [
        "Processing description",
        "Necessity and proportionality",
        "Risks to rights and freedoms",
        "Mitigating measures",
        "Consultation",
        "Supervisory authority",
      ],
      "Preserve every named supervisory authority, legal basis reference, and Article citation VERBATIM. Risk matrices must be reconstructed as native Word tables.",
    ),
  },

  li_assessment: {
    documentType: "li_assessment",
    label: "Legitimate Interests Assessment",
    structureAnchors: [
      "Purpose test",
      "Necessity test",
      "Balancing test",
      "Safeguards",
      "Outcome",
    ],
    prompt: buildPrompt(
      "Convert the attached Legitimate Interests Assessment PDF into a Microsoft Word (.docx) file suitable for Article 6(1)(f) GDPR record-keeping.",
      ["Purpose test", "Necessity test", "Balancing test", "Safeguards", "Outcome"],
      "Preserve the three-part-test structure exactly. Do not collapse the Purpose, Necessity, and Balancing tests into a single narrative.",
    ),
  },

  governance_assessment: {
    documentType: "governance_assessment",
    label: "Governance Assessment",
    structureAnchors: [
      "Executive summary",
      "Findings",
      "Recommendations",
      "Framework mapping",
    ],
    prompt: buildPrompt(
      "Convert the attached Governance Assessment PDF into a Microsoft Word (.docx) file for board or steering-committee review.",
      ["Executive summary", "Findings", "Recommendations", "Framework mapping"],
      "Framework mappings (e.g., NIST, ISO, GDPR articles) must be reconstructed as native Word tables. Preserve every framework reference VERBATIM.",
    ),
  },

  biometric_checker: {
    documentType: "biometric_checker",
    label: "Biometric Privacy Checker",
    structureAnchors: [
      "Determination",
      "Applicable statutes",
      "Obligations",
      "Consent standard",
    ],
    prompt: buildPrompt(
      "Convert the attached Biometric Privacy determination PDF into a Microsoft Word (.docx) file. This is a jurisdictional-scope determination — statute names and consent standards must not shift.",
      ["Determination", "Applicable statutes", "Obligations", "Consent standard"],
      "Preserve every statute citation (e.g., BIPA, CUBI, MyHealthMyData) VERBATIM including section numbers.",
    ),
  },

  cppa_risk: {
    documentType: "cppa_risk",
    label: "CPPA Risk Assessment",
    structureAnchors: [
      "Applicability",
      "Exception analysis",
      "Processing purposes",
      "Safeguards",
      "Retention",
      "Cal. Civ. Code § 1798",
      "11 CCR § 7150",
    ],
    prompt: buildPrompt(
      "Convert the attached CPPA Risk Assessment PDF into a Microsoft Word (.docx) file. This document is written in an advocate-drafter voice — do not soften or rephrase the legal characterisations.",
      [
        "Applicability",
        "Exception analysis",
        "Processing purposes",
        "Safeguards",
        "Retention",
        "Cal. Civ. Code § 1798",
        "11 CCR § 7150",
      ],
      "California Civil Code and 11 CCR citations must be VERBATIM including the pinpoint (subsection letters and numerals). Do not normalise § to 'Section' or vice versa.",
    ),
  },

  cppa_cybersecurity: {
    documentType: "cppa_cybersecurity",
    label: "CPPA Cybersecurity Audit",
    structureAnchors: [
      "Scope",
      "Independent auditor",
      "Audit components",
      "11 CCR § 7120",
      "11 CCR § 7121",
      "Deadlines",
    ],
    prompt: buildPrompt(
      "Convert the attached CPPA Cybersecurity Audit PDF into a Microsoft Word (.docx) file. Section 7120 / 7121 references and phased deadlines are outcome-determinative — treat them as VERBATIM.",
      [
        "Scope",
        "Independent auditor",
        "Audit components",
        "11 CCR § 7120",
        "11 CCR § 7121",
        "Deadlines",
      ],
      "Phased deadline tables must be reconstructed as native Word tables with the same columns and dates.",
    ),
  },

  cppa_admt: {
    documentType: "cppa_admt",
    label: "CPPA ADMT Assessment",
    structureAnchors: [
      "Significant decision",
      "Pre-use notice",
      "Opt-out",
      "Access rights",
      "11 CCR § 7200",
    ],
    prompt: buildPrompt(
      "Convert the attached CPPA Automated Decisionmaking Technology (ADMT) assessment PDF into a Microsoft Word (.docx) file.",
      [
        "Significant decision",
        "Pre-use notice",
        "Opt-out",
        "Access rights",
        "11 CCR § 7200",
      ],
      "Preserve every 11 CCR § 7200-series citation VERBATIM including subsections.",
    ),
  },

  cppa_scope: {
    documentType: "cppa_scope",
    label: "CPPA Scope Checker",
    structureAnchors: [
      "In-scope determination",
      "Revenue threshold",
      "Processing thresholds",
      "Sale/share prong",
      "Data broker",
      "Cal. Civ. Code § 1798.140",
    ],
    prompt: buildPrompt(
      "Convert the attached CPPA Scope Checker result PDF into a Microsoft Word (.docx) file suitable for counsel review of applicability.",
      [
        "In-scope determination",
        "Revenue threshold",
        "Processing thresholds",
        "Sale/share prong",
        "Data broker",
        "Cal. Civ. Code § 1798.140",
      ],
      "Preserve the CPI-adjusted revenue figure and the sale/share and processing thresholds VERBATIM.",
    ),
  },

  cppa_suite: {
    documentType: "cppa_suite",
    label: "CPPA Combined Suite",
    structureAnchors: [
      "Risk Assessment",
      "Cybersecurity Audit",
      "11 CCR § 7120",
      "11 CCR § 7150",
    ],
    prompt: buildPrompt(
      "Convert the attached combined CPPA Suite PDF (Risk Assessment + Cybersecurity Audit) into a single Microsoft Word (.docx) file. Preserve the two-part structure — do not merge findings from the two instruments.",
      [
        "Risk Assessment",
        "Cybersecurity Audit",
        "11 CCR § 7120",
        "11 CCR § 7150",
      ],
    ),
  },

  registration_assessment: {
    documentType: "registration_assessment",
    label: "Registration Assessment",
    structureAnchors: [
      "Registration jurisdictions",
      "Applicable regime",
      "Filing obligations",
      "Fees",
      "Deadlines",
    ],
    prompt: buildPrompt(
      "Convert the attached Registration Assessment PDF into a Microsoft Word (.docx) file.",
      [
        "Registration jurisdictions",
        "Applicable regime",
        "Filing obligations",
        "Fees",
        "Deadlines",
      ],
      "Jurisdiction names, statute citations, filing fees, and deadlines must be VERBATIM. Fee/deadline tables must be reconstructed as native Word tables.",
    ),
  },

  registration_document: {
    documentType: "registration_document",
    label: "Registration Filing Document",
    structureAnchors: [
      "Registrant details",
      "Contact",
      "Categories of personal information",
      "Attestation",
    ],
    prompt: buildPrompt(
      "Convert the attached Registration Filing document PDF into a Microsoft Word (.docx) file suitable for submission preparation.",
      [
        "Registrant details",
        "Contact",
        "Categories of personal information",
        "Attestation",
      ],
      "Do not alter registrant details, attestation wording, or category enumerations.",
    ),
  },

  ropa_document: {
    documentType: "ropa_document",
    label: "Records of Processing Activities (RoPA)",
    structureAnchors: [
      "Controller",
      "Processing activities",
      "Categories of data subjects",
      "Categories of personal data",
      "Recipients",
      "International transfers",
      "Retention",
      "Security measures",
    ],
    prompt: buildPrompt(
      "Convert the attached RoPA PDF into a Microsoft Word (.docx) file suitable for Article 30 GDPR record-keeping.",
      [
        "Controller",
        "Processing activities",
        "Categories of data subjects",
        "Categories of personal data",
        "Recipients",
        "International transfers",
        "Retention",
        "Security measures",
      ],
      "The RoPA is inherently tabular — reconstruct the per-activity register as a native Word table with the same columns as the source.",
    ),
  },

  us_notice: {
    documentType: "us_notice",
    label: "US Privacy Notice",
    structureAnchors: [
      "Categories collected",
      "Sources",
      "Business or commercial purposes",
      "Categories disclosed",
      "Consumer rights",
      "Effective date",
    ],
    prompt: buildPrompt(
      "Convert the attached US state privacy notice PDF into a Microsoft Word (.docx) file. This is a public-facing consumer notice — every disclosure category and rights statement is regulatory copy.",
      [
        "Categories collected",
        "Sources",
        "Business or commercial purposes",
        "Categories disclosed",
        "Consumer rights",
        "Effective date",
      ],
      "State names, statute citations, and rights-request contact channels must be VERBATIM.",
    ),
  },

  eu_notice: {
    documentType: "eu_notice",
    label: "EU/UK Privacy Notice",
    structureAnchors: [
      "Controller identity",
      "Purposes of processing",
      "Legal bases",
      "Recipients",
      "International transfers",
      "Retention",
      "Data subject rights",
      "Supervisory authority",
    ],
    prompt: buildPrompt(
      "Convert the attached EU/UK privacy notice PDF into a Microsoft Word (.docx) file. This is an Article 13/14 GDPR (or UK GDPR) notice — every information item is regulatory.",
      [
        "Controller identity",
        "Purposes of processing",
        "Legal bases",
        "Recipients",
        "International transfers",
        "Retention",
        "Data subject rights",
        "Supervisory authority",
      ],
      "Article 6 / Article 9 legal-basis citations and the named supervisory authority must be VERBATIM.",
    ),
  },
};

export function getWordConversionPrompt(
  documentType: WordPromptDocumentType,
): WordPromptEntry {
  const entry = WORD_CONVERSION_PROMPTS[documentType];
  if (!entry) {
    throw new Error(`No Word conversion prompt for document type: ${documentType}`);
  }
  return entry;
}

/** Legal-ruling notice shown alongside every prompt. */
export const WORD_PROMPT_DISCLAIMER =
  "Conversion happens in your own AI tool, outside our control. Formatting fidelity and citation integrity of the converted file are yours to verify. Verify citations after conversion.";
