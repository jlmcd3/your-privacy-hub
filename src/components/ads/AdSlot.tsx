// AdSlot — reserved-dimension in-content ad unit. Renders null unless
// useAdEligibility() is true. Loads the adsbygoogle script lazily on
// first eligible render, sets requestNonPersonalizedAds = 1 before any
// request, and shows a visible caption + registration nudge.
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAdEligibility } from "@/hooks/useAdEligibility";
import { ADSENSE_CLIENT, NON_PERSONALIZED_ONLY } from "@/config/ads";

type AdFormat = "in-content" | "leaderboard";

interface AdSlotProps {
  format?: AdFormat;
  slot?: string;
  className?: string;
}

let scriptLoaded = false;

function loadAdsScript() {
  if (scriptLoaded) return;
  if (typeof document === "undefined") return;
  const existing = document.querySelector<HTMLScriptElement>(
    'script[data-eup-adsbygoogle="1"]',
  );
  if (existing) {
    scriptLoaded = true;
    return;
  }
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.setAttribute("data-eup-adsbygoogle", "1");
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  document.head.appendChild(s);
  scriptLoaded = true;
}

export default function AdSlot({
  format = "in-content",
  slot,
  className,
}: AdSlotProps) {
  const eligible = useAdEligibility();
  const pushedRef = useRef(false);
  const width = format === "leaderboard" ? 728 : 336;
  const height = format === "leaderboard" ? 90 : 280;

  useEffect(() => {
    if (!eligible) return;
    loadAdsScript();
    if (pushedRef.current) return;
    try {
      const w = window as unknown as {
        adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number };
      };
      w.adsbygoogle = w.adsbygoogle || [];
      if (NON_PERSONALIZED_ONLY) {
        (w.adsbygoogle as { requestNonPersonalizedAds?: number }).requestNonPersonalizedAds = 1;
      }
      (w.adsbygoogle as unknown[]).push({});
      pushedRef.current = true;
    } catch {
      // fail-closed silently
    }
  }, [eligible]);

  if (!eligible) return null;

  return (
    <div
      className={`my-8 flex flex-col items-center ${className ?? ""}`}
      aria-label="Advertisement"
    >
      <div
        className="w-full flex items-center justify-between max-w-full mb-1"
        style={{ maxWidth: width }}
      >
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Advertisement
        </span>
        <Link
          to="/signup"
          className="text-[11px] text-brand-teal hover:underline no-underline"
        >
          Create a free account to browse ad-free.
        </Link>
      </div>
      <ins
        className="adsbygoogle block"
        style={{ display: "block", width, height }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot ?? ""}
        data-ad-format={format === "leaderboard" ? "horizontal" : "rectangle"}
        data-full-width-responsive="false"
      />
    </div>
  );
}
