import type { Question, FlagCondition } from "./types";
import { JC } from "../jurisdiction-codes";

const RETENTION_FLAG: FlagCondition = {
  operator: "equals",
  value: "indefinitely",
  flagType: "retention_undefined",
  severity: "warning",
  message: "Indefinite retention is rarely defensible.",
  consequence:
    "GDPR Art.5(1)(e) requires a defined retention period. 'Indefinitely' is a common audit finding.",
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
        "Article 30(1)(b) requires the purposes of processing to be documented in your RoPA.",
      type: "text_long",
      isRequired: true,
    },
    {
      key: "lawful_basis",
      text: "What is your lawful basis for this activity?",
      whyWeAsk:
        "Every processing activity must rest on a lawful basis (e.g. GDPR Art.6).",
      type: "lawful_basis",
      options: LAWFUL_BASIS_OPTIONS,
      isRequired: true,
      flagIf: opts.lawfulBasisFlags,
    },
    {
      key: "data_categories",
      text: "What categories of personal data are involved?",
      whyWeAsk:
        "RoPA must list data categories. This drives downstream risk assessment.",
      type: "text_long",
      isRequired: true,
    },
    {
      key: "data_subjects",
      text: "Who are the data subjects?",
      whyWeAsk: "RoPA must identify the categories of individuals whose data you process.",
      type: "text_short",
      isRequired: true,
    },
    {
      key: "retention_period",
      text: "How long do you keep this data?",
      whyWeAsk:
        "Storage limitation (GDPR Art.5(1)(e)) requires a defined retention period.",
      type: "date_or_period",
      options: RETENTION_OPTIONS,
      isRequired: true,
      flagIf: [RETENTION_FLAG],
    },
    {
      key: "security_measures",
      text: "What security measures protect this data?",
      whyWeAsk:
        "Art.32 requires appropriate technical and organisational measures.",
      type: "text_long",
      isRequired: true,
    },
    {
      key: "access_controls",
      text: "Who has access to this data, and how is that access controlled?",
      whyWeAsk:
        "Documenting access controls supports Art.32 compliance and is expected by most supervisory authorities during audits.",
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
  consequence: "High-risk processing needs a documented DPIA under Art.35.",
  actionLabel: "Open the DPIA Framework",
  actionRoute: "/dpia-framework",
};

const DPA_CROSSSELL_Q: Question = {
  key: "uses_processors",
  text: "Do third-party processors handle this data?",
  whyWeAsk: "Art.28 requires a Data Processing Agreement with every processor.",
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
        "GDPR Art.28 makes a written DPA mandatory for every processor relationship.",
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
    "Art.30(1)(d) requires you to list the recipients (including processors) of the personal data.",
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
      whyWeAsk: "Required under GDPR, PECR, and CAN-SPAM.",
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
      whyWeAsk: "Art.33(5) requires documenting all security incidents.",
      type: "yes_no",
      isRequired: true,
      flagIf: [
        {
          operator: "equals",
          value: "no",
          flagType: "missing_required",
          severity: "warning",
          message: "Breach register required under Art.33(5).",
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
    body: "Automated credit scoring triggers Art.22 and DPIA obligations.",
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
      whyWeAsk: "Chapter V of GDPR limits transfers to third countries.",
      type: "single_choice",
      options: [
        { value: "sccs", label: "Standard Contractual Clauses (SCCs)" },
        { value: "adequacy", label: "Adequacy decision" },
        { value: "bcrs", label: "Binding Corporate Rules" },
        { value: "derogations", label: "Art.49 derogations" },
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
      whyWeAsk: "Displaying notices is a standalone GDPR transparency obligation.",
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
