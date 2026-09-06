import type { Question, FlagCondition } from "./types";
import { JC } from "../jurisdiction-codes";
import { COUNTRY_OPTIONS } from "../countries";

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


// DOC 168 (2026-09-04) — CEO rule: where the law's answer set is closed, the
// intake shows the options (single / multi-select) and never a free-text box.
// Every list below is MIRRORED, value for value, in
// supabase/functions/generate-ropa-document/register/answer-labels.ts (the
// edge function cannot import this browser module); the vitest parity test
// pins the two sides. Legacy free-text answers stored under these keys keep
// rendering as written.

// Art. 9(2)(a)–(j) conditions (verbatim-faithful short forms) + Art. 10 —
// both named by Art. 30(5) as defeating the small-organisation derogation.
const SPECIAL_CATEGORY_BASIS_OPTIONS = [
  { value: "none", label: "Not applicable — no special category or criminal-offence data is processed" },
  { value: "art9_2_a", label: "Art. 9(2)(a) — the data subject has given explicit consent for one or more specified purposes" },
  { value: "art9_2_b", label: "Art. 9(2)(b) — necessary for obligations or rights in the field of employment, social security or social protection law" },
  { value: "art9_2_c", label: "Art. 9(2)(c) — necessary to protect vital interests where the data subject is physically or legally incapable of giving consent" },
  { value: "art9_2_d", label: "Art. 9(2)(d) — legitimate activities of a not-for-profit body with a political, philosophical, religious or trade-union aim, relating to its members" },
  { value: "art9_2_e", label: "Art. 9(2)(e) — personal data manifestly made public by the data subject" },
  { value: "art9_2_f", label: "Art. 9(2)(f) — necessary for the establishment, exercise or defence of legal claims, or where courts act in their judicial capacity" },
  { value: "art9_2_g", label: "Art. 9(2)(g) — necessary for reasons of substantial public interest, on the basis of law" },
  { value: "art9_2_h", label: "Art. 9(2)(h) — preventive or occupational medicine, assessment of working capacity, medical diagnosis, or health or social care" },
  { value: "art9_2_i", label: "Art. 9(2)(i) — public interest in the area of public health, on the basis of law" },
  { value: "art9_2_j", label: "Art. 9(2)(j) — archiving in the public interest, scientific or historical research or statistical purposes" },
  { value: "art10", label: "Art. 10 — criminal convictions and offences data, under official authority or as authorised by law" },
];

// Art. 30(1)(d): "the categories of recipients to whom the personal data have
// been or will be disclosed including recipients in third countries or
// international organisations" — a required element, answered by category;
// named vendors are optional detail (an open set) captured separately.
const RECIPIENT_CATEGORY_OPTIONS = [
  { value: "processors", label: "Processors and service providers acting on our instructions", example: "Hosting, SaaS, payroll, support tools" },
  { value: "group", label: "Companies in our corporate group" },
  { value: "advertising_analytics", label: "Advertising, marketing or analytics partners" },
  { value: "payment_financial", label: "Payment, banking or financial service providers" },
  { value: "public_authorities", label: "Public authorities and regulators, where required by law" },
  { value: "professional_advisers", label: "Professional advisers (legal, audit, insurance)" },
  { value: "business_partners", label: "Business partners, resellers or joint controllers" },
  { value: "third_country", label: "Recipients in a third country or an international organisation" },
  { value: "none", label: "None — the data is not disclosed to any recipient outside the organisation" },
];

// Art. 30(5): the derogation is lost where "the processing is not occasional".
const PROCESSING_REGULARITY_OPTIONS = [
  { value: "regular", label: "Regular or ongoing — part of normal operations" },
  { value: "occasional", label: "Occasional — one-off or infrequent" },
  { value: "unsure", label: "Unsure" },
];

const TRANSFER_MECHANISM_OPTIONS = [
  { value: "sccs", label: "Standard Contractual Clauses (SCCs)" },
  { value: "adequacy", label: "Adequacy decision" },
  { value: "bcrs", label: "Binding Corporate Rules" },
  { value: "derogations", label: "Art. 49 derogations" },
  { value: "none", label: "None / unclear" },
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
    // S-P1 (doc 80, 2026-08-27) — PER-ACTIVITY ROLE. Article 30(1)
    // (controller records) and Article 30(2) (processor records) require
    // genuinely different information — the ICO publishes two separate
    // templates for exactly this reason — and an organisation can be
    // controller for some activities and processor for others. Optional so
    // legacy records keep their org-level default; a processor activity
    // drops the lawful-basis ask (Art. 30(2) does not require a processor
    // to state a basis it does not own) and names its controller instead.
    {
      key: "activity_role",
      text: "For this activity, is the company deciding the purposes and means, or processing on another organisation's behalf?",
      whyWeAsk:
        "Article 30(1) and Article 30(2) GDPR require different records: a controller records its purposes and lawful basis; a processor records the categories of processing it performs for each controller — it does not state a lawful basis of its own. Answering per activity lets a company that wears both hats keep each entry legally correct.",
      type: "single_choice",
      options: [
        { value: "controller", label: "We decide why and how (controller)", example: "Our own payroll, our own marketing list" },
        { value: "processor", label: "We process on another organisation's behalf (processor)", example: "Hosting or scoring data for a client under their instructions" },
      ],
      isRequired: false,
    },
    {
      key: "acting_for_controller",
      text: "Which controller is this activity performed for?",
      whyWeAsk:
        "Article 30(2)(a) requires a processor's record to name each controller on whose behalf it acts (with contact details where applicable). The register entry is incomplete without the controller's name.",
      type: "text_short",
      isRequired: false,
      showIf: { questionKey: "activity_role", operator: "equals", value: "processor" },
    },
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
      // S-P1 — a processor does not state a lawful basis of its own
      // (Art. 30(2)); the question is skipped for processor activities.
      showIf: { questionKey: "activity_role", operator: "not_equals", value: "processor" },
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
    // DOC 166 (2026-09-04) — was read by the register (art305-note.ts,
    // generate-ropa-document's per-activity table) but never asked anywhere
    // in the intake, so the Art. 30(5) small-organisation derogation note
    // could never detect a real special-category activity from customer
    // data and always fell to its negative branch.
    // DOC 168 — structured per the CEO rule: the Art. 9(2) conditions and
    // Art. 10 are a closed list, so they are options, not free text.
    {
      key: "special_category_basis",
      text: "Which Article 9(2) condition (or Article 10) applies to any special category or criminal-offence data in this activity?",
      followUpPrompt: "Select every condition that applies, or \"Not applicable\".",
      whyWeAsk:
        "Art. 9(1) prohibits processing special categories of data — racial or ethnic origin, political opinions, religious or philosophical beliefs, trade union membership, genetic or biometric data, health, sex life or sexual orientation — unless an Art. 9(2) condition applies; Art. 10 governs criminal-offence data. Art. 30(5) names both as defeating the small-organisation derogation, so the register's Article 30(5) note turns on this answer.",
      type: "multi_choice",
      options: SPECIAL_CATEGORY_BASIS_OPTIONS,
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
    // QA round two (ROPA-A-01, Medium, 2026-09-06) — selecting "Custom" on the
    // retention question revealed no field to enter the custom period, on all
    // three customers. Customer A worked around it by typing the real period
    // (24 hours active, 30 days backup) into the security description, where it
    // never reaches the register's retention column. The option now has the
    // input it implies, and the register reads it — see
    // generate-ropa-document/register/assemble-input.ts, retentionDisplay.
    {
      key: "retention_period_custom",
      text: "What is that retention period?",
      whyWeAsk:
        "Art. 30(1)(f) asks for the envisaged time limit for erasure. Give the period, and where it runs from an event rather than a fixed clock say which event — for example \"24 hours after the delivery completes or is cancelled; encrypted backups expire after 30 days\".",
      type: "text_short",
      isRequired: true,
      showIf: {
        questionKey: "retention_period",
        operator: "equals",
        value: "custom",
      },
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
      text: "Who can access this data?",
      followUpPrompt: "And how is that access controlled?",
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
    // DOC 166 (2026-09-04) — Art. 30(1)(d) ("the categories of recipients")
    // is a required register element, not qualified "where applicable" the
    // way (e) and (f) are. It was previously asked only via `extras` on 7 of
    // 24 activity templates, so the other 17 could never record a recipient
    // and could never satisfy this element of the register's own
    // completeness check.
    // DOC 168 — the required element is answered by CATEGORY (a closed list,
    // per the CEO rule), on every template; "None" is an affirmative answer.
    // The former `uses_processors` yes/no is retired as redundant with the
    // "processors" category, and the DPA cross-sell now hangs on that
    // category. Named vendors remain optional detail (an open set).
    {
      key: "recipient_categories",
      text: "To which categories of recipient is the personal data disclosed?",
      followUpPrompt: "Select every category that applies, or \"None\".",
      whyWeAsk:
        "Art. 30(1)(d) requires the record to state the categories of recipients to whom the personal data have been or will be disclosed, including recipients in third countries or international organisations. Processors count as recipients, and Art. 28 requires a written agreement with each of them.",
      type: "multi_choice",
      options: RECIPIENT_CATEGORY_OPTIONS,
      isRequired: true,
      flagIf: [
        {
          operator: "contains",
          value: "processors",
          flagType: "cross_sell",
          severity: "recommendation",
          message: "You'll need a DPA with each processor.",
          consequence:
            "GDPR Art. 28 makes a written DPA mandatory for every processor relationship.",
          actionLabel: "Generate a DPA",
          actionRoute: "/dpa-generator",
        },
      ],
    },
    { ...PROCESSOR_PLATFORM_Q },
    // DOC 168 — Art. 30(1)(e) on every template: a yes/no gate, then the
    // destination (a country list; an international organisation is the one
    // open-set answer, named in a conditional field) and the mechanism.
    // Previously only the dedicated transfers template asked anything, and it
    // asked the mechanism without the destination (doc 166).
    {
      key: "transfers_third_country",
      text: "Is personal data for this activity transferred to a country outside the EU/EEA or the United Kingdom, or to an international organisation?",
      whyWeAsk:
        "Art. 30(1)(e) requires the record to identify, where applicable, transfers of personal data to a third country or an international organisation, including the identification of that third country or international organisation. Remote access by a vendor abroad counts as a transfer alongside storage.",
      type: "yes_no",
      isRequired: true,
    },
    {
      key: "transfer_destination",
      text: "Which country or countries (or international organisation) does the data go to?",
      followUpPrompt: "Select every destination that applies.",
      whyWeAsk:
        "Art. 30(1)(e) requires the third country or international organisation to be identified by name; a region or \"outside the EU\" does not satisfy it.",
      type: "multi_choice",
      options: [...COUNTRY_OPTIONS],
      isRequired: true,
      showIf: { questionKey: "transfers_third_country", operator: "equals", value: "yes" },
    },
    {
      key: "transfer_international_org",
      text: "Name the international organisation the data is transferred to.",
      whyWeAsk:
        "An international organisation is not a country, so it cannot be picked from the list; Art. 30(1)(e) still requires it to be identified.",
      type: "text_short",
      isRequired: true,
      showIf: { questionKey: "transfer_destination", operator: "contains", value: "__international_organisation__" },
    },
    {
      key: "transfer_mechanism",
      text: "Which transfer mechanism do you rely on?",
      whyWeAsk:
        "Chapter V permits transfers to a third country only where a listed mechanism carries them. Record the mechanism relied on for this activity, and treat remote support access as a transfer alongside storage.",
      type: "single_choice",
      options: TRANSFER_MECHANISM_OPTIONS,
      isRequired: true,
      showIf: { questionKey: "transfers_third_country", operator: "equals", value: "yes" },
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
    // DOC 168 — Art. 30(5): the derogation is unavailable where "the
    // processing is not occasional". Doc 166's note had to leave this limb
    // "not recorded"; it is now a closed-list answer per activity.
    {
      key: "processing_regularity",
      text: "How often is this processing carried out?",
      whyWeAsk:
        "Art. 30(5) exempts organisations employing fewer than 250 persons from the record-keeping duty unless, among other things, the processing is not occasional. The register's Article 30(5) note turns on this answer for every activity.",
      type: "single_choice",
      options: PROCESSING_REGULARITY_OPTIONS,
      isRequired: true,
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
  actionLabel: "You should run a Legitimate Interests Assessment separately.",
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

// DOC 168 — `uses_processors` (yes/no) retired: the "processors" recipient
// category asks the same fact; the DPA cross-sell moved onto that category.
// Named vendors are optional supporting detail shown when that category is
// selected — the only free text kept here, because vendor names are an open
// set the law does not enumerate (Art. 30(1)(d) asks for categories).
const PROCESSOR_PLATFORM_Q: Question = {
  key: "processor_platform",
  text: "Which processors or platforms handle this data?",
  whyWeAsk:
    "Optional detail beneath the recipient categories above. Naming the contracting entity for each processor identifies the party the Art. 28 agreement binds and lets the register cite it.",
  type: "text_long",
  isRequired: false,
  showIf: { questionKey: "recipient_categories", operator: "contains", value: "processors" },
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

const CUSTOMER_ACCOUNTS = baseSequence({});
const CUSTOMER_SUPPORT = baseSequence({});
const CUSTOMER_KYC = baseSequence({
  staticInfoCard: {
    title: "Customer due diligence is high-risk",
    body: "KYC carries simultaneous AML and privacy obligations. DPIA is strongly recommended.",
  },
});
const CUSTOMER_CRM = baseSequence({});

const TECH_IT_SYSTEMS = baseSequence({});
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
const TECH_CLOUD = baseSequence({});

const FINANCE_INVOICING = baseSequence({});
const FINANCE_CREDIT = baseSequence({
  staticInfoCard: {
    title: "Credit assessment is high-risk",
    body: "Automated credit scoring triggers Art. 22 and DPIA obligations.",
  },
});
const LEGAL_CONTRACTS = baseSequence({});
const LEGAL_COMPLIANCE = baseSequence({});

const THIRD_PARTY_VENDORS = baseSequence({});
const THIRD_PARTY_SHARING = baseSequence({});
// DOC 168 — the transfer questions (gate, destination, mechanism) now live in
// the universal sequence for every template (Art. 30(1)(e) is "where
// applicable", so the gate asks whether it applies); this template keeps its
// enforcement info card only.
const THIRD_PARTY_TRANSFERS = baseSequence({
  staticInfoCard: {
    title: "Cross-border transfers require specific mechanisms",
    body: "Invalid transfer mechanisms are among the highest-value enforcement priorities.",
  },
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
