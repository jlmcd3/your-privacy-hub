/**
 * AdSense configuration — single source of truth for ad keys and posture.
 *
 * Launch posture (AD-1 / AD-2 / AD-3):
 *   - Ads are ALLOWLIST-ONLY (AD_ELIGIBLE_PREFIXES). Everything else — homepage,
 *     /tools, tool landings, /cppa, /samples, pricing, checkout, auth, intakes,
 *     reports, any authenticated view — is ad-free by omission.
 *   - Non-personalized only.
 *   - EEA / UK / Switzerland are excluded until a Google-certified Privacy &
 *     Messaging CMP is deployed (phase 2).
 *   - Signed-in users are ad-free.
 *   - GPC = no ads at all (deliberately exceeds the strict requirement for NPA).
 *
 * Flip ADS_ENABLED to true only after Google approval and after ADSENSE_CLIENT
 * is set to the real ca-pub value that matches public/ads.txt.
 */

// New (AD-1) surface: flag-gated allowlist advertising.
export const ADS_ENABLED = false;
export const ADSENSE_CLIENT = "ca-pub-7713080064663325"; // must match public/ads.txt
export const NON_PERSONALIZED_ONLY = true;

export const AD_ELIGIBLE_PREFIXES = [
  "/us-privacy-laws",
  "/gdpr-enforcement",
  "/global-privacy-laws",
  "/ai-privacy-regulations",
  "/cross-border-transfers",
  "/biometric-privacy",
  "/health-data-privacy",
  "/cookie-consent",
  "/breach-notification",
  "/glossary",
  "/updates",
  "/enforcement",
  "/calendar",
  "/timelines",
  "/jurisdictions",
  "/jurisdiction/",
  "/regulator/",
  "/legislation-tracker",
  "/compare/us-states",
];

// Launch posture; phase 2 = enable Google-certified Privacy & Messaging CMP
// before removing this exclusion.
export const AD_EXCLUDED_REGION = "EEA_UK_CH";

// Legacy config kept for existing placements (AdBanner, InFeedAd, StickyRailAd).
// Effectively off at launch: `enabled` mirrors ADS_ENABLED so legacy placements
// respect the same posture until they migrate to AdSlot / useAdEligibility.
export const ADSENSE_CONFIG = {
  pubId: ADSENSE_CLIENT,
  slots: {
    leaderboard: "8166125586",
    inFeed: "8166125586",
    rectangle: "8166125586",
    stickyRail: "8166125586",
  },
  enabled: ADS_ENABLED,
} as const;

export type AdVariant = keyof typeof ADSENSE_CONFIG.slots;
