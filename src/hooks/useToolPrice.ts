import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";

/**
 * Static fallback pricing — kept in sync with `supabase/functions/create-tool-checkout`.
 * Shown immediately while the subscriber-aware price loads from the backend.
 */
const FALLBACK: Record<string, { standalone: number; subscriber: number; name: string }> = {
  li_assessment: { standalone: 69, subscriber: 35, name: "Legitimate Interest Assessment Tool" },
  governance_assessment: { standalone: 49, subscriber: 25, name: "Privacy Program Assessment Tool" },
  dpia_framework: { standalone: 99, subscriber: 49, name: "Impact Assessment Builder" },
  ropa_initial: { standalone: 79, subscriber: 35, name: "RoPA Builder — Initial Generation" },
  ropa_refresh: { standalone: 35, subscriber: 15, name: "RoPA Builder — Annual Refresh" },
  us_notice_single: { standalone: 25, subscriber: 12, name: "US Privacy Notice — Single State" },
  us_notice_all_states: { standalone: 59, subscriber: 29, name: "US Privacy Notice — All States" },
  us_notice_refresh: { standalone: 25, subscriber: 12, name: "US Notice — Annual Refresh" },
  eu_notice_single: { standalone: 45, subscriber: 19, name: "EU & Global Notice — Single Framework" },
  eu_notice_suite: { standalone: 119, subscriber: 65, name: "EU Notice Suite — GDPR + UK GDPR + FADP" },
  eu_notice_full_international: { standalone: 229, subscriber: 99, name: "EU & Global Notice — Full International" },
  eu_notice_refresh: { standalone: 35, subscriber: 19, name: "EU & Global Notice — Annual Refresh" },
  cppa_risk_assessment: { standalone: 149, subscriber: 79, name: "CPPA Risk Assessment — Module 1" },
  cppa_cybersecurity: { standalone: 199, subscriber: 99, name: "CPPA Cybersecurity Readiness — Module 2" },
  cppa_suite: { standalone: 299, subscriber: 149, name: "CPPA Full Audit Suite (Modules 1 + 2)" },
  dpa_generator: { standalone: 49, subscriber: 0, name: "Your Custom DPA" },
  ir_playbook: { standalone: 39, subscriber: 0, name: "Breach Response Playbook" },
  biometric_checker: { standalone: 49, subscriber: 0, name: "Biometric Privacy Compliance Assessment" },
};

/**
 * CPPA tools remain PAID for everyone under the New Model. Annual
 * subscribers get the discounted subscriber rate; monthly/free pay
 * standalone. Standard (non-CPPA) tools are FREE for annual subscribers.
 */
const CPPA_TOOLS = new Set([
  "cppa_risk_assessment",
  "cppa_cybersecurity",
  "cppa_suite",
]);

export interface ToolPricing {
  /** Price the current viewer will pay, in dollars (0 = included) */
  price: number;
  /** Standalone (non-subscriber) price in dollars */
  standalonePrice: number;
  /** Subscriber price in dollars (CPPA discount; for standard tools this is the original v1 reference price) */
  subscriberPrice: number;
  /** True when the current viewer qualifies for the subscriber rate (annual only) */
  isSubscriber: boolean;
  /** True when the current viewer is an Annual Platform subscriber and the tool is included free */
  isIncluded: boolean;
  /** True for monthly Intelligence subscribers (no tool access — pays standalone) */
  isMonthlyIntelligence: boolean;
  /** True when this tool is a CPPA tool (paid for all, discounted for annual) */
  isCppa: boolean;
  /** Tool display name */
  name: string;
  /** True when Stripe is fully wired up server-side */
  stripeConfigured: boolean;
  /** Loading flag */
  loading: boolean;
}

/**
 * Returns subscriber-aware pricing for a paid tool under the New Model.
 *
 *   Standard tool + annual subscriber → price = 0 (included)
 *   Standard tool + monthly/free      → price = standalone
 *   CPPA tool + annual subscriber     → price = subscriber (discounted)
 *   CPPA tool + monthly/free          → price = standalone
 */
export function useToolPrice(toolSlug: keyof typeof FALLBACK): ToolPricing {
  const { user, hasToolAccess, tier } = useSubscriptionTier();
  const fb = FALLBACK[toolSlug];
  const isCppa = CPPA_TOOLS.has(toolSlug as string);

  // Compute effective price using the New Model.
  const computeEffective = (standalone: number, subscriber: number) => {
    if (hasToolAccess) {
      // Annual subscriber: standard tools are free; CPPA stays at subscriber rate.
      return isCppa ? subscriber : 0;
    }
    // Monthly Intelligence + free users pay standalone for everything.
    return standalone;
  };

  const initialPrice = computeEffective(fb.standalone, fb.subscriber);

  const [state, setState] = useState<ToolPricing>({
    price: initialPrice,
    standalonePrice: fb.standalone,
    subscriberPrice: fb.subscriber,
    isSubscriber: hasToolAccess,
    isIncluded: hasToolAccess && !isCppa,
    isMonthlyIntelligence: tier === "monthly",
    isCppa,
    name: fb.name,
    stripeConfigured: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-tool-price`);
        const slugMap: Record<string, string> = {
          li_assessment: "li_analyzer",
          governance_assessment: "healthcheck",
          dpia_framework: "dpia_builder",
          ropa_initial: "ropa_initial",
          ropa_refresh: "ropa_refresh",
          us_notice_single: "us_notice_single",
          us_notice_all_states: "us_notice_all_states",
          us_notice_refresh: "us_notice_refresh",
          eu_notice_single: "eu_notice_single",
          eu_notice_suite: "eu_notice_suite",
          eu_notice_full_international: "eu_notice_full_international",
          eu_notice_refresh: "eu_notice_refresh",
          cppa_risk_assessment: "cppa_risk_assessment",
          cppa_cybersecurity: "cppa_cybersecurity",
          cppa_suite: "cppa_suite",
          dpa_generator: "dpa_generator",
          ir_playbook: "ir_playbook",
          biometric_checker: "biometric_checker",
        };
        url.searchParams.set("tool_slug", slugMap[toolSlug]);

        const headers: Record<string, string> = {
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        };
        if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

        const res = await fetch(url.toString(), { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;

        const standaloneCents = data.standalone_amount_cents ?? data.amount_cents ?? fb.standalone * 100;
        const subscriberCents = data.subscriber_amount_cents ?? fb.subscriber * 100;
        const standaloneDollars = Math.round(standaloneCents / 100);
        const subscriberDollars = Math.round(subscriberCents / 100);

        // Always recompute on the client per the New Model rules — do not
        // trust the legacy "tier" field from the edge function for gating.
        const effective = computeEffective(standaloneDollars, subscriberDollars);

        setState({
          price: effective,
          standalonePrice: standaloneDollars,
          subscriberPrice: subscriberDollars,
          isSubscriber: hasToolAccess,
          isIncluded: hasToolAccess && !isCppa,
          isMonthlyIntelligence: tier === "monthly",
          isCppa,
          name: data.tool_name || fb.name,
          stripeConfigured: !!data.stripe_configured,
          loading: false,
        });
      } catch (_) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            price: computeEffective(s.standalonePrice, s.subscriberPrice),
            isSubscriber: hasToolAccess,
            isIncluded: hasToolAccess && !isCppa,
            isMonthlyIntelligence: tier === "monthly",
            loading: false,
          }));
        }
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolSlug, user?.id, hasToolAccess, tier]);

  return state;
}
