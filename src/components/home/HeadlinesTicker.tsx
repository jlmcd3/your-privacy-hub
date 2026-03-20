import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface TickerItem {
  id: string;
  title: string;
  category: string;
  url: string;
}

export default function HeadlinesTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    supabase
      .from("updates")
      .select("id, title, category, url")
      .order("published_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setItems(data as TickerItem[]);
      });
  }, []);

  if (items.length === 0) return null;

  const CATEGORY_LABELS: Record<string, string> = {
    "enforcement": "ENFORCEMENT",
    "eu-uk": "EU & UK",
    "us-federal": "US FEDERAL",
    "us-states": "US STATES",
    "ai-privacy": "AI & PRIVACY",
    "global": "GLOBAL",
  };

  return (
    <div className="bg-navy border-b border-white/10">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8">
        <div className="flex items-stretch">

          {/* "Latest" label */}
          <div className="flex items-center flex-shrink-0 pr-4 border-r border-white/15 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-accent-light">
              Latest
            </span>
          </div>

          {/* Headlines — horizontal scroll on mobile, truncated on desktop */}
          <div
            className="flex items-center gap-0 overflow-x-auto scrollbar-hide flex-1 group/ticker"
            style={{ scrollBehavior: "smooth" }}
          >
            {items.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-5 py-2.5 border-r border-white/10 flex-shrink-0 no-underline group hover:bg-white/5 transition-colors"
              >
                <span className="text-[9px] font-bold uppercase tracking-wider text-accent-light/70 flex-shrink-0">
                  {CATEGORY_LABELS[item.category] ?? item.category.toUpperCase()}
                </span>
                <span className="text-[12px] text-white/80 group-hover:text-white transition-colors max-w-[220px] truncate whitespace-nowrap">
                  {item.title}
                </span>
              </a>
            ))}
          </div>

          {/* "All updates" link */}
          <div className="flex items-center flex-shrink-0 pl-4 border-l border-white/10 py-2.5">
            <Link
              to="/updates"
              className="text-[11px] font-semibold text-sky hover:text-white transition-colors no-underline whitespace-nowrap"
            >
              All updates →
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
