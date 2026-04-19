import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const DIFFERENTIATORS = [
  {
    icon: "⚖️",
    title: "Calibrated to enforcement precedent, not just statutory text",
    body: "Regulatory guidance and enforcement decisions frequently diverge. What a law requires and what a regulator has penalised organisations for failing to do are not always the same thing. Every tool draws from a structured database of 3,500+ enforcement decisions — compiled from published DPA decisions, ICO enforcement notices, FTC settlements, and HHS OCR resolution agreements — before producing output.",
  },
  {
    icon: "📋",
    title: "Outputs designed for professional review, not to replace it",
    body: "Each tool produces a structured, dated document intended to be reviewed by a qualified privacy or legal professional before it forms part of your compliance record. The output accelerates the review process and ensures the analysis is grounded in current enforcement intelligence — it does not substitute for professional judgment. That distinction matters to any organisation that takes its accountability obligations seriously.",
  },
  {
    icon: "🔒",
    title: "Your inputs stay yours",
    body: "The information you enter to generate a document — your organisation's data categories, jurisdictions, processing activities — is used only to produce your output. It is not retained, analysed, or used to train models. Each session is independent. There are no organisation profiles and no data sharing.",
  },
];

type ToolDef = {
  slug: string;
  icon: string;
  name: string;
  tagline: string;
  href: string;
  subscriberPrice: string;
  standalonePrice: string;
  body: string[];
  sampleSections: { label: string; content: string }[];
};

const TOOLS: ToolDef[] = [
  {
    slug: "healthcheck",
    icon: "🛡️",
    name: "Data Privacy Healthcheck",
    tagline: "A structured assessment of your privacy programme across the domains regulators actually inspect.",
    href: "/governance-assessment",
    subscriberPrice: "$15 per assessment",
    standalonePrice: "$29",
    body: [
      "A privacy programme that looks complete on paper and one that would survive a regulatory investigation are not always the same thing. The difference typically lies in whether the gaps have been identified and addressed before something goes wrong — rather than after.",
      "The Data Privacy Healthcheck works through the domains that supervisory authorities focus on during formal investigations: lawful basis documentation, data subject rights processes, retention schedules, processor oversight, and security measures. Each domain is scored against enforcement precedents — not a generic best-practice checklist — and findings are ordered by the likelihood of regulatory scrutiny, not by topic area.",
      "The output is a dated, scored assessment document produced for internal review. It is not a regulatory audit and does not carry the authority of one. It is designed to be reviewed by your privacy professional or legal adviser and used as a structured starting point for remediation planning — the kind of document that demonstrates your organisation took a considered approach to identifying its compliance gaps.",
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
    icon: "⚖️",
    name: "Legitimate Interest Assessment Tool",
    tagline: "Build a complete, documented Legitimate Interest Assessment — the three-part test, done properly.",
    href: "/li-assessment",
    subscriberPrice: "$19 per assessment",
    standalonePrice: "$39",
    body: [
      "Supervisory authorities across the EU and UK have been consistent on one point: it is not sufficient to have decided that legitimate interest applies. The decision must be documented, the documentation must demonstrate genuine analysis of all three limbs of the test, and it must be capable of being produced on request.",
      "The Legitimate Interest Assessment Tool guides you through the purpose test, necessity test, and balancing test with prompts calibrated to your specific processing activity. A direct marketing assessment asks different questions than one covering employee monitoring or fraud prevention. The analysis draws from enforcement decisions relevant to your use case, so the output reflects where regulators have found assessments adequate and where they have not.",
      "The generated document is a starting point for legal review, not a replacement for it. It is structured to be presented to your legal or privacy professional for sign-off, annotated where your specific circumstances require professional judgment, and retained as part of your Record of Processing Activities.",
    ],
    sampleSections: [
      { label: "Purpose test", content: "Processing activity: direct marketing to existing customers. Purpose is lawful, specific, and present at the time of processing. ✓" },
      { label: "Necessity test", content: "The processing is necessary to achieve the stated purpose. Less intrusive means — such as contextual advertising without personal profiling — were considered and would not achieve the same operational objective. ✓ with conditions noted." },
      { label: "Balancing test finding", content: "On balance, the legitimate interest is not overridden, provided: (1) an easy opt-out mechanism is provided at every point of contact, (2) sensitive categories are excluded from the dataset, and (3) the frequency of contact is limited to fortnightly." },
      { label: "Enforcement context", content: "Legitimate interest claims in direct marketing contexts have been rejected by multiple EU DPAs where no genuine balancing test was documented or where individuals had no meaningful opt-out. This is among the most consistently enforced gaps in LI assessments." },
    ],
  },
  {
    slug: "dpia",
    icon: "📄",
    name: "DPIA Builder",
    tagline: "A complete Data Protection Impact Assessment for high-risk processing — structured to EDPB guidelines.",
    href: "/dpia-framework",
    subscriberPrice: "$39 per DPIA",
    standalonePrice: "$69",
    body: [
      "Article 35 requires a DPIA before high-risk processing begins. What regulators assess when they review a DPIA is not whether the form was completed — it is whether the risks were genuinely considered before the processing was authorised, and whether the safeguards implemented reflect that analysis.",
      "The DPIA Builder produces a structured assessment aligned to EDPB guidelines, including the necessity and proportionality analysis that template-based assessments most commonly omit. The prompts are specific to your processing type — AI systems, biometric data, profiling, and systematic monitoring each present distinct risk considerations. Enforcement decisions relevant to your processing type are incorporated before any output is generated.",
      "The output is designed to be reviewed by the appropriate privacy professional in your organisation and retained as part of your permanent accountability record. It is a professional-grade starting point — one that reflects current enforcement posture — and is intended to form the basis of a documented professional review, not to substitute for it.",
    ],
    sampleSections: [
      { label: "Processing description", content: "AI-assisted recruitment screening tool processing CV data, employment history, and behavioural assessment responses for approximately 12,000 applicants per year." },
      { label: "Necessity and proportionality", content: "The volume and sensitivity of processing is proportionate to the stated purpose only if human review is mandatory for all shortlisted candidates and the system is not used as the sole basis for rejection." },
      { label: "Risk identified", content: "High — Automated decision-making without meaningful human review may constitute a violation of Article 22. Additional safeguard required: documented human review step before any decision affecting a candidate is made." },
      { label: "Enforcement context", content: "Automated recruitment screening without documented human oversight has been the subject of formal DPA investigations in multiple EU member states. Orders to suspend processing and implement review mechanisms have been issued." },
    ],
  },
  {
    slug: "dpa-generator",
    icon: "📄",
    name: "Custom Data Protection Agreement",
    tagline: "A GDPR Article 28-compliant Data Processing Agreement, calibrated to real enforcement failures.",
    href: "/dpa-generator",
    subscriberPrice: "$39 per document",
    standalonePrice: "$69",
    body: [
      "A Data Processing Agreement that satisfies the statutory text of Article 28 is table stakes. The agreements that hold up under regulatory scrutiny are those whose specific provisions address the failure patterns that supervisory authorities have actually penalised — absent sub-processor notification timelines, inadequate audit right formulations, vague security measure specifications.",
      "Before generating the document, the tool reviews enforcement decisions involving comparable controller-processor relationships, data categories, and jurisdictions. The resulting provisions reflect that intelligence. Each agreement is numbered hierarchically, marks all fields requiring your specific input, and is structured for legal review before execution.",
      "This tool generates a draft legal document. It does not constitute legal advice, and the output should be reviewed by qualified legal counsel before execution. What it provides is a well-grounded, enforcement-calibrated draft that significantly reduces the time your legal team needs to spend on first principles.",
    ],
    sampleSections: [
      { label: "Sub-processor provisions (Article 28(4))", content: "The Processor shall not engage any sub-processor without the prior specific written authorisation of the Controller. A current list of approved sub-processors is set out in Schedule 2. The Processor shall notify the Controller no fewer than 14 days before engaging any new sub-processor or replacing an existing one." },
      { label: "Breach notification (Article 33)", content: "The Processor shall notify the Controller without undue delay and in any event within 24 hours of becoming aware of a Personal Data Breach, whether confirmed or suspected." },
      { label: "Enforcement context applied", content: "Supervisory authorities have found that the absence of a specific sub-processor notification deadline in a DPA — as distinct from a general obligation to notify — is itself a compliance failure. This provision reflects that enforcement posture directly." },
    ],
  },
  {
    slug: "ir-playbook",
    icon: "🚨",
    name: "Incident Response Playbook Generator",
    tagline: "A complete breach response playbook — with deadlines, regulator portal links, and notification templates.",
    href: "/ir-playbook",
    subscriberPrice: "Included free with Premium",
    standalonePrice: "$39",
    body: [
      "Effective breach response is almost entirely a function of preparation. Organisations that know their notification deadlines, their regulator portal URLs, and their minimum content requirements before an incident occurs consistently achieve better outcomes — faster resolution, stronger regulatory relationships, and more defensible documentation — than those that begin from scratch under time pressure.",
      "The Incident Response Playbook Generator produces a sequenced, jurisdiction-specific response plan from a 90-second intake. Notification deadlines are calculated from your discovery time. Supervisory authority portal URLs are hardcoded and verified. Enforcement decisions involving notification failures in comparable contexts are incorporated into the timeline and content guidance.",
      "The output includes a documentation checklist aligned to Article 33(5) — the accountability record that regulators expect to see demonstrating that your organisation's response was systematic and timely. For Premium subscribers, this tool is included at no additional cost. An effective incident response capability should not be subject to a payment decision at the moment it is needed.",
    ],
    sampleSections: [
      { label: "Immediate actions (0–2 hours)", content: "1. Assemble incident response team: IR Lead, DPO, Legal Counsel, IT Security. 2. Preserve all evidence — do not delete or modify logs. 3. Isolate affected systems from the network. 4. Document discovery time (UTC) and the name of the person who discovered the incident." },
      { label: "Notification deadline — ICO (UK)", content: "Deadline: 72 hours from discovery (calculated from your input). Portal: ico.org.uk/make-a-complaint/data-security-and-journalism/report-a-breach/. Initial notification may be submitted with incomplete information if full details are not yet available — state this explicitly in the submission." },
      { label: "Documentation checklist (Article 33(5))", content: "☐ Discovery time and circumstances documented. ☐ Nature of breach and data categories recorded. ☐ Approximate number of affected individuals noted. ☐ Notification decision and rationale recorded. ☐ Steps taken to contain and remediate documented." },
    ],
  },
  {
    slug: "biometric-checker",
    icon: "👉",
    name: "Biometric Privacy Compliance Checker",
    tagline: "Per-jurisdiction compliance assessment for biometric data. First jurisdiction always free.",
    href: "/biometric-checker",
    subscriberPrice: "Included free with Premium",
    standalonePrice: "First jurisdiction free · $29 multi-jurisdiction",
    body: [
      "Biometric data obligations are complex, jurisdiction-specific, and frequently underestimated. GDPR Article 9 conditions apply across the EU and EEA. BIPA in Illinois creates direct statutory liability — $1,000 to $5,000 per violation per individual — with courts interpreting violation broadly. Texas, Washington, and other US jurisdictions have their own frameworks. The relevant laws are not always obvious until an organisation is already mid-implementation.",
      "The Biometric Privacy Compliance Checker produces a per-jurisdiction assessment specific to your biometric data types, organisation type, and processing purpose. The analysis incorporates current enforcement posture — what regulators and courts are actively scrutinising — not only the statutory text. For Illinois, the tool includes a mathematical illustration of potential BIPA statutory exposure based on your enrolled population, intended to support internal risk assessment and board-level conversations, not to constitute legal advice.",
      "The assessment is designed to be the starting point for a conversation with your privacy or legal team — specifically, to ensure that conversation is informed by the correct legal framework for your jurisdictions and organisation type before build decisions are finalised. Your first jurisdiction is always free. Multi-jurisdiction assessments are included with Premium subscriptions.",
    ],
    sampleSections: [
      { label: "Illinois (BIPA) – applies: Yes", content: "Key requirement: Written release from each individual before collecting or using biometric identifiers. Release must specifically describe the purpose and duration of collection. Oral consent is not sufficient." },
      { label: "BIPA litigation risk estimate", content: "Based on 8,000 enrolled employees: Low end (negligent violations): $8,000,000. High end (intentional violations): $40,000,000. This is a mathematical illustration of statutory exposure only — not a legal opinion or prediction of outcome." },
      { label: "Enforcement posture — current", content: "Courts have recently expanded the definition of collection to include passive scanning. Consent obtained via embedded website terms has been successfully challenged. Class action filings targeting employers are increasing." },
      { label: "Priority action", content: "Implement a standalone written consent process before any biometric collection begins. Retain signed consents. Establish a documented retention and destruction schedule." },
    ],
  },
  {
    slug: "registration-manager",
    icon: "🗂️",
    name: "DPA & AI Act Registration Manager",
    tagline: "Identify where your organisation must register, generate the filings, and stay on top of annual renewals. You submit the filings.",
    href: "/registration-manager",
    subscriberPrice: "DIY $49 · Counsel-Ready Pack $299",
    standalonePrice: "Free assessment · Annual renewal monitoring $199/jurisdiction",
    body: [
      "Most privacy programmes know they need to register a DPO somewhere. Far fewer have a current, jurisdiction-by-jurisdiction map of where formal registration with the supervisory authority is mandatory, where an EU/UK representative must be appointed, where the AI Act register applies, and when each filing must be renewed. The result is a quiet, recurring source of regulatory exposure that surfaces — usually — only when something else goes wrong.",
      "The Registration Manager begins with a free assessment: organisation type, size, sectors, and the markets in which you operate. From that, it produces a recommended registration footprint across 50+ jurisdictions — flagging where DPO registration, controller registration, representative appointment, and AI Act notification are required, and on what timeline. From there, you can generate the filings yourself with the DIY toolkit, or upgrade to the Counsel-Ready Pack for enhanced jurisdiction notes and a structured handoff your privacy counsel can review and submit.",
      "Every output is a structured document intended for review by your privacy or legal professional before submission. We do not submit filings on your behalf. Annual renewal monitoring is included for any jurisdiction you order — so the obligation does not quietly lapse a year later.",
    ],
    sampleSections: [
      { label: "Recommended jurisdictions (sample)", content: "Germany (BfDI / state DPA), France (CNIL), Italy (Garante), Spain (AEPD), United Kingdom (ICO), Ireland (DPC). AI Act registration: required for one EU deployment. EU representative: required (no establishment in the Union)." },
      { label: "Filing summary — Germany", content: "DPO designation must be notified to the competent state DPA in writing. Filing language: German. Renewal: not required, but updates within 30 days of personnel change. Online filing: state-dependent." },
      { label: "Counsel-Ready Pack deliverable", content: "Per-jurisdiction document set including: cover letter draft in local language, DPO designation form, RoPA template aligned to local DPA expectations, and AI Act registration entry where applicable — packaged with a counsel handoff brief. You submit the filings." },
      { label: "Renewal monitoring", content: "Automated reminders at 90, 60, 30, and 7 days before each filing's renewal date, with a link to the most recent generated version of your filing for re-use." },
    ],
  },
];

const PRICING_GRID: [string, string][] = [
  ["Data Privacy Healthcheck", "$29 → $15"],
  ["Legitimate Interest Assessment Tool", "$39 → $19"],
  ["DPIA Builder", "$69 → $39"],
  ["Custom Data Protection Agreement", "$69 → $39"],
  ["IR Playbook Generator", "$39 → Free"],
  ["Biometric Checker", "$29 → Free"],
  ["Registration Manager (DIY)", "$49 flat"],
  ["Registration Manager (Counsel-Ready)", "$299 flat"],
];

export default function Tools() {
  const [sampleModal, setSampleModal] = useState<string | null>(null);
  const activeTool = sampleModal ? TOOLS.find((t) => t.slug === sampleModal) : null;

  return (
    <>
      <Helmet>
        <title>Assessment Tools — Enforcement-Calibrated Compliance Documents | EndUserPrivacy</title>
        <meta
          name="description"
          content="Six compliance assessment tools built on 3,500+ enforcement decisions. Data Privacy Healthcheck, Legitimate Interest Assessment Tool, DPIA Builder, Custom Data Protection Agreement, IR Playbook, Biometric Compliance Checker. Subscriber pricing from $15."
        />
      </Helmet>
      <Navbar />

      {/* Section 1 — Hero */}
      <div className="bg-gradient-to-br from-navy to-navy-mid py-16 px-4 text-center">
        <div className="max-w-[760px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-amber-300 bg-amber-300/10 border border-amber-300/20 px-3 py-1.5 rounded-full mb-6">
            ⚖️ Assessment Tools
          </div>
          <h1 className="font-display text-[32px] md:text-[44px] text-white font-bold leading-tight mb-4">
            Compliance tools built on how
            <br />
            regulators actually enforce the law.
          </h1>
          <p className="text-blue-200 text-[16px] leading-relaxed max-w-[600px] mx-auto mb-8">
            Every tool on this platform draws from a live database of 3,500+ enforcement decisions before producing a single word of output. That is not something a general AI prompt can replicate — and it is reflected in the depth and specificity of what you receive.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/subscribe"
              className="text-[14px] font-semibold text-navy bg-white px-6 py-3 rounded-xl hover:opacity-90 transition-all no-underline"
            >
              Subscribe — from $20/month →
            </Link>
            <a
              href="#tools"
              className="text-[14px] font-semibold text-white border border-white/30 px-6 py-3 rounded-xl hover:bg-white/10 transition-all no-underline"
            >
              See the tools ↓
            </a>
          </div>
        </div>
      </div>

      {/* Section 2 — Differentiators */}
      <div className="bg-background py-14 px-4">
        <div className="max-w-[1100px] mx-auto grid md:grid-cols-3 gap-5">
          {DIFFERENTIATORS.map((d) => (
            <div key={d.title} className="bg-card border border-fog rounded-2xl p-6">
              <div className="text-[28px] mb-3">{d.icon}</div>
              <h3 className="font-display font-bold text-navy text-[17px] mb-3 leading-snug">
                {d.title}
              </h3>
              <p className="text-slate text-[13px] leading-relaxed">{d.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3 — Tool sections */}
      <div className="border-t border-fog">
        {TOOLS.map((tool, toolIdx) => (
          <div
            key={tool.slug}
            id={toolIdx === 0 ? "tools" : undefined}
            className="max-w-[860px] mx-auto px-4 py-14 border-b border-fog last:border-0"
          >
            <div className="flex items-start justify-between gap-6 flex-wrap mb-6">
              <div>
                <div className="text-[28px] mb-2">{tool.icon}</div>
                <h2 className="font-display font-bold text-navy text-[24px] mb-1">
                  {tool.name}
                </h2>
                <p className="text-slate text-[14px]">{tool.tagline}</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full mb-1">
                  ⭐ {tool.subscriberPrice}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {tool.standalonePrice} without subscription
                </div>
              </div>
            </div>

            {tool.body.map((para, i) => (
              <p key={i} className="text-[14px] text-slate leading-relaxed mb-4">
                {para}
              </p>
            ))}

            <div className="flex gap-4 flex-wrap mt-6">
              <button
                onClick={() => setSampleModal(tool.slug)}
                className="text-[13px] font-semibold text-primary border border-primary/30 px-5 py-2.5 rounded-xl hover:bg-primary/5 transition-all bg-transparent cursor-pointer"
              >
                See a sample output →
              </button>
              <Link
                to={tool.href}
                className="text-[13px] font-semibold text-white bg-navy px-5 py-2.5 rounded-xl hover:opacity-90 transition-all no-underline"
              >
                Open tool →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Section 4 — Closing pricing */}
      <div className="bg-gradient-to-br from-navy to-navy-mid py-14 px-4">
        <div className="max-w-[760px] mx-auto text-center">
          <h2 className="font-display text-[26px] md:text-[32px] text-white font-bold mb-4">
            Every tool. Subscriber pricing. $20/month.
          </h2>
          <p className="text-blue-200 text-[14px] leading-relaxed max-w-[540px] mx-auto mb-8">
            Premium subscribers pay significantly less on every tool and receive the Incident Response Playbook Generator and Biometric Compliance Checker included at no additional cost. One LI Assessment as a subscriber saves more than one month's subscription fee.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-[560px] mx-auto mb-8">
            {PRICING_GRID.map(([name, price]) => (
              <div key={name} className="bg-white/10 rounded-xl px-3 py-2.5 text-left">
                <p className="text-white/70 text-[11px] mb-0.5">{name}</p>
                <p className="text-white font-bold text-[14px]">{price}</p>
              </div>
            ))}
          </div>
          <Link
            to="/subscribe"
            className="inline-block text-[14px] font-semibold text-navy bg-white px-6 py-3 rounded-xl hover:opacity-90 transition-all no-underline"
          >
            Start your Premium subscription →
          </Link>
          <p className="text-blue-200/60 text-[12px] mt-4">
            Monthly at $20 · Annual at $180 · Cancel any time
          </p>
        </div>
      </div>

      {/* Sample output modal */}
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
                <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-0.5">
                  ⭐ Sample Output
                </p>
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
              <p className="text-[12px] text-muted-foreground italic border-b border-border pb-4">
                This is a representative sample showing the structure and depth of a real output. Content is illustrative — your generated document will reflect your specific inputs and current enforcement intelligence.
              </p>

              {activeTool.sampleSections.map((section, i) => (
                <div key={i} className="bg-muted/40 rounded-xl p-4 border border-border">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">
                    {section.label}
                  </p>
                  <p className="text-[13px] text-foreground leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </div>
              ))}

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-[11px] font-bold text-blue-800 mb-1">
                  How the enforcement intelligence layer works
                </p>
                <p className="text-[12px] text-blue-700 leading-relaxed">
                  Before generating output, the tool reviewed enforcement decisions from a structured database of 3,500+ cases relevant to your inputs. The provisions and findings above reflect what regulators have scrutinised in practice, not only what the applicable law requires.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Link
                  to={activeTool.href}
                  onClick={() => setSampleModal(null)}
                  className="flex-1 text-center bg-navy text-white font-semibold text-[13px] py-3 rounded-xl hover:opacity-90 transition-all no-underline"
                >
                  Open {activeTool.name} →
                </Link>
                <Link
                  to="/subscribe"
                  onClick={() => setSampleModal(null)}
                  className="flex-1 text-center border border-primary/30 text-primary font-semibold text-[13px] py-3 rounded-xl hover:bg-primary/5 transition-all no-underline"
                >
                  Subscribe for best pricing →
                </Link>
              </div>

              <p className="text-[11px] text-muted-foreground text-center leading-relaxed border-t border-border pt-4">
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
