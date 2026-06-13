// AdminStaticStress — single button that runs the autonomous static stress test
// across selected industries × geos × 2 company slots × applicable tools.
// Generates per-company fixtures via generate-stress-fixtures, queues jobs in
// static_stress_jobs, kicks off the self-chaining run-stress-job orchestrator,
// then polls the batch row for progress and surfaces a Download-All ZIP.

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [setupProgress, setSetupProgress] = useState<{ done: number; total: number } | null>(null);
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [zipping, setZipping] = useState(false);
  const cancelRef = useRef(false);

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
    if (activeBatch.status === "complete") return;
    const interval = setInterval(async () => {
      const { data: b } = await supabase.from("static_stress_batches")
        .select("id, status, total_jobs, completed_jobs, failed_jobs, started_at, completed_at")
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
    cancelRef.current = false;
    const industriesLabels = selectedIndustries
      .map((id) => INDUSTRIES.find((i) => i.id === id)?.label).filter(Boolean) as string[];

    try {
      const { data: batch, error: bErr } = await supabase.from("static_stress_batches").insert({
        run_by: user.id, status: "pending",
        industries: industriesLabels, geo_filter: geoFilter, total_jobs: 0,
      }).select("id, status, total_jobs, completed_jobs, failed_jobs, started_at, completed_at").single();
      if (bErr || !batch) throw new Error(`batch insert: ${bErr?.message}`);

      const geos = geoFilter === "both" ? ["us", "eu"] : [geoFilter];
      const companies: Array<{ industryId: string; industryLabel: string; geo: string; slot: number }> = [];
      for (const indId of selectedIndustries) {
        const ind = INDUSTRIES.find((i) => i.id === indId)!;
        for (const g of geos) {
          for (const slot of [1, 2]) {
            companies.push({ industryId: ind.id, industryLabel: ind.label, geo: g, slot });
          }
        }
      }
      setSetupProgress({ done: 0, total: companies.length });

      let totalJobs = 0;
      for (let idx = 0; idx < companies.length; idx++) {
        if (cancelRef.current) break;
        const c = companies[idx];
        const companyId = `${c.geo}-${c.industryId}-slot${c.slot}`;
        const { data: fixtures, error: fErr } = await supabase.functions.invoke(
          "generate-stress-fixtures",
          { body: { industry: c.industryLabel, geo: c.geo, company_slot: c.slot, company_id: companyId } },
        );
        if (fErr || !fixtures) {
          console.warn(`Fixture failed for ${companyId}:`, fErr);
          setSetupProgress({ done: idx + 1, total: companies.length });
          continue;
        }
        const applicable = selectedTools.filter((t) => {
          const td = ALL_TOOLS.find((a) => a.id === t);
          return td && (td.geo === "both" || td.geo === c.geo);
        });
        const jobRows = applicable
          .map((toolId) => ({
            toolId,
            payload: (fixtures as any)[TOOL_FIXTURE_KEY[toolId]],
          }))
          .filter((j) => j.payload)
          .map((j) => ({
            batch_id: batch.id,
            company_id: companyId,
            company_name: (fixtures as any).companyName ?? companyId,
            industry: c.industryLabel,
            geo: c.geo,
            tool_slug: j.toolId,
            fixture_data: j.payload,
            status: "pending",
          }));
        if (jobRows.length) {
          await supabase.from("static_stress_jobs").insert(jobRows);
          totalJobs += jobRows.length;
        }
        setSetupProgress({ done: idx + 1, total: companies.length });
      }

      await supabase.from("static_stress_batches").update({
        total_jobs: totalJobs, status: "running",
        started_at: new Date().toISOString(),
      }).eq("id", batch.id);

      await supabase.functions.invoke("run-stress-job", {
        body: { batch_id: batch.id, job_id: null },
      });

      setActiveBatch({ ...batch, total_jobs: totalJobs, status: "running", started_at: new Date().toISOString() });
      setSetupProgress(null);
      toast.success(`Started batch with ${totalJobs} jobs`);
    } catch (e) {
      toast.error(`Start failed: ${(e as Error).message}`);
    } finally {
      setStarting(false);
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
        {setupProgress && (
          <span className="text-sm text-muted-foreground">
            Generating fixtures: {setupProgress.done}/{setupProgress.total} companies
          </span>
        )}
      </section>

      {/* Active batch panel */}
      {activeBatch && (
        <section className="border rounded p-4 space-y-3">
          <header className="flex items-center justify-between">
            <h2 className="font-serif text-xl">Active batch</h2>
            <span className="text-xs font-mono">{activeBatch.id}</span>
          </header>
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

          {activeBatch.status === "complete" && (
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
