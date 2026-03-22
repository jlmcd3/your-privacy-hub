import { Link } from "react-router-dom";

interface AdBannerProps {
  variant?: "leaderboard" | "sidebar" | "inline" | "infeed";
  className?: string;
  adSlot?: string;
  googleAdClient?: string;
  googleAdSlot?: string;
}

const houseAds = [
  {
    headline: "Get the Weekly Privacy Brief — Free",
    cta: "Subscribe now →",
    link: "/subscribe",
  },
  {
    headline: "Track 119 regulators across 150+ jurisdictions",
    cta: "Browse free →",
    link: "/enforcement-tracker",
  },
  {
    headline: "Compare US state privacy laws side by side",
    cta: "View comparison →",
    link: "/us-state-comparison",
  },
];

const AdBanner = ({
  variant = "leaderboard",
  className = "",
  adSlot,
  googleAdClient,
  googleAdSlot,
}: AdBannerProps) => {
  const dimensions = {
    leaderboard: { desktop: { w: 728, h: 90 }, mobile: { w: 320, h: 100 } },
    sidebar: { desktop: { w: 300, h: 250 }, mobile: { w: 300, h: 250 } },
    inline: { desktop: { w: 728, h: 90 }, mobile: { w: 320, h: 100 } },
    infeed: { desktop: { w: 728, h: 90 }, mobile: { w: 320, h: 100 } },
  };

  const dim = dimensions[variant];
  const label = variant === "infeed" ? "Sponsored Content" : "Advertisement";

  // House ad fallback when no Google Ads configured
  if (!googleAdClient || !googleAdSlot) {
    const ad = houseAds[Math.floor(Math.random() * houseAds.length)];
    const isWide = variant === "leaderboard" || variant === "inline" || variant === "infeed";

    return (
      <div className={`flex justify-center items-center ${className}`} aria-label={label}>
        {/* Desktop */}
        <Link
          to={ad.link}
          className="hidden md:flex items-center justify-center gap-3 bg-gradient-to-r from-navy/5 to-sky/10 border border-sky/20 rounded-lg no-underline hover:border-sky/40 transition-colors"
          style={{ width: dim.desktop.w, height: dim.desktop.h }}
        >
          <span className={`font-medium text-foreground ${isWide ? "text-sm" : "text-xs text-center px-4"}`}>
            {ad.headline}
          </span>
          <span className={`font-semibold text-sky ${isWide ? "text-sm" : "text-xs"}`}>
            {ad.cta}
          </span>
        </Link>
        {/* Mobile */}
        <Link
          to={ad.link}
          className="flex md:hidden flex-col items-center justify-center gap-1.5 bg-gradient-to-r from-navy/5 to-sky/10 border border-sky/20 rounded-lg no-underline hover:border-sky/40 transition-colors px-4"
          style={{ width: dim.mobile.w, height: dim.mobile.h }}
        >
          <span className="font-medium text-foreground text-xs text-center">{ad.headline}</span>
          <span className="font-semibold text-sky text-xs">{ad.cta}</span>
        </Link>
      </div>
    );
  }

  return (
    <div
      className={`flex justify-center items-center ${className}`}
      data-ad-slot={adSlot}
      aria-label={label}
    >
      {/* Desktop */}
      <div
        className="hidden md:flex items-center justify-center bg-fog/70 border border-silver rounded-lg"
        style={{ width: dim.desktop.w, height: dim.desktop.h, minHeight: dim.desktop.h }}
      >
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: dim.desktop.w, height: dim.desktop.h }}
          data-ad-client={googleAdClient}
          data-ad-slot={googleAdSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
      {/* Mobile */}
      <div
        className="flex md:hidden items-center justify-center bg-fog/70 border border-silver rounded-lg"
        style={{ width: dim.mobile.w, height: dim.mobile.h, minHeight: dim.mobile.h }}
      >
        <ins
          className="adsbygoogle"
          style={{ display: "block", width: dim.mobile.w, height: dim.mobile.h }}
          data-ad-client={googleAdClient}
          data-ad-slot={googleAdSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
};

export default AdBanner;
