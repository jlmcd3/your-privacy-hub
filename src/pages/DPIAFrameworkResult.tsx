import { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import EnforcementPrecedents from "@/components/EnforcementPrecedents";
import PDFDownloadButton from "@/components/PDFDownloadButton";
import DownloadWordButton from "@/components/DownloadWordButton";
import { supabase } from "@/integrations/supabase/client";
import BackLink from "@/components/dashboard/BackLink";
import { ClientContextBadge } from "@/components/clients/ClientContextBadge";
import { AnnotationCallout } from "@/components/AnnotationCallout";

const sevColor = (s: string) => {
  const x = (s || "").toLowerCase();
  if (x === "critical" || x === "high") return "bg-red-100 text-red-800";
  if (x === "medium") return "bg-amber-100 text-amber-800";
  if (x === "low") return "bg-blue-100 text-blue-800";
  return "bg-muted text-foreground";
};

const Section = ({ num, title, guidance, completion, children }: any) => (
  <section className="bg-card border rounded-lg p-6 print:break-before-page">
    <h2 className="mb-2">Section {num}: {title}</h2>
    {guidance && (
      <details className="mb-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded p-3 text-sm">
        <summary className="cursor-pointer font-medium">Article 35 Requirement</summary>
        <p className="mt-2">{guidance}</p>
      </details>
    )}
    <div className="space-y-3">{children}</div>
    {completion && (
      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-sm rounded">
        <p className="font-medium mb-1">Your DPO/Counsel Must Complete</p>
        <p>{completion}</p>
      </div>
    )}
  </section>
);

const Field = ({ label, value }: { label: string; value: any }) => value ? (
  <div><span className="text-xs uppercase font-medium text-muted-foreground">{label}</span><p className="text-sm mt-1">{value}</p></div>
) : null;

const DPIAFrameworkResult = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const purchased = searchParams.get("purchased") === "true";
  const [dpia, setDpia] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [consultationNote, setConsultationNote] = useState("");

  useEffect(() => {
    if (!id) return;
    let timer: any;
    const fetchOnce = async () => {
      const { data } = await supabase.from("dpia_frameworks").select("*").eq("id", id).maybeSingle();
      setDpia(data);
      setLoading(false);
      if (data && (data.status === "pending" || data.status === "processing")) {
        timer = setTimeout(fetchOnce, 4000);
      }
    };
    fetchOnce();
    return () => timer && clearTimeout(timer);
  }, [id]);

  const report = dpia?.report_data || {};
  const meta = report?.dpia_metadata || {};
  const status = dpia?.status;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>Impact Assessment Builder | End User Privacy</title></Helmet>
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <BackLink to="/dashboard/reports" label="Back to My Reports" />
        <ClientContextBadge />
        {purchased && (
          <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20 rounded text-sm">
            ✅ Purchase confirmed. Your assessment is being generated.
          </div>
        )}
        {loading && <p>Loading…</p>}

        {!loading && (status === "pending" || status === "processing") && (
          <div className="bg-card border rounded-lg p-10 text-center">
            <div className="animate-pulse mb-4 text-2xl">⏳</div>
            <p>Generating your Impact Assessment report — this takes about 30 seconds.</p>
          </div>
        )}

        {status === "failed" && (
          <div className="bg-card border rounded-lg p-6">
            <p className="font-medium text-red-700 mb-3">Generation failed.</p>
            <Button asChild><Link to="/dpia-framework">Try Again</Link></Button>
          </div>
        )}

        {status === "complete" && (
          <>
            <header className="bg-slate-900 text-white rounded-lg p-8">
              <h1 className="font-serif mb-1">Impact Assessment Builder</h1>
              <p className="text-slate-300">{meta.processing_activity_name || dpia?.intake_data?.processing_activity_name}</p>
              <p className="text-slate-400 text-xs mt-2">
                {meta.framework_version && `Version ${meta.framework_version} · `}
                {meta.generated_at && `Generated ${new Date(meta.generated_at).toLocaleDateString()}`}
              </p>
              {Array.isArray(meta.applicable_frameworks) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {meta.applicable_frameworks.map((f: string) => (
                    <span key={f} className="px-2 py-1 text-xs rounded bg-white/10">{f}</span>
                  ))}
                </div>
              )}
            </header>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 text-sm rounded">
              <p className="font-medium mb-1">IMPORTANT</p>
              <p>This is a compliance framework document provided as a starting point for your organisation's DPIA process. It must be completed, reviewed, and owned by your Data Protection Officer or qualified legal counsel. It does not satisfy the requirements of GDPR Article 35 on its own. This document does not constitute legal advice.</p>
            </div>

            {report?.supervisory_authority_consultation?.trigger_conditions && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500 text-sm rounded">
                <p className="font-medium mb-1">Supervisory authority consultation may be required</p>
                <p>{report.supervisory_authority_consultation.trigger_conditions}</p>
              </div>
            )}

            {/* Section 1 */}
            <Section num={1} title="Description of Processing"
              guidance={report?.section_1_description?.guidance_note}
              completion={report?.section_1_description?.completion_guidance}>
              <Field label="Processing nature" value={report?.section_1_description?.processing_nature} />
              <Field label="Processing scope" value={report?.section_1_description?.processing_scope} />
              <Field label="Processing context" value={report?.section_1_description?.processing_context} />
              <Field label="Processing purposes" value={report?.section_1_description?.processing_purposes} />
              <Field label="Legal basis proposed" value={report?.section_1_description?.legal_basis_proposed} />
            </Section>

            {/* Section 2 */}
            <Section num={2} title="Necessity and Proportionality"
              guidance={report?.section_2_necessity?.guidance_note}
              completion={report?.section_2_necessity?.completion_guidance}>
              <Field label="Necessity analysis" value={report?.section_2_necessity?.necessity_analysis} />
              <Field label="Proportionality analysis" value={report?.section_2_necessity?.proportionality_analysis} />
              <Field label="Alternatives considered" value={report?.section_2_necessity?.alternatives_considered} />
            </Section>

            {/* Section 3 */}
            <Section num={3} title="Risk Assessment"
              guidance={report?.section_3_risks?.guidance_note}
              completion={report?.section_3_risks?.completion_guidance}>
              {Array.isArray(report?.section_3_risks?.risk_assessment) && report.section_3_risks.risk_assessment.map((r: any, i: number) => (
                <div key={i} className="border rounded p-4">
                  <p className="font-medium">{r.risk_type || r.type}</p>
                  {r.description && <p className="text-sm mt-1">{r.description}</p>}
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {r.likelihood && <span className={`px-2 py-0.5 text-xs rounded ${sevColor(r.likelihood)}`}>Likelihood: {r.likelihood}</span>}
                    {r.severity && <span className={`px-2 py-0.5 text-xs rounded ${sevColor(r.severity)}`}>Severity: {r.severity}</span>}
                  </div>
                  {r.affected_rights && <p className="text-xs text-muted-foreground mt-2">Affected rights: {Array.isArray(r.affected_rights) ? r.affected_rights.join(", ") : r.affected_rights}</p>}
                  <AnnotationCallout
                    annotations={(report?.annotations || []).filter(
                      (a: any) => a.relevance?.toLowerCase().includes(
                        (r.risk_type || r.type || "").toLowerCase().slice(0, 20)
                      )
                    )}
                  />
                </div>
              ))}
              <Field label="Residual risk guidance" value={report?.section_3_risks?.residual_risk_assessment} />
            </Section>

            {/* Section 4 */}
            <Section num={4} title="Mitigation Measures"
              guidance={report?.section_4_mitigation?.guidance_note}
              completion={report?.section_4_mitigation?.completion_guidance}>
              {Array.isArray(report?.section_4_mitigation?.proposed_measures) && report.section_4_mitigation.proposed_measures.map((m: any, i: number) => (
                <div key={i} className="border rounded p-4">
                  <p className="font-medium">{m.measure || m.name}</p>
                  {m.addresses_risk && <p className="text-xs text-muted-foreground mt-1">Addresses: {m.addresses_risk}</p>}
                  {m.implementation_guidance && <p className="text-sm mt-2">{m.implementation_guidance}</p>}
                  {m.residual_risk_after && <p className="text-xs mt-2 text-muted-foreground">Residual risk: {m.residual_risk_after}</p>}
                </div>
              ))}
            </Section>

            {/* Section 5 */}
            <Section num={5} title="Consultation"
              guidance={report?.section_5_consultation?.guidance_note}
              completion={report?.section_5_consultation?.completion_guidance}>
              {report?.section_5_consultation?.dpo_consultation_required !== undefined && (
                <Field
                  label="DPO consultation requirement"
                  value={report.section_5_consultation.dpo_consultation_required ? "Required" : "Not required"}
                />
              )}
              <div>
                <Label className="text-xs uppercase font-medium text-muted-foreground">Record consultation outcome</Label>
                <Textarea
                  value={consultationNote}
                  onChange={(e) => setConsultationNote(e.target.value)}
                  placeholder={report?.section_5_consultation?.dpo_consultation_record || "Capture consultation outcome here…"}
                  className="mt-2 min-h-24"
                />
              </div>
              <Field label="Stakeholder consultation" value={report?.section_5_consultation?.stakeholder_consultation} />
            </Section>

            {/* Section 6 */}
            <Section num={6} title="Conclusion and Sign-Off"
              guidance={report?.section_6_conclusion?.guidance_note}
              completion={report?.section_6_conclusion?.completion_guidance}>
              <Field
                label="Supervisory authority consultation conditions"
                value={report?.section_6_conclusion?.supervisory_authority_consultation_required}
              />
              <div className="border rounded p-4 bg-muted/30 font-mono text-sm space-y-2">
                {report?.section_6_conclusion?.sign_off_template ? (
                  <p className="whitespace-pre-wrap font-mono text-sm">{report.section_6_conclusion.sign_off_template}</p>
                ) : (
                  <>
                    <div>Name: ___________________________</div>
                    <div>Role: ___________________________</div>
                    <div>Date of review: ___________________________</div>
                    <div>Decision: [ ] Processing may proceed as described &nbsp;&nbsp; [ ] Processing requires further mitigation</div>
                    <div>Signature: ___________________________</div>
                  </>
                )}
              </div>
              <Field label="Review schedule" value={report?.section_6_conclusion?.review_schedule} />
            </Section>

            <EnforcementPrecedents
              precedents={report?.enforcement_precedents}
              context="Recent regulator decisions on similar processing activities — review these alongside Section 3 (Risks) and Section 4 (Mitigation)."
            />

            <div className="flex flex-wrap gap-2 print:hidden">
              <PDFDownloadButton
                toolType="dpia_framework"
                assessmentId={dpia?.id}
                pdfUrl={dpia?.pdf_url}
                onGenerated={(url) => setDpia({ ...dpia, pdf_url: url })}
              />
              <Button onClick={() => window.print()} variant="outline">Print</Button>
              <Button asChild variant="outline"><Link to="/dashboard">Back to Dashboard</Link></Button>
              <Button asChild variant="outline"><Link to="/governance-assessment">Run Privacy Program Assessment Tool</Link></Button>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

const Label = ({ children, className }: any) => <label className={className}>{children}</label>;

export default DPIAFrameworkResult;
