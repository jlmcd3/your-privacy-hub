// RC-A A7 — /admin/spend
// Per-product daily totals + per-run drill-down from api_usage.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminOnly from "@/components/AdminOnly";

type Row = {
  id: string;
  function_name: string;
  product: string | null;
  model: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cache_read_tokens: number | null;
  cache_creation_tokens: number | null;
  duration_ms: number | null;
  source_row_id: string | null;
  created_at: string;
};

function AdminSpendInner() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [drill, setDrill] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("api_usage")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) setErr(error.message);
      else setRows((data as Row[]) ?? []);
    })();
  }, []);

  const dailyByProduct = useMemo(() => {
    const m = new Map<string, { input: number; output: number; cache_read: number; cache_creation: number; calls: number }>();
    for (const r of rows) {
      const day = (r.created_at ?? "").slice(0, 10);
      const key = `${day}::${r.product ?? "(unspecified)"}`;
      const cur = m.get(key) ?? { input: 0, output: 0, cache_read: 0, cache_creation: 0, calls: 0 };
      cur.input += r.input_tokens ?? 0;
      cur.output += r.output_tokens ?? 0;
      cur.cache_read += r.cache_read_tokens ?? 0;
      cur.cache_creation += r.cache_creation_tokens ?? 0;
      cur.calls += 1;
      m.set(key, cur);
    }
    return Array.from(m.entries())
      .map(([k, v]) => {
        const [day, product] = k.split("::");
        return { day, product, ...v };
      })
      .sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : a.product.localeCompare(b.product)));
  }, [rows]);

  const drillRows = useMemo(
    () => (drill ? rows.filter((r) => r.source_row_id === drill) : []),
    [rows, drill],
  );

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-brand-navy">API spend</h1>
        <p className="text-sm text-muted-foreground mt-1">Per-product daily totals + per-run drill-down. Last 2,000 calls.</p>
      </header>
      {err && <div className="rounded border border-red-300 bg-red-50 p-3 text-red-800 text-sm">{err}</div>}

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-semibold text-brand-navy mb-3">Daily totals by product</div>
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-2">Day</th>
                <th className="p-2">Product</th>
                <th className="p-2 text-right">Calls</th>
                <th className="p-2 text-right">Input</th>
                <th className="p-2 text-right">Output</th>
                <th className="p-2 text-right">Cache read</th>
                <th className="p-2 text-right">Cache creation</th>
              </tr>
            </thead>
            <tbody>
              {dailyByProduct.map((r) => (
                <tr key={`${r.day}-${r.product}`} className="border-t border-border">
                  <td className="p-2">{r.day}</td>
                  <td className="p-2">{r.product}</td>
                  <td className="p-2 text-right">{r.calls}</td>
                  <td className="p-2 text-right">{r.input.toLocaleString()}</td>
                  <td className="p-2 text-right">{r.output.toLocaleString()}</td>
                  <td className="p-2 text-right">{r.cache_read.toLocaleString()}</td>
                  <td className="p-2 text-right">{r.cache_creation.toLocaleString()}</td>
                </tr>
              ))}
              {dailyByProduct.length === 0 && (
                <tr><td className="p-3 text-muted-foreground" colSpan={7}>No API usage rows yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="text-sm font-semibold text-brand-navy mb-3">Recent calls (click a row's source_row_id to drill)</div>
        <div className="overflow-auto">
          <table className="w-full text-xs">
            <thead className="text-left uppercase text-muted-foreground">
              <tr>
                <th className="p-2">When</th>
                <th className="p-2">Function</th>
                <th className="p-2">Model</th>
                <th className="p-2 text-right">In</th>
                <th className="p-2 text-right">Out</th>
                <th className="p-2 text-right">CacheR</th>
                <th className="p-2 text-right">CacheC</th>
                <th className="p-2 text-right">ms</th>
                <th className="p-2">Source row</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-2 whitespace-nowrap">{r.created_at.replace("T", " ").slice(0, 19)}</td>
                  <td className="p-2">{r.function_name}</td>
                  <td className="p-2">{r.model}</td>
                  <td className="p-2 text-right">{(r.input_tokens ?? 0).toLocaleString()}</td>
                  <td className="p-2 text-right">{(r.output_tokens ?? 0).toLocaleString()}</td>
                  <td className="p-2 text-right">{(r.cache_read_tokens ?? 0).toLocaleString()}</td>
                  <td className="p-2 text-right">{(r.cache_creation_tokens ?? 0).toLocaleString()}</td>
                  <td className="p-2 text-right">{r.duration_ms ?? ""}</td>
                  <td className="p-2 font-mono">
                    {r.source_row_id ? (
                      <button className="underline" onClick={() => setDrill(r.source_row_id!)}>{r.source_row_id.slice(0, 8)}…</button>
                    ) : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {drill && (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-brand-navy">Calls for source_row_id = <span className="font-mono">{drill}</span></div>
            <button className="text-xs underline" onClick={() => setDrill(null)}>close</button>
          </div>
          <table className="w-full text-xs">
            <thead className="text-left uppercase text-muted-foreground">
              <tr>
                <th className="p-2">When</th>
                <th className="p-2">Function</th>
                <th className="p-2">Model</th>
                <th className="p-2 text-right">In</th>
                <th className="p-2 text-right">Out</th>
                <th className="p-2 text-right">CacheR</th>
                <th className="p-2 text-right">CacheC</th>
                <th className="p-2 text-right">ms</th>
              </tr>
            </thead>
            <tbody>
              {drillRows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-2 whitespace-nowrap">{r.created_at.replace("T", " ").slice(0, 19)}</td>
                  <td className="p-2">{r.function_name}</td>
                  <td className="p-2">{r.model}</td>
                  <td className="p-2 text-right">{(r.input_tokens ?? 0).toLocaleString()}</td>
                  <td className="p-2 text-right">{(r.output_tokens ?? 0).toLocaleString()}</td>
                  <td className="p-2 text-right">{(r.cache_read_tokens ?? 0).toLocaleString()}</td>
                  <td className="p-2 text-right">{(r.cache_creation_tokens ?? 0).toLocaleString()}</td>
                  <td className="p-2 text-right">{r.duration_ms ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

export default function AdminSpend() {
  return (
    <AdminOnly fallback={<div className="p-6">Not authorised.</div>}>
      <AdminSpendInner />
    </AdminOnly>
  );
}
