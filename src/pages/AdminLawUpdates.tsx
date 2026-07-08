import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Candidate = {
  id: string;
  state_slug: string;
  state_name: string;
  detected_law_name: string | null;
  detected_effective_date: string | null;
  detected_authority: string | null;
  detected_statute_url: string | null;
  source_summary: string | null;
  confidence: "high" | "medium" | "low" | null;
  status: "pending" | "confirmed" | "dismissed";
  detected_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

const confidenceColor: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-800 border-emerald-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  low: "bg-red-100 text-red-800 border-red-300",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function AdminLawUpdates() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const allowed = isAdmin;
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Candidate | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("state_law_update_candidates")
      .select("*")
      .order("detected_at", { ascending: false });
    setCandidates((data || []) as Candidate[]);
    setLoading(false);
  };

  useEffect(() => {
    if (allowed) load();
  }, [allowed]);

  const pending = useMemo(() => candidates.filter((c) => c.status === "pending"), [candidates]);
  const history = useMemo(
    () => candidates.filter((c) => c.status !== "pending").slice(0, 20),
    [candidates],
  );

  const dismiss = async (c: Candidate) => {
    setBusyId(c.id);
    await (supabase as any)
      .from("state_law_update_candidates")
      .update({
        status: "dismissed",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.email,
      })
      .eq("id", c.id);
    setBusyId(null);
    toast({ title: "Dismissed" });
    load();
  };

  const confirm = async () => {
    if (!confirmTarget) return;
    const c = confirmTarget;
    setBusyId(c.id);
    // 1. Upsert override so the public site reflects the change
    await (supabase as any).from("state_law_overrides").upsert({
      state_slug: c.state_slug,
      state_name: c.state_name,
      statute_status: "Enacted",
      statute_name: c.detected_law_name,
      effective_date: c.detected_effective_date,
      authority_name: c.detected_authority,
      statute_url: c.detected_statute_url,
      confirmed_at: new Date().toISOString(),
      confirmed_by: user?.email,
    });
    // 2. Mark candidate confirmed
    await (supabase as any)
      .from("state_law_update_candidates")
      .update({
        status: "confirmed",
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.email,
      })
      .eq("id", c.id);
    setBusyId(null);
    setConfirmTarget(null);
    toast({
      title: `${c.state_name} has been updated.`,
      description: "The state card and jurisdiction page are now live.",
    });
    load();
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login?redirect=/admin/law-updates" replace />;
  if (!allowed) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>Law Update Candidates | Admin | End User Privacy</title>
      </Helmet>
      <Navbar />
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-display text-brand-navy mb-2">State Privacy Law Updates</h1>
        <p className="text-sm text-slate mb-8">
          Candidates flagged by the bi-monthly law monitor. Each must be confirmed before any
          public page is updated.
        </p>

        <h2 className="font-display text-brand-navy mb-3">
          Pending review ({pending.length})
        </h2>
        {loading ? (
          <p className="text-sm text-slate">Loading…</p>
        ) : pending.length === 0 ? (
          <div className="bg-card border border-brand-cloud rounded-xl p-6 text-sm text-slate">
            No pending candidates.
          </div>
        ) : (
          <div className="space-y-3 mb-12">
            {pending.map((c) => (
              <div
                key={c.id}
                className="bg-card border border-brand-cloud rounded-xl p-5 shadow-eup-sm"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div>
                    <h3 className="text-brand-navy">
                      {c.state_name} — {c.detected_law_name || "(unnamed law)"}
                    </h3>
                    <p className="text-[12px] text-slate mt-1">
                      Effective: {c.detected_effective_date || "TBD"} · Authority:{" "}
                      {c.detected_authority || "—"}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                      confidenceColor[c.confidence || "low"]
                    }`}
                  >
                    {c.confidence || "low"} confidence
                  </span>
                </div>
                {c.source_summary && (
                  <p className="text-sm text-slate leading-relaxed mb-3">
                    {c.source_summary}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-brand-mist mb-4">
                  {c.detected_statute_url && (
                    <a
                      href={c.detected_statute_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-teal-text hover:underline"
                    >
                      Statute ↗
                    </a>
                  )}
                  <span>Detected {fmtDate(c.detected_at)}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => setConfirmTarget(c)}
                    disabled={busyId === c.id}
                  >
                    Confirm update
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => dismiss(c)}
                    disabled={busyId === c.id}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="font-display text-brand-navy mb-3">History</h2>
        {history.length === 0 ? (
          <div className="bg-card border border-brand-cloud rounded-xl p-6 text-sm text-slate">
            No reviewed candidates yet.
          </div>
        ) : (
          <div className="bg-card border border-brand-cloud rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-brand-cloud/40 text-slate text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2">State</th>
                  <th className="text-left px-4 py-2">Law</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Reviewed</th>
                  <th className="text-left px-4 py-2">By</th>
                </tr>
              </thead>
              <tbody>
                {history.map((c) => (
                  <tr key={c.id} className="border-t border-brand-cloud">
                    <td className="px-4 py-2 text-brand-navy">{c.state_name}</td>
                    <td className="px-4 py-2 text-slate">{c.detected_law_name || "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                          c.status === "confirmed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate">{fmtDate(c.reviewed_at)}</td>
                    <td className="px-4 py-2 text-slate">{c.reviewed_by || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!confirmTarget} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm law enactment</DialogTitle>
            <DialogDescription>
              You are about to mark <strong>{confirmTarget?.state_name}</strong> as having
              enacted <strong>{confirmTarget?.detected_law_name}</strong>. This will update the
              state card on /us-privacy-laws and the /jurisdiction/{confirmTarget?.state_slug}{" "}
              page. Are you sure this law has been enacted?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirm} disabled={busyId === confirmTarget?.id}>
              Yes, update the site
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
