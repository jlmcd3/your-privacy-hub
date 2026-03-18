import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AskPrivacy from "@/components/ai/AskPrivacy";
import { CitedParagraphs } from "@/components/brief/CitedText";
import { SourcesList } from "@/components/brief/SourcesList";
import type { SourceMap } from "@/components/brief/CitedText";
import { ExternalLink } from "lucide-react";

interface EnforcementRow {
  regulator: string;
  jurisdiction: string;
  action_type: string;
  subject: string;
  amount: string;
  significance: string;
}

interface WeeklyBrief {
  id: string;
  week_label: string;
  headline: string;
  executive_summary: string;
  us_federal: string | null;
  us_states: string | null;
  eu_uk: string | null;
  global_developments: string | null;
  enforcement_table: EnforcementRow[] | null;
  trend_signal: string | null;
  why_this_matters: string | null;
  article_count: number;
  published_at: string;
  source_map: Record<string, { title: string; url: string; source: string }> | null;
}

const ACTION_COLOR: Record<string, string> = {
  Fine: "bg-red-50 text-red-700 border-red-200",
  Investigation: "bg-amber-50 text-amber-700 border-amber-200",
  Guidance: "bg-blue-50 text-blue-700 border-blue-200",
  Lawsuit: "bg-purple-50 text-purple-700 border-purple-200",
  Rulemaking: "bg-green-50 text-green-700 border-green-200",
};

function SectionBlock({ icon, title, content, sourceMap }: { icon: string; title: string; content: string | null; sourceMap: SourceMap }) {
  if (!content) return null;
  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <h3 className="font-display text-[17px] text-foreground mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
        <CitedParagraphs content={content} sourceMap={sourceMap} />
      </div>
      <SourcesList sourceMap={sourceMap} usedIn={content} />
    </section>
  );
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<WeeklyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [customBrief, setCustomBrief] = useState<any>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login?redirect=/dashboard"); return; }
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const premium = data?.is_premium ?? false;
        setIsPremium(premium);
        // Don't redirect — show a free-member view instead
      });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const { data } = await (supabase as any)
        .from("weekly_briefs")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setBrief(data as WeeklyBrief | null);
      setLoading(false);
    }
    load();
  }, [user]);

  // Fetch custom brief for Pro users
  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("custom_briefs")
      .select("*")
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }: any) => setCustomBrief(data));
  }, [user]);

  if (authLoading || isPremium === null) {
    return (
      <div className="min-h-screen bg-background">
        <Topbar />
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <span className="text-muted-foreground text-sm">Loading…</span>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) return null;

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-paper">
        <Topbar />
        <Navbar />
        <div className="max-w-[680px] mx-auto px-4 py-14">
          <div className="text-center mb-10">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate mb-2">
              My Account
            </div>
            <h1 className="font-display font-bold text-navy text-[26px] mb-3">
              Welcome back, {user.email?.split("@")[0]}.
            </h1>
            <p className="text-slate text-[14px]">
              You have a free EndUserPrivacy account. Upgrade to unlock the
              weekly Intelligence Brief and full enforcement database.
            </p>
          </div>

          {/* What they have access to */}
          <div className="bg-card border border-fog rounded-2xl p-6 mb-6">
            <h2 className="font-semibold text-navy text-[14px] uppercase tracking-wider mb-4">
              Your Free Access
            </h2>
            <div className="space-y-2.5">
              {[
                "Daily privacy news feed",
                "150+ jurisdiction profiles",
                "119 regulator directory",
                "Research guides (GDPR, AI, US laws)",
                "Glossary of privacy terms",
                "Enforcement tracker (top 12 recent actions)",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2.5 text-[13px] text-navy">
                  <div className="w-4 h-4 rounded-full bg-accent/15 border border-accent/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-accent text-[10px] font-bold">✓</span>
                  </div>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Upgrade CTA */}
          <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-7 mb-6 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-sky mb-2">
              ⭐ Go Premium
            </div>
            <h3 className="font-display font-bold text-white text-[20px] mb-2">
              Unlock the Intelligence Brief
            </h3>
            <p className="text-slate-light text-[13px] mb-5 max-w-md mx-auto">
              Every Monday: 8-section AI analyst synthesis, full enforcement table,
              trend signals, and GC/CPO action items. First 25 subscribers get the
              first year free.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/subscribe"
                className="bg-white text-navy font-bold text-[14px] py-2.5 px-8 rounded-xl no-underline hover:opacity-90 transition-all"
              >
                See Plans — from $15/month →
              </Link>
              <Link
                to="/sample-brief"
                className="bg-white/10 border border-white/20 text-white font-semibold text-[14px] py-2.5 px-6 rounded-xl no-underline hover:bg-white/20 transition-all"
              >
                See a sample brief
              </Link>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Browse Updates", href: "/updates" },
              { label: "Global Map", href: "/jurisdictions" },
              { label: "Enforcement Tracker", href: "/enforcement-tracker" },
              { label: "My Account Settings", href: "/account" },
            ].map((l) => (
              <Link
                key={l.label}
                to={l.href}
                className="bg-card border border-fog rounded-xl p-4 text-[13px] font-medium text-navy hover:bg-fog transition-colors no-underline text-center"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Topbar />
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-primary mb-2">
            📋 Weekly Intelligence Brief
          </p>
          <h1 className="font-display text-[28px] md:text-[34px] text-foreground leading-tight">
            {loading ? "Loading this week's brief..." : brief?.headline ?? "No brief available yet"}
          </h1>
          {brief && (
            <div className="flex flex-wrap items-center gap-2 mt-3 text-[13px] text-muted-foreground">
              <span>{brief.week_label}</span>
              <span>·</span>
              <span>{brief.article_count} regulatory updates synthesized</span>
              <span>·</span>
              <span>Published {new Date(brief.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })}</span>
            </div>
          )}
        </div>

        {/* Custom brief for Pro users */}
        {customBrief && (
          <div className="bg-blue/5 border border-blue/20 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue bg-blue/10 border border-blue/20 px-2.5 py-1 rounded-full">
                ⭐ Your Custom Focus — {customBrief.week_label}
              </span>
            </div>
            {customBrief.custom_sections?.industry_focus && (
              <div className="mb-4">
                <h3 className="font-bold text-navy text-[14px] mb-2">Industry Focus</h3>
                <p className="text-slate text-[13px] leading-relaxed">
                  {customBrief.custom_sections.industry_focus}
                </p>
              </div>
            )}
            {customBrief.custom_sections?.jurisdiction_focus && (
              <div className="mb-4">
                <h3 className="font-bold text-navy text-[14px] mb-2">Jurisdiction Highlights</h3>
                <p className="text-slate text-[13px] leading-relaxed">
                  {customBrief.custom_sections.jurisdiction_focus}
                </p>
              </div>
            )}
            {customBrief.custom_sections?.topic_focus && (
              <div>
                <h3 className="font-bold text-navy text-[14px] mb-2">Topic Focus</h3>
                <p className="text-slate text-[13px] leading-relaxed">
                  {customBrief.custom_sections.topic_focus}
                </p>
              </div>
            )}
            <Link to="/brief-preferences" className="text-[12px] text-blue font-medium no-underline hover:text-navy mt-3 inline-block">
              Edit your preferences →
            </Link>
          </div>
        )}

        {loading && (
          <div className="space-y-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {!loading && !brief && (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">📅</p>
            <p className="font-display text-[20px] text-foreground mb-2">First brief coming Monday</p>
            <p className="text-[14px] text-muted-foreground max-w-md mx-auto">
              Your weekly intelligence brief is generated every Monday at 7am UTC from the past week's regulatory activity. Check back then.
            </p>
          </div>
        )}

        {!loading && brief && (
          <>
            <div className="space-y-8">
              {/* Executive Summary */}
              <section className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20 p-6">
                <h2 className="font-display text-[20px] text-foreground mb-4">Executive Summary</h2>
                <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                  <CitedParagraphs content={brief.executive_summary} sourceMap={brief.source_map ?? {}} />
                </div>
                <SourcesList sourceMap={brief.source_map ?? {}} usedIn={brief.executive_summary} />
              </section>

            {/* Analysis sections */}
            <div className="grid gap-6">
              <SectionBlock icon="🇺🇸" title="U.S. Federal Analysis" content={brief.us_federal} sourceMap={brief.source_map ?? {}} />
              <SectionBlock icon="🏛️" title="U.S. State Analysis" content={brief.us_states} sourceMap={brief.source_map ?? {}} />
              <SectionBlock icon="🇪🇺" title="EU & UK Analysis" content={brief.eu_uk} sourceMap={brief.source_map ?? {}} />
              <SectionBlock icon="🌍" title="Global Developments" content={brief.global_developments} sourceMap={brief.source_map ?? {}} />
              <SectionBlock icon="🤖" title="AI Governance" content={(brief as any).ai_governance} sourceMap={brief.source_map ?? {}} />
              <SectionBlock icon="📡" title="AdTech & Advertising Privacy" content={(brief as any).adtech_advertising} sourceMap={brief.source_map ?? {}} />
              <SectionBlock icon="👁️" title="Biometric Data" content={(brief as any).biometric_data} sourceMap={brief.source_map ?? {}} />
              <SectionBlock icon="🏛️" title="Privacy Litigation" content={(brief as any).privacy_litigation} sourceMap={brief.source_map ?? {}} />
            </div>

            {/* Enforcement table */}
            {brief.enforcement_table && brief.enforcement_table.length > 0 && (
              <section className="bg-card rounded-xl border border-border p-6">
                <h3 className="font-display text-[17px] text-foreground mb-4">
                  ⚖️ Enforcement Actions This Week
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="py-2 pr-4 font-semibold text-muted-foreground">Regulator</th>
                        <th className="py-2 pr-4 font-semibold text-muted-foreground">Subject</th>
                        <th className="py-2 pr-4 font-semibold text-muted-foreground">Type</th>
                        <th className="py-2 pr-4 font-semibold text-muted-foreground">Amount</th>
                        <th className="py-2 font-semibold text-muted-foreground">Significance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {brief.enforcement_table.map((row, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-3 pr-4 text-foreground font-medium">
                            {row.regulator}
                            <div className="text-[11px] text-muted-foreground">{row.jurisdiction}</div>
                          </td>
                          <td className="py-3 pr-4 text-foreground">{row.subject}</td>
                          <td className="py-3 pr-4">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full border ${ACTION_COLOR[row.action_type] || "bg-muted text-muted-foreground border-border"}`}>
                              {row.action_type}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-foreground font-semibold">{row.amount}</td>
                          <td className="py-3 text-muted-foreground text-[12px]">{row.significance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Enforcement trends */}
            <SectionBlock icon="📊" title="Enforcement Trends" content={(brief as any).enforcement_trends} sourceMap={brief.source_map ?? {}} />

            {/* Trend signal */}
            {brief.trend_signal && (
              <section className="bg-amber-50/50 rounded-xl border border-amber-200/50 p-6">
                <h3 className="font-display text-[17px] text-foreground mb-3">
                  📡 Trend Signal
                </h3>
                <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                  <CitedParagraphs content={brief.trend_signal} sourceMap={brief.source_map ?? {}} />
                </div>
                <SourcesList sourceMap={brief.source_map ?? {}} usedIn={brief.trend_signal ?? ""} />
              </section>
            )}

            {/* Why this matters */}
            {brief.why_this_matters && (
              <section className="bg-primary/5 rounded-xl border border-primary/15 p-6">
                <h3 className="font-display text-[17px] text-foreground mb-3">
                  🎯 Why This Matters — Action Items for This Week
                </h3>
                <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                  <CitedParagraphs content={brief.why_this_matters} sourceMap={brief.source_map ?? {}} />
                </div>
                <SourcesList sourceMap={brief.source_map ?? {}} usedIn={brief.why_this_matters ?? ""} />
              </section>
            )}
            </div>

            {/* Full sources reference */}
            {brief.source_map && Object.keys(brief.source_map).length > 0 && (
              <section className="bg-card rounded-xl border border-border p-6 mt-2">
                <h3 className="font-display text-[17px] text-foreground mb-3 flex items-center gap-2">
                  <span>📚</span> All Source Articles This Week
                </h3>
                <p className="text-[12px] text-muted-foreground mb-4">
                  {Object.keys(brief.source_map).length} articles monitored and synthesized to produce this brief. Click any title to read the original.
                </p>
                <div className="grid gap-2">
                  {Object.entries(brief.source_map)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([num, src]) => (
                      <a
                        key={num}
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-muted-foreground hover:bg-muted/40 transition-all no-underline group"
                      >
                        <span className="text-[11px] font-bold text-muted-foreground flex-shrink-0 w-6 text-right mt-0.5">
                          [{num}]
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                            {src.title}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{src.source}</p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-0.5" />
                      </a>
                    ))}
                </div>
              </section>
            )}

            <div className="mt-8">
              <AskPrivacy isPremium={isPremium === true} />
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Dashboard;
