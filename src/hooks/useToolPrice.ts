import { useEffect, useState } from "react";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { PRICING, PRICING_REGISTRY, type ToolKey } from "@/config/pricing";

/**
 * Pricing hook — restores differentiated subscriber pricing per the
 * reconciled price list:
 *   • Standalone price comes from PRICING.tools (canonical per-use price).
 *   • Subscriber price comes from PRICING_REGISTRY `*_subscriber*` addons.
 *   • Subscribers (intelligence/professional, any cadence) see the
 *     subscriber rate; everyone else sees the standalone rate.
 *   • IR Playbook and Biometric are FREE for any active subscriber.
 */

const SLUG_TO_TOOL_KEY: Record<string, ToolKey | "cppa_suite_combo"> = {
  li_assessment:                "lia",
  governance_assessment:        "governance",
  dpia_framework:               "dpia",
  ropa_initial:                 "ropa",
  ropa_refresh:                 "ropa",
  us_notice_single:             "usNotice",
  us_notice_all_states:         "usNotice",
  us_notice_refresh:            "usNotice",
  eu_notice_single:             "euNotice",
  eu_notice_suite:              "euNotice",
  eu_notice_full_international: "euNotice",
  eu_notice_refresh:            "euNotice",
  cppa_risk_assessment:         "cppaRisk",
  cppa_cybersecurity:           "cppaCyber",
  cppa_suite:                   "cppa_suite_combo",
  dpa_generator:                "dpa",
  ir_playbook:                  "irPlaybook",
  biometric_checker:            "biometric",
};

const DISPLAY_NAMES: Record<string, string> = {
  li_assessment:                "Legitimate Interest Assessment",
  governance_assessment:        "Privacy Program Assessment",
  dpia_framework:               "Data Protection Impact Assessment",
  ropa_initial:                 "RoPA Builder — Initial Generation",
  ropa_refresh:                 "RoPA Builder — Annual Refresh",
  us_notice_single:             "US Privacy Notice — Single State",
  us_notice_all_states:         "US Privacy Notice — All States",
  us_notice_refresh:            "US Notice — Annual Refresh",
  eu_notice_single:             "EU & Global Notice — Single Framework",
  eu_notice_suite:              "EU Notice Suite — GDPR + UK GDPR + FADP",
  eu_notice_full_international: "EU & Global Notice — Full International",
  eu_notice_refresh:            "EU & Global Notice — Annual Refresh",
  cppa_risk_assessment:         "CPPA Risk Assessment — Module 1",
  cppa_cybersecurity:           "CPPA Cybersecurity Readiness — Module 2",
  cppa_suite:                   "CPPA Full Audit Suite (Modules 1 + 2)",
  dpa_generator:                "Your Custom DPA",
  ir_playbook:                  "Breach Response Playbook",
  biometric_checker:            "Biometric Privacy Compliance Assessment",
};

export type ToolSlug = keyof typeof SLUG_TO_TOOL_KEY;

const SLUG_TO_SUBSCRIBER_KEY: Partial<Record<ToolSlug, string>> = {
  li_assessment:                "li_subscriber_v2",
  governance_assessment:        "hc_subscriber_v2",
  dpia_framework:               "dpia_subscriber_v2",
  ropa_initial:                 "ropa_initial_subscriber",
  ropa_refresh:                 "ropa_refresh_subscriber",
  us_notice_single:             "us_notice_v7_subscriber",
  us_notice_all_states:         "us_notice_v7_subscriber",
  us_notice_refresh:            "us_notice_v7_subscriber",
  eu_notice_single:             "eu_notice_v7_subscriber",
  eu_notice_suite:              "eu_notice_v7_subscriber",
  eu_notice_full_international: "eu_notice_v7_subscriber",
  eu_notice_refresh:            "eu_notice_v7_subscriber",
  cppa_risk_assessment:         "cppa_risk_subscriber",
  cppa_cybersecurity:           "cppa_cyber_subscriber",
  cppa_suite:                   "cppa_suite_subscriber",
  dpa_generator:                "dpa_subscriber_v2",
  ir_playbook:                  "ir_subscriber_v2",
  biometric_checker:            "biometric_subscriber_v2",
};

function standaloneCentsFor(slug: ToolSlug): number {
  const key = SLUG_TO_TOOL_KEY[slug];
  if (key === "cppa_suite_combo") {
    return (PRICING.tools.cppaRisk.dollars + PRICING.tools.cppaCyber.dollars) * 100;
  }
  return PRICING.tools[key].dollars * 100;
}

function subscriberCentsFor(slug: ToolSlug, standaloneCents: number): number {
  const lookupKey = SLUG_TO_SUBSCRIBER_KEY[slug];
  if (!lookupKey) return standaloneCents;
  const entry = (PRICING_REGISTRY as Record<string, { amountCents: number }>)[lookupKey];
  return entry ? entry.amountCents : standaloneCents;
}

export interface ToolPricing {
  /** Price the current viewer will pay, in dollars. */
  price: number;
  /** Standalone (non-discounted) price in dollars. */
  standalonePrice: number;
  /** Subscriber per-use price in dollars. */
  subscriberPrice: number;
  /** True if the current viewer is an active subscriber. */
  isSubscriber: boolean;
  /** True if this tool is included free for the current subscriber. */
  isIncluded: boolean;
  /** True for monthly Intelligence subscribers. */
  isMonthlyIntelligence: boolean;
  /** True for CPPA tools (purely informational). */
  isCppa: boolean;
  /** Retired program — always `false`. */
  isFoundingSubscriber: boolean;
  /** Retired program — always empty string. */
  foundingDiscountLabel: string;
  /** Tool display name. */
  name: string;
  /** True when Stripe is fully wired up server-side. */
  stripeConfigured: boolean;
  /** Loading flag. */
  loading: boolean;
}

const CPPA_TOOLS = new Set(["cppa_risk_assessment", "cppa_cybersecurity", "cppa_suite"]);

export function useToolPrice(toolSlug: ToolSlug): ToolPricing {
  const { tier, isPremium, isLoading } = useSubscriptionTier();
  const isCppa = CPPA_TOOLS.has(toolSlug);
  const name = DISPLAY_NAMES[toolSlug] ?? toolSlug;

  const standaloneCents = standaloneCentsFor(toolSlug);
  const subscriberCents = subscriberCentsFor(toolSlug, standaloneCents);
  const standalone = standaloneCents / 100;
  const subscriber = subscriberCents / 100;
  const isSubscriber = isPremium;
  const effective = isSubscriber ? subscriber : standalone;
  const isIncluded = isSubscriber && subscriberCents === 0;

  const [stripeConfigured, setStripeConfigured] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-tool-price`);
        url.searchParams.set("tool_slug", toolSlug);
        const res = await fetch(url.toString(), {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStripeConfigured(!!data.stripe_configured);
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [toolSlug]);

  return {
    price: effective,
    standalonePrice: standalone,
    subscriberPrice: subscriber,
    isSubscriber,
    isIncluded,
    isMonthlyIntelligence: tier === "monthly",
    isCppa,
    isFoundingSubscriber: false,
    foundingDiscountLabel: "",
    name,
    stripeConfigured,
    loading: isLoading,
  };
}
