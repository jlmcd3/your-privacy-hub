/**
 * Centralized Ad Slot Configuration — EndUserPrivacy.com FRD v2.1 §8.3
 *
 * Defines every contextual ad slot served on the platform.
 * Slot IDs are stable strings used for analytics + DOM data attributes.
 * Ad-network IDs are pulled from Vite env (VITE_ADSENSE_*).
 *
 * Policy: ads are contextual & non-behavioural and shown to ALL users
 * (including Professional). Never claim "ad-free" anywhere in copy.
 */

export type AdPlacement =
  | "home_top_leaderboard"
  | "home_sidebar_rail"
  | "home_mid_inline"
  | "home_bottom_leaderboard"
  | "feed_infeed_3"
  | "feed_infeed_7"
  | "article_top_leaderboard"
  | "article_sidebar_rail"
  | "article_inline"
  | "tools_sidebar"
  | "enforcement_sidebar"
  | "subscribe_disclosure";

export interface AdSlot {
  id: AdPlacement;
  description: string;
  format: "leaderboard" | "rail_skyscraper" | "inline" | "infeed" | "sidebar";
  /** AdSense slot ID — set per-deployment via env. */
  googleAdSlot?: string;
}

const PUBLISHER_ID = import.meta.env.VITE_ADSENSE_PUBLISHER_ID as string | undefined;

export const GOOGLE_AD_CLIENT = PUBLISHER_ID;

export const AD_SLOTS: Record<AdPlacement, AdSlot> = {
  home_top_leaderboard: {
    id: "home_top_leaderboard",
    description: "Above-fold leaderboard on homepage",
    format: "leaderboard",
    googleAdSlot: import.meta.env.VITE_ADSENSE_SLOT_HOME_TOP,
  },
  home_sidebar_rail: {
    id: "home_sidebar_rail",
    description: "Desktop sticky 300x600 rail on homepage",
    format: "rail_skyscraper",
    googleAdSlot: import.meta.env.VITE_ADSENSE_SLOT_HOME_RAIL,
  },
  home_mid_inline: {
    id: "home_mid_inline",
    description: "Mid-feed inline 728x90",
    format: "inline",
    googleAdSlot: import.meta.env.VITE_ADSENSE_SLOT_HOME_MID,
  },
  home_bottom_leaderboard: {
    id: "home_bottom_leaderboard",
    description: "Below-feed leaderboard on homepage",
    format: "leaderboard",
    googleAdSlot: import.meta.env.VITE_ADSENSE_SLOT_HOME_BOTTOM,
  },
  feed_infeed_3: {
    id: "feed_infeed_3",
    description: "In-feed unit after 3rd article",
    format: "infeed",
    googleAdSlot: import.meta.env.VITE_ADSENSE_SLOT_FEED_3,
  },
  feed_infeed_7: {
    id: "feed_infeed_7",
    description: "In-feed unit after 7th article",
    format: "infeed",
    googleAdSlot: import.meta.env.VITE_ADSENSE_SLOT_FEED_7,
  },
  article_top_leaderboard: {
    id: "article_top_leaderboard",
    description: "Top-of-article leaderboard",
    format: "leaderboard",
    googleAdSlot: import.meta.env.VITE_ADSENSE_SLOT_ARTICLE_TOP,
  },
  article_sidebar_rail: {
    id: "article_sidebar_rail",
    description: "Desktop sticky rail on article page",
    format: "rail_skyscraper",
    googleAdSlot: import.meta.env.VITE_ADSENSE_SLOT_ARTICLE_RAIL,
  },
  article_inline: {
    id: "article_inline",
    description: "Inline ad mid-article",
    format: "inline",
    googleAdSlot: import.meta.env.VITE_ADSENSE_SLOT_ARTICLE_INLINE,
  },
  tools_sidebar: {
    id: "tools_sidebar",
    description: "Sidebar slot on Tools landing page",
    format: "sidebar",
    googleAdSlot: import.meta.env.VITE_ADSENSE_SLOT_TOOLS_SIDE,
  },
  enforcement_sidebar: {
    id: "enforcement_sidebar",
    description: "Sidebar slot on Enforcement Tracker",
    format: "sidebar",
    googleAdSlot: import.meta.env.VITE_ADSENSE_SLOT_ENF_SIDE,
  },
  subscribe_disclosure: {
    id: "subscribe_disclosure",
    description: "Disclosure-only placeholder near subscribe CTA",
    format: "inline",
  },
};

export function getAdSlot(id: AdPlacement) {
  return AD_SLOTS[id];
}
