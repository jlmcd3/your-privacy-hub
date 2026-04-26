import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageContainer from "@/components/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, FileText, Download } from "lucide-react";
import RegistrationDisclaimer from "@/components/RegistrationDisclaimer";

const DOC_LABELS: Record<string, string> = {
  dpo_appointment: "DPO Appointment Letter",
  ropa: "Record of Processing Activities",
  ai_registration: "AI System Registration Draft",
  representative_letter: "Article 27 Representative Letter",
  filing_instructions: "Filing Instructions & Checklist",
};

export default function RegistrationOrder() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const status = params.get("status");
  const [order, setOrder] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  async function load() {
    if (!id) return;
    const { data: o } = await supabase
      .from("registration_orders").select("*").eq("id", id).maybeSingle();
    setOrder(o);
    const { data: d } = await supabase
      .from("registration_documents").select("*").eq("order_id", id).order("jurisdiction_code");
    setDocs(d || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  // Auto-trigger doc generation for DIY orders (free toolkit) on first arrival
  useEffect(() => {
    if (!order) return;
    if (order.tier === "diy" && docs.length === 0 && !generating) {
      setGenerating(true);
      supabase.functions.invoke("generate-registration-docs", { body: { order_id: order.id } })
        .then(({ error }) => {
          if (error) toast.error(error.message);
          else { toast.success("Documents generated"); load(); }
        })
        .finally(() => setGenerating(false));
    }
  }, [order]);

  async function generateDocs() {
    setGenerating(true);
    const { error } = await supabase.functions.invoke(
      "generate-registration-docs",
      { body: { order_id: id } }
    );
    setGenerating(false);
    if (error) toast.error(error.message);
    else { toast.success("Documents generated"); load(); }
  }

  if (loading) {
    return (
      <><Navbar /><PageContainer><div className="py-20 text-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />Loading order…
      </div></PageContainer><Footer /></>
    );
  }

  if (!order) {
    return (
      <><Navbar /><PageContainer><div className="py-20 text-center">Order not found.</div></PageContainer><Footer /></>
    );
  }

  const grouped = docs.reduce<Record<string, any[]>>((acc, d) => {
    (acc[d.jurisdiction_code] ||= []).push(d);
    return acc;
  }, {});

  return (
    <>
      <Helmet>
        <title>Registration Order — Your Privacy Hub</title>
      </Helmet>
      <Navbar />
      <main>
        <PageContainer>
          <div className="max-w-4xl mx-auto py-10">
            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Registration Order</h1>
              <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground">
                <Badge variant="secondary">{order.tier.replace(/_/g, " ")}</Badge>
                <Badge variant="outline">Payment: {order.payment_status}</Badge>
                <Badge variant="outline">Fulfillment: {order.fulfillment_status}</Badge>
                <span>${(order.amount_cents / 100).toFixed(2)} {order.currency.toUpperCase()}</span>
              </div>
              {status === "success" && (
                <div className="mt-3 rounded-md bg-muted border border-border px-3 py-2 text-sm text-foreground">
                  ✅ Payment received. We're preparing your documents.
                </div>
              )}
            </header>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Jurisdictions in this order</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {(order.jurisdictions || []).map((c: string) => (
                    <Badge key={c} variant="outline">{c}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Documents</h2>
              <Button onClick={generateDocs} disabled={generating} variant="outline" size="sm">
                {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</> : "Regenerate documents"}
              </Button>
            </div>

            {docs.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">
                {generating ? "Generating documents (1–2 minutes)…" : "No documents yet."}
              </CardContent></Card>
            ) : (
              <div className="space-y-4">
                {Object.entries(grouped).map(([code, list]) => (
                  <Card key={code}>
                    <CardHeader>
                      <CardTitle className="text-base">{code}</CardTitle>
                    </CardHeader>
                    <CardContent className="divide-y divide-border">
                      {list.map((d) => (
                        <DocRow key={d.id} doc={d} />
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="mt-8">
              <RegistrationDisclaimer variant="compact" />
            </div>
          </div>
        </PageContainer>
      </main>
      <Footer />
    </>
  );
}

function DocRow({ doc }: { doc: any }) {
  const [open, setOpen] = useState(false);
  function downloadMd() {
    const blob = new Blob([doc.content_text || ""], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.jurisdiction_code}-${doc.document_type}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="py-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm text-foreground hover:underline"
        >
          <FileText className="h-4 w-4" />
          {DOC_LABELS[doc.document_type] || doc.document_type}
        </button>
        <Button onClick={downloadMd} variant="ghost" size="sm">
          <Download className="h-4 w-4 mr-1" />Download
        </Button>
      </div>
      {open && (
        <pre className="mt-3 text-xs whitespace-pre-wrap bg-muted/30 p-3 rounded max-h-96 overflow-auto">
          {doc.content_text}
        </pre>
      )}
    </div>
  );
}
