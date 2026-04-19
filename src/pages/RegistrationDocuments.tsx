// Detail view of all generated documents for an order — preview + download.
// Mirrors RegistrationOrder but focuses on document browsing.

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageContainer from "@/components/PageContainer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, ArrowLeft, Download, Mail } from "lucide-react";
import { toast } from "sonner";
import RegistrationDisclaimer from "@/components/RegistrationDisclaimer";

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
      <div className="min-h-screen bg-paper">
        <Navbar />
        <PageContainer>
          <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-navy" /></div>
        </PageContainer>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-paper">
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
    <div className="min-h-screen bg-paper">
      <Helmet>
        <title>Registration Documents | EndUserPrivacy</title>
      </Helmet>
      <Navbar />
      <PageContainer>
        <div className="py-6">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link to="/registration-manager/my-filings"><ArrowLeft className="w-4 h-4 mr-1" /> My Filings</Link>
          </Button>

          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-bold text-navy">Registration Documents</h1>
              <p className="text-sm text-slate mt-1">
                {docs.length} document{docs.length === 1 ? "" : "s"} across {order.jurisdictions.length} jurisdiction{order.jurisdictions.length === 1 ? "" : "s"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={emailDelivery} disabled={emailing}>
              {emailing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              Email me a copy
            </Button>
          </div>

          {docs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="w-10 h-10 text-slate-light mx-auto mb-3" />
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
                  <button
                    key={d.id}
                    onClick={() => setSelected(d)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selected?.id === d.id
                        ? "border-navy bg-navy/5"
                        : "border-border/60 hover:bg-fog"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate" />
                      <span className="text-xs font-mono uppercase text-slate">{d.jurisdiction_code}</span>
                    </div>
                    <div className="text-sm font-medium text-navy mt-1">
                      {DOC_LABELS[d.document_type] || d.document_type}
                    </div>
                    <Badge variant="outline" className="mt-2 text-[10px]">{d.status}</Badge>
                  </button>
                ))}
              </div>

              {/* Document preview */}
              <Card>
                <CardHeader className="border-b border-border/40">
                  <CardTitle className="text-base">
                    {selected ? DOC_LABELS[selected.document_type] : "Select a document"}
                    {selected && <span className="text-xs font-normal text-slate ml-2">({selected.jurisdiction_code})</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  {selected ? (
                    <>
                      <pre className="whitespace-pre-wrap text-[13px] text-navy font-mono max-h-[600px] overflow-y-auto p-3 bg-fog/30 rounded">
                        {selected.content_text || "(empty)"}
                      </pre>
                      {selected.pdf_url && (
                        <Button asChild variant="outline" size="sm" className="mt-3">
                          <a href={selected.pdf_url} target="_blank" rel="noreferrer"><Download className="w-4 h-4 mr-2" /> Download PDF</a>
                        </Button>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate">Choose a document from the list.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="mt-8">
            <RegistrationDisclaimer variant="compact" />
          </div>
        </div>
      </PageContainer>
      <Footer />
    </div>
  );
}
