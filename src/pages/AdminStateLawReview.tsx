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
import { formatDateOnlyShort, formatTimestampDateOnly } from "@/lib/dateOnly";
import {
  computeReviewRollup,
  REVIEW_CADENCE_DAYS,
  type ReviewLogRow,
  type ReviewStatus,
} from "@/lib/stateReviewStatus";

interface StateMeta {
  abbr: string;
  name: string;
  law: string;
  status: string;
  effective: string;
}

export default function AdminStateLawReview() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [log, setLog] = useState<ReviewLogRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const states = stateData.states as StateMeta[];

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("state_law_review_log")
      .select("*")
      .order("reviewed_at", { ascending: false });
    setLog((data as ReviewLogRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const rollup = useMemo(() => computeReviewRollup(log), [log]);
  const perStateByAbbr = useMemo(
    () => Object.fromEntries(rollup.perState.map((p) => [p.abbr, p])),
    [rollup],
  );

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

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>State Law Review · Admin</title></Helmet>
      <Navbar />
      <main className="container mx-auto px-4 py-10 max-w-6xl">
        <h1 className="text-3xl font-serif mb-2">State Privacy Law Review</h1>
        <p className="text-muted-foreground mb-6">
          Verify each enacted state's statute, regulator, and effective date against the
          official source linked from <code>/compare/us-states</code>. Record the outcome
          to keep the public "last reviewed" claim trustworthy.
        </p>

        <div className="rounded-lg border bg-card p-4 mb-8 grid sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Cycle progress</div>
            <div className="font-medium">
              {rollup.reviewedInCycleCount} / {rollup.totalEnacted} in cycle
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Flagged (material change)</div>
            <div className="font-medium">{rollup.materialChangeCount}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Needs update</div>
            <div className="font-medium">{rollup.needsUpdateCount}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Cadence</div>
            <div className="font-medium">{REVIEW_CADENCE_DAYS} days</div>
          </div>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading review log…</p>}

        <div className="space-y-3">
          {states.map((s) => {
            const slug = s.abbr.toLowerCase();
            const info = perStateByAbbr[s.abbr];
            const last = info?.last;
            const days = info ? info.ageDays : Infinity;
            const stale = !!info?.stale;
            const statusLabel = last?.status === "ok"
              ? "OK"
              : last?.status === "material_change"
              ? "Material change"
              : last?.status === "needs_update"
              ? "Needs update"
              : "Never reviewed";
            const statusVariant: "secondary" | "destructive" | "outline" =
              last?.status === "ok" ? "secondary"
              : last ? "destructive"
              : "outline";
            return (
              <div key={s.abbr} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-medium">
                      {s.name} · <span className="text-muted-foreground">{s.law}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Effective {formatDateOnlyShort(s.effective)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={statusVariant}>{statusLabel}</Badge>
                    {last && (
                      <span className={`text-xs ${stale ? "text-destructive" : "text-muted-foreground"}`}>
                        Last reviewed {formatTimestampDateOnly(last.reviewed_at)}
                        {Number.isFinite(days) && ` (${Math.round(days)}d ago)`}
                      </span>
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

                <div className="mt-3 flex gap-2 flex-wrap">
                  <Button
                    size="sm"
                    disabled={busy === slug}
                    onClick={() => recordReview(s, "ok")}
                  >
                    Mark reviewed — OK
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy === slug}
                    onClick={() => recordReview(s, "needs_update")}
                  >
                    Flag — needs update
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy === slug}
                    onClick={() => recordReview(s, "material_change")}
                    title="Newly-enacted law, amendment, effective-date change, or repeal — marks the comparison immediately stale."
                  >
                    Flag — material change
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
          Global "last reviewed" is derived automatically once every enacted state has an
          in-cycle OK row. "Material change" marks the entire comparison stale until the
          affected state is reviewed again.
        </p>
      </main>
      <Footer />
    </div>
  );
}
