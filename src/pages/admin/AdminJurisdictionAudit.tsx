import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Run = {
  id: string;
  status: string;
  jurisdictions_checked: number;
  issues_found: number;
  model: string | null;
  started_at: string;
  completed_at: string | null;
  error: string | null;
};

type Finding = {
  id: string;
  run_id: string;
  jurisdiction_code: string;
  field_name: string;
  current_value: any;
  suggested_value: any;
  agreement: string;
  confidence: string | null;
  source_quote: string | null;
  source_url: string | null;
  status: string;
  created_at: string;
};

function fmt(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function AdminJurisdictionAudit() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin();
  const { toast } = useToast();

  const [runs, setRuns] = useState<Run[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [filterCodes, setFilterCodes] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  async function loadRuns() {
    const { data } = await supabase
      .from("jurisdiction_audit_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);
    setRuns((data as Run[]) || []);
    if (data && data.length && !selectedRun) setSelectedRun(data[0].id);
  }

  async function loadFindings(runId: string) {
    const { data } = await supabase
      .from("jurisdiction_requirement_audits")
      .select("*")
      .eq("run_id", runId)
      .order("jurisdiction_code")
      .order("field_name");
    setFindings((data as Finding[]) || []);
  }

  useEffect(() => {
    if (isAdmin) loadRuns();
  }, [isAdmin]);

  useEffect(() => {
    if (selectedRun) loadFindings(selectedRun);
  }, [selectedRun]);

  // Auto-refresh while running
  useEffect(() => {
    const running = runs.find((r) => r.id === selectedRun)?.status === "running";
    if (!running) return;
    const t = setInterval(() => {
      loadRuns();
      if (selectedRun) loadFindings(selectedRun);
    }, 5000);
    return () => clearInterval(t);
  }, [runs, selectedRun]);

  async function startRun() {
    setLoading(true);
    try {
      const codes = filterCodes.trim()
        ? filterCodes.split(",").map((s) => s.trim()).filter(Boolean)
        : null;
      const { data, error } = await supabase.functions.invoke("audit-jurisdiction-requirements", {
        body: { codes, limit: codes ? codes.length : 100 },
      });
      if (error) throw error;
      toast({ title: "Audit started", description: `Run ${data.run_id?.slice(0, 8)}…` });
      await loadRuns();
      setSelectedRun(data.run_id);
    } catch (e: any) {
      toast({ title: "Failed to start audit", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function review(findingId: string, action: "accept" | "reject") {
    setBusy(findingId);
    try {
      const { data, error } = await supabase.functions.invoke("apply-jurisdiction-audit-finding", {
        body: { finding_id: findingId, action },
      });
      if (error) throw error;
      toast({
        title: action === "accept" ? "Applied" : "Rejected",
        description: data?.applied ? "Wrote to jurisdiction_requirements" : "Finding marked rejected",
      });
      if (selectedRun) loadFindings(selectedRun);
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  if (authLoading || roleLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const openFindings = findings.filter((f) => f.status === "open");
  const reviewedCount = findings.length - openFindings.length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Jurisdiction Requirements Audit | Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-serif mb-2">Jurisdiction Requirements Audit</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          AI compares every field in <code>jurisdiction_requirements</code> against the official authority website
          and flags disagreements for your review. Accepting a finding writes the suggested value back to the table.
        </p>

        <div className="border rounded-lg p-4 mb-6 bg-card">
          <h2 className="font-semibold mb-3">Start a new audit</h2>
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-64">
              <label className="text-xs text-muted-foreground block mb-1">
                Jurisdiction codes (optional, comma-separated). Leave empty to audit all.
              </label>
              <Input
                value={filterCodes}
                onChange={(e) => setFilterCodes(e.target.value)}
                placeholder="US-CA, UK, DE"
              />
            </div>
            <Button onClick={startRun} disabled={loading}>
              {loading ? "Starting…" : "Run audit"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Full audit (~70 jurisdictions) takes ~5–10 min and costs ~$5–8 in AI calls.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          <aside className="space-y-2">
            <h3 className="text-sm font-semibold uppercase text-muted-foreground">Recent runs</h3>
            {runs.length === 0 && <p className="text-sm text-muted-foreground">No runs yet.</p>}
            {runs.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRun(r.id)}
                className={`w-full text-left p-3 border rounded text-sm hover:bg-muted ${
                  selectedRun === r.id ? "border-primary bg-muted" : "border-border"
                }`}
              >
                <div className="font-mono text-xs">{r.id.slice(0, 8)}</div>
                <div className="flex justify-between text-xs mt-1">
                  <span
                    className={
                      r.status === "completed"
                        ? "text-green-600"
                        : r.status === "error"
                        ? "text-red-600"
                        : "text-amber-600"
                    }
                  >
                    {r.status}
                  </span>
                  <span className="text-muted-foreground">{fmtDate(r.started_at)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {r.jurisdictions_checked} checked · {r.issues_found} issues
                </div>
              </button>
            ))}
          </aside>

          <section>
            {selectedRun && (
              <>
                <div className="mb-3 text-sm text-muted-foreground">
                  {openFindings.length} open · {reviewedCount} reviewed
                </div>
                {findings.length === 0 && (
                  <p className="text-muted-foreground">No findings (yet). If status is "running", check back in a minute.</p>
                )}
                <div className="space-y-3">
                  {findings.map((f) => (
                    <div
                      key={f.id}
                      className={`border rounded-lg p-4 ${
                        f.status !== "open" ? "opacity-60" : "bg-card"
                      }`}
                    >
                      <div className="flex justify-between flex-wrap gap-2 mb-2">
                        <div>
                          <span className="font-mono text-sm font-semibold">{f.jurisdiction_code}</span>
                          <span className="mx-2 text-muted-foreground">·</span>
                          <span className="font-mono text-sm">{f.field_name}</span>
                          <span
                            className={`ml-2 text-xs px-2 py-0.5 rounded ${
                              f.agreement === "disagrees"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {f.agreement}
                          </span>
                          {f.confidence && (
                            <span className="ml-1 text-xs px-2 py-0.5 rounded bg-muted">
                              {f.confidence}
                            </span>
                          )}
                          {f.status !== "open" && (
                            <span className="ml-1 text-xs px-2 py-0.5 rounded bg-muted">{f.status}</span>
                          )}
                        </div>
                        {f.status === "open" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => review(f.id, "reject")}
                              disabled={busy === f.id}
                            >
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => review(f.id, "accept")}
                              disabled={busy === f.id}
                            >
                              Accept
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Current</div>
                          <div className="font-mono bg-muted p-2 rounded break-words">{fmt(f.current_value)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">Suggested</div>
                          <div className="font-mono bg-muted p-2 rounded break-words">{fmt(f.suggested_value)}</div>
                        </div>
                      </div>
                      {f.source_quote && (
                        <blockquote className="mt-3 text-sm border-l-2 border-primary pl-3 italic text-muted-foreground">
                          "{f.source_quote}"
                          {f.source_url && (
                            <>
                              {" — "}
                              <a
                                href={f.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="underline"
                              >
                                source
                              </a>
                            </>
                          )}
                        </blockquote>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
