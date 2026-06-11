import { Helmet } from "react-helmet-async";
import { ResearchPageLayout } from "@/components/research/ResearchPageLayout";
import { getProduct } from "@/lib/productRegistry";
import { linkGlossaryFirstMentions } from "@/lib/linkGlossaryTerms";

const REQUIREMENTS_MATRIX = `
<div class="cmp-table overflow-x-auto rounded-xl border border-brand-cloud">
  <table class="w-full text-sm border-collapse">
    <thead class="bg-brand-cloud text-slate">
      <tr>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Requirement</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">GDPR / ePrivacy</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">UK GDPR / PECR</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">CCPA / CPRA</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Other US states</th>
      </tr>
    </thead>
    <tbody class="bg-card text-slate">
      <tr class="border-t border-brand-cloud">
        <td class="px-4 py-3 font-medium text-brand-navy">Prior consent before non-essential cookies</td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">Not required (opt-out model)</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-300">Not required (opt-out)</span></td>
      </tr>
      <tr class="border-t border-brand-cloud">
        <td class="px-4 py-3 font-medium text-brand-navy">Granular purpose categories</td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">Recommended</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">Recommended</span></td>
      </tr>
      <tr class="border-t border-brand-cloud">
        <td class="px-4 py-3 font-medium text-brand-navy">Refusal as easy as acceptance</td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required (symmetry rule)</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required</span></td>
      </tr>
      <tr class="border-t border-brand-cloud">
        <td class="px-4 py-3 font-medium text-brand-navy">Withdraw as easy as give</td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required</span></td>
      </tr>
      <tr class="border-t border-brand-cloud">
        <td class="px-4 py-3 font-medium text-brand-navy">No dark patterns</td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required (EDPB 03/2022)</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required (ICO guidance)</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required (CPPA regs)</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required</span></td>
      </tr>
      <tr class="border-t border-brand-cloud">
        <td class="px-4 py-3 font-medium text-brand-navy">Record of consent (auditable)</td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required (Art. 7(1))</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">Recommended (opt-out logs)</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">Recommended</span></td>
      </tr>
      <tr class="border-t border-brand-cloud">
        <td class="px-4 py-3 font-medium text-brand-navy">Honour Global Privacy Control / universal opt-out</td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">Recommended</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">Recommended</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required (CPRA regs)</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required (CO, CT, OR, TX)</span></td>
      </tr>
      <tr class="border-t border-brand-cloud">
        <td class="px-4 py-3 font-medium text-brand-navy">Sensitive data opt-in / right to limit</td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required (Art. 9)</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Required</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Right to Limit</span></td>
        <td class="px-4 py-3"><span class="inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">Opt-in (CO, CT, VA, OR…)</span></td>
      </tr>
    </tbody>
  </table>
</div>
<p class="text-[11px] text-brand-mist mt-2">"Required" = enforceable obligation. "Recommended" = best practice or strongly indicated by regulator guidance. "Not required" = no affirmative obligation, but the practical option in a multi-jurisdiction deployment is usually to apply the stricter rule.</p>
`;

const STRICTEST_CHECKLIST = `
<div class="rounded-xl border-l-4 border-accent bg-accent/5 p-5">
  <p class="text-[11px] font-semibold uppercase tracking-wider text-accent mb-2">What your banner must do</p>
  <p class="text-xs text-slate mb-3">Operationalised from the strictest applicable obligations — apply globally if your site reaches EU/UK and U.S. visitors.</p>
  <ol class="space-y-2 text-sm text-brand-navy list-decimal list-inside">
    <li>Block all non-essential cookies <strong>before</strong> the user makes a choice — including analytics, ads, social pixels, and chat widgets.</li>
    <li>Offer "Accept all", "Reject all" and "Manage preferences" with <strong>equal visual weight</strong> and the same number of clicks.</li>
    <li>Present granular toggles by purpose category (analytics, advertising, personalisation, social), all off by default.</li>
    <li>Make withdrawing consent as easy as giving it — surface a persistent "Cookie settings" link in the footer.</li>
    <li>Honour the <a href="https://globalprivacycontrol.org/" target="_blank" rel="noopener noreferrer">Global Privacy Control</a> signal as a valid opt-out for U.S. visitors.</li>
    <li>Avoid dark patterns: no pre-ticked boxes, no nudging colour contrast, no consent walls that block content.</li>
    <li>Store an auditable consent record per user (timestamp, banner version, choices made, IP / pseudonymous ID).</li>
    <li>Re-prompt when the cookie inventory changes materially or after 12–13 months for EU visitors.</li>
    <li>Surface a "Do Not Sell or Share My Personal Information" and "Limit the Use of My Sensitive Personal Information" link for California visitors.</li>
    <li>Publish a cookie notice that lists each cookie, its purpose, duration, recipients, and the legal basis.</li>
  </ol>
</div>
`;

const GDPR_DETAIL = `
<details class="group rounded-xl border border-brand-cloud bg-card">
  <summary class="cursor-pointer px-5 py-4 flex items-center justify-between text-brand-navy font-semibold list-none">
    <span>Read the rules for GDPR &amp; the ePrivacy Directive (EU/EEA)</span>
    <span class="text-brand-mist text-xs group-open:rotate-180 transition-transform">▾</span>
  </summary>
  <div class="px-5 pb-5 text-sm text-slate space-y-3">
    <p>Under the GDPR (<a href="https://gdpr-info.eu/art-6-gdpr/" target="_blank" rel="noopener noreferrer">Art. 6</a>, <a href="https://gdpr-info.eu/art-7-gdpr/" target="_blank" rel="noopener noreferrer">Art. 7</a>) and the <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32002L0058" target="_blank" rel="noopener noreferrer">ePrivacy Directive (Article 5(3))</a>, websites operating in the EU must obtain prior consent before placing non-essential cookies, provide clear information about each cookie's purpose and recipients, make refusal as easy as acceptance, keep records of consent, and allow withdrawal at any time.</p>
    <p>The <a href="https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en" target="_blank" rel="noopener noreferrer">EDPB Guidelines 05/2020 on Consent</a> clarify that scrolling or continued use does not constitute valid consent, and <a href="https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-032022-deceptive-design-patterns-social-media_en" target="_blank" rel="noopener noreferrer">Guidelines 03/2022</a> identify common dark patterns to avoid.</p>
  </div>
</details>

<details class="group rounded-xl border border-brand-cloud bg-card mt-3">
  <summary class="cursor-pointer px-5 py-4 flex items-center justify-between text-brand-navy font-semibold list-none">
    <span>Read the rules for UK GDPR &amp; PECR</span>
    <span class="text-brand-mist text-xs group-open:rotate-180 transition-transform">▾</span>
  </summary>
  <div class="px-5 pb-5 text-sm text-slate space-y-3">
    <p>The Privacy and Electronic Communications Regulations (PECR), read with the UK GDPR, mirror the EU consent standard. The ICO has issued formal warnings to over 100 top UK websites and published <a href="https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/online-tracking/" target="_blank" rel="noopener noreferrer">cookie consent guidance</a> emphasising symmetrical Accept/Reject controls.</p>
  </div>
</details>

<details class="group rounded-xl border border-brand-cloud bg-card mt-3">
  <summary class="cursor-pointer px-5 py-4 flex items-center justify-between text-brand-navy font-semibold list-none">
    <span>Read the rules for CCPA / CPRA (California)</span>
    <span class="text-brand-mist text-xs group-open:rotate-180 transition-transform">▾</span>
  </summary>
  <div class="px-5 pb-5 text-sm text-slate space-y-3">
    <p><a href="/us-state-privacy-laws">CCPA/CPRA</a> uses an opt-out model: businesses may collect data via cookies without prior consent but must offer a clear "Do Not Sell or Share My Personal Information" link and a "Limit the Use of My Sensitive Personal Information" link where applicable. The <a href="https://cppa.ca.gov/regulations/" target="_blank" rel="noopener noreferrer">CPPA regulations</a> require honouring the <a href="https://globalprivacycontrol.org/" target="_blank" rel="noopener noreferrer">Global Privacy Control</a> signal as a valid opt-out and prohibit dark patterns in consent flows. The <a href="https://cppa.ca.gov/regulations/automated_decisionmaking.html" target="_blank" rel="noopener noreferrer">ADMT rules</a> further extend obligations to AI-driven profiling enabled by cookie data.</p>
  </div>
</details>

<details class="group rounded-xl border border-brand-cloud bg-card mt-3">
  <summary class="cursor-pointer px-5 py-4 flex items-center justify-between text-brand-navy font-semibold list-none">
    <span>Read the rules for other U.S. states (CO, CT, VA, OR, TX, MT, …)</span>
    <span class="text-brand-mist text-xs group-open:rotate-180 transition-transform">▾</span>
  </summary>
  <div class="px-5 pb-5 text-sm text-slate space-y-3">
    <p><a href="/us-state-privacy-laws">Colorado, Connecticut, Oregon and Texas</a> require honouring universal opt-out signals such as GPC. Most comprehensive state laws require <strong>opt-in</strong> for sensitive data processing (including targeted advertising in some states), and prohibit dark patterns in the consent interface. Penalties are AG-enforced; California is the only state with a dedicated privacy agency (the CPPA).</p>
  </div>
</details>
`;

const ENFORCEMENT = `<ul>
<li><strong><a href="/regulator/cnil">National Commission on Informatics and Liberty (CNIL)</a></strong> — fined Google €150M and Facebook €60M (2022) for making cookie refusal harder than acceptance.</li>
<li><strong><a href="/regulator/apdgba">Belgian Data Protection Authority (APD/GBA)</a></strong> — fined IAB Europe €250K over the TCF framework's legal basis.</li>
<li><strong><a href="/regulator/ico">Information Commissioner's Office (ICO)</a></strong> — issued formal warnings to over 100 top <a href="/jurisdiction/united-kingdom">UK</a> websites about non-compliant banners.</li>
<li><strong><a href="/regulator/aepd">Spanish Data Protection Agency (AEPD)</a></strong> — fined companies for pre-ticked consent boxes.</li>
<li><strong>California AG / CPPA</strong> — Sephora ($1.2M, 2022) and Tilting Point ($500K, 2024) for failing to honour opt-outs / GPC.</li>
</ul>`;

export default function CookieConsentPage() {
  return (
    <>
      <Helmet>
        <link rel="canonical" href="/cookie-consent" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Cookie Consent Requirements by Jurisdiction",
          "description": "Comprehensive guide to global cookie consent requirements for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "End User Privacy" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <ResearchPageLayout
        metaTitle="Cookie Consent Requirements by Jurisdiction | End User Privacy"
        metaDescription="Side-by-side requirements matrix for cookie consent under GDPR, ePrivacy, UK PECR, CCPA/CPRA and U.S. state privacy laws — with an actionable banner checklist."
        header={{
          eyebrow: "Research · Cookie Consent",
          title: "Cookie Consent Requirements by Jurisdiction",
          description:
            "Most sites span EU, UK and U.S. visitors at once. Start with the side-by-side matrix and the strictest-applicable banner checklist — then drill into the per-jurisdiction rules below.",
          lastUpdated: "March 24, 2026",
          feedCategory: "adtech-consent",
          stats: [
            { value: "€150M", label: "CNIL Google fine" },
            { value: "€60M", label: "CNIL Facebook fine" },
            { value: "€250K", label: "IAB Europe TCF fine" },
            { value: "100+", label: "ICO notices issued" },
          ],
        }}
        pageSynthesisKey="cookie__page"
        sections={linkGlossaryFirstMentions([
          {
            id: "matrix",
            h2: "Requirements matrix — GDPR vs. PECR vs. CCPA vs. other US states",
            synthesisKey: "cookie__matrix",
            content: REQUIREMENTS_MATRIX,
          },
          {
            id: "checklist",
            h2: "What your banner must do",
            synthesisKey: "cookie__checklist",
            content: STRICTEST_CHECKLIST,
            toolCta: {
              toolName: getProduct("eu-global-notice").name,
              toolDescription:
                "Generate a GDPR- and CPRA-aligned privacy notice with cookie consent disclosures, legal basis tables and data subject rights wording.",
              href: getProduct("eu-global-notice").route,
            },
            toolCtaPlacement: "bottom",
          },
          {
            id: "per-jurisdiction",
            h2: "Read the rules for each jurisdiction",
            synthesisKey: "cookie__per_jurisdiction",
            content: GDPR_DETAIL,
          },
          {
            id: "enforcement",
            h2: "Cookie enforcement — DPA actions and fines",
            synthesisKey: "cookie__enforcement",
            content: ENFORCEMENT,
            toolCta: {
              toolName: "Governance Assessment",
              toolDescription:
                "Assess your cookie consent program against CNIL, ICO, CPPA and EDPB enforcement patterns.",
              href: "/governance-assessment",
            },
            toolCtaPlacement: "bottom",
          },
        ])}
        relatedLinks={[
          { label: "Enforcement Tracker", href: "/enforcement-tracker" },
          { label: "AdTech & Consent Hub", href: "/topics/adtech" },
          { label: "Jurisdictions Map", href: "/jurisdictions" },
          { label: "Subscribe to Intelligence", href: "/subscribe" },
        ]}
        intelligenceUpsellTopic="cookie consent and online tracking"
      />
    </>
  );
}
