// AdminQAExport — filtered ZIP download of static stress test PDFs for QA review.
// Lets an admin select a completed batch, optionally filter by tool / geo / industry,
// see a live document count, and download a ZIP of matching PDFs organised by tool.
// No new edge functions or migrations required — reads from existing tables using
// the same signed-URL pattern as /samples/report-output.

import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Download } from "lucide-react";

// Maps static_stress_jobs.tool_slug → sample_reports.tool_slug
// (mirrors TOOL_SLUG_MAP in run-stress-job edge function)
const JOB_TO_SAMPLE_SLUG: Record<string, string> = {
  "lia":          "li_assessment",
  "dpia":         "dpia",
  "governance":   "governance",
  "biometric":    "biometric",
  "dpa":          "dpa",
  "ir-playbook":  "ir_playbook",
  "ropa":         "ropa",
  "us-notice":    "us_notice",
  "eu-notice":    "eu_notice",
  "cppa-risk":    "cppa_risk",
  "cppa-cyber":   "cppa_cyber",
  "cppa-admt":    "cppa_admt",
  "registration": "registration",
};

const TOOL_LABEL: Record<string, string> = {
  "lia":          "LIA",
  "dpia":         "DPIA",
  "governance":   "Governance",
  "biometric":    "Biometric",
  "dpa":          "DPA",
  "ir-playbook":  "IR Playbook",
  "ropa":         "RoPA",
  "us-notice":    "US Notice",
  "eu-notice":    "EU Notice",
  "cppa-risk":    "CPPA Risk",
  "cppa-cyber":   "CPPA Cyber",
  "cppa-admt":    "ADMT Checker",
  "registration": "Registration",
};

type Batch = {
  id: string;
  created_at: string;
  completed_at: string | null;
  industries: string[];
  geo_filter: string;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
};

type Job = {
  id: string;
  company_id: string;
  company_name: string;
  industry: string;
  geo: string;
  tool_slug: string;
};

export default function AdminQAExport() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedGeo, setSelectedGeo] = useState<"both" | "us" | "eu">("both");
  const [selectedIndustries, setSelectedIndustries] = useState<string[]>([]);

  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingBatches(true);
      const { data, error } = await supabase
        .from("static_stress_batches")
        .select("id, created_at, completed_at, industries, geo_filter, total_jobs, completed_jobs, failed_jobs")
        .eq("status", "complete")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error(`Failed to load batches: ${error.message}`);
      } else {
        setBatches((data ?? []) as Batch[]);
      }
      setLoadingBatches(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedBatchId) {
      setJobs([]);
      setSelectedTools([]);
      setSelectedIndustries([]);
      return;
    }
    (async () => {
      setLoadingJobs(true);
      const { data, error } = await supabase
        .from("static_stress_jobs")
        .select("id, company_id, company_name, industry, geo, tool_slug")
        .eq("batch_id", selectedBatchId)
        .eq("status", "complete");
      if (error) {
        toast.error(`Failed to load jobs: ${error.message}`);
        setJobs([]);
      } else {
        const loaded = (data ?? []) as Job[];
        setJobs(loaded);
        setSelectedTools([...new Set(loaded.map((j) => j.tool_slug))]);
        setSelectedIndustries([...new Set(loaded.map((j) => j.industry))]);
      }
      setLoadingJobs(false);
    })();
  }, [selectedBatchId]);

  const availableTools = useMemo(() => [...new Set(jobs.map((j) => j.tool_slug))].sort(), [jobs]);
  const availableIndustries = useMemo(() => [...new Set(jobs.map((j) => j.industry))].sort(), [jobs]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((j) => {
      if (!selectedTools.includes(j.tool_slug)) return false;
      if (selectedGeo !== "both" && j.geo !== selectedGeo) return false;
      if (!selectedIndustries.includes(j.industry)) return false;
      return true;
    });
  }, [jobs, selectedTools, selectedGeo, selectedIndustries]);

  function toggleTool(slug: string) {
    setSelectedTools((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));
  }
  function toggleIndustry(ind: string) {
    setSelectedIndustries((s) => (s.includes(ind) ? s.filter((x) => x !== ind) : [...s, ind]));
  }

  async function handleDownload() {
    if (filteredJobs.length === 0) {
      toast.error("No documents match the current filters");
      return;
    }
    setZipping(true);
    const t = toast.loading(`Preparing ${filteredJobs.length} PDFs…`);

    try {
      const lookups = filteredJobs.map((j) => ({
        variant: `static-${j.company_id}`,
        sampleSlug: JOB_TO_SAMPLE_SLUG[j.tool_slug] ?? j.tool_slug,
        label: TOOL_LABEL[j.tool_slug] ?? j.tool_slug,
        industry: j.industry,
        geo: j.geo,
        companyName: j.company_name,
        toolSlug: j.tool_slug,
      }));

      const variants = [...new Set(lookups.map((l) => l.variant))];

      const { data: sampleRows, error: srErr } = await supabase
        .from("sample_reports")
        .select("id, tool_slug, variant, title, pdf_path")
        .in("variant", variants)
        .not("pdf_path", "is", null);

      if (srErr) throw new Error(`sample_reports query: ${srErr.message}`);

      const pathMap = new Map<string, string>();
      for (const row of sampleRows ?? []) {
        if (row.pdf_path) {
          pathMap.set(`${row.variant}::${row.tool_slug}`, row.pdf_path);
        }
      }

      const uniquePaths = [...new Set([...pathMap.values()])];
      const signedMap = new Map<string, string>();
      await Promise.all(
        uniquePaths.map(async (path) => {
          const { data } = await supabase.storage
            .from("sample-reports")
            .createSignedUrl(path, 60 * 60);
          if (data?.signedUrl) signedMap.set(path, data.signedUrl);
        })
      );

      const zip = new JSZip();
      let ok = 0;
      let missing = 0;
      let fail = 0;

      await Promise.all(
        lookups.map(async (l) => {
          const key = `${l.variant}::${l.sampleSlug}`;
          const path = pathMap.get(key);
          if (!path) { missing++; return; }
          const url = signedMap.get(path);
          if (!url) { missing++; return; }

          try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();

            const safe = (s: string) =>
              s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
            const filename = `${safe(l.industry)}__${l.geo}__${safe(l.companyName)}__${safe(l.label)}.pdf`;

            zip.file(`${l.label}/${filename}`, blob);
            ok++;
          } catch (e) {
            console.error(`Failed to fetch PDF for ${l.variant} ${l.sampleSlug}:`, e);
            fail++;
          }
        })
      );

      if (ok === 0) {
        toast.error("No PDFs could be downloaded — they may not have been generated yet", { id: t });
        return;
      }

      const content = await zip.generateAsync({ type: "blob" });
      const batch = batches.find((b) => b.id === selectedBatchId);
      const stamp = batch?.completed_at
        ? new Date(batch.completed_at).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
      const toolCount = selectedTools.length;
      const geoLabel = selectedGeo === "both" ? "all-geos" : selectedGeo;
      const filename = `eup-qa-${stamp}--${toolCount}tools--${geoLabel}.zip`;

      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);

      const summary = [
        `${ok} PDF${ok === 1 ? "" : "s"} downloaded`,
        missing > 0 ? `${missing} not yet generated` : null,
        fail > 0 ? `${fail} fetch errors` : null,
      ].filter(Boolean).join(", ");
      toast.success(summary, { id: t });

    } catch (e) {
      toast.error(`Export failed: ${(e as Error).message}`, { id: t });
    } finally {
      setZipping(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
      <header className="space-y-2">
        <h1 className="font-serif text-3xl">QA Export</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Download filtered batches of static stress test PDFs for QA review.
          Select a completed batch, apply filters, then download a ZIP organised
          by tool type.
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="font-serif text-xl">1. Select batch</h2>
        {loadingBatches && <p className="text-sm text-muted-foreground">Loading batches…</p>}
        {!loadingBatches && batches.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No completed batches yet. Run a static stress test from{" "}
            <a href="/admin/static-stress" className="text-brand-teal underline">
              /admin/static-stress
            </a>{" "}
            first.
          </p>
        )}
        {batches.length > 0 && (
          <div className="space-y-2">
            {batches.map((b) => (
              <label
                key={b.id}
                className={`flex items-start gap-3 border rounded p-3 cursor-pointer hover:bg-muted/40 ${
                  selectedBatchId === b.id ? "border-brand-teal bg-brand-teal/5" : ""
                }`}
              >
                <input
                  type="radio"
                  name="batch"
                  value={b.id}
                  checked={selectedBatchId === b.id}
                  onChange={() => setSelectedBatchId(b.id)}
                  className="mt-0.5"
                />
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">
                    {b.completed_at
                      ? new Date(b.completed_at).toLocaleString()
                      : new Date(b.created_at).toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">{b.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.industries.length} industr{b.industries.length === 1 ? "y" : "ies"} ·{" "}
                    {b.geo_filter === "both" ? "US + EU/UK" : b.geo_filter.toUpperCase()} ·{" "}
                    {b.completed_jobs} completed · {b.failed_jobs} failed
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {b.industries.slice(0, 5).join(", ")}
                    {b.industries.length > 5 ? ` +${b.industries.length - 5} more` : ""}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}
      </section>

      {selectedBatchId && !loadingJobs && jobs.length > 0 && (
        <>
          <section className="space-y-3">
            <h2 className="font-serif text-xl">2. Filter documents</h2>

            <div className="space-y-1.5">
              <div className="text-sm font-medium">Geography</div>
              <div className="flex gap-4 text-sm">
                {(["both", "us", "eu"] as const).map((g) => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="geo"
                      checked={selectedGeo === g}
                      onChange={() => setSelectedGeo(g)}
                    />
                    {g === "both" ? "Both (US + EU/UK)" : g === "us" ? "US only" : "EU/UK only"}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Tools ({selectedTools.length}/{availableTools.length})</div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelectedTools([...availableTools])} className="text-xs text-brand-teal hover:underline">All</button>
                  <button type="button" onClick={() => setSelectedTools([])} className="text-xs text-muted-foreground hover:underline">None</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTools.map((slug) => (
                  <label key={slug} className="flex items-center gap-1.5 border rounded px-2 py-1 cursor-pointer hover:bg-muted/40 text-sm">
                    <Checkbox checked={selectedTools.includes(slug)} onCheckedChange={() => toggleTool(slug)} />
                    {TOOL_LABEL[slug] ?? slug}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  Industries ({selectedIndustries.length}/{availableIndustries.length})
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelectedIndustries([...availableIndustries])} className="text-xs text-brand-teal hover:underline">All</button>
                  <button type="button" onClick={() => setSelectedIndustries([])} className="text-xs text-muted-foreground hover:underline">None</button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                {availableIndustries.map((ind) => (
                  <label key={ind} className="flex items-center gap-1.5 border rounded px-2 py-1 cursor-pointer hover:bg-muted/40 text-sm">
                    <Checkbox checked={selectedIndustries.includes(ind)} onCheckedChange={() => toggleIndustry(ind)} />
                    <span className="truncate">{ind}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-serif text-xl">3. Download</h2>
            <div className="border rounded p-4 bg-muted/30 text-sm space-y-3">
              <div>
                <strong>{filteredJobs.length}</strong> document{filteredJobs.length === 1 ? "" : "s"} match the current filters
                {filteredJobs.length > 0 && (
                  <span className="text-muted-foreground">
                    {" "}({selectedTools.length} tool{selectedTools.length === 1 ? "" : "s"} ·{" "}
                    {selectedGeo === "both" ? "both geos" : selectedGeo.toUpperCase()} ·{" "}
                    {selectedIndustries.length} industr{selectedIndustries.length === 1 ? "y" : "ies"})
                  </span>
                )}
              </div>
              {filteredJobs.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  ZIP will be organised as: <code>Tool Name / industry__geo__company__tool.pdf</code>
                </div>
              )}
              <Button onClick={handleDownload} disabled={zipping || filteredJobs.length === 0} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                {zipping ? "Building ZIP…" : `Download ${filteredJobs.length} PDF${filteredJobs.length === 1 ? "" : "s"}`}
              </Button>
            </div>
          </section>
        </>
      )}

      {selectedBatchId && loadingJobs && (
        <p className="text-sm text-muted-foreground">Loading jobs…</p>
      )}
      {selectedBatchId && !loadingJobs && jobs.length === 0 && (
        <p className="text-sm text-muted-foreground">No completed jobs found in this batch.</p>
      )}
    </div>
  );
}
