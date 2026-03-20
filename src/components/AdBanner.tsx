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
  // Don't render placeholder when no real ad content is configured
  if (!googleAdClient || !googleAdSlot) return null;

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
