import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const StepCard = ({
  step,
  label,
  description,
  status,
  buttonLabel,
  onAction,
  note,
  result,
}: {
  step: number;
  label: string;
  description: string;
  status: "pending" | "complete" | "running";
  buttonLabel: string;
  onAction: () => void;
  note?: string;
  result?: string;
}) => (
  <div className="bg-card border border-border rounded-xl p-5 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
          {step}
        </span>
        <h3 className="font-semibold text-sm text-foreground">{label}</h3>
      </div>
      <span
        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
          status === "complete"
            ? "bg-green-100 text-green-800"
            : status === "running"
            ? "bg-amber-100 text-amber-800"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {status === "complete" ? "✓ Complete" : status === "running" ? "Running…" : "Pending"}
      </span>
    </div>
    <p className="text-[12px] text-muted-foreground">{description}</p>
    <button
      onClick={onAction}
      disabled={status === "running"}
      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-[12px] disabled:opacity-50"
    >
      {status === "running" ? "Running…" : buttonLabel}
    </button>
    {note && <p className="text-[11px] text-muted-foreground italic">{note}</p>}
    {result && <p className="text-[12px] text-slate bg-muted/50 rounded-lg px-3 py-2">{result}</p>}
  </div>
);

const AdminSeedLI = () => {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [seedStatus, setSeedStatus] = useState<"pending" | "complete" | "running">("pending");
  const [seedResult, setSeedResult] = useState("");
  const [fetchStatus, setFetchStatus] = useState<"pending" | "complete" | "running">("pending");
  const [fetchResult, setFetchResult] = useState("");
  const [backfillStatus, setBackfillStatus] = useState<"pending" | "complete" | "running">("pending");
  const [backfillResult, setBackfillResult] = useState("");

  const loadStats = async () => {
    const [entries, liPending, latestEntry] = await Promise.all([
      supabase.from("li_tracker_entries").select("id, outcome, signal_type"),
      supabase.from("updates").select("id", { count: "exact", head: true }).eq("li_relevant", true).eq("li_processed", false),
      supabase.from("li_tracker_entries").select("created_at").order("created_at", { ascending: false }).limit(1),
    ]);

    const rows = entries.data || [];
    const outcomeCounts: Record<string, number> = {};
    const signalCounts: Record<string, number> = {};
    rows.forEach((r: any) => {
      outcomeCounts[r.outcome] = (outcomeCounts[r.outcome] || 0) + 1;
      signalCounts[r.signal_type] = (signalCounts[r.signal_type] || 0) + 1;
    });

    if (rows.length > 0) setSeedStatus("complete");

    setStats({
      total: rows.length,
      outcomeCounts,
      signalCounts,
      liPendingCount: liPending.count || 0,
      latestDate: latestEntry.data?.[0]?.created_at
        ? new Date(latestEntry.data[0].created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        : "—",
    });
  };

  useEffect(() => {
    if (user) loadStats();
  }, [user]);

  const handleSeed = async () => {
    setSeedStatus("running");
    setSeedResult("");
    try {
      const res = await supabase.functions.invoke("seed-li-tracker");
      setSeedResult(res.data?.message || `Inserted ${res.data?.inserted ?? 0} rows`);
      setSeedStatus("complete");
      loadStats();
    } catch (e: any) {
      setSeedResult(`Error: ${e.message}`);
      setSeedStatus("pending");
    }
  };

  const handleFetch = async () => {
    setFetchStatus("running");
    setFetchResult("");
    try {
      const res = await supabase.functions.invoke("fetch-edpb-documents");
      const d = res.data;
      setFetchResult(`Step 2 complete — ${d?.added ?? 0} additional entries added from source documents${d?.errors?.length ? `. Warnings: ${d.errors.join("; ")}` : ""}`);
      setFetchStatus("complete");
      loadStats();
    } catch (e: any) {
      setFetchResult(`Error: ${e.message}`);
      setFetchStatus("pending");
    }
  };

  const handleBackfill = async () => {
    setBackfillStatus("running");
    setBackfillResult("");
    try {
      const res = await supabase.functions.invoke("backfill-li-relevance");
      setBackfillResult(`${res.data?.processed ?? 0} articles processed, ${res.data?.findings ?? 0} entries added or updated`);
      setBackfillStatus("complete");
      loadStats();
    } catch (e: any) {
      setBackfillResult(`Error: ${e.message}`);
      setBackfillStatus("pending");
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!user) return <div className="p-8">Unauthorized</div>;

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <div className="max-w-[800px] mx-auto px-4 py-10">
        <h1 className="font-display text-2xl text-foreground mb-2">Admin: LI Tracker Setup</h1>
        <p className="text-sm text-muted-foreground mb-8">Three-step deployment workflow for the Legitimate Interest Tracker.</p>

        <div className="space-y-4 mb-8">
          <StepCard
            step={1}
            label="Seed Consensus Data"
            description="Populates the tracker with 40 curated regulatory positions from EDPB, ICO, and CNIL sources. Auto-runs on deployment."
            status={seedStatus}
            buttonLabel="Re-seed"
            onAction={handleSeed}
            note="Idempotent — will not create duplicates if rows already exist."
            result={seedResult || (seedStatus === "complete" && stats ? `Complete — ${stats.total} rows` : undefined)}
          />
          <StepCard
            step={2}
            label="Fetch EDPB & ICO Documents"
            description="Fetches EDPB Guidelines 1/2024 and ICO LI guidance, then extracts additional entries using AI."
            status={fetchStatus}
            buttonLabel="Fetch Documents"
            onAction={handleFetch}
            note="Run this once. Fetches EDPB Guidelines 1/2024 and ICO LI guidance. Cost: approx. $1–3 in API spend."
            result={fetchResult}
          />
          <StepCard
            step={3}
            label="Backfill Existing Articles"
            description="Scans existing articles for legitimate interest references and extracts regulatory positions."
            status={backfillStatus}
            buttonLabel="Run Backfill"
            onAction={handleBackfill}
            result={backfillResult}
          />
        </div>

        {stats && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg text-foreground">Status Panel</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Total entries:</span>{" "}
                <strong>{stats.total}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Most recent entry:</span>{" "}
                <strong>{stats.latestDate}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">Articles pending processing:</span>{" "}
                <strong>{stats.liPendingCount}</strong>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">By Outcome</h3>
              <div className="flex gap-3 text-sm flex-wrap">
                {["accepted", "conditional", "rejected", "contested"].map((k) => (
                  <span key={k} className="bg-muted px-2.5 py-1 rounded capitalize">
                    {k}: {stats.outcomeCounts[k] || 0}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">By Signal Type</h3>
              <div className="flex flex-wrap gap-2 text-sm">
                {Object.entries(stats.signalCounts).map(([k, v]) => (
                  <span key={k} className="bg-muted px-2.5 py-1 rounded">
                    {k}: {v as number}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default AdminSeedLI;
