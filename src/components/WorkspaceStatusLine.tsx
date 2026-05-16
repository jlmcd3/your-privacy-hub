import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function WorkspaceStatusLine() {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    Promise.all([
      (supabase as any)
        .from("custom_briefs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      (supabase as any)
        .from("user_watchlist")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      (supabase as any)
        .from("custom_briefs")
        .select("week_label, generated_at")
        .eq("user_id", user.id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
      .then(([reportRes, watchlistRes, latestRes]: any[]) => {
        const reportCount = reportRes?.count ?? 0;
        const watchCount = watchlistRes?.count ?? 0;
        const weekLabel = latestRes?.data?.week_label ?? null;

        const parts: string[] = [];
        if (weekLabel) parts.push(weekLabel);
        if (reportCount > 0)
          parts.push(`${reportCount} report${reportCount !== 1 ? "s" : ""}`);
        if (watchCount > 0)
          parts.push(
            `watching ${watchCount} item${watchCount !== 1 ? "s" : ""}`,
          );

        setStatus(parts.length > 0 ? parts.join(" · ") : null);
      })
      .catch(() => setStatus(null));
  }, [user]);

  if (!status) return null;

  return <p className="text-sm text-slate-500">{status}</p>;
}

export default WorkspaceStatusLine;
