import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const BreakingNewsBanner = () => {
  const [news, setNews] = useState<{ headline: string; url: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase
      .from("updates")
      .select("title, url")
      .eq("category", "enforcement")
      .order("published_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setNews({ headline: data[0].title, url: data[0].url });
        }
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    if (!news) return;
    const key = `dismissed-breaking-${news.headline.slice(0, 20)}`;
    if (sessionStorage.getItem(key) === "true") setDismissed(true);
  }, [news]);

  if (!loaded || !news || dismissed) return null;

  const handleDismiss = () => {
    const key = `dismissed-breaking-${news.headline.slice(0, 20)}`;
    sessionStorage.setItem(key, "true");
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
          href={news.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-white text-[13px] font-medium no-underline hover:underline break-words"
        >
          {news.headline}
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
