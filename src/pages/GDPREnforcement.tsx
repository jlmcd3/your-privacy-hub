import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ResearchPageLayout } from "@/components/research/ResearchPageLayout";

const COMPARISON_ROWS: {
  dimension: string;
  eu: string;
  uk: string;
}[] = [
  {
    dimension: "Territorial scope",
    eu: "Applies to controllers/processors established in the EU, plus non-EU entities offering goods/services to or monitoring EU data subjects (Art. 3).",
    uk: "Mirrors GDPR Art. 3 but anchored to the UK — covers UK-established entities and non-UK controllers targeting or monitoring individuals in the UK.",
  },
  {
    dimension: "Lawful bases",
    eu: "Six bases under Art. 6. EDPB 2024 Art. 6(1)(f) guidelines tightened legitimate interest for behavioural advertising and large-scale profiling.",
    uk: "Same six bases retained. ICO has issued its own legitimate-interest guidance; broader research and statistical-purposes exemptions under DPA 2018 Sch. 2.",
  },
  {
    dimension: "Data subject rights",
    eu: "Access, rectification, erasure, restriction, portability, objection, and rights against solely automated decisions (Arts. 15–22).",
    uk: "Same rights retained. Data (Use and Access) Act 2025 clarifies subject-access search-effort limits and codifies the 'reasonable and proportionate' standard.",
  },
  {
    dimension: "International transfers",
    eu: "Adequacy decisions, SCCs (2021), BCRs, and EU-US Data Privacy Framework. Post-Schrems II transfer impact assessments are required.",
    uk: "UK adequacy regulations, International Data Transfer Agreement (IDTA) or UK Addendum to EU SCCs, UK BCRs, and UK Extension to the EU-US DPF.",
  },
  {
    dimension: "Supervisory authority",
    eu: "27 independent DPAs coordinated by the EDPB. One-stop-shop lead authority based on main establishment.",
    uk: "Single regulator — Information Commissioner's Office (ICO). No one-stop-shop; cross-border cases handled bilaterally.",
  },
  {
    dimension: "Penalties",
    eu: "Up to €20M or 4% of global annual turnover (Art. 83). DPAs may also order processing bans, breach notifications, and corrective measures.",
    uk: "Up to £17.5M or 4% of global annual turnover. ICO leans toward proportionate, guidance-led enforcement over headline fines.",
  },
];

const DIVERGENCE_ITEMS: {
  area: string;
  effective: string;
  detail: string;
}[] = [
  {
    area: "Data Protection and Digital Information — withdrawn, replaced by DUA Act 2025",
    effective: "Royal Assent June 2025",
    detail:
      "The Data (Use and Access) Act 2025 replaced the abandoned DPDI Bill, codifying narrower DSAR search obligations, expanded research exemptions, and a 'recognised legitimate interests' list that removes the balancing test for specified processing.",
  },
  {
    area: "International transfer mechanism",
    effective: "March 2022",
    detail:
      "UK introduced its own International Data Transfer Agreement (IDTA) and an Addendum to the EU SCCs, diverging from EU SCC templates.",
  },
  {
    area: "US adequacy / DPF extension",
    effective: "October 2023",
    detail:
      "UK Extension to the EU-US Data Privacy Framework operates independently of the EU adequacy decision and can be revoked separately.",
  },
  {
    area: "ICO enforcement posture",
    effective: "ICO25 strategy (2022 onward)",
    detail:
      "ICO publicly prioritises guidance, reprimands, and public-sector accountability over high-value private-sector fines — a measurable divergence from CNIL/DPC enforcement patterns.",
  },
  {
    area: "AI and automated decision-making",
    effective: "2025",
    detail:
      "DUA Act 2025 narrows Art. 22-equivalent protections, permitting solely automated decisions for non-special-category data with safeguards. EU AI Act adds parallel obligations in the EU with no UK counterpart.",
  },
  {
    area: "Cookies and PECR",
    effective: "DUA Act 2025",
    detail:
      "UK relaxed consent for low-risk analytics cookies and signalled a future opt-out-by-default model — divergent from the EU ePrivacy/consent regime enforced by CNIL and Garante.",
  },
];

function ComparisonTable() {
  return (
    <div className="rounded-xl border border-brand-cloud bg-card overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr] bg-brand-navy text-white text-meta uppercase tracking-wider font-semibold">
        <div className="px-4 py-3 border-r border-white/15 flex items-center gap-2">
          <span aria-hidden>🇪🇺</span> EU GDPR
        </div>
        <div className="px-4 py-3 flex items-center gap-2">
          <span aria-hidden>🇬🇧</span> UK GDPR
        </div>
      </div>
      {COMPARISON_ROWS.map((row, idx) => (
        <div
          key={row.dimension}
          className={`border-t border-brand-cloud ${idx % 2 === 1 ? "bg-brand-cloud/40" : ""}`}
        >
          <div className="px-4 pt-3 pb-1 text-eyebrow text-slate uppercase tracking-wider font-semibold">
            {row.dimension}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2">
            <div className="px-4 py-3 text-sm text-brand-navy leading-relaxed md:border-r border-brand-cloud">
              {row.eu}
            </div>
            <div className="px-4 py-3 text-sm text-brand-navy leading-relaxed border-t md:border-t-0 border-brand-cloud">
              {row.uk}
            </div>
          </div>
          {row.dimension === "Lawful bases" && (
            <div className="px-4 pb-4">
              <Link
                to="/li-assessment"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent no-underline hover:underline"
              >
                Run a Legitimate Interest Assessment →
              </Link>
            </div>
          )}
          {row.dimension === "International transfers" && (
            <div className="px-4 pb-4">
              <Link
                to="/dpa-generator"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent no-underline hover:underline"
              >
                Generate a GDPR/UK GDPR DPA →
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function DivergenceTracker() {
  return (
    <div className="rounded-xl border border-brand-teal/30 bg-brand-teal/5 p-4 md:p-5">
      <div className="text-eyebrow uppercase tracking-wider text-brand-teal font-semibold mb-3">
        Divergence Tracker · UK ⇢ EU
      </div>
      <ul className="space-y-4">
        {DIVERGENCE_ITEMS.map((item) => (
          <li key={item.area} className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-2 md:gap-4 pb-4 border-b border-brand-teal/15 last:border-0 last:pb-0">
            <div>
              <div className="font-display text-brand-navy text-base leading-snug mb-1">{item.area}</div>
              <div className="text-sm text-slate leading-relaxed">{item.detail}</div>
            </div>
            <div className="text-meta uppercase tracking-wider text-brand-mist font-semibold md:text-right">
              {item.effective}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecentEnforcement() {
  return (
    <details className="rounded-xl border border-brand-cloud bg-card group">
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-sm font-semibold text-brand-navy">
        <span>Recent enforcement — landmark cases</span>
        <span className="text-slate text-[11px] group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="px-4 pb-4 pt-1 text-sm text-brand-navy leading-relaxed space-y-3">
        <p>
          The largest GDPR fines include <strong>Meta's €1.2 billion</strong> from the Irish{" "}
          <Link to="/regulator/dpc" className="text-brand-teal no-underline hover:underline">Data Protection Commission (DPC)</Link> for
          transfers to the U.S. without adequate safeguards (2023), <strong>Amazon's €746 million</strong> from
          Luxembourg's <Link to="/regulator/cnpd" className="text-brand-teal no-underline hover:underline">National Data Protection Commission (CNPD)</Link>{" "}
          for targeted advertising violations (2021), and multiple fines against{" "}
          <strong>Google, TikTok, and Clearview AI</strong> across various jurisdictions.
        </p>
        <p>
          Enforcement activity is concentrated in <strong>Ireland (
          <Link to="/regulator/dpc" className="text-brand-teal no-underline hover:underline">DPC</Link>), France (
          <Link to="/regulator/cnil" className="text-brand-teal no-underline hover:underline">National Commission on Informatics and Liberty (CNIL)</Link>), Luxembourg (
          <Link to="/regulator/cnpd" className="text-brand-teal no-underline hover:underline">CNPD</Link>), Italy (
          <Link to="/regulator/garante" className="text-brand-teal no-underline hover:underline">Italian Data Protection Authority (Garante)</Link>), and Spain (
          <Link to="/regulator/aepd" className="text-brand-teal no-underline hover:underline">Spanish Data Protection Agency (AEPD)</Link>)</strong>. The{" "}
          <Link to="/regulator/edpb" className="text-brand-teal no-underline hover:underline">European Data Protection Board (EDPB)</Link> has
          increasingly used dispute resolution to override lead-authority draft decisions, and its 2026 binding
          guidance on AI training data marks a significant expansion of enforcement scope.
        </p>
        <p>
          <Link to="/enforcement-tracker" className="text-brand-teal font-semibold no-underline hover:underline">
            See all GDPR &amp; UK GDPR enforcement actions in the Enforcement Tracker →
          </Link>
        </p>
      </div>
    </details>
  );
}

export default function GDPREnforcement() {
  return (
    <>
      <Helmet>
        <link rel="canonical" href="/gdpr-enforcement" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "GDPR vs UK GDPR — Framework, Divergence & Enforcement",
          "description": "Side-by-side comparison of EU GDPR and UK GDPR, divergence tracker since Brexit, and the legitimate-interest doctrine for privacy professionals.",
          "publisher": { "@type": "Organization", "name": "End User Privacy" },
          "datePublished": "2026-03-24",
        })}</script>
      </Helmet>
      <ResearchPageLayout
        metaTitle="GDPR vs UK GDPR — Divergence Tracker | End User Privacy"
        metaDescription="Compare EU GDPR and UK GDPR across scope, lawful bases, rights, transfers, authorities, and penalties. Includes post-Brexit divergence tracker and enforcement summary."
        header={{
          eyebrow: "Research · GDPR & UK Privacy",
          title: "GDPR vs UK GDPR — Framework & Divergence",
          description:
            "EU GDPR and UK GDPR started identical and have steadily drifted apart since Brexit. This reference compares the two regimes side by side, tracks where they have materially diverged, and points to the tools that resolve the close cases.",
          lastUpdated: "June 10, 2026",
          feedCategory: "eu-uk",
          stats: [
            { value: "€7B+", label: "GDPR fines issued" },
            { value: "27+1", label: "EU DPAs + ICO" },
            { value: "DUA 2025", label: "latest UK divergence" },
            { value: "Art. 83", label: "penalty framework" },
          ],
        }}
        pageSynthesisKey="gdpr__page"
        topToolCta={{
          toolName: "Impact Assessment Builder (DPIA)",
          toolDescription:
            "Generate a GDPR-compliant DPIA structured to EDPB WP 248 requirements, calibrated to DPA enforcement patterns.",
          href: "/dpia-framework",
        }}
        sections={[
          {
            id: "comparison",
            h2: "EU GDPR vs UK GDPR — Side by Side",
            children: (
              <div className="space-y-4">
                <p className="text-sm text-slate leading-relaxed">
                  The two regimes share a common text but apply through different supervisors, transfer
                  mechanisms, and enforcement cultures. Compare the dimensions practitioners actually have
                  to operationalise.
                </p>
                <ComparisonTable />
              </div>
            ),
          },
          {
            id: "divergence",
            h2: "Divergence Tracker — Where UK GDPR Has Departed",
            synthesisKey: "gdpr__uk_privacy",
            children: <DivergenceTracker />,
          },
          {
            id: "legitimate-interest",
            h2: "Legitimate Interest Under GDPR & UK GDPR",
            synthesisKey: "gdpr__legitimate_interest",
            content: `<p>Legitimate interest under <a href="https://gdpr-info.eu/art-6-gdpr/" target="_blank" rel="noopener noreferrer">Article 6(1)(f)</a> is the most flexible — and most contested — lawful basis. Controllers must conduct and document a three-part Legitimate Interest Assessment (LIA): identify the legitimate interest, demonstrate necessity, and balance against data subjects' rights and reasonable expectations. The CJEU's <em>Meta v. Bundeskartellamt</em> ruling and the <a href="/regulator/edpb">EDPB</a>'s 2024 Article 6(1)(f) guidelines significantly tightened the analysis for behavioural advertising and large-scale profiling. The UK ICO's parallel guidance — and the DUA Act 2025's "recognised legitimate interests" list — produce materially different outcomes in close cases.</p>`,
            toolCta: {
              toolName: "Legitimate Interest Assessment",
              toolDescription:
                "Generate a documented three-part LIA aligned to EDPB guidance and ICO expectations.",
              href: "/li-assessment",
            },
          },
          {
            id: "framework",
            h2: "The GDPR Regulatory Framework",
            synthesisKey: "gdpr__framework",
            content: `<p>GDPR enforcement operates through a decentralized network of independent Data Protection Authorities in each EU member state, coordinated by the <a href="/regulator/edpb">European Data Protection Board (EDPB)</a>. The one-stop-shop mechanism designates a lead supervisory authority based on a company's main establishment, while the consistency mechanism ensures uniform application across member states.</p>
<p>DPAs can impose administrative fines up to <strong>€20 million or 4% of global annual turnover</strong>, whichever is higher. Beyond fines, DPAs can issue warnings, reprimands, orders to comply, temporary or definitive processing bans, and orders to communicate breaches to affected individuals.</p>
<p>Appellate review is now a major factor: a substantial share of headline fines is under challenge, and in March 2026 courts annulled both Amazon's €746M fine (Luxembourg) and OpenAI's €15M fine (Rome).</p>`,
          },
          {
            id: "enforcement-actions",
            h2: "Recent Enforcement",
            children: (
              <div className="space-y-3">
                <p className="text-sm text-slate leading-relaxed">
                  Case-level enforcement is tracked separately so it doesn't interrupt the legal framework
                  overview. Expand for a summary of landmark fines, or jump to the live tracker.
                </p>
                <RecentEnforcement />
              </div>
            ),
          },
        ]}
        relatedLinks={[
          { label: "Global Privacy Authority Directory", href: "/global-privacy-authorities" },
          { label: "Enforcement Tracker", href: "/enforcement-tracker" },
          { label: "AI Privacy Regulations", href: "/ai-privacy-regulations" },
          { label: "Global Privacy Laws", href: "/global-privacy-laws" },
          { label: "Legitimate Interest Tracker", href: "/legitimate-interest-tracker" },
        ]}
        intelligenceUpsellTopic="GDPR enforcement and UK privacy"
      />
    </>
  );
}
