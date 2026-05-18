import { useEffect, useState } from "react";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { PRICING, getToolPrice, type ToolKey } from "@/config/pricing";

/**
 * v7 pricing model — per-use tools for ALL tiers with uniform discounts:
 *   Intelligence ($20/mo) subscribers : 20% off
 *   Professional ($35/mo) subscribers : 25% off
 *   Free / anonymous                  : standalone price
 *
 * Source of truth: `PRICING.tools` in src/config/pricing.ts.
 * Stripe charge reconciliation lives in the create-tool-checkout +
 * get-tool-price edge functions (see DRIFT LOG in src/config/pricing.ts).
 */

/** Map legacy slugs used across intake pages → canonical PRICING.tools keys. */
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

function standaloneFor(slug: ToolSlug): number {
  const key = SLUG_TO_TOOL_KEY[slug];
  if (key === "cppa_suite_combo") {
    // Suite = Risk + Cyber bundle
    return PRICING.tools.cppaRisk.dollars + PRICING.tools.cppaCyber.dollars;
  }
  return PRICING.tools[key].dollars;
}

function discountedFor(slug: ToolSlug, kind: "intelligence" | "professional"): number {
  const key = SLUG_TO_TOOL_KEY[slug];
  if (key === "cppa_suite_combo") {
    return getToolPrice("cppaRisk", kind) + getToolPrice("cppaCyber", kind);
  }
  return getToolPrice(key, kind);
}

export interface ToolPricing {
  /** Price the current viewer will pay, in dollars. */
  price: number;
  /** Standalone (non-subscriber) price in dollars. */
  standalonePrice: number;
  /** Best subscriber price (Professional, 25% off) — shown as strike-through reference for free users. */
  subscriberPrice: number;
  /** True when the current viewer is on any paid tier (and therefore getting a discount). */
  isSubscriber: boolean;
  /** Legacy flag — under v7 no tool is "included free". Always false. */
  isIncluded: boolean;
  /** True for monthly Intelligence subscribers (20% off). */
  isMonthlyIntelligence: boolean;
  /** True for CPPA tools (purely informational; no longer changes pricing logic). */
  isCppa: boolean;
  /** Tool display name. */
  name: string;
  /** True when Stripe is fully wired up server-side. */
  stripeConfigured: boolean;
  /** Loading flag. */
  loading: boolean;
}

const CPPA_TOOLS = new Set(["cppa_risk_assessment", "cppa_cybersecurity", "cppa_suite"]);

/**
 * Returns v7 subscriber-aware pricing for a tool intake page.
 *
 *   tier free                       → price = standalone
 *   tier monthly (Intelligence)     → price = standalone × 0.80
 *   tier annual / annual_founding   → price = standalone × 0.75
 *
 * `subscriberPrice` always reflects the best available discount (Professional / 25% off),
 * so intake-page strike-through copy advertises the maximum savings to free users.
 */
export function useToolPrice(toolSlug: ToolSlug): ToolPricing {
  const { tier, isLoading } = useSubscriptionTier();
  const isCppa = CPPA_TOOLS.has(toolSlug);
  const name = DISPLAY_NAMES[toolSlug] ?? toolSlug;

  const standalone = standaloneFor(toolSlug);
  const professional = discountedFor(toolSlug, "professional");
  const intelligence = discountedFor(toolSlug, "intelligence");

  let price = standalone;
  let isSubscriber = false;
  if (tier === "annual" || tier === "annual_founding") {
    price = professional;
    isSubscriber = true;
  } else if (tier === "monthly") {
    price = intelligence;
    isSubscriber = true;
  }

  const [stripeConfigured, setStripeConfigured] = useState(false);

  useEffect(() => {
    // Best-effort: ping get-tool-price purely to learn whether Stripe is wired.
    // We deliberately ignore any amounts it returns — the v7 displayed price
    // is driven by PRICING in src/config/pricing.ts. See DRIFT LOG.
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
    subscriberPrice: professional, // best available discount, used as strike-through reference
    isSubscriber,
    isIncluded: false, // v7: nothing is "included" — every tool is per-use
    isMonthlyIntelligence: tier === "monthly",
    isCppa,
    name,
    stripeConfigured,
    loading: isLoading,
  };
}
