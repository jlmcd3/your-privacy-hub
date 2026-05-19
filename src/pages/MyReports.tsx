// Unified list of all assessments and tool outputs the signed-in user has generated.
// Pulls from every tool table in parallel and links to the existing per-tool result pages.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageContainer from "@/components/PageContainer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, FileText, Download, ArrowRight } from "lucide-react";
import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";

type ReportRow = {
  id: string;
  tool: string;
  tool_label: string;
  created_at: string;
  status: string;
  summary: string;
  view_path: string;
  pdf_url?: string | null;
};

const TOOL_LABEL: Record<string, string> = {
  li: "Legitimate Interest Assessment",
  dpia: "DPIA Framework",
  governance: "Governance Assessment",
  dpa: "Custom DPA",
  ir: "Breach Response Playbook",
  biometric: "Biometric Compliance Check",
  registration: "Registration Order",
};

function statusVariant(s: string): "default" | "secondary" | "outline" {
  if (s === "complete" || s === "documents_ready" || s === "paid") return "default";
  if (s === "failed") return "outline";
  return "secondary";
}

export default function MyReports() {
  const { user, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Fetch user's client ids first to scope ropa sessions
      const { data: myClients } = await supabase
        .from("clients")
        .select("id, name")
        .eq("owner_id", user.id);
      const clientIds = (myClients || []).map((c: any) => c.id);
      const clientNameById = new Map<string, string>((myClients || []).map((c: any) => [c.id, c.name]));

      const [li, dpia, gov, dpa, ir, bio, reg, ropa] = await Promise.all([
        supabase.from("li_assessments")
          .select("id, status, created_at, processing_description, jurisdictions, pdf_url")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("dpia_frameworks")
          .select("id, status, created_at, intake_data, pdf_url")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("governance_assessments")
          .select("id, status, created_at, intake_data, pdf_url")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("dpa_documents")
          .select("id, status, created_at, intake_data, pdf_url")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("ir_playbooks")
          .select("id, status, created_at, intake_data, pdf_url")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("biometric_assessments")
          .select("id, status, created_at, intake_data, jurisdictions, pdf_url")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("registration_orders")
          .select("id, fulfillment_status, payment_status, created_at, jurisdictions, tier")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        clientIds.length > 0
          ? supabase.from("ropa_sessions")
              .select("id, client_id, status, created_at, updated_at, last_activity_at, completed_activities, total_activities")
              .in("client_id", clientIds)
              .eq("status", "in_progress")
              .order("last_activity_at", { ascending: false })
          : Promise.resolve({ data: [] as any[] } as any),
      ]);

      if (cancelled) return;

      const all: ReportRow[] = [];

      (li.data || []).forEach((r: any) => all.push({
        id: r.id, tool: "li", tool_label: TOOL_LABEL.li,
        created_at: r.created_at, status: r.status,
        summary: (r.processing_description || "Untitled processing activity").slice(0, 110),
        view_path: `/li-assessment/result/${r.id}`,
        pdf_url: r.pdf_url,
      }));
      (dpia.data || []).forEach((r: any) => all.push({
        id: r.id, tool: "dpia", tool_label: TOOL_LABEL.dpia,
        created_at: r.created_at, status: r.status,
        summary: r.intake_data?.processing_name || r.intake_data?.project_name || "DPIA",
        view_path: `/dpia-framework/result/${r.id}`,
        pdf_url: r.pdf_url,
      }));
      (gov.data || []).forEach((r: any) => all.push({
        id: r.id, tool: "governance", tool_label: TOOL_LABEL.governance,
        created_at: r.created_at, status: r.status,
        summary: r.intake_data?.organisation_name || r.intake_data?.organization_name || "Governance assessment",
        view_path: `/governance-assessment/result/${r.id}`,
        pdf_url: r.pdf_url,
      }));
      (dpa.data || []).forEach((r: any) => all.push({
        id: r.id, tool: "dpa", tool_label: TOOL_LABEL.dpa,
        created_at: r.created_at, status: r.status,
        summary: `${r.intake_data?.controllerName || "Controller"} → ${r.intake_data?.processorName || "Processor"}`,
        view_path: `/dpa-generator/result/${r.id}`,
        pdf_url: r.pdf_url,
      }));
      (ir.data || []).forEach((r: any) => all.push({
        id: r.id, tool: "ir", tool_label: TOOL_LABEL.ir,
        created_at: r.created_at, status: r.status,
        summary: `Incident · ${(r.intake_data?.jurisdictions || []).join(", ") || "—"}`,
        view_path: `/ir-playbook/result/${r.id}`,
        pdf_url: r.pdf_url,
      }));
      (bio.data || []).forEach((r: any) => all.push({
        id: r.id, tool: "biometric", tool_label: TOOL_LABEL.biometric,
        created_at: r.created_at, status: r.status,
        summary: `${(r.jurisdictions || []).join(", ") || "Biometric scan"}`,
        view_path: `/biometric-checker/result/${r.id}`,
        pdf_url: r.pdf_url,
      }));
      (reg.data || []).forEach((r: any) => all.push({
        id: r.id, tool: "registration", tool_label: TOOL_LABEL.registration,
        created_at: r.created_at, status: r.fulfillment_status || r.payment_status,
        summary: `${r.tier} · ${(r.jurisdictions || []).length} jurisdiction${(r.jurisdictions || []).length === 1 ? "" : "s"}`,
        view_path: `/registration-manager/order/${r.id}`,
      }));
      (ropa?.data || []).forEach((r: any) => {
        const done = r.completed_activities ?? 0;
        const total = r.total_activities ?? 0;
        const orgName = clientNameById.get(r.client_id) || "RoPA";
        const summary = total > 0
          ? `${done} of ${total} activities completed · ${orgName}`
          : (done > 0 ? `${done} activities completed · ${orgName}` : orgName);
        all.push({
          id: r.id,
          tool: "ropa",
          tool_label: "RoPA Builder",
          created_at: r.last_activity_at || r.updated_at || r.created_at,
          status: "in_progress",
          summary,
          view_path: "/ropa/activities",
        });
      });

      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRows(all);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  return (
    <WorkspaceLayout>
      <Helmet>
        <title>My Reports | End User Privacy</title>
        <meta name="description" content="View and download every assessment, playbook, and report you've generated." />
      </Helmet>
      <PageContainer>
        <div className="py-8">
          <div className="mb-6">
            <h1 className="font-display text-navy">My Reports</h1>
            <p className="text-sm text-slate mt-1">
              Every assessment, playbook, and document you've generated. Click any item to re-open it or download the PDF.
            </p>
          </div>

          {authLoading || loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-navy" /></div>
          ) : rows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-10 h-10 text-slate-light mx-auto mb-3" />
                <p className="text-slate mb-4">You haven't generated any reports yet.</p>
                <Button asChild><Link to="/tools">Browse tools</Link></Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <Card key={`${r.tool}-${r.id}`} className="border-border/60">
                  <CardContent className="py-4 flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-display font-semibold text-navy text-[14px]">{r.tool_label}</span>
                        {r.status === "in_progress" ? (
                          <Badge className="text-[11px] bg-amber-100 text-amber-800 hover:bg-amber-100 border-transparent">
                            in progress
                          </Badge>
                        ) : (
                          <Badge variant={statusVariant(r.status)} className="text-[11px]">
                            {(r.status || "—").replace(/_/g, " ")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate truncate">{r.summary}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {new Date(r.created_at).toLocaleDateString()} · {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {r.pdf_url && (
                        <Button asChild size="sm" variant="outline">
                          <a href={r.pdf_url} target="_blank" rel="noopener noreferrer">
                            <Download className="w-3.5 h-3.5 mr-1" /> PDF
                          </a>
                        </Button>
                      )}
                      <Button asChild size="sm">
                        <Link to={r.view_path}>
                          {r.status === "in_progress" ? "Continue" : "View"} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PageContainer>
    </WorkspaceLayout>
  );
}
