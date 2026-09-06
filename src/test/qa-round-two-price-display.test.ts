// QA round two (cluster 12 — "prices and entitlements disagree", 2026-09-06).
//
// The reviewer recorded page prices against observed Stripe checkout amounts
// for ten products. Two separate things were tangled together in that table:
//
//  1. The checkout amounts observed ($139 / $169 / $59 / $249 / $59 / $49 /
//     $59 / $49 / $59) are the v11 set that doc 187 already fixed on
//     2026-09-05. create-tool-checkout charges the REGISTRY amount via
//     price_data and reads the Stripe Price object only to log drift, so a
//     current build cannot charge them. That is a deployment matter (deploy the
//     edge functions, then run sync-pricing), not a code defect — this file
//     pins the registry against the page prices the reviewer saw, so the claim
//     is checkable rather than asserted.
//
//  2. A real display defect: /tools bound every card's `subscriberPrice` to
//     PRICING.tools.<x>.display, which is the STANDALONE price, and renders it
//     to a signed-in subscriber under "Paid: subscriber rate applied".
import { describe, expect, it } from "vitest";
import { PRICING_REGISTRY } from "@/config/pricing";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/** The subscriber prices the QA reviewer saw on the product pages. */
const OBSERVED_PAGE_PRICES: Array<[keyof typeof PRICING_REGISTRY, string]> = [
  ["cppa_risk_subscriber", "$179"],
  ["cppa_cyber_subscriber", "$239"],
  ["cppa_admt_subscriber", "$99"],
  ["cppa_suite_subscriber", "$349"],
  ["dpia_subscriber_v2", "$99"],
  ["hc_subscriber_v2", "$79"],
  ["li_subscriber_v2", "$89"],
  ["dpa_standalone_v2", "$69"],
  ["ir_standalone_v2", "$89"],
];

describe("cluster 12 — the registry matches the prices the product pages showed", () => {
  it.each(OBSERVED_PAGE_PRICES)("%s is %s", (key, expected) => {
    expect(PRICING_REGISTRY[key].displayPrice).toBe(expected);
  });

  it("displayPrice and amountCents never disagree in the registry", () => {
    for (const [key, entry] of Object.entries(PRICING_REGISTRY)) {
      const m = /^\$(\d+)$/.exec((entry as { displayPrice: string }).displayPrice);
      if (!m) continue; // "Free", ranges and prose lines are checked elsewhere
      expect(
        (entry as { amountCents: number }).amountCents,
        `${key}: displayPrice ${(entry as { displayPrice: string }).displayPrice} vs amountCents ${(entry as { amountCents: number }).amountCents}`,
      ).toBe(Number(m[1]) * 100);
    }
  });
});

describe("cluster 12 — /tools shows the subscriber a subscriber price", () => {
  const source = readFileSync(resolve(__dirname, "../pages/Tools.tsx"), "utf8");

  it("binds no card's subscriberPrice to a standalone display value", () => {
    // The CPPA cards are the ones this field actually renders, under the
    // "Paid: subscriber rate applied" badge.
    for (const key of ["cppa_risk", "cppa_cyber", "cppa_admt"]) {
      expect(
        source,
        `${key}'s subscriberPrice is still bound to the standalone PRICING.tools entry`,
      ).not.toContain(`subscriberPrice: PRICING.tools.${key}.display`);
    }
  });

  it("types no cents literal by hand as a price fallback", () => {
    // pricing.ts is the only place a price is typed; the ADMT card carried
    // `?? "$59"` and `?? "$149"` hand-copied fallbacks.
    const code = source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(code).not.toMatch(/\?\?\s*["'`]\$\d/);
  });

  it("the subscriber rate it now shows is below the standalone rate", () => {
    expect(PRICING_REGISTRY.cppa_risk_subscriber.amountCents)
      .toBeLessThan(PRICING_REGISTRY.cppa_risk_standalone.amountCents);
    expect(PRICING_REGISTRY.cppa_cyber_subscriber.amountCents)
      .toBeLessThan(PRICING_REGISTRY.cppa_cyber_standalone.amountCents);
    expect(PRICING_REGISTRY.cppa_admt_subscriber.amountCents)
      .toBeLessThan(PRICING_REGISTRY.cppa_admt_standalone.amountCents);
  });
});
