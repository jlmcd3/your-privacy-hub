// /admin — Master Console hub (Phase 1).
// Shows aggregate tiles + shortcuts to the existing admin pages. Admin-only.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AdminOnly from "@/components/AdminOnly";

type Tiles = {
  orders: { paid: number; refunded: number };
  cppa: { complete: number; failed_or_error: number };
  traffic_24h: number;
  admin_actions_24h: number;
} | null;

const SHORTCUTS: Array<{ label: string; to: string; group: string }> = [
  { group: "Ops",     label: "Orders",              to: "/admin/orders" },
  { group: "Ops",     label: "Toolbox",             to: "/admin/tools" },
  { group: "Ops",     label: "Cron status",         to: "/admin/cron-status" },
  { group: "Ops",     label: "Function health",     to: "/admin/function-health" },
  { group: "Quality", label: "Quality loop",        to: "/admin/quality-loop" },
  { group: "Quality", label: "Quality loop 2",      to: "/admin/quality-loop2" },
  { group: "Quality", label: "Quality augmentation", to: "/admin/quality-augmentation" },
  { group: "Quality", label: "Quality score ledger", to: "/admin/quality-score-ledger" },
  { group: "Quality", label: "Assertion tests",      to: "/admin/test-assertions" },
  { group: "Content", label: "Articles",            to: "/admin/articles" },
  { group: "Content", label: "Law updates",         to: "/admin/law-updates" },
  { group: "Content", label: "State-law review",    to: "/admin/state-law-review" },
  { group: "Content", label: "Sample reports",      to: "/admin/sample-reports" },
  { group: "Users",   label: "Subscribers",         to: "/admin/subscribers" },
  { group: "Users",   label: "Email signups",       to: "/admin/email-signups" },
  { group: "Users",   label: "Trial users",         to: "/admin/trial-users" },
  { group: "CPPA",    label: "CPPA runs",           to: "/admin/cppa-runs" },
  { group: "CPPA",    label: "CPPA eval harness",   to: "/admin/cppa-eval" },
  { group: "CPPA",    label: "CPPA corpus",         to: "/admin/cppa-corpus" },
  { group: "Ops",     label: "API spend",           to: "/admin/spend" },
];

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-2xl">{value}</div>
    </div>
  );
}

function HubInner() {
  const [tiles, setTiles] = useState<Tiles>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("admin-tiles", { body: {} });
      if (error) setErr(error.message);
      else setTiles(data as Tiles);
    })();
  }, []);

  const groups = SHORTCUTS.reduce<Record<string, typeof SHORTCUTS>>((acc, s) => {
    (acc[s.group] ||= []).push(s); return acc;
  }, {});

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="font-serif text-3xl">Master Console</h1>
      <p className="mt-1 text-sm text-muted-foreground">Phase 1 · launch-week operator surface.</p>

      <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-6">
        <Tile label="Orders paid"      value={tiles?.orders.paid ?? "…"} />
        <Tile label="Orders refunded"  value={tiles?.orders.refunded ?? "…"} />
        <Tile label="CPPA complete"    value={tiles?.cppa.complete ?? "…"} />
        <Tile label="CPPA failed"      value={tiles?.cppa.failed_or_error ?? "…"} />
        <Tile label="Events 24h"       value={tiles?.traffic_24h ?? "…"} />
        <Tile label="Admin actions 24h" value={tiles?.admin_actions_24h ?? "…"} />
      </section>
      {err && <p className="mt-3 text-sm text-destructive">Tile load failed: {err}</p>}

      <section className="mt-10 space-y-6">
        {Object.entries(groups).map(([group, items]) => (
          <div key={group}>
            <h2 className="text-xs uppercase tracking-wide text-muted-foreground">{group}</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {items.map((s) => (
                <li key={s.to}>
                  <Link
                    to={s.to}
                    className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

export default function AdminHub() {
  return (
    <AdminOnly fallback={<div className="p-10 text-sm text-muted-foreground">Not found.</div>}>
      <HubInner />
    </AdminOnly>
  );
}
