// Admin tool: dispatches the batch-fetch-primary-sources edge function via
// the SECURITY DEFINER RPC admin_fire_batch_fetch_primary_sources. The RPC
// reads ADMIN_SECRET_TOKEN from the vault, so the token never reaches the
// browser. Use dry-run first to see what would be processed.

import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type SourceRow = { source_database: string | null; pending: number };

export default function PrimarySourceFetcher() {
  const [limit, setLimit] = useState(10);
  const [source, setSource] = useState("FTC");
  const [regulator, setRegulator] = useState("");
  const [busy, setBusy] = useState<null | "dry" | "real">(null);
  const [result, setResult] = useState<string>("");
  const [pending, setPending] = useState<SourceRow[]>([]);

  const loadPending = useCallback(async () => {
    const { data, error } = await supabase
      .from("enforcement_actions")
      .select("source_database")
      .eq("primary_source_status", "pending_fetch")
      .not("primary_source_url", "is", null)
      .limit(5000);
    if (error) { setResult(`Error loading pending counts: ${error.message}`); return; }
    const tally = new Map<string, number>();
    for (const r of data ?? []) {
      const k = (r as any).source_database ?? "(unlabeled)";
      tally.set(k, (tally.get(k) ?? 0) + 1);
    }
    setPending(
      Array.from(tally.entries())
        .map(([source_database, pending]) => ({ source_database, pending }))
        .sort((a, b) => b.pending - a.pending),
    );
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  const run = useCallback(async (dryRun: boolean) => {
    setBusy(dryRun ? "dry" : "real");
    setResult(`${dryRun ? "Dry-run" : "Real run"} dispatched…`);
    const { data, error } = await supabase.rpc(
      "admin_fire_batch_fetch_primary_sources" as any,
      {
        p_limit: limit,
        p_dry_run: dryRun,
        p_source: source || null,
        p_regulator: regulator || null,
      },
    );
    if (error) {
      setResult(`Error: ${error.message}`);
    } else {
      setResult(
        `${dryRun ? "Dry-run" : "Real run"} dispatched. request_id=${data}. ` +
        `Tail the batch-fetch-primary-sources logs to see results.`,
      );
    }
    setBusy(null);
    if (!dryRun) await loadPending();
  }, [limit, source, regulator, loadPending]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Helmet>
        <title>Primary Source Fetcher — Admin</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-serif mb-2">Primary source fetcher</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Dispatches <code>batch-fetch-primary-sources</code> for enforcement actions
          marked <code>pending_fetch</code>. Successful fetches reset
          <code> enrichment_version</code> to 0 so they re-enrich with full text.
          Use <em>dry-run</em> first.
        </p>

        <section className="border rounded p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Pending fetch by source</h2>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing pending.</p>
          ) : (
            <table className="text-sm w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-1">source_database</th>
                  <th className="py-1">Pending</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.source_database ?? "null"} className="border-t">
                    <td className="py-1 font-mono">{r.source_database ?? "(unlabeled)"}</td>
                    <td className="py-1 font-mono">{r.pending.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button onClick={loadPending} className="text-xs underline mt-2">Refresh</button>
        </section>

        <section className="border rounded p-4 mb-6 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="limit">Limit (max 50)</Label>
              <Input
                id="limit" type="number" min={1} max={50}
                value={limit}
                onChange={(e) => setLimit(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              />
            </div>
            <div>
              <Label htmlFor="source">source_database</Label>
              <Input
                id="source" placeholder="e.g. FTC"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="regulator">regulator filter</Label>
              <Input
                id="regulator" placeholder="ilike, optional"
                value={regulator}
                onChange={(e) => setRegulator(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={() => run(true)}
            >
              {busy === "dry" ? "Dispatching…" : "Dry-run"}
            </Button>
            <Button
              disabled={busy !== null}
              onClick={() => run(false)}
              className="bg-brand-teal text-white"
            >
              {busy === "real" ? "Dispatching…" : "Run (fetch & extract)"}
            </Button>
          </div>

          {result && <p className="text-sm pt-2">{result}</p>}
        </section>
      </main>
      <Footer />
    </div>
  );
}
