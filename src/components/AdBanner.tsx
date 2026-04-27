/**
 * ADVERTISING POLICY — enduserprivacy.com FRD v2.1 §8.3
 *
 * 1. Ads are shown to free and unregistered users only. Intelligence (Pro) subscribers see no ads.
 * 2. All ads served here MUST be contextual and non-behavioural.
 *    No user browsing data from this platform may be used for
 *    ad targeting or shared with ad networks.
 * 3. When no Google Ad config is provided, a labeled placeholder
 *    is shown so the slot is visible during development.
 */
import { usePremiumStatus } from "@/hooks/usePremiumStatus";

interface AdBannerProps {
  variant?: "leaderboard" | "sidebar" | "inline" | "infeed";
  className?: string;
  adSlot?: string;
  googleAdClient?: string;
  googleAdSlot?: string;
}

const AdBanner = ({
  variant = "leaderboard",
  className = "",
  adSlot,
  googleAdClient,
  googleAdSlot,
}: AdBannerProps) => {
  const { isPremium } = usePremiumStatus();
  if (isPremium) return null;

  const dimensions = {
    leaderboard: { desktop: { w: 728, h: 90 }, mobile: { w: 320, h: 100 } },
    sidebar: { desktop: { w: 300, h: 250 }, mobile: { w: 300, h: 250 } },
    inline: { desktop: { w: 728, h: 90 }, mobile: { w: 320, h: 100 } },
    infeed: { desktop: { w: 728, h: 90 }, mobile: { w: 320, h: 100 } },
  };

  const dim = dimensions[variant];
  const label = variant === "infeed" ? "Sponsored Content" : "Advertisement";

  return (
    <div
      className={`flex justify-center items-center ${className}`}
      data-ad-slot={adSlot}
      aria-label={label}
    >
      {/* Desktop */}
      <div
        className="hidden md:flex items-center justify-center bg-fog/40 border border-silver/60 rounded-lg"
        style={{ width: dim.desktop.w, height: dim.desktop.h, minHeight: dim.desktop.h }}
      >
        {googleAdClient && googleAdSlot ? (
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: dim.desktop.w, height: dim.desktop.h }}
            data-ad-client={googleAdClient}
            data-ad-slot={googleAdSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          <span className="text-[10px] uppercase tracking-widest text-slate/60">{label}</span>
        )}
      </div>
      {/* Mobile */}
      <div
        className="flex md:hidden items-center justify-center bg-fog/40 border border-silver/60 rounded-lg"
        style={{ width: dim.mobile.w, height: dim.mobile.h, minHeight: dim.mobile.h }}
      >
        {googleAdClient && googleAdSlot ? (
          <ins
            className="adsbygoogle"
            style={{ display: "block", width: dim.mobile.w, height: dim.mobile.h }}
            data-ad-client={googleAdClient}
            data-ad-slot={googleAdSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          <span className="text-[10px] uppercase tracking-widest text-slate/60">{label}</span>
        )}
      </div>
    </div>
  );
};

export default AdBanner;
