// Detail view of all generated documents for an order — preview + download.
// Mirrors RegistrationOrder but focuses on document browsing.

import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageContainer from "@/components/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, ArrowLeft, Download, Mail, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ReportDisclaimer from "@/components/ReportDisclaimer";
import CopyButton from "@/components/CopyButton";

import PDFDownloadButton from "@/components/PDFDownloadButton";
import WordConversionPromptButton from "@/components/WordConversionPromptButton";
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


// Strip markdown syntax characters (*, #, backticks) from AI-generated text
// so the rendered document reads as a clean letter/report.
function cleanMarkdown(s: string): string {
  if (!s) return s;
  return s
    .replace(/^#{1,6}\s+/gm, "")              // heading hashes
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")      // bold+italic
    .replace(/\*\*(.+?)\*\*/g, "$1")          // bold
    .replace(/(?<!\*)\*(?!\s)([^*\n]+?)\*(?!\*)/g, "$1") // italics
    .replace(/^\s*\*\s+/gm, "• ")             // bullet asterisks → bullet
    .replace(/`([^`]+)`/g, "$1")              // inline code
    .replace(/^\s*[-_]{3,}\s*$/gm, "");       // hr lines
}

// TODO: wire a "Download all as ZIP" edge function (`bundle-registration-documents`)
// that streams a ZIP of every doc.content_text + any doc.pdf_url for the order.

const DOC_LABELS: Record<string, string> = {
  dpo_appointment: "DPO Appointment Letter",
  ropa: "Record of Processing Activities",
  ai_registration: "AI System Registration Draft",
  representative_letter: "Article 27 Representative Letter",
  filing_instructions: "Filing Instructions & Checklist",
};

export default function RegistrationDocuments() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [emailing, setEmailing] = useState(false);
  const previewRef = useRef<HTMLPreElement>(null);
  const { isAdmin } = useIsAdmin();
  const [pendingDelete, setPendingDelete] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminDelete("registration_document", pendingDelete.id);
      toast.success("Document deleted");
      const remaining = docs.filter((x) => x.id !== pendingDelete.id);
      setDocs(remaining);
      if (selected?.id === pendingDelete.id) setSelected(remaining[0] ?? null);
      setPendingDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }


  // Reset scroll position when switching documents
  useEffect(() => {
    if (previewRef.current) previewRef.current.scrollTop = 0;
    window.scrollTo({ top: 0 });
  }, [selected?.id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: o } = await supabase.from("registration_orders").select("*").eq("id", id).maybeSingle();
      const { data: d } = await supabase.from("registration_documents").select("*").eq("order_id", id).order("jurisdiction_code");
      setOrder(o);
      setDocs(d || []);
      if (d && d.length > 0) setSelected(d[0]);
      setLoading(false);
    })();
  }, [id]);

  async function emailDelivery() {
    if (!order) return;
    setEmailing(true);
    const { error } = await supabase.functions.invoke("send-registration-delivery-email", {
      body: { order_id: order.id },
    });
    if (error) toast.error(error.message);
    else toast.success("Delivery email sent");
    setEmailing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-cloud">
        <Navbar />
        <PageContainer>
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-navy" /></div>
        </PageContainer>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-brand-cloud">
        <Navbar />
        <PageContainer>
          <div className="py-20 text-center">
            <p className="text-slate">Order not found.</p>
            <Button asChild className="mt-4"><Link to="/registration-manager/my-filings">Back to My Filings</Link></Button>
          </div>
        </PageContainer>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>Registration Documents | End User Privacy</title>
      </Helmet>
      <Navbar />
      <main id="main-content" aria-label="Registration documents">
      <PageContainer>
        <div className="py-6">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link to="/registration-manager/my-filings"><ArrowLeft className="w-4 h-4 mr-1" /> My Filings</Link>
          </Button>

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="font-display text-brand-navy">Registration Documents</h1>
              <p className="text-sm text-slate mt-1">
                {docs.length} document{docs.length === 1 ? "" : "s"} across {order.jurisdictions.length} jurisdiction{order.jurisdictions.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={emailDelivery} disabled={emailing}>
              {emailing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Email me a copy
            </Button>
          </div>

          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-900 dark:text-amber-200">
            <strong>Important:</strong> These are draft documents prepared from your self-reported organisation profile and our jurisdiction database. They are not legal advice and do not constitute a completed filing. You (or your counsel) must review each document, fill in all [placeholder] fields, and submit to the relevant data protection authority. End User Privacy is not responsible for filings rejected, delayed, or otherwise affected.
          </div>

          {docs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-10 h-10 text-brand-mist mx-auto mb-3" />
                <p className="text-slate">No documents generated yet.</p>
                <Button asChild className="mt-4">
                  <Link to={`/registration-manager/order/${order.id}`}>Go to order</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-[280px_1fr] gap-6">
              {/* Document list */}
              <div className="space-y-2">
                {docs.map((d) => (
                  <div key={d.id} className="flex items-stretch gap-1">
                    <button
                      onClick={() => setSelected(d)}
                      className={`flex-1 text-left p-3 rounded-lg border transition-colors ${
                        selected?.id === d.id
                          ? "border-brand-navy bg-brand-navy/5"
                          : "border-border/60 hover:bg-brand-cloud"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-slate flex-shrink-0" />
                        <span className="text-sm font-medium text-brand-navy truncate">
                          <span className="font-mono uppercase text-slate mr-1">{d.jurisdiction_code}</span>
                          - {DOC_LABELS[d.document_type] || d.document_type}
                        </span>
                      </div>
                    </button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPendingDelete(d)}
                        className="text-destructive hover:text-destructive"
                        aria-label="Delete document (admin)"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}

              </div>

              {/* Document preview */}
              <Card>
                <CardHeader className="border-b border-border/40">
                  <CardTitle className="text-base">
                    {selected ? DOC_LABELS[selected.document_type] : "Select a document"}
                    {selected && <span className="text-xs font-normal text-slate ml-2">({selected.jurisdiction_code})</span>}
                    {selected?.status === "needs_review" && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-900 border border-amber-300">
                        Needs review — see notes
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {selected ? (
                    <>
                      {selected.status === "needs_review" && selected.validation_notes && (
                        <details className="mb-3 text-xs rounded border border-amber-300 bg-amber-50 p-2">
                          <summary className="cursor-pointer font-medium text-amber-900">Validation notes</summary>
                          <p className="mt-2 whitespace-pre-wrap text-amber-900">{selected.validation_notes}</p>
                        </details>
                      )}
                      <pre ref={previewRef} className="whitespace-pre-wrap text-brand-navy max-h-[600px] overflow-y-auto p-3 bg-brand-cloud/30 rounded" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: "11pt" }}>
                        {cleanMarkdown(selected.content_text || "") || "(empty)"}
                      </pre>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {selected.content_text && <CopyButton text={cleanMarkdown(selected.content_text)} />}
                        <PDFDownloadButton
                          toolType="registration_document"
                          assessmentId={selected.id}
                          pdfUrl={selected.pdf_url}
                          onGenerated={(url) => {
                            const updated = { ...selected, pdf_url: url };
                            setSelected(updated);
                            setDocs((prev) => prev.map((x) => (x.id === selected.id ? updated : x)));
                          }}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-[12px] font-semibold text-white bg-brand-navy hover:bg-brand-navy/90 border border-brand-navy rounded-lg no-underline transition-colors disabled:opacity-60"
                        />
                        <WordConversionPromptButton documentType="registration_document" />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const w = window.open("", "_blank");
                            if (!w) { toast.error("Pop-up blocked"); return; }
                            const title = `${DOC_LABELS[selected.document_type] || selected.document_type} — ${selected.jurisdiction_code}`;
                            const cleaned = cleanMarkdown(selected.content_text || "");
                            w.document.write(`<!doctype html><html><head><title>${title}</title><style>body{font-family:'Times New Roman',Times,serif;font-size:11pt;max-width:780px;margin:40px auto;padding:0 24px;line-height:1.5;color:#1a1a1a}h1{font-family:'Times New Roman',Times,serif;font-size:11pt;font-weight:bold;margin-bottom:24px}pre{white-space:pre-wrap;font-family:'Times New Roman',Times,serif;font-size:11pt}</style></head><body><h1>${title}</h1><pre>${cleaned.replace(/[&<>]/g, (c: string) => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]!))}</pre><script>window.onload=()=>window.print()</script></body></html>`);
                            w.document.close();
                          }}
                        >
                          <Printer className="w-4 h-4 mr-2" /> Print
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-slate">Choose a document from the list.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <ReportDisclaimer />
        </div>
      </PageContainer>
      </main>
      <Footer />

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the generated document. The order and other documents are not affected. This action cannot be undone.
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
    </div>
  );
}
