import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, X as XIcon } from "lucide-react";

const features = [
  "Full Enforcement Tracker access — all actions, all regulators, all jurisdictions",
  "Weekly Privacy Brief (full 8-section AI intelligence report)",
  "Regional analysis: US Federal, States, EU & UK, Global",
  "Enforcement table with fine amounts",
  "Trend signals — forward-looking intelligence",
  "Why This Matters — action items for GC/CPO",
  "Priority access to new features",
];

const comparisonRows = [
  { feature: "Daily privacy news feed", free: true, premium: true },
  { feature: "Jurisdiction profiles (150+ countries)", free: true, premium: true },
  { feature: "Regulator directory (250+ authorities)", free: true, premium: true },
  { feature: "Research guides (GDPR, AI, US laws)", free: true, premium: true },
  { feature: "Top 12 recent enforcement actions", free: true, premium: true },
  { feature: "Preview of weekly brief headline", free: true, premium: true },
  { feature: "Full weekly AI intelligence brief (8 sections)", free: false, premium: true },
  { feature: "Complete enforcement database — all actions", free: false, premium: true },
  { feature: "Regional analysis: US Federal, States, EU, Global", free: false, premium: true },
  { feature: "Enforcement table with fine amounts", free: false, premium: true },
  { feature: "Trend signals — forward-looking intelligence", free: false, premium: true },
  { feature: "Why This Matters — action items for GC/CPO", free: false, premium: true },
];

const Subscribe = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      navigate("/signup?redirect=/subscribe");
      return;
    }

    setLoading(planId);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "create-checkout-session",
        { body: { plan: planId } }
      );

      if (fnError) {
        setError(fnError.message || "Something went wrong");
        setLoading(null);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.error) {
        setError(data.error);
        setLoading(null);
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <Topbar />
      <Navbar />

      {/* Navy gradient hero */}
      <div className="bg-gradient-to-br from-navy to-navy-mid py-14 md:py-20 px-4 md:px-8">
        <div className="max-w-[720px] mx-auto text-center">
          <h1 className="font-display text-[28px] md:text-[40px] text-white mb-4 leading-tight">
            The library is free. The analyst is $15/month.
          </h1>
          <p className="text-[15px] md:text-base text-slate-light max-w-[600px] mx-auto leading-relaxed">
            Everything you can browse is always free. The first 25 subscribers get the full Intelligence Brief free for one year. After that, just $15/month.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        {/* Comparison table */}
        <div className="mb-14">
          <h2 className="font-display text-[22px] text-navy text-center mb-8">Free vs. Premium</h2>
          <div className="bg-card border border-fog rounded-2xl overflow-hidden shadow-eup-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-fog">
                    <th className="px-5 py-3.5 text-left text-[12px] font-semibold tracking-wider uppercase text-slate">Feature</th>
                    <th className="px-5 py-3.5 text-center text-[12px] font-semibold tracking-wider uppercase text-slate w-[100px]">Free ($0)</th>
                    <th className="px-5 py-3.5 text-center text-[12px] font-semibold tracking-wider uppercase text-blue w-[130px]">Premium ($15/mo)</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-card" : "bg-paper/50"}>
                      <td className="px-5 py-3 text-[13px] text-navy border-t border-fog">{row.feature}</td>
                      <td className="px-5 py-3 text-center border-t border-fog">
                        {row.free ? (
                          <Check className="w-4 h-4 text-accent mx-auto" />
                        ) : (
                          <XIcon className="w-4 h-4 text-slate-light mx-auto" />
                        )}
                      </td>
                      <td className="px-5 py-3 text-center border-t border-fog">
                        <Check className="w-4 h-4 text-accent mx-auto" />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {/* Free column */}
            <div className="bg-fog border border-silver rounded-2xl p-6">
              <p className="font-display text-[16px] text-navy font-bold mb-1">📰 Free News Digest</p>
              <p className="text-[12px] text-slate mb-4">Delivered every Monday, free forever</p>
              <ul className="space-y-2.5">
                {["Top 5 privacy headlines of the week", "One-line summary per article", "Links to original sources", "No account required"].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-navy">
                    <Check className="h-4 w-4 text-slate-light mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-[13px] text-accent font-semibold mt-4">Always free →</p>
            </div>
            {/* Premium column */}
            <div className="bg-navy rounded-2xl p-6">
              <p className="font-display text-[16px] text-white font-bold mb-1">⭐ Intelligence Brief</p>
              <p className="text-[12px] text-slate-light mb-4">Full analyst report, every Monday</p>
              <ul className="space-y-2.5">
                {["8-section AI analyst synthesis", "Executive summary with regulatory context", "Enforcement table — all fines, all jurisdictions", "EU, US Federal, US States, Global analysis", "Trend signal comparing week-over-week", "Why This Matters — GC/CPO action items"].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[13px] text-white">
                    <Check className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-[13px] text-amber-400 font-semibold mt-4">From $15/month →</p>
            </div>
          </div>
        </div>

        {/* Single plan card */}
        <div className="max-w-md mx-auto">
          <div className="relative bg-card border border-blue rounded-2xl p-8 flex flex-col shadow-eup-md ring-2 ring-blue/20">
            <h2 className="font-display text-[22px] text-navy mb-1">Premium</h2>
            <p className="text-slate text-[13px] mb-5">Full premium access to all content</p>

            <div className="mb-6">
              <span className="text-[36px] font-bold text-navy">$15</span>
              <span className="text-slate text-[14px]">/month</span>
            </div>

            <ul className="space-y-3 mb-6 flex-1">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-[13px] text-navy">
                  <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            {/* Founding member callout */}
            <div className="mb-6 border border-sky/40 bg-sky/[0.08] rounded-xl px-5 py-4">
              <p className="text-[13px] text-navy leading-relaxed">
                <span className="text-[15px]">🎟️</span>{" "}
                <strong className="text-blue">Founding Member Rate</strong> — First 200 subscribers lock in $15/month at just{" "}
                <strong className="text-navy">$12/month forever</strong>. Rate never increases.
              </p>
            </div>

            <button
              onClick={() => handleSubscribe("founding")}
              disabled={loading !== null}
              className="w-full py-3 rounded-lg text-[14px] font-semibold transition-all cursor-pointer border-none bg-gradient-to-br from-steel to-blue text-white shadow-[0_2px_8px_rgba(59,130,196,0.25)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "founding" ? "Redirecting…" : "Subscribe — $12/mo"}
            </button>
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
