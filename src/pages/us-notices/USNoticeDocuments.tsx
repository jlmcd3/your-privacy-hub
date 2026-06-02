import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Clock,
  Trash2,
} from "lucide-react";
import { USNoticeShell } from "@/components/us-notices/USNoticeShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUsNoticeSessionGuard } from "@/hooks/useUsNoticeSessionGuard";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { adminDelete } from "@/lib/adminDelete";
import { Globe2 } from "lucide-react";
import { CrossToolPrompt, RelatedToolsChips } from "@/components/cross-tool/CrossToolPrompts";


interface SessionRow {
  id: string;
  status: string;
  scope: string | null;
  mode: string | null;
  version_number: number | null;
  completed_at: string | null;
}

interface StateRow {
  state_code: string;
  state_name: string;
  framework_type: string;
}

interface DocumentRow {
  id: string;
  state_code: string | null;
  framework_type: string | null;
  is_combined: boolean;
  version_number: number;
  document_format: string;
  file_path: string | null;
  file_size_bytes: number | null;
  generated_at: string;
  is_current: boolean;
}

const FRAMEWORK_LABELS: Record<string, string> = {
  ccpa: "CCPA",
  virginia_model: "Virginia model",
  maryland: "MODPA",
  florida: "FDBR",
  pending: "Pending",
};

function formatBytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function USNoticeDocuments() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { toast } = useToast();
  const { authorized } = useUsNoticeSessionGuard(sessionId);
  const { isAdmin } = useIsAdmin();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [states, setStates] = useState<StateRow[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [hasEuNotices, setHasEuNotices] = useState<boolean>(true);
  const [pendingDelete, setPendingDelete] = useState<DocumentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminDelete("us_notice_document", pendingDelete.id);
      toast({ title: "Notice deleted" });
      setPendingDelete(null);
      await load();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }


  useEffect(() => {
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count } = await (supabase as any)
          .from('eu_notice_documents')
          .select('id', { count: 'exact', head: true })
          .eq('is_current', true);
        setHasEuNotices((count ?? 0) > 0);
      } catch {
        setHasEuNotices(true);
      }
    })();
  }, []);

  async function load() {
    if (!sessionId) return;
    setLoading(true);
    try {
      const [sessionRes, statesRes, docsRes] = await Promise.all([
        supabase
          .from("us_notice_sessions")
          .select("id, status, scope, mode, version_number, completed_at")
          .eq("id", sessionId)
          .maybeSingle(),
        supabase
          .from("us_notice_state_selections")
          .select("state_code, state_name, framework_type")
          .eq("session_id", sessionId),
        supabase
          .from("us_notice_documents")
          .select(
            "id, state_code, framework_type, is_combined, version_number, document_format, file_path, file_size_bytes, generated_at, is_current",
          )
          .eq("session_id", sessionId)
          .order("generated_at", { ascending: false }),
      ]);

      if (sessionRes.error) throw sessionRes.error;
      if (statesRes.error) throw statesRes.error;
      if (docsRes.error) throw docsRes.error;

      setSession(sessionRes.data as SessionRow | null);
      setStates((statesRes.data ?? []) as StateRow[]);
      setDocuments((docsRes.data ?? []) as DocumentRow[]);
    } catch (err) {
      console.error("[USNoticeDocuments] load error", err);
      toast({
        title: "Couldn't load your notices",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authorized) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, authorized]);

  async function handleGenerate() {
    if (!sessionId) return;
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("generate-us-notice", {
        body: { session_id: sessionId },
      });

      if (error) {
        // Edge function may not be deployed yet — surface a clear message.
        console.error("[USNoticeDocuments] generate error", error);
        toast({
          title: "Generation isn't ready yet",
          description:
            "The notice generator is being finalised. Please try again in a moment.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Notices generated",
        description: "Your privacy notices are ready to download.",
      });
      await load();
    } catch (err) {
      console.error("[USNoticeDocuments] generate exception", err);
      toast({
        title: "Couldn't generate notices",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(doc: DocumentRow) {
    if (!doc.file_path) return;
    try {
      // Pull the stored HTML, render to PDF via PDFShift, open the result.
      const { data: fileData, error: dlErr } = await supabase.storage
        .from("us-notices")
        .download(doc.file_path);
      if (dlErr || !fileData) throw dlErr ?? new Error("Couldn't fetch file");
      const raw = await fileData.text();
      const fmt = (doc.document_format || "").toLowerCase();
      const isHtml = fmt === "html" || /<\/?[a-z][\s\S]*>/i.test(raw);
      const html = isHtml
        ? raw
        : `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Georgia,'Times New Roman',serif;font-size:11pt;line-height:1.5;color:#1a1a1a;white-space:pre-wrap;}</style></head><body>${raw
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")}</body></html>`;
      const titleParts = [
        doc.is_combined ? "us-notice-combined" : (doc.state_code || "us-notice"),
        `v${doc.version_number}`,
      ];
      const { data, error } = await supabase.functions.invoke("render-html-to-pdf", {
        body: { html, title: titleParts.join("-") },
      });
      if (error) throw error;
      if (!data?.pdf_url) throw new Error(data?.error || "PDF generation failed");
      window.open(data.pdf_url, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("[USNoticeDocuments] download error", err);
      toast({
        title: "Couldn't generate PDF",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  // Group current documents by state (or "combined").
  const currentDocs = useMemo(
    () => documents.filter((d) => d.is_current),
    [documents],
  );
  const previousDocs = useMemo(
    () => documents.filter((d) => !d.is_current),
    [documents],
  );

  const statesWithDocs = useMemo(() => {
    const byCode = new Map<string, DocumentRow[]>();
    for (const d of currentDocs) {
      // Combined "suite" docs are surfaced separately above — skip here.
      if (d.is_combined) continue;
      const key = d.state_code ?? "__unknown__";
      const list = byCode.get(key) ?? [];
      list.push(d);
      byCode.set(key, list);
    }
    return byCode;
  }, [currentDocs]);

  const hasAny = currentDocs.length > 0;
  const isReadyToGenerate =
    session?.status === "ready_to_generate" ||
    session?.status === "questions_complete";

  if (loading) {
    return (
      <USNoticeShell
        title="My US Privacy Notices — End User Privacy"
        heading="My US privacy notices"
        step="documents"
        sessionId={sessionId}
      >
        <Skeleton className="h-24 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </USNoticeShell>
    );
  }

  return (
    <USNoticeShell
      title="My US Privacy Notices — End User Privacy"
      heading="My US privacy notices"
      step="documents"
      sessionId={sessionId}
    >
      <p className="text-muted-foreground mb-8 max-w-3xl">
        Download your generated notices below. Each state-specific notice reflects the
        legal framework that applies in that jurisdiction based on your answers.
      </p>

      <CrossToolPrompt
        visitKey={`/us-notices/${sessionId}/documents`}
        dismissKey="eu_notice_prompt_dismissed"
        icon={<Globe2 className="w-5 h-5" />}
        title="🌍 Add EU & global notices?"
        body="Your RoPA data pre-populates most answers. Takes 8–18 minutes."
        ctaLabel="Generate EU notices →"
        ctaTo="/eu-notices/mode?mode=ropa_powered"
        enabled={!hasEuNotices && documents.length > 0}
      />

      {/* Generate / regenerate panel */}
      <Card className="mb-8">
        <CardContent className="p-4 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="font-serif mb-1">
              {hasAny ? "Regenerate notices" : "Generate your notices"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {hasAny
                ? "Already updated your answers? Regenerate to produce a fresh version."
                : isReadyToGenerate
                  ? "Your answers are ready. Generate your state-by-state notices now."
                  : "Finish the questions and review before generating."}
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={generating || !isReadyToGenerate}
            size="lg"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : hasAny ? (
              <RefreshCw className="h-4 w-4 mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {hasAny ? "Regenerate" : "Generate notices"}
          </Button>
        </CardContent>
      </Card>

      {/* Empty state */}
      {!hasAny && (
        <Card className="mb-8 border-dashed">
          <CardContent className="p-8 text-center">
            <FileText
              className="h-10 w-10 mx-auto text-muted-foreground mb-3"
              aria-hidden
            />
            <h3 className="mb-1">No notices yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Once you generate your notices, each state-specific document will appear
              here with download options.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Combined all-states suite */}
      {hasAny && currentDocs.some((d) => d.is_combined) && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-10 w-10 rounded-md bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5 text-primary" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="font-medium">All-states suite (combined)</div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Badge variant="secondary" className="text-meta">
                    {states.length} state{states.length === 1 ? "" : "s"}
                  </Badge>
                  {currentDocs
                    .filter((d) => d.is_combined)
                    .slice(0, 1)
                    .map((d) => (
                      <span key={d.id} className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden />
                          {formatDate(d.generated_at)}
                        </span>
                        <span>v{d.version_number}</span>
                        <span>{formatBytes(d.file_size_bytes)}</span>
                      </span>
                    ))}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:flex-shrink-0">
              {currentDocs
                .filter((d) => d.is_combined)
                .map((d) => (
                  <Button
                    key={d.id}
                    onClick={() => handleDownload(d)}
                    disabled={!d.file_path}
                    className="w-full sm:w-auto min-h-[44px]"
                    aria-label="Download combined all-states suite"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                    Download suite
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Per-state documents */}
      {hasAny && (
        <div className="space-y-3 mb-8">
          {states.map((state) => {
            const stateDocs = statesWithDocs.get(state.state_code) ?? [];
            return (
              <Card key={state.state_code}>
                <CardContent className="p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="h-5 w-5 text-muted-foreground" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{state.state_name}</div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <Badge variant="secondary" className="text-meta">
                          {FRAMEWORK_LABELS[state.framework_type] ?? state.framework_type}
                        </Badge>
                        {stateDocs[0] && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden />
                            {formatDate(stateDocs[0].generated_at)}
                          </span>
                        )}
                        {stateDocs[0] && <span>v{stateDocs[0].version_number}</span>}
                        {stateDocs[0] && <span>{formatBytes(stateDocs[0].file_size_bytes)}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:flex-shrink-0">
                    {stateDocs.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic" role="status">
                        Not generated yet
                      </span>
                    ) : (
                      stateDocs.map((d) => (
                        <Button
                          key={d.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(d)}
                          disabled={!d.file_path}
                          className="w-full sm:w-auto min-h-[44px]"
                          aria-label={`Download ${state.state_name} notice (PDF)`}
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                          PDF
                        </Button>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Previous versions */}
      {previousDocs.length > 0 && (
        <Card className="mb-8">
          <CardContent className="p-4 md:p-6">
            <h2 className="font-serif mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" aria-hidden />
              Previous versions
            </h2>
            <ul className="space-y-2">
              {previousDocs.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between text-sm border-b last:border-b-0 pb-2 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground">
                      v{d.version_number}
                    </span>
                    <span className="truncate">
                      {d.is_combined ? "Combined notice" : d.state_code}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(d.generated_at)}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(d)}
                    disabled={!d.file_path}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <Button variant="ghost" asChild className="w-full sm:w-auto min-h-[44px]">
          <Link to={`/us-notices/${sessionId}/review`}>
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
            Back to review
          </Link>
        </Button>
        <Button variant="outline" asChild className="w-full sm:w-auto min-h-[44px]">
          <Link to="/us-notices">All notice sessions</Link>
        </Button>
      </div>

      <RelatedToolsChips
        tools={[
          { label: "📋 RoPA", to: "/ropa/documents" },
          { label: "🌍 EU Notices", to: "/eu-notices" },
        ]}
      />
    </USNoticeShell>
  );
}
