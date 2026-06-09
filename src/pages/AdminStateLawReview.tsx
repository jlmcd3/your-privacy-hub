import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import stateData from "@/data/us_state_comparison.json";

type ReviewStatus = "ok" | "needs_update";

interface ReviewRow {
  id: string;
  state_slug: string;
  state_name: string;
  status: ReviewStatus;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string;
}

interface StateMeta {
  abbr: string;
  name: string;
  law: string;
  status: string;
  effective: string;
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

export default function AdminStateLawReview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [log, setLog] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const states = stateData.states as StateMeta[];
  const lastReviewed = (stateData as any).lastReviewed as string;
  const nextReviewDue = (stateData as any).nextReviewDue as string;
  const cadence = (stateData as any).reviewCadence as string;

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("state_law_review_log")
      .select("*")
      .order("reviewed_at", { ascending: false });
    setLog((data as ReviewRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const latestByState = useMemo(() => {
    const m = new Map<string, ReviewRow>();
    for (const r of log) if (!m.has(r.state_slug)) m.set(r.state_slug, r);
    return m;
  }, [log]);

  const recordReview = async (s: StateMeta, status: ReviewStatus) => {
    const slug = s.abbr.toLowerCase();
    setBusy(slug);
    const { error } = await (supabase as any)
      .from("state_law_review_log")
      .insert({
        state_slug: slug,
        state_name: s.name,
        status,
        notes: notes[slug]?.trim() || null,
        reviewed_by: user?.id ?? null,
      });
    setBusy(null);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    setNotes((n) => ({ ...n, [slug]: "" }));
    toast({ title: `Recorded review for ${s.name}` });
    load();
  };

  const overdueDays = (slug: string) => {
    const last = latestByState.get(slug);
    if (!last) return Infinity;
    const days = (Date.now() - new Date(last.reviewed_at).getTime()) / 86400000;
    return Math.round(days);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>State Law Review · Admin</title></Helmet>
      <Navbar />
      <main className="container mx-auto px-4 py-10 max-w-6xl">
        <h1 className="text-3xl font-serif mb-2">State Privacy Law Review</h1>
        <p className="text-muted-foreground mb-6">
          Verify each enacted state's statute, regulator, and effective date against the
          official source linked from <code>/compare/us-states</code>. Record the outcome
          to keep the public "last reviewed" date trustworthy.
        </p>

        <div className="rounded-lg border bg-card p-4 mb-8 grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">JSON last reviewed</div>
            <div className="font-medium">{fmt(lastReviewed)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Next review due</div>
            <div className="font-medium">{fmt(nextReviewDue)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Cadence</div>
            <div className="font-medium capitalize">{cadence}</div>
          </div>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading review log…</p>}

        <div className="space-y-3">
          {states.map((s) => {
            const slug = s.abbr.toLowerCase();
            const last = latestByState.get(slug);
            const days = overdueDays(slug);
            const stale = days > 100;
            return (
              <div key={s.abbr} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-medium">
                      {s.name} · <span className="text-muted-foreground">{s.law}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Effective {fmt(s.effective)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {last ? (
                      <>
                        <Badge variant={last.status === "ok" ? "secondary" : "destructive"}>
                          {last.status === "ok" ? "OK" : "Needs update"}
                        </Badge>
                        <span className={`text-xs ${stale ? "text-destructive" : "text-muted-foreground"}`}>
                          Last reviewed {fmt(last.reviewed_at)}
                          {Number.isFinite(days) && ` (${days}d ago)`}
                        </span>
                      </>
                    ) : (
                      <Badge variant="outline">Never reviewed</Badge>
                    )}
                  </div>
                </div>

                <Textarea
                  className="mt-3 text-sm"
                  rows={2}
                  placeholder="Optional notes (e.g. confirmed against AG site on …, or summarize change found)"
                  value={notes[slug] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [slug]: e.target.value }))}
                />

                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy === slug}
                    onClick={() => recordReview(s, "ok")}
                  >
                    Mark reviewed — OK
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy === slug}
                    onClick={() => recordReview(s, "needs_update")}
                  >
                    Flag — needs update
                  </Button>
                </div>

                {last?.notes && (
                  <p className="text-xs mt-2 text-muted-foreground italic">
                    Last note: {last.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-8">
          When all states are marked OK for a cycle, update <code>lastReviewed</code> and
          <code> nextReviewDue</code> in <code>src/data/us_state_comparison.json</code>.
        </p>
      </main>
      <Footer />
    </div>
  );
}
