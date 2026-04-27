/**
 * ADVERTISING POLICY — enduserprivacy.com FRD v2.1 §8.3
 *
 * 1. Ads are shown to ALL users including Intelligence subscribers.
 * 2. Ads served here MUST be contextual and non-behavioural.
 *    No user browsing data from this platform may be used for
 *    ad targeting or shared with ad networks.
 * 3. This component renders a desktop-only (lg+) sticky 300x600
 *    skyscraper rail. On mobile/tablet it returns null.
 */

interface StickyRailAdProps {
  adSlot?: string;
  googleAdClient?: string;
  googleAdSlot?: string;
  className?: string;
  topOffset?: number; // px; default 96
}

import { usePremiumStatus } from "@/hooks/usePremiumStatus";

export default function StickyRailAd({
  adSlot,
  googleAdClient,
  googleAdSlot,
  className = "",
  topOffset = 96,
}: StickyRailAdProps) {
  const { isPremium } = usePremiumStatus();
  if (isPremium) return null;
  return (
    <div className={`hidden lg:block ${className}`}>
      <div
        className="sticky"
        style={{ top: topOffset }}
        data-ad-slot={adSlot}
        aria-label="Advertisement"
      >
        <div
          className="flex items-center justify-center bg-fog/40 border border-silver/60 rounded-xl mx-auto"
          style={{ width: 300, height: 600 }}
        >
          {googleAdClient && googleAdSlot ? (
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: 300, height: 600 }}
              data-ad-client={googleAdClient}
              data-ad-slot={googleAdSlot}
              data-ad-format="auto"
            />
          ) : (
            <span className="text-[10px] uppercase tracking-widest text-slate/60">
              Advertisement
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
