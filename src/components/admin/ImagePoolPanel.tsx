import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PoolStats {
  total: number;
  unsplash: number;
  tile: number;
}

export default function ImagePoolPanel() {
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string>("");

  const refresh = async () => {
    const { data } = await supabase
      .from("article_image_pool")
      .select("source");
    const rows = (data as { source: string }[]) || [];
    setStats({
      total: rows.length,
      unsplash: rows.filter((r) => r.source === "unsplash").length,
      tile: rows.filter((r) => r.source === "eup-tile").length,
    });
  };

  useEffect(() => { refresh(); }, []);

  const run = async (fn: "curate-unsplash-images" | "assign-fallback-images", body: any = {}) => {
    setBusy(fn);
    setLog(`Running ${fn}…`);
    const { data, error } = await supabase.functions.invoke(fn, { body });
    setBusy(null);
    if (error) {
      setLog(`Error: ${error.message}`);
    } else {
      setLog(JSON.stringify(data, null, 2));
      refresh();
    }
  };

  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-display text-[18px] text-foreground">Article Image Pool</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Curated photos + EUP brand tile that fill in when an article has no image of its own.
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {stats ? (
            <>
              <div><span className="font-semibold text-foreground">{stats.total}</span> total</div>
              <div>{stats.unsplash} Unsplash · {stats.tile} brand tile</div>
            </>
          ) : "Loading…"}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => run("curate-unsplash-images", { perQuery: 14 })}
          disabled={busy !== null}
          className="px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy === "curate-unsplash-images" ? "Curating…" : "Curate Unsplash images"}
        </button>
        <button
          onClick={() => run("assign-fallback-images", { limit: 2000 })}
          disabled={busy !== null}
          className="px-3 py-2 text-sm font-medium rounded-md border border-border hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
        >
          {busy === "assign-fallback-images" ? "Assigning…" : "Assign fallback images to articles"}
        </button>
      </div>
      {log && (
        <pre className="mt-3 text-[11px] bg-muted/40 border border-border rounded-md p-3 max-h-64 overflow-auto whitespace-pre-wrap">
          {log}
        </pre>
      )}
    </div>
  );
}
