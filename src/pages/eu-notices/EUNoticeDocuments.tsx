import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, FileText, Loader2, RefreshCw, Globe2 } from "lucide-react";
import { EUNoticeShell } from "@/components/eu-notices/EUNoticeShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useActiveClient } from "@/hooks/useActiveClient";
import { RelatedToolsChips } from "@/components/cross-tool/CrossToolPrompts";

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

export default function EUNoticeDocuments() {
  const { user } = useAuth();
  const { clientId } = useActiveClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
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
    })();
  }, [user, clientId, toast]);

  async function downloadDoc(d: DocRow) {
    setDownloadingId(d.id);
    try {
      const { data, error } = await supabase.storage.from("eu-notices").createSignedUrl(d.file_path, 60);
      if (error || !data) throw error ?? new Error("No URL");
      window.open(data.signedUrl, "_blank", "noopener");
    } catch (err) {
      toast({ title: "Couldn't download", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setDownloadingId(null);
    }
  }

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
                <li key={d.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {d.is_combined ? (
                        <Badge variant="default" className="gap-1"><Globe2 className="h-3 w-3" /> Combined international notice</Badge>
                      ) : (
                        <Badge variant="secondary">{d.framework_code}</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">v{d.version_number}</span>
                      <span className="text-xs uppercase text-muted-foreground">{d.document_format}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatBytes(d.file_size_bytes)} · Generated {new Date(d.generated_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => downloadDoc(d)} disabled={downloadingId === d.id}>
                      {downloadingId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Download className="h-3.5 w-3.5 mr-1.5" /> Download</>}
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link to={`/eu-notices/refresh/${d.session_id}`}><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <RelatedToolsChips
        tools={[
          { label: "📋 RoPA", to: "/ropa/documents" },
          { label: "📋 US Notices", to: "/us-notices" },
        ]}
      />
    </EUNoticeShell>
  );
}
