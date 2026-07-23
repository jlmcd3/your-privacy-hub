import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import Footer from "@/components/Footer";
import { RequirementBadge } from "@/components/RequirementBadge";
import SampleReportLink from "@/components/SampleReportLink";
import ToolsSelector from "@/components/tools/ToolsSelector";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { PRICING, isSmartTool, INTELLIGENCE_PRICING, PLATFORM_PRICING, INCLUDED_GENERATIONS_COPY } from "@/config/pricing";
import { useConversionEvent } from "@/hooks/useConversionEvent";
import { useAuth } from "@/hooks/useAuth";
import { Bot, CheckCircle2, ClipboardList, FileSignature, FileText, Fingerprint, Folder, Lock, MoveRight, Scale, Search, Shield, ShieldAlert, Siren, Square, Wrench } from 'lucide-react';

// Map Tools-page slugs to /samples/{sampleSlug} slugs where a published sample exists.
const SAMPLE_SLUG_MAP: Record<string, string> = {
  healthcheck: "governance",
  "li-assessment": "li_assessment",
  dpia: "dpia",
  "biometric-checker": "biometric",
  "dpa-generator": "dpa",
  "ir-playbook": "ir_playbook",
  "ropa-builder": "ropa",
  "us-notices": "us_notice",
  "eu-notices": "eu_notice",
  "cppa-risk-assessment": "cppa_risk",
  "cppa-cybersecurity": "cppa_cyber",
};

// Nine assessment tools that include 4 generations per purchased report.
const INCLUDED_GENERATIONS_SLUGS = new Set([
  "healthcheck",
  "li-assessment",
  "dpia",
  "biometric-checker",
  "dpa-generator",
  "ir-playbook",
  "cppa-risk-assessment",
  "cppa-cybersecurity",
  "cppa-admt-checker",
]);

// Tier-1 slugs surface the canonical top-up line adjacent to the primary CTA.
const TOPUP_TIER1_SLUGS = new Set([
  "dpa-generator",
  "dpia",
  "li-assessment",
  "cppa-risk-assessment",
  "cppa-admt-checker",
  "ir-playbook",
]);

// Map Tools-page slugs to PRICING tool keys so we can classify per card.
const SLUG_TO_TOOL_KEY: Record<string, string> = {
  healthcheck: "governance",
  "li-assessment": "lia",
  dpia: "dpia",
  "biometric-checker": "biometric",
  "dpa-generator": "dpa",
  "ir-playbook": "ir_playbook",
  "ropa-builder": "ropa",
  "us-notices": "us_notice",
  "eu-notices": "eu_notice",
  "registration-manager": "registration",
  "cppa-scope-checker": "cppa_scope",
  "cppa-risk-assessment": "cppa_risk",
  "cppa-cybersecurity": "cppa_cyber",
  "cppa-admt-checker": "cppa_admt",
};

// ── Section types ─────────────────────────────────────────────────────────
type ToolSection = "assessments" | "documents" | "cppa";

const CPPA_TOOL_SLUGS = new Set([
  "cppa-scope-checker",
  "cppa-risk-assessment",
  "cppa-cybersecurity",
  "cppa-admt-checker",
]);

// Tools that are subscriber-only — never sold standalone, never per-use.
const SUBSCRIBER_ONLY_SLUGS = new Set([
  "ropa-builder",
  "us-notices",
  "eu-notices",
]);

// Courier C — region toggle. Each slug is tagged by primary jurisdiction:
//   us  — California CPPA, US state notice, US registration
//   eu  — GDPR-family assessments and EU notice builder
//   all — jurisdiction-agnostic tools shown under both regions
type ToolRegion = "us" | "eu" | "all";
const TOOL_REGIONS: Record<string, ToolRegion> = {
  // US
  "cppa-scope-checker": "us",
  "cppa-risk-assessment": "us",
  "cppa-cybersecurity": "us",
  "cppa-admt-checker": "us",
  "us-notices": "us",
  "registration-manager": "us",
  // EU
  "healthcheck": "eu",
  "li-assessment": "eu",
  "dpia": "eu",
  "eu-notices": "eu",
  "ropa-builder": "eu",
  // Both regions
  "dpa-generator": "all",
  "ir-playbook": "all",
  "biometric-checker": "all",
};

// ── Section header definitions ────────────────────────────────────────────
const SECTION_HEADERS: Record<ToolSection, {
  label: string;
  title: string;
  note: string;
  iconPath: string;
  colors: {
    bg: string;
    iconBg: string;
    iconStroke: string;
    label: string;
    title: string;
    note: string;
    noteBg: string;
    border: string;
  };
}> = {
  assessments: {
    label: "Assessments",
    title: "Know where you stand, with cited enforcement evidence in every output",
    note: "Available individually at standalone prices",
    iconPath: "M4 3h10l3 3v11a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z M7 8h8 M7 11h6 M7 14h3",
    colors: {
      bg: "bg-blue-50",
      iconBg: "bg-blue-100",
      iconStroke: "stroke-blue-800",
      label: "text-blue-800",
      title: "text-blue-950",
      note: "text-blue-700",
      noteBg: "",
      border: "border-t-blue-600",
    },
  },
  documents: {
    label: "Compliance documents",
    title: "Produce the documents tailored to your jurisdictions and stack",
    note: "Included with any active subscription",
    iconPath: "M5 3h8l4 4v10a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z M13 3v4h4 M7 11h8 M7 14h6",
    colors: {
      bg: "bg-amber-50",
      iconBg: "bg-amber-100",
      iconStroke: "stroke-amber-900",
      label: "text-amber-800",
      title: "text-amber-950",
      note: "text-amber-700",
      noteBg: "",
      border: "border-t-amber-600",
    },
  },
  cppa: {
    label: "CPPA Suite · California",
    title: "California audit deadline: December 31, 2027 — are you in scope?",
    note: "Per-use pricing for all tiers",
    iconPath: "M9 2L2 5v5c0 4 3 7 7 8 4-1 7-4 7-8V5L9 2z M6 9h6",
    colors: {
      bg: "bg-red-50",
      iconBg: "bg-red-100",
      iconStroke: "stroke-red-800",
      label: "text-red-800",
      title: "text-red-950",
      note: "text-red-700",
      noteBg: "bg-red-100 px-2 py-0.5 rounded text-meta font-semibold",
      border: "border-t-red-600",
    },
  },
};

// ── Differentiators ───────────────────────────────────────────────────────
const DIFF_ICON = "w-7 h-7 text-brand-teal";
const DIFFERENTIATORS = [
  {
    icon: <Scale aria-hidden="true" strokeWidth={1.75} className={DIFF_ICON} />,
    title: "Calibrated to enforcement precedent, not just statutory text",
    body: "Regulatory guidance and enforcement decisions frequently diverge – what a law requires and what a regulator has actually penalised are not always the same thing.",
    checkColor: "text-brand-navy",
    checks: [
      "Thousands of decisions from regulatory authorities across the world",
      "DPA notices, ICO actions, FTC settlements, HHS OCR agreements",
      "Cited in every output: the enforcement cases behind each finding are visible and traceable",
    ],
  },
  {
    icon: <ClipboardList aria-hidden="true" strokeWidth={1.75} className={DIFF_ICON} />,
    title: "Assessments ordered by enforcement risk, not by topic area",
    body: "A compliance checklist tells you whether documentation exists. An enforcement-calibrated assessment tells you which gaps are most likely to attract scrutiny – and ranks them accordingly.",
    checkColor: "text-accent",
    checks: [
      "Scored against enforcement precedents, with cited decisions shown alongside each finding",
      "Findings ordered by likelihood of regulatory scrutiny",
      "Dated, scored output structured for professional review",
    ],
  },
  {
    icon: <FileText aria-hidden="true" strokeWidth={1.75} className={DIFF_ICON} />,
    title: "Documents drafted to survive scrutiny, not just satisfy it",
    body: "A DPA that satisfies Article 28 is table stakes. Every document here is calibrated to the failure patterns supervisory authorities have actually penalised – not to the statutory minimum.",
    checkColor: "text-amber-800",
    checks: [
      "Provisions informed by enforcement failures, with a Drafting Notes appendix citing the specific cases",
      "Jurisdiction-specific and calibrated to your processing activities",
      "Your inputs are never retained or used to train models",
    ],
  },
];

// ── Tool definition type ──────────────────────────────────────────────────
type ToolDef = {
  slug: string;
  section: ToolSection;
  icon: React.ReactNode;
  name: string;
  tagline: string;
  href: string;
  subscriberPrice: string;
  standalonePrice: string;
  monthlySubscriberPrice?: string;
  freeBadge?: string;
  alwaysFree?: boolean;
  body: string[];
  sampleSections: { label: string; content: string }[];
  requirement?: { tier: "required" | "conditional" | "expected" | "supports" | "free"; text: string };
};

const T_ICON = "w-7 h-7 text-brand-teal";
const iconEl = (I: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string }>) => (
  <I aria-hidden="true" strokeWidth={1.75} className={T_ICON} />
);

// ── Tools — ordered by section to match homepage triptych ─────────────────
const TOOLS: ToolDef[] = [
  // ── ASSESSMENTS ───────────────────────────────────────────────────────
  {
    slug: "healthcheck",
    section: "assessments",
    icon: iconEl(Shield),
    name: "GDPR Governance Assessment",
    tagline: "A structured assessment of your privacy programme across the domains regulators actually inspect.",
    href: "/governance-assessment",
    requirement: { tier: "supports", text: "Demonstrates Art. 5(2) accountability" },
    subscriberPrice: PRICING.tools.governance.display,
    standalonePrice: PRICING.tools.governance.display,
    freeBadge: "Quick scan free",
    body: [
      "A privacy programme that looks complete on paper and one that would survive a regulatory investigation are not always the same thing. The difference typically lies in whether the gaps have been identified and addressed before something goes wrong, rather than after.",
      "The GDPR Governance Assessment works through the domains that supervisory authorities focus on during formal investigations: lawful basis documentation, data subject rights processes, retention schedules, processor oversight, and security measures. Each domain is scored against enforcement precedents (not a generic best-practice checklist), and findings are ordered by the likelihood of regulatory scrutiny, not by topic area.",
      "The output is a dated, scored assessment document with cited enforcement decisions behind every risk finding. It is not a regulatory audit and does not carry the authority of one.",
      "Your assessments are your Subscriber Confidential Information and, as such, are protected as described in our Privacy Policy.",
    ],
    sampleSections: [
      { label: "Domain score", content: "Data Subject Rights Response Process – 58/100 (Needs Attention)" },
      { label: "Key finding", content: "No documented process for verifying requester identity before releasing Subject Access Request data. Supervisory authorities in multiple jurisdictions have issued formal enforcement notices for this failure in recent cases." },
      { label: "Recommended action", content: "Implement a written identity verification procedure before the next DSAR is received. Document the procedure and train all staff who handle incoming requests." },
      { label: "Enforcement context", content: "Failure to verify identity before releasing personal data has been a specific enforcement focus in the healthcare and financial sectors across multiple EU and UK DPA investigations in 2023–2024." },
    ],
  },
  {
    slug: "li-assessment",
    section: "assessments",
    icon: iconEl(Scale),
    name: "Legitimate Interest Assessment",
    tagline: "Build a complete, documented Legitimate Interest Assessment: the three-part test, done properly.",
    href: "/li-assessment",
    requirement: { tier: "expected", text: "Expected — to rely on Art. 6(1)(f)" },
    subscriberPrice: PRICING.tools.lia.display,
    standalonePrice: PRICING.tools.lia.display,
    freeBadge: "Step 1 free",
    body: [
      "Supervisory authorities across the EU and UK have been consistent on one point: it is not sufficient to have decided that legitimate interest applies. The decision must be documented, the documentation must demonstrate genuine analysis of all three limbs of the test, and it must be capable of being produced on request.",
      "The analysis draws from enforcement decisions relevant to your use case, and cites them directly in the output.",
      "The generated document is a starting point for legal review, not a replacement for it. It is structured to be presented to your legal or privacy professional for sign-off, with enforcement citations visible alongside each test verdict.",
      "Your assessments are your Subscriber Confidential Information and, as such, are protected as described in our Privacy Policy.",
    ],
    sampleSections: [
      { label: "Purpose test", content: "Processing activity: direct marketing to existing customers. Purpose is lawful, specific, and present at the time of processing. " },
      { label: "Necessity test", content: "The processing is necessary to achieve the stated purpose. Less intrusive means were considered and would not achieve the same operational objective.  with conditions noted." },
      { label: "Balancing test finding", content: "On balance, the legitimate interest is not overridden, provided: (1) an easy opt-out mechanism is provided at every point of contact, (2) sensitive categories are excluded from the dataset, and (3) the frequency of contact is limited to fortnightly." },
      { label: "Enforcement context", content: "Legitimate interest claims in direct marketing contexts have been rejected by multiple EU DPAs where no genuine balancing test was documented or where individuals had no meaningful opt-out." },
    ],
  },
  {
    slug: "dpia",
    section: "assessments",
    icon: iconEl(Search),
    name: "Impact Assessment Builder (DPIA)",
    tagline: "A complete Data Protection Impact Assessment for high-risk processing, structured to EDPB guidelines.",
    href: "/dpia-framework",
    requirement: { tier: "required", text: "Required — GDPR Art. 35" },
    subscriberPrice: PRICING.tools.dpia.display,
    standalonePrice: PRICING.tools.dpia.display,
    body: [
      "Article 35 requires a DPIA before high-risk processing begins. What regulators assess when they review a DPIA is not whether the form was completed — it is whether the risks were genuinely considered before the processing was authorised, and whether the safeguards implemented reflect that analysis.",
      "The Impact Assessment Builder produces a structured assessment aligned to EDPB guidelines, including the necessity and proportionality analysis most templates omit, with cited supervisory authority decisions.",
      "The output is designed to be reviewed by the appropriate privacy professional in your organisation and retained as part of your permanent accountability record. It is intended to form the basis of a documented professional review, not to substitute for it.",
      "Your assessments are your Subscriber Confidential Information and, as such, are protected as described in our Privacy Policy.",
    ],
    sampleSections: [
      { label: "Processing description", content: "AI-assisted recruitment screening tool processing CV data, employment history, and behavioural assessment responses for approximately 12,000 applicants per year." },
      { label: "Necessity and proportionality", content: "The volume and sensitivity of processing is proportionate to the stated purpose only if human review is mandatory for all shortlisted candidates and the system is not used as the sole basis for rejection." },
      { label: "Risk identified", content: "High — Automated decision-making without meaningful human review may constitute a violation of Article 22. Additional safeguard required: documented human review step before any decision affecting a candidate is made." },
      { label: "Enforcement context", content: "Automated recruitment screening without documented human oversight has been the subject of formal DPA investigations in multiple EU member states." },
    ],
  },
  {
    slug: "biometric-checker",
    section: "assessments",
    icon: iconEl(Fingerprint),
    name: "Biometric Privacy Compliance Assessment",
    tagline: "Per-jurisdiction compliance assessment for biometric data. Free account required.",
    href: "/biometric-checker",
    requirement: { tier: "required", text: "Required — Illinois BIPA" },
    subscriberPrice: PRICING.tools.biometric.display,
    standalonePrice: PRICING.tools.biometric.display,
    body: [
      "Biometric data obligations are complex, jurisdiction-specific, and frequently underestimated. GDPR Article 9 conditions apply across the EU and EEA. BIPA in Illinois creates direct statutory liability — $1,000 to $5,000 per violation per individual — with courts interpreting violation broadly. Texas, Washington, and other US jurisdictions have their own frameworks.",
      "The analysis incorporates current enforcement posture (what regulators and courts are actively scrutinising), and cites the specific corpus decisions behind every priority action.",
      "The assessment is designed to be the starting point for a conversation with your privacy or legal team. Multi-jurisdiction assessments are included with Professional subscriptions.",
      "Your assessments are your Subscriber Confidential Information and, as such, are protected as described in our Privacy Policy.",
    ],
    sampleSections: [
      { label: "Illinois (BIPA) – applies: Yes", content: "Key requirement: Written release from each individual before collecting or using biometric identifiers. Release must specifically describe the purpose and duration of collection. Oral consent is not sufficient." },
      { label: "BIPA litigation risk estimate", content: "Based on 8,000 enrolled employees: Low end (negligent violations): $8,000,000. High end (intentional violations): $40,000,000. This is a mathematical illustration of statutory exposure only — not a legal opinion or prediction of outcome." },
      { label: "Enforcement posture — current", content: "Courts have recently expanded the definition of collection to include passive scanning. Consent obtained via embedded website terms has been successfully challenged. Class action filings targeting employers are increasing." },
      { label: "Priority action", content: "Implement a standalone written consent process before any biometric collection begins. Retain signed consents. Establish a documented retention and destruction schedule." },
    ],
  },

  // ── COMPLIANCE DOCUMENTS ──────────────────────────────────────────────
  {
    slug: "dpa-generator",
    section: "documents",
    icon: iconEl(FileSignature),
    name: "DPA Generator",
    tagline: "Your custom GDPR Article 28-compliant Data Processing Agreement, calibrated to real enforcement failures.",
    href: "/dpa-generator",
    requirement: { tier: "required", text: "Required — GDPR Art. 28" },
    subscriberPrice: PRICING.tools.dpa.display,
    standalonePrice: PRICING.tools.dpa.display,
    body: [
      "A Data Processing Agreement that satisfies the statutory text of Article 28 is table stakes. The agreements that hold up under regulatory scrutiny are those whose specific provisions address the failure patterns that supervisory authorities have actually penalised — absent sub-processor notification timelines, inadequate audit right formulations, vague security measure specifications.",
      "Before generating your document, the tool reviews enforcement decisions involving comparable controller-processor relationships, data categories, and jurisdictions. Every provision reflects that intelligence, and a Drafting Notes appendix cites the specific decisions.",
      "This tool generates a draft legal document. It does not constitute legal advice, and the output should be reviewed by qualified legal counsel before execution.",
    ],
    sampleSections: [
      { label: "Sub-processor provisions (Article 28(4))", content: "The Processor shall not engage any sub-processor without the prior specific written authorisation of the Controller. The Processor shall notify the Controller no fewer than 14 days before engaging any new sub-processor or replacing an existing one." },
      { label: "Breach notification (Article 33)", content: "The Processor shall notify the Controller without undue delay and in any event within 24 hours of becoming aware of a Personal Data Breach, whether confirmed or suspected." },
      { label: "Enforcement context applied", content: "Supervisory authorities have found that the absence of a specific sub-processor notification deadline in a DPA is itself a compliance failure. This provision reflects that enforcement posture directly." },
    ],
  },
  {
    slug: "ir-playbook",
    section: "documents",
    icon: iconEl(Siren),
    name: "Incident Response Playbook",
    tagline: "Your complete breach response playbook: deadlines, regulator portal links, and notification templates.",
    href: "/ir-playbook",
    requirement: { tier: "supports", text: "Supports breach-notification duties" },
    subscriberPrice: PRICING.tools.ir_playbook.display,
    standalonePrice: PRICING.tools.ir_playbook.display,
    freeBadge: "Deadline lookup free",
    body: [
      "Effective breach response is almost entirely a function of preparation. Organisations that know their notification deadlines, their regulator portal URLs, and their minimum content requirements before an incident occurs consistently achieve better outcomes (faster resolution, stronger regulatory relationships, and more defensible documentation) than those that begin from scratch under time pressure.",
      "Enforcement decisions involving notification failures in comparable contexts are incorporated into the timeline and content guidance and cited directly in the output.",
      "The output includes a documentation checklist aligned to Article 33(5) — the accountability record that regulators expect to see demonstrating that your organisation's response was systematic and timely. For Professional subscribers, this tool is included at no additional cost.",
    ],
    sampleSections: [
      { label: "Immediate actions (0–2 hours)", content: "1. Assemble incident response team: IR Lead, DPO, Legal Counsel, IT Security. 2. Preserve all evidence — do not delete or modify logs. 3. Isolate affected systems from the network. 4. Document discovery time (UTC) and the name of the person who discovered the incident." },
      { label: "Notification deadline — ICO (UK)", content: "Deadline: 72 hours from discovery (calculated from your input). Portal: ico.org.uk/make-a-complaint/data-security-and-journalism/report-a-breach/. Initial notification may be submitted with incomplete information if full details are not yet available." },
      { label: "Documentation checklist (Article 33(5))", content: " Discovery time and circumstances documented.  Nature of breach and data categories recorded.  Approximate number of affected individuals noted.  Notification decision and rationale recorded.  Steps taken to contain and remediate documented." },
    ],
  },
  {
    slug: "ropa-builder",
    section: "documents",
    icon: iconEl(Folder),
    name: "RoPA Builder (Article 30)",
    tagline: "Build and maintain your Article 30 Record of Processing Activities — by activity, by platform, by jurisdiction. Included with any subscription.",
    href: "/ropa-builder",
    requirement: { tier: "required", text: "Required — GDPR Art. 30" },
    subscriberPrice: PRICING.tools.ropa.display,
    standalonePrice: PRICING.tools.ropa.display,
    body: [
      "Article 30 RoPAs look administrative until a regulator asks for them. Then the gap between a spreadsheet that nominally lists processing activities and a record that actually demonstrates accountability becomes immediately visible. The RoPA Builder is structured around the latter.",
      "Activities are organised per-platform and per-jurisdiction. Each entry captures the lawful basis, data categories, recipients, retention rules, and international transfer safeguards in the structure supervisory authorities expect to see — with prompts calibrated to your sector and the platforms you've already named.",
      "The output is a versioned, dated record intended to be reviewed by your privacy or legal professional and retained as part of your accountability documentation. RoPA Builder is included with any Intelligence or Professional subscription (monthly or annual) and is not sold as a standalone product.",
      "The output of this tool is your Subscriber Confidential Information and, as such, is protected as described in our Privacy Policy.",
    ],
    sampleSections: [
      { label: "Activity record (sample)", content: "Customer support ticketing — Zendesk. Lawful basis: Article 6(1)(b) contract performance. Data categories: contact data, support correspondence content. Retention: 24 months from ticket close. Recipients: Zendesk (processor, US), internal support team." },
      { label: "International transfer safeguard", content: "Transfer to US (Zendesk): EU–US Data Privacy Framework adequacy decision relied upon. Backup safeguard: SCCs in DPA. Transfer impact assessment dated 2024-09 retained." },
    ],
  },
  {
    slug: "us-notices",
    section: "documents",
    icon: "🇺🇸",
    name: "U.S. Privacy Notice Builder",
    tagline: "State-specific consumer privacy notices for CCPA, Virginia, Colorado, and other US state privacy laws.",
    href: "/us-notices",
    requirement: { tier: "required", text: "Required — CCPA notice-at-collection" },
    subscriberPrice: PRICING.tools.us_notice.display,
    standalonePrice: PRICING.tools.us_notice.display,
    body: [
      "US state privacy laws are not interchangeable. CCPA disclosure requirements differ from Virginia's, which differ from Colorado's, which differ again from the more recent state laws. A single 'US privacy notice' that does not surface those differences is itself a compliance risk — and increasingly, an enforcement one.",
      "The U.S. Privacy Notice Builder produces state-specific notices that include the disclosures each statute actually requires: categories of personal information, sources, purposes, sale and sharing disclosures, sensitive data handling, and consumer rights mechanisms. State-specific overlays are applied automatically based on the jurisdictions you select.",
      "The output is a draft notice for review by your privacy or legal professional before publication. It is structured to be read by counsel quickly (clearly delineating the state-specific provisions from the universal ones), and to be updated as state laws continue to evolve. The U.S. Privacy Notice Builder is included with any Intelligence or Professional subscription (monthly or annual) and is not sold as a standalone product.",
    ],
    sampleSections: [
      { label: "California (CCPA/CPRA) — sensitive personal information", content: "We collect the following categories of sensitive personal information: government identifiers, account log-in credentials, and precise geolocation. You have the right to limit the use and disclosure of this information." },
      { label: "Virginia (VCDPA) — consumer rights", content: "Virginia consumers have the right to: (1) confirm whether we are processing their personal data, (2) access that data, (3) correct inaccuracies, (4) delete data we hold about them, (5) obtain a portable copy, and (6) opt out of targeted advertising, sale, and certain profiling." },
    ],
  },
  {
    slug: "eu-notices",
    section: "documents",
    icon: "🇪🇺",
    name: "EU/UK Privacy Notice Builder",
    tagline: "GDPR & UK GDPR-aligned privacy notices with Article 13/14 disclosures and international transfer language.",
    href: "/eu-notices",
    requirement: { tier: "required", text: "Required — GDPR Art. 13–14" },
    subscriberPrice: PRICING.tools.eu_notice.display,
    standalonePrice: PRICING.tools.eu_notice.display,
    body: [
      "Article 13 and 14 set out what a GDPR-compliant notice must contain. The gap between meeting those requirements on paper and producing a notice that withstands scrutiny is, in practice, the gap between checkbox compliance and an accountability posture that holds up.",
      "The EU/UK Privacy Notice Builder produces a GDPR and UK GDPR-aligned notice covering each Article 13/14 disclosure: identity of the controller, contact details, lawful basis per processing purpose, recipients, retention, international transfer safeguards, and data subject rights. International transfer language is calibrated to the destinations and mechanisms you specify (SCCs, adequacy, derogations).",
      "The generated notice is structured for review by your privacy or legal professional and intended to be the basis of a documented review, not a substitute for one. The EU/UK Privacy Notice Builder is included with any Intelligence or Professional subscription (monthly or annual) and is not sold as a standalone product.",
    ],
    sampleSections: [
      { label: "Lawful basis (per purpose)", content: "Account creation and management: Article 6(1)(b) — necessary for performance of a contract. Marketing communications: Article 6(1)(a) — consent (withdrawable at any time). Fraud prevention: Article 6(1)(f) — legitimate interest, balancing test documented and available on request." },
      { label: "International transfers", content: "Personal data may be transferred to the United States to our processors. The transfer relies on the EU Commission's adequacy decision under the EU–US Data Privacy Framework and on Standard Contractual Clauses as a backup safeguard." },
    ],
  },
  {
    slug: "registration-manager",
    section: "documents",
    icon: iconEl(ClipboardList),
    name: "Registration Manager",
    tagline: "Identify where your organisation must register, generate the filings, and stay on top of deadlines. Renewal tracking included with any subscription. You submit the filings.",
    href: "/registration-manager",
    requirement: { tier: "required", text: "Required in some jurisdictions (e.g. UK ICO fee)" },
    subscriberPrice: PRICING.tools.registration.display,
    standalonePrice: PRICING.tools.registration.display,
    body: [
      "Most privacy programmes know they need to register a DPO somewhere. Far fewer have a current, jurisdiction-by-jurisdiction map of where formal registration with the supervisory authority is mandatory, where an EU/UK representative must be appointed, where the AI Act register applies, and when each filing must be renewed.",
      "The Registration Manager begins with a free assessment: organisation type, size, sectors, and the markets in which you operate. From that, it produces a recommended registration footprint across 50+ jurisdictions — flagging where DPO registration, controller registration, representative appointment, and AI Act notification are required, and on what timeline.",
      "Every output is a structured document intended for review by your privacy or legal professional before submission. We do not submit filings on your behalf. Renewal deadline tracking is included with any active End User Privacy subscription, so the obligation does not quietly lapse a year later.",
    ],
    sampleSections: [
      { label: "Recommended jurisdictions (sample)", content: "Germany (BfDI / state DPA), France (CNIL), Italy (Garante), Spain (AEPD), United Kingdom (ICO), Ireland (DPC). AI Act registration: required for one EU deployment. EU representative: required (no establishment in the Union)." },
      { label: "Filing summary — Germany", content: "DPO designation must be notified to the competent state DPA in writing. Filing language: German. Renewal: not required, but updates within 30 days of personnel change. Online filing: state-dependent." },
      { label: "Counsel-Ready Pack deliverable", content: "Per-jurisdiction document set including: cover letter draft in local language, DPO designation form, RoPA template aligned to local DPA expectations, and AI Act registration entry where applicable — packaged with a counsel handoff brief. You submit the filings." },
      { label: "Renewal tracking (included with subscription)", content: "Subscribers get automated reminders at 90, 60, 30, and 7 days before each filing's renewal date, with a link to the most recent generated version of your filing for re-use — included free with any active subscription." },
    ],
  },

  // ── CPPA SUITE ────────────────────────────────────────────────────────
  {
    slug: "cppa-scope-checker",
    section: "cppa",
    icon: iconEl(Search),
    name: "CPPA Scope Checker",
    tagline: "Find out if your organisation is in scope for CCPA/CPRA and the 2027 CPPA audit — always free, no account required.",
    href: "/cppa-scope-checker",
    requirement: { tier: "free", text: "Free — see what you're required to do" },
    subscriberPrice: PRICING.tools.cppa_scope.display,
    standalonePrice: PRICING.tools.cppa_scope.display,
    alwaysFree: true,
    body: [
      "The CPPA formally stood up its Audits Division in February 2026. The December 31, 2027 deadline for existing processing activities is not a proposed regulation — it is in effect. Before investing in risk assessment or cybersecurity audit work, the first question is always: does your organisation meet the thresholds that trigger the obligation?",
      "The CPPA Scope Checker works through eight questions covering revenue thresholds, data processing volumes, the types of personal information involved, and whether your processing of personal information presents a significant risk to consumers. The result is a clear obligation map — which CPPA audit requirements apply, on what timeline, and what you need to do next.",
      "Every threshold and trigger is mapped to the underlying authority — the Cal. Civ. Code sections of the CCPA/CPRA, the CPPA's implementing regulations, and the agency's own statements of reasoning in the Final Statement of Reasons (FSOR). You see the source behind each obligation, not a paraphrase.",
      "No account is required. The tool is free for all users and always will be.",
    ],
    sampleSections: [
      { label: "Threshold analysis", content: "Annual gross revenue: exceeds $25M threshold . Personal information of 100,000+ consumers: . Derives 50%+ of revenue from selling/sharing personal information: not applicable. Result: CCPA/CPRA obligations apply." },
      { label: "Audit obligation — CPPA Risk Assessment", content: "Your processing of personal information presents a significant risk to consumers' privacy. A formal risk assessment is required before December 31, 2027 under CPPA regulations." },
      { label: "Recommended next step", content: "Proceed to the CPPA Risk Assessment tool. The assessment must be documented in the structure the CPPA specifies and retained for regulatory review." },
    ],
  },
  {
    slug: "cppa-risk-assessment",
    section: "cppa",
    icon: iconEl(ShieldAlert),
    name: "CPPA Risk Assessment",
    tagline: "California-specific risk assessment aligned to the CPPA's risk assessment regulations.",
    href: "/cppa-risk-assessment",
    requirement: { tier: "conditional", text: "Required if in scope — due Dec 31, 2027" },
    subscriberPrice: PRICING.tools.cppa_risk.display,
    standalonePrice: PRICING.tools.cppa_risk.display,
    body: [
      "The CPPA's risk assessment regulations require businesses processing personal information that presents a significant risk to consumers' privacy or security to conduct and document a structured risk assessment. The substance of that assessment — not the cover sheet — is what determines whether it satisfies the regulation.",
      "The CPPA Risk Assessment walks through the categories the CPPA specifies: the purpose of processing, the categories of personal information involved, the operational elements of the processing, the benefits, the negative impacts to consumers, and the safeguards that mitigate those impacts. Outputs are produced in the structure the CPPA expects to see in its initial reviews.",
      "Every domain finding cites the underlying authority — the statute (Cal. Civ. Code § 1798.x), the implementing regulation (Cal. Code Regs. tit. 11 § 7150 et seq.), the CPPA's own reasoning in the Final Statement of Reasons, and any on-point AG or CPPA enforcement action. The result is a current obligation snapshot you can defend in regulatory review, with the source text attached to each conclusion. After completion, a Control-Drift Monitor schedules an annual re-run nudge so the assessment doesn't go stale.",
      `Standalone per-use price: ${PRICING.tools.cppa_risk.display}. The output is structured for review by California privacy counsel before being relied upon.`,
      "Your assessments are your Subscriber Confidential Information and, as such, are protected as described in our Privacy Policy.",
    ],
    sampleSections: [
      { label: "Processing description", content: "Behavioural advertising profile development using web browsing data collected via cookies and SDK telemetry across owned properties and third-party publishers." },
      { label: "Negative impacts identified", content: "Loss of consumer control over personal information; potential for inferred sensitive characteristics (health interests, political views) without consumer awareness; increased exposure in the event of a data breach." },
    ],
  },
  {
    slug: "cppa-cybersecurity",
    section: "cppa",
    icon: iconEl(Lock),
    name: "CPPA Cybersecurity Audit",
    tagline: "Structured cybersecurity audit aligned to the CPPA's cybersecurity audit regulations.",
    href: "/cppa-cybersecurity",
    requirement: { tier: "conditional", text: "Required above CCPA thresholds — first cert Apr 1, 2028" },
    subscriberPrice: PRICING.tools.cppa_cyber.display,
    standalonePrice: PRICING.tools.cppa_cyber.display,
    body: [
      "The CPPA's cybersecurity audit regulations require qualifying businesses to conduct annual cybersecurity audits covering specified components — access controls, multi-factor authentication, encryption, vulnerability management, incident response, and more. The audit must be thorough, independent, and documented.",
      "The CPPA Cybersecurity Audit Tool produces a structured assessment across each of the 18 components enumerated at Cal. Code Regs. tit. 11 § 7122(a), and tests independence and scope-memo requirements at § 7122(b) and § 7123. Each control finding is anchored to the regulatory text, the CPPA's reasoning in the Final Statement of Reasons, and a dynamic Breach Precedent Map that surfaces the most relevant recent CPPA and California AG enforcement actions for any gap or critical gap. An Auditor Independence Advisor, Audit Scope Memo Generator, and combined Auditor Handoff Package are included.",
      `Standalone per-use price: ${PRICING.tools.cppa_cyber.display}. The April 1, 2028 certification deadline applies to businesses with annual revenue exceeding $100M. The output is intended to be reviewed by your security and legal teams.`,
      "The output of this tool is your Subscriber Confidential Information and, as such, is protected as described in our Privacy Policy.",
    ],
    sampleSections: [
      { label: "Multi-factor authentication finding", content: "MFA is enforced for administrative access to production systems but not for general employee access to systems containing personal information. The CPPA regulation expects MFA for both. Remediation: enable MFA for all employee access to PI-containing systems within 90 days." },
      { label: "Encryption coverage", content: "Personal information is encrypted at rest in primary databases. Backups stored in third-party cloud storage are not encrypted at the application layer. Recommended: implement application-layer encryption for backups before next renewal cycle." },
    ],
  },
  {
    slug: "cppa-admt-checker",
    section: "cppa",
    icon: iconEl(Bot),
    name: "ADMT Compliance Assessment",
    tagline: "Module 3 — pre-use notice, opt-out, and access right gap analysis for automated decisionmaking systems. January 1, 2027 deadline.",
    href: "/cppa-admt-checker",
    requirement: { tier: "conditional", text: "Required for ADMT decisions — by Jan 1, 2027" },
    subscriberPrice: (PRICING.tools as any).cppa_admt?.display ?? "$49",
    standalonePrice: (PRICING.tools as any).cppa_admt?.display ?? "$99",
    body: [
      "The CPPA's automated decisionmaking technology regulations take effect January 1, 2027. Businesses that use ADMT for significant decisions — credit, housing, education, employment, healthcare — must provide a pre-use notice, offer two opt-out methods (or qualify for a narrow exception), and respond to consumer access requests with plain-language information about the logic and outcome of the decision.",
      "The ADMT Compliance Assessment walks through one ADMT system at a time. Each answer updates a persistent Statute Rail showing the exact regulation text, the agency's reasoning in the Final Statement of Reasons, and enforcement notes. The output is a gap analysis — every finding cites the specific paragraph of 11 CCR §§ 7220–7222 it relates to, with a concrete remediation step.",
      "Gap analysis for ADMT pre-use notices, opt-out obligations, and access rights. Cited to 11 CCR §§ 7200–7222. January 1, 2027 deadline.",
    ],
    sampleSections: [
      { label: "Pre-use notice — sample gap", content: "§ 7220(c)(1): notice describes the purpose as 'to make a credit decision' — generic. Remediation: revise to name the specific decision, e.g. 'to score and approve or decline this loan application.'" },
      { label: "Opt-out — sample gap", content: "§ 7221(c): only one opt-out method provided (email). Remediation: add a second method (interactive online form linked from the Pre-use Notice with the title 'Opt-out of Automated Decisionmaking Technology')." },
    ],
  },
];

const PRICING_GRID: [string, string][] = [
  ["GDPR Governance Assessment", `${PRICING.tools.governance.display} (Smart)`],
  ["Legitimate Interest Assessment", `${PRICING.tools.lia.display} (Smart)`],
  ["Impact Assessment (DPIA)", `${PRICING.tools.dpia.display} (Smart)`],
  ["DPA Generator", `Included with subscription · ${PRICING.tools.dpa.display} standalone`],
  ["Incident Response Playbook", `Included with subscription · ${PRICING.tools.ir_playbook.display} standalone`],
  ["Biometric Privacy Check", `Included with subscription · ${PRICING.tools.biometric.display} standalone`],
  ["RoPA Builder", "Included with subscription"],
  ["U.S. Privacy Notice Builder", "Included with subscription"],
  ["EU/UK Privacy Notice Builder", "Included with subscription"],
  ["Registration Manager", `${PRICING.tools.registration.display} (Convenience)`],
  ["CPPA Scope Checker", PRICING.tools.cppa_scope.display],
  ["CPPA Risk Assessment", `${PRICING.tools.cppa_risk.display} (Smart)`],
  ["CPPA Cybersecurity Audit", `${PRICING.tools.cppa_cyber.display} (Smart)`],
  ["ADMT Compliance Assessment", `${(PRICING.tools as any).cppa_admt?.display ?? '$99'} (Smart)`],
  ["Annual subscription bonus", "1 free Smart Tool run/yr (Intelligence) · 3 free Smart Tool runs/yr (Professional): Governance, LIA, or DPIA"],
];

export default function Tools() {
  const [sampleModal, setSampleModal] = useState<string | null>(null);
  const activeTool = sampleModal ? TOOLS.find((t) => t.slug === sampleModal) : null;
  const { hasToolAccess, tier } = useSubscriptionTier();
  const fireConversion = useConversionEvent();
  const { user } = useAuth();
  const userType = user ? "authenticated" : "anonymous";

  // Courier C — ?region=us|eu filters the tool grid; anything else = all.
  const [searchParams, setSearchParams] = useSearchParams();
  const rawRegion = (searchParams.get("region") ?? "").toLowerCase();
  const region: "us" | "eu" | "all" =
    rawRegion === "us" ? "us" : rawRegion === "eu" ? "eu" : "all";

  const inRegion = (slug: string): boolean => {
    if (region === "all") return true;
    const tag = TOOL_REGIONS[slug] ?? "all";
    return tag === region || tag === "all";
  };

  const setRegion = (r: "us" | "eu" | "all") => {
    const next = new URLSearchParams(searchParams);
    if (r === "all") next.delete("region");
    else next.set("region", r);
    setSearchParams(next, { replace: true });
  };

  const sections: ToolSection[] = ["assessments", "documents", "cppa"];
  const toolsBySection = sections
    .map((sec) => ({
      section: sec,
      tools: TOOLS.filter((t) => t.section === sec && inRegion(t.slug)),
    }))
    .filter((s) => s.tools.length > 0);

  return (
    <>
      <Helmet>
        <title>Privacy Compliance Tools | End User Privacy</title>
        <meta name="description" content="Privacy compliance tools built on 3,700+ enforcement decisions. Available individually at standalone prices." />
      </Helmet>
      <Navbar />
      <DashboardSubnav />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <header className="bg-[#1f6674] text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-semibold rounded-full bg-black/30 text-white mb-3">
            <Wrench aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Compliance Tools
          </span>
          <h1 className="font-serif text-white mb-3">
            Intelligence, assessments, and compliance documents
          </h1>
          <p className="text-white/95 text-lg max-w-3xl">
            Every tool draws from our comprehensive repository of actual laws, regulations, regulatory enforcement actions and guidance before producing a single word of output. Available individually at standalone prices. Every report can be translated into more than 20 languages from the report page.
          </p>
          <div className="flex gap-3 mt-6 flex-wrap">
            <Link to="/subscribe" onClick={() => fireConversion("subscribe_cta_click", { cta_label: "Start 10-day Intelligence trial", cta_position: "hero" })} className="text-sm font-semibold text-slate-900 bg-white px-5 py-2.5 rounded-lg hover:opacity-90 transition no-underline">
              Start 10-day Intelligence trial ({INTELLIGENCE_PRICING.monthlyShort()}) →
            </Link>
            <a href="#tools" className="text-sm font-semibold text-white border border-slate-500 px-5 py-2.5 rounded-lg hover:bg-slate-800 transition no-underline">
              See the tools ↓
            </a>
          </div>
        </div>
      </header>

      {/* ── Differentiators ────────────────────────────────────────────── */}
      <div className="bg-background py-14 px-4">
        <div className="max-w-[1100px] mx-auto grid md:grid-cols-3 gap-5">
          {DIFFERENTIATORS.map((d) => (
            <div key={d.title} className="bg-card border border-brand-cloud rounded-2xl p-6">
              <div className="mb-3">{d.icon}</div>
              <h3 className="text-card-title text-gray-900 mb-3 leading-snug">{d.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{d.body}</p>
              <hr className="my-4 border-t border-brand-cloud" />
              <ul className="space-y-1.5">
                {d.checks.map((c) => (
                  <li key={c} className="flex gap-2 text-xs text-slate leading-snug">
                    <span className={`${d.checkColor} font-bold flex-shrink-0`}><CheckCircle2 aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /></span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── U-S Selector (deterministic, static, no fetch/LLM) ─────────── */}
      <ToolsSelector tools={TOOLS} sampleSlugMap={SAMPLE_SLUG_MAP} />

      {/* ── Region toggle (Courier C) ──────────────────────────────────── */}
      <div className="bg-brand-cloud border-t border-brand-cloud">
        <div className="max-w-[1100px] mx-auto px-4 py-4 flex flex-wrap items-center gap-3">
          <span className="text-eyebrow text-brand-navy">Filter by jurisdiction:</span>
          <div className="inline-flex rounded-full border border-brand-cloud bg-card p-1" role="tablist" aria-label="Jurisdiction filter">
            {(["all", "us", "eu"] as const).map((r) => {
              const active = region === r;
              const label = r === "all" ? "All" : r === "us" ? "US · California" : "EU / UK";
              return (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setRegion(r)}
                  className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                    active
                      ? "bg-brand-navy text-white"
                      : "text-brand-navy hover:bg-brand-cloud"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {region !== "all" && (
            <span className="text-meta text-slate">
              Showing tools relevant to {region === "us" ? "US / California" : "EU / UK GDPR"} jurisdictions.
            </span>
          )}
        </div>
      </div>

      {/* ── Grouped tool sections ──────────────────────────────────────── */}
      <div id="tools" className="border-t border-brand-cloud">
        {toolsBySection.map(({ section, tools }, secIdx) => {
          const hdr = SECTION_HEADERS[section];
          return (
            <div key={section}>
              {/* Section header */}
              <div className={`border-t-[3px] ${hdr.colors.border} ${hdr.colors.bg} px-4 py-5`}>
                <div className="flex items-center gap-3 max-w-[1100px] mx-auto w-full justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${hdr.colors.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <svg className={`w-[18px] h-[18px] ${hdr.colors.iconStroke}`} viewBox="0 0 18 18" fill="none" strokeWidth="1.8" strokeLinecap="round">
                        <path d={hdr.iconPath} />
                      </svg>
                    </div>
                    <div>
                      <p className={`text-eyebrow ${hdr.colors.label} mb-0.5`}>
                        {hdr.label}
                      </p>
                      <p className={`text-base font-semibold ${hdr.colors.title}`}>
                        {hdr.title}
                      </p>
                    </div>
                  </div>
                  <p className={`text-meta font-medium ${hdr.colors.note} ${hdr.colors.noteBg} hidden sm:block flex-shrink-0`}>
                    {hdr.note}
                  </p>
                </div>
              </div>

              {/* Tools within this section */}
              {tools.map((tool, toolIdx) => (
                <div
                  key={tool.slug}
                  id={secIdx === 0 && toolIdx === 0 ? "tools-list" : undefined}
                  className="max-w-[860px] mx-auto px-4 py-12 border-b border-brand-cloud last:border-0"
                >
                  {/* Tool header row — icon and pricing pill share the top line */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="text-[28px] leading-none">{tool.icon}</div>

                      {/* Pricing pill — uniform design across all states */}
                      <div className="shrink-0 text-right">
                        {tool.alwaysFree ? (
                          <span className="inline-block text-eyebrow bg-green-100 text-green-800 border border-green-200 px-3 py-1 rounded-full">
                            Always free
                          </span>
                        ) : SUBSCRIBER_ONLY_SLUGS.has(tool.slug) ? (
                          <span className="inline-block text-eyebrow bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full">
                            Included with subscription
                          </span>
                        ) : hasToolAccess && !CPPA_TOOL_SLUGS.has(tool.slug) ? (
                          <span className="inline-block text-eyebrow bg-green-100 text-green-800 border border-green-200 px-3 py-1 rounded-full">
                            <CheckCircle2 aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> Included
                          </span>
                        ) : hasToolAccess && CPPA_TOOL_SLUGS.has(tool.slug) ? (
                          <span className="inline-block text-eyebrow bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
                            {tool.subscriberPrice}
                          </span>
                        ) : tier === "monthly" ? (
                          <span className="inline-block text-eyebrow bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">
                            ⭐ {tool.monthlySubscriberPrice ?? tool.standalonePrice}
                          </span>
                        ) : (
                          <span className="inline-block text-eyebrow bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">
                            ⭐ {tool.standalonePrice}
                          </span>
                        )}
                      </div>
                    </div>

                    <h2 className="font-display text-brand-navy mb-1">{tool.name}</h2>
                    <p className="text-sm text-gray-600">{tool.tagline}</p>
                    {tool.requirement && (
                      <RequirementBadge tier={tool.requirement.tier} text={tool.requirement.text} className="mt-1.5" />
                    )}
                    {tool.freeBadge && (
                      <span className="inline-block mt-1.5 text-eyebrow bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                        <CheckCircle2 aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /> {tool.freeBadge}
                      </span>
                    )}
                    {!tool.alwaysFree && (
                      <div className="text-meta text-muted-foreground mt-2">
                        {SUBSCRIBER_ONLY_SLUGS.has(tool.slug)
                          ? hasToolAccess
                            ? "Included in your subscription"
                            : "Subscriber-only: not sold standalone"
                          : hasToolAccess && !CPPA_TOOL_SLUGS.has(tool.slug)
                          ? "Included in your Professional"
                          : hasToolAccess && CPPA_TOOL_SLUGS.has(tool.slug)
                          ? "Paid: subscriber rate applied"
                          : tier === "monthly" && tool.monthlySubscriberPrice
                          ? "Monthly subscriber discount"
                          : `${tool.standalonePrice} without subscription`}
                      </div>
                    )}
                    {INCLUDED_GENERATIONS_SLUGS.has(tool.slug) && (
                      <>
                        <p className="text-body-small text-ink mt-1">
                          Includes 4 generations: your initial report plus up to 3 revisions at no extra cost.
                        </p>
                        {TOPUP_TIER1_SLUGS.has(tool.slug) && (
                          <p className="text-body-small text-ink mt-1">
                            Need more? Add 4 additional generations for half the tool price.
                          </p>
                        )}
                      </>
                    )}
                    {SAMPLE_SLUG_MAP[tool.slug] && (
                      <div className="mt-2">
                        <SampleReportLink
                          toolSlug={SAMPLE_SLUG_MAP[tool.slug]}
                          variant="link"
                          label="See a sample →"
                        />
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  {tool.body.map((p, i) => (
                    <p key={i} className="text-sm text-gray-600 leading-relaxed mb-4">{p}</p>
                  ))}

                  {/* CTAs */}
                  <div className="flex gap-4 flex-wrap mt-6">
                    <button
                      onClick={() => setSampleModal(tool.slug)}
                      className="text-sm font-semibold text-primary border border-primary/30 px-5 py-2.5 rounded-xl hover:bg-primary/5 transition-all bg-transparent cursor-pointer"
                    >
                      See a sample output →
                    </button>
                    {SUBSCRIBER_ONLY_SLUGS.has(tool.slug) && !hasToolAccess ? (
                      <Link to="/subscribe" onClick={() => fireConversion("subscribe_cta_click", { cta_label: "Subscribe to access", cta_position: "pricing-card-intelligence" })} className="text-sm font-semibold text-white bg-brand-navy px-5 py-2.5 rounded-xl hover:opacity-90 transition-all no-underline">
                        Subscribe to access →
                      </Link>
                    ) : (
                      <Link
                        to={tool.href}
                        onClick={() =>
                          fireConversion("tool_start_click", { tool_slug: tool.slug, page_path: "/tools", user_type: userType })
                        }
                        className="text-sm font-semibold text-white bg-brand-navy px-5 py-2.5 rounded-xl hover:opacity-90 transition-all no-underline"
                      >
                        Open tool →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* ── Closing pricing section ───────────────────────────────────── */}
      <div className="bg-gradient-to-br from-brand-navy to-brand-ocean py-14 px-4">
        <div className="max-w-[760px] mx-auto text-center">
          <h2 className="font-display text-white mb-4">
            Available individually at standalone prices.
          </h2>
          <p className="text-brand-cloud text-sm leading-relaxed max-w-[540px] mx-auto mb-8">
            Every tool is pay-per-use.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-[580px] mx-auto mb-8">
            {PRICING_GRID.map(([name, price]) => (
              <div key={name} className="bg-white/10 rounded-xl px-3 py-2.5 text-left">
                <p className="text-white/70 text-meta mb-0.5">{name}</p>
                <p className="text-white font-bold text-sm">{price}</p>
              </div>
            ))}
          </div>
          <Link to="/subscribe" onClick={() => fireConversion("subscribe_cta_click", { cta_label: "Start 10-day Intelligence trial", cta_position: "article-footer" })} className="inline-block text-sm font-semibold text-brand-navy bg-white px-6 py-3 rounded-xl hover:opacity-90 transition-all no-underline">
            Start 10-day Intelligence trial →
          </Link>
          <p className="text-brand-cloud/60 text-meta mt-4">
            Intelligence {INTELLIGENCE_PRICING.monthlyShort()} (10-day free trial) · Professional {PLATFORM_PRICING.standardMonthly()} + {PLATFORM_PRICING.clientAddon()} · Cancel any time
          </p>
        </div>
      </div>

      {/* ── Sample output modal ───────────────────────────────────────── */}
      {activeTool && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setSampleModal(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl max-w-[680px] w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-brand-navy px-6 py-4 rounded-t-2xl flex items-center justify-between sticky top-0">
              <div>
                <p className="text-eyebrow text-brand-mist mb-0.5">Sample Output</p>
                <p className="text-white font-semibold text-base">{activeTool.name}</p>
              </div>
              <button
                onClick={() => setSampleModal(null)}
                className="text-white/60 hover:text-white text-[24px] bg-transparent border-none cursor-pointer leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-meta text-muted-foreground italic border-b border-border pb-4">
                This is a representative sample showing the structure and depth of a real output. Content is illustrative: your generated document will reflect your specific inputs and current enforcement intelligence.
              </p>
              {activeTool.sampleSections.map((section, i) => (
                <div key={i} className="bg-muted/40 rounded-xl p-4 border border-border">
                  <p className="text-eyebrow text-primary mb-2">{section.label}</p>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{section.content}</p>
                </div>
              ))}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-meta font-bold text-blue-800 mb-1">
                  How the enforcement intelligence layer works
                </p>
                <p className="text-meta text-blue-700 leading-relaxed">
                  Before generating output, the tool reviewed enforcement decisions from a structured database of 3,700+ cases relevant to your inputs.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Link
                  to={activeTool.href}
                  onClick={() => {
                    fireConversion("tool_start_click", { tool_slug: activeTool.slug, page_path: "/tools", user_type: userType });
                    setSampleModal(null);
                  }}
                  className="flex-1 text-center bg-brand-navy text-white font-semibold text-sm py-3 rounded-xl hover:opacity-90 transition-all no-underline"
                >
                  Open {activeTool.name} →
                </Link>
                <Link
                  to="/subscribe"
                  onClick={() => {
                    fireConversion("subscribe_cta_click", { cta_label: "See Professional", cta_position: "feature-gate" });
                    setSampleModal(null);
                  }}
                  className="flex-1 text-center border border-primary/30 text-primary font-semibold text-sm py-3 rounded-xl hover:bg-primary/5 transition-all no-underline"
                >
                  See Professional →
                </Link>
              </div>
              <p className="text-meta text-muted-foreground text-center leading-relaxed border-t border-border pt-4">
                These tools produce compliance framework documents for informational purposes only. They are not legal advice and do not create an attorney-client relationship. Outputs are intended to be reviewed by a qualified privacy or legal professional before being relied upon.
              </p>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
