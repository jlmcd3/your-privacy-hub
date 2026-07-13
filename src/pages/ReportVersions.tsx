// RC-A A2 — /reports/versions/:tool/:id
// Read-only list + JSON viewer for prior report snapshots.
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  version_n: number;
  created_at: string;
  report_data: unknown;
  open_items_snapshot: unknown;
};

export default function ReportVersions() {
  const { tool, id } = useParams<{ tool: string; id: string }>();
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Row | null>(null);

  useEffect(() => {
    (async () => {
      if (!tool || !id) return;
      const { data, error } = await (supabase as any)
        .from("report_versions")
        .select("id, version_n, created_at, report_data, open_items_snapshot")
        .eq("tool_type", tool)
        .eq("assessment_id", id)
        .order("version_n", { ascending: false });
      if (error) setErr(error.message);
      else setRows((data as Row[]) ?? []);
    })();
  }, [tool, id]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 space-y-6">
      <header>
        <h1 className="font-serif text-3xl text-brand-navy">Report versions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tool} · {id}
        </p>
      </header>
      {err && <div className="rounded border border-red-300 bg-red-50 p-3 text-red-800 text-sm">{err}</div>}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-semibold text-brand-navy mb-3">
          {rows.length === 0 ? "No prior versions on file." : `${rows.length} prior version${rows.length === 1 ? "" : "s"}`}
        </div>
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id} className="py-2 flex items-center justify-between">
              <div className="text-sm">
                <span className="font-semibold">v{r.version_n}</span>{" "}
                <span className="text-muted-foreground">— {r.created_at.replace("T", " ").slice(0, 19)}</span>
              </div>
              <button
                className="text-xs underline text-brand-navy"
                onClick={() => setSelected(r)}
              >
                View
              </button>
            </li>
          ))}
        </ul>
      </section>
      {selected && (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-brand-navy">v{selected.version_n} (read-only)</div>
            <button className="text-xs underline" onClick={() => setSelected(null)}>close</button>
          </div>
          <pre className="text-xs overflow-auto max-h-[70vh] whitespace-pre-wrap">
            {JSON.stringify(selected.report_data, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}
