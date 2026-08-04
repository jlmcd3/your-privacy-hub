import type { Question, FlagCondition } from "./types";
import { JC } from "../jurisdiction-codes";

const RETENTION_FLAG: FlagCondition = {
  operator: "equals",
  value: "indefinitely",
  flagType: "retention_undefined",
  severity: "warning",
  message: "Indefinite retention is rarely defensible.",
  consequence:
    "Art. 5(1)(e) requires a defined retention period, and Art. 30(1)(f) asks for the envisaged erasure time limit. An entry reading 'indefinitely' is one of the most commonly cited register findings.",
};

const LAWFUL_BASIS_OPTIONS = [
  { value: "consent", label: "Consent", example: "Marketing emails the user opted in to" },
  { value: "contract", label: "Contract performance", example: "Order fulfilment, account management" },
  { value: "legal_obligation", label: "Legal obligation", example: "Tax records, AML checks" },
  { value: "legitimate_interests", label: "Legitimate interests", example: "Fraud prevention, internal analytics" },
  { value: "vital_interests", label: "Vital interests", example: "Emergency medical situations" },
  { value: "public_task", label: "Public task", example: "Statutory functions of a public body" },
];

const RETENTION_OPTIONS = [
  { value: "1y", label: "1 year" },
  { value: "3y", label: "3 years" },
  { value: "6y", label: "6 years" },
  { value: "7y", label: "7 years" },
  { value: "custom", label: "Custom" },
  { value: "indefinitely", label: "Indefinitely" },
];

// Art. 4(2) GDPR operations taxonomy. These are the operation names used by
// the CNIL Article 30 register model for the "processing operations" column.
const PROCESSING_OPERATION_OPTIONS = [
  { value: "collection", label: "Collection" },
  { value: "recording", label: "Recording" },
  { value: "organisation", label: "Organisation" },
  { value: "structuring", label: "Structuring" },
  { value: "storage", label: "Storage" },
  { value: "adaptation", label: "Adaptation or alteration" },
  { value: "retrieval", label: "Retrieval" },
  { value: "consultation", label: "Consultation" },
  { value: "use", label: "Use" },
  { value: "disclosure_transmission", label: "Disclosure by transmission" },
  { value: "dissemination", label: "Dissemination" },
  { value: "combination", label: "Combination" },
  { value: "restriction", label: "Restriction" },
  { value: "erasure", label: "Erasure or destruction" },
];


function baseSequence(opts: {
  lawfulBasisFlags?: FlagCondition[];
  extras?: Question[];
  staticInfoCard?: { title: string; body: string };
}): Question[] {
  const intro: Question[] = opts.staticInfoCard
    ? [
        {
          key: "info_card",
          text: opts.staticInfoCard.title,
          whyWeAsk: opts.staticInfoCard.body,
          type: "single_choice",
          options: [{ value: "ack", label: "I understand — continue" }],
          isRequired: true,
          staticInfoCard: opts.staticInfoCard,
        },
      ]
    : [];

  return [
    ...intro,
    {
      key: "purpose",
      text: "What is the purpose of this processing activity?",
      whyWeAsk:
        "Art. 30(1)(b) requires the purposes of the processing to be recorded. A purpose specific enough to test necessity against — 'paying salaries and meeting payroll reporting duties' rather than 'HR administration' — is what makes the rest of the entry defensible.",
      type: "text_long",
      isRequired: true,
    },
    {
      key: "lawful_basis",
      text: "What is your lawful basis for this activity?",
      whyWeAsk:
        "Every activity rests on one Art. 6 basis, chosen before the processing starts and not swapped afterwards. Where the basis is legitimate interests, the register is expected to point to a documented balancing assessment.",
      type: "lawful_basis",
      options: LAWFUL_BASIS_OPTIONS,
      isRequired: true,
      flagIf: opts.lawfulBasisFlags,
    },
    {
      key: "data_categories",
      text: "What categories of personal data are involved?",
      whyWeAsk:
        "Art. 30(1)(c) requires the categories of personal data to be described. Naming special-category data explicitly matters here: it changes the Art. 9 position and the risk treatment for the whole activity.",
      type: "text_long",
      isRequired: true,
    },
    {
      key: "data_subjects",
      text: "Who are the data subjects?",
      whyWeAsk:
        "Art. 30(1)(c) requires the categories of data subject. Categories rather than counts — employees, job applicants, customers, dependants — and each group listed separately, because their rights and expectations differ.",
      type: "text_short",
      isRequired: true,
    },
    {
      key: "activity_owner",
      text: "Who owns this activity (name and role)?",
      whyWeAsk:
        "The CNIL Article 30 register model expects a named owner for each processing activity, so the register shows who is accountable for keeping the entry accurate. It also supports the accountability duty behind Art. 30(1)(a), which requires the record to identify the controller and its contacts.",
      type: "text_short",
      isRequired: false,
    },
    {
      key: "collection_sources",
      text: "Where does the personal data come from?",
      whyWeAsk:
        "The CNIL register model records the source of the data for every activity (directly from the individual, from another controller, from a public source, or observed/derived). It also determines whether Art. 13 or Art. 14 transparency applies.",
      type: "text_long",
      isRequired: false,
    },
    {
      key: "processing_operations",
      text: "Which processing operations are performed?",
      whyWeAsk:
        "Art. 30(1)(b) requires the purposes of the processing, and the CNIL register model records the operations carried out on the data. The options follow the operations listed in the Art. 4(2) definition of 'processing'.",
      type: "multi_choice",
      options: PROCESSING_OPERATION_OPTIONS,
      isRequired: false,
    },
    {
      key: "related_assessments",
      text: "Is this activity covered by an existing LIA or DPIA?",
      whyWeAsk:
        "Cross-referencing the register to your Legitimate Interests Assessments and Data Protection Impact Assessments shows a supervisory authority that Art. 35 screening and Art. 6(1)(f) balancing have actually been done for this activity.",
      type: "assessment_reference",
      isRequired: false,
    },
    {
      key: "retention_period",
      text: "How long do you keep this data?",
      whyWeAsk:
        "Storage limitation (GDPR Art. 5(1)(e)) requires a defined retention period. Art. 30(1)(f) requires the envisaged time limits for erasure where possible.",
      type: "date_or_period",
      options: RETENTION_OPTIONS,
      isRequired: true,
      flagIf: [RETENTION_FLAG],
    },
    {
      key: "retention_varies_by_category",
      text: "Does the retention period differ by data category?",
      whyWeAsk:
        "Art. 30(1)(f) asks for the envisaged erasure time limits for each category of data where possible. Answer yes only if different categories are genuinely deleted on different clocks.",
      type: "yes_no",
      isRequired: false,
    },
    {
      key: "retention_by_category",
      text: "Set out the retention period for each data category.",
      whyWeAsk:
        "This breakdown is what Art. 30(1)(f) contemplates when a single retention period does not describe the activity accurately. It renders in the register only when you complete it.",
      type: "text_long",
      isRequired: false,
      showIf: {
        questionKey: "retention_varies_by_category",
        operator: "equals",
        value: "yes",
      },
    },

    {
      key: "security_measures",
      text: "What security measures protect this data?",
      whyWeAsk:
        "Art. 30(1)(g) asks for a general description of the Art. 32 measures. Describe what is actually in place for this activity — encryption at rest, role-based access, logging — rather than restating the organisation's security policy.",
      type: "text_long",
      isRequired: true,
    },
    {
      key: "access_controls",
      text: "Who has access to this data, and how is that access controlled?",
      whyWeAsk:
        "Access control is where Art. 32 is tested in practice. Recording who holds access, on what basis it is granted, and when it is reviewed answers the question an auditor asks first.",
      type: "text_long",
      isRequired: false,
    },
    {
      key: "rights_handling_override",
      text: "Does this activity handle data-subject requests differently from your standard process?",
      whyWeAsk:
        "Your organisation-level rights-handling process is captured once in setup and applies to every activity. Answer here only if this activity routes, verifies, or fulfils requests differently — the register then shows the override instead of the standard process.",
      type: "text_long",
      isRequired: false,
    },
    ...(opts.extras ?? []),

  ];
}

const LIA_CROSSSELL: FlagCondition = {
  operator: "equals",
  value: "legitimate_interests",
  flagType: "cross_sell",
  severity: "recommendation",
  message: "Legitimate interests requires a documented LIA.",
  consequence:
    "Without a documented Legitimate Interests Assessment, this basis is hard to defend.",
  actionLabel: "You should run a Legitimate Interest Assessment separately.",
};

const DPIA_CROSSSELL: FlagCondition = {
  operator: "equals",
  value: "ack",
  flagType: "cross_sell",
  severity: "recommendation",
  message: "This activity is likely to require a DPIA.",
  consequence: "High-risk processing needs a documented DPIA under Art. 35.",
  actionLabel: "Open the DPIA Framework",
  actionRoute: "/dpia-framework",
};

const DPA_CROSSSELL_Q: Question = {
  key: "uses_processors",
  text: "Do third-party processors handle this data?",
  whyWeAsk:
    "Art. 28 requires a written agreement with every processor, and Art. 30(1)(d) requires processors to appear in the register as recipients. Answer yes if anyone outside the organisation handles this data on your instructions, including hosting and support providers.",
  type: "yes_no",
  isRequired: true,
  flagIf: [
    {
      operator: "equals",
      value: "yes",
      flagType: "cross_sell",
      severity: "recommendation",
      message: "You'll need a DPA with each processor.",
      consequence:
        "GDPR Art. 28 makes a written DPA mandatory for every processor relationship.",
      actionLabel: "Generate a DPA",
      actionRoute: "/dpa-generator",
    },
  ],
};

// Captured only when uses_processors === "yes". Populates the
// "Processors / recipients" row in the generated RoPA document.
const PROCESSOR_PLATFORM_Q: Question = {
  key: "processor_platform",
  text: "Which processors or platforms handle this data?",
  whyWeAsk:
    "Art. 30(1)(d) requires the categories of recipient to be listed, processors included. Name the contracting entity for each one, since that is the party the Art. 28 agreement binds.",
  type: "text_long",
  isRequired: true,
  showIf: { questionKey: "uses_processors", operator: "equals", value: "yes" },
};


// ---------- Per-activity sequences ----------

const HR_PAYROLL = baseSequence({});
const HR_RECRUITMENT = baseSequence({});
const HR_PERFORMANCE = baseSequence({});
const HR_BENEFITS = baseSequence({});
const HR_MONITORING = baseSequence({
  staticInfoCard: {
    title: "Employee monitoring is high-risk",
    body: "Closely scrutinised by EU, UK, and US regulators. This activity is treated as high-risk by default.",
  },
  extras: [{ ...DPA_CROSSSELL_Q }, { ...PROCESSOR_PLATFORM_Q }],
});

const MARKETING_EMAIL = baseSequence({
  lawfulBasisFlags: [LIA_CROSSSELL],
  extras: [
    {
      key: "unsubscribe_mechanism",
      text: "Do recipients have a one-click unsubscribe?",
      whyWeAsk:
        "An accessible opt-out is required under the GDPR, PECR and CAN-SPAM alike. Its absence is a standalone finding rather than an aggravating factor.",
      type: "yes_no",
      isRequired: true,
      flagIf: [
        {
          operator: "equals",
          value: "no",
          flagType: "missing_required",
          severity: "warning",
          message: "No unsubscribe mechanism is a standalone violation.",
          consequence:
            "Failure to provide opt-out is a documented enforcement priority across GDPR, PECR, and CAN-SPAM.",
        },
      ],
    },
  ],
});

const MARKETING_SOCIAL = baseSequence({});
const MARKETING_ANALYTICS = baseSequence({});
const MARKETING_ADVERTISING = baseSequence({
  staticInfoCard: {
    title: "Targeted advertising is heavily enforced",
    body: "Behavioural targeting is one of the most actively enforced areas in EU/UK privacy law.",
  },
  lawfulBasisFlags: [
    {
      operator: "equals",
      value: "legitimate_interests",
      flagType: "basis_unclear",
      severity: "warning",
      message: "Legitimate interests is generally not accepted for targeted advertising.",
      consequence:
        "The EDPB, ICO, and most EU DPAs have rejected legitimate interests as a basis for targeted advertising.",
    },
  ],
});

const CUSTOMER_ACCOUNTS = baseSequence({ extras: [{ ...DPA_CROSSSELL_Q }, { ...PROCESSOR_PLATFORM_Q }] });
const CUSTOMER_SUPPORT = baseSequence({ extras: [{ ...DPA_CROSSSELL_Q }, { ...PROCESSOR_PLATFORM_Q }] });
const CUSTOMER_KYC = baseSequence({
  staticInfoCard: {
    title: "Customer due diligence is high-risk",
    body: "KYC carries simultaneous AML and privacy obligations. DPIA is strongly recommended.",
  },
});
const CUSTOMER_CRM = baseSequence({ extras: [{ ...DPA_CROSSSELL_Q }, { ...PROCESSOR_PLATFORM_Q }] });

const TECH_IT_SYSTEMS = baseSequence({ extras: [{ ...DPA_CROSSSELL_Q }, { ...PROCESSOR_PLATFORM_Q }] });
const TECH_SECURITY = baseSequence({
  extras: [
    {
      key: "incident_log",
      text: "Do you maintain a breach / incident register?",
      whyWeAsk:
      "Art. 33(5) requires every personal data breach to be documented, including those that are never notified. The register is what demonstrates that the decision not to notify was taken rather than overlooked.",
      type: "yes_no",
      isRequired: true,
      flagIf: [
        {
          operator: "equals",
          value: "no",
          flagType: "missing_required",
          severity: "warning",
          message: "Breach register required under Art. 33(5).",
          consequence:
            "Even non-reportable incidents must be documented. Missing register is a routine audit finding.",
          actionLabel: "Build an Incident Response Playbook",
          actionRoute: "/ir-playbook",
        },
      ],
    },
  ],
});
const TECH_CLOUD = baseSequence({ extras: [{ ...DPA_CROSSSELL_Q }, { ...PROCESSOR_PLATFORM_Q }] });

const FINANCE_INVOICING = baseSequence({});
const FINANCE_CREDIT = baseSequence({
  staticInfoCard: {
    title: "Credit assessment is high-risk",
    body: "Automated credit scoring triggers Art. 22 and DPIA obligations.",
  },
});
const LEGAL_CONTRACTS = baseSequence({});
const LEGAL_COMPLIANCE = baseSequence({});

const THIRD_PARTY_VENDORS = baseSequence({ extras: [{ ...DPA_CROSSSELL_Q }, { ...PROCESSOR_PLATFORM_Q }] });
const THIRD_PARTY_SHARING = baseSequence({});
const THIRD_PARTY_TRANSFERS = baseSequence({
  staticInfoCard: {
    title: "Cross-border transfers require specific mechanisms",
    body: "Invalid transfer mechanisms are among the highest-value enforcement priorities.",
  },
  extras: [
    {
      key: "transfer_mechanism",
      text: "Which transfer mechanism do you rely on?",
      whyWeAsk:
        "Chapter V permits transfers to a third country only where a listed mechanism carries them. Record the mechanism relied on for this activity, and treat remote support access as a transfer alongside storage.",
      type: "single_choice",
      options: [
        { value: "sccs", label: "Standard Contractual Clauses (SCCs)" },
        { value: "adequacy", label: "Adequacy decision" },
        { value: "bcrs", label: "Binding Corporate Rules" },
        { value: "derogations", label: "Art. 49 derogations" },
        { value: "none", label: "None / unclear" },
      ],
      isRequired: true,
      flagIf: [
        {
          operator: "equals",
          value: "none",
          flagType: "transfer_undocumented",
          severity: "warning",
          message: "No documented transfer mechanism.",
          consequence:
            "Transfers without a Chapter V mechanism are a common enforcement target post-Schrems II.",
        },
      ],
    },
  ],
});

const OPS_FACILITIES = baseSequence({
  staticInfoCard: {
    title: "Physical surveillance is heavily scrutinised",
    body: "CCTV and access control data attracts specific guidance from the UK ICO and EU DPAs.",
  },
  extras: [
    {
      key: "notices_displayed",
      text: "Are surveillance notices clearly displayed?",
      whyWeAsk:
        "Signage is how Arts. 13 and 14 are satisfied where there is no other point of contact with the individual. Regulators treat a missing notice as a transparency failure in its own right.",
      type: "yes_no",
      isRequired: true,
      flagIf: [
        {
          operator: "equals",
          value: "no",
          flagType: "missing_required",
          severity: "warning",
          message: "Missing surveillance notices.",
          consequence:
            "Failure to display CCTV/monitoring notices is routinely cited in enforcement actions.",
        },
      ],
    },
  ],
});
const OPS_RESEARCH = baseSequence({});

export const ROPA_QUESTION_REGISTRY: Record<string, Question[]> = {
  hr_payroll: HR_PAYROLL,
  hr_recruitment: HR_RECRUITMENT,
  hr_performance: HR_PERFORMANCE,
  hr_monitoring: HR_MONITORING,
  hr_benefits: HR_BENEFITS,
  marketing_email: MARKETING_EMAIL,
  marketing_social: MARKETING_SOCIAL,
  marketing_analytics: MARKETING_ANALYTICS,
  marketing_advertising: MARKETING_ADVERTISING,
  customer_accounts: CUSTOMER_ACCOUNTS,
  customer_support: CUSTOMER_SUPPORT,
  customer_kyc: CUSTOMER_KYC,
  customer_crm: CUSTOMER_CRM,
  tech_it_systems: TECH_IT_SYSTEMS,
  tech_security: TECH_SECURITY,
  tech_cloud: TECH_CLOUD,
  finance_invoicing: FINANCE_INVOICING,
  finance_credit: FINANCE_CREDIT,
  legal_contracts: LEGAL_CONTRACTS,
  legal_compliance: LEGAL_COMPLIANCE,
  third_party_vendors: THIRD_PARTY_VENDORS,
  third_party_sharing: THIRD_PARTY_SHARING,
  third_party_transfers: THIRD_PARTY_TRANSFERS,
  ops_facilities: OPS_FACILITIES,
  ops_research: OPS_RESEARCH,
};

const FALLBACK = baseSequence({});

export function getQuestionsForActivity(templateKey: string | null): Question[] {
  if (!templateKey) return FALLBACK;
  return ROPA_QUESTION_REGISTRY[templateKey] ?? FALLBACK;
}

// silence unused warning for JC import — exported for future jurisdiction-aware filtering
export const _JC = JC;
