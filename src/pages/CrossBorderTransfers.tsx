import { Helmet } from "react-helmet-async";
import { ResearchPageLayout } from "@/components/research/ResearchPageLayout";
import { TransferMechanismSelector } from "@/components/research/TransferMechanismSelector";
import { getProduct } from "@/lib/productRegistry";
import { linkGlossaryFirstMentions } from "@/lib/linkGlossaryTerms";
import { CROSS_BORDER_SECTION_RAIL } from "@/components/research/researchRailEntries/crossBorderRailEntries";

const MECHANISM_TABLE = `
<div class="cmp-table overflow-x-auto rounded-xl border border-brand-cloud">
  <table class="w-full text-sm border-collapse">
    <thead class="bg-brand-cloud text-slate">
      <tr>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Mechanism</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Who can use it</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Effort to implement</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">When to use</th>
      </tr>
    </thead>
    <tbody class="bg-card">
      <tr class="border-t border-brand-cloud align-top">
        <td class="px-4 py-3 font-semibold text-brand-navy">
          Adequacy decision
          <div class="text-[11px] font-normal text-brand-mist mt-0.5">GDPR Art. 45</div>
        </td>
        <td class="px-4 py-3 text-slate">Any exporter transferring to a country on the EU/UK adequacy list.</td>
        <td class="px-4 py-3 text-slate"><strong class="text-emerald-700">Low.</strong> No transfer-specific contract needed; a DPA still applies under Art. 28.</td>
        <td class="px-4 py-3 text-slate">Default whenever the destination is covered — UK, Japan, Canada (commercial), Switzerland, South Korea, New Zealand, Israel, EU–US DPF certified importers.</td>
      </tr>
      <tr class="border-t border-brand-cloud align-top">
        <td class="px-4 py-3 font-semibold text-brand-navy">
          2021 Standard Contractual Clauses
          <div class="text-[11px] font-normal text-brand-mist mt-0.5">Commission Decision 2021/914</div>
        </td>
        <td class="px-4 py-3 text-slate">Any exporter — four modules cover C2C, C2P, P2P, P2C scenarios.</td>
        <td class="px-4 py-3 text-slate"><strong class="text-amber-700">Medium.</strong> Module selection, annex completion and a Transfer Impact Assessment per data flow.</td>
        <td class="px-4 py-3 text-slate">Default for non-adequate destinations. Also recommended as fallback alongside DPF certifications.</td>
      </tr>
      <tr class="border-t border-brand-cloud align-top">
        <td class="px-4 py-3 font-semibold text-brand-navy">
          Binding Corporate Rules
          <div class="text-[11px] font-normal text-brand-mist mt-0.5">GDPR Art. 47</div>
        </td>
        <td class="px-4 py-3 text-slate">Multinational corporate groups for intra-group transfers only.</td>
        <td class="px-4 py-3 text-slate"><strong class="text-rose-700">High.</strong> 18–36 month lead supervisory authority approval process.</td>
        <td class="px-4 py-3 text-slate">Established groups with significant intra-group data flows that want a durable, audit-friendly mechanism.</td>
      </tr>
      <tr class="border-t border-brand-cloud align-top">
        <td class="px-4 py-3 font-semibold text-brand-navy">
          Article 49 derogations
          <div class="text-[11px] font-normal text-brand-mist mt-0.5">GDPR Art. 49</div>
        </td>
        <td class="px-4 py-3 text-slate">Any exporter — but only for occasional, non-systematic transfers.</td>
        <td class="px-4 py-3 text-slate"><strong class="text-emerald-700">Low</strong> for one-offs; <strong class="text-rose-700">unusable</strong> for ongoing flows.</td>
        <td class="px-4 py-3 text-slate">Explicit consent, contract necessity, legal claims, vital interests, or compelling legitimate interests on a narrow basis.</td>
      </tr>
      <tr class="border-t border-brand-cloud align-top">
        <td class="px-4 py-3 font-semibold text-brand-navy">
          Certification / Codes of Conduct
          <div class="text-[11px] font-normal text-brand-mist mt-0.5">GDPR Arts. 40–42</div>
        </td>
        <td class="px-4 py-3 text-slate">Sectoral participants once a Commission-approved scheme exists.</td>
        <td class="px-4 py-3 text-slate"><strong class="text-amber-700">Medium.</strong> Depends on scheme; ongoing monitoring required.</td>
        <td class="px-4 py-3 text-slate">Emerging option — limited approved schemes today; watch the Global CBPR Forum.</td>
      </tr>
    </tbody>
  </table>
</div>
`;

const ADEQUACY_TABLE = `
<div class="cmp-table overflow-x-auto rounded-xl border border-brand-cloud">
  <table class="w-full text-sm border-collapse">
    <thead class="bg-brand-cloud text-slate">
      <tr>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Country / Territory</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Adopted</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Last review</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Status</th>
      </tr>
    </thead>
    <tbody class="bg-card">
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 font-medium text-brand-navy">United Kingdom</td><td class="px-4 py-3 text-slate">2021</td><td class="px-4 py-3 text-slate">2025</td><td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">Renewal under review</span></td></tr>
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 font-medium text-brand-navy">Japan</td><td class="px-4 py-3 text-slate">2019</td><td class="px-4 py-3 text-slate">2023</td><td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">In force (mutual)</span></td></tr>
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 font-medium text-brand-navy">South Korea</td><td class="px-4 py-3 text-slate">2021</td><td class="px-4 py-3 text-slate">2024</td><td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">In force (mutual)</span></td></tr>
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 font-medium text-brand-navy">Switzerland</td><td class="px-4 py-3 text-slate">2000</td><td class="px-4 py-3 text-slate">2024</td><td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">In force</span></td></tr>
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 font-medium text-brand-navy">Canada (commercial)</td><td class="px-4 py-3 text-slate">2001</td><td class="px-4 py-3 text-slate">2024</td><td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">In force</span></td></tr>
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 font-medium text-brand-navy">New Zealand</td><td class="px-4 py-3 text-slate">2012</td><td class="px-4 py-3 text-slate">2024</td><td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">In force</span></td></tr>
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 font-medium text-brand-navy">Israel</td><td class="px-4 py-3 text-slate">2011</td><td class="px-4 py-3 text-slate">2024</td><td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">In force</span></td></tr>
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 font-medium text-brand-navy">Argentina</td><td class="px-4 py-3 text-slate">2003</td><td class="px-4 py-3 text-slate">2024</td><td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">In force</span></td></tr>
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 font-medium text-brand-navy">Uruguay</td><td class="px-4 py-3 text-slate">2012</td><td class="px-4 py-3 text-slate">2024</td><td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">In force</span></td></tr>
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 font-medium text-brand-navy">Andorra, Faroe Islands, Guernsey, Isle of Man, Jersey</td><td class="px-4 py-3 text-slate">2010–2013</td><td class="px-4 py-3 text-slate">2024</td><td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">In force</span></td></tr>
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 font-medium text-brand-navy">United States (DPF-certified entities)</td><td class="px-4 py-3 text-slate">Jul 2023</td><td class="px-4 py-3 text-slate">2024 (first review)</td><td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">Schrems III challenge pending</span></td></tr>
    </tbody>
  </table>
</div>
<p class="text-[11px] text-brand-mist mt-2">Adequacy decisions cover specific scopes (e.g. commercial transfers in Canada, certified entities in the US). Always confirm scope against the operative Commission decision.</p>
`;

export default function CrossBorderTransfersPage() {
  return (
    <>
      <Helmet>
        <link rel="canonical" href="/cross-border-transfers" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Cross-Border Data Transfers: GDPR, SCCs, DPF & Global Rules",
          "description": "Comprehensive guide to international data transfer mechanisms for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "End User Privacy" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <ResearchPageLayout
        metaTitle="Cross-Border Data Transfers | End User Privacy"
        metaDescription="Reference on international data transfer mechanisms — GDPR Chapter V, the 2021 SCCs, the EU-U.S. Data Privacy Framework, Transfer Impact Assessments, and Asia-Pacific frameworks."
        header={{
          eyebrow: "Research · Cross-Border Transfers",
          title: "Cross-Border Data Transfers: GDPR, SCCs, DPF & Global Rules",
          description:
            "International transfers sit on top of fragile legal foundations — Schrems II reset the world, and the DPF could be next. This is the working reference for the mechanisms still in force today.",
          lastUpdated: "June 10, 2026",
          feedCategory: "cross-border",
          stats: [
            { value: "~15", label: "EU adequacy decisions" },
            { value: "4 modules", label: "2021 SCCs" },
            { value: "Jul 2023", label: "EU–US DPF adopted" },
            { value: "Schrems III", label: "challenge ongoing" },
          ],
        }}
        pageSynthesisKey="crossborder__page"
        topToolCta={{
          toolName: getProduct("dpia").name,
          toolDescription:
            "Transfer risk lives inside your impact assessments. Build a structured DPIA covering your cross-border processing — Schrems II factors, supplementary measures, and documentation formatted for counsel review.",
          href: getProduct("dpia").route,
        }}
        introBlock={<TransferMechanismSelector />}
        sections={linkGlossaryFirstMentions([
          {
            id: "eu-mechanisms",
            h2: "Transfer mechanisms at a glance",
            synthesisKey: "crossborder__eu_mechanisms",
            content: MECHANISM_TABLE,
            toolCta: {
              toolName: "SCC & DPA Generator",
              toolDescription:
                "Draft 2021 SCCs and the surrounding DPA in minutes — module selection, annexes and sub-processor schedule included.",
              href: "/dpa-generator",
              context: "Pairs with Module 2 (C2P) and Module 3 (P2P) SCC workflows.",
            },
            toolCtaPlacement: "bottom",
          },
          {
            id: "adequacy",
            h2: "Current adequacy decisions",
            synthesisKey: "crossborder__adequacy",
            content: ADEQUACY_TABLE,
            complianceTrigger:
              "Adequacy is the simplest path — but the UK renewal and the EU–US DPF both sit under active legal challenge.",
          },
          {
            id: "dpf",
            h2: "EU-U.S. Data Privacy Framework",
            synthesisKey: "crossborder__dpf",
            content: `<p>The EU-U.S. Data Privacy Framework, adopted July 2023, replaced the invalidated <a href="https://curia.europa.eu/juris/document/document.jsf?docid=228677" target="_blank" rel="noopener noreferrer">Privacy Shield</a>. U.S. organizations self-certify to the <a href="https://www.dataprivacyframework.gov/s/article/How-to-Join-the-DPF-Program-Participants" target="_blank" rel="noopener noreferrer">Department of Commerce</a>; <a href="https://www.federalregister.gov/documents/2022/10/14/2022-22520/enhancing-safeguards-for-united-states-signals-intelligence-activities" target="_blank" rel="noopener noreferrer">Executive Order 14086</a> imposes proportionality on U.S. signals intelligence; the <a href="https://www.justice.gov/dprc" target="_blank" rel="noopener noreferrer">Data Protection Review Court</a> provides redress. The <a href="https://www.gov.uk/government/publications/uk-us-data-bridge" target="_blank" rel="noopener noreferrer">UK-U.S. Data Bridge</a> extends similar protections. Maintain SCCs as a fallback — <a href="https://noyb.eu/en" target="_blank" rel="noopener noreferrer">NOYB</a> has signaled Schrems III challenges.</p>`,
          },
          {
            id: "tia",
            h2: "Transfer Impact Assessments",
            synthesisKey: "crossborder__tia",
            content: `<p>Post-Schrems II, TIAs are required when relying on SCCs or BCRs. The <a href="https://www.edpb.europa.eu/our-work-tools/our-documents/recommendations/recommendations-012020-measures-supplement-transfer_en" target="_blank" rel="noopener noreferrer">EDPB's Recommendations 01/2020</a> provide the authoritative framework: map transfers, identify the mechanism, assess recipient country surveillance law, evaluate practical risk, implement supplementary measures (encryption, pseudonymization, split processing), and document.</p>`,
          },
          {
            id: "derogations",
            h2: "Article 49 derogations",
            synthesisKey: "crossborder__derogations",
            content: `<p>Article 49 permits transfers without an adequacy decision or appropriate safeguards in narrow circumstances — explicit consent, contract necessity, important reasons of public interest, legal claims, vital interests, or transfers from a public register. The "compelling legitimate interests" sub-derogation is interpreted by the <a href="https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-22018-derogations-article-49-under-regulation-2016679_en" target="_blank" rel="noopener noreferrer">EDPB Guidelines 2/2018</a> as a measure of last resort, non-systematic, and requiring a documented balancing test plus DPA notification.</p>`,
            toolCta: {
              toolName: "Legitimate Interest Assessment",
              toolDescription:
                "Run the three-part LIA — necessity, balancing, safeguards — to support reliance on the Art. 49(1)(g) compelling legitimate interests derogation.",
              href: "/li-assessment",
            },
            toolCtaPlacement: "bottom",
          },
          {
            id: "apac",
            h2: "Asia-Pacific Transfer Frameworks",
            synthesisKey: "crossborder__apac",
            content: `<ul>
<li><strong><a href="/jurisdiction/china">China PIPL</a></strong> (Articles 38–43) — security assessments, standard contracts, or certification. Enforced by the <a href="/regulator/cac">Cyberspace Administration of China (CAC)</a>.</li>
<li><strong><a href="/jurisdiction/japan">Japan APPI</a></strong> — equivalent-protection model; mutual EU adequacy. Enforced by the <a href="/regulator/ppc">Personal Information Protection Commission (PPC)</a>.</li>
<li><strong><a href="/jurisdiction/south-korea">South Korea PIPA</a></strong> — EU adequacy since December 2021. Enforced by the <a href="/regulator/pipc">Personal Information Protection Commission (PIPC)</a>.</li>
<li><strong><a href="/jurisdiction/india">India DPDP Act</a></strong> — permits transfers except to a future government blacklist.</li>
<li><strong><a href="/jurisdiction/singapore">Singapore PDPA</a></strong> — comparable-protection standard. Enforced by the <a href="/regulator/pdpc">Personal Data Protection Commission (PDPC)</a>.</li>
<li><strong><a href="https://globalcbpr.org/" target="_blank" rel="noopener noreferrer">Global CBPR Forum</a></strong> — voluntary certification framework succeeding APEC CBPR.</li>
</ul>`,
          },
          {
            id: "enforcement",
            h2: "Cross-Border Transfer Enforcement",
            synthesisKey: "crossborder__enforcement",
            content: `<p>Cross-border enforcement has been concentrated in CJEU rulings and major DPA actions: <strong>Schrems II</strong> invalidated Privacy Shield; the Irish <a href="/regulator/dpc">Data Protection Commission (DPC)</a>'s <strong>€1.2B Meta fine</strong> targeted EU-U.S. transfers; the Austrian <a href="/regulator/dsb">Austrian Data Protection Authority (DSB)</a> and <a href="/regulator/cnil">National Commission on Informatics and Liberty (CNIL)</a> ruled <strong>Google Analytics</strong> transfers unlawful absent supplementary measures. China's <a href="/regulator/cac">CAC</a> has actively enforced <a href="/jurisdiction/china">PIPL</a> cross-border transfer requirements against multinational and domestic operators.</p>`,
          },
        ])}
        relatedLinks={[
          { label: "Jurisdictions Map", href: "/jurisdictions" },
          { label: "GDPR Enforcement", href: "/gdpr-enforcement" },
          { label: "Global Privacy Laws", href: "/global-privacy-laws" },
          { label: "Subscribe to Intelligence", href: "/subscribe" },
        ]}
        intelligenceUpsellTopic="cross-border data transfers"
      />
    </>
  );
}
