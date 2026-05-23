import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import Footer from "@/components/Footer";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { isSmartTool, isConvenienceTool, INTELLIGENCE_PRICING, PLATFORM_PRICING } from "@/config/pricing";

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
};

// ── Section types ─────────────────────────────────────────────────────────
type ToolSection = "assessments" | "documents" | "cppa";

const CPPA_TOOL_SLUGS = new Set([
  "cppa-scope-checker",
  "cppa-risk-assessment",
  "cppa-cybersecurity",
]);

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
    title: "Know where you stand against what regulators actually enforce",
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
    note: "Pro annual: 1 free Convenience Tool run/client/month",
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
const DIFFERENTIATORS = [
  {
    icon: "⚖️",
    title: "Calibrated to enforcement precedent, not just statutory text",
    body: "Regulatory guidance and enforcement decisions frequently diverge – what a law requires and what a regulator has actually penalised are not always the same thing.",
    checkColor: "text-navy",
    checks: [
      "3,500+ decisions across 119 regulatory authorities",
      "DPA notices, ICO actions, FTC settlements, HHS OCR agreements",
      "Applied before every tool produces a single word of output",
    ],
  },
  {
    icon: "📋",
    title: "Assessments ordered by enforcement risk, not by topic area",
    body: "A compliance checklist tells you whether documentation exists. An enforcement-calibrated assessment tells you which gaps are most likely to attract scrutiny – and ranks them accordingly.",
    checkColor: "text-accent",
    checks: [
      "Scored against enforcement precedents, not best-practice checklists",
      "Findings ordered by likelihood of regulatory scrutiny",
      "Dated, scored output structured for professional review",
    ],
  },
  {
    icon: "📄",
    title: "Documents drafted to survive scrutiny, not just satisfy it",
    body: "A DPA that satisfies Article 28 is table stakes. Every document here is calibrated to the failure patterns supervisory authorities have actually penalised – not to the statutory minimum.",
    checkColor: "text-amber-600",
    checks: [
      "Provisions informed by enforcement failures, not generic templates",
      "Jurisdiction-specific and calibrated to your processing activities",
      "Your inputs are never retained or used to train models",
    ],
  },
];

// ── Tool definition type ──────────────────────────────────────────────────
type ToolDef = {
  slug: string;
  section: ToolSection;
  icon: string;
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
};

// ── Tools — ordered by section to match homepage triptych ─────────────────
const TOOLS: ToolDef[] = [
  // ── ASSESSMENTS ───────────────────────────────────────────────────────
  {
    slug: "healthcheck",
    section: "assessments",
    icon: "🛡️",
    name: "Privacy Programme Assessment",
    tagline: "A structured assessment of your privacy programme across the domains regulators actually inspect.",
    href: "/governance-assessment",
    subscriberPrice: "$55",
    standalonePrice: "$55",
    freeBadge: "Quick scan free",
    body: [
      "A privacy programme that looks complete on paper and one that would survive a regulatory investigation are not always the same thing. The difference typically lies in whether the gaps have been identified and addressed before something goes wrong — rather than after.",
      "The Privacy Programme Assessment works through the domains that supervisory authorities focus on during formal investigations: lawful basis documentation, data subject rights processes, retention schedules, processor oversight, and security measures. Each domain is scored against enforcement precedents — not a generic best-practice checklist — and findings are ordered by the likelihood of regulatory scrutiny, not by topic area.",
      "The output is a dated, scored assessment document produced for internal review. It is not a regulatory audit and does not carry the authority of one. It is designed to be reviewed by your privacy professional or legal adviser and used as a structured starting point for remediation planning.",
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
    icon: "⚖️",
    name: "Legitimate Interest Assessment",
    tagline: "Build a complete, documented Legitimate Interest Assessment — the three-part test, done properly.",
    href: "/li-assessment",
    subscriberPrice: "$35",
    standalonePrice: "$35",
    freeBadge: "Step 1 free",
    body: [
      "Supervisory authorities across the EU and UK have been consistent on one point: it is not sufficient to have decided that legitimate interest applies. The decision must be documented, the documentation must demonstrate genuine analysis of all three limbs of the test, and it must be capable of being produced on request.",
      "The Legitimate Interest Assessment guides you through the purpose test, necessity test, and balancing test with prompts calibrated to your specific processing activity. A direct marketing assessment asks different questions than one covering employee monitoring or fraud prevention. The analysis draws from enforcement decisions relevant to your use case.",
      "The generated document is a starting point for legal review, not a replacement for it. It is structured to be presented to your legal or privacy professional for sign-off, annotated where your specific circumstances require professional judgment, and retained as part of your Record of Processing Activities.",
      "Your assessments are your Subscriber Confidential Information and, as such, are protected as described in our Privacy Policy.",
    ],
    sampleSections: [
      { label: "Purpose test", content: "Processing activity: direct marketing to existing customers. Purpose is lawful, specific, and present at the time of processing. ✓" },
      { label: "Necessity test", content: "The processing is necessary to achieve the stated purpose. Less intrusive means were considered and would not achieve the same operational objective. ✓ with conditions noted." },
      { label: "Balancing test finding", content: "On balance, the legitimate interest is not overridden, provided: (1) an easy opt-out mechanism is provided at every point of contact, (2) sensitive categories are excluded from the dataset, and (3) the frequency of contact is limited to fortnightly." },
      { label: "Enforcement context", content: "Legitimate interest claims in direct marketing contexts have been rejected by multiple EU DPAs where no genuine balancing test was documented or where individuals had no meaningful opt-out." },
    ],
  },
  {
    slug: "dpia",
    section: "assessments",
    icon: "📄",
    name: "Impact Assessment Builder (DPIA)",
    tagline: "A complete Data Protection Impact Assessment for high-risk processing — structured to EDPB guidelines.",
    href: "/dpia-framework",
    subscriberPrice: "$45",
    standalonePrice: "$45",
    body: [
      "Article 35 requires a DPIA before high-risk processing begins. What regulators assess when they review a DPIA is not whether the form was completed — it is whether the risks were genuinely considered before the processing was authorised, and whether the safeguards implemented reflect that analysis.",
      "The Impact Assessment Builder produces a structured assessment aligned to EDPB guidelines, including the necessity and proportionality analysis that template-based assessments most commonly omit. The prompts are specific to your processing type — AI systems, biometric data, profiling, and systematic monitoring each present distinct risk considerations.",
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
    icon: "👉",
    name: "Biometric Privacy Compliance Assessment",
    tagline: "Per-jurisdiction compliance assessment for biometric data. Free account required.",
    href: "/biometric-checker",
    subscriberPrice: "$15",
    standalonePrice: "$15",
    body: [
      "Biometric data obligations are complex, jurisdiction-specific, and frequently underestimated. GDPR Article 9 conditions apply across the EU and EEA. BIPA in Illinois creates direct statutory liability — $1,000 to $5,000 per violation per individual — with courts interpreting violation broadly. Texas, Washington, and other US jurisdictions have their own frameworks.",
      "The Biometric Privacy Compliance Assessment produces a per-jurisdiction assessment specific to your biometric data types, organisation type, and processing purpose. The analysis incorporates current enforcement posture — what regulators and courts are actively scrutinising — not only the statutory text. For Illinois, the tool includes a mathematical illustration of potential BIPA statutory exposure based on your enrolled population.",
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
    icon: "📄",
    name: "DPA Generator",
    tagline: "Your custom GDPR Article 28-compliant Data Processing Agreement, calibrated to real enforcement failures.",
    href: "/dpa-generator",
    subscriberPrice: "$45",
    standalonePrice: "$45",
    body: [
      "A Data Processing Agreement that satisfies the statutory text of Article 28 is table stakes. The agreements that hold up under regulatory scrutiny are those whose specific provisions address the failure patterns that supervisory authorities have actually penalised — absent sub-processor notification timelines, inadequate audit right formulations, vague security measure specifications.",
      "Before generating your document, the tool reviews enforcement decisions involving comparable controller-processor relationships, data categories, and jurisdictions. The resulting provisions reflect that intelligence. Each agreement is structured for legal review before execution.",
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
    icon: "🚨",
    name: "Incident Response Playbook",
    tagline: "Your complete breach response playbook — with deadlines, regulator portal links, and notification templates.",
    href: "/ir-playbook",
    subscriberPrice: "$25",
    standalonePrice: "$25",
    freeBadge: "Deadline lookup free",
    body: [
      "Effective breach response is almost entirely a function of preparation. Organisations that know their notification deadlines, their regulator portal URLs, and their minimum content requirements before an incident occurs consistently achieve better outcomes — faster resolution, stronger regulatory relationships, and more defensible documentation — than those that begin from scratch under time pressure.",
      "Your Breach Response Playbook produces a sequenced, jurisdiction-specific response plan from a 90-second intake. Notification deadlines are calculated from your discovery time. Supervisory authority portal URLs are hardcoded and verified. Enforcement decisions involving notification failures in comparable contexts are incorporated into the timeline and content guidance.",
      "The output includes a documentation checklist aligned to Article 33(5) — the accountability record that regulators expect to see demonstrating that your organisation's response was systematic and timely. For Professional subscribers, this tool is included at no additional cost.",
    ],
    sampleSections: [
      { label: "Immediate actions (0–2 hours)", content: "1. Assemble incident response team: IR Lead, DPO, Legal Counsel, IT Security. 2. Preserve all evidence — do not delete or modify logs. 3. Isolate affected systems from the network. 4. Document discovery time (UTC) and the name of the person who discovered the incident." },
      { label: "Notification deadline — ICO (UK)", content: "Deadline: 72 hours from discovery (calculated from your input). Portal: ico.org.uk/make-a-complaint/data-security-and-journalism/report-a-breach/. Initial notification may be submitted with incomplete information if full details are not yet available." },
      { label: "Documentation checklist (Article 33(5))", content: "☐ Discovery time and circumstances documented. ☐ Nature of breach and data categories recorded. ☐ Approximate number of affected individuals noted. ☐ Notification decision and rationale recorded. ☐ Steps taken to contain and remediate documented." },
    ],
  },
  {
    slug: "ropa-builder",
    section: "documents",
    icon: "🗃️",
    name: "RoPA Builder (Article 30)",
    tagline: "Build and maintain your Article 30 Record of Processing Activities — by activity, by platform, by jurisdiction.",
    href: "/ropa-builder",
    subscriberPrice: "$40",
    standalonePrice: "$40",
    body: [
      "Article 30 RoPAs look administrative until a regulator asks for them. Then the gap between a spreadsheet that nominally lists processing activities and a record that actually demonstrates accountability becomes immediately visible. The RoPA Builder is structured around the latter.",
      "Activities are organised per-platform and per-jurisdiction. Each entry captures the lawful basis, data categories, recipients, retention rules, and international transfer safeguards in the structure supervisory authorities expect to see — with prompts calibrated to your sector and the platforms you've already named.",
      "The output is a versioned, dated record intended to be reviewed by your privacy or legal professional and retained as part of your accountability documentation. Annual subscribers get full access; standalone users can generate per-activity records.",
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
    subscriberPrice: "$25",
    standalonePrice: "$25",
    body: [
      "US state privacy laws are not interchangeable. CCPA disclosure requirements differ from Virginia's, which differ from Colorado's, which differ again from the more recent state laws. A single 'US privacy notice' that does not surface those differences is itself a compliance risk — and increasingly, an enforcement one.",
      "The U.S. Privacy Notice Builder produces state-specific notices that include the disclosures each statute actually requires: categories of personal information, sources, purposes, sale and sharing disclosures, sensitive data handling, and consumer rights mechanisms. State-specific overlays are applied automatically based on the jurisdictions you select.",
      "The output is a draft notice for review by your privacy or legal professional before publication. It is structured to be read by counsel quickly — clearly delineating the state-specific provisions from the universal ones — and to be updated as state laws continue to evolve.",
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
    subscriberPrice: "$50",
    standalonePrice: "$50",
    body: [
      "Article 13 and 14 set out what a GDPR-compliant notice must contain. The gap between meeting those requirements on paper and producing a notice that withstands scrutiny is, in practice, the gap between checkbox compliance and an accountability posture that holds up.",
      "The EU/UK Privacy Notice Builder produces a GDPR and UK GDPR-aligned notice covering each Article 13/14 disclosure: identity of the controller, contact details, lawful basis per processing purpose, recipients, retention, international transfer safeguards, and data subject rights. International transfer language is calibrated to the destinations and mechanisms you specify (SCCs, adequacy, derogations).",
      "The generated notice is structured for review by your privacy or legal professional and intended to be the basis of a documented review — not a substitute for one.",
    ],
    sampleSections: [
      { label: "Lawful basis (per purpose)", content: "Account creation and management: Article 6(1)(b) — necessary for performance of a contract. Marketing communications: Article 6(1)(a) — consent (withdrawable at any time). Fraud prevention: Article 6(1)(f) — legitimate interest, balancing test documented and available on request." },
      { label: "International transfers", content: "Personal data may be transferred to the United States to our processors. The transfer relies on the EU Commission's adequacy decision under the EU–US Data Privacy Framework and on Standard Contractual Clauses as a backup safeguard." },
    ],
  },
  {
    slug: "registration-manager",
    section: "documents",
    icon: "🗂️",
    name: "Registration Manager",
    tagline: "Identify where your organisation must register, generate the filings, and stay on top of annual renewals. You submit the filings.",
    href: "/registration-manager",
    subscriberPrice: "$45 per filing",
    standalonePrice: "$45 per filing",
    body: [
      "Most privacy programmes know they need to register a DPO somewhere. Far fewer have a current, jurisdiction-by-jurisdiction map of where formal registration with the supervisory authority is mandatory, where an EU/UK representative must be appointed, where the AI Act register applies, and when each filing must be renewed.",
      "The Registration Manager begins with a free assessment: organisation type, size, sectors, and the markets in which you operate. From that, it produces a recommended registration footprint across 50+ jurisdictions — flagging where DPO registration, controller registration, representative appointment, and AI Act notification are required, and on what timeline.",
      "Every output is a structured document intended for review by your privacy or legal professional before submission. We do not submit filings on your behalf. Annual renewal monitoring is available so the obligation does not quietly lapse a year later.",
    ],
    sampleSections: [
      { label: "Recommended jurisdictions (sample)", content: "Germany (BfDI / state DPA), France (CNIL), Italy (Garante), Spain (AEPD), United Kingdom (ICO), Ireland (DPC). AI Act registration: required for one EU deployment. EU representative: required (no establishment in the Union)." },
      { label: "Filing summary — Germany", content: "DPO designation must be notified to the competent state DPA in writing. Filing language: German. Renewal: not required, but updates within 30 days of personnel change. Online filing: state-dependent." },
      { label: "Counsel-Ready Pack deliverable", content: "Per-jurisdiction document set including: cover letter draft in local language, DPO designation form, RoPA template aligned to local DPA expectations, and AI Act registration entry where applicable — packaged with a counsel handoff brief. You submit the filings." },
      { label: "Renewal monitoring", content: "Automated reminders at 90, 60, 30, and 7 days before each filing's renewal date, with a link to the most recent generated version of your filing for re-use." },
    ],
  },

  // ── CPPA SUITE ────────────────────────────────────────────────────────
  {
    slug: "cppa-scope-checker",
    section: "cppa",
    icon: "🔍",
    name: "CPPA Scope Checker",
    tagline: "Find out if your organisation is in scope for CCPA/CPRA and the 2027 CPPA audit — always free, no account required.",
    href: "/cppa-scope-checker",
    subscriberPrice: "Always free",
    standalonePrice: "Always free",
    alwaysFree: true,
    body: [
      "The CPPA formally stood up its Audits Division in February 2026. The December 31, 2027 deadline for existing processing activities is not a proposed regulation — it is in effect. Before investing in risk assessment or cybersecurity audit work, the first question is always: does your organisation meet the thresholds that trigger the obligation?",
      "The CPPA Scope Checker works through eight questions covering revenue thresholds, data processing volumes, the types of personal information involved, and whether your processing of personal information presents a significant risk to consumers. The result is a clear obligation map — which CPPA audit requirements apply, on what timeline, and what you need to do next.",
      "No account is required. The tool is free for all users and always will be.",
    ],
    sampleSections: [
      { label: "Threshold analysis", content: "Annual gross revenue: exceeds $25M threshold ✓. Personal information of 100,000+ consumers: ✓. Derives 50%+ of revenue from selling/sharing personal information: not applicable. Result: CCPA/CPRA obligations apply." },
      { label: "Audit obligation — CPPA Risk Assessment", content: "Your processing of personal information presents a significant risk to consumers' privacy. A formal risk assessment is required before December 31, 2027 under CPPA regulations." },
      { label: "Recommended next step", content: "Proceed to the CPPA Risk Assessment tool. The assessment must be documented in the structure the CPPA specifies and retained for regulatory review." },
    ],
  },
  {
    slug: "cppa-risk-assessment",
    section: "cppa",
    icon: "🔍",
    name: "CPPA Risk Assessment",
    tagline: "California-specific risk assessment aligned to the CPPA's risk assessment regulations.",
    href: "/cppa-risk-assessment",
    subscriberPrice: "$55",
    standalonePrice: "$55",
    body: [
      "The CPPA's risk assessment regulations require businesses processing personal information that presents a significant risk to consumers' privacy or security to conduct and document a structured risk assessment. The substance of that assessment — not the cover sheet — is what determines whether it satisfies the regulation.",
      "The CPPA Risk Assessment walks through the categories the CPPA specifies: the purpose of processing, the categories of personal information involved, the operational elements of the processing, the benefits, the negative impacts to consumers, and the safeguards that mitigate those impacts. Outputs are produced in the structure the CPPA expects to see in its initial reviews.",
      "Standalone per-use price: $55. The output is structured for review by California privacy counsel before being relied upon.",
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
    icon: "🔐",
    name: "CPPA Cybersecurity Audit",
    tagline: "Structured cybersecurity audit aligned to the CPPA's cybersecurity audit regulations.",
    href: "/cppa-cybersecurity",
    subscriberPrice: "$70",
    standalonePrice: "$70",
    body: [
      "The CPPA's cybersecurity audit regulations require qualifying businesses to conduct annual cybersecurity audits covering specified components — access controls, multi-factor authentication, encryption, vulnerability management, incident response, and more. The audit must be thorough, independent, and documented.",
      "The CPPA Cybersecurity Audit Tool produces a structured assessment across each of the components the regulation enumerates, identifies gaps against the specific control expectations the CPPA has surfaced in guidance, and produces remediation guidance ordered by likelihood of regulatory focus.",
      "Standalone per-use price: $70. The April 1, 2028 certification deadline applies to businesses with annual revenue exceeding $100M. The output is intended to be reviewed by your security and legal teams.",
      "The output of this tool is your Subscriber Confidential Information and, as such, is protected as described in our Privacy Policy.",
    ],
    sampleSections: [
      { label: "Multi-factor authentication finding", content: "MFA is enforced for administrative access to production systems but not for general employee access to systems containing personal information. The CPPA regulation expects MFA for both. Remediation: enable MFA for all employee access to PI-containing systems within 90 days." },
      { label: "Encryption coverage", content: "Personal information is encrypted at rest in primary databases. Backups stored in third-party cloud storage are not encrypted at the application layer. Recommended: implement application-layer encryption for backups before next renewal cycle." },
    ],
  },
];

const PRICING_GRID: [string, string][] = [
  ["Privacy Programme Assessment", "$55 (Smart)"],
  ["Legitimate Interest Assessment", "$35 (Smart)"],
  ["Impact Assessment (DPIA)", "$45 (Smart)"],
  ["DPA Generator", "$45 (Smart)"],
  ["Incident Response Playbook", "$25 (Convenience)"],
  ["Biometric Privacy Check", "$15 (Smart)"],
  ["RoPA Builder", "$40 (Convenience)"],
  ["U.S. Privacy Notice", "$25 (Convenience)"],
  ["EU/UK Privacy Notice", "$50 (Convenience)"],
  ["Registration Manager", "$45 per filing (Convenience)"],
  ["CPPA Scope Checker", "Always free"],
  ["CPPA Risk Assessment", "$55 (Smart)"],
  ["CPPA Cybersecurity Audit", "$70 (Smart)"],
  ["Professional annual", "1 free Convenience Tool run/client/month"],
];

export default function Tools() {
  const [sampleModal, setSampleModal] = useState<string | null>(null);
  const activeTool = sampleModal ? TOOLS.find((t) => t.slug === sampleModal) : null;
  const { hasToolAccess, tier } = useSubscriptionTier();

  const sections: ToolSection[] = ["assessments", "documents", "cppa"];
  const toolsBySection = sections.map((sec) => ({
    section: sec,
    tools: TOOLS.filter((t) => t.section === sec),
  }));

  return (
    <>
      <Helmet>
        <title>Compliance Tools — Enforcement-Calibrated Assessments & Documents | End User Privacy</title>
        <meta name="description" content="Privacy compliance tools built on 3,500+ enforcement decisions. Available individually at standalone prices from $15." />
      </Helmet>
      <Navbar />
      <DashboardSubnav />

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <header className="bg-slate-900 text-white py-12">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            🧰 Compliance Tools
          </span>
          <h1 className="font-serif text-white mb-3">
            Intelligence, assessments, and compliance documents
          </h1>
          <p className="text-slate-300 text-lg max-w-3xl">
            Every tool draws from a live database of 3,500+ enforcement decisions before producing a single word of output. Available individually at standalone prices.
          </p>
          <div className="flex gap-3 mt-6 flex-wrap">
            <Link to="/subscribe" className="text-sm font-semibold text-slate-900 bg-white px-5 py-2.5 rounded-lg hover:opacity-90 transition no-underline">
              Start 10-day Intelligence trial — $20/mo →
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
            <div key={d.title} className="bg-card border border-fog rounded-2xl p-6">
              <div className="text-[28px] mb-3">{d.icon}</div>
              <h3 className="text-card-title text-gray-900 mb-3 leading-snug">{d.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{d.body}</p>
              <hr className="my-4 border-t border-fog" />
              <ul className="space-y-1.5">
                {d.checks.map((c) => (
                  <li key={c} className="flex gap-2 text-xs text-slate leading-snug">
                    <span className={`${d.checkColor} font-bold flex-shrink-0`}>✓</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Grouped tool sections ──────────────────────────────────────── */}
      <div id="tools" className="border-t border-fog">
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
                      <p className={`text-[15px] font-semibold ${hdr.colors.title}`}>
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
                  className="max-w-[860px] mx-auto px-4 py-12 border-b border-fog last:border-0"
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
                        ) : hasToolAccess && !CPPA_TOOL_SLUGS.has(tool.slug) ? (
                          <span className="inline-block text-eyebrow bg-green-100 text-green-800 border border-green-200 px-3 py-1 rounded-full">
                            ✓ Included
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

                    <h2 className="font-display text-navy mb-1">{tool.name}</h2>
                    <p className="text-sm text-gray-600">{tool.tagline}</p>
                    {tool.freeBadge && (
                      <span className="inline-block mt-1.5 text-eyebrow bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                        ✓ {tool.freeBadge}
                      </span>
                    )}
                    {!tool.alwaysFree && (
                      <div className="text-meta text-muted-foreground mt-2">
                        {hasToolAccess && !CPPA_TOOL_SLUGS.has(tool.slug)
                          ? "Included in your Professional"
                          : hasToolAccess && CPPA_TOOL_SLUGS.has(tool.slug)
                          ? "Paid — subscriber rate applied"
                          : tier === "monthly" && tool.monthlySubscriberPrice
                          ? "Monthly subscriber discount"
                          : `${tool.standalonePrice} without subscription`}
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
                    <Link to={tool.href} className="text-sm font-semibold text-white bg-navy px-5 py-2.5 rounded-xl hover:opacity-90 transition-all no-underline">
                      Open tool →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* ── Closing pricing section ───────────────────────────────────── */}
      <div className="bg-gradient-to-br from-navy to-navy-mid py-14 px-4">
        <div className="max-w-[760px] mx-auto text-center">
          <h2 className="font-display text-white mb-4">
            Available individually at standalone prices.
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed max-w-[540px] mx-auto mb-8">
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
          <Link to="/subscribe" className="inline-block text-sm font-semibold text-navy bg-white px-6 py-3 rounded-xl hover:opacity-90 transition-all no-underline">
            Start 10-day Intelligence trial →
          </Link>
          <p className="text-blue-200/60 text-meta mt-4">
            Intelligence $20/mo (10-day free trial) · Professional $30/mo + $150/client/yr · Cancel any time
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
            <div className="bg-navy px-6 py-4 rounded-t-2xl flex items-center justify-between sticky top-0">
              <div>
                <p className="text-eyebrow text-amber-400 mb-0.5">Sample Output</p>
                <p className="text-white font-semibold text-[15px]">{activeTool.name}</p>
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
                This is a representative sample showing the structure and depth of a real output. Content is illustrative — your generated document will reflect your specific inputs and current enforcement intelligence.
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
                  Before generating output, the tool reviewed enforcement decisions from a structured database of 3,500+ cases relevant to your inputs.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Link
                  to={activeTool.href}
                  onClick={() => setSampleModal(null)}
                  className="flex-1 text-center bg-navy text-white font-semibold text-sm py-3 rounded-xl hover:opacity-90 transition-all no-underline"
                >
                  Open {activeTool.name} →
                </Link>
                <Link
                  to="/subscribe"
                  onClick={() => setSampleModal(null)}
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
