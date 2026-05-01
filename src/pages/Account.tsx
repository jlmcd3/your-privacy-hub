import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Helmet } from "react-helmet-async";
import { Check, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WatchlistManager from "@/components/watchlist/WatchlistManager";
import BriefLanguageSelector from "@/components/account/BriefLanguageSelector";
import DashboardSubnav from "@/components/dashboard/DashboardSubnav";
import { INTELLIGENCE_PRICING } from "@/config/pricing";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function Account() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionInterval, setSubscriptionInterval] = useState<string | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancelMsg, setCancelMsg] = useState("");

  const loadProfile = () => {
    if (!user) return;
    supabase
      .from("profiles")
      .select(
        "is_premium, subscription_interval, subscription_tier, role_confirmed_at, cancel_at_period_end, subscription_end_date"
      )
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setIsPremium(data.is_premium);
          setSubscriptionInterval((data as any).subscription_interval ?? null);
          setSubscriptionTier((data as any).subscription_tier ?? null);
          setOnboardingComplete(!!(data as any).role_confirmed_at);
          setCancelAtPeriodEnd(!!(data as any).cancel_at_period_end);
          setSubscriptionEndDate((data as any).subscription_end_date ?? null);
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const formattedEndDate = subscriptionEndDate
    ? new Date(subscriptionEndDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const handleConfirmCancel = async () => {
    setCancelBusy(true);
    setCancelMsg("");
    const { data, error } = await supabase.functions.invoke("cancel-subscription", {
      body: { resume: false },
    });
    setCancelBusy(false);
    setConfirmCancelOpen(false);
    if (error || (data as any)?.error) {
      const msg = (data as any)?.error || error?.message || "Could not cancel subscription.";
      toast({ title: "Cancellation failed", description: msg, variant: "destructive" });
      return;
    }
    toast({
      title: "Subscription canceled",
      description: formattedEndDate
        ? `You'll keep access until ${formattedEndDate}.`
        : "You'll keep access until the end of the current billing period.",
    });
    loadProfile();
  };

  const handleResume = async () => {
    setCancelBusy(true);
    const { data, error } = await supabase.functions.invoke("cancel-subscription", {
      body: { resume: true },
    });
    setCancelBusy(false);
    if (error || (data as any)?.error) {
      const msg = (data as any)?.error || error?.message || "Could not resume subscription.";
      toast({ title: "Resume failed", description: msg, variant: "destructive" });
      return;
    }
    toast({ title: "Subscription resumed", description: "Auto-renewal is back on." });
    loadProfile();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue/30 border-t-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>My Account | End User Privacy</title>
      </Helmet>
      <Navbar />
      <DashboardSubnav />

      <div className="max-w-[640px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-display font-bold text-navy text-[24px] mb-8">My Account</h1>

        {!onboardingComplete && (
          <div className="bg-gradient-to-br from-blue/10 to-sky/10 border border-blue/30 rounded-2xl p-5 mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-navy text-[14px] mb-1">
                Personalise your intelligence feed
              </h3>
              <p className="text-[13px] text-slate leading-relaxed">
                Tell us your role, jurisdiction, and sector so we can tailor your Action Brief.
              </p>
            </div>
            <Link
              to="/onboarding-profile?redirect=%2Faccount"
              className="shrink-0 inline-block bg-gradient-to-br from-steel to-blue text-white font-semibold text-[13px] py-2.5 px-5 rounded-lg no-underline hover:opacity-90 transition-all"
            >
              Complete setup →
            </Link>
          </div>
        )}

        {/* Account details */}
        <div className="bg-card border border-fog rounded-2xl p-6 mb-4">
          <h2 className="font-semibold text-navy text-[14px] uppercase tracking-wider mb-4">
            Account Details
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2.5 border-b border-fog">
              <span className="text-[13px] text-slate">Email</span>
              <span className="text-[13px] font-medium text-navy">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-2.5 border-b border-fog">
              <span className="text-[13px] text-slate">Plan</span>
              {isPremium ? (
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 px-2.5 py-1 rounded-full">
                  ⭐ {subscriptionTier === "grandfathered_premium" ? "Intelligence (Legacy)" : "Intelligence"}{" "}
                  {subscriptionInterval === "year" ? "(Annual)" : "(Monthly)"}
                </span>
              ) : (
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate bg-fog border border-silver px-2.5 py-1 rounded-full">
                  Free
                </span>
              )}
            </div>
            {isPremium && (
              <div className="flex justify-between items-center py-2.5 border-b border-fog">
                <span className="text-[13px] text-slate">Tool pricing</span>
                <Link
                  to="/tools"
                  className="text-[13px] text-blue hover:text-navy no-underline font-medium"
                >
                  Subscriber rates active →
                </Link>
              </div>
            )}
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[13px] text-slate">Password</span>
              <Link
                to="/forgot-password"
                className="text-[13px] text-blue hover:text-navy no-underline font-medium"
              >
                Change password →
              </Link>
            </div>
          </div>
        </div>

        {/* Subscription management */}
        {isPremium ? (
          <div className="bg-card border border-fog rounded-2xl p-6 mb-4">
            <h2 className="font-semibold text-navy text-[14px] uppercase tracking-wider mb-4">
              Subscription
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2.5 border-b border-fog">
                <span className="text-[13px] text-slate">Status</span>
                {cancelAtPeriodEnd ? (
                  <span className="text-[13px] font-medium text-warn">
                    Canceled — access until {formattedEndDate ?? "period end"}
                  </span>
                ) : (
                  <span className="text-[13px] font-medium text-accent flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Active
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-fog">
                <span className="text-[13px] text-slate">Brief preferences</span>
                <Link
                  to="/brief-preferences"
                  className="text-[13px] text-blue hover:text-navy no-underline font-medium flex items-center gap-1"
                >
                  Customize <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-[13px] text-slate">
                  {cancelAtPeriodEnd ? "Resume subscription" : "Cancel subscription"}
                </span>
                {cancelAtPeriodEnd ? (
                  <button
                    type="button"
                    onClick={handleResume}
                    disabled={cancelBusy}
                    className="text-[13px] font-medium text-blue hover:text-navy bg-transparent border-none cursor-pointer disabled:opacity-50"
                  >
                    {cancelBusy ? "Working…" : "Resume auto-renewal →"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmCancelOpen(true)}
                    disabled={cancelBusy}
                    className="text-[13px] font-medium text-slate hover:text-warn bg-transparent border-none cursor-pointer disabled:opacity-50"
                  >
                    Cancel auto-renewal
                  </button>
                )}
              </div>
            </div>
            {cancelMsg && (
              <p className="text-[12px] text-slate-light mt-3 text-center">{cancelMsg}</p>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-navy to-steel rounded-2xl p-6 mb-4 text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-sky mb-2">
              ⭐ Upgrade
            </div>
            <h3 className="font-display font-bold text-white text-[18px] mb-2">
              Get Intelligence
            </h3>
            <p className="text-slate-light text-[13px] mb-4 max-w-sm mx-auto">
              Full archive, your weekly brief re-written for your industry and
              jurisdictions, watchlists, and subscriber pricing on every assessment tool
              . {`${INTELLIGENCE_PRICING.combined()}`} (save 17%).
            </p>
            <Link
              to="/subscribe"
              className="inline-block bg-white text-navy font-bold text-[14px] py-2.5 px-8 rounded-xl no-underline hover:opacity-90 transition-all"
            >
              See plans →
            </Link>
          </div>
        )}

        {/* Weekly Brief Language (Intelligence subscribers only) */}
        <BriefLanguageSelector />

        {/* Quick links */}
        <div className="bg-card border border-fog rounded-2xl p-6 mb-4">
          <h2 className="font-semibold text-navy text-[14px] uppercase tracking-wider mb-4">
            Quick Links
          </h2>
          <div className="space-y-2">
            {[
              { label: "Sample Brief", href: "/sample-brief", premium: false },
              { label: "FAQ", href: "/faq", premium: false },
              { label: "Contact Support", href: "/contact", premium: false },
            ]
              .filter((l) => !l.premium || isPremium)
              .map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-fog transition-colors no-underline group"
                >
                  <span className="text-[13px] text-navy group-hover:text-blue transition-colors">
                    {link.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-light" />
                </Link>
              ))}
          </div>
        </div>

        {/* Watchlist */}
        <div id="watchlist" className="mb-4">
          <WatchlistManager isPremium={isPremium} />
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 text-[14px] font-medium text-slate bg-card border border-fog rounded-xl hover:bg-fog hover:text-navy transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>

      <Footer />

      <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Auto-renewal will be turned off and you won't be charged again. You'll
              keep full access to Intelligence{" "}
              {formattedEndDate ? (
                <>
                  until <strong>{formattedEndDate}</strong>.
                </>
              ) : (
                <>until the end of your current billing period.</>
              )}{" "}
              You can resume anytime before that date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelBusy}>Keep subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelBusy}
              className="bg-warn text-white hover:bg-warn/90"
            >
              {cancelBusy ? "Canceling…" : "Confirm cancellation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
