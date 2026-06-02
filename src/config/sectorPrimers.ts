/**
 * Sector primer content — shown once in a modal immediately after sector
 * selection, before the user starts their first activity. Five approved
 * fields per sector:
 *
 *   1. rulePreview     — which compliance rules are most likely to fire
 *   2. watchOuts       — sector-specific gotchas worth knowing up front
 *   3. scopeGuardrail  — one sentence to keep the RoPA tightly scoped
 *   4. effortEstimate  — realistic time-to-complete signal
 *   5. sampleActivity  — concrete first activity to nudge the user in with
 *
 * Content is informational only — it does NOT add or modify any compliance
 * rule. The 16-rule roster (mem://features/ropa-rules-v1) is the sole
 * source of truth for what the engine actually evaluates.
 */

export interface SectorPrimer {
  rulePreview: string[];
  watchOuts: string[];
  scopeGuardrail: string;
  effortEstimate: string;
  sampleActivity: {
    label: string;
    description: string;
  };
}

export const SECTOR_PRIMERS: Record<string, SectorPrimer> = {
  "Financial Services": {
    rulePreview: [
      "Art. 6(1) — lawful basis for KYC and credit checks",
      "Art. 5(1)(e) — retention limits on closed-account data",
      "Art. 22 — automated decision-making in credit scoring",
      "Art. 44 — international transfers to group entities or processors",
    ],
    watchOuts: [
      "KYC/AML data has statutory retention that often overrides your default schedule.",
      "Credit-decisioning frequently triggers Art. 22 even when a human “rubber-stamps”.",
      "Marketing consent must be tracked separately from contractual basis.",
    ],
    scopeGuardrail:
      "Document each business line (retail, corporate, payments) as its own activity rather than rolling them into one.",
    effortEstimate: "Most teams complete a first pass in 45–75 minutes.",
    sampleActivity: {
      label: "Customer onboarding & KYC verification",
      description:
        "Identity verification, sanctions screening, and account opening for retail customers.",
    },
  },
  Technology: {
    rulePreview: [
      "Art. 6(1) — lawful basis for product analytics and telemetry",
      "Art. 44 — transfers to US/APAC cloud providers and sub-processors",
      "Art. 5(1)(e) — retention of inactive user accounts and logs",
      "Art. 28 — processor agreements with infra and AI vendors",
    ],
    watchOuts: [
      "Cookie and SDK-based tracking usually needs consent, not legitimate interest.",
      "Free-tier and trial users are still data subjects with full Art. 15 rights.",
      "LLM/AI vendors often retain prompts — confirm in the DPA before listing them.",
    ],
    scopeGuardrail:
      "Treat the production app, marketing site, and internal tooling as separate activities — their bases and retentions diverge.",
    effortEstimate: "Most teams complete a first pass in 40–60 minutes.",
    sampleActivity: {
      label: "Product analytics & usage telemetry",
      description:
        "Event-level usage data collected from the app to improve features and detect abuse.",
    },
  },
  Healthcare: {
    rulePreview: [
      "Art. 9(1) — health data is special category and prohibited unless an Art. 9(2) condition applies",
      "Art. 22(4) — automated decisions on patients require extra safeguards",
      "Art. 5(1)(e) — clinical record retention is regulated by national law",
      "Art. 32 — security of processing for medical records",
    ],
    watchOuts: [
      "Free-text clinical notes almost always contain Art. 9 data even if the activity is labelled “admin”.",
      "Patient family-history questionnaires are generally not genetic data under Art. 9 unless they result from biological sample analysis — consult your DPO if in doubt.",
      "Telehealth recordings need their own retention and basis analysis.",
    ],
    scopeGuardrail:
      "Split patient-facing activities from staff/HR activities — mixing them makes Art. 9 analysis much harder.",
    effortEstimate: "Most teams complete a first pass in 60–90 minutes.",
    sampleActivity: {
      label: "Patient medical records",
      description:
        "Clinical history, diagnoses, prescriptions, and treatment notes stored in the EHR.",
    },
  },
  Retail: {
    rulePreview: [
      "Art. 6(1) — lawful basis for loyalty programmes and personalisation",
      "Art. 5(1)(e) — retention of order history and abandoned-cart data",
      "Art. 44 — transfers via payment processors and ad platforms",
      "Art. 7 — proof of marketing consent",
    ],
    watchOuts: [
      "Loyalty profiling that influences pricing or offers may trigger Art. 22.",
      "POS CCTV is a separate activity from in-store wifi analytics.",
      "Ad-platform pixels typically share data with US controllers — document the transfer mechanism.",
    ],
    scopeGuardrail:
      "Document online and in-store customer journeys separately; their data flows rarely match.",
    effortEstimate: "Most teams complete a first pass in 35–55 minutes.",
    sampleActivity: {
      label: "Customer accounts & order history",
      description:
        "Account profile, order history, addresses, and saved payment tokens for repeat customers.",
    },
  },
  Consulting: {
    rulePreview: [
      "Art. 6(1) — lawful basis for client contact and prospect databases",
      "Art. 28 — when you act as a processor for client data",
      "Art. 44 — transfers when serving multinational clients",
      "Art. 5(1)(e) — retention of engagement records after project close",
    ],
    watchOuts: [
      "You frequently flip between controller and processor roles per engagement — document this explicitly.",
      "Prospect lists from purchased sources rarely have a sound lawful basis.",
      "Project deliverables often contain personal data subject to client-defined retention.",
    ],
    scopeGuardrail:
      "Separate “our own marketing/CRM” activities from “client data we handle as processor” — the rules differ sharply.",
    effortEstimate: "Most teams complete a first pass in 30–50 minutes.",
    sampleActivity: {
      label: "Client CRM & engagement history",
      description:
        "Contact details, meeting notes, and project history for current and past clients.",
    },
  },
};

export const FALLBACK_SECTOR_PRIMER: SectorPrimer = {
  rulePreview: [
    "Art. 6(1) — lawful basis for each activity",
    "Art. 5(1)(e) — retention limits per category of data",
    "Art. 44 — international transfers via processors or group entities",
    "Art. 28 — processor agreements with all third-party vendors",
  ],
  watchOuts: [
    "HR, marketing, and customer activities almost always need different lawful bases — don’t fold them together.",
    "“We delete when no longer needed” is not a retention period — set a concrete schedule.",
    "Every SaaS vendor that touches personal data is a processor and needs a DPA.",
  ],
  scopeGuardrail:
    "Aim for 8–15 activities. Fewer usually means you’ve over-grouped; more usually means you’ve over-split.",
  effortEstimate: "Most teams complete a first pass in 45–75 minutes.",
  sampleActivity: {
    label: "Employee payroll",
    description:
      "Salary, tax, and bank details processed to pay employees and meet statutory reporting.",
  },
};

export function getSectorPrimer(sector: string | null | undefined): SectorPrimer {
  if (!sector) return FALLBACK_SECTOR_PRIMER;
  return SECTOR_PRIMERS[sector] ?? FALLBACK_SECTOR_PRIMER;
}
