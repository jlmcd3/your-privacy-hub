import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";

interface PillarPageProps {
  title: string;
  subtitle: string;
  icon: string;
  lastUpdated: string;
  intro: string;
  sections: { heading: string; content: string }[];
  relatedLinks: { label: string; href: string }[];
  directoryLink?: { label: string; href: string };
  intelligenceLabel?: string;
  updateCategory?: string;
}

const PillarPage = ({ title, subtitle, icon, lastUpdated, intro, sections, relatedLinks, directoryLink, intelligenceLabel, updateCategory }: PillarPageProps) => {
  const [recentArticles, setRecentArticles] = useState<any[]>([]);

  useEffect(() => {
    if (!updateCategory) return;

    async function load() {
      const { data } = await (supabase as any)
        .from("updates")
        .select("id,title,summary,url,source_name,image_url,published_at")
        .eq("category", updateCategory)
        .order("published_at", { ascending: false })
        .limit(6);

      if (data) setRecentArticles(data);
    }

    load();
  }, [updateCategory]);

  return (
    <div className="min-h-screen bg-paper">
      <Topbar />
      <Navbar />
      <div className="bg-gradient-to-br from-navy-mid to-navy-light py-10 md:py-14 px-4 md:px-8">
        <div className="max-w-[860px] mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-sky mb-4 bg-sky/10 px-3 py-1.5 rounded-full border border-sky/20">
            {icon} Intelligence Guide
          </div>
          <h1 className="font-display text-[28px] md:text-[40px] text-white mb-3 leading-tight">{title}</h1>
          <p className="text-sm md:text-base text-slate-light max-w-[700px]">{subtitle}</p>
          <div className="text-[11px] text-slate-light mt-4">Last updated: {lastUpdated}</div>
        </div>
      </div>

      <AdBanner variant="leaderboard" adSlot={`eup-pillar-top`} className="py-3" />

      <div className="max-w-[860px] mx-auto px-4 md:px-8 py-10 md:py-14">
        <div className="bg-card border border-fog rounded-2xl p-5 md:p-8 shadow-eup-sm mb-8">
          <p className="text-[15px] text-navy leading-relaxed">{intro}</p>
        </div>

        <div className="space-y-8">
          {sections.map((sec, i) => (
            <React.Fragment key={i}>
              <div>
                <h2 className="font-display text-[20px] md:text-[24px] text-navy mb-3">{sec.heading}</h2>
                <p className="text-[14px] text-slate leading-relaxed">{sec.content}</p>
              </div>
              {i === Math.floor(sections.length / 2) - 1 && (
                <>
                  <AdBanner variant="inline" adSlot={`eup-pillar-mid`} className="py-4" />
                  {/* Mid-content premium teaser */}
                  <div className="rounded-2xl border border-sky/20 overflow-hidden shadow-eup-sm my-2">
                    <div className="bg-gradient-to-br from-navy to-navy-mid px-5 py-4 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-1">
                          ⭐ Weekly Intelligence
                        </div>
                        <h3 className="font-display text-[14px] text-white">
                          {intelligenceLabel || "What changed in this area this week"}
                        </h3>
                      </div>
                      <Lock className="w-4 h-4 text-sky/50 shrink-0" />
                    </div>
                    <div className="relative bg-card px-5 py-4">
                      <div className="space-y-2 blur-[3px] select-none pointer-events-none">
                        <div className="h-2.5 bg-navy/10 rounded w-full" />
                        <div className="h-2.5 bg-navy/10 rounded w-4/5" />
                        <div className="h-2.5 bg-navy/10 rounded w-3/4" />
                        <div className="h-2.5 bg-navy/10 rounded w-full mt-2" />
                        <div className="h-2.5 bg-navy/10 rounded w-2/3" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[1px]">
                        <div className="flex items-center gap-3">
                          <Lock className="w-4 h-4 text-navy/40 shrink-0" />
                          <span className="text-[12px] text-navy font-medium">
                            Premium subscribers get weekly updates on every development in this area.
                          </span>
                          <Link to="/subscribe" className="text-[11px] font-semibold text-white bg-gradient-to-br from-steel to-blue px-3 py-1.5 rounded-lg no-underline hover:opacity-90 transition-all whitespace-nowrap">
                            Unlock →
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Recent Developments from live data */}
        {recentArticles.length > 0 && (
          <div className="mt-12 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="font-display text-xl text-navy">Recent Developments</h2>
              <span className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                Live
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentArticles.map((a) => (
                <a
                  key={a.id}
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-4 p-4 bg-card border border-fog rounded-xl hover:border-silver hover:shadow-eup-sm transition-all no-underline"
                >
                  {a.image_url && (
                    <img
                      src={a.image_url}
                      alt=""
                      className="w-20 h-14 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = "https://picsum.photos/seed/privacy/400/200"; }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate mb-1">
                      {a.source_name} · {new Date(a.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <p className="text-[13px] font-medium text-navy group-hover:text-blue transition-colors line-clamp-2">
                      {a.title}
                    </p>
                  </div>
                  <ExternalLink size={12} className="text-slate-light group-hover:text-blue transition-colors flex-shrink-0 mt-1" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Related links */}
        <div className="mt-12 pt-8 border-t border-fog">
          <h3 className="font-display text-lg text-navy mb-4">Related Resources</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {relatedLinks.map((link, i) => (
              <Link key={i} to={link.href} className="flex items-center gap-2 p-3 bg-card border border-fog rounded-lg hover:bg-fog transition-colors no-underline text-[13px] text-navy font-medium">
                <span className="text-blue">→</span> {link.label}
              </Link>
            ))}
          </div>
          {directoryLink && (
            <div className="mt-6">
              <Link to={directoryLink.href} className="inline-flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-gradient-to-br from-steel to-blue rounded-lg shadow-eup-sm hover:opacity-90 transition-all no-underline">
                {directoryLink.label} →
              </Link>
            </div>
          )}
        </div>

        <AdBanner variant="leaderboard" adSlot={`eup-pillar-bottom`} className="py-6" />

        {/* Premium CTA */}
        <div className="mt-12 bg-gradient-to-br from-navy to-navy-mid rounded-2xl p-6 md:p-8 text-center">
          <div className="text-[10px] font-bold tracking-widest uppercase text-sky mb-2">⭐ Premium Intelligence</div>
          <h3 className="font-display text-xl text-white mb-3">Get weekly intelligence on {title}</h3>
          <p className="text-[13px] text-slate-light mb-5 max-w-[500px] mx-auto">Premium subscribers receive a structured weekly brief covering every material development in this area — enforcement actions, regulatory guidance, and what it means for your compliance posture.</p>
          <Link to="/subscribe" className="inline-block px-6 py-3 text-sm font-semibold text-navy bg-white rounded-lg shadow-eup-md hover:-translate-y-0.5 transition-all no-underline">
            Unlock Weekly Intelligence →
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PillarPage;
