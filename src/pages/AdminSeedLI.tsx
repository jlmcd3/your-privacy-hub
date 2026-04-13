import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const AdminSeedLI = () => {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [seedStatus, setSeedStatus] = useState("");
  const [backfillStatus, setBackfillStatus] = useState("");

  const loadStats = async () => {
    const [entries, liRelevant, liPending] = await Promise.all([
      supabase.from("li_tracker_entries").select("id, outcome, signal_type"),
      supabase.from("updates").select("id", { count: "exact", head: true }).eq("li_relevant", true),
      supabase.from("updates").select("id", { count: "exact", head: true }).eq("li_relevant", true).eq("li_processed", false),
    ]);

    const rows = entries.data || [];
    const outcomeCounts: Record<string, number> = {};
    const signalCounts: Record<string, number> = {};
    rows.forEach((r: any) => {
      outcomeCounts[r.outcome] = (outcomeCounts[r.outcome] || 0) + 1;
      signalCounts[r.signal_type] = (signalCounts[r.signal_type] || 0) + 1;
    });

    setStats({
      total: rows.length,
      outcomeCounts,
      signalCounts,
      liRelevantCount: liRelevant.count || 0,
      liPendingCount: liPending.count || 0,
    });
  };

  useEffect(() => { if (user) loadStats(); }, [user]);

  const handleSeed = async () => {
    setSeedStatus("Seeding...");
    try {
      const res = await supabase.functions.invoke("seed-li-tracker");
      setSeedStatus(`Done: ${JSON.stringify(res.data)}`);
      loadStats();
    } catch (e: any) {
      setSeedStatus(`Error: ${e.message}`);
    }
  };

  const handleBackfill = async () => {
    setBackfillStatus("Running backfill...");
    try {
      const res = await supabase.functions.invoke("backfill-li-relevance");
      setBackfillStatus(`Done: ${JSON.stringify(res.data)}`);
      loadStats();
    } catch (e: any) {
      setBackfillStatus(`Error: ${e.message}`);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (!user) return <div className="p-8">Unauthorized</div>;

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <div className="max-w-[800px] mx-auto px-4 py-10">
        <h1 className="font-display text-2xl text-navy mb-6">Admin: LI Tracker Seeding</h1>

        <div className="flex gap-4 mb-8">
          <button onClick={handleSeed} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm">
            Seed LI Consensus Rows
          </button>
          <button onClick={handleBackfill} className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm">
            Backfill Existing Articles
          </button>
        </div>

        {seedStatus && <p className="text-sm text-slate mb-2">{seedStatus}</p>}
        {backfillStatus && <p className="text-sm text-slate mb-4">{backfillStatus}</p>}

        {stats && (
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg text-navy">Status Panel</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Total entries:</span> <strong>{stats.total}</strong></div>
              <div><span className="text-muted-foreground">LI-relevant articles:</span> <strong>{stats.liRelevantCount}</strong></div>
              <div><span className="text-muted-foreground">Pending processing:</span> <strong>{stats.liPendingCount}</strong></div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-navy mb-1">By Outcome</h3>
              <div className="flex gap-3 text-sm">
                {Object.entries(stats.outcomeCounts).map(([k, v]) => (
                  <span key={k} className="bg-muted px-2 py-1 rounded">{k}: {v as number}</span>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-navy mb-1">By Signal Type</h3>
              <div className="flex flex-wrap gap-2 text-sm">
                {Object.entries(stats.signalCounts).map(([k, v]) => (
                  <span key={k} className="bg-muted px-2 py-1 rounded">{k}: {v as number}</span>
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
