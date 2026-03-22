import { Link } from "react-router-dom";

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
  const dimensions = {
    leaderboard: { desktop: { w: 728, h: 90 }, mobile: { w: 320, h: 100 } },
    sidebar: { desktop: { w: 300, h: 250 }, mobile: { w: 300, h: 250 } },
    inline: { desktop: { w: 728, h: 90 }, mobile: { w: 320, h: 100 } },
    infeed: { desktop: { w: 728, h: 90 }, mobile: { w: 320, h: 100 } },
  };

  const dim = dimensions[variant];
  const label = variant === "infeed" ? "Sponsored Content" : "Advertisement";

  // House ad fallback — Premium Pro upsell
  if (!googleAdClient || !googleAdSlot) {
    const isLeaderboard = variant === "leaderboard" || variant === "inline";

    return (
      <div className={`flex justify-center items-center py-2 ${className}`}>
        <Link
          to="/subscribe"
          className={`flex items-center justify-between gap-4 px-5 py-3 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 transition-colors no-underline ${
            isLeaderboard ? "flex-row" : "flex-col text-center"
          }`}
          style={{
            width: dim.desktop.w,
            minHeight: dim.desktop.h,
          }}
        >
          <div className={`flex items-center gap-3 ${isLeaderboard ? "" : "justify-center"}`}>
            <span className="text-[18px]">⭐</span>
            <div>
              <div className="text-[12px] font-bold text-amber-900 leading-tight">
                Premium Pro — $20/month
              </div>
              <div className="text-[11px] text-amber-700 leading-tight mt-0.5">
                Personalized AI analyst brief every Monday
              </div>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-amber-800 bg-amber-200 px-3 py-1 rounded-full whitespace-nowrap">
            See Plans →
          </span>
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
