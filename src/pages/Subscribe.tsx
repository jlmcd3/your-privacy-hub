import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, X as XIcon } from "lucide-react";
import ProBriefPreview from "@/components/subscribe/ProBriefPreview";

const comparisonRows = [
  { feature: "Daily privacy news feed",                             free: true,  pro: true  },
  { feature: "Jurisdiction profiles (150+ countries)",              free: true,  pro: true  },
  { feature: "Regulator directory (119 authorities)",               free: true,  pro: true  },
  { feature: "Research guides (GDPR, AI, US laws)",                 free: true,  pro: true  },
  { feature: "Enforcement tracker (all actions)",                   free: true,  pro: true  },
  { feature: "Full weekly AI intelligence brief (8 sections)",      free: true,  pro: true  },
  { feature: "Enforcement table with fine amounts",                 free: true,  pro: true  },
  { feature: "Trend signals — forward-looking intelligence",        free: true,  pro: true  },
  { feature: "Why This Matters — GC/CPO action items",             free: true,  pro: true  },
  { feature: "Brief written for your industry",                     free: false, pro: true  },
  { feature: "Jurisdiction focus (EU-only, US-only, APAC…)",       free: false, pro: true  },
  { feature: "Subject-matter depth (AI, biometric, litigation…)",  free: false, pro: true  },
  { feature: "Sector-specific compliance action items",            free: false, pro: true  },
  { feature: "Priority Monday delivery",                           free: false, pro: true  },
];

const Subscribe = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async () => {
    if (!user) {
      navigate("/signup?redirect=/subscribe");
      return;
    }
    setLoading("pro");
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-checkout-session",
        { body: { plan: "pro" } }
      );
      if (fnError) { setError(fnError.message || "Something went wrong"); setLoading(null); return; }
      if (data?.url) { window.location.href = data.url; }
      else if (data?.error) { setError(data.error); setLoading(null); }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Subscribe to Privacy Intelligence | EndUserPrivacy</title>
        <meta name="description" content="Get the weekly AI Intelligence Brief covering GDPR, US state privacy laws, enforcement actions, and global developments. Premium Pro: your AI analyst, briefed on your world." />
      </Helmet>
      <Topbar />
      <Navbar />

      {/* Navy gradient hero */}
      <div className="bg-gradient-to-br from-navy to-navy-mid py-14 md:py-20 px-4 md:px-8">
        <div className="max-w-[720px] mx-auto text-center">
          <h1 className="font-display text-[28px] md:text-[40px] text-white mb-4 leading-tight">
            The library is free.<br />Your analyst is $20/month.
          </h1>
          <p className="text-[15px] md:text-base text-slate-light max-w-[600px] mx-auto leading-relaxed">
            Everything you can browse and read is always free — including the weekly
            Intelligence Brief. Your analyst is something different: a brief re-written
            every Monday specifically for your industry, your jurisdictions, and your
            compliance obligations. That's $20/month.
          </p>
        </div>
      </div>

      {/* Interactive Pro Brief Preview */}
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-8">
        {/* Social proof bar */}
        <div className="max-w-3xl mx-auto mb-8 text-center">
          <p className="text-[12px] text-slate mb-4 uppercase tracking-wider font-semibold">
            Trusted by privacy professionals
          </p>
          <div className="flex flex-wrap justify-center gap-8 text-[13px] text-slate">
            <span className="flex items-center gap-1.5">
              <span className="text-navy font-bold">DPOs</span>
            </span>
            <span className="text-fog">·</span>
            <span className="flex items-center gap-1.5">
              <span className="text-navy font-bold">Privacy Counsel</span>
            </span>
            <span className="text-fog">·</span>
            <span className="flex items-center gap-1.5">
              <span className="text-navy font-bold">Compliance Leads</span>
            </span>
            <span className="text-fog">·</span>
            <span className="flex items-center gap-1.5">
              <span className="text-navy font-bold">CPOs</span>
            </span>
            <span className="text-fog">·</span>
            <span className="flex items-center gap-1.5">
              <span className="text-navy font-bold">Privacy Consultants</span>
            </span>
          </div>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <div className="text-center mb-6">
          <h2 className="font-display font-bold text-navy text-[20px] mb-2">
            See what your Pro brief would look like this week
          </h2>
          <p className="text-slate text-[13px]">
            Pick your sector and region. We'll show you what your Monday brief
            would have opened with.
          </p>
        </div>
        <ProBriefPreview />
      </div>

      {/* Sample Brief Preview */}
      <div className="max-w-[760px] mx-auto px-4 py-12">
        <div className="text-center mb-6">
          <h2 className="font-display font-bold text-navy text-2xl mb-2">
            What does the Intelligence Brief look like?
          </h2>
          <p className="text-slate text-sm">
            Every Monday morning, all members receive this 8-section analysis.
            Here's a real excerpt from Week 11, 2026.
          </p>
        </div>

        <div className="space-y-3 mb-5">
          {/* Executive Summary preview */}
          <div className="bg-card border border-fog rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                ✓ FREE
              </span>
              <span className="text-[10px] text-slate-light uppercase tracking-wider">Executive Summary</span>
            </div>
            <p className="text-[13px] text-slate leading-relaxed line-clamp-3">
              This week's dominant regulatory theme is enforcement convergence: three separate
              authorities — the UK ICO, Texas AG, and EU EDPB — each took significant action
              within the same seven-day window, signaling accelerating enforcement activity
              across all major jurisdictions simultaneously.
            </p>
          </div>

          {/* Enforcement Table preview */}
          <div className="bg-card border border-fog rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                ✓ FREE
              </span>
              <span className="text-[10px] text-slate-light uppercase tracking-wider">Enforcement Table</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-fog text-[10px] uppercase tracking-wider text-slate">
                    <th className="pb-2 pr-3 text-left font-semibold">Regulator</th>
                    <th className="pb-2 pr-3 text-left font-semibold">Company</th>
                    <th className="pb-2 pr-3 text-left font-semibold">Fine</th>
                    <th className="pb-2 text-left font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { reg: "ICO (UK)", co: "TikTok Ltd", fine: "£12.7M", date: "Mar 3" },
                    { reg: "Texas AG", co: "DataConnect Inc", fine: "$14.2M", date: "Mar 9" },
                    { reg: "CNIL (France)", co: "Clearview AI", fine: "€20M", date: "Mar 8" },
                  ].map((r, i) => (
                    <tr key={i} className="border-b border-fog/50 last:border-0">
                      <td className="py-2 pr-3 font-medium text-navy">{r.reg}</td>
                      <td className="py-2 pr-3 text-slate">{r.co}</td>
                      <td className="py-2 pr-3 font-semibold text-navy">{r.fine}</td>
                      <td className="py-2 text-slate">{r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-center">
              <span className="text-[11px] text-slate-light italic">+ 4 more enforcement actions in the full brief</span>
            </div>
          </div>

          {/* Pro teaser — blurred */}
          <div className="relative bg-card border border-amber-200 rounded-xl p-5 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/70 to-white z-10 flex flex-col items-center justify-end pb-4">
              <p className="text-[12px] font-semibold text-navy mb-2">
                🎯 Pro subscribers get this same story re-analyzed for their industry
              </p>
              <button
                onClick={handleSubscribe}
                className="bg-navy text-white font-semibold text-[12px] px-5 py-2 rounded-lg hover:opacity-90 cursor-pointer border-none"
              >
                Get Premium Pro — $20/month →
              </button>
            </div>
            <div className="filter blur-[3px] select-none">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 mb-3 block w-fit">⭐ Pro</span>
              <p className="text-[10px] text-slate-light uppercase tracking-wider mb-3">Your Industry Lens — Healthcare</p>
              <p className="text-[13px] text-slate leading-relaxed">
                The ICO's TikTok ruling extends beyond social media. The legitimate interests
                prohibition for algorithmic personalization of minors directly applies to
                pediatric health app recommendation engines and patient portal personalization…
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/sample-brief"
            className="text-blue font-semibold text-sm no-underline hover:text-navy transition-colors"
          >
            Read the full sample brief →
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        {/* Comparison table */}
        <div className="mb-14">
          <h2 className="font-display text-[22px] text-navy text-center mb-8">Free vs. Pro</h2>
          <div className="bg-card border border-fog rounded-2xl overflow-hidden shadow-eup-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-fog">
                    <th className="px-5 py-3.5 text-left text-[12px] font-semibold tracking-wider uppercase text-slate">Feature</th>
                    <th className="px-5 py-3.5 text-center text-[12px] font-semibold tracking-wider uppercase text-slate w-[120px]">
                      Free
                    </th>
                    <th className="px-5 py-3.5 text-center text-[12px] font-semibold tracking-wider uppercase text-amber-600 w-[140px]">
                      Pro ($25/mo)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-paper/50"}>
                      <td className="px-5 py-3 text-[13px] text-navy border-t border-fog">{row.feature}</td>
                      <td className="px-5 py-3 text-center border-t border-fog">
                        {row.free ? <Check className="w-4 h-4 text-accent mx-auto" /> : <XIcon className="w-4 h-4 text-slate-light mx-auto" />}
                      </td>
                      <td className="px-5 py-3 text-center border-t border-fog">
                        {row.pro ? <Check className="w-4 h-4 text-amber-500 mx-auto" /> : <XIcon className="w-4 h-4 text-slate-light mx-auto" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* What's the difference? */}
        <div className="mb-14">
          <h2 className="font-display text-[22px] text-navy text-center mb-8">What's the difference?</h2>

          {/* Standard vs Pro comparison */}
          <div className="max-w-4xl mx-auto mb-8">
            <h3 className="font-display font-bold text-navy text-[16px] text-center mb-5">
              Same story. Different brief.
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Standard */}
              <div className="bg-card border border-fog rounded-2xl p-5">
                <div className="text-[9px] font-bold uppercase tracking-widest text-slate mb-3">
                  ✓ Free brief
                </div>
                <p className="text-[12px] font-semibold text-navy mb-2 leading-snug">
                  ICO fines TikTok £12.7M for children's data violations
                </p>
                <p className="text-[12px] text-slate leading-relaxed">
                  The ICO issued a £12.7M fine against TikTok Ltd for processing
                  the personal data of children under 13 without appropriate consent.
                  The case establishes that algorithmic personalization for minors
                  cannot rely on legitimate interests as a lawful basis.
                </p>
                <p className="text-[11px] text-slate-light mt-3 italic">
                  Action: Review children's data practices against the ICO standard.
                </p>
              </div>

              {/* Pro — Healthcare */}
              <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-5">
                <div className="text-[9px] font-bold uppercase tracking-widest text-amber-400 mb-3">
                  ⭐ Premium Pro brief — Healthcare sector
                </div>
                <p className="text-[12px] font-semibold text-white mb-2 leading-snug">
                  ICO children's data ruling: direct implications for pediatric health platforms
                </p>
                <p className="text-[12px] text-blue-100/80 leading-relaxed">
                  The ICO's TikTok ruling extends beyond social media. The legitimate interests
                  prohibition for algorithmic personalization of minors directly applies to
                  pediatric health app recommendation engines and patient portal personalization
                  for users under 13. If your platform serves or may serve users under 18,
                  your consent mechanisms and personalization logic need immediate review.
                </p>
                <p className="text-[11px] text-amber-300 mt-3">
                  Action: Audit pediatric portal personalization against the ICO standard
                  before your next ICO engagement. COPPA implications are also in play
                  for US-facing services.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free */}
            <div className="bg-fog border border-silver rounded-2xl p-6">
              <p className="font-display text-[18px] text-navy font-bold mb-1">Free — Always</p>
              <p className="text-[12px] text-slate mb-4">No account required for browsing. Free account for saved features.</p>
              <ul className="space-y-2.5">
                {[
                  "Daily privacy news from 119 regulators",
                  "Full weekly Intelligence Brief every Monday",
                  "150+ jurisdiction profiles",
                  "Enforcement tracker",
                  "Research guides (GDPR, AI Act, US laws)",
                  "Global privacy law map",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-navy">
                    <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <p className="text-[13px] text-accent font-semibold mt-4">Always free →</p>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-6">
              <p className="font-display text-[18px] text-white font-bold mb-1">⭐ Premium Pro — $25/month</p>
              <p className="text-[12px] text-sky mb-4">Your analyst. Written for your world.</p>
              <ul className="space-y-2.5">
                {[
                  "Everything in Free",
                  "Brief re-analyzed for your industry",
                  "Your jurisdiction focus: EU, US, APAC, or custom",
                  "Subject-matter depth: AI, biometric, litigation…",
                  "Sector-specific GC/CPO action items",
                  "Priority Monday delivery",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-white">
                    <Check className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <p className="text-[13px] text-amber-400 font-semibold mt-4">$25/month →</p>
            </div>
          </div>
        </div>

        {/* How we compare */}
        <div className="mb-14">
          <h2 className="font-display text-[22px] text-navy text-center mb-6">How we compare</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-card border border-fog rounded-2xl overflow-hidden text-[13px]">
              <thead>
                <tr className="bg-fog">
                  <th className="px-5 py-3.5 text-left text-[12px] font-semibold tracking-wider uppercase text-slate" />
                  <th className="px-5 py-3.5 text-center text-[12px] font-semibold text-blue bg-blue/5">EndUserPrivacy</th>
                  <th className="px-5 py-3.5 text-center text-[12px] font-semibold text-slate">IAPP / DataGuidance / Bloomberg</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Price", "$25/month", "$300–$3,500+/year"],
                  ["Format", "Weekly AI intelligence brief", "Large research databases"],
                  ["Focus", "Privacy & AI regulation only", "Broad legal coverage"],
                  ["Update frequency", "Daily monitoring, Monday brief", "Weekly to monthly"],
                  ["Learning curve", "Ready in 5 minutes", "Weeks of onboarding"],
                ].map(([label, us, them], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-paper/50"}>
                    <td className="px-5 py-3 text-navy font-medium border-t border-fog">{label}</td>
                    <td className="px-5 py-3 text-center text-navy font-medium border-t border-fog">
                      <span className="text-accent mr-1">✓</span>{us}
                    </td>
                    <td className="px-5 py-3 text-center text-slate border-t border-fog">{them}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Single Pro plan card */}
        <div className="max-w-md mx-auto">
          <div
            id="pro-plan-card"
            className="bg-gradient-to-br from-navy to-steel rounded-2xl p-8 border-2 border-blue/40 relative"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              The only paid tier
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-sky mb-2">
              ⭐ Premium Pro
            </div>
            <div className="text-white font-display font-bold text-[40px] leading-none mb-1">
              $25<span className="text-lg font-normal text-blue-200">/month</span>
            </div>
            <p className="text-blue-200 text-sm mb-5">
              Your analyst. Written for your industry and jurisdiction. Every Monday.
            </p>
            <ul className="space-y-2.5 mb-6">
              {[
                "Everything in Free (all library features)",
                "Full weekly Intelligence Brief re-analyzed for you",
                "Industry lens: Healthcare, AdTech, AI, Legal, Fintech, Retail",
                "Jurisdiction focus: EU, US, APAC, or your combination",
                "Subject-matter depth: AI, biometric, litigation, or your priorities",
                "Sector-specific GC/CPO action items every week",
                "Priority Monday delivery — lands before your week starts",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13px] text-white">
                  <span className="text-amber-400 font-bold flex-shrink-0 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>

            {/* Founding offer */}
            <div className="bg-white/10 border border-white/20 rounded-xl px-5 py-4 mb-5">
              <p className="text-[13px] text-amber-200 leading-relaxed">
                🎁 <strong>Founding offer:</strong> First 25 subscribers get Premium Pro
                free for one year, then $25/month.
              </p>
            </div>

            <button
              onClick={handleSubscribe}
              disabled={loading !== null}
              className="w-full py-3.5 rounded-xl text-[14px] font-bold transition-all cursor-pointer border-none bg-white text-navy shadow-eup-md hover:opacity-90 disabled:opacity-50"
            >
              {loading === "pro" ? "Redirecting…" : "Get Premium Pro →"}
            </button>
            <p className="text-center text-blue-300 text-[11px] mt-3">
              Cancel anytime · Secure checkout via Stripe
            </p>
          </div>
        </div>

        {error && (
          <p className="text-center text-warn text-[13px] mt-6">
            {error}
          </p>
        )}

        {/* Footer note */}
        <p className="text-center text-[12px] text-slate-light mt-8">
          Cancel anytime · Secure checkout via Stripe · Questions? Contact us
        </p>
      </div>
      <Footer />
    </div>
  );
};

export default Subscribe;
