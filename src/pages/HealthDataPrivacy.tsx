import { Helmet } from "react-helmet-async";
import { ResearchPageLayout } from "@/components/research/ResearchPageLayout";
import { getProduct } from "@/lib/productRegistry";
import { linkGlossaryFirstMentions } from "@/lib/linkGlossaryTerms";

const TRACK_OVERVIEW = `
<div class="grid gap-4 md:grid-cols-3">
  <a href="#hipaa" class="block rounded-xl border-l-4 border-brand-teal bg-card p-4 hover:shadow-eup-sm transition-shadow no-underline">
    <p class="text-[10px] font-semibold uppercase tracking-wider text-brand-teal-text">Track 1</p>
    <h3 class="text-brand-navy text-base mt-1 mb-1">HIPAA covered entities &amp; business associates</h3>
    <p class="text-xs text-slate">Healthcare providers, health plans, clearinghouses, and the vendors that handle PHI on their behalf.</p>
  </a>
  <a href="#consumer-health" class="block rounded-xl border-l-4 border-amber-500 bg-card p-4 hover:shadow-eup-sm transition-shadow no-underline">
    <p class="text-[10px] font-semibold uppercase tracking-wider text-amber-700">Track 2</p>
    <h3 class="text-brand-navy text-base mt-1 mb-1">Consumer health data laws (non-HIPAA)</h3>
    <p class="text-xs text-slate">Health apps, wearables, DTC platforms, and ad-tech — regulated by the FTC and state consumer health statutes.</p>
  </a>
  <a href="#state-health" class="block rounded-xl border-l-4 border-emerald-500 bg-card p-4 hover:shadow-eup-sm transition-shadow no-underline">
    <p class="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">Track 3</p>
    <h3 class="text-brand-navy text-base mt-1 mb-1">State health privacy laws</h3>
    <p class="text-xs text-slate">Reproductive, mental health, gender-affirming care, and biometric provisions layered into state comprehensive laws.</p>
  </a>
</div>
`;

const HIPAA_TRACK = `
<div class="rounded-xl border-l-4 border-brand-teal bg-brand-teal/5 p-5 mb-5">
  <p class="text-[11px] font-semibold uppercase tracking-wider text-brand-teal-text mb-2">Step 1 — Does HIPAA apply to you?</p>
  <div class="grid gap-3 sm:grid-cols-2">
    <div class="bg-card rounded-lg p-3 border border-brand-cloud">
      <p class="text-sm font-semibold text-brand-navy mb-1">You are a <em>Covered Entity</em> if you are…</p>
      <ul class="text-xs text-slate list-disc list-inside space-y-0.5">
        <li>A healthcare provider that transmits health information electronically in a standard transaction</li>
        <li>A health plan (insurer, HMO, ERISA group health plan)</li>
        <li>A healthcare clearinghouse</li>
      </ul>
    </div>
    <div class="bg-card rounded-lg p-3 border border-brand-cloud">
      <p class="text-sm font-semibold text-brand-navy mb-1">You are a <em>Business Associate</em> if you…</p>
      <ul class="text-xs text-slate list-disc list-inside space-y-0.5">
        <li>Create, receive, maintain, or transmit PHI on behalf of a covered entity</li>
        <li>Provide legal, actuarial, accounting, consulting, data aggregation, management, accreditation, or financial services involving PHI</li>
        <li>Operate as a subcontractor that handles PHI for another business associate</li>
      </ul>
    </div>
  </div>
  <p class="text-xs text-brand-mist mt-3">If neither applies, jump to <a href="#consumer-health" class="text-brand-teal-text">Track 2 — Consumer health data laws</a>. HIPAA does <em>not</em> cover most health apps, wearables, or DTC wellness platforms.</p>
</div>

<p>HIPAA's <a href="https://www.hhs.gov/hipaa/for-professionals/privacy/index.html" target="_blank" rel="noopener noreferrer">Privacy Rule</a> and <a href="https://www.hhs.gov/hipaa/for-professionals/security/index.html" target="_blank" rel="noopener noreferrer">Security Rule</a> govern PHI use and disclosure by covered entities and business associates. Key obligations: the <strong>Minimum Necessary Standard</strong>, mandatory <a href="https://www.hhs.gov/hipaa/for-professionals/covered-entities/sample-business-associate-agreement-provisions/index.html" target="_blank" rel="noopener noreferrer">Business Associate Agreements</a>, the <a href="https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html" target="_blank" rel="noopener noreferrer">Breach Notification Rule</a> (60-day window), and the patient Right of Access (30 days). <a href="https://www.hhs.gov/ocr" target="_blank" rel="noopener noreferrer">HHS OCR</a> enforces through audits and civil monetary penalties ranging from $100 to $50,000 per violation, up to $2M annually per category.</p>
`;

const CONSUMER_HEALTH_TRACK = `
<p>If you operate a health app, wearable, fitness tracker, or any direct-to-consumer platform handling health information, you are very likely <strong>outside HIPAA</strong> but firmly inside the FTC's jurisdiction and a fast-growing set of state consumer health statutes.</p>

<div class="rounded-xl border border-brand-cloud bg-card p-5 mt-4">
  <p class="text-[11px] font-semibold uppercase tracking-wider text-amber-700 mb-3">Key statutes — non-HIPAA consumer health</p>
  <div class="grid gap-3 md:grid-cols-2">
    <div class="border-l-2 border-amber-500 pl-3">
      <p class="text-sm font-semibold text-brand-navy">FTC Health Breach Notification Rule</p>
      <p class="text-xs text-slate mt-1">Covers vendors of personal health records and related entities not subject to HIPAA. "Breach" includes <em>unauthorized sharing</em> with ad platforms, not only security incidents. Enforced via consent orders and civil penalties (GoodRx — $1.5M; BetterHelp — $7.8M; Premom — consent order).</p>
      <a href="https://www.ftc.gov/legal-library/browse/rules/health-breach-notification-rule" target="_blank" rel="noopener noreferrer" class="text-brand-teal-text text-xs mt-1 inline-block">FTC rule text ↗</a>
    </div>
    <div class="border-l-2 border-amber-500 pl-3">
      <p class="text-sm font-semibold text-brand-navy">Washington My Health My Data Act (MHMDA)</p>
      <p class="text-xs text-slate mt-1">RCW 70.372 — the strictest consumer health statute. Broad scope (any regulated entity collecting WA consumer health data), opt-in consent, geofencing ban around healthcare facilities, and a <strong>private right of action</strong>. Effective March 31, 2024.</p>
      <a href="https://app.leg.wa.gov/rcw/default.aspx?cite=70.372" target="_blank" rel="noopener noreferrer" class="text-brand-teal-text text-xs mt-1 inline-block">Statute ↗</a>
    </div>
    <div class="border-l-2 border-amber-500 pl-3">
      <p class="text-sm font-semibold text-brand-navy">Nevada SB 370</p>
      <p class="text-xs text-slate mt-1">Mirrors MHMDA's structure but enforced solely by the Nevada AG (no private right of action). Effective March 31, 2024.</p>
      <a href="https://www.leg.state.nv.us/App/NELIS/REL/82nd2023/Bill/SB370/Overview" target="_blank" rel="noopener noreferrer" class="text-brand-teal-text text-xs mt-1 inline-block">Bill page ↗</a>
    </div>
    <div class="border-l-2 border-amber-500 pl-3">
      <p class="text-sm font-semibold text-brand-navy">Connecticut SB 3 health data amendments</p>
      <p class="text-xs text-slate mt-1">Layered on top of the Connecticut Data Privacy Act — adds consent and geofencing rules for consumer health data.</p>
    </div>
  </div>
</div>
`;

const STATE_HEALTH_TRACK = `
<p>Beyond standalone consumer health statutes, nearly every comprehensive state privacy law now treats health-related information as <strong>sensitive personal data</strong> requiring opt-in consent or a right to limit, and several states have added post-Dobbs reproductive and gender-affirming care protections.</p>
<ul>
  <li><strong><a href="/us-state-privacy-laws">California</a></strong> — CMIA layered with CCPA/CPRA sensitive data treatment; AB 254 and AB 352 add reproductive/gender-affirming care safeguards.</li>
  <li><strong>Illinois, Maryland, Washington</strong> — reproductive and gender-affirming care shield statutes restricting disclosure to out-of-state authorities.</li>
  <li><strong>Connecticut, Oregon, Montana, Texas, Colorado, Virginia</strong> — biometric and health data classified as sensitive under each comprehensive law.</li>
  <li><strong>New York SHIELD Act</strong> — security and breach obligations for private medical information.</li>
</ul>
`;

const AI_HEALTH = `
<p>The <strong>HHS AI Strategy</strong> currently provides voluntary frameworks; expect mandatory requirements by 2027. The <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689" target="_blank" rel="noopener noreferrer">EU AI Act</a> classifies AI systems used in healthcare as "high-risk." <a href="/us-state-privacy-laws">Colorado's AI Act</a> (<a href="https://leg.colorado.gov/bills/sb24-205" target="_blank" rel="noopener noreferrer">SB 24-205</a>, effective 2026) requires impact assessments for AI systems making consequential healthcare decisions. De-identification challenges loom: AI training on health data raises questions about re-identification risk and HIPAA exposure.</p>
`;

const BREACH_COMPARISON = `
<div class="cmp-table overflow-x-auto rounded-xl border border-brand-cloud">
  <table class="w-full text-sm border-collapse">
    <thead class="bg-brand-cloud text-slate">
      <tr>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Regime</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Trigger threshold</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Timeline</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Recipients</th>
      </tr>
    </thead>
    <tbody class="bg-card">
      <tr class="border-t border-brand-cloud align-top">
        <td class="px-4 py-3 font-semibold text-brand-navy">HIPAA Breach Notification Rule</td>
        <td class="px-4 py-3 text-slate">Unauthorized acquisition, access, use or disclosure of unsecured PHI — presumed a breach unless 4-factor risk assessment shows low probability of compromise.</td>
        <td class="px-4 py-3 text-slate"><strong class="text-rose-700">≤ 60 days</strong> from discovery to notify affected individuals. HHS notice within 60 days (≥500 affected) or annually (&lt;500). Media notice if ≥500 in a state or jurisdiction.</td>
        <td class="px-4 py-3 text-slate">Affected individuals, HHS OCR, prominent media outlets (when ≥500), and (for business associates) the covered entity within 60 days.</td>
      </tr>
      <tr class="border-t border-brand-cloud align-top">
        <td class="px-4 py-3 font-semibold text-brand-navy">FTC Health Breach Notification Rule</td>
        <td class="px-4 py-3 text-slate">Acquisition of identifiable health information without authorization, including <em>unauthorized sharing</em> with third-party ad platforms.</td>
        <td class="px-4 py-3 text-slate"><strong class="text-rose-700">≤ 60 days</strong> for individuals. FTC within 10 business days if ≥500 affected; otherwise annually.</td>
        <td class="px-4 py-3 text-slate">Affected individuals, FTC, and prominent media outlets if ≥500 residents of a state are affected.</td>
      </tr>
      <tr class="border-t border-brand-cloud align-top">
        <td class="px-4 py-3 font-semibold text-brand-navy">Washington MHMDA</td>
        <td class="px-4 py-3 text-slate">No separate breach rule — but unauthorized processing or sharing exposes the regulated entity to private right of action under the Washington Consumer Protection Act.</td>
        <td class="px-4 py-3 text-slate">Defer to Washington's general breach statute (RCW 19.255) — <strong class="text-rose-700">≤ 30 days</strong> for affected individuals and AG if ≥500 residents.</td>
        <td class="px-4 py-3 text-slate">Affected Washington consumers, Washington AG (if ≥500 affected), credit reporting agencies for certain data types.</td>
      </tr>
      <tr class="border-t border-brand-cloud align-top">
        <td class="px-4 py-3 font-semibold text-brand-navy">GDPR Art. 33–34 (special category health data)</td>
        <td class="px-4 py-3 text-slate">Personal data breach likely to result in a risk to rights and freedoms (Art. 33). Health data is special category — the threshold to notify individuals (high risk) is met quickly.</td>
        <td class="px-4 py-3 text-slate"><strong class="text-rose-700">≤ 72 hours</strong> to the lead supervisory authority. Individuals "without undue delay" when high risk.</td>
        <td class="px-4 py-3 text-slate">Lead supervisory authority, affected data subjects when high risk, processors must notify controllers without undue delay.</td>
      </tr>
    </tbody>
  </table>
</div>
<p class="text-[11px] text-brand-mist mt-2">Timelines run from <em>discovery</em>, not from incident occurrence. Stack obligations carefully — a single event can trigger HIPAA, FTC HBR, and state breach laws simultaneously.</p>
`;

export default function HealthDataPrivacyPage() {
  return (
    <>
      <Helmet>
        <link rel="canonical" href="/health-data-privacy" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Health Data Privacy: HIPAA, FTC Health Breach Rule, and State Laws",
          "description": "Comprehensive health data privacy guide for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "End User Privacy" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <ResearchPageLayout
        metaTitle="Health Data Privacy: HIPAA & State Laws | End User Privacy"
        metaDescription="Reference on health data privacy obligations across HIPAA, the FTC Health Breach Notification Rule, state consumer health data laws, and AI in healthcare."
        header={{
          eyebrow: "Research · Health Data",
          title: "Health Data Privacy: HIPAA, FTC Health Breach Rule, and State Laws",
          description:
            "Three different regimes regulate health data in the U.S. — and they barely overlap. Use the tracks below to find the rules that actually apply to you.",
          lastUpdated: "March 24, 2026",
          feedCategory: "health-data",
          stats: [
            { value: "60d", label: "HIPAA breach window" },
            { value: "$1.5M", label: "GoodRx FTC penalty" },
            { value: "$7.8M", label: "BetterHelp settlement" },
            { value: "5+", label: "state consumer health laws" },
          ],
        }}
        pageSynthesisKey="health__page"
        topToolCta={{
          toolName: "Impact Assessment Builder",
          toolDescription:
            "Structured DPIA for high-risk health-data processing — HIPAA overlap, FTC Health Breach Rule, and state consumer-health regimes.",
          href: "/dpia-framework",
          context: "Put this into practice:",
        }}
        sections={linkGlossaryFirstMentions([
          {
            id: "tracks",
            h2: "Which track applies to you?",
            synthesisKey: "health__tracks",
            content: TRACK_OVERVIEW,
          },
          {
            id: "hipaa",
            h2: "Track 1 — HIPAA covered entities & business associates",
            synthesisKey: "health__hipaa",
            complianceTrigger:
              "Applies if you are a healthcare provider, health plan, clearinghouse — or any vendor handling PHI on their behalf.",
            content: HIPAA_TRACK,
          },
          {
            id: "consumer-health",
            h2: "Track 2 — Consumer health data laws (non-HIPAA)",
            synthesisKey: "health__consumer_health",
            complianceTrigger:
              "Applies if you operate a health app, wearable, fitness tracker, or any DTC platform handling health-related data.",
            content: CONSUMER_HEALTH_TRACK,
          },
          {
            id: "state-health",
            h2: "Track 3 — State health privacy laws",
            synthesisKey: "health__state_health",
            complianceTrigger:
              "Applies if you process health-adjacent data (biometric, reproductive, gender-affirming care, mental health) about residents of comprehensive-law states.",
            content: STATE_HEALTH_TRACK,
          },
          {
            id: "ai",
            h2: "AI and health data — emerging obligations",
            synthesisKey: "health__ai",
            content: AI_HEALTH,
          },
          {
            id: "breach-comparison",
            h2: "Breach notification obligations — HIPAA vs. FTC vs. state vs. GDPR",
            synthesisKey: "health__breach_comparison",
            complianceTrigger:
              "A single health data incident frequently triggers multiple regimes at once — map each one before the clock starts.",
            content: BREACH_COMPARISON,
            toolCta: {
              toolName: "Breach Notification Workflow",
              toolDescription:
                "Walks you through trigger assessment, timeline calculation, and recipient checklists across HIPAA, FTC HBR, state breach laws, and GDPR.",
              href: "/breach-notification",
            },
            toolCtaPlacement: "bottom",
          },
        ])}
        relatedLinks={[
          { label: "Enforcement Tracker", href: "/enforcement-tracker" },
          { label: "Breach Notification", href: "/breach-notification" },
          { label: "Compliance Calendar", href: "/calendar" },
          { label: "Subscribe to Intelligence", href: "/subscribe" },
        ]}
        intelligenceUpsellTopic="health data privacy"
      />
    </>
  );
}
