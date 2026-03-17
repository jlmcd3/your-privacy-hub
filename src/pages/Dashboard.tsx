import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AskPrivacy from "@/components/ai/AskPrivacy";

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
}

const ACTION_COLOR: Record<string, string> = {
  Fine: "bg-red-50 text-red-700 border-red-200",
  Investigation: "bg-amber-50 text-amber-700 border-amber-200",
  Guidance: "bg-blue-50 text-blue-700 border-blue-200",
  Lawsuit: "bg-purple-50 text-purple-700 border-purple-200",
  Rulemaking: "bg-green-50 text-green-700 border-green-200",
};

function SectionBlock({ icon, title, content }: { icon: string; title: string; content: string | null }) {
  if (!content) return null;
  return (
    <section className="bg-card rounded-xl border border-border p-6">
      <h3 className="font-display text-[17px] text-foreground mb-3 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h3>
      <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
        {content.split("\n").filter(Boolean).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </section>
  );
}

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [brief, setBrief] = useState<WeeklyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

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
        if (!premium) navigate("/subscribe");
      });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !isPremium) return;
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
  }, [user, isPremium]);

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

  if (!user || !isPremium) return null;

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
                  {brief.executive_summary.split("\n").filter(Boolean).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>

            {/* Analysis sections */}
            <div className="grid gap-6">
              <SectionBlock icon="🇺🇸" title="U.S. Federal Analysis" content={brief.us_federal} />
              <SectionBlock icon="🏛️" title="U.S. State Analysis" content={brief.us_states} />
              <SectionBlock icon="🇪🇺" title="EU & UK Analysis" content={brief.eu_uk} />
              <SectionBlock icon="🌍" title="Global Developments" content={brief.global_developments} />
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

            {/* Trend signal */}
            {brief.trend_signal && (
              <section className="bg-amber-50/50 rounded-xl border border-amber-200/50 p-6">
                <h3 className="font-display text-[17px] text-foreground mb-3">
                  📡 Trend Signal
                </h3>
                <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                  {brief.trend_signal.split("\n").filter(Boolean).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            )}

            {/* Why this matters */}
            {brief.why_this_matters && (
              <section className="bg-primary/5 rounded-xl border border-primary/15 p-6">
                <h3 className="font-display text-[17px] text-foreground mb-3">
                  🎯 Why This Matters — Action Items for This Week
                </h3>
                <div className="text-[14px] text-muted-foreground leading-relaxed space-y-3">
                  {brief.why_this_matters.split("\n").filter(Boolean).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            )}
            </div>

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
