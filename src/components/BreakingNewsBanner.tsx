import { useState } from "react";

const BREAKING_NEWS = {
  id: "bn-001",
  headline: "FTC announces emergency rulemaking on AI data collection practices",
  url: "#",
  active: true,
};

const STORAGE_KEY = `dismissed-${BREAKING_NEWS.id}`;

const BreakingNewsBanner = () => {
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(STORAGE_KEY) === "true"
  );

  if (!BREAKING_NEWS.active || dismissed) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  };

  return (
    <div
      className="w-full flex items-center justify-between px-4 md:px-8"
      style={{
        backgroundColor: "#B91C1C",
        height: 40,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <span
          className="flex-shrink-0 rounded-full"
          style={{ width: 6, height: 6, backgroundColor: "rgba(255,255,255,0.9)" }}
        />
        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white flex-shrink-0">
          Breaking
        </span>
        <span className="text-white opacity-60 flex-shrink-0 text-xs">•</span>
        <a
          href={BREAKING_NEWS.url}
          className="text-white text-[13px] font-medium truncate no-underline hover:underline"
        >
          {BREAKING_NEWS.headline}
        </a>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-white opacity-70 hover:opacity-100 text-[12px] font-medium ml-4 transition-opacity cursor-pointer bg-transparent border-none"
        style={{ fontFamily: "'DM Sans', sans-serif" }}
      >
        Dismiss ×
      </button>
    </div>
  );
};

export default BreakingNewsBanner;
