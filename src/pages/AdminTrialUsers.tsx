import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";

interface Row {
  id: string;
  email: string | null;
  stripe_trial_end: string;
  subscription_type: string | null;
  is_premium: boolean;
  is_pro: boolean;
  created_at: string;
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export default function AdminTrialUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const { data } = await (supabase as any)
        .from("profiles")
        .select("id, email, stripe_trial_end, subscription_type, is_premium, is_pro, created_at")
        .gt("stripe_trial_end", nowIso)
        .order("stripe_trial_end", { ascending: true });
      setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const expiringIn3 = rows.filter((r) => daysUntil(r.stripe_trial_end) <= 3).length;

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Trial Users · Admin</title></Helmet>
      <Navbar />
      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <h1 className="text-3xl font-serif mb-2">Trial Users</h1>
        <p className="text-muted-foreground mb-6">
          Users currently inside a Stripe trial window. Trial enforcement collapses
          <code className="mx-1">hasToolAccess</code>and<code className="mx-1">granularTier</code>
          to <code>free</code> until <code>stripe_trial_end</code> passes, then auto-restores
          benefits on the next subscription event from Stripe.
        </p>

        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground">Active trials</div>
            <div className="text-2xl font-semibold">{loading ? "…" : rows.length}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground">Expiring ≤ 3 days</div>
            <div className="text-2xl font-semibold">{loading ? "…" : expiringIn3}</div>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <div className="text-xs text-muted-foreground">Trial length</div>
            <div className="text-2xl font-semibold">10d</div>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active trials right now.</p>
        ) : (
          <div className="rounded-lg border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Email</th>
                  <th className="px-3 py-2 text-left font-medium">Plan</th>
                  <th className="px-3 py-2 text-left font-medium">Trial ends</th>
                  <th className="px-3 py-2 text-left font-medium">Days left</th>
                  <th className="px-3 py-2 text-left font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const days = daysUntil(r.stripe_trial_end);
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">{r.email ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline">
                          {r.is_pro ? "Professional" : "Intelligence"} ·{" "}
                          {r.subscription_type ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {new Date(r.stripe_trial_end).toLocaleDateString("en-US", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={days <= 3 ? "destructive" : "secondary"}>{days}d</Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("en-US", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
