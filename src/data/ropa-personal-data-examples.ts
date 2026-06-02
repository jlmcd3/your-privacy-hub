// Industry-specific examples of "personal data" under GDPR Art.4(1) and
// "special category data" under Art.9. Used by the RoPA activity flow to
// help users brainstorm what categories of data their processing involves.

export interface PersonalDataExampleGroup {
  label: string;
  // True if this group is "special category" data under GDPR Art.9 (or
  // otherwise treated as sensitive, e.g. financial / criminal data).
  sensitive?: boolean;
  examples: string[];
}

const COMMON: PersonalDataExampleGroup[] = [
  {
    label: "Identity & contact data",
    examples: [
      "Full name, title",
      "Email address, phone number",
      "Postal / billing address",
      "Date of birth",
      "Government-issued ID numbers (passport, national ID)",
    ],
  },
  {
    label: "Online identifiers & device data",
    examples: [
      "IP address",
      "Cookie / advertising IDs",
      "Device fingerprint, user-agent",
      "Account usernames, login timestamps",
    ],
  },
];

const HEALTHCARE: PersonalDataExampleGroup[] = [
  {
    label: "Medical & clinical data",
    sensitive: true,
    examples: [
      "Diagnoses, conditions, symptoms",
      "Treatment plans, prescriptions, medication history",
      "Lab and imaging results",
      "Clinical notes and consultation records",
      "Appointment and hospital admission history",
    ],
  },
  {
    label: "Genetic & biometric data",
    sensitive: true,
    examples: [
      "DNA / genetic test results",
      "Fingerprints, facial scans used for identification",
      "Voice prints",
    ],
  },
  {
    label: "Insurance & billing data",
    examples: [
      "Health insurance / scheme membership numbers",
      "Claims history",
      "Co-pay and payment records",
    ],
  },
];

const FINANCIAL: PersonalDataExampleGroup[] = [
  {
    label: "Financial & account data",
    sensitive: true,
    examples: [
      "Bank account / IBAN, sort code",
      "Card numbers and payment tokens",
      "Transaction history",
      "Account balances, credit limits",
    ],
  },
  {
    label: "KYC / AML data",
    sensitive: true,
    examples: [
      "Source-of-funds declarations",
      "PEP / sanctions screening results",
      "ID document scans, selfies for verification",
      "Tax residency, TIN",
    ],
  },
  {
    label: "Creditworthiness data",
    examples: [
      "Credit score, credit bureau reports",
      "Income, employment status",
      "Existing debts and repayment history",
    ],
  },
];

const TECHNOLOGY: PersonalDataExampleGroup[] = [
  {
    label: "Product usage & telemetry",
    examples: [
      "Feature usage events, clickstreams",
      "Crash reports, diagnostic logs",
      "Session recordings, heatmaps",
    ],
  },
  {
    label: "Authentication & security data",
    examples: [
      "Hashed passwords, MFA seeds",
      "Login IP and geolocation",
      "API keys tied to a user",
    ],
  },
  {
    label: "Customer support data",
    examples: [
      "Support tickets and chat transcripts",
      "Attachments shared by the user",
    ],
  },
];

const LEGAL: PersonalDataExampleGroup[] = [
  {
    label: "Matter & case data",
    sensitive: true,
    examples: [
      "Client matter files and correspondence",
      "Court filings, pleadings, judgments",
      "Legal advice and privileged communications",
    ],
  },
  {
    label: "Criminal & litigation data",
    sensitive: true,
    examples: [
      "Criminal record checks",
      "Allegations, investigations, sanctions",
      "Witness statements",
    ],
  },
  {
    label: "Billing & engagement data",
    examples: [
      "Time entries, retainer balances",
      "Conflict-check results",
    ],
  },
];

const RETAIL: PersonalDataExampleGroup[] = [
  {
    label: "Purchase & order data",
    examples: [
      "Order history, basket contents",
      "Delivery addresses",
      "Returns and refund records",
    ],
  },
  {
    label: "Loyalty & marketing data",
    examples: [
      "Loyalty programme ID, points balance",
      "Marketing preferences and consent records",
      "Wishlist / browsing history",
    ],
  },
  {
    label: "Payment data",
    examples: [
      "Card tokens, last-4 digits",
      "Billing address",
    ],
  },
];

const MANUFACTURING: PersonalDataExampleGroup[] = [
  {
    label: "Workforce & operations data",
    examples: [
      "Shift schedules, time-and-attendance records",
      "Site access badge logs",
      "Productivity / output metrics tied to an individual",
    ],
  },
  {
    label: "Health & safety data",
    sensitive: true,
    examples: [
      "Workplace injury reports",
      "Occupational health assessments",
      "Drug / alcohol testing results (where lawful)",
    ],
  },
  {
    label: "Supply chain contact data",
    examples: [
      "Supplier and distributor contacts",
      "Driver / logistics personnel data",
    ],
  },
];

const GOVERNMENT: PersonalDataExampleGroup[] = [
  {
    label: "Citizen & resident data",
    sensitive: true,
    examples: [
      "National ID / social-security numbers",
      "Residency, immigration status",
      "Benefits, social-welfare records",
    ],
  },
  {
    label: "Service delivery data",
    examples: [
      "Case files for the relevant programme",
      "Correspondence with the authority",
    ],
  },
  {
    label: "Law-enforcement / criminal data",
    sensitive: true,
    examples: [
      "Criminal records, cautions",
      "Investigation files (subject to LED / Part 3 DPA where applicable)",
    ],
  },
];

const CONSULTING: PersonalDataExampleGroup[] = [
  {
    label: "Client contact & engagement data",
    examples: [
      "Client and prospect contacts (name, role, email, phone)",
      "Meeting notes, call recordings",
      "Engagement letters and SOWs",
    ],
  },
  {
    label: "Project / deliverable data",
    examples: [
      "Personal data shared by the client for the engagement",
      "Workshop attendee lists",
      "Interview transcripts",
    ],
  },
  {
    label: "Billing & time data",
    examples: [
      "Timesheet entries per consultant",
      "Invoicing and expense records",
    ],
  },
];

const HR_UNIVERSAL: PersonalDataExampleGroup[] = [
  {
    label: "Employee & contractor data",
    examples: [
      "Name, contact details, emergency contact",
      "Employment contract, role, salary, bank details",
      "Performance reviews, disciplinary records",
      "Right-to-work / visa documentation",
    ],
  },
];

const SECTOR_MAP: Record<string, PersonalDataExampleGroup[]> = {
  Healthcare: HEALTHCARE,
  "Financial Services": FINANCIAL,
  Technology: TECHNOLOGY,
  Legal: LEGAL,
  Retail: RETAIL,
  Manufacturing: MANUFACTURING,
  Government: GOVERNMENT,
  Consulting: CONSULTING,
};

/**
 * Return personal-data example groups relevant to a sector. We always prepend
 * COMMON identity/online identifiers and append HR_UNIVERSAL since every
 * organisation processes some employee data.
 */
export function getPersonalDataExamplesForSector(
  sector: string | null | undefined
): PersonalDataExampleGroup[] {
  const sectorGroups = (sector && SECTOR_MAP[sector]) || [];
  return [...COMMON, ...sectorGroups, ...HR_UNIVERSAL];
}
