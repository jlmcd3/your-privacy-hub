/**
 * StickyRailAd — desktop-only (lg+) sticky 300×600 skyscraper.
 * Paid subscribers see no ads.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { ADSENSE_CONFIG } from '@/config/ads';

interface StickyRailAdProps {
  className?: string;
  topOffset?: number;
}

export default function StickyRailAd({ className = '', topOffset = 96 }: StickyRailAdProps) {
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

  return (
    <aside className={`hidden lg:block ${className}`} aria-label="Advertisement">
      <div className="sticky" style={{ top: topOffset }}>
        {ADSENSE_CONFIG.enabled ? (
          <ins
            ref={insRef as any}
            className="adsbygoogle"
            style={{ display: 'block', width: 300, height: 600 }}
            data-ad-client={ADSENSE_CONFIG.pubId}
            data-ad-slot={ADSENSE_CONFIG.slots.stickyRail}
            data-ad-format="auto"
            data-adtest={import.meta.env.DEV ? 'on' : undefined}
          />
        ) : (
          <div
            className="flex items-center justify-center bg-brand-cloud/40 border border-silver/60 rounded-xl"
            style={{ width: 300, height: 600 }}
          >
            <span className="text-meta uppercase tracking-widest text-brand-steel">
              Ad · 300×600
            </span>
          </div>
        )}
      </div>
    </aside>
  );
}
