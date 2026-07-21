import { Helmet } from "react-helmet-async";
import { ResearchPageLayout } from "@/components/research/ResearchPageLayout";
import { BiometricDecisionChecklist } from "@/components/research/BiometricDecisionChecklist";
import { getProduct } from "@/lib/productRegistry";
import { linkGlossaryFirstMentions } from "@/lib/linkGlossaryTerms";

const TIERED_STATE_LAWS = `
<div class="space-y-5">
  <div class="rounded-xl border-l-4 border-rose-500 bg-rose-50 p-5">
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-600 text-white">Highest obligation</span>
      <span class="text-xs text-rose-900 font-semibold">Private right of action · no cure period · per-scan damages</span>
    </div>
    <h3 class="text-brand-navy text-lg mb-1">Illinois — BIPA</h3>
    <p class="text-sm text-slate leading-relaxed">
      <a href="https://www.ilga.gov/legislation/ilcs/ilcs3.asp?ActID=3004&amp;ChapterID=57" target="_blank" rel="noopener noreferrer">740 ILCS 14</a> requires written informed consent before collecting biometric identifiers, a publicly available retention and destruction schedule, no sale or trade of biometric data, and reasonable security. The <strong>private right of action</strong> allows $1,000 per negligent and $5,000 per intentional or reckless violation, and <a href="https://courts.illinois.gov/Opinions/SupremeCourt/2023/127891.pdf" target="_blank" rel="noopener noreferrer">Cothron v. White Castle</a> (2023) confirmed damages accrue <em>per scan</em>. Even a small employee population can produce nine-figure exposure.
    </p>
  </div>

  <div class="rounded-xl border-l-4 border-amber-500 bg-amber-50 p-5">
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-600 text-white">Moderate obligation</span>
      <span class="text-xs text-amber-900 font-semibold">AG enforcement · consent + retention · large state-led settlements</span>
    </div>
    <h3 class="text-brand-navy text-lg mb-1">Texas — CUBI · Washington — RCW 19.375</h3>
    <p class="text-sm text-slate leading-relaxed">
      <strong><a href="https://statutes.capitol.texas.gov/Docs/BC/htm/BC.503.htm" target="_blank" rel="noopener noreferrer">Texas CUBI</a></strong> prohibits capturing biometric identifiers for commercial purposes without informed consent and is enforced exclusively by the Attorney General. In 2024 Texas secured a <strong>$1.4B settlement from Meta</strong> for unauthorized facial recognition — the largest single-state biometric recovery to date.
      <br /><br />
      <strong><a href="https://app.leg.wa.gov/rcw/default.aspx?cite=19.375" target="_blank" rel="noopener noreferrer">Washington RCW 19.375</a></strong> prohibits enrolling biometric identifiers in a commercial database without notice and consent. AG-enforced, no private right of action, but consent and retention requirements are comparable to BIPA in substance.
    </p>
  </div>

  <div class="rounded-xl border-l-4 border-slate-400 bg-brand-cloud p-5">
    <div class="flex items-center gap-2 mb-2">
      <span class="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-600 text-white">Disclosure / sensitive-data tier</span>
      <span class="text-xs text-slate font-semibold">Comprehensive privacy laws — biometric data treated as sensitive</span>
    </div>
    <h3 class="text-brand-navy text-lg mb-1">California, Colorado, Virginia, Connecticut, Oregon, Montana, Texas TDPSA…</h3>
    <p class="text-sm text-slate leading-relaxed">
      Nearly every <a href="/us-state-privacy-laws">comprehensive U.S. state privacy law</a> classifies biometric data as <strong>sensitive personal information</strong>, requiring opt-in consent (or a right to limit, under California), disclosure in the privacy notice, and inclusion in data subject request workflows. Enforced by state Attorneys General (and the CPPA in California), without a private right of action specific to biometrics.
    </p>
  </div>
</div>
`;

const ENFORCEMENT_HISTORY = `
<div class="cmp-table overflow-x-auto rounded-xl border border-brand-cloud">
  <table class="w-full text-sm border-collapse">
    <thead class="bg-brand-cloud text-slate">
      <tr>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Year</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Defendant</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Statute</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Amount</th>
        <th class="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider">Theory</th>
      </tr>
    </thead>
    <tbody class="bg-card">
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 text-slate">2024</td><td class="px-4 py-3 font-semibold text-brand-navy">Meta (Texas AG)</td><td class="px-4 py-3 text-slate">Texas CUBI</td><td class="px-4 py-3 font-semibold text-rose-700">$1.4B</td><td class="px-4 py-3 text-slate">Unauthorised facial recognition in Tag Suggestions</td></tr>
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 text-slate">2022</td><td class="px-4 py-3 font-semibold text-brand-navy">BNSF Railway</td><td class="px-4 py-3 text-slate">Illinois BIPA</td><td class="px-4 py-3 font-semibold text-rose-700">$228M (jury)</td><td class="px-4 py-3 text-slate">Fingerprint timekeeping by a third-party vendor</td></tr>
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 text-slate">2022</td><td class="px-4 py-3 font-semibold text-brand-navy">Google</td><td class="px-4 py-3 text-slate">Illinois BIPA</td><td class="px-4 py-3 font-semibold text-rose-700">$100M</td><td class="px-4 py-3 text-slate">Google Photos face grouping</td></tr>
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 text-slate">2021</td><td class="px-4 py-3 font-semibold text-brand-navy">Facebook / Meta</td><td class="px-4 py-3 text-slate">Illinois BIPA</td><td class="px-4 py-3 font-semibold text-rose-700">$650M</td><td class="px-4 py-3 text-slate">Tag Suggestions face templates</td></tr>
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 text-slate">2023</td><td class="px-4 py-3 font-semibold text-brand-navy">Rite Aid (FTC)</td><td class="px-4 py-3 text-slate">FTC Act §5</td><td class="px-4 py-3 font-semibold text-rose-700">5-year ban</td><td class="px-4 py-3 text-slate">Facial recognition for theft detection — disparate impact</td></tr>
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 text-slate">2023</td><td class="px-4 py-3 font-semibold text-brand-navy">TikTok</td><td class="px-4 py-3 text-slate">Illinois BIPA</td><td class="px-4 py-3 font-semibold text-rose-700">$92M</td><td class="px-4 py-3 text-slate">In-app facial geometry collection</td></tr>
      <tr class="border-t border-brand-cloud"><td class="px-4 py-3 text-slate">2020</td><td class="px-4 py-3 font-semibold text-brand-navy">Clearview AI (multi-DPA)</td><td class="px-4 py-3 text-slate">GDPR Art. 9</td><td class="px-4 py-3 font-semibold text-rose-700">€20M+ cumulative</td><td class="px-4 py-3 text-slate">Scraped facial images — France, Italy, UK, Greece, Netherlands</td></tr>
    </tbody>
  </table>
</div>
<p class="text-[11px] text-brand-mist mt-2">Settlement amounts as reported by court filings and AG press releases; BIPA totals are net of attorneys' fees.</p>
`;

export default function BiometricPrivacyPage() {
  return (
    <>
      <Helmet>
        <link rel="canonical" href="/biometric-privacy" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Biometric Privacy Laws: BIPA, State Laws & GDPR",
          "description": "Comprehensive guide to biometric privacy laws for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "End User Privacy" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <ResearchPageLayout
        metaTitle="Biometric Privacy Laws: BIPA, State Laws & GDPR | End User Privacy"
        metaDescription="Reference for privacy professionals on biometric data regulation — Illinois BIPA, Texas CUBI, Washington, GDPR Article 9, EU AI Act, and workplace compliance."
        header={{
          eyebrow: "Research · Biometric Privacy",
          title: "Biometric Privacy Laws: BIPA, State Laws & GDPR",
          statuteCite: "740 ILCS 14 (BIPA) · GDPR Art. 9(1) — special-category biometric identifiers",
          description:
            "Biometric data is regulated more strictly than almost any other category — and exposure compounds quickly under BIPA's per-scan damages model. Start with the checklist to see what applies.",
          lastUpdated: "June 10, 2026",
          feedCategory: "biometric",
          stats: [
            { value: "$1K–$5K", label: "BIPA per-violation damages" },
            { value: "$650M", label: "Meta BIPA settlement" },
            { value: "$1.4B", label: "Texas–Meta settlement" },
            { value: "6+", label: "state biometric laws" },
          ],
        }}
        atAGlance={[
          { label: "Toughest US regime", value: "Illinois BIPA — private right of action, $1K/$5K per violation" },
          { label: "Companion state laws", value: "Texas CUBI, Washington HB 1493, Colorado § 6-1-1308(7)" },
          { label: "EU treatment", value: "GDPR Art. 9(1) — biometric ID data is special-category; Art. 9(2) basis required" },
          { label: "Recent watershed", value: "$1.4B Texas–Meta settlement (2024) confirms scale of exposure" },
        ]}
        merchandisingRail={{
          heading: "Use this in your workflow",
          items: [
            { label: "Biometric Compliance Assessment", href: "/biometric-checker", description: "State-by-state BIPA/CUBI/HB1493 compliance diagnostic." },
            { label: "EU & Global Notice Builder", href: "/eu-global-notice-builder", description: "Art. 13/14 notice with Art. 9(2) legal-basis language for biometrics." },
            { label: "Weekly Enforcement Intelligence", href: "/subscribe", description: "Every material biometric enforcement action, curated weekly." },
          ],
        }}

        pageSynthesisKey="biometric__page"
        topToolCta={{
          toolName: "Biometric Compliance Assessment",
          toolDescription:
            "BIPA statutory exposure calculator and multi-jurisdiction analysis (Texas CUBI, Washington, GDPR biometric).",
          href: "/biometric-checker",
          context: "Put this into practice:",
        }}
        introBlock={<BiometricDecisionChecklist />}
        sections={linkGlossaryFirstMentions([
          {
            id: "state-laws",
            h2: "State biometric laws — ranked by obligation stringency",
            synthesisKey: "biometric__state_laws",
            content: TIERED_STATE_LAWS,
            toolCta: {
              toolName: getProduct("biometric-checker").name,
              toolDescription:
                "Covers BIPA, Texas CUBI, Washington and GDPR biometric requirements in a single structured assessment.",
              href: getProduct("biometric-checker").route,
            },
            toolCtaPlacement: "top",
          },
          {
            id: "enforcement-history",
            h2: "Enforcement history — notable settlements and verdicts",
            synthesisKey: "biometric__enforcement_history",
            content: ENFORCEMENT_HISTORY,
            complianceTrigger:
              "BIPA's per-scan damages model has produced more nine- and ten-figure privacy recoveries than any other statute in the U.S.",
          },
          {
            id: "gdpr-eu",
            h2: "GDPR Article 9 and EU AI Act — Biometric data in Europe",
            synthesisKey: "biometric__gdpr_eu",
            content: `<p>Under <a href="https://gdpr-info.eu/art-9-gdpr/" target="_blank" rel="noopener noreferrer">GDPR Article 9</a>, biometric data processed for the purpose of uniquely identifying an individual is a special category requiring explicit consent or another Article 9 lawful basis. The <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689" target="_blank" rel="noopener noreferrer">EU AI Act</a> further restricts biometric identification systems in public spaces, with narrow law-enforcement exceptions. Clearview AI has been fined €20M each by the DPAs of France, Italy, and Greece for scraping facial images; the UK ICO's £7.5M fine was overturned on jurisdictional grounds by the First-tier Tribunal in 2023.</p>`,
          },
          {
            id: "workplace",
            h2: "Workplace biometric use",
            synthesisKey: "biometric__workplace",
            content: `<p>Biometric timekeeping, access control, and identity verification in the workplace are among the highest-risk use cases. BIPA litigation is dominated by workplace claims — fingerprint time clocks, facial recognition entry systems, and palm scanners. <a href="https://www.eeoc.gov/artificial-intelligence-and-algorithmic-fairness" target="_blank" rel="noopener noreferrer">EEOC guidance</a> warns that biometric screening tools may create disparate impact liability. The <a href="https://www.nlrb.gov/" target="_blank" rel="noopener noreferrer">NLRB</a> has indicated that implementation of biometric monitoring may be a mandatory subject of bargaining.</p>`,
          },
        ])}
        relatedLinks={[
          { label: "Enforcement Tracker", href: "/enforcement-tracker" },
          { label: "U.S. State Privacy Laws", href: "/us-state-privacy-laws" },
          { label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
          { label: "Subscribe to Intelligence", href: "/subscribe" },
        ]}
        intelligenceUpsellTopic="biometric privacy"
      />
    </>
  );
}
