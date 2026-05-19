import { useEffect, useState } from "react";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import {
  PRICING,
  FOUNDING_PROMO,
  foundingPrice,
  isSmartTool,
  isConvenienceTool,
  type ToolKey,
} from "@/config/pricing";

/**
 * New pricing model (v8):
 *   • Standalone tool price is the same for every tier.
 *   • Founding subscribers (founding_subscriber flag) get a permanent
 *     discount applied at checkout: 20% off Smart Tools, 15% off
 *     Convenience Tools.
 *   • Professional annual subscribers additionally get 1 free
 *     Convenience Tool run per client per month (handled in
 *     freeConvenienceRun.ts at checkout time, not here).
 *
 * Source of truth: PRICING.tools in src/config/pricing.ts.
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

function standaloneCentsFor(slug: ToolSlug): number {
  const key = SLUG_TO_TOOL_KEY[slug];
  if (key === "cppa_suite_combo") {
    return (PRICING.tools.cppaRisk.dollars + PRICING.tools.cppaCyber.dollars) * 100;
  }
  return PRICING.tools[key].dollars * 100;
}

function canonicalKeyFor(slug: ToolSlug): string {
  // For classification purposes (smart vs convenience). Treat CPPA suite as smart.
  const key = SLUG_TO_TOOL_KEY[slug];
  return key === "cppa_suite_combo" ? "cppaRisk" : key;
}

export interface ToolPricing {
  /** Price the current viewer will pay, in dollars. */
  price: number;
  /** Standalone (non-discounted) price in dollars. */
  standalonePrice: number;
  /**
   * Founding-subscriber discounted price (in dollars) — used as strike-through
   * reference to advertise the founding-subscriber discount on intake pages.
   */
  subscriberPrice: number;
  /** True when the current viewer is currently being charged less than standalone. */
  isSubscriber: boolean;
  /** Legacy flag — no tool is "included free" under the new model. Always false. */
  isIncluded: boolean;
  /** True for monthly Intelligence subscribers (no longer discounted under v8). */
  isMonthlyIntelligence: boolean;
  /** True for CPPA tools (purely informational). */
  isCppa: boolean;
  /** True if viewer qualifies for founding-subscriber pricing. */
  isFoundingSubscriber: boolean;
  /** Founding-subscriber discount percent label, e.g. "20%". */
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
  const { tier, isFoundingSubscriber, isLoading } = useSubscriptionTier();
  const isCppa = CPPA_TOOLS.has(toolSlug);
  const name = DISPLAY_NAMES[toolSlug] ?? toolSlug;

  const standaloneCents = standaloneCentsFor(toolSlug);
  const canonicalKey = canonicalKeyFor(toolSlug);
  const smart = isSmartTool(canonicalKey);
  const foundingCents = foundingPrice(standaloneCents, smart);

  const standalone = standaloneCents / 100;
  const founding = foundingCents / 100;

  const price = isFoundingSubscriber ? founding : standalone;

  const foundingDiscountPct = smart
    ? FOUNDING_PROMO.smartToolDiscountPct
    : FOUNDING_PROMO.convenienceToolDiscountPct;
  const foundingDiscountLabel = `${Math.round(foundingDiscountPct * 100)}%`;

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
    price,
    standalonePrice: standalone,
    subscriberPrice: founding,
    isSubscriber: isFoundingSubscriber,
    isIncluded: false,
    isMonthlyIntelligence: tier === "monthly",
    isCppa,
    isFoundingSubscriber,
    foundingDiscountLabel,
    name,
    stripeConfigured,
    loading: isLoading,
  };
}
