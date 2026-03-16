interface AdBannerProps {
  /** "leaderboard" = 728x90 (desktop) / 320x100 (mobile), "sidebar" = 300x250, "inline" = 728x90 mid-content */
  variant?: "leaderboard" | "sidebar" | "inline";
  className?: string;
  /** Pass an ad slot/unit ID to render the banner. If omitted, nothing renders. */
  adSlot?: string;
}

const dimensions = {
  leaderboard: { desktop: { w: 728, h: 90 }, mobile: { w: 320, h: 100 } },
  sidebar: { desktop: { w: 300, h: 250 }, mobile: { w: 300, h: 250 } },
  inline: { desktop: { w: 728, h: 90 }, mobile: { w: 320, h: 100 } },
};

const AdBanner = ({ variant = "leaderboard", className = "" }: AdBannerProps) => {
  const dim = dimensions[variant];

  return (
    <div className={`flex justify-center ${className}`}>
      {/* Desktop ad */}
      <div
        className="hidden md:flex items-center justify-center bg-fog/60 border border-silver rounded-lg text-slate text-[11px] tracking-wider uppercase font-medium"
        style={{ width: dim.desktop.w, height: dim.desktop.h }}
        data-ad-slot={`eup-${variant}-desktop`}
      >
        <span className="opacity-50">Advertisement</span>
      </div>
      {/* Mobile ad */}
      <div
        className="flex md:hidden items-center justify-center bg-fog/60 border border-silver rounded-lg text-slate text-[11px] tracking-wider uppercase font-medium"
        style={{ width: dim.mobile.w, height: dim.mobile.h }}
        data-ad-slot={`eup-${variant}-mobile`}
      >
        <span className="opacity-50">Advertisement</span>
      </div>
    </div>
  );
};

export default AdBanner;
