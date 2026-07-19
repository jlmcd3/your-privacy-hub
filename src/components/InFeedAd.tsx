/**
 * InFeedAd — renders between article items in the feed.
 * Same policy as AdBanner: paid subscribers see nothing.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { ADSENSE_CONFIG } from '@/config/ads';
import { getAdRegion } from '@/lib/adRegion';

interface InFeedAdProps {
  /** Legacy props — accepted for backwards compatibility, ignored. */
  adSlot?: string;
  googleAdClient?: string;
  googleAdSlot?: string;
}

export default function InFeedAd(_props: InFeedAdProps = {}) {
  const { isPremium, isLoading } = usePremiumStatus();
  const location = useLocation();
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    if (!ADSENSE_CONFIG.enabled) return;
    if (isPremium) return;
    try {
      if (insRef.current && insRef.current.getAttribute('data-adsbygoogle-status') !== 'done') {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch (_) {}
  }, [location.pathname, isPremium]);

  if (isLoading || isPremium) return null;

  if (!ADSENSE_CONFIG.enabled) {
    return (
      <div
        className="flex items-center justify-center bg-brand-cloud/40 border border-silver/60 rounded-xl my-3"
        style={{ minHeight: 90 }}
        aria-label="Advertisement placeholder"
      >
        <span className="text-meta uppercase tracking-widest text-brand-steel">
          Ad · In-feed
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center my-3"
      aria-label="Advertisement"
    >
      <ins
        ref={insRef as any}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client={ADSENSE_CONFIG.pubId}
        data-ad-slot={ADSENSE_CONFIG.slots.inFeed}
        data-ad-format="fluid"
        data-ad-layout="in-article"
        data-adtest={import.meta.env.DEV ? 'on' : undefined}
      />
    </div>
  );
}
