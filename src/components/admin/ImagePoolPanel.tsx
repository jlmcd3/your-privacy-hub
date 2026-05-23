import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PoolStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  unsplash: number;
  tile: number;
}

interface PendingPhoto {
  id: string;
  public_url: string;
  category: string | null;
  query: string | null;
  photographer_name: string | null;
}

export default function ImagePoolPanel() {
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [log, setLog] = useState<string>("");
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const refresh = async () => {
    const { data } = await supabase
      .from("article_image_pool")
      .select("source, approval_status");
    const rows = (data as { source: string; approval_status: string }[]) || [];
    setStats({
      total: rows.length,
      approved: rows.filter((r) => r.approval_status === "approved").length,
      pending: rows.filter((r) => r.approval_status === "pending").length,
      rejected: rows.filter((r) => r.approval_status === "rejected").length,
      unsplash: rows.filter((r) => r.source === "unsplash").length,
      tile: rows.filter((r) => r.source === "eup-tile").length,
    });
  };

  const loadPending = async () => {
    setLoadingPending(true);
    const { data } = await supabase
      .from("article_image_pool")
      .select("id, public_url, category, query, photographer_name")
      .eq("approval_status", "pending")
      .order("created_at", { ascending: false })
      .limit(60);
    setPending((data as PendingPhoto[]) || []);
    setLoadingPending(false);
  };

  useEffect(() => {
    refresh();
    loadPending();
  }, []);

  const setStatus = async (id: string, status: "approved" | "rejected") => {
    setPending((p) => p.filter((x) => x.id !== id));
    await supabase.from("article_image_pool").update({ approval_status: status }).eq("id", id);
    refresh();
  };

  const bulkApprove = async () => {
    if (!pending.length) return;
    const ids = pending.map((p) => p.id);
    setPending([]);
    await supabase.from("article_image_pool").update({ approval_status: "approved" }).in("id", ids);
    refresh();
  };

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
      if (fn === "curate-unsplash-images") loadPending();
    }
  };

  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-display text-foreground">Article Image Pool</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Curate photos, then approve or reject before they're assigned to articles.
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          {stats ? (
            <>
              <div><span className="font-semibold text-foreground">{stats.total}</span> total</div>
              <div>{stats.approved} approved · {stats.pending} pending · {stats.rejected} rejected</div>
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
          {busy === "assign-fallback-images" ? "Assigning…" : "Assign approved images to articles"}
        </button>
        <button
          onClick={loadPending}
          disabled={loadingPending}
          className="px-3 py-2 text-sm font-medium rounded-md border border-border hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
        >
          {loadingPending ? "Loading…" : "Refresh pending"}
        </button>
        {pending.length > 0 && (
          <button
            onClick={bulkApprove}
            className="px-3 py-2 text-sm font-medium rounded-md border border-border hover:border-primary/40 hover:bg-primary/5"
          >
            Approve all visible
          </button>
        )}
      </div>

      {pending.length > 0 && (
        <div className="mt-5">
          <div className="text-xs text-muted-foreground mb-2">
            Review queue ({pending.length} shown). Only approved images get assigned to articles.
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {pending.map((p) => (
              <div key={p.id} className="rounded-md border border-border overflow-hidden bg-muted/20">
                <div className="aspect-[16/10] bg-muted">
                  <img
                    src={p.public_url}
                    alt={p.query || "pending"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-2">
                  <div className="text-[11px] text-muted-foreground truncate">
                    {p.category} · {p.query}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mb-2">
                    © {p.photographer_name || "Unsplash"}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setStatus(p.id, "approved")}
                      className="flex-1 text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => setStatus(p.id, "rejected")}
                      className="flex-1 text-xs px-2 py-1 rounded border border-border hover:border-destructive/40 hover:text-destructive"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {log && (
        <pre className="mt-3 text-[11px] bg-muted/40 border border-border rounded-md p-3 max-h-64 overflow-auto whitespace-pre-wrap">
          {log}
        </pre>
      )}
    </div>
  );
}
