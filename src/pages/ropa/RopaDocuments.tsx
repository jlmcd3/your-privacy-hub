import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { RopaShell } from "@/components/ropa/RopaShell";
import { RopaBreadcrumb } from "@/components/ropa/RopaBreadcrumb";
import { getRopaSteps } from "@/components/ropa/ropaFlowSteps";
import { useRopaSessionParam, withSession } from "@/lib/ropaSession";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { FileText, FileSpreadsheet, Download, RefreshCw, Plus, Globe2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { CrossToolPrompt, RelatedToolsChips } from "@/components/cross-tool/CrossToolPrompts";
import { useActiveClient } from "@/hooks/useActiveClient";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { adminDelete } from "@/lib/adminDelete";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ReportTranslateMenu from "@/components/ReportTranslateMenu";



type SessionRow = {
  id: string;
  status: string;
  version_number: number;
  completed_at: string | null;
  last_activity_at: string;
  total_activities: number;
  open_flags_count: number;
  is_refresh: boolean;
  payment_confirmed: boolean;
  org_name: string | null;
};

type DocVersion = {
  id: string;
  session_id: string;
  document_format: "pdf" | "docx" | "xlsx";
  file_path: string;
  file_size_bytes: number | null;
  jurisdictions_covered: string[];
  activities_count: number;
  generated_at: string;
  is_current: boolean;
};

const FORMAT_META: Record<string, { label: string; icon: typeof FileText; ext: string }> = {
  pdf: { label: "PDF", icon: FileText, ext: "pdf" },
  xlsx: { label: "Excel", icon: FileSpreadsheet, ext: "xlsx" },
};

export default function RopaDocuments() {
  const navigate = useNavigate();
  const urlSessionId = useRopaSessionParam();
  const { toast } = useToast();
  const { clientName, isPersonalActive } = useActiveClient();
  const { isAdmin } = useIsAdmin();
  const ownerLabel = !isPersonalActive && clientName ? clientName : "My";
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  const [docs, setDocs] = useState<Record<string, DocVersion[]>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [hasUsNotices, setHasUsNotices] = useState<boolean>(true);
  const [hasEuNotices, setHasEuNotices] = useState<boolean>(true);
  const [needsUs, setNeedsUs] = useState<boolean>(false);
  const [needsEu, setNeedsEu] = useState<boolean>(false);
  const [pendingDeleteSession, setPendingDeleteSession] = useState<SessionRow | null>(null);
  const [pendingDeleteDoc, setPendingDeleteDoc] = useState<DocVersion | null>(null);
  const [deleting, setDeleting] = useState(false);


  useEffect(() => {
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: usCount } = await (supabase as any)
          .from('us_notice_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'completed');
        setHasUsNotices((usCount ?? 0) > 0);
      } catch {
        setHasUsNotices(true);
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: euCount } = await (supabase as any)
          .from('eu_notice_documents')
          .select('id', { count: 'exact', head: true })
          .eq('is_current', true);
        setHasEuNotices((euCount ?? 0) > 0);
      } catch {
        setHasEuNotices(true);
      }
      try {
        const { data: regions } = await supabase
          .from('ropa_jurisdiction_selections')
          .select('jurisdiction_region');
        const set = new Set((regions ?? []).map((r: { jurisdiction_region: string }) => r.jurisdiction_region));
        setNeedsUs(set.has('United States'));
        setNeedsEu(set.has('EU & UK'));
      } catch {
        setNeedsUs(false);
        setNeedsEu(false);
      }
    })();
  }, []);


  useEffect(() => {
    void loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data: sess, error: sErr } = await supabase
        .from("ropa_sessions")
        .select("id,status,version_number,completed_at,last_activity_at,total_activities,open_flags_count,is_refresh,payment_confirmed,org_name")
        .in("status", ["in_progress", "review", "generated"])
        .order("last_activity_at", { ascending: false });
      if (sErr) throw sErr;

      const sessionList = (sess || []) as SessionRow[];
      setSessions(sessionList);

      if (sessionList.length === 0) {
        setDocs({});
        return;
      }

      const sessionIds = sessionList.map((s) => s.id);
      const { data: docRows, error: dErr } = await supabase
        .from("ropa_document_versions")
        .select("*")
        .in("session_id", sessionIds);
      if (dErr) throw dErr;

      const grouped: Record<string, DocVersion[]> = {};
      (docRows || []).forEach((d) => {
        const row = d as DocVersion;
        if (!grouped[row.session_id]) grouped[row.session_id] = [];
        grouped[row.session_id].push(row);
      });
      setDocs(grouped);
    } catch (err) {
      console.error("Failed to load RoPA documents:", err);
      toast({
        title: "Failed to load documents",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Poll a ROPA session until it leaves processing. 3-minute timeout.
  // Left as an awaited poll rather than the useGenerationStatus hook because
  // the download/regenerate flows must await terminal state to chain the
  // signed-URL fetch — the hook's subscription model can't express that.
  const pollSessionUntilTerminal = async (
    sessionIdToPoll: string,
  ): Promise<
    | { outcome: "generated" }
    | { outcome: "failed"; error: string | null }
    | { outcome: "timeout" }
  > => {
    const POLL_INTERVAL_MS = 3000;
    const MAX_POLLS = 60;
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const { data: row } = await supabase
        .from("ropa_sessions")
        .select("status, generation_error")
        .eq("id", sessionIdToPoll)
        .maybeSingle();
      if (row?.status === "generated") return { outcome: "generated" };
      if (row?.status === "failed") {
        const err = (row as { generation_error?: string | null } | null)?.generation_error ?? null;
        return { outcome: "failed", error: err };
      }
    }
    return { outcome: "timeout" };
  };

  const handleDownload = async (doc: DocVersion) => {
    setDownloadingId(doc.id);
    try {
      const { error: genError } = await supabase.functions.invoke("generate-ropa-document", {
        body: { session_id: doc.session_id, format: doc.document_format },
      });
      if (genError) throw genError;

      const terminal = await pollSessionUntilTerminal(doc.session_id);
      if (terminal.outcome === "failed") {
        throw new Error(terminal.error?.trim() || "Generation failed — please try again.");
      }
      if (terminal.outcome === "timeout") throw new Error("Generation timed out. Please try again.");

      // Read the freshly written signed URL from the version row.
      const { data: ver } = await supabase
        .from("ropa_document_versions")
        .select("last_signed_url")
        .eq("session_id", doc.session_id)
        .eq("document_format", doc.document_format)
        .eq("is_current", true)
        .maybeSingle();
      const signedUrl = (ver as { last_signed_url?: string } | null)?.last_signed_url;
      if (!signedUrl) throw new Error("No signed URL");

      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error("Could not fetch document");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `ropa_v${doc.session_id.slice(0, 8)}.${FORMAT_META[doc.document_format].ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
      void loadDocuments();
    } catch (err) {
      console.error("Download failed:", err);
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRegenerate = async (sessionId: string) => {
    setDownloadingId(sessionId);
    try {
      const { error } = await supabase.functions.invoke("generate-ropa-document", {
        body: { session_id: sessionId },
      });
      if (error) throw error;
      toast({ title: "Regenerating documents…", description: "This usually takes under a minute." });
      const terminal = await pollSessionUntilTerminal(sessionId);
      if (terminal === "failed") throw new Error("Generation failed — please try again.");
      if (terminal === "timeout") throw new Error("Generation timed out. Please try again.");
      toast({ title: "Documents regenerated", description: "Refreshing list…" });
      await loadDocuments();
    } catch (err) {
      console.error("Regenerate failed:", err);
      toast({
        title: "Regenerate failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };


  const confirmDeleteSession = async () => {
    if (!pendingDeleteSession) return;
    setDeleting(true);
    try {
      await adminDelete("ropa_session", pendingDeleteSession.id);
      toast({ title: "RoPA session deleted" });
      setPendingDeleteSession(null);
      await loadDocuments();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const confirmDeleteDoc = async () => {
    if (!pendingDeleteDoc) return;
    setDeleting(true);
    try {
      await adminDelete("ropa_document", pendingDeleteDoc.id);
      toast({ title: "Document deleted" });
      setPendingDeleteDoc(null);
      await loadDocuments();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };


  return (
    <RopaShell title={`${ownerLabel} RoPA Documents — End User Privacy`} heading={`${ownerLabel} RoPA Documents`}>
      {(() => {
        const { steps, currentIndex } = getRopaSteps("documents", urlSessionId);
        return <RopaBreadcrumb steps={steps} currentIndex={currentIndex} />;
      })()}
      <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
        <p className="font-body text-muted-foreground">
          Download generated Records of Processing Activities and start refresh cycles.
        </p>
        <div className="flex items-center gap-2">
          {sessions[0]?.id && (
            <ReportTranslateMenu
              toolType="ropa"
              reportId={sessions[0].id}
              onTranslated={() => { /* file-based RoPA: payload swap not yet wired */ }}
            />
          )}
          <Button onClick={() => navigate("/ropa/setup?new=1")} className="gap-2">
            <Plus className="h-4 w-4" />
            New RoPA
          </Button>
        </div>
      </div>

      {/* Notice CTA is jurisdiction-aware: only promote products that match the company's selected regions. */}
      {needsUs && !hasUsNotices ? (
        <CrossToolPrompt
          visitKey="/ropa/documents"
          dismissKey="us_notice_prompt_dismissed"
          icon={<FileText className="w-5 h-5" />}
          title="📋 Add US state privacy notices?"
          body="Your RoPA data pre-populates most answers. Takes 5–12 minutes."
          ctaLabel="Generate US notices →"
          ctaTo="/us-notices/mode?mode=ropa_powered"
          enabled={sessions.length > 0}
        />
      ) : needsEu && !hasEuNotices ? (
        <CrossToolPrompt
          visitKey="/ropa/documents"
          dismissKey="eu_notice_prompt_dismissed"
          icon={<Globe2 className="w-5 h-5" />}
          title="🌍 Add EU & UK privacy notices?"
          body="Your RoPA data pre-populates most answers. Takes 8–18 minutes."
          ctaLabel="Generate EU notices →"
          ctaTo="/eu-notices/mode?mode=ropa_powered"
          enabled={sessions.length > 0}
        />
      ) : null}


      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="font-heading mb-2">No RoPA documents yet</h3>
            <p className="font-body text-muted-foreground mb-6">
              Complete the RoPA builder to generate your first Record of Processing Activities.
            </p>
            <Button onClick={() => navigate("/ropa/setup?new=1")}>Start RoPA Builder</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => {
            const sessionDocs = docs[s.id] || [];
            const generated = s.status === "generated" && sessionDocs.length > 0;
            return (
              <Card key={s.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="font-heading text-lg flex items-center gap-2">
                        {s.org_name?.trim() ? `${s.org_name.trim()} - ` : ""}Version {s.version_number}
                        {s.is_refresh && (
                          <Badge variant="outline" className="text-xs">Refresh</Badge>
                        )}
                        <Badge
                          variant={s.status === "generated" ? "default" : "secondary"}
                          className="text-xs capitalize"
                        >
                          {s.status}
                        </Badge>
                      </CardTitle>
                      <p className="font-body text-sm text-muted-foreground mt-1">
                        {s.completed_at
                          ? `Generated ${format(new Date(s.completed_at), "MMM d, yyyy")}`
                          : `Updated ${format(new Date(s.last_activity_at), "MMM d, yyyy")}`}
                        {" · "}
                        {s.total_activities} {s.total_activities === 1 ? "activity" : "activities"}
                        {s.open_flags_count > 0 && ` · ${s.open_flags_count} open flags`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {generated ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRegenerate(s.id)}
                            disabled={downloadingId === s.id}
                            className="gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Regenerate
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => navigate(`/ropa/refresh/${s.id}`)}
                            className="gap-2"
                          >
                            Start Refresh
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          asChild
                          variant="outline"
                        >
                          <Link
                            to={
                              s.status === "in_progress"
                                ? withSession("/ropa/activities", s.id)
                                : `/ropa/review/${s.id}`
                            }
                          >
                            {s.status === "in_progress" ? "Continue editing" : "Continue Review"}
                          </Link>
                        </Button>
                      )}
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDeleteSession(s)}
                          className="gap-2 text-destructive hover:text-destructive"
                          aria-label="Delete entire RoPA session (admin)"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      )}
                    </div>

                  </div>
                </CardHeader>
                {generated && (
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {(["pdf", "xlsx"] as const).map((fmt) => {
                        const doc = sessionDocs.find((d) => d.document_format === fmt);
                        const meta = FORMAT_META[fmt];
                        const Icon = meta.icon;
                        return (
                          <div key={fmt} className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              disabled={!doc || downloadingId === doc?.id}
                              onClick={() => doc && handleDownload(doc)}
                              className="h-auto flex-1 justify-start gap-3 py-3"
                            >
                              <Icon className="h-5 w-5 shrink-0" />
                              <span className="flex flex-col items-start text-left">
                                <span className="font-medium">{meta.label}</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Download className="h-3 w-3" />
                                  {doc ? "Download" : "Unavailable"}
                                </span>
                              </span>
                            </Button>
                            {isAdmin && doc && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPendingDeleteDoc(doc)}
                                className="text-destructive hover:text-destructive"
                                aria-label={`Delete ${meta.label} (admin)`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {sessionDocs[0]?.jurisdictions_covered?.length > 0 && (
                      <p className="font-mono text-xs text-muted-foreground mt-3">
                        Jurisdictions: {sessionDocs[0].jurisdictions_covered.join(", ")}
                      </p>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!pendingDeleteSession} onOpenChange={(o) => !o && setPendingDeleteSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete entire RoPA session?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the session, all its activities, answers, flags, refresh history, and every generated document version. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void confirmDeleteSession(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingDeleteDoc} onOpenChange={(o) => !o && setPendingDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the generated file and its record. The underlying session and answers remain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void confirmDeleteDoc(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <RelatedToolsChips
        tools={[
          { label: "📋 US Notices", to: "/us-notices" },
          { label: "🌍 EU Notices", to: "/eu-notices" },
        ]}
      />
    </RopaShell>
  );
}
