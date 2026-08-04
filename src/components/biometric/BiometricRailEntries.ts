// COACHING CONTENT RULE — coaching describes the SHAPE of a complete answer
// (dimensions, specificity, separateness). It NEVER describes the CONTENT of a
// compliant answer (what facts satisfy the law, what answer "passes").
// goodAnswer examples are clearly fictional and illustrate FORM, never a template.
// Voice: imperative, active, plain subject-verb-object, one idea per sentence,
// specific over vague, no ornamental legalese. Layered: coachLead = one line an
// expert acts on instantly; goodAnswer/commonMistake = the expansion for newer users.
//
// ENUMERATED-FIELD ADDENDUM — for selects, radios, and pills, coaching explains
// WHAT FACTS DETERMINE the accurate choice and WHAT EVIDENCE to check. It never
// recommends an option, never suggests claiming an exemption, and never implies
// which selection is favourable. goodAnswer shows a FICTIONAL determination —
// facts mapped to a selection — illustrating method, not a preferred outcome.

// src/components/biometric/BiometricRailEntries.ts
// StatuteRail entries for the Biometric Privacy Compliance Assessment.
// Citations: 740 ILCS 14/ (BIPA), Tex. Bus. & Com. Code § 503.001 (CUBI),
// Wash. Rev. Code 19.373 / RCW 71.05 (Wash. biometric + MHMD), GDPR Arts. 4(14) & 9.

import type { RailEntry } from "@/components/intake/StatuteRail";

const BIPA_URL = "https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004";
const CUBI_URL = "https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm";
const WASH_BIO_URL = "https://app.leg.wa.gov/RCW/default.aspx?cite=19.375";
const MHMD_URL = "https://app.leg.wa.gov/RCW/default.aspx?cite=19.373";
const GDPR_URL = "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679";

export const BIOMETRIC_RAIL: Record<string, RailEntry> = {
  types: {
    fieldLabel: "Biometric data types",
    citation: "740 ILCS 14/10 · GDPR Art. 4(14)",
    citationUrl: BIPA_URL,
    plainSummary:
      "BIPA defines a 'biometric identifier' as a retina or iris scan, fingerprint, voiceprint, or scan of hand or face geometry — photographs and demographic data are explicitly excluded. The GDPR's Article 4(14) definition is broader, capturing any 'specific technical processing' of physical, physiological, or behavioural characteristics that allows or confirms unique identification.",
    regulationText:
      '"Biometric identifier" means a retina or iris scan, fingerprint, voiceprint, or scan of hand or face geometry. Biometric identifiers do not include writing samples, written signatures, photographs, human biological samples used for valid scientific testing or screening, demographic data, tattoo descriptions, or physical descriptions such as height, weight, hair color, or eye color.',
    enforcementNote:
      "Illinois courts have construed BIPA's 'scan of face geometry' broadly enough to cover facial-recognition-derived templates extracted from uploaded photographs (Rosenbach, Cothron). Facebook (Meta) and TikTok have each settled BIPA class actions for north of $650M each.",
    coachLead: "Select what the system captures and computes — templates count.",
    coachBody: "BIPA's list is specific: retina or iris, fingerprint, voiceprint, hand and face geometry. Templates computed from them are covered too. Read the vendor's technical docs, not the product name.",
    goodAnswer: "A 'photo-based clock-in' product computes face-geometry templates. The template itself is the biometric identifier, whether or not the source photographs are kept.",
    commonMistake: "Treating template systems as 'not biometric' because raw images are deleted. The template is the regulated identifier.",
  },

  orgName: {
    fieldLabel: "Organisation name (header only)",
    citation: "BIPA § 15(a)",
    citationUrl: BIPA_URL,
    plainSummary:
      "The organisation name is used only in the report header. BIPA § 15(a) requires every private entity in possession of biometric identifiers to maintain a publicly-available written retention-and-destruction policy naming the entity responsible — using the correct legal entity name in your policy is mandatory.",
    regulationText:
      "A private entity in possession of biometric identifiers or biometric information must develop a written policy, made available to the public, establishing a retention schedule and guidelines for permanently destroying biometric identifiers and biometric information when the initial purpose for collecting or obtaining such identifiers or information has been satisfied or within 3 years of the individual's last interaction with the private entity, whichever occurs first.",
    coachLead: "Use the legal entity that runs the biometric system.",
    coachBody: "This name heads the report and frames whose duties are assessed. Use the operating entity — not a brand, not the parent.",
    goodAnswer: "'Acme Staffing LLC', the employer running the timeclock — not 'Acme Group', the holding company.",
    commonMistake: "Entering the vendor's name. The assessment is about the collecting organisation's duties, not the vendor's.",
  },

  orgType: {
    fieldLabel: "Organisation type",
    citation: "740 ILCS 14/10 · GDPR Art. 9(2)(b)",
    citationUrl: BIPA_URL,
    plainSummary:
      "Organisation type shapes which legal bases are realistically available. Employers face BIPA's strictest consent regime (Illinois courts have rejected the 'workplace exception' arguments) and can rely on GDPR Art. 9(2)(b) only with a specific employment-law authorisation. Healthcare providers benefit from the BIPA HIPAA-information exemption but only for PHI in transit.",
    regulationText:
      'BIPA does not apply to "information captured from a patient in a health care setting or information collected, used, or stored for health care treatment, payment, or operations under the Health Insurance Portability and Accountability Act of 1996."',
    enforcementNote:
      "The 'health care setting' exemption is read narrowly: vendor-provided fingerprint timeclocks used by hospital staff have been held outside the exemption because the data was collected for workforce management, not treatment (Marquez v. Weinstein Funeral Home; Heard v. Becton).",
    coachLead: "Pick the type that matches your relationship to the people enrolled.",
    coachBody: "Employees, customers, and the public each change which legal bases and consent mechanics are realistic. The report calibrates on this.",
    goodAnswer: "A gym with fingerprint entry for members selects consumer-facing, even though staff also enrol. The main population drives the analysis; staff get noted separately.",
    commonMistake: "Selecting by industry instead of by relationship to the data subjects.",
  },

  purpose: {
    fieldLabel: "Primary purpose",
    citation: "BIPA § 15(b)(1) · GDPR Art. 5(1)(b)",
    citationUrl: BIPA_URL,
    plainSummary:
      "BIPA § 15(b)(1) requires the purpose of collection to be disclosed in writing before collection — and that purpose binds the entity. Subsequent reuse for an incompatible purpose violates both BIPA's purpose-specification requirement and GDPR's Article 5(1)(b) purpose-limitation principle. 'Surveillance / monitoring' purposes face the highest scrutiny.",
    regulationText:
      "No private entity may collect, capture, purchase, receive through trade, or otherwise obtain a person's or a customer's biometric identifier or biometric information, unless it first: (1) informs the subject or the subject's legally authorized representative in writing that a biometric identifier or biometric information is being collected or stored; (2) informs the subject or the subject's legally authorized representative in writing of the specific purpose and length of term for which a biometric identifier or biometric information is being collected, stored, and used; and (3) receives a written release executed by the subject of the biometric identifier or biometric information or the subject's legally authorized representative.",
    coachLead: "Choose the purpose your disclosure and consent will actually name.",
    coachBody: "BIPA requires the specific purpose to be disclosed before collection. Match the option to what people will be told. Any second use is a new purpose and needs its own disclosure.",
    goodAnswer: "A warehouse selects timekeeping — prints are used for clock-in only. When a security use is added later, that is a new purpose and a fresh disclosure.",
    commonMistake: "Selecting the broadest option to cover everything. Undisclosed second purposes are the classic BIPA claim.",
  },

  jurisdictions: {
    fieldLabel: "Jurisdictions",
    citation: "BIPA § 20 · CUBI § 503.001 · Wash. RCW 19.375 · GDPR Art. 9",
    citationUrl: GDPR_URL,
    plainSummary:
      "Each biometric statute has its own consent, retention, and enforcement regime. BIPA carries a private right of action ($1,000 negligent / $5,000 intentional, per violation). CUBI is AG-enforced only. Washington's biometric statute is AG-enforced; if the data is also used to infer health, Washington's MHMD imposes a separate consent regime and its own private right of action via the CPA. GDPR Art. 9 treats biometric data used for unique identification as a special category requiring an Art. 9(2) condition.",
    regulationText:
      "Any person aggrieved by a violation of this Act shall have a right of action in a State circuit court or as a supplemental claim in federal district court against an offending party. A prevailing party may recover for each violation: (1) against a private entity that negligently violates a provision of this Act, liquidated damages of $1,000 or actual damages, whichever is greater; (2) against a private entity that intentionally or recklessly violates a provision of this Act, liquidated damages of $5,000 or actual damages, whichever is greater… (3) reasonable attorneys' fees and costs… (4) other relief, including an injunction, as the State or federal court may deem appropriate.",
    enforcementNote:
      "BIPA's per-violation calculation (Cothron v. White Castle, 2023) means a single employee fingerprinted 100 times can ground 100 separate statutory damages claims — the underlying driver of $650M+ BIPA settlements. Washington's MHMD enforcement began March 31, 2024.",
    coachLead: "Select where the enrolled people are — not where the company sits.",
    coachBody: "Each biometric law protects its own residents. Include every state or region with enrolled individuals, remote workers included.",
    goodAnswer: "A Texas company has 12 Illinois remote employees on the biometric timeclock. It selects Illinois too — BIPA follows the Illinois individuals.",
    commonMistake: "Selecting only headquarters. BIPA claims attach per Illinois individual, wherever the employer is based.",
  },

};
