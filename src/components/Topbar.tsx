import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const Topbar = () => {
  const [briefLabel, setBriefLabel] = useState("Week 10 Intelligence Brief now available");
  const [lastUpdate, setLastUpdate] = useState("Today");

  useEffect(() => {
    supabase
      .from("weekly_briefs")
      .select("week_label, headline")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setBriefLabel(`${data[0].week_label} Intelligence Brief now available`);
        }
      });

    supabase
      .from("updates")
      .select("published_at")
      .order("published_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0 && data[0].published_at) {
          try {
            setLastUpdate(formatDistanceToNow(new Date(data[0].published_at), { addSuffix: true }));
          } catch {
            setLastUpdate("Today");
          }
        }
      });
  }, []);

  return (
    <div className="bg-navy text-slate-light text-[11.5px] font-medium tracking-wide py-1.5 border-b border-navy-light hidden md:block">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8 flex justify-between items-center">
        <div className="flex gap-5 items-center">
          <span className="flex items-center gap-1.5 text-accent-light font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-light animate-pulse-dot" />
            Live monitoring: 250+ regulators
          </span>
          <span className="text-navy-light hidden lg:inline">·</span>
          <span className="hidden lg:inline">Last update: {lastUpdate}</span>
          <span className="text-navy-light hidden xl:inline">·</span>
          <a href="#" className="hover:text-sky transition-colors hidden xl:inline">{briefLabel}</a>
        </div>
        <div className="flex gap-4 items-center">
          <a href="#" className="hover:text-sky transition-colors">About</a>
          <a href="#" className="hover:text-sky transition-colors">Contact</a>
          <a href="#" className="hover:text-sky transition-colors">Log In</a>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
