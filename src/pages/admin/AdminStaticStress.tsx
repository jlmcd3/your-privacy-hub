// AdminStaticStress — single button that runs the autonomous static stress test
// across selected industries × geos × 2 company slots × applicable tools.
// Generates per-company fixtures via generate-stress-fixtures, queues jobs in
// static_stress_jobs, kicks off the self-chaining run-stress-job orchestrator,
// then polls the batch row for progress and surfaces a Download-All ZIP.

import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const INDUSTRIES = [
  { id: "web", label: "Online & Web Services", emoji: "🌐" },
  { id: "mobile", label: "Mobile Applications", emoji: "📱" },
  { id: "adtech", label: "AdTech & Digital Media", emoji: "📊" },
  { id: "ai", label: "AI & Machine Learning", emoji: "🤖" },
  { id: "healthcare", label: "Healthcare & Life Sciences", emoji: "🏥" },
  { id: "fintech", label: "Financial Services & Fintech", emoji: "🏦" },
  { id: "hr", label: "HR & Employment Data", emoji: "👔" },
  { id: "edtech", label: "Children & EdTech", emoji: "👶" },
  { id: "retail", label: "Retail & E-Commerce", emoji: "🛒" },
  { id: "databroker", label: "Data Brokers", emoji: "📂" },
  { id: "legal", label: "Law Firm / Legal Services", emoji: "⚖️" },
  { id: "insurance", label: "Insurance", emoji: "🛡️" },
  { id: "telecom", label: "Telecommunications", emoji: "📞" },
  { id: "gaming", label: "Gaming & Entertainment", emoji: "🎮" },
  { id: "auto", label: "Automotive & Connected Vehicles", emoji: "🚗" },
  { id: "iot", label: "Smart Home & IoT", emoji: "🏠" },
  { id: "nonprofit", label: "Non-Profit & NGO", emoji: "🤝" },
  { id: "media", label: "Media & Publishing", emoji: "📰" },
  { id: "gov", label: "Government & Public Sector", emoji: "🏛️" },
  { id: "cyber", label: "Cybersecurity", emoji: "🔒" },
  { id: "proptech", label: "Real Estate & PropTech", emoji: "🏘️" },
  { id: "highered", label: "Education (Higher Ed)", emoji: "🎓" },
  { id: "consulting", label: "Consulting & Advisory", emoji: "💼" },
  { id: "pharma", label: "Pharma & Clinical Research", emoji: "💊" },
  { id: "social", label: "Social Media & Platforms", emoji: "📱" },
  { id: "travel", label: "Travel & Hospitality", emoji: "✈️" },
  { id: "biotech", label: "Biotech & Genomics", emoji: "🧬" },
  { id: "energy", label: "Energy & Utilities", emoji: "⚡" },
  { id: "kyc", label: "Identity Verification & KYC", emoji: "🪪" },
  { id: "manufacturing", label: "Manufacturing & Industrial IoT", emoji: "🏭" },
  { id: "consumer", label: "Consumer Goods & Loyalty Programs", emoji: "🛍️" },
];

const ALL_TOOLS = [
  { id: "governance", label: "Governance", geo: "both" },
  { id: "dpa", label: "DPA", geo: "both" },
  { id: "ir-playbook", label: "IR Playbook", geo: "both" },
  { id: "biometric", label: "Biometric", geo: "both" },
  { id: "registration", label: "Registration", geo: "both" },
  { id: "lia", label: "LIA", geo: "eu" },
  { id: "dpia", label: "DPIA", geo: "eu" },
  { id: "ropa", label: "RoPA", geo: "eu" },
  { id: "eu-notice", label: "EU Notice", geo: "eu" },
  { id: "us-notice", label: "US Notice", geo: "us" },
  { id: "cppa-risk", label: "CPPA Risk", geo: "us" },
  { id: "cppa-cyber", label: "CPPA Cyber", geo: "us" },
];

const TOOL_FIXTURE_KEY: Record<string, string> = {
  "lia": "lia", "dpia": "dpia", "governance": "governance",
  "biometric": "biometric", "dpa": "dpa", "ir-playbook": "irPlaybook",
  "ropa": "ropa", "us-notice": "usNotice", "eu-notice": "euNotice",
  "cppa-risk": "cppaRisk", "cppa-cyber": "cppaCyber", "registration": "registration",
};

type Batch = {
  id: string; status: string; total_jobs: number;
  completed_jobs: number; failed_jobs: number;
  started_at: string | null; completed_at: string | null;
  error_log: string | null;
  setup_total: number; setup_done: number;
};
type Job = {
  id: string; company_name: string; industry: string; tool_slug: string;
  status: string; started_at: string | null; completed_at: string | null;
  error_message: string | null;
};

export default function AdminStaticStress() {
  const { user } = useAuth();
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);
  const [geoFilter, setGeoFilter] = useState<"both" | "us" | "eu">("both");
  const [selectedTools, setSelectedTools] = useState<string[]>(ALL_TOOLS.map((t) => t.id));
  const [starting, setStarting] = useState(false);
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [zipping, setZipping] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [fixtureFailures, setFixtureFailures] = useState<string[]>([]);
  const [resumingSetup, setResumingSetup] = useState(false);

  // On mount: restore any in-progress batch so refresh and cross-tab work.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("static_stress_batches")
        .select("id, status, total_jobs, completed_jobs, failed_jobs, started_at, completed_at, error_log, setup_total, setup_done")
        .eq("run_by", user.id)
        .in("status", ["pending", "running"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled && data) setActiveBatch(data as Batch);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  async function handleStop() {
    if (!activeBatch) return;
    if (!confirm("Stop the batch? Any reports already generated will be preserved. Pending jobs will be cancelled.")) return;
    setStopping(true);
    try {
      await supabase.from("static_stress_batches")
        .update({ status: "cancelled" })
        .eq("id", activeBatch.id);
      await supabase.from("static_stress_jobs")
        .update({ status: "cancelled", completed_at: new Date().toISOString() })
        .eq("batch_id", activeBatch.id)
        .eq("status", "pending");
      setActiveBatch((b) => b ? { ...b, status: "cancelled" } : b);
      toast.success("Batch stopped — completed reports preserved");
    } catch (e) {
      toast.error(`Stop failed: ${(e as Error).message}`);
    } finally {
      setStopping(false);
    }
  }



  const applicableTools = useMemo(
    () => ALL_TOOLS.filter((t) => geoFilter === "both" || t.geo === "both" || t.geo === geoFilter),
    [geoFilter],
  );

  // Estimate scope
  const estimate = useMemo(() => {
    const geos = geoFilter === "both" ? ["us", "eu"] : [geoFilter];
    let total = 0;
    for (const _ind of selectedIndustries) {
      for (const g of geos) {
        for (const _slot of [1, 2]) {
          for (const t of selectedTools) {
            const td = ALL_TOOLS.find((a) => a.id === t);
            if (!td) continue;
            if (td.geo !== "both" && td.geo !== g) continue;
            total++;
          }
        }
      }
    }
    return total;
  }, [selectedIndustries, selectedTools, geoFilter]);

  useEffect(() => {
    if (!activeBatch?.id) return;
    if (activeBatch.status === "complete" || activeBatch.status === "cancelled") return;
    const interval = setInterval(async () => {
      const { data: b } = await supabase.from("static_stress_batches")
        .select("id, status, total_jobs, completed_jobs, failed_jobs, started_at, completed_at, error_log, setup_total, setup_done")
        .eq("id", activeBatch.id).single();
      if (b) setActiveBatch(b as Batch);
      const { data: jobs } = await supabase.from("static_stress_jobs")
        .select("id, company_name, industry, tool_slug, status, started_at, completed_at, error_message")
        .eq("batch_id", activeBatch.id)
        .order("started_at", { ascending: false, nullsFirst: false })
        .limit(20);
      setRecentJobs((jobs ?? []) as Job[]);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeBatch?.id, activeBatch?.status]);

  // Keep the admin signed in while a batch is running. Supabase auto-refreshes
  // tokens, but long-running tabs (especially when backgrounded) can miss a
  // refresh window and silently drop the session. We proactively refresh every
  // 4 minutes while a batch is active, and again whenever the tab regains
  // visibility, so completed reports stay accessible.
  useEffect(() => {
    const isRunning =
      activeBatch?.id &&
      activeBatch.status !== "complete" &&
      activeBatch.status !== "cancelled";
    if (!isRunning) return;

    let cancelled = false;
    const refresh = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        // Refresh if the access token expires within the next 5 minutes.
        const expiresAt = data.session?.expires_at ?? 0;
        const secondsLeft = expiresAt - Math.floor(Date.now() / 1000);
        if (secondsLeft < 300) {
          await supabase.auth.refreshSession();
        }
      } catch {
        // Swallow — next tick will retry.
      }
    };

    refresh();
    const interval = setInterval(refresh, 4 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
    };
  }, [activeBatch?.id, activeBatch?.status]);

  function toggleIndustry(id: string) {
    setSelectedIndustries((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }
  function toggleTool(id: string) {
    setSelectedTools((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  async function handleStart() {
    if (!user) { toast.error("Sign in first"); return; }
    if (selectedIndustries.length === 0) { toast.error("Select at least one industry"); return; }
    if (selectedTools.length === 0) { toast.error("Select at least one tool"); return; }
    setStarting(true);
    setFixtureFailures([]);

    try {
      const industriesList = selectedIndustries
        .map((id) => INDUSTRIES.find((i) => i.id === id))
        .filter(Boolean)
        .map((i) => ({ id: i!.id, label: i!.label }));

      const { data, error } = await supabase.functions.invoke("start-stress-batch", {
        body: {
          run_by: user.id,
          industries: industriesList,
          geo_filter: geoFilter,
          selected_tools: selectedTools,
        },
      });

      if (error || !data?.batch_id) {
        throw new Error(error?.message ?? "no batch_id returned");
      }

      const { data: batch } = await supabase
        .from("static_stress_batches")
        .select("id, status, total_jobs, completed_jobs, failed_jobs, started_at, completed_at, error_log, setup_total, setup_done")
        .eq("id", data.batch_id)
        .single();

      setActiveBatch(batch as Batch);
      toast.success("Batch started — fixture generation running on the server. You can safely navigate away.");
    } catch (e) {
      toast.error(`Start failed: ${(e as Error).message}`);
    } finally {
      setStarting(false);
    }
  }

  async function handleResumeSetup(batchId: string, fromIndex: number) {
    setResumingSetup(true);
    try {
      await supabase.functions.invoke("start-stress-batch", {
        body: { batch_id: batchId, company_index: fromIndex },
      });
      await supabase.from("static_stress_batches")
        .update({ error_log: null })
        .eq("id", batchId);
      setActiveBatch((b) => b ? { ...b, error_log: null } : b);
      toast.success("Setup resumed — continuing from where it left off");
    } catch (e) {
      toast.error(`Resume failed: ${(e as Error).message}`);
    } finally {
      setResumingSetup(false);
    }
  }


  async function handleResume(batchId: string) {
    setResuming(true);
    try {
      await supabase.functions.invoke("run-stress-job", {
        body: { batch_id: batchId, job_id: null },
      });
      await supabase.from("static_stress_batches")
        .update({ error_log: null })
        .eq("id", batchId);
      setActiveBatch((b) => b ? { ...b, error_log: null } : b);
      toast.success("Batch resumed — chain restarted");
    } catch (e) {
      toast.error(`Resume failed: ${(e as Error).message}`);
    } finally {
      setResuming(false);
    }
  }

  async function onDownloadAll() {
    if (!activeBatch) return;
    setZipping(true);
    const t = toast.loading("Fetching PDFs…");
    try {
      const { data: jobs } = await supabase.from("static_stress_jobs")
        .select("company_id, tool_slug, company_name, industry")
        .eq("batch_id", activeBatch.id).eq("status", "complete");
      const companyIds = Array.from(new Set((jobs ?? []).map((j) => j.company_id)));
      if (!companyIds.length) { toast.error("No completed jobs", { id: t }); return; }
      const variants = companyIds.map((c) => `static-${c}`);
      const { data: reports } = await supabase.from("sample_reports")
        .select("id, tool_slug, variant, title, pdf_path")
        .in("variant", variants).not("pdf_path", "is", null);
      const list = (reports ?? []).filter((r) => r.pdf_path);
      if (!list.length) { toast.error("No PDFs available", { id: t }); return; }

      const zip = new JSZip();
      const used = new Set<string>();
      let ok = 0, fail = 0;
      await Promise.all(list.map(async (r) => {
        try {
          const { data: signed } = await supabase.storage
            .from("sample-reports").createSignedUrl(r.pdf_path!, 60 * 60);
          if (!signed?.signedUrl) throw new Error("no signed url");
          const res = await fetch(signed.signedUrl);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          const safe = `${r.tool_slug}__${r.variant}__${r.title}`
            .replace(/[^a-z0-9_\-]+/gi, "_").replace(/^_+|_+$/g, "").slice(0, 120) || r.id;
          let name = `${safe}.pdf`;
          let i = 2;
          while (used.has(name)) name = `${safe}_${i++}.pdf`;
          used.add(name);
          zip.file(`${r.tool_slug}/${name}`, blob);
          ok++;
        } catch (e) { console.error("zip failed for", r.id, e); fail++; }
      }));
      const content = await zip.generateAsync({ type: "blob" });
      const stamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `eup-static-stress-${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
      toast.success(`Zipped ${ok} PDFs${fail ? ` (${fail} failed)` : ""}`, { id: t });
    } catch (e) {
      toast.error(`Download failed: ${(e as Error).message}`, { id: t });
    } finally {
      setZipping(false);
    }
  }

  const pct = activeBatch && activeBatch.total_jobs > 0
    ? Math.round(((activeBatch.completed_jobs + activeBatch.failed_jobs) / activeBatch.total_jobs) * 100)
    : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl">Static Accuracy Stress Test</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Generates deterministic, sector-specific reports across the 31 industries (2 companies per
          industry × applicable tools per geography). Fixtures are generated via Claude per company,
          then queued and run sequentially through the production edge functions. PDFs land in
          {" "}<Link to="/samples/report-output" className="text-brand-teal underline underline-offset-2">/samples/report-output</Link>{" "}
          with variant prefix <code>static-</code>.
        </p>
      </header>

      {/* Industry selector */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl">Industries ({selectedIndustries.length} selected)</h2>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelectedIndustries(INDUSTRIES.map((i) => i.id))}>Select all</Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedIndustries([])}>Deselect all</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {INDUSTRIES.map((ind) => (
            <label key={ind.id} className="flex items-center gap-2 border rounded p-2 cursor-pointer hover:bg-muted/40">
              <Checkbox checked={selectedIndustries.includes(ind.id)} onCheckedChange={() => toggleIndustry(ind.id)} />
              <span>{ind.emoji}</span>
              <span className="text-sm">{ind.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Geo */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl">Geography</h2>
        <div className="flex gap-4 text-sm">
          {(["both", "us", "eu"] as const).map((g) => (
            <label key={g} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="geo" checked={geoFilter === g} onChange={() => setGeoFilter(g)} />
              {g === "both" ? "Both US and EU/UK" : g === "us" ? "US only" : "EU/UK only"}
            </label>
          ))}
        </div>
      </section>

      {/* Tools */}
      <section className="space-y-3">
        <h2 className="font-serif text-xl">Tools ({selectedTools.length} selected)</h2>
        <div className="flex flex-wrap gap-2">
          {applicableTools.map((t) => (
            <label key={t.id} className="flex items-center gap-2 border rounded px-2 py-1 cursor-pointer hover:bg-muted/40">
              <Checkbox checked={selectedTools.includes(t.id)} onCheckedChange={() => toggleTool(t.id)} />
              <span className="text-sm">{t.label}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Scope */}
      <section className="border rounded p-4 bg-muted/30 text-sm space-y-1">
        <div><strong>Estimated scope:</strong> {selectedIndustries.length} industries × 2 companies × ~{Math.max(1, Math.round(estimate / Math.max(1, selectedIndustries.length * 2)))} tools = <strong>{estimate} reports</strong></div>
        <div className="text-muted-foreground">
          Estimated time: ~{Math.ceil(estimate * 60 / 60)} minutes (sequential, one tool at a time)
        </div>
      </section>

      {/* Start */}
      <section className="flex items-center gap-3">
        <Button size="lg" onClick={handleStart} disabled={starting || estimate === 0 || !!activeBatch}>
          {starting ? "Starting…" : "Start Static Stress Test"}
        </Button>
        {activeBatch && activeBatch.status === "pending" && activeBatch.setup_total > 0 && (
          <span className="text-sm text-muted-foreground">
            Generating fixtures: {activeBatch.setup_done}/{activeBatch.setup_total} companies — safe to navigate away
          </span>
        )}
      </section>

      {/* Active batch panel */}
      {activeBatch && (
        <section className="border rounded p-4 space-y-3">
          <header className="flex items-center justify-between gap-2">
            <h2 className="font-serif text-xl">Active batch</h2>
            <div className="flex items-center gap-2">
              {(activeBatch.status === "running" || activeBatch.status === "pending") && (
                <Button size="sm" variant="destructive" onClick={handleStop} disabled={stopping}>
                  {stopping ? "Stopping…" : "Stop"}
                </Button>
              )}
              <span className="text-xs font-mono">{activeBatch.id}</span>
            </div>
          </header>

          {activeBatch.status === "running" && activeBatch.error_log && (
            <div className="border border-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded p-3 text-sm space-y-2">
              <div>⚠ Chain interrupted — {activeBatch.error_log}</div>
              <Button size="sm" onClick={() => handleResume(activeBatch.id)} disabled={resuming}>
                {resuming ? "Resuming…" : "Resume Batch"}
              </Button>
            </div>
          )}
          {activeBatch.status === "pending" && activeBatch.error_log && (
            <div className="border border-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded p-3 text-sm space-y-2">
              <div>⚠ Setup interrupted — {activeBatch.error_log}</div>
              <Button size="sm" onClick={() => handleResumeSetup(activeBatch.id, activeBatch.setup_done)} disabled={resumingSetup}>
                {resumingSetup ? "Resuming…" : "Resume Setup"}
              </Button>
            </div>
          )}
          {fixtureFailures.length > 0 && (
            <div className="border border-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded p-3 text-xs">
              ⚠ Fixture generation failed for {fixtureFailures.length} compan{fixtureFailures.length === 1 ? "y" : "ies"} — skipped.
              The batch continues for all companies that generated successfully.
              <details className="mt-1"><summary className="cursor-pointer">Show failures</summary>
                <ul className="mt-1 list-disc pl-5">{fixtureFailures.map((f, i) => <li key={i}>{f}</li>)}</ul>
              </details>
            </div>
          )}
          <Progress value={pct} />
          <div className="text-sm">
            <strong>{activeBatch.status}</strong> — {activeBatch.completed_jobs} of {activeBatch.total_jobs} complete
            {activeBatch.failed_jobs > 0 && ` (${activeBatch.failed_jobs} failed)`}
          </div>
          <details className="text-xs">
            <summary className="cursor-pointer">Recent jobs ({recentJobs.length})</summary>
            <table className="w-full mt-2 text-left">
              <thead><tr className="text-muted-foreground"><th>Status</th><th>Company</th><th>Tool</th><th>Industry</th><th>Note</th></tr></thead>
              <tbody>
                {recentJobs.map((j) => (
                  <tr key={j.id} className="border-t">
                    <td className="py-1">{j.status}</td>
                    <td className="py-1">{j.company_name}</td>
                    <td className="py-1">{j.tool_slug}</td>
                    <td className="py-1">{j.industry}</td>
                    <td className="py-1 text-destructive">{j.error_message ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>

          {(activeBatch.status === "complete" || activeBatch.status === "cancelled") && (
            <div className="flex gap-2 pt-2 border-t">
              <Button onClick={onDownloadAll} disabled={zipping}>
                {zipping ? "Zipping…" : "Download all PDFs"}
              </Button>
              <Button variant="outline" asChild>
                <a href="/samples/report-output" target="_blank" rel="noreferrer">View in Sample Reports</a>
              </Button>
              <Button variant="ghost" onClick={() => { setActiveBatch(null); setRecentJobs([]); }}>
                Start another batch
              </Button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
