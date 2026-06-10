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
import { Loader2, FileText, Download, ArrowRight, Trash2 } from "lucide-react";
import WorkspaceLayout from "@/components/dashboard/WorkspaceLayout";
import DriftReminderBanner from "@/components/cppa/DriftReminderBanner";
import { useActiveClient } from "@/hooks/useActiveClient";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

// Map tool key -> Supabase table name used for deletion.
// registration_orders is included, but the RLS DELETE policy only allows
// owners to delete unpaid orders with no filings attached. Admins can
// delete anything via the admin DELETE RLS policies.
const TOOL_TABLE: Partial<Record<string, string>> = {
  li: "li_assessments",
  dpia: "dpia_frameworks",
  governance: "governance_assessments",
  dpa: "dpa_documents",
  ir: "ir_playbooks",
  biometric: "biometric_assessments",
  ropa: "ropa_sessions",
  registration: "registration_orders",
  us_notice: "us_notice_sessions",
  eu_notice: "eu_notice_sessions",
  cppa_risk: "cppa_assessments",
  cppa_cyber: "cppa_assessments",
  cppa_scope: "cppa_scope_checks",
};

type ReportRow = {
  id: string;
  tool: string;
  tool_label: string;
  created_at: string;
  status: string;
  summary: string;
  view_path: string;
  pdf_url?: string | null;
  deletable?: boolean;
  client_id?: string | null;
  client_name?: string | null;
  is_personal_client?: boolean;
};

const TOOL_LABEL: Record<string, string> = {
  li: "Legitimate Interest Assessment",
  dpia: "DPIA Framework",
  governance: "Governance Assessment",
  dpa: "Custom DPA",
  ir: "Incident Response Playbook",
  biometric: "Biometric Compliance Check",
  registration: "Registration Order",
  ropa: "RoPA (Article 30)",
  us_notice: "US Privacy Notice",
  eu_notice: "EU Privacy Notice",
  cppa_risk: "CPPA Risk Assessment",
  cppa_cyber: "CPPA Cybersecurity Audit",
  cppa_scope: "CPPA Scope Check",
};

function statusVariant(s: string): "default" | "secondary" | "outline" {
  if (s === "complete" || s === "documents_ready" || s === "paid") return "default";
  if (s === "failed") return "outline";
  return "secondary";
}

export default function MyReports() {
  const { user, loading: authLoading } = useAuth();
  const { clientId: activeClientId, clientName: activeClientName, isPersonalActive, personal, hasClients } = useActiveClient();
  const { isAdmin } = useIsAdmin();
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Scope reports to the active workspace. When the personal workspace is
  // active, hide anything tied to a real client (and vice versa). Rows with
  // no client_id are treated as personal.
  const visibleRows = rows.filter((r) => {
    if (!hasClients) return true;
    if (isPersonalActive) {
      return !r.client_id || r.client_id === personal?.id;
    }
    return r.client_id === activeClientId;
  });

  async function handleDelete(row: ReportRow) {
    const table = TOOL_TABLE[row.tool];
    if (!table) return;
    const key = `${row.tool}-${row.id}`;
    setDeletingId(key);

    // Admins always go through the force-delete edge function so blocking
    // child rows (NO ACTION FKs, paid registration orders, etc.) are cleared
    // and the delete cannot be blocked by RLS or constraints.
    if (isAdmin) {
      const { data, error } = await supabase.functions.invoke(
        "admin-force-delete-report",
        { body: { tool: row.tool, id: row.id } },
      );
      setDeletingId(null);
      if (error || (data && (data as any).error)) {
        const msg = (data as any)?.error || error?.message || "Unknown error";
        toast({ title: "Couldn't delete report", description: msg, variant: "destructive" });
        return;
      }
      setRows((prev) => prev.filter((x) => !(x.tool === row.tool && x.id === row.id)));
      toast({ title: "Report deleted", description: row.tool_label });
      return;
    }

    const { error } = await supabase.from(table as any).delete().eq("id", row.id);
    setDeletingId(null);
    if (error) {
      toast({
        title: "Couldn't delete report",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    setRows((prev) => prev.filter((x) => !(x.tool === row.tool && x.id === row.id)));
    toast({ title: "Report deleted", description: row.tool_label });
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // Fetch user's client ids so we can attach client context to rows.
      const { data: myClients } = await supabase
        .from("clients")
        .select("id, name, is_personal")
        .eq("owner_id", user.id);
      const clientNameById = new Map<string, string>((myClients || []).map((c: any) => [c.id, c.name]));
      const clientIsPersonalById = new Map<string, boolean>(
        (myClients || []).map((c: any) => [c.id, !!c.is_personal])
      );
      const clientMeta = (cid?: string | null) => ({
        client_id: cid ?? null,
        client_name: cid ? clientNameById.get(cid) ?? null : null,
        is_personal_client: cid ? !!clientIsPersonalById.get(cid) : false,
      });

      // Reports tab aggregates every tool output and in-progress session for
      // the user across all workspaces. Registration orders live under Filings.
      // ropa_/us_notice_/eu_notice_sessions are scoped by client_id (no user_id
      // column) — RLS enforces ownership via client ownership.
      const [li, dpia, gov, dpa, ir, bio, ropa, usNotice, euNotice, cppa, cppaScope] = await Promise.all([
        supabase.from("li_assessments")
          .select("id, status, created_at, processing_description, jurisdictions, pdf_url, client_id")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("dpia_frameworks")
          .select("id, status, created_at, intake_data, pdf_url, client_id")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("governance_assessments")
          .select("id, status, created_at, intake_data, pdf_url, client_id")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("dpa_documents")
          .select("id, status, created_at, intake_data, pdf_url, client_id")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("ir_playbooks")
          .select("id, status, created_at, intake_data, pdf_url, client_id")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("biometric_assessments")
          .select("id, status, created_at, intake_data, jurisdictions, pdf_url, client_id")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("ropa_sessions")
          .select("id, status, created_at, version_number, scope, client_id")
          .order("created_at", { ascending: false }),
        supabase.from("us_notice_sessions")
          .select("id, status, created_at, version_number, scope, client_id")
          .order("created_at", { ascending: false }),
        supabase.from("eu_notice_sessions")
          .select("id, status, created_at, version_number, client_id")
          .order("created_at", { ascending: false }),
        supabase.from("cppa_assessments")
          .select("id, status, created_at, module, intake_data, report_data, pdf_url, client_id")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("cppa_scope_checks")
          .select("id, created_at, in_scope, obligation_map, answers")
          .eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);


      if (cancelled) return;

      const all: ReportRow[] = [];

      (li.data || []).forEach((r: any) => all.push({
        id: r.id, tool: "li", tool_label: TOOL_LABEL.li,
        created_at: r.created_at, status: r.status,
        summary: (r.processing_description || "Untitled processing activity").slice(0, 110),
        view_path: `/li-assessment/result/${r.id}`,
        pdf_url: r.pdf_url,
        ...clientMeta(r.client_id),
      }));
      (dpia.data || []).forEach((r: any) => all.push({
        id: r.id, tool: "dpia", tool_label: TOOL_LABEL.dpia,
        created_at: r.created_at, status: r.status,
        summary: r.intake_data?.processing_name || r.intake_data?.project_name || "DPIA",
        view_path: `/dpia-framework/result/${r.id}`,
        pdf_url: r.pdf_url,
        ...clientMeta(r.client_id),
      }));
      (gov.data || []).forEach((r: any) => all.push({
        id: r.id, tool: "governance", tool_label: TOOL_LABEL.governance,
        created_at: r.created_at, status: r.status,
        summary: r.intake_data?.organisation_name || r.intake_data?.organization_name || "Governance assessment",
        view_path: `/governance-assessment/result/${r.id}`,
        pdf_url: r.pdf_url,
        ...clientMeta(r.client_id),
      }));
      (dpa.data || []).forEach((r: any) => all.push({
        id: r.id, tool: "dpa", tool_label: TOOL_LABEL.dpa,
        created_at: r.created_at, status: r.status,
        summary: `${r.intake_data?.controllerName || "Controller"} → ${r.intake_data?.processorName || "Processor"}`,
        view_path: `/dpa-generator/result/${r.id}`,
        pdf_url: r.pdf_url,
        ...clientMeta(r.client_id),
      }));
      (ir.data || []).forEach((r: any) => all.push({
        id: r.id, tool: "ir", tool_label: TOOL_LABEL.ir,
        created_at: r.created_at, status: r.status,
        summary: `Incident · ${(r.intake_data?.jurisdictions || []).join(", ") || "—"}`,
        view_path: `/ir-playbook/result/${r.id}`,
        pdf_url: r.pdf_url,
        ...clientMeta(r.client_id),
      }));
      (bio.data || []).forEach((r: any) => all.push({
        id: r.id, tool: "biometric", tool_label: TOOL_LABEL.biometric,
        created_at: r.created_at, status: r.status,
        summary: `${(r.jurisdictions || []).join(", ") || "Biometric scan"}`,
        view_path: `/biometric-checker/result/${r.id}`,
        pdf_url: r.pdf_url,
        ...clientMeta(r.client_id),
      }));
      (ropa.data || []).forEach((r: any) => {
        const inProgress = r.status === "in_progress";
        const scopeParts: string[] = [];
        if (r.version_number) scopeParts.push(`v${r.version_number}`);
        if (r.scope && typeof r.scope === "object") {
          const states = Array.isArray((r.scope as any).states) ? (r.scope as any).states : null;
          const frameworks = Array.isArray((r.scope as any).frameworks) ? (r.scope as any).frameworks : null;
          if (states?.length) scopeParts.push(states.join(", "));
          if (frameworks?.length) scopeParts.push(frameworks.join(", "));
        }
        all.push({
          id: r.id, tool: "ropa", tool_label: TOOL_LABEL.ropa,
          created_at: r.created_at, status: r.status,
          summary: scopeParts.join(" · ") || "Record of Processing Activities",
          view_path: inProgress ? `/ropa/activities?session=${r.id}` : "/ropa/documents",
          ...clientMeta(r.client_id),
        });
      });
      (usNotice.data || []).forEach((r: any) => {
        const inProgress = r.status === "in_progress" || r.status === "draft";
        const scopeParts: string[] = [];
        if (r.version_number) scopeParts.push(`v${r.version_number}`);
        if (r.scope && typeof r.scope === "object") {
          const states = Array.isArray((r.scope as any).states) ? (r.scope as any).states : null;
          if (states?.length) scopeParts.push(states.join(", "));
        }
        all.push({
          id: r.id, tool: "us_notice", tool_label: TOOL_LABEL.us_notice,
          created_at: r.created_at, status: r.status,
          summary: scopeParts.join(" · ") || "US Privacy Notice",
          view_path: inProgress ? `/us-notices/${r.id}/questions` : `/us-notices/${r.id}/documents`,
          ...clientMeta(r.client_id),
        });
      });
      (euNotice.data || []).forEach((r: any) => {
        const inProgress = r.status === "in_progress" || r.status === "draft";
        const scopeParts: string[] = [];
        if (r.version_number) scopeParts.push(`v${r.version_number}`);
        all.push({
          id: r.id, tool: "eu_notice", tool_label: TOOL_LABEL.eu_notice,
          created_at: r.created_at, status: r.status,
          summary: scopeParts.join(" · ") || "EU Privacy Notice",
          view_path: inProgress ? "/eu-notices" : "/eu-notices/documents",
          ...clientMeta(r.client_id),
        });
      });

      (cppa.data || []).forEach((r: any) => {
        const isCyber = r.module === "cybersecurity";
        const tool = isCyber ? "cppa_cyber" : "cppa_risk";
        const basePath = isCyber ? "/cppa-cybersecurity/result" : "/cppa-risk-assessment/result";
        const sector = r.intake_data?.q3_sector || r.intake_data?.industry_sector || r.intake_data?.profile?.sector;
        const revenue = r.intake_data?.q1_revenue || r.intake_data?.profile?.revenue;
        const summaryParts = [sector, revenue].filter(Boolean);
        all.push({
          id: r.id, tool, tool_label: TOOL_LABEL[tool],
          created_at: r.created_at,
          status: r.report_data ? (r.status || "complete") : (r.status || "pending"),
          summary: summaryParts.join(" · ") || (isCyber ? "CPPA Cybersecurity Audit" : "CPPA Risk Assessment"),
          view_path: `${basePath}/${r.id}`,
          pdf_url: r.pdf_url,
          ...clientMeta(r.client_id),
        });

      });

      (cppaScope.data || []).forEach((r: any) => {
        const obligations = r.obligation_map && typeof r.obligation_map === "object"
          ? Object.entries(r.obligation_map).filter(([, v]) => v === true).map(([k]) => k)
          : [];
        const outcome = r.in_scope === true
          ? (obligations.length > 0
              ? `In scope · ${obligations.length} obligation${obligations.length === 1 ? "" : "s"}`
              : "In scope")
          : r.in_scope === false ? "Out of scope" : "Scope check";
        all.push({
          id: r.id,
          tool: "cppa_scope",
          tool_label: TOOL_LABEL.cppa_scope,
          created_at: r.created_at,
          status: r.in_scope === null ? "in_progress" : "complete",
          summary: outcome,
          // No per-result page exists; the checker re-renders the latest run.
          view_path: "/cppa-scope-checker",
          client_id: null,
          client_name: null,
          is_personal_client: false,
        });
      });


      all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setRows(all);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const ownerLabel = !isPersonalActive && activeClientName ? activeClientName : "My";


  return (
    <WorkspaceLayout>
      <Helmet>
        <title>{ownerLabel} Reports | End User Privacy</title>
        <meta name="description" content="View and download every assessment, playbook, and report you've generated." />
      </Helmet>
      <PageContainer>
        <div className="py-8">
          <div className="mb-6">
            <h1 className="font-display text-brand-navy">{ownerLabel} Reports</h1>
            <p className="text-sm text-slate mt-1">
              Every assessment, playbook, and document you've generated. Click any item to re-open it or download the PDF.
            </p>
          </div>
          <div className="mb-4">
            <DriftReminderBanner />
          </div>



          {authLoading || loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-navy" /></div>
          ) : visibleRows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-10 h-10 text-brand-mist mx-auto mb-3" />
                <p className="text-slate mb-4">You haven't generated any reports yet.</p>
                <Button asChild><Link to="/tools">Browse tools</Link></Button>
              </CardContent>
            </Card>
          ) : (
            (() => {
              const GROUPS: { key: string; label: string; tools: string[] }[] = [
                { key: "assessments", label: "Compliance Assessments", tools: ["li", "dpia", "governance", "biometric"] },
                { key: "documents", label: "Privacy & Legal Documents", tools: ["dpa", "ir", "ropa", "us_notice", "eu_notice"] },
                { key: "cppa", label: "CPPA Audit Suite", tools: ["cppa_risk", "cppa_cyber", "cppa_scope"] },
                { key: "registration", label: "Registration", tools: ["registration"] },
              ];
              const grouped = GROUPS.map((g) => ({
                ...g,
                rows: visibleRows.filter((r) => g.tools.includes(r.tool)),
              })).filter((g) => g.rows.length > 0);

              return (
                <div className="space-y-8">
                  {grouped.map((group) => (
                    <section key={group.key}>
                      <div className="border-l-2 border-[#2563EB] pl-3 mb-3 flex items-baseline gap-2">
                        <h2 className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold m-0">
                          {group.label}
                        </h2>
                        <span className="text-[11px] text-muted-foreground">
                          {group.rows.length} {group.rows.length === 1 ? "item" : "items"}
                        </span>
                      </div>
                      <div className="border border-border/40 rounded-lg overflow-hidden bg-card">
                        {group.rows.map((r) => (
                          <div
                            key={`${r.tool}-${r.id}`}
                            className="flex items-center justify-between gap-4 py-3 px-4 border-b border-border/30 last:border-0"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline gap-2 min-w-0">
                                <span className="font-medium text-[13px] text-brand-navy shrink-0">
                                  {r.tool_label}
                                </span>
                                <span className="text-[12px] text-slate-500 truncate max-w-[420px]">
                                  — {r.summary}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {new Date(r.created_at).toLocaleDateString()} · {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </p>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-2">
                              {r.status === "in_progress" ? (
                                <Badge className="text-[10px] py-0 px-1.5 h-5 bg-amber-100 text-amber-800 hover:bg-amber-100 border-transparent">
                                  in progress
                                </Badge>
                              ) : (
                                <Badge variant={statusVariant(r.status)} className="text-[10px] py-0 px-1.5 h-5">
                                  {(r.status || "—").replace(/_/g, " ")}
                                </Badge>
                              )}
                              {r.client_name && !r.is_personal_client && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] py-0 px-1.5 h-5 border-brand-teal/40 text-brand-teal"
                                  title={`Client workspace: ${r.client_name}`}
                                >
                                  {r.client_name}
                                </Badge>
                              )}
                              {r.is_personal_client && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 text-muted-foreground">
                                  Personal
                                </Badge>
                              )}
                              {r.pdf_url && (
                                <a
                                  href={r.pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="PDF available — click to open"
                                  className="inline-flex items-center gap-1 text-brand-navy/60 hover:text-brand-navy no-underline"
                                >
                                  <FileText className="w-[14px] h-[14px]" />
                                  <span className="text-[10px] text-slate-400">PDF</span>
                                </a>
                              )}
                              <Button asChild size="sm" variant="outline" className="text-[12px] h-7">
                                <Link to={r.view_path}>
                                  {r.status === "in_progress" ? "Continue →" : "View →"}
                                </Link>
                              </Button>
                              {TOOL_TABLE[r.tool] && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive/50 hover:text-destructive h-7 w-7 p-0"
                                      disabled={deletingId === `${r.tool}-${r.id}`}
                                      aria-label={`Delete ${r.tool_label}`}
                                    >
                                      {deletingId === `${r.tool}-${r.id}` ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                      )}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>
                                        {r.client_name && !r.is_personal_client
                                          ? `Delete this ${r.client_name} report?`
                                          : "Delete this report?"}
                                      </AlertDialogTitle>
                                      <AlertDialogDescription>
                                        {r.client_name && !r.is_personal_client ? (
                                          <>
                                            This report belongs to <strong>{r.client_name}</strong>. Deleting it
                                            here permanently removes it from that client workspace too.
                                            {r.summary ? <> Report: "{r.summary}".</> : null} This action cannot be undone.
                                          </>
                                        ) : (
                                          <>
                                            This will permanently remove your {r.tool_label.toLowerCase()}
                                            {r.summary ? ` ("${r.summary}")` : ""}. This action cannot be undone.
                                          </>
                                        )}
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDelete(r)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              );
            })()
          )}
        </div>
      </PageContainer>
    </WorkspaceLayout>
  );
}
