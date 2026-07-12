// /admin/tools — operator toolbox palette. Each button posts a named action
// to admin-toolbox-action, which allowlists the set and logs every call.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminOnly from "@/components/AdminOnly";

type LogRow = {
  id: string;
  created_at: string;
  action: string;
  ok: boolean;
  target_table: string | null;
  target_id: string | null;
  result: Record<string, unknown>;
};

const TOOLS: Array<{ action: string; label: string; description: string }> = [
  { action: "ping", label: "Ping", description: "No-op health check for the palette." },
  { action: "reap_sweep", label: "Reap stuck generations", description: "Invoke reap-stuck-generations." },
];

function ToolsInner() {
  const [log, setLog] = useState<LogRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadLog() {
    const { data } = await supabase
      .from("admin_action_log")
      .select("id, created_at, action, ok, target_table, target_id, result")
      .order("created_at", { ascending: false })
      .limit(25);
    setLog((data as any) ?? []);
  }

  useEffect(() => { loadLog(); }, []);

  async function fire(action: string) {
    setBusy(action);
    setNotice(null);
    const { data, error } = await supabase.functions.invoke("admin-toolbox-action", {
      body: { action },
    });
    setBusy(null);
    if (error) setNotice(`${action} failed: ${error.message}`);
    else setNotice(`${action} → ${JSON.stringify((data as any)?.result).slice(0, 200)}`);
    loadLog();
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin" className="text-sm text-muted-foreground hover:underline">← Console</Link>
        <h1 className="font-serif text-2xl">Toolbox</h1>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map((t) => (
          <div key={t.action} className="rounded-lg border border-border bg-card p-4">
            <div className="font-medium">{t.label}</div>
            <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
            <button
              className="mt-3 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
              disabled={busy === t.action}
              onClick={() => fire(t.action)}
            >
              {busy === t.action ? "Running…" : "Run"}
            </button>
          </div>
        ))}
      </section>

      {notice && <p className="mt-4 rounded-md border border-border bg-card p-2 text-sm">{notice}</p>}

      <h2 className="mt-10 font-serif text-lg">Recent actions</h2>
      <table className="mt-3 w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="py-2">When</th>
            <th>Action</th>
            <th>OK</th>
            <th>Target</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {log.map((r) => (
            <tr key={r.id} className="border-t border-border">
              <td className="py-2 font-mono text-xs">{new Date(r.created_at).toISOString().slice(0, 19)}</td>
              <td>{r.action}</td>
              <td>{r.ok ? "✓" : "✗"}</td>
              <td className="font-mono text-xs">{r.target_table ? `${r.target_table}:${r.target_id?.slice(0, 8)}` : "—"}</td>
              <td className="font-mono text-xs">{JSON.stringify(r.result).slice(0, 80)}</td>
            </tr>
          ))}
          {log.length === 0 && (
            <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No actions yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminTools() {
  return (
    <AdminOnly fallback={<div className="p-10 text-sm text-muted-foreground">Not found.</div>}>
      <ToolsInner />
    </AdminOnly>
  );
}
