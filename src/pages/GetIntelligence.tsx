import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

type Step = 1 | 2 | 3 | "preview";

const JURISDICTIONS = [
  "EU & UK", "United States Federal", "US States", "APAC",
  "Latin America", "Canada", "Middle East & Africa", "Global",
];

const TOPICS = [
  { id: "gdpr", label: "GDPR Enforcement", desc: "DPA fines, EDPB decisions, cross-border enforcement" },
  { id: "ai-act", label: "EU AI Act", desc: "Implementation phases, GPAI, prohibited AI" },
  { id: "us-state", label: "US State Laws", desc: "New state laws, AG enforcement, CPPA actions" },
  { id: "children", label: "Children's Privacy", desc: "COPPA, KOSA, UK AADC, age verification" },
  { id: "health", label: "Health & Medical Data", desc: "HIPAA enforcement, FTC health actions" },
  { id: "adtech", label: "AdTech & Consent", desc: "TCF updates, cookie enforcement, Privacy Sandbox" },
  { id: "transfers", label: "Cross-Border Transfers", desc: "DPF status, SCC updates, APAC mechanisms" },
  { id: "litigation", label: "Privacy Litigation", desc: "BIPA filings, VPPA cases, class actions" },
  { id: "biometric", label: "Biometric Data", desc: "BIPA tracker, state biometric laws" },
  { id: "breach", label: "Data Breach & Incident Response", desc: "Notification law changes, SEC disclosure" },
];

const INDUSTRIES = [
  "Healthcare", "Financial Services", "AdTech & Marketing",
  "Legal", "Technology", "Retail & Consumer", "Other",
];

const BLURRED = [
  { title: "What These Developments Mean for Your Practice",
    text: "The coordinated enforcement signals across multiple jurisdictions indicate a tightening of regulatory expectations around consent mechanisms and data processing obligations. Organizations operating across the selected jurisdictions should review existing compliance frameworks against the emerging standards." },
  { title: "Enforcement Patterns — 30-Day Trend",
    text: "Cross-jurisdictional enforcement activity has increased substantially over the past 30 days. The pattern suggests regulators are coordinating on common enforcement themes, particularly around automated decision-making and cross-border data flows." },
  { title: "Compliance Action Items for Your Practice",
    text: "Based on this week's developments, immediate actions include reviewing consent mechanisms against the updated guidance, assessing data processing agreements for alignment with new enforcement interpretations, and scheduling a DPO review before the next regulatory deadline." },
];

const SampleInsight = () => (
  <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-2">Sample Insight · EU & UK</p>
    <p className="text-[13px] text-navy leading-relaxed">
      The CNIL's latest guidance on legitimate interest for behavioral advertising may require
      immediate review of consent mechanisms for any EU-facing product using retargeting.
      Three DPAs have issued coordinated enforcement signals in the past 14 days.
    </p>
    <p className="text-[11px] text-slate-light mt-2 italic">
      This is the kind of insight in your report — written for your jurisdiction and topics, every week.
    </p>
  </div>
);

const Progress = ({ n }: { n: number }) => (
  <div className="flex items-center gap-2 mb-8">
    {[1, 2, 3].map(i => (
      <div key={i} className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold
          ${i === n ? "bg-navy text-white" : i < n ? "bg-green-500 text-white" : "bg-fog text-slate"}`}>
          {i < n ? "✓" : i}
        </div>
        {i < 3 && <div className={`w-10 h-0.5 ${i < n ? "bg-green-400" : "bg-fog"}`} />}
      </div>
    ))}
    <span className="text-[12px] text-slate ml-2">Step {n} of 3</span>
  </div>
);

const GetIntelligence = () => {
  const { isPremium, isLoading: premiumLoading } = usePremiumStatus();
  const [step, setStep] = useState<Step>(1);
  const [jurisdiction, setJurisdiction] = useState<string | null>(null);
  const [topics, setTopics] = useState<string[]>([]);
  const [industry, setIndustry] = useState<string | null>(null);
  const [enforcement, setEnforcement] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);

  const toggleTopic = (id: string) => setTopics(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);

  const handleGenerate = async (skipIndustry = false) => {
    if (skipIndustry) setIndustry(null);
    setLoading(true);
    setStep("preview");
    const topicLabels = topics.map(id => TOPICS.find(t => t.id === id)?.label).filter(Boolean) as string[];

    let enQ = supabase.from("updates")
      .select("id,title,source_name,published_at,attention_level,affected_sectors,regulatory_theory")
      .eq("category", "Enforcement")
      .order("published_at", { ascending: false }).limit(3);
    let upQ = supabase.from("updates")
      .select("id,title,source_name,published_at,attention_level,affected_sectors,regulatory_theory")
      .neq("category", "Enforcement")
      .order("published_at", { ascending: false }).limit(2);
    if (topicLabels.length > 0) {
      enQ = (enQ as any).overlaps("topic_tags", topicLabels);
      upQ = (upQ as any).overlaps("topic_tags", topicLabels);
    }
    const [enRes, upRes] = await Promise.all([enQ, upQ]);
    setEnforcement(enRes.data || []);
    setUpdates(upRes.data || []);
    setLoading(false);
  };

  const handleEmailCapture = async () => {
    if (!email) return;
    await supabase.functions.invoke("save-report-config", {
      body: { email, jurisdiction, topics, industry },
    });
    setEmailSent(true);
  };

  const fmtDate = (d: string | null) => d
    ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";

  const reportSubtitle = [jurisdiction, industry,
    ...topics.slice(0, 2).map(id => TOPICS.find(t => t.id === id)?.label),
  ].filter(Boolean).join(" · ");

  const subscribeUrl = `/subscribe?j=${encodeURIComponent(jurisdiction || "")}` +
    `&i=${encodeURIComponent(industry || "")}` +
    `&t=${encodeURIComponent(topics.join(","))}`;

  const ArticleCard = ({ item }: { item: any }) => {
    const sectors = (item.affected_sectors as string[] || []).slice(0, 3);
    return (
      <div className="bg-white border border-fog rounded-xl px-4 py-3">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-foreground leading-snug">{item.title}</p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {item.source_name}{item.published_at && ` · ${fmtDate(item.published_at)}`}
            </p>
          </div>
          {item.attention_level === "High" && (
            <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded-md">🔴 High</span>
          )}
          {item.attention_level === "Medium" && (
            <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md">🟡 Medium</span>
          )}
        </div>
        {sectors.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {sectors.map(s => (
              <span key={s} className="text-[9px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded-full">{s}</span>
            ))}
          </div>
        )}
        {item.regulatory_theory && (
          <p className="text-[11px] text-primary/80 mt-1.5 italic line-clamp-1">
            Theory: {item.regulatory_theory}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <Helmet>
        <title>Get Your Privacy Intelligence | Your Privacy Hub</title>
        <meta name="description" content="Personalized privacy intelligence for your jurisdiction and practice. Built from 67 regulatory sources. Takes 60 seconds." />
      </Helmet>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* —— STEP 1 —— */}
        {step === 1 && (
          <>
            <Progress n={1} />
            <h1 className="font-display font-bold text-navy text-[26px] mb-2">
              Get Your Privacy Intelligence
            </h1>
            <p className="text-slate text-[14px] mb-1">
              Personalized to your jurisdiction and practice. Takes 60 seconds.
            </p>
            <p className="text-[12px] text-slate-light mb-8">
              What would take 4 hours of reading — delivered in 8 minutes.
            </p>
            <SampleInsight />
            <h2 className="font-bold text-navy text-[18px] mb-4">
              Where do you practice or operate?
            </h2>
            <div className="flex flex-wrap gap-2 mb-8">
              {JURISDICTIONS.map(j => (
                <button key={j} type="button" onClick={() => setJurisdiction(j)}
                  className={`px-4 py-2.5 rounded-xl border text-[13px] font-semibold transition-all
                    ${jurisdiction === j
                      ? "bg-navy border-navy text-white"
                      : "bg-white border-fog text-navy hover:border-navy/40"}`}>
                  {j}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setStep(2)} disabled={!jurisdiction}
              className="bg-navy text-white font-bold text-[14px] px-8 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-40">
              Next →
            </button>
          </>
        )}

        {/* —— STEP 2 —— */}
        {step === 2 && (
          <>
            <Progress n={2} />
            <h2 className="font-display font-bold text-navy text-[22px] mb-2">
              What privacy issues matter most to you?
            </h2>
            <p className="text-slate text-[13px] mb-6">Select all that apply.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
              {TOPICS.map(t => {
                const sel = topics.includes(t.id);
                return (
                  <button key={t.id} type="button" onClick={() => toggleTopic(t.id)}
                    className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all
                      ${sel ? "bg-navy border-navy" : "bg-white border-fog hover:border-navy/40"}`}>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[13px] font-semibold ${sel ? "text-white" : "text-navy"}`}>{t.label}</p>
                      <p className={`text-[11px] mt-0.5 ${sel ? "text-blue-200" : "text-slate"}`}>{t.desc}</p>
                    </div>
                    {sel && <span className="text-white/70 text-[11px] mt-0.5">✓</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => setStep(1)}
                className="text-slate text-[13px] hover:text-navy">← Back</button>
              <button type="button" onClick={() => setStep(3)} disabled={topics.length === 0}
                className="bg-navy text-white font-bold text-[14px] px-8 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-40">
                Next →
              </button>
            </div>
          </>
        )}

        {/* —— STEP 3 —— */}
        {step === 3 && (
          <>
            <Progress n={3} />
            <h2 className="font-display font-bold text-navy text-[22px] mb-2">
              Select your industry
            </h2>
            <p className="text-slate text-[13px] mb-6">
              We'll frame the analysis for your sector. Optional.
            </p>
            <div className="flex flex-wrap gap-2 mb-8">
              {INDUSTRIES.map(ind => (
                <button key={ind} type="button" onClick={() => setIndustry(ind)}
                  className={`px-4 py-2.5 rounded-xl border text-[13px] font-semibold transition-all
                    ${industry === ind ? "bg-navy border-navy text-white" : "bg-white border-fog text-navy hover:border-navy/40"}`}>
                  {ind}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <button type="button" onClick={() => setStep(2)}
                className="text-slate text-[13px] hover:text-navy">← Back</button>
              <button type="button" onClick={() => handleGenerate(false)} disabled={!industry}
                className="bg-navy text-white font-bold text-[14px] px-8 py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-40">
                Generate my Intelligence Report →
              </button>
              <button type="button" onClick={() => handleGenerate(true)}
                className="text-blue text-[13px] font-semibold hover:text-navy">
                Skip — keep it general →
              </button>
            </div>
          </>
        )}

        {/* —— PREVIEW —— */}
        {step === "preview" && (
          <>
            {loading ? (
              <div className="py-20 text-center text-slate text-[14px]">
                Building your report…
              </div>
            ) : (
              <div className={isPremium ? "" : "pb-52"}>

                {/* Header */}
                <div className="mb-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                    Your Intelligence Report · Week 12 · 2026
                  </p>
                  <h1 className="font-display font-bold text-navy text-[24px] leading-tight mb-1">
                    Privacy Intelligence Report
                  </h1>
                  {reportSubtitle && (
                    <p className="text-[13px] text-slate">{reportSubtitle}</p>
                  )}
                  <p className="text-[12px] text-slate-light mt-1">
                    Built from 67 regulatory sources · 8-minute read
                  </p>
                </div>

                {/* Social proof */}
                <p className="text-[12px] text-slate-light mb-6 italic">
                  Trusted by DPOs, Privacy Counsel, Compliance Managers, and CPOs
                </p>

                <SampleInsight />

                {/* Enforcement — VISIBLE */}
                <div className="mb-6">
                  <h3 className="font-bold text-navy text-[15px] mb-3">
                    Enforcement Actions This Week
                  </h3>
                  {enforcement.length > 0 ? (
                    <div className="space-y-2">
                      {enforcement.map(e => <ArticleCard key={e.id} item={e} />)}
                    </div>
                  ) : (
                    <p className="text-[13px] text-slate italic">
                      No enforcement actions matched your selections this week.
                    </p>
                  )}
                </div>

                {/* Updates — VISIBLE */}
                <div className="mb-6">
                  <h3 className="font-bold text-navy text-[15px] mb-3">
                    Regulatory Developments
                  </h3>
                  {updates.length > 0 ? (
                    <div className="space-y-2">
                      {updates.map(u => <ArticleCard key={u.id} item={u} />)}
                    </div>
                  ) : (
                    <p className="text-[13px] text-slate italic">
                      No regulatory updates matched your selections this week.
                    </p>
                  )}
                </div>

                {/* Blurred sections — only for non-premium users; premium sees them clear */}
                {BLURRED.map(s => (
                  <div key={s.title} className="mb-6">
                    <h3 className="font-bold text-navy text-[15px] mb-3">{s.title}</h3>
                    <div className="bg-white border border-fog rounded-xl px-4 py-3">
                      <p className={`text-[13px] text-slate leading-relaxed ${
                        !isPremium && !premiumLoading ? "filter blur-sm pointer-events-none select-none" : ""
                      }`}>
                        {s.text}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Gate overlay — fixed bottom; hidden for premium and while loading premium status */}
                {!isPremium && !premiumLoading && (
                  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-fog
                    shadow-lg px-4 py-4 z-50">
                    <div className="max-w-2xl mx-auto">

                      {/* Default gate */}
                      {!showEmailCapture && (
                        <>
                          <p className="font-bold text-navy text-[16px] mb-1">
                            Unlock the Full Analysis
                          </p>
                          <p className="text-[12px] text-slate mb-3">
                            Compliance implications · Enforcement patterns · Action items
                          </p>
                          <div className="flex flex-wrap items-center gap-3">
                            <Link to={subscribeUrl}
                              className="bg-navy text-white font-bold text-[14px] px-7 py-2.5
                                rounded-xl hover:opacity-90 no-underline transition-all">
                              Get My Report →
                            </Link>
                            <span className="text-[12px] text-slate">
                              $39/month · cancel anytime
                            </span>
                            <button type="button" onClick={() => setShowEmailCapture(true)}
                              className="text-blue text-[13px] font-semibold hover:text-navy">
                              Send my preview →
                            </button>
                          </div>
                        </>
                      )}

                      {/* Email capture */}
                      {showEmailCapture && !emailSent && (
                        <>
                          <p className="font-bold text-navy text-[15px] mb-1">
                            Send your preview by email
                          </p>
                          <p className="text-[12px] text-slate mb-3">
                            We'll send this preview now and a reminder in 48 hours.
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link to={subscribeUrl}
                              className="bg-navy text-white font-bold text-[13px] px-5 py-2
                                rounded-xl hover:opacity-90 no-underline">
                              Get My Report →
                            </Link>
                            <input type="email" value={email}
                              onChange={e => setEmail(e.target.value)}
                              placeholder="you@company.com"
                              className="border border-fog rounded-xl px-3 py-2 text-[13px]
                                flex-1 min-w-[200px] outline-none focus:border-navy" />
                            <button type="button" onClick={handleEmailCapture}
                              disabled={!email}
                              className="bg-blue-600 text-white font-bold text-[13px] px-4 py-2
                                rounded-xl hover:opacity-90 disabled:opacity-40">
                              Send →
                            </button>
                          </div>
                        </>
                      )}

                      {/* Email sent confirmation */}
                      {emailSent && (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-green-600 font-bold text-[14px]">
                              ✓ Your preview is on its way.
                            </p>
                            <p className="text-[12px] text-slate">
                              Check your inbox for intelligence@yourprivacyhub.com
                            </p>
                          </div>
                          <Link to={subscribeUrl}
                            className="bg-navy text-white font-bold text-[13px] px-5 py-2.5
                              rounded-xl hover:opacity-90 no-underline flex-shrink-0 ml-4">
                            Get My Report →
                          </Link>
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

      </div>
      <Footer />
    </div>
  );
};

export default GetIntelligence;
