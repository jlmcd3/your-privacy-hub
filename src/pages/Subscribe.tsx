import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check } from "lucide-react";

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

const Subscribe = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      navigate("/login");
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
    <div className="min-h-screen bg-background">
      <Topbar />
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="font-display text-[32px] text-foreground mb-3">
            Upgrade to Premium
          </h1>
          <p className="text-muted-foreground text-[15px] max-w-lg mx-auto">
            Get full access to the Enforcement Tracker, Weekly Brief, and all premium research.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-card border rounded-2xl p-8 flex flex-col ${
                plan.highlight
                  ? "border-primary shadow-lg ring-2 ring-primary/20"
                  : "border-border"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-6 bg-primary text-primary-foreground text-[11px] font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
                  {plan.badge}
                </span>
              )}

              <h2 className="font-display text-[20px] text-foreground mb-1">
                {plan.name}
              </h2>
              <p className="text-muted-foreground text-[13px] mb-5">
                {plan.description}
              </p>

              <div className="mb-6">
                <span className="text-[36px] font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="text-muted-foreground text-[14px]">
                  {plan.period}
                </span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[13px] text-foreground"
                  >
                    <Check className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading !== null}
                className={`w-full py-3 rounded-lg text-[14px] font-semibold transition-colors cursor-pointer ${
                  plan.highlight
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === plan.id ? "Redirecting…" : "Subscribe"}
              </button>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-center text-destructive text-[13px] mt-6">
            {error}
          </p>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Subscribe;
