import { useEffect, useState } from "react";
import { useGenerationStatus } from "@/hooks/useGenerationStatus";
import GenerationStalledCard from "@/components/GenerationStalledCard";
import { useToolCompletedOnce } from "@/hooks/useToolCompletedOnce";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import BackLink from "@/components/dashboard/BackLink";
import EnforcementPrecedents from "@/components/EnforcementPrecedents";

import PDFDownloadButton from "@/components/PDFDownloadButton";
import WordConversionPromptButton from "@/components/WordConversionPromptButton";
import ReportShell from "@/components/ReportShell";
import RunMeterBar from "@/components/RunMeterBar";
import InformationNeededBlock from "@/components/InformationNeededBlock";

import { useRunMeter } from "@/hooks/useRunMeter";
import { startMeterExtension } from "@/lib/meterExtension";
import ReportTranslateMenu from "@/components/ReportTranslateMenu";
import { ProcessingInterstitial } from "@/components/ProcessingInterstitial";

import AuditorHandoffButton from "@/components/cppa/AuditorHandoffPackage";

// RC-FLIP-3 — presentation helpers and the CybersecurityReportBody component
// were extracted into standalone modules to eliminate a page↔shared-component
// cycle (BreachPrecedentMap and SampleToolReport imported back from this
// page). Page re-exports the same names so external callers via the page
// path stay valid.
export { readinessColor, controlStatusColor } from "@/pages/CPPACybersecurityResult.helpers";
export { CybersecurityReportBody } from "@/components/cppa/CybersecurityReportBody";
import { CybersecurityReportBody } from "@/components/cppa/CybersecurityReportBody";

export default function CPPACybersecurityResult() {
  const { id } = useParams();
  const { meter } = useRunMeter("cppa_cybersecurity", id);
  const [searchParams] = useSearchParams();
  const purchased = searchParams.get("purchased") === "true";
  const [priorId, setPriorId] = useState<string | null>(null);
  const [translated, setTranslated] = useState<any | null>(null);
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");

  const computeReportReady = (r: any): boolean => {
    const rd = r?.report_data as any;
    return !!(
      rd
      && typeof rd === "object"
      && Object.keys(rd).length > 0
      && (Array.isArray(rd.controls) || typeof rd.executive_summary === "string")
    );
  };

  const { row, loading, phase, refresh, setRow } = useGenerationStatus<any>({
    table: "cppa_assessments",
    rowId: id,
    isTerminal: (r) => {
      const s = String(r?.status ?? "");
      if (s === "error" || s === "refunded" || s === "failed_resolved" || s === "failed") return true;
      if (s === "complete") return computeReportReady(r);
      return false;
    },
    isReportReady: (r) => r?.status === "complete" && computeReportReady(r),
  });
  useToolCompletedOnce("cppa_cybersecurity", row?.status === "complete" && computeReportReady(row));

  // Look for an earlier cybersecurity assessment by the same user (for drift compare).
  useEffect(() => {
    if (!row?.user_id || !row?.id || !row?.created_at) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("cppa_assessments")
        .select("id")
        .eq("user_id", row.user_id)
        .eq("module", "cybersecurity")
        .eq("status", "complete")
        .lt("created_at", row.created_at)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setPriorId((data as any)?.id ?? null);
    })();
    return () => { cancelled = true; };
  }, [row?.user_id, row?.id, row?.created_at]);

  const status = row?.status;
  const reportReady = computeReportReady(row);
  const showRunning = !loading && (phase === "running" || phase === "slow");
  const terminal = status === "complete" || status === "error" || status === "refunded" || status === "failed_resolved";
  const isStalled = phase === "stalled" || phase === "stalled_pre_dispatch";

  const metaText = row?.created_at ? `Generated ${new Date(row.created_at).toLocaleDateString()}` : undefined;

  const viewRow = translated ? { ...row, ...translated } : row;

  const actions = status === "complete" && reportReady ? (
    <>
      <ReportTranslateMenu
        toolType="cppa_cyber"
        reportId={row.id}
        onTranslated={(p, d) => { setTranslated(p); setDir(d); }}
      />
      <AuditorHandoffButton row={viewRow} />
      {priorId && (
        <Button asChild variant="outline" size="sm">
          <Link to={`/cppa-cybersecurity/drift/${row.id}/${priorId}`}>Compare to previous</Link>
        </Button>
      )}
      <PDFDownloadButton
        toolType="cppa_cybersecurity"
        assessmentId={row.id}
        pdfUrl={row.pdf_url}
        onGenerated={(url) => setRow({ ...row, pdf_url: url })}
      />
      <WordConversionPromptButton documentType="cppa_cybersecurity" />
      <Button asChild variant="outline" size="sm"><Link to="/cppa-cybersecurity">Run New Assessment</Link></Button>
    </>
  ) : undefined;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>CPPA Cybersecurity Audit Readiness — Module 2 | End User Privacy</title>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://enduserprivacy.com/" },
            { "@type": "ListItem", position: 2, name: "CPPA Suite", item: "https://enduserprivacy.com/cppa" },
            { "@type": "ListItem", position: 3, name: "CPPA Cybersecurity Audit Readiness", item: "https://enduserprivacy.com/cppa-cybersecurity" },
          ],
        })}</script>
      </Helmet>
      <Navbar />
      <main id="main-content" className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <BackLink to="/dashboard/reports" label="Back to My Reports" />
        {purchased && !terminal && !isStalled && (
          <div className="p-4 border-l-4 border-green-500 bg-green-50 dark:bg-green-950/20 rounded text-sm">
            {row?.retry_count > 0
              ? `⏳ We hit a problem on the first try and are automatically retrying (attempt ${row.retry_count + 1} of 3). No action needed.`
              : "✅ Purchase confirmed. Your readiness report is being generated."}
          </div>
        )}

        <ReportShell
          title="CPPA Cybersecurity Audit Readiness"
          meta={metaText}
          actions={actions}
          topDisclaimer={(row?.report_data as any)?.framework_disclaimer ?? (row?.report_data as any)?.disclaimer}
        >
          {(() => {
            const infoNeeded = (row?.report_data as any)?.information_needed;
            return meter ? (
              <>
                <RunMeterBar
                  meter={meter}
                  refineHref={`/cppa-cybersecurity?refine=${id}`}
                  onExtend={() => startMeterExtension("cppa_cybersecurity", id!)}
                  infoNeededCount={Array.isArray(infoNeeded) ? infoNeeded.length : 0}
                />
                <InformationNeededBlock items={infoNeeded} />
              </>
            ) : null;
          })()}

          {loading && <p>Loading…</p>}

          {showRunning && (
            <ProcessingInterstitial
              tool="cppa_cyber"
              startedAt={row?.updated_at ?? row?.created_at}
              slow={phase === "slow"}
            />
          )}

          {isStalled && (
            <GenerationStalledCard variant={phase as any} retryHref="/cppa-cybersecurity" onRefresh={refresh} />
          )}

          {status === "error" && (
            <div className="bg-card border rounded-lg p-6">
              <p className="font-medium text-red-700 mb-3">Assessment failed.</p>
              <Button asChild><Link to="/cppa-cybersecurity">Try Again</Link></Button>
            </div>
          )}

          {status === "refunded" && (
            <div className="bg-card border rounded-lg p-6">
              <p className="font-medium mb-2">We couldn't generate this readiness report and have refunded your payment.</p>
              <p className="text-sm text-muted-foreground mb-4">The refund will appear on your statement within 5–10 business days. You can start a fresh assessment whenever you're ready.</p>
              <Button asChild><Link to="/cppa-cybersecurity">Start a new assessment</Link></Button>
            </div>
          )}

          {status === "failed_resolved" && (
            <div className="bg-card border rounded-lg p-6">
              <p className="font-medium mb-2">We couldn't generate this readiness report.</p>
              <p className="text-sm text-muted-foreground mb-4">As a subscriber make-good, a free service credit has been added to your account. Use it on any Smart Tool.</p>
              <Button asChild><Link to="/cppa-cybersecurity">Start a new assessment</Link></Button>
            </div>
          )}

          {status === "complete" && reportReady && (
            <div dir={dir} style={{ display: "contents" }}>
              <CybersecurityReportBody row={viewRow} hideHeader />
              <EnforcementPrecedents
                precedents={(viewRow?.report_data as any)?.enforcement_precedents}
                variant="cppa"
                attempted={Boolean((row?.report_data as any)?.enforcement_meta?.attempted)}
                totalMatched={(row?.report_data as any)?.enforcement_meta?.total_matched}
                queryDescriptor={(row?.report_data as any)?.enforcement_meta?.query_descriptor}
              />
            </div>
          )}
        </ReportShell>
      </main>
      <Footer />
    </div>
  );

}
