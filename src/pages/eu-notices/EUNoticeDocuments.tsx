import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, FileText, Loader2, RefreshCw, Globe2, Eye, Trash2 } from "lucide-react";
import { EUNoticeShell } from "@/components/eu-notices/EUNoticeShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/hooks/useActiveClient";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { RelatedToolsChips } from "@/components/cross-tool/CrossToolPrompts";
import DownloadWordButton from "@/components/DownloadWordButton";

interface DocRow {
  id: string;
  session_id: string;
  framework_code: string;
  is_combined: boolean;
  version_number: number;
  document_format: string;
  file_path: string;
  file_size_bytes: number | null;
  generated_at: string;
  is_current: boolean;
}

function formatBytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Convert an HTML document into clean, readable plain text suitable for
 * preview and for feeding into the Word generator. Preserves paragraph and
 * list-item breaks; strips scripts, styles, and all markup.
 */
function htmlToText(html: string): string {
  // Drop script/style blocks entirely.
  let cleaned = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, "");
  // Convert block-level breaks to newlines BEFORE stripping tags.
  cleaned = cleaned.replace(/<\s*br\s*\/?\s*>/gi, "\n");
  cleaned = cleaned.replace(/<\/\s*(p|div|li|h[1-6]|tr|section|article|header|footer)\s*>/gi, "\n\n");
  cleaned = cleaned.replace(/<\s*li[^>]*>/gi, "• ");
  // Strip remaining tags.
  cleaned = cleaned.replace(/<[^>]+>/g, "");
  // Decode common entities.
  const ta = document.createElement("textarea");
  ta.innerHTML = cleaned;
  cleaned = ta.value;
  // Collapse whitespace.
  cleaned = cleaned.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return cleaned;
}

export default function EUNoticeDocuments() {
  const { user } = useAuth();
  const { clientId } = useActiveClient();
  const { toast } = useToast();
  const { isAdmin } = useIsAdmin();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ doc: DocRow; text: string } | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DocRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadDocs() {
    if (!user) return;
    setLoading(true);
    try {
      let clientIds: string[] = [];
      if (clientId) clientIds = [clientId];
      else {
        const { data } = await supabase.from("clients").select("id").eq("owner_id", user.id).eq("is_active", true);
        clientIds = (data ?? []).map((c) => c.id);
      }
      if (clientIds.length === 0) { setDocs([]); return; }
      const { data, error } = await supabase
        .from("eu_notice_documents")
        .select("*")
        .in("client_id", clientIds)
        .eq("is_current", true)
        .order("generated_at", { ascending: false });
      if (error) throw error;
      setDocs((data ?? []) as DocRow[]);
    } catch (err) {
      console.error(err);
      toast({ title: "Couldn't load documents", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, clientId]);

  /** Fetch the file from storage and return decoded text (HTML→text if needed). */
  async function fetchDocText(d: DocRow): Promise<string> {
    const { data, error } = await supabase.storage.from("eu-notices").download(d.file_path);
    if (error || !data) throw error ?? new Error("Couldn't fetch file");
    const raw = await data.text();
    const fmt = (d.document_format || "").toLowerCase();
    if (fmt === "html" || /<\/?[a-z][\s\S]*>/i.test(raw)) return htmlToText(raw);
    return raw;
  }

  async function openPreview(d: DocRow) {
    setPreviewLoadingId(d.id);
    try {
      const text = await fetchDocText(d);
      setPreview({ doc: d, text });
    } catch (err) {
      toast({ title: "Couldn't open preview", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setPreviewLoadingId(null);
    }
  }

  async function downloadOriginal(d: DocRow) {
    setBusyId(d.id);
    try {
      const { data, error } = await supabase.storage.from("eu-notices").createSignedUrl(d.file_path, 60);
      if (error || !data) throw error ?? new Error("No URL");
      window.open(data.signedUrl, "_blank", "noopener");
    } catch (err) {
      toast({ title: "Couldn't download", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      // Try to remove the storage object first (best-effort; ignore missing).
      const { error: storageErr } = await supabase.storage
        .from("eu-notices")
        .remove([pendingDelete.file_path]);
      if (storageErr) console.warn("[EUNoticeDocuments] storage delete warning", storageErr);
      const { error } = await supabase
        .from("eu_notice_documents")
        .delete()
        .eq("id", pendingDelete.id);
      if (error) throw error;
      toast({ title: "Notice deleted" });
      setDocs((prev) => prev.filter((x) => x.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      console.error(err);
      toast({ title: "Couldn't delete", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  const labelForDoc = (d: DocRow) =>
    `${d.is_combined ? "combined-international-notice" : d.framework_code}-v${d.version_number}`;

  return (
    <EUNoticeShell title="Documents — EU & Global Notice Builder" heading="Your generated notices" step="documents">
      <div className="mb-6 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link to="/eu-notices"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to dashboard</Link>
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : docs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="font-serif mb-1">No notices generated yet</h2>
            <p className="text-sm text-muted-foreground mb-5">Complete a notice session to see your documents here.</p>
            <Button asChild><Link to="/eu-notices/mode">Start a notice</Link></Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 md:p-6">
            <ul className="divide-y">
              {docs.map((d) => (
                <li key={d.id} className="py-3 flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {d.is_combined ? (
                        <Badge variant="default" className="gap-1"><Globe2 className="h-3 w-3" /> Combined international notice</Badge>
                      ) : (
                        <Badge variant="secondary">{d.framework_code}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">v{d.version_number}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(d.file_size_bytes)} · Generated {new Date(d.generated_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openPreview(d)}
                      disabled={previewLoadingId === d.id}
                    >
                      {previewLoadingId === d.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <><Eye className="h-3.5 w-3.5 mr-1.5" /> Preview</>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadOriginal(d)}
                      disabled={busyId === d.id}
                    >
                      {busyId === d.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <><Download className="h-3.5 w-3.5 mr-1.5" /> Original</>
                      )}
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/eu-notices/refresh/${d.session_id}`}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
                      </Link>
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPendingDelete(d)}
                        className="text-destructive hover:text-destructive"
                        aria-label="Delete notice (admin)"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {preview?.doc.is_combined ? "Combined international notice" : preview?.doc.framework_code}
              {preview ? ` · v${preview.doc.version_number}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded border bg-muted/30 p-4 whitespace-pre-wrap font-body text-sm leading-relaxed">
            {preview?.text}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            {preview && (
              <DownloadWordButton
                text={preview.text}
                label={labelForDoc(preview.doc)}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold rounded-lg border bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
              />
            )}
            <Button variant="outline" size="sm" onClick={() => setPreview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this notice?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the document record and the underlying file from storage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); void confirmDelete(); }}
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
          { label: "📋 RoPA", to: "/ropa/documents" },
          { label: "📋 US Notices", to: "/us-notices" },
        ]}
      />
    </EUNoticeShell>
  );
}
