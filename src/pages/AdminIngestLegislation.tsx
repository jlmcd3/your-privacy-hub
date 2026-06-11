import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Status = "idle" | "running" | "complete" | "error";

const FUNCTIONS = [
  { name: "ingest-legislation-us-states", label: "U.S. State Bills (LegiScan)" },
  { name: "ingest-legislation-us", label: "U.S. Federal Bills (Congress.gov)" },
  { name: "ingest-legislation-all", label: "All Sources (Orchestrator)" },
];

const AdminIngestLegislation = () => {
  const { user, loading } = useAuth();
  const [selected, setSelected] = useState(FUNCTIONS[0].name);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);

  const run = async () => {
    setStatus("running");
    setResult(null);
    setError("");
    const start = Date.now();
    setStartedAt(start);
    const timer = setInterval(() => setElapsed(Date.now() - start), 500);
    try {
      const res = await supabase.functions.invoke(selected, { body: {} });
      if (res.error) throw res.error;
      setResult(res.data);
      setStatus("complete");
    } catch (e: any) {
      setError(e?.message || String(e));
      setStatus("error");
    } finally {
      clearInterval(timer);
      setElapsed(Date.now() - start);
    }
  };

  if (loading) return <div className="p-8">Loading…</div>;
  if (!user) return <div className="p-8">Unauthorized</div>;

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Navbar />
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-display text-foreground mb-2">Admin: Manual Legislation Ingest</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Trigger an ingest edge function on demand. Function logs stream to the Lovable Cloud edge logs;
          this panel shows the JSON envelope returned to the client.
        </p>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-foreground mb-2">Function</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={status === "running"}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            >
              {FUNCTIONS.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.label} — {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={run}
              disabled={status === "running"}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-[13px] disabled:opacity-50"
            >
              {status === "running" ? "Running…" : "Run now"}
            </button>
            {startedAt && (
              <span className="text-[12px] text-muted-foreground">
                Elapsed: {(elapsed / 1000).toFixed(1)}s
              </span>
            )}
            <span
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ml-auto ${
                status === "complete"
                  ? "bg-green-100 text-green-800"
                  : status === "running"
                  ? "bg-amber-100 text-amber-800"
                  : status === "error"
                  ? "bg-red-100 text-red-800"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {status === "complete" ? "✓ Complete" : status === "running" ? "Running…" : status === "error" ? "Error" : "Idle"}
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground italic">
            Edge functions can run up to a few minutes. Don't close this tab while a job is in flight.
          </p>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <h3 className="text-[13px] font-semibold text-red-800 mb-1">Error</h3>
            <pre className="text-[12px] text-red-900 whitespace-pre-wrap break-words">{error}</pre>
          </div>
        )}

        {result && (
          <div className="mt-6 bg-card border border-border rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-foreground mb-2">Response</h3>
            <pre className="text-[12px] text-slate bg-muted/50 rounded-lg p-3 overflow-auto max-h-[500px]">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 text-[12px] text-muted-foreground">
          <p className="mb-1"><strong>Where to see streaming logs:</strong></p>
          <p>
            Full execution logs (per-query bill counts, errors, etc.) are visible in the Lovable Cloud
            edge function log viewer under <code className="bg-muted px-1.5 py-0.5 rounded">{selected}</code>.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AdminIngestLegislation;
