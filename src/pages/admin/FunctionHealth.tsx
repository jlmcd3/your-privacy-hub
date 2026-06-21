import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface FunctionRunRow {
  id: string;
  function_name: string;
  archetype: string | null;
  trust_class: string | null;
  user_id: string | null;
  invoked_by: string | null;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  source_table: string | null;
  source_row_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
}

function fmtDuration(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function statusColor(status: string): string {
  switch (status) {
    case "success": return "bg-green-500/15 text-green-400 border border-green-500/30";
    case "error": return "bg-red-500/15 text-red-400 border border-red-500/30";
    case "running": return "bg-amber-500/15 text-amber-400 border border-amber-500/30";
    case "partial": return "bg-gray-500/15 text-gray-400 border border-gray-500/30";
    default: return "bg-gray-500/15 text-gray-400 border border-gray-500/30";
  }
}

export default function FunctionHealth() {
  const [rows, setRows] = useState<FunctionRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("function_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(200);
    if (err) {
      setError(err.message);
      setRows([]);
    } else {
      setRows((data ?? []) as FunctionRunRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group latest run per function_name (rows already ordered desc by started_at)
  const summary = useMemo(() => {
    const seen = new Map<string, FunctionRunRow>();
    for (const r of rows) {
      if (!seen.has(r.function_name)) seen.set(r.function_name, r);
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.function_name.localeCompare(b.function_name),
    );
  }, [rows]);

  const recent = useMemo(() => rows.slice(0, 50), [rows]);

  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif text-white">Function Health</h1>
            <p className="text-sm text-gray-600 mt-1">
              Per-invocation telemetry from <code className="text-xs">function_runs</code>.
            </p>
          </div>
          <Button onClick={load} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Health Summary */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-3">Health summary</h2>
          {summary.length === 0 && !loading ? (
            <div className="text-sm text-gray-600">No runs recorded yet.</div>
          ) : (
            <div className="overflow-x-auto rounded border border-gray-800">
              <table className="w-full text-sm text-black">
                <thead className="bg-gray-100 text-black">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Function</th>
                    <th className="text-left px-3 py-2 font-medium">Latest status</th>
                    <th className="text-left px-3 py-2 font-medium">Last started</th>
                    <th className="text-left px-3 py-2 font-medium">Last duration</th>
                    <th className="text-left px-3 py-2 font-medium">Last error</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((r) => (
                    <tr key={r.function_name} className="border-t border-gray-800">
                      <td className="px-3 py-2 text-black font-mono text-xs">{r.function_name}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${statusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-black">{fmtTime(r.started_at)}</td>
                      <td className="px-3 py-2 text-black">{fmtDuration(r.duration_ms)}</td>
                      <td className="px-3 py-2 text-red-600 text-xs max-w-md truncate" title={r.error_message ?? ""}>
                        {r.status === "error" ? (r.error_message ?? "—") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent runs */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Recent runs ({recent.length})</h2>
          <div className="overflow-x-auto rounded border border-gray-800">
            <table className="w-full text-sm text-black">
              <thead className="bg-gray-100 text-black">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Function</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Started</th>
                  <th className="text-left px-3 py-2 font-medium">Duration</th>
                  <th className="text-left px-3 py-2 font-medium">Invoked by</th>
                  <th className="text-left px-3 py-2 font-medium">Source row</th>
                  <th className="text-left px-3 py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.id} className="border-t border-gray-800">
                    <td className="px-3 py-2 text-black font-mono text-xs">{r.function_name}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColor(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-black">{fmtTime(r.started_at)}</td>
                    <td className="px-3 py-2 text-black">{fmtDuration(r.duration_ms)}</td>
                    <td className="px-3 py-2 text-black text-xs">{r.invoked_by ?? "—"}</td>
                    <td className="px-3 py-2 text-black font-mono text-xs">
                      {r.source_row_id ? r.source_row_id.slice(0, 8) : "—"}
                    </td>
                    <td className="px-3 py-2 text-red-600 text-xs max-w-xs truncate" title={r.error_message ?? ""}>
                      {r.error_message ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
