import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FreshnessRow {
  page_slug: string;
  feed_category: string;
  page_last_updated: string | null;
  new_articles_count: number;
  top_headlines: { title: string; url: string; published_at?: string }[];
  flagged: boolean;
  checked_at: string;
}

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ResearchFreshnessPanel() {
  const [rows, setRows] = useState<FreshnessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("research_freshness_flags")
      .select("page_slug, feed_category, page_last_updated, new_articles_count, top_headlines, flagged, checked_at")
      .order("flagged", { ascending: false })
      .order("new_articles_count", { ascending: false });
    setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runNow = async () => {
    setRunning(true);
    try {
      await supabase.functions.invoke("check-research-freshness", { body: {} });
      await load();
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="mb-8 rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Research freshness</h2>
          <p className="text-[11px] text-muted-foreground">
            Volume-based (v1): flags a page when ≥8 high-attention articles have published since its last review.
          </p>
        </div>
        <button
          onClick={runNow}
          disabled={running}
          className="text-[11px] font-semibold px-3 py-1.5 rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50"
        >
          {running ? "Running…" : "Run check now"}
        </button>
      </header>
      {loading ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground">No data yet — click "Run check now".</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2 font-semibold">Page</th>
                <th className="px-3 py-2 font-semibold">Page updated</th>
                <th className="px-3 py-2 font-semibold text-right">New (high-attn)</th>
                <th className="px-3 py-2 font-semibold">Top headlines since review</th>
                <th className="px-3 py-2 font-semibold">Checked</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.page_slug} className="border-t border-border align-top">
                  <td className="px-3 py-2 font-mono whitespace-nowrap">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${r.flagged ? "bg-red-500" : "bg-emerald-500"}`}
                        title={r.flagged ? "Flagged" : "OK"}
                      />
                      {r.page_slug}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {r.page_last_updated || "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">{r.new_articles_count}</td>
                  <td className="px-3 py-2">
                    {Array.isArray(r.top_headlines) && r.top_headlines.length > 0 ? (
                      <ul className="space-y-1">
                        {r.top_headlines.slice(0, 3).map((h, i) => (
                          <li key={i}>
                            <a
                              href={h.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {h.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{fmt(r.checked_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
