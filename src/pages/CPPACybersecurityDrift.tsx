// Sprint 3 — CPPA Cyber drift comparison page.
// Side-by-side view of two cybersecurity assessments for the same user, sorted by
// the 18 § 7122(a) controls. Highlights status changes (improved / worsened / same)
// and overall-score delta. URL: /cppa-cybersecurity/drift/:newId/:oldId
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import BackLink from "@/components/dashboard/BackLink";
import { controlStatusColor } from "@/pages/CPPACybersecurityResult";

type ControlRow = { control: string; status: string; finding?: string };
type Assessment = {
  id: string;
  created_at: string;
  report_data: any;
};

const STATUS_RANK: Record<string, number> = {
  "implemented": 4,
  "partial": 3,
  "partial gap": 2,
  "gap": 1,
  "critical gap": 0,
};

function rank(status: string): number {
  return STATUS_RANK[(status || "").toLowerCase()] ?? -1;
}

function deltaLabel(prev: string, next: string): { label: string; tone: string } {
  const p = rank(prev);
  const n = rank(next);
  if (p < 0 || n < 0) return { label: "—", tone: "text-muted-foreground" };
  if (n > p) return { label: `Improved (+${n - p})`, tone: "text-green-700 font-medium" };
  if (n < p) return { label: `Worsened (−${p - n})`, tone: "text-red-700 font-medium" };
  return { label: "No change", tone: "text-muted-foreground" };
}

export default function CPPACybersecurityDrift() {
  const { newId, oldId } = useParams();
  const [next, setNext] = useState<Assessment | null>(null);
  const [prev, setPrev] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!newId || !oldId) return;
    (async () => {
      const [{ data: nData }, { data: pData }] = await Promise.all([
        supabase.from("cppa_assessments").select("id,created_at,report_data").eq("id", newId).maybeSingle(),
        supabase.from("cppa_assessments").select("id,created_at,report_data").eq("id", oldId).maybeSingle(),
      ]);
      setNext(nData as Assessment | null);
      setPrev(pData as Assessment | null);
      setLoading(false);
    })();
  }, [newId, oldId]);

  const nextControls: ControlRow[] = Array.isArray(next?.report_data?.controls) ? next!.report_data.controls : [];
  const prevControls: ControlRow[] = Array.isArray(prev?.report_data?.controls) ? prev!.report_data.controls : [];
  const prevByLabel = new Map(prevControls.map((c) => [c.control, c]));
  const nextByLabel = new Map(nextControls.map((c) => [c.control, c]));
  const allLabels = Array.from(new Set([...prevByLabel.keys(), ...nextByLabel.keys()]));

  const nextScore = next?.report_data?.overall_score;
  const prevScore = prev?.report_data?.overall_score;
  const scoreDelta = typeof nextScore === "number" && typeof prevScore === "number" ? nextScore - prevScore : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>CPPA Cybersecurity Drift Comparison | End User Privacy</title></Helmet>
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <BackLink to="/dashboard/reports" label="Back to My Reports" />
        <header>
          <p className="text-[11px] font-mono tracking-widest text-muted-foreground uppercase">CPPA Cybersecurity · Drift Comparison</p>
          <h1 className="font-serif mt-1">Year-over-Year Control Drift</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Side-by-side comparison of your cybersecurity assessments. Use this to show the auditor what
            changed since the prior year and to evidence remediation progress against § 7122(a) components.
          </p>
        </header>

        {loading && <p>Loading…</p>}

        {!loading && (!next || !prev) && (
          <div className="bg-card border rounded-lg p-6">
            <p>One or both assessments could not be loaded. <Link to="/dashboard/reports" className="underline">Back to My Reports</Link>.</p>
          </div>
        )}

        {!loading && next && prev && (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-card border rounded-lg p-4">
                <p className="text-[11px] font-mono uppercase text-muted-foreground">Prior</p>
                <p className="text-sm">{new Date(prev.created_at).toLocaleDateString()}</p>
                <p className="text-xs mt-1">Overall score: <strong>{prevScore ?? "—"}</strong></p>
                <p className="text-xs">Readiness: {prev.report_data?.readiness_level || "—"}</p>
              </div>
              <div className="bg-card border rounded-lg p-4">
                <p className="text-[11px] font-mono uppercase text-muted-foreground">Current</p>
                <p className="text-sm">{new Date(next.created_at).toLocaleDateString()}</p>
                <p className="text-xs mt-1">Overall score: <strong>{nextScore ?? "—"}</strong>{scoreDelta !== null && (
                  <span className={`ml-2 ${scoreDelta > 0 ? "text-green-700" : scoreDelta < 0 ? "text-red-700" : "text-muted-foreground"}`}>
                    ({scoreDelta > 0 ? "+" : ""}{scoreDelta})
                  </span>
                )}</p>
                <p className="text-xs">Readiness: {next.report_data?.readiness_level || "—"}</p>
              </div>
            </div>

            <section className="bg-card border rounded-lg p-6">
              <h2 className="mb-3">Control Drift</h2>
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full min-w-[640px] text-xs border-collapse">

                  <thead className="text-left bg-muted/40">
                    <tr>
                      <th className="p-2 border">Control</th>
                      <th className="p-2 border">Prior status</th>
                      <th className="p-2 border">Current status</th>
                      <th className="p-2 border">Drift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allLabels.map((label) => {
                      const p = prevByLabel.get(label);
                      const n = nextByLabel.get(label);
                      const d = deltaLabel(p?.status || "", n?.status || "");
                      return (
                        <tr key={label} className="border-t align-top">
                          <td className="p-2 border">{label}</td>
                          <td className="p-2 border">
                            {p?.status ? (
                              <span className={`px-2 py-0.5 text-xs rounded ${controlStatusColor(p.status)}`}>{p.status}</span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="p-2 border">
                            {n?.status ? (
                              <span className={`px-2 py-0.5 text-xs rounded ${controlStatusColor(n.status)}`}>{n.status}</span>
                            ) : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className={`p-2 border text-[11px] ${d.tone}`}>{d.label}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="flex gap-2 flex-wrap">
              <Button asChild variant="outline"><Link to={`/cppa-cybersecurity/result/${next.id}`}>View current report</Link></Button>
              <Button asChild variant="outline"><Link to={`/cppa-cybersecurity/result/${prev.id}`}>View prior report</Link></Button>
              <Button asChild><Link to="/dashboard/reports">Back to My Reports</Link></Button>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
