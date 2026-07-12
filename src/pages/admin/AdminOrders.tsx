// /admin/orders — recent orders across registration_orders + cppa_assessments,
// with a refund action wired to admin-refund-order. Admin-only.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminOnly from "@/components/AdminOnly";

type Row = {
  table: "registration_orders" | "cppa_assessments";
  id: string;
  created_at: string;
  status: string;
  amount_cents: number | null;
  currency: string | null;
  stripe_env: string | null;
  stripe_payment_intent_id: string | null;
  user_id: string | null;
  label: string;
};

function fmt(row: Row): string {
  const amt = row.amount_cents != null
    ? `${(row.amount_cents / 100).toFixed(2)} ${(row.currency ?? "usd").toUpperCase()}`
    : "—";
  return `${row.label} · ${amt}`;
}

function OrdersInner() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [regs, cppa] = await Promise.all([
      supabase
        .from("registration_orders")
        .select("id, created_at, payment_status, amount_cents, currency, stripe_env, stripe_payment_intent_id, user_id, tier")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("cppa_assessments")
        .select("id, created_at, status, purchase_price_cents, stripe_env, stripe_payment_intent_id, user_id, module")
        .not("stripe_payment_intent_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    const merged: Row[] = [];
    for (const r of regs.data ?? []) {
      merged.push({
        table: "registration_orders",
        id: r.id,
        created_at: r.created_at,
        status: r.payment_status ?? "?",
        amount_cents: r.amount_cents ?? null,
        currency: r.currency ?? "usd",
        stripe_env: (r as any).stripe_env ?? null,
        stripe_payment_intent_id: r.stripe_payment_intent_id ?? null,
        user_id: r.user_id,
        label: `Registration · ${(r as any).tier ?? ""}`,
      });
    }
    for (const r of cppa.data ?? []) {
      merged.push({
        table: "cppa_assessments",
        id: r.id,
        created_at: r.created_at,
        status: r.status ?? "?",
        amount_cents: r.purchase_price_cents ?? null,
        currency: "usd",
        stripe_env: (r as any).stripe_env ?? null,
        stripe_payment_intent_id: r.stripe_payment_intent_id ?? null,
        user_id: r.user_id,
        label: `CPPA · ${(r as any).module ?? ""}`,
      });
    }
    merged.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    setRows(merged);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function refund(row: Row) {
    if (!row.stripe_payment_intent_id) return;
    const ok = confirm(`Refund ${fmt(row)}?\nEnv resolves from row (${row.stripe_env ?? "auto-from-session-id"}).`);
    if (!ok) return;
    const reason = prompt("Refund reason (recorded to admin_action_log):") ?? "";
    setPendingId(row.id);
    setNotice(null);
    const { data, error } = await supabase.functions.invoke("admin-refund-order", {
      body: { table: row.table, row_id: row.id, reason },
    });
    setPendingId(null);
    if (error) {
      setNotice(`Refund failed: ${error.message}`);
    } else {
      setNotice(`Refund OK · env=${(data as any)?.env} · id=${(data as any)?.refund?.id}`);
      load();
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-4 flex items-center gap-3">
        <Link to="/admin" className="text-sm text-muted-foreground hover:underline">← Console</Link>
        <h1 className="font-serif text-2xl">Orders</h1>
      </div>
      {notice && <div className="mb-3 rounded-md border border-border bg-card p-2 text-sm">{notice}</div>}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-2">Created</th>
              <th>Kind</th>
              <th>Status</th>
              <th>Amount</th>
              <th>Env</th>
              <th>PI</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.table}:${r.id}`} className="border-t border-border">
                <td className="py-2 font-mono text-xs">{new Date(r.created_at).toISOString().slice(0, 16)}</td>
                <td>{r.label}</td>
                <td>{r.status}</td>
                <td>{fmt(r).split(" · ")[1]}</td>
                <td>{r.stripe_env ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="font-mono text-xs">{r.stripe_payment_intent_id?.slice(0, 18) ?? "—"}</td>
                <td>
                  {r.stripe_payment_intent_id && r.status !== "refunded" && (
                    <button
                      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                      disabled={pendingId === r.id}
                      onClick={() => refund(r)}
                    >
                      {pendingId === r.id ? "Refunding…" : "Refund"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No orders.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AdminOrders() {
  return (
    <AdminOnly fallback={<div className="p-10 text-sm text-muted-foreground">Not found.</div>}>
      <OrdersInner />
    </AdminOnly>
  );
}
