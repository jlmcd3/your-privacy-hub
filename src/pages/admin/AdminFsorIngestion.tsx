import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Presets — RUN SHEET placeholders. Replace verbatim when the RUN SHEET arrives.
type PresetConfig = {
  fsor_package: string;
  source_url: string;
  mode: "fsor" | "appendix45";
  include_sections?: string[];
  start_anchor?: string;
  stop_anchor?: string;
  column_x?: [number, number, number];
};

const T1: PresetConfig = {
  fsor_package: "ccpa-2025-cyber-risk-admt",
  source_url:
    "https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_fsor_and_uid.pdf",
  mode: "fsor",
  start_anchor: "UPDATE TO INITIAL STATEMENT OF REASONS",
};
const APPEN_A =
  "https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_fsor_appen_a.pdf";
const APPEN_B =
  "https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_fsor_appen_b.pdf";
const T2a: PresetConfig = {
  fsor_package: "ccpa-2025-cyber-risk-admt",
  source_url: APPEN_A,
  mode: "appendix45",
};
const T2b: PresetConfig = {
  fsor_package: "ccpa-2025-cyber-risk-admt",
  source_url: APPEN_A,
  mode: "appendix45",
};
const T2c: PresetConfig = {
  fsor_package: "ccpa-2025-cyber-risk-admt",
  source_url: APPEN_A,
  mode: "appendix45",
};
const T2d: PresetConfig = {
  fsor_package: "ccpa-2025-cyber-risk-admt",
  source_url: APPEN_B,
  mode: "appendix45",
};
const T3a: PresetConfig = {
  fsor_package: "ccpa-2023-original",
  source_url: "",
  mode: "fsor",
};
const T3b: PresetConfig = { ...T3a, mode: "appendix45" };
const T4a: PresetConfig = {
  fsor_package: "dbr-2024-registration",
  source_url: "",
  mode: "fsor",
};
const T4b: PresetConfig = { ...T4a, mode: "appendix45" };

const PRESETS: Record<string, PresetConfig> = {
  T1, T2a, T2b, T2c, T2d, T3a, T3b, T4a, T4b,
};

type Unit = {
  agency_response: string;
  comment_text?: string;
  regulation_citation: string;
  page_ref: string;
};

type ExtractResp = {
  total_units: number;
  sections: Record<string, number>;
  units: Unit[];
  error?: string;
  total_pages?: number;
  page_from?: number;
  page_to?: number;
};

function parseStartPage(pageRef: string): number | null {
  const m = (pageRef || "").match(/(\d+)/);
  return m ? Number(m[1]) : null;
}

function computeSections(units: Unit[]): Record<string, number> {
  const sections: Record<string, number> = {};
  for (const u of units) {
    const m = u.regulation_citation.match(/§\s*(7\d{3})/);
    const root = m ? m[1] : "unknown";
    sections[root] = (sections[root] ?? 0) + 1;
  }
  return sections;
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export default function AdminFsorIngestion() {
  const [adminToken, setAdminToken] = useState("");
  const [presetKey, setPresetKey] = useState<string>("T1");
  const [configJson, setConfigJson] = useState<string>(
    () => JSON.stringify(PRESETS["T1"], null, 2),
  );
  const [extracting, setExtracting] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [extractResult, setExtractResult] = useState<ExtractResp | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [verifyResult, setVerifyResult] = useState<string>("");

  const config = useMemo<PresetConfig | null>(() => {
    try { return JSON.parse(configJson); } catch { return null; }
  }, [configJson]);

  function appendLog(line: string) {
    setLog((l) => [...l, `[${new Date().toLocaleTimeString()}] ${line}`]);
  }

  function applyPreset(key: string) {
    setPresetKey(key);
    setConfigJson(JSON.stringify(PRESETS[key], null, 2));
    setExtractResult(null);
  }

  async function runExtract() {
    if (!config) { toast.error("Config JSON invalid"); return; }
    if (!adminToken) { toast.error("Admin token required"); return; }
    setExtracting(true);
    setExtractResult(null);
    try {
      const { fsor_package: _fp, ...payload } = config as any;
      const r = await fetch(`${SUPABASE_URL}/functions/v1/cppa-fsor-extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": adminToken,
        },
        body: JSON.stringify(payload),
      });
      const data = (await r.json()) as ExtractResp;
      if (!r.ok || data.error) {
        toast.error(`Extract failed: ${data.error ?? r.status}`);
        setExtractResult({ total_units: 0, sections: {}, units: [], error: data.error ?? `HTTP ${r.status}` });
      } else {
        setExtractResult(data);
        toast.success(`Extracted ${data.total_units} units`);
      }
    } catch (e: any) {
      toast.error(`Extract error: ${e?.message ?? e}`);
    } finally {
      setExtracting(false);
    }
  }

  async function runIngest() {
    if (!config || !extractResult || extractResult.units.length === 0) {
      toast.error("Extract first"); return;
    }
    if (!adminToken) { toast.error("Admin token required"); return; }
    setIngesting(true);
    setLog([]);
    const BATCH = 15;
    let consecFails = 0;
    let totIns = 0, totSkip = 0, totFail = 0;
    try {
      for (let i = 0; i < extractResult.units.length; i += BATCH) {
        const batch = extractResult.units.slice(i, i + BATCH);
        appendLog(`Batch ${Math.floor(i / BATCH) + 1}: ${batch.length} units → POST`);
        const r = await fetch(`${SUPABASE_URL}/functions/v1/cppa-ingest-fsor`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": adminToken,
          },
          body: JSON.stringify({
            fsor_package: config.fsor_package,
            source_url: config.source_url,
            units: batch,
          }),
        });
        const data = await r.json();
        if (!r.ok || data.error) {
          consecFails++;
          appendLog(`  ✗ failed: ${data.error ?? r.status}`);
          if (consecFails >= 3) {
            appendLog(`STOPPING — 3 consecutive batch failures.`);
            toast.error("Stopped after 3 consecutive batch failures");
            break;
          }
          continue;
        }
        consecFails = 0;
        totIns += data.inserted ?? 0;
        totSkip += data.skipped ?? 0;
        totFail += data.failed ?? 0;
        appendLog(
          `  ✓ inserted=${data.inserted} skipped=${data.skipped} failed=${data.failed} (cumulative ins=${totIns} skip=${totSkip} fail=${totFail})`,
        );
      }
      appendLog(`DONE — total inserted=${totIns} skipped=${totSkip} failed=${totFail}`);
      toast.success(`Ingest complete: ${totIns} inserted`);
    } catch (e: any) {
      appendLog(`ERROR: ${e?.message ?? e}`);
      toast.error(`Ingest error: ${e?.message ?? e}`);
    } finally {
      setIngesting(false);
    }
  }

  async function runVerify() {
    setVerifying(true);
    setVerifyResult("");
    const sections: string[] = [];

    // Total row count
    try {
      const { count, error } = await supabase
        .from("cppa_fsor_commentary")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      sections.push(`Total rows in cppa_fsor_commentary: ${count ?? 0}`);
    } catch (e: any) {
      sections.push(`Total rows: ERROR — ${e?.message ?? e}`);
    }

    // Package counts (client-side tally)
    try {
      const { data: rows, error } = await supabase
        .from("cppa_fsor_commentary")
        .select("fsor_package")
        .limit(2000);
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const r of rows ?? []) {
        const k = (r as any).fsor_package ?? "unknown";
        counts[k] = (counts[k] ?? 0) + 1;
      }
      const lines = Object.entries(counts)
        .sort()
        .map(([k, v]) => `  ${k} — ${v}`)
        .join("\n");
      sections.push(`Counts by fsor_package:\n${lines || "  (none)"}`);
    } catch (e: any) {
      sections.push(`Package counts: ERROR — ${e?.message ?? e}`);
    }

    // NULL embedding count
    try {
      const { count: nullCount, error } = await supabase
        .from("cppa_fsor_commentary")
        .select("id", { count: "exact", head: true })
        .is("embedding", null);
      if (error) throw error;
      sections.push(`Rows with NULL embedding: ${nullCount ?? 0}`);
    } catch (e: any) {
      sections.push(`NULL embedding count: ERROR — ${e?.message ?? e}`);
    }

    // Six spot-checks
    const checks = [
      "substantially replace human decisionmaking",
      "no later than 45 calendar days from the date of the material change",
      "In re Marriage of Reese",
      "NIST Cybersecurity Framework 2.0",
      "providing reasonable accommodation as required by law",
      "Colorado Privacy Act",
    ];
    for (const phrase of checks) {
      try {
        const { data: matches, error } = await supabase
          .from("cppa_fsor_commentary")
          .select("regulation_citation")
          .ilike("agency_response", `%${phrase}%`);
        if (error) throw error;
        const citations = (matches ?? [])
          .map((m: any) => m.regulation_citation)
          .filter(Boolean);
        if (citations.length > 0) {
          sections.push(`PASS — ${phrase}\n  ${citations.join(", ")}`);
        } else {
          sections.push(`FAIL — ${phrase}`);
        }
      } catch (e: any) {
        sections.push(`ERROR — ${phrase}: ${e?.message ?? e}`);
      }
    }

    setVerifyResult(sections.join("\n\n"));
    setVerifying(false);
  }

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>FSOR Ingestion — Admin</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-serif">CPPA FSOR Ingestion</h1>
          <p className="text-sm text-muted-foreground">
            Admin-only. Token is held in component state, never persisted.
          </p>
        </header>

        <section className="bg-white p-4 rounded border space-y-3">
          <div>
            <Label htmlFor="tok">Admin token</Label>
            <Input
              id="tok"
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="ADMIN_SECRET_TOKEN"
              autoComplete="off"
            />
          </div>
          <div>
            <Label>Preset</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {Object.keys(PRESETS).map((k) => (
                <Button
                  key={k}
                  variant={presetKey === k ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyPreset(k)}
                >
                  {k}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="cfg">Config JSON</Label>
            <Textarea
              id="cfg"
              value={configJson}
              onChange={(e) => setConfigJson(e.target.value)}
              rows={12}
              className="font-mono text-xs"
            />
            {!config && (
              <p className="text-xs text-destructive mt-1">Invalid JSON</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={runExtract} disabled={extracting || !config}>
              {extracting ? "Extracting…" : "Extract (dry run)"}
            </Button>
            <Button
              onClick={runIngest}
              disabled={ingesting || !extractResult || (extractResult?.units.length ?? 0) === 0}
              variant="secondary"
            >
              {ingesting ? "Ingesting…" : `Ingest ${extractResult?.units.length ?? 0} units`}
            </Button>
            <Button onClick={runVerify} disabled={verifying} variant="outline">
              {verifying ? "Verifying…" : "Verify corpus"}
            </Button>
          </div>
        </section>

        {extractResult && (
          <section className="bg-white p-4 rounded border space-y-3">
            <h2 className="font-semibold">Extract result</h2>
            {extractResult.error ? (
              <p className="text-destructive">{extractResult.error}</p>
            ) : (
              <>
                <p>Total units: <strong>{extractResult.total_units}</strong></p>
                <div>
                  <h3 className="text-sm font-semibold">Per-section counts</h3>
                  <table className="text-sm border">
                    <thead><tr><th className="px-2 border">Section</th><th className="px-2 border">Count</th></tr></thead>
                    <tbody>
                      {Object.entries(extractResult.sections).sort().map(([s, c]) => (
                        <tr key={s}><td className="px-2 border">{s}</td><td className="px-2 border">{c}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">First 3 units</h3>
                  <pre className="text-xs bg-muted p-2 overflow-auto max-h-96 whitespace-pre-wrap">
                    {JSON.stringify(extractResult.units.slice(0, 3), null, 2)}
                  </pre>
                </div>
              </>
            )}
          </section>
        )}

        {log.length > 0 && (
          <section className="bg-white p-4 rounded border">
            <h2 className="font-semibold">Ingest log</h2>
            <pre className="text-xs bg-muted p-2 overflow-auto max-h-96">
              {log.join("\n")}
            </pre>
          </section>
        )}

        {verifyResult && (
          <section className="bg-white p-4 rounded border">
            <h2 className="font-semibold">Corpus verification</h2>
            <pre className="text-xs bg-muted p-2 whitespace-pre-wrap">{verifyResult}</pre>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
