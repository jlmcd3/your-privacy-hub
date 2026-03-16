import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, X as XIcon } from "lucide-react";

const plans = [
  {
    id: "founding",
    name: "Founding Member",
    price: "$12",
    period: "/month",
    badge: "Limited",
    highlight: true,
    description: "First 200 members · Rate locked forever",
    features: [
      "Full Enforcement Tracker access",
      "Weekly Privacy Brief (full)",
      "Priority access to new features",
      "Founding member badge",
      "Rate locked at $12/mo forever",
    ],
  },
  {
    id: "standard",
    name: "Standard",
    price: "$15",
    period: "/month",
    badge: null,
    highlight: false,
    description: "Full premium access to all content",
    features: [
      "Full Enforcement Tracker access",
      "Weekly Privacy Brief (full)",
      "Access to all premium content",
      "Email support",
    ],
  },
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
            The library is free. The analyst is $15.
          </h1>
          <p className="text-[15px] md:text-base text-slate-light max-w-[600px] mx-auto leading-relaxed">
            Browse every regulator, jurisdiction, and news article at no cost. Upgrade for the weekly AI brief that synthesizes it all into actionable intelligence.
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

        {/* Plan cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-card border rounded-2xl p-8 flex flex-col ${
                plan.highlight
                  ? "border-blue shadow-eup-md ring-2 ring-blue/20"
                  : "border-fog"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-6 bg-blue text-white text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
                  {plan.badge}
                </span>
              )}

              <h2 className="font-display text-[20px] text-navy mb-1">
                {plan.name}
              </h2>
              <p className="text-slate text-[13px] mb-5">
                {plan.description}
              </p>

              <div className="mb-6">
                <span className="text-[36px] font-bold text-navy">
                  {plan.price}
                </span>
                <span className="text-slate text-[14px]">
                  {plan.period}
                </span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[13px] text-navy"
                  >
                    <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading !== null}
                className={`w-full py-3 rounded-lg text-[14px] font-semibold transition-all cursor-pointer border-none ${
                  plan.highlight
                    ? "bg-gradient-to-br from-steel to-blue text-white shadow-[0_2px_8px_rgba(59,130,196,0.25)] hover:opacity-90"
                    : "bg-fog text-navy hover:bg-silver"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.id ? "Redirecting…" : "Subscribe"}
              </button>
            </div>
          ))}
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
