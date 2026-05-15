/**
 * AdSense configuration — single source of truth for ad keys.
 *
 * Replace the placeholder values once the AdSense account is approved,
 * then flip `enabled` to true to start serving live ads.
 */
export const ADSENSE_CONFIG = {
  // Real Publisher ID (AdSense approved).
  pubId: 'ca-pub-7713080064663325',

  // AdSense currently has one responsive auto unit ("EUP Ads" — slot 8166125586).
  // Reusing it for every placement is allowed for responsive auto units;
  // replace individual values once dedicated slots are created in AdSense.
  slots: {
    leaderboard: '8166125586',
    inFeed:      '8166125586',
    rectangle:   '8166125586',
    stickyRail:  '8166125586',
  },

  // Live ads enabled.
  enabled: true,
} as const;

export type AdVariant = keyof typeof ADSENSE_CONFIG.slots;
