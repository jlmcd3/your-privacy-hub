import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const Topbar = () => {
  const [briefLabel, setBriefLabel] = useState("Latest Intelligence Brief now available");
  const [lastUpdate, setLastUpdate] = useState("Today");

  useEffect(() => {
    supabase
      .from("weekly_briefs")
      .select("published_at")
      .order("published_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0 && data[0].published_at) {
          const published = new Date(data[0].published_at);
          if (isNaN(published.getTime())) return;
          const start = new Date(published);
          start.setDate(published.getDate() - 6);
          const sameMonth = start.getMonth() === published.getMonth() && start.getFullYear() === published.getFullYear();
          const startFmt = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const endFmt = published.toLocaleDateString("en-US", sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
          setBriefLabel(`Latest Intelligence Brief: ${startFmt}–${endFmt}`);
        }
      });

    supabase
      .from("updates")
      .select("published_at")
      .eq("is_hidden", false)
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
    <div className="bg-brand-navy text-brand-mist text-meta tracking-wide py-1.5 border-b border-brand-slate-teal hidden md:block">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex gap-5 items-center">
          <span className="text-brand-slate-teal hidden lg:inline">·</span>
          <Link to="/updates" className="hidden lg:inline hover:text-brand-mist transition-colors no-underline text-brand-mist">
            Last update: {lastUpdate}
          </Link>
          <span className="text-brand-slate-teal hidden xl:inline">·</span>
          <Link to="/dashboard" className="hover:text-brand-mist transition-colors hidden xl:inline no-underline text-brand-mist">{briefLabel}</Link>
        </div>
        <div className="flex gap-4 items-center">
          <Link to="/about" className="hover:text-brand-mist transition-colors no-underline text-brand-mist">About</Link>
          <Link to="/contact" className="hover:text-brand-mist transition-colors no-underline text-brand-mist">Contact</Link>
          <Link to="/login" className="hover:text-brand-mist transition-colors no-underline text-brand-mist">Log In</Link>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
