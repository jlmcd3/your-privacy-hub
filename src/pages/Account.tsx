import { useNavigate, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { Helmet } from "react-helmet-async";
import { Check, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { fireCheckoutStarted } from "@/lib/analyticsEvents";

import BriefLanguageSelector from "@/components/account/BriefLanguageSelector";
import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";
import {
  AccountClientsSection,
  ComplianceDocumentsSection,
} from "@/components/clients/AccountClientsSection";
import { PRICING } from "@/config/pricing";
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
  const { tier, hasToolAccess, isPremium, isLoading: tierLoading } =
    useSubscriptionTier();
  const [onboardingComplete, setOnboardingComplete] = useState(true);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<string | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cancelMsg, setCancelMsg] = useState("");
  const [addonBusy, setAddonBusy] = useState(false);

  const loadProfile = () => {
    if (!user) return;
    supabase
      .from("profiles")
      .select(
        "role_confirmed_at, cancel_at_period_end, subscription_end_date"
      )
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
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

  const handleAddClientWorkspace = async () => {
    setAddonBusy(true);
    fireCheckoutStarted({ plan: "per_client_addon", surface: "account_addon" });
    const { data, error } = await supabase.functions.invoke("create-checkout-session", {
      body: { addon: "per_client_addon" },
    });
    setAddonBusy(false);
    const url = (data as any)?.url as string | undefined;
    if (error || (data as any)?.error || !url) {
      const msg =
        (data as any)?.message ||
        (data as any)?.error ||
        error?.message ||
        "Could not start add-on checkout.";
      toast({ title: "Checkout failed", description: msg, variant: "destructive" });
      return;
    }
    window.location.assign(url);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading || tierLoading) {
    return (
      <div className="min-h-screen bg-brand-cloud flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-teal/30 border-t-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <WorkspaceLayout>
      <Helmet>
        <title>My Account | End User Privacy</title>
      </Helmet>

      <div className="max-w-[640px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="font-display text-brand-navy mb-8">My Account</h1>

        {!onboardingComplete && (
          <div className="bg-gradient-to-br from-brand-teal/10 to-brand-mist/10 border border-brand-teal/30 rounded-2xl p-5 mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-brand-navy text-[14px] mb-1">
                Personalise your intelligence feed
              </h3>
              <p className="text-sm text-slate leading-relaxed">
                Tell us your role, jurisdiction, and sector so we can tailor your Action Brief.
              </p>
            </div>
            <Link
              to="/onboarding-profile?redirect=%2Faccount"
              className="shrink-0 inline-block bg-gradient-to-br from-brand-steel to-brand-teal text-white font-semibold text-sm py-2.5 px-5 rounded-lg no-underline hover:opacity-90 transition-all"
            >
              Complete setup →
            </Link>
          </div>
        )}

        {/* Account details */}
        <div className="bg-card border border-brand-cloud rounded-2xl p-6 mb-4">
          <h2 className="text-brand-navy text-[14px] uppercase tracking-wider mb-4">
            Account Details
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2.5 border-b border-brand-cloud">
              <span className="text-sm text-slate">Email</span>
              <span className="text-sm font-medium text-brand-navy">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-sm text-slate">Password</span>
              <Link
                to="/forgot-password"
                className="text-sm text-brand-teal-text hover:text-brand-navy no-underline font-medium"
              >
                Change password →
              </Link>
            </div>
          </div>
        </div>

        {/* Plan — tier-specific block */}
        {(tier === "annual" || tier === "annual_founding") && (
          <div className="bg-brand-navy/5 border border-brand-navy/20 rounded-2xl p-5 mb-4">
            <p className="font-bold text-brand-navy text-[15px]">Professional — Annual</p>
            <p className="text-sm text-slate mt-1">
              {PRICING.professional.annual.display}/yr · {PRICING.professional.perClient.display}/additional client
            </p>
            <p className="text-[12px] text-slate mt-1">
              Client workspaces, RoPA + Notice Builders + IR Playbook + Biometric + DPA Generator included, plus 3 free Smart Tool runs per year (annual plan).
            </p>
          </div>
        )}

        {tier === "monthly" && (
          <div className="bg-[hsl(var(--cobalt)/0.06)] border border-[hsl(var(--cobalt)/0.20)] rounded-2xl p-5 mb-4">
            <p className="font-bold text-brand-navy text-[15px]">Intelligence — Monthly</p>
            <p className="text-sm text-brand-teal-text mt-1">
              {PRICING.intelligence.monthly.display}/month · Cancel any time
            </p>
            <p className="text-[12px] text-slate mt-1">
              Intelligence brief, enforcement tracking, and reference content. Compliance tools sold separately at standalone rates.
            </p>
            <div className="mt-3 p-3 bg-card rounded-lg border border-[hsl(var(--cobalt)/0.15)]">
              <p className="text-[12px] font-semibold text-brand-navy">
                Add client workspaces with Professional
              </p>
              <p className="text-[11px] text-slate mb-2">
                {PRICING.professional.annual.display}/yr · client workspaces + 3 free Smart Tool runs per year (annual plan).
              </p>
              <Link to="/subscribe" className="text-[12px] font-bold text-brand-navy underline">
                Upgrade to Professional →
              </Link>
            </div>
          </div>
        )}

        {/* Subscription management — for any paid tier */}
        {isPremium ? (
          <div className="bg-card border border-brand-cloud rounded-2xl p-6 mb-4">
            <h2 className="text-brand-navy text-[14px] uppercase tracking-wider mb-4">
              Subscription
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2.5 border-b border-brand-cloud">
                <span className="text-sm text-slate">Status</span>
                {cancelAtPeriodEnd ? (
                  <span className="text-sm font-medium text-severity-warning">
                    Canceled — access until {formattedEndDate ?? "period end"}
                  </span>
                ) : (
                  <span className="text-sm font-medium text-accent flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Active
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-brand-cloud">
                <span className="text-sm text-slate">Brief preferences</span>
                <Link
                  to="/brief-preferences"
                  className="text-sm text-brand-teal-text hover:text-brand-navy no-underline font-medium flex items-center gap-1"
                >
                  Customize <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-sm text-slate">
                  {cancelAtPeriodEnd ? "Resume subscription" : "Manage subscription"}
                </span>
                {cancelAtPeriodEnd ? (
                  <button
                    type="button"
                    onClick={handleResume}
                    disabled={cancelBusy}
                    className="text-sm font-medium text-brand-teal-text hover:text-brand-navy bg-transparent border-none cursor-pointer disabled:opacity-50"
                  >
                    {cancelBusy ? "Working…" : "Resume auto-renewal →"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmCancelOpen(true)}
                    disabled={cancelBusy}
                    className="text-sm font-medium text-slate hover:text-severity-warning bg-transparent border-none cursor-pointer disabled:opacity-50"
                  >
                    Cancel auto-renewal
                  </button>
                )}
              </div>
            </div>
            {cancelMsg && (
              <p className="text-[12px] text-brand-mist mt-3 text-center">{cancelMsg}</p>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-brand-navy to-brand-steel rounded-2xl p-6 mb-4 text-center">
            <div className="text-[11px] font-bold uppercase tracking-widest text-brand-mist mb-2">
              ⭐ Upgrade
            </div>
            <h3 className="text-white mb-2">
              Professional or Intelligence
            </h3>
            <p className="text-brand-mist text-sm mb-4 max-w-sm mx-auto">
              Professional from {PRICING.professional.annual.display}/yr — client workspaces plus every Layer-1 tool included. Or Intelligence at {PRICING.intelligence.monthly.display}/month with RoPA, Notice Builders, and more bundled in.
            </p>
            <Link
              to="/subscribe"
              className="inline-block bg-white text-brand-navy font-bold text-[14px] py-2.5 px-8 rounded-xl no-underline hover:opacity-90 transition-all"
            >
              See plans →
            </Link>
          </div>
        )}

        {/* Per-client add-on — annual subscribers only */}
        {hasToolAccess && (
          <div className="bg-card border border-brand-cloud rounded-2xl p-6 mb-4">
            <h2 className="text-brand-navy text-[14px] uppercase tracking-wider mb-2">
              Client Workspaces
            </h2>
            <p className="text-sm text-slate mb-3 leading-relaxed">
              Add additional client workspaces for {PRICING.professional.perClient.display}/client/year. Each
              workspace gets separate document storage and tool history.
            </p>
            <button
              type="button"
              onClick={handleAddClientWorkspace}
              disabled={addonBusy}
              className="text-sm font-semibold text-brand-navy border border-brand-navy px-4 py-2 rounded-lg hover:bg-brand-navy/5 bg-transparent cursor-pointer disabled:opacity-50"
            >
              {addonBusy ? "Opening checkout…" : `+ Add client workspace — ${PRICING.professional.perClient.display}/yr`}
            </button>
          </div>
        )}

        {/* Multi-client management */}
        <AccountClientsSection />

        {/* Compliance documents summary */}
        <ComplianceDocumentsSection />

        {/* Weekly Brief Language (Intelligence subscribers only) */}
        <BriefLanguageSelector />

        {/* Quick links */}
        <div className="bg-card border border-brand-cloud rounded-2xl p-6 mb-4">
          <h2 className="text-brand-navy text-[14px] uppercase tracking-wider mb-4">
            Quick Links
          </h2>
          <div className="space-y-2">
            {[
              { label: "Sample Brief", href: "/#brief", premium: false },
              { label: "FAQ", href: "/faq", premium: false },
              { label: "Contact Support", href: "/contact", premium: false },
            ]
              .filter((l) => !l.premium || isPremium)
              .map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-brand-cloud transition-colors no-underline group"
                >
                  <span className="text-sm text-brand-navy group-hover:text-brand-teal-text transition-colors">
                    {link.label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-brand-mist" />
                </Link>
              ))}
          </div>
        </div>

        {/* Watchlist now lives at /watchlist */}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 text-[14px] font-medium text-slate bg-card border border-brand-cloud rounded-xl hover:bg-brand-cloud hover:text-brand-navy transition-colors cursor-pointer"
        >
          Sign Out
        </button>
      </div>



      <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Auto-renewal will be turned off and you won't be charged again. You'll
              keep full access{" "}
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
              className="bg-severity-warning text-white hover:bg-severity-warning/90"
            >
              {cancelBusy ? "Canceling…" : "Confirm cancellation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspaceLayout>
  );
}
