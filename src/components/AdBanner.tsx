/**
 * AdBanner — contextual, non-personalized Google AdSense unit.
 *
 * ADVERTISING POLICY — enduserprivacy.com
 * 1. Ads are shown to anonymous and free registered users only.
 *    Any paid subscriber (monthly, annual) sees NO ads.
 * 2. All ads are non-personalized and contextual only.
 *    No user data from this platform is used for ad targeting.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { ADSENSE_CONFIG, type AdVariant } from '@/config/ads';
import { getAdRegion } from '@/lib/adRegion';

const DIMENSIONS: Record<AdVariant, { w: number; h: number }> = {
  leaderboard: { w: 728, h: 90 },
  inFeed:      { w: 728, h: 90 },
  rectangle:   { w: 300, h: 250 },
  stickyRail:  { w: 300, h: 600 },
};

// Map legacy variant names to canonical AdVariants so existing callsites
// (variant="inline" | "sidebar" | etc.) keep working.
const VARIANT_ALIAS: Record<string, AdVariant> = {
  leaderboard: 'leaderboard',
  inFeed: 'inFeed',
  infeed: 'inFeed',
  inline: 'inFeed',
  rectangle: 'rectangle',
  sidebar: 'rectangle',
  stickyRail: 'stickyRail',
  skyscraper: 'stickyRail',
};

interface AdBannerProps {
  variant?: AdVariant | 'inline' | 'sidebar' | 'skyscraper' | string;
  className?: string;
  /** Legacy props — accepted for backwards compatibility, ignored. */
  adSlot?: string;
  googleAdClient?: string;
  googleAdSlot?: string;
}

export default function AdBanner({ variant = 'leaderboard', className = '' }: AdBannerProps) {
  const resolvedVariant: AdVariant = VARIANT_ALIAS[variant] ?? 'leaderboard';
  const { isPremium, isLoading } = usePremiumStatus();
  const location = useLocation();
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    if (!ADSENSE_CONFIG.enabled) return;
    if (isPremium) return;
    // Belt-and-braces: never touch the AdSense queue in excluded regions
    // (EEA/UK/CH) even if ADSENSE_CONFIG.enabled flips true before a CMP ships.
    if (getAdRegion() === 'excluded') return;
    try {
      if (insRef.current && insRef.current.getAttribute('data-adsbygoogle-status') !== 'done') {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (_) {
      // Ad blocker present — fail silently.
    }
  }, [location.pathname, isPremium]);

  // Don't flash an ad slot while auth is resolving.
  if (isLoading) return null;
  // Paid subscribers never see ads.
  if (isPremium) return null;
  // Region-excluded users never see any ad chrome — no placeholder either.
  if (getAdRegion() === 'excluded') return null;

  const { w, h } = DIMENSIONS[resolvedVariant];
  const slot = ADSENSE_CONFIG.slots[resolvedVariant];

  if (!ADSENSE_CONFIG.enabled) {
    return (
      <div
        className={`flex items-center justify-center bg-brand-cloud/40 border border-silver/60 rounded-xl my-3 ${className}`}
        style={{ minHeight: h, maxWidth: w, marginLeft: 'auto', marginRight: 'auto' }}
        aria-label="Advertisement placeholder"
      >
        <span className="text-meta uppercase tracking-widest text-brand-steel">
          Ad · {w}×{h}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center my-3 ${className}`}
      style={{ maxWidth: w, marginLeft: 'auto', marginRight: 'auto' }}
      aria-label="Advertisement"
    >
      <ins
        ref={insRef as any}
        className="adsbygoogle"
        style={{ display: 'block', width: w, height: h }}
        data-ad-client={ADSENSE_CONFIG.pubId}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        data-adtest={import.meta.env.DEV ? 'on' : undefined}
      />
    </div>
  );
}
