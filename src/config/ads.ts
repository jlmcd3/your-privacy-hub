/**
 * AdSense configuration — single source of truth for ad keys.
 *
 * Replace the placeholder values once the AdSense account is approved,
 * then flip `enabled` to true to start serving live ads.
 */
export const ADSENSE_CONFIG = {
  // Replace with real Publisher ID when AdSense account is approved.
  // Format: ca-pub-XXXXXXXXXXXXXXXX
  pubId: 'ca-pub-PLACEHOLDER',

  // Replace each value with the real Ad Slot ID from AdSense dashboard.
  slots: {
    leaderboard: 'SLOT_LEADERBOARD',   // 728×90 / responsive banner
    inFeed:      'SLOT_INFEED',        // In-feed / in-article fluid
    rectangle:   'SLOT_RECTANGLE',     // 300×250 rectangle
    stickyRail:  'SLOT_STICKYRAIL',    // 300×600 half-page / skyscraper
  },

  // Flip to true once the AdSense account is approved and keys are real.
  // While false, placeholder boxes are shown instead of live ads.
  enabled: false,
} as const;

export type AdVariant = keyof typeof ADSENSE_CONFIG.slots;
