import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SourceMethodology from "@/components/research/SourceMethodology";

import { REGULATORS as allRegulators } from "@/lib/regulators";

const RegulatorPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const regulator = slug ? allRegulators[slug] : null;
  const [recentArticles, setRecentArticles] = useState<any[]>([]);

  useEffect(() => {
    if (!regulator) return;
    const terms = [regulator.name, regulator.abbreviation].filter(Boolean);
    const orQuery = terms.map(t => `title.ilike.%${t}%`).join(",");
    supabase
      .from("updates")
      .select("id, title, summary, url, source_name, published_at, category, ai_summary")
      .eq("is_hidden", false)
      .or(orQuery)
      .order("published_at", { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setRecentArticles(data); });
  }, [regulator]);

  if (!regulator) {
    return (
      <div className="min-h-screen bg-brand-cloud">
        <Navbar />
        <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="font-display text-brand-navy mb-4">Regulator Not Found</h1>
          <p className="text-slate mb-6">The regulator you're looking for is not yet in our database.</p>
          <Link to="/global-privacy-authorities" className="text-brand-teal-text hover:underline">Browse all regulators →</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const tierLabel = regulator.monitoring_tier === 1 ? "Tier 1 — Major" : regulator.monitoring_tier === 2 ? "Tier 2 — Secondary" : "Tier 3 — Global";
  const tierClass = regulator.monitoring_tier === 1 ? "bg-[#EBF3FB] text-[#1A5F9E]" : regulator.monitoring_tier === 2 ? "status-pending" : "status-none";

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>{regulator.name}{regulator.abbreviation && !regulator.name.includes(`(${regulator.abbreviation})`) ? ` (${regulator.abbreviation})` : ''} — Regulator Profile | End User Privacy</title>
        <meta name="description" content={`${regulator.name} (${regulator.abbreviation}) profile: ${regulator.country} data protection authority. Legislation, enforcement updates, complaint portal, and monitoring tier.`} />
        <link rel="canonical" href={`https://enduserprivacy.com/regulator/${slug}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "GovernmentOrganization",
          name: regulator.name,
          alternateName: regulator.abbreviation || undefined,
          url: regulator.website || undefined,
          areaServed: regulator.country,
        })}</script>
      </Helmet>
      <Navbar />
      <div className="bg-gradient-to-br from-brand-ocean to-brand-slate-teal py-10 md:py-14 px-4 md:px-8">
        <div className="max-w-[860px] mx-auto">
          <div className="inline-flex items-center gap-2 text-meta font-semibold tracking-widest uppercase text-brand-mist mb-4 bg-brand-mist/10 px-3 py-1.5 rounded-full border border-brand-mist/20">
            ⚖️ Regulator Profile
          </div>
          <h1 className="font-display text-white mb-2">{regulator.name}</h1>
          {regulator.abbreviation && <p className="text-lg text-brand-mist font-display">{regulator.abbreviation}</p>}
          {regulator.legislation && (
            <p className="text-blue-200 text-sm mt-1">
              Primary legislation: {regulator.legislation}
              {regulator.legislation_abbreviation ? ` (${regulator.legislation_abbreviation})` : ''}
            </p>
          )}
          <p className="text-sm text-brand-mist mt-2">{regulator.country}{regulator.region && regulator.region !== regulator.country ? ` · ${regulator.region}` : ''}</p>
          {regulator.website && (
            <a href={regulator.website} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-brand-mist text-sm no-underline hover:text-white transition-colors mt-2">
              Official website →
            </a>
          )}
        </div>
      </div>


      <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Key info card */}
        <div className="bg-card border border-brand-cloud rounded-2xl overflow-hidden shadow-eup-sm mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-brand-cloud">
            <div className="p-5">
              <div className="text-meta font-semibold tracking-wider uppercase text-slate mb-2">Jurisdiction</div>
              <div className="text-[15px] text-brand-navy font-medium">{regulator.country}</div>
              <div className="text-meta text-slate mt-0.5">{regulator.region}</div>
            </div>
            <div className="p-5">
              <div className="text-meta font-semibold tracking-wider uppercase text-slate mb-2">Monitoring</div>
              <span className={`text-meta font-semibold tracking-wide px-2.5 py-1 rounded-full ${tierClass}`}>
                {tierLabel}
              </span>
            </div>
          </div>
          {regulator.legislation && (
            <div className="border-t border-brand-cloud p-5">
              <div className="text-meta font-semibold tracking-wider uppercase text-slate mb-2">Primary Legislation</div>
              <div className="text-[15px] text-brand-navy font-medium">
                {regulator.legislation}
                {regulator.legislation_abbreviation && (
                  <span className="text-slate ml-1 font-normal">({regulator.legislation_abbreviation})</span>
                )}
              </div>
            </div>
          )}
          <div className="border-t border-brand-cloud p-5">
            <div className="text-meta font-semibold tracking-wider uppercase text-slate mb-3">Links</div>
            <div className="flex gap-4 flex-wrap">
              <a href={regulator.website} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-teal-text hover:underline no-underline font-medium">Official Website ↗</a>
              {regulator.complaint_portal && (
                <a href={regulator.complaint_portal} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-teal-text hover:underline no-underline font-medium">Complaint / Enforcement Portal ↗</a>
              )}
            </div>
          </div>
        </div>

        {/* Recent Intelligence */}
        <div className="mb-8">
          <h2 className="font-display text-brand-navy mb-4">
            Recent Intelligence
          </h2>
          <div className="rounded-2xl border border-brand-mist/25 overflow-hidden shadow-eup-sm">
            {/* Header */}
            <div className="bg-gradient-to-br from-brand-navy to-brand-ocean px-5 py-4 flex items-center justify-between">
              <div>
                <div className="text-eyebrow text-brand-mist mb-1">
                  ⭐ Weekly Intelligence
                </div>
                <h3 className="text-[15px] text-white">
                  What moved at {regulator.abbreviation || regulator.name} this week
                </h3>
              </div>
              <Lock className="w-5 h-5 text-brand-mist/50 shrink-0" />
            </div>

            {/* Blurred content + overlay */}
            <div className="relative bg-card px-5 py-5">
              <div className="space-y-3 blur-[3px] select-none pointer-events-none">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-navy/20 mt-1.5 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-brand-navy/10 rounded w-3/4" />
                    <div className="h-3 bg-brand-navy/10 rounded w-full" />
                    <div className="h-3 bg-brand-navy/10 rounded w-1/2" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-navy/20 mt-1.5 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-brand-navy/10 rounded w-5/6" />
                    <div className="h-3 bg-brand-navy/10 rounded w-full" />
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-navy/20 mt-1.5 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 bg-brand-navy/10 rounded w-2/3" />
                    <div className="h-3 bg-brand-navy/10 rounded w-4/5" />
                    <div className="h-3 bg-brand-navy/10 rounded w-1/2" />
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[1px]">
                <Lock className="w-5 h-5 text-brand-navy/40 mb-2" />
                <p className="text-sm font-semibold text-brand-navy mb-1 text-center px-4">
                  Intelligence subscribers get weekly intelligence for every regulator they follow.
                </p>
                <p className="text-xs text-slate text-center px-6 mb-4">
                  Enforcement actions, guidance updates, and what each development means — every Monday.
                </p>
                <Link to="/subscribe" className="px-5 py-2 text-meta font-semibold text-white bg-gradient-to-br from-brand-steel to-brand-teal rounded-lg no-underline hover:opacity-90 transition-all shadow-eup-sm">
                  Unlock Regulator Intelligence →
                </Link>
              </div>
            </div>
          </div>
        </div>


        {/* Recent Developments */}
        {recentArticles.length > 0 && (
          <div className="mt-10 pt-8 border-t border-brand-cloud">
            <h2 className="font-display text-brand-navy mb-4">
              Recent Developments
            </h2>
            <div className="space-y-4">
              {recentArticles.map(article => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-card border border-brand-cloud rounded-xl p-4 no-underline hover:shadow-eup-sm transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-meta font-medium text-slate">
                      {article.source_name}
                    </span>
                    <span className="text-meta text-brand-mist">·</span>
                    <span className="text-meta text-brand-mist">
                      {new Date(article.published_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                    </span>
                  </div>
                  <p className="text-[9px] font-semibold text-brand-navy leading-snug group-hover:text-brand-teal-text transition-colors">
                    {article.title}
                  </p>
                  {article.ai_summary?.why_it_matters && (
                    <p className="text-meta text-slate mt-1.5 leading-relaxed line-clamp-2">
                      {article.ai_summary.why_it_matters}
                    </p>
                  )}
                </a>
              ))}
            </div>
            <a
              href={'/updates?q=' + encodeURIComponent(regulator?.abbreviation || regulator?.name || '')}
              className="block mt-4 text-sm font-semibold text-brand-teal-text no-underline hover:text-brand-navy transition-colors"
            >
              See all developments →
            </a>
          </div>
        )}

        {/* Related */}
        <div className="border-t border-brand-cloud pt-8 mt-8">
          <h3 className="text-brand-navy mb-4">Related Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to={`/jurisdiction/${regulator.country.toLowerCase().replace(/\s+/g, "-")}`} className="flex items-center gap-2 p-3 bg-card border border-brand-cloud rounded-lg hover:bg-brand-cloud transition-colors no-underline text-sm text-brand-navy font-medium">
              <span className="text-brand-teal-text">→</span> {regulator.country} Jurisdiction Page
            </Link>
            <Link to="/global-privacy-authorities" className="flex items-center gap-2 p-3 bg-card border border-brand-cloud rounded-lg hover:bg-brand-cloud transition-colors no-underline text-sm text-brand-navy font-medium">
              <span className="text-brand-teal-text">→</span> Global Authority Directory
            </Link>
            <Link to="/enforcement-tracker" className="flex items-center gap-2 p-3 bg-card border border-brand-cloud rounded-lg hover:bg-brand-cloud transition-colors no-underline text-sm text-brand-navy font-medium">
              <span className="text-brand-teal-text">→</span> Enforcement Tracker
            </Link>
            <Link to="/gdpr-enforcement" className="flex items-center gap-2 p-3 bg-card border border-brand-cloud rounded-lg hover:bg-brand-cloud transition-colors no-underline text-sm text-brand-navy font-medium">
              <span className="text-brand-teal-text">→</span> GDPR Enforcement
            </Link>
          </div>
        </div>
        <div className="mt-10">
          <SourceMethodology />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default RegulatorPage;
