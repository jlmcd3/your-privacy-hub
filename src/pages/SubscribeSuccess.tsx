import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Topbar from "@/components/Topbar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check } from "lucide-react";

export default function SubscribeSuccess() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [isPremium, setIsPremium] = useState(false);

  useEffect(() => {
    if (!user) return;
    let attempts = 0;
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", user.id)
        .single();
      if (data?.is_premium) {
        setIsPremium(true);
        clearInterval(poll);
      }
      if (++attempts >= 10) clearInterval(poll);
    }, 1000);
    return () => clearInterval(poll);
  }, [user]);

  const NEXT_STEPS = [
    {
      icon: "🎯",
      title: "Configure your analyst",
      body: "Tell us your industry, primary jurisdictions, and subject-matter priorities. Your brief is only as tailored as the context you provide.",
    },
    {
      icon: "📧",
      title: "Brief arrives Monday",
      body: "Your first Weekly Intelligence Brief will land in your inbox this coming Monday at 7am ET. It covers the past week's most important global privacy developments — re-analyzed for your world.",
    },
    {
      icon: "⚖️",
      title: "Full Enforcement Tracker unlocked",
      body: "You now have access to every enforcement action in the database — all regulators, all jurisdictions, with fine amounts and legal basis.",
    },
    {
      icon: "🌍",
      title: "Explore 150+ jurisdiction profiles",
      body: "Every country profile now shows its full news feed, regulator contacts, and enforcement history.",
    },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Welcome to Premium | EndUserPrivacy</title>
      </Helmet>
      <Topbar />
      <Navbar />

      <div className="max-w-[640px] mx-auto px-4 py-16 md:py-20">

        {/* Celebration header */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-full bg-accent/10 border-2 border-accent/30 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-accent" strokeWidth={2.5} />
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2">
            ⭐ Payment Confirmed
          </div>
          <h1 className="font-display font-bold text-navy text-[28px] md:text-[34px] mb-3 leading-tight">
            Welcome to Premium.
          </h1>
          <p className="text-slate text-[15px] leading-relaxed max-w-md mx-auto">
            Your personal analyst is now active. Every Monday morning, you'll receive
            an Intelligence Brief re-written specifically for your regulatory world.
          </p>
          {!isPremium && (
            <p className="text-slate-light text-[12px] mt-3 animate-pulse">
              Activating your account…
            </p>
          )}
        </div>

        {/* What happens next */}
        <div className="mb-8">
          <h2 className="font-display font-bold text-navy text-[18px] mb-4">
            What happens next
          </h2>
          <div className="space-y-3">
            {NEXT_STEPS.map((step) => (
              <div
                key={step.title}
                className="flex gap-4 p-4 bg-card border border-fog rounded-xl"
              >
                <div className="text-2xl flex-shrink-0 mt-0.5">{step.icon}</div>
                <div>
                  <div className="font-semibold text-navy text-[14px] mb-0.5">
                    {step.title}
                  </div>
                  <p className="text-slate text-[13px] leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Founding offer reminder */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 text-center">
          <p className="text-amber-800 text-[13px] font-medium">
            🎁 You're one of the first 25 subscribers — your first year is free.
            Your $20/month billing begins in 12 months.
          </p>
        </div>

        {/* Primary CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/brief-preferences?from=subscribe"
            className="flex-1 text-center bg-amber-400 text-navy font-bold text-[14px] py-3.5 px-6 rounded-xl no-underline hover:opacity-90 transition-all"
          >
            Personalize your Intelligence Brief →
          </Link>
          <Link
            to="/dashboard"
            className="flex-1 text-center bg-gradient-to-br from-navy to-blue text-white font-bold text-[14px] py-3.5 px-6 rounded-xl no-underline hover:opacity-90 transition-all"
          >
            Open My Intelligence Brief →
          </Link>
        </div>

        <p className="text-center text-slate-light text-[12px] mt-6">
          Questions? <Link to="/contact" className="text-blue hover:text-navy no-underline">Contact us</Link>
          {" "}· <Link to="/faq" className="text-blue hover:text-navy no-underline">FAQ</Link>
          {" "}· Cancel anytime from My Account
        </p>
      </div>

      <Footer />
    </div>
  );
}
