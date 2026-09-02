// ALL-PRODUCTS-TEST — extended product panel.
//
// /admin/SO-final-test grades the nine skeleton-encoded products through the
// quality-batch orchestrator. Four shipped products are NOT dispatchable
// there — DPA Generator (dispatchable but not skeleton-encoded) and the three
// workspace-scoped builders (RoPA, US Notice, EU Notice). This panel runs
// those products end-to-end against their canonical sample fixtures using the
// EXACT insert/invoke/poll sequences that /admin/sample-reports ships
// (src/lib/sampleGenerators.ts — one shared implementation, no drift).
//
// INTAKE LAW: nothing is inserted or invoked until every selected fixture
// passes preflight (src/lib/sampleFixturePreflight.ts). A run can therefore
// never fail because of a missing or blank intake key — such a fixture is
// refused up-front with the offending key paths named.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { appendAllProductsLog, clearAllProductsLog, useAllProductsLog } from "@/lib/allProductsLog";
import { claimOnce, ensureLocalBatchFor, recordLocalRun, recordLocalScore, startLocalBatch } from "@/lib/allProductsRunHistory";
import { gradeRun, SLUG_TO_GRADER_TOOL } from "@/lib/gradeRun";
import {
  downloadAllAnalyses,
  downloadOutcomeAnalysis,
  downloadOutcomesCsv,
  clearOutcomes,
  newOutcomeId,
  recordOutcome,
  updateOutcome,
  useRunOutcomes,
  type RunOutcome,
} from "@/lib/allProductsOutcomes";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { SAMPLE_FIXTURES, type SampleFixture, type ToolSlug } from "@/lib/sampleFixtures";
import { preflightFixture, type PreflightResult } from "@/lib/sampleFixturePreflight";
import {
  PRESET_DATASET_COUNT,
  isNonGdprFixtureForGdprOnlyProduct,
  pickPresetDatasets,
} from "@/lib/sampleDataPackages";
import { invokeWithTimeout, runGenerator } from "@/lib/sampleGenerators";
import {
  STRESS_INDUSTRIES,
  SLUG_TO_STRESS_TOOL,
  STRESS_TOOL_TO_SLUG,
  launchClaudeIntakeBatch,
  fetchClaudeBatchJobs,
  fetchClaudeBatchStatus,
  cancelClaudeBatch,

} from "@/lib/claudeIntake";

/** Products covered by the skeleton-graded SO batch above this panel. */
export const SO_COVERED_SLUGS: ToolSlug[] = [
  "cppa_risk", "cppa_cyber", "cppa_admt", "governance",
  "dpia", "li_assessment", "ir_playbook", "biometric", "registration",
];

/** Products with no SO batch dispatch — this panel is their only harness. */
export const EXTENDED_SLUGS: ToolSlug[] = ["dpa", "ropa", "us_notice", "eu_notice"];

export const SLUG_LABEL: Record<ToolSlug, string> = {
  li_assessment: "LIA (Legitimate Interests)",
  dpia: "DPIA Framework",
  dpa: "DPA Generator",
  governance: "GDPR Governance",
  ir_playbook: "IR Playbook",
  biometric: "Biometric Compliance",
  cppa_risk: "CPPA Risk Assessment",
  cppa_cyber: "CPPA Cybersecurity Audit",
  cppa_admt: "CPPA ADMT Assessment",
  ropa: "RoPA (Article 30)",
  us_notice: "US Notice Builder",
  eu_notice: "EU Notice Builder",
  registration: "Registration Manager",
};

type RunStatus = "idle" | "queued" | "running" | "complete" | "failed";

/**
 * Panel slug → generate-report-pdf tool_type — the SAME values the customer
 * result pages pass to PDFDownloadButton, so the outcome table's "Create PDF"
 * renders through the exact shipped path. Session-shaped products (RoPA, the
 * two Notice builders) produce their documents through their own pipelines
 * and have no generate-report-pdf branch; their outcome rows link to the
 * result instead.
 */
const SLUG_TO_PDF_TOOL_TYPE: Partial<Record<ToolSlug, string>> = {
  li_assessment: "li_assessment",
  governance: "governance_assessment",
  dpia: "dpia_framework",
  biometric: "biometric_checker",
  cppa_risk: "cppa_risk",
  cppa_cyber: "cppa_cybersecurity",
  cppa_admt: "cppa_admt",
  dpa: "dpa_generator",
  ir_playbook: "ir_playbook",
  registration: "registration_assessment",
};

interface RowState {
  status: RunStatus;
  log: string[];
  resultUrl: string | null;
  sourceRowId: string | null;
  preflight: PreflightResult | null;
}

const EMPTY: RowState = { status: "idle", log: [], resultUrl: null, sourceRowId: null, preflight: null };

const fixtureKey = (f: SampleFixture) => `${f.tool_slug}/${f.variant}`;

/** Live-log clock — 12-hour scale with am/pm (never 24-hour). */
export function formatLogTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(11, 19);
  const h24 = d.getHours();
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${h24 < 12 ? "am" : "pm"}`;
}

export function AllProductsPanel() {
  const { user } = useAuth();
  const [state, setState] = useState<Record<string, RowState>>({});
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [expanded, setExpanded] = useState<string | null>(null);
  // Batch-outcomes table collapse (simple toggle; open by default).
  const [outcomesOpen, setOutcomesOpen] = useState(true);
  // BATCH NUMBER — how many sample runs to generate per selected product.
  // Mirrors the "Batch size" control in the skeleton console below; default 1.
  const [batchNumber, setBatchNumber] = useState<number>(1);
  // "-supplemental" fixtures are second-pass (regeneration / supplemental
  // capture) variants of the SAME products, not extra products. Hidden by
  // default so the list is one row per shipped product variant.
  const [showSupplemental, setShowSupplemental] = useState(false);
  // INTAKE SOURCE — "preset" uses the canonical sample package (SAMPLE_FIXTURES);
  // "claude" runs the products against Claude-generated intake produced by
  // generate-stress-fixtures, exactly as /admin/static-stress does.
  const [intakeSource, setIntakeSource] = useState<"preset" | "claude">("preset");
  const [industryId, setIndustryId] = useState<string>(STRESS_INDUSTRIES[0].id);
  const [claudeBatchId, setClaudeBatchId] = useState<string | null>(() => {
    try {
      return window.sessionStorage.getItem("eup.allProductsTest.activeClaudeBatch");
    } catch {
      return null;
    }
  });


  const fixtures = useMemo(() => {
    const order = [...EXTENDED_SLUGS, ...SO_COVERED_SLUGS];
    return [...SAMPLE_FIXTURES]
      .filter((f) => showSupplemental || !f.variant.endsWith("-supplemental"))
      // GDPR-ONLY PRODUCTS: Governance, DPIA and Registration are run by
      // GDPR-subject clients, so their US-jurisdiction fixtures are not
      // offered as pre-set data here.
      .filter((f) => !isNonGdprFixtureForGdprOnlyProduct(f))
      .sort(
        (a, b) => order.indexOf(a.tool_slug) - order.indexOf(b.tool_slug) || a.variant.localeCompare(b.variant),
      );
  }, [showSupplemental]);

  const [selected, setSelected] = useState<Set<string>>(
    () =>
      new Set(
        SAMPLE_FIXTURES.filter(
          (f) => !f.variant.endsWith("-supplemental"),
        ).map(fixtureKey),
      ),
  );


  // Preflight is cheap and pure — run it on mount so the intake health of
  // every fixture is visible before anyone presses Run.
  useEffect(() => {
    setState((prev) => {
      const next = { ...prev };
      for (const f of fixtures) {
        const k = fixtureKey(f);
        next[k] = { ...(next[k] ?? EMPTY), preflight: preflightFixture(f) };
      }
      return next;
    });
  }, [fixtures]);

  // Recover the newest backend batch for this admin even when it began before
  // this browser build stored its id. This also repairs the currently running
  // batch's progress display without requiring the operator to relaunch it.
  useEffect(() => {
    if (!user?.id || claudeBatchId || busy) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("static_stress_batches")
        .select("id")
        .eq("run_by", user.id)
        .in("status", ["pending", "setting_up", "running"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || error || !data?.id) return;
      window.sessionStorage.setItem("eup.allProductsTest.activeClaudeBatch", data.id);
      setClaudeBatchId(data.id);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, claudeBatchId, busy]);

  // A Claude-intake batch runs in the backend after dispatch. Reattach its
  // progress monitor after a reload/navigation so the Live log does not go
  // silent while the batch itself continues.
  useEffect(() => {
    if (!claudeBatchId || busy) return;
    let cancelled = false;
    const seen = new Map<string, string>();
    const gradingWork: Promise<void>[] = [];
    let lastSummary = "";

    const monitor = async () => {
      appendAllProductsLog("batch", `↻ reattached to batch ${claudeBatchId}`);
      for (let poll = 0; poll < 400 && !cancelled; poll++) {
        try {
          const [jobs, batch] = await Promise.all([
            fetchClaudeBatchJobs(claudeBatchId),
            fetchClaudeBatchStatus(claudeBatchId),
          ]);
          if (cancelled) return;
          for (const j of jobs) {
            if (seen.get(j.id) === j.status) continue;
            seen.set(j.id, j.status);
            const slug = STRESS_TOOL_TO_SLUG[j.tool_slug];
            const row = fixtures.find((f) => f.tool_slug === slug);
            const k = row ? fixtureKey(row) : `stress/${j.tool_slug}`;
            const prefix = j.status === "complete" ? "✅" : j.status === "failed" ? "❌" : "▶";
            appendLog(k, `${prefix} ${j.company_name ?? "company"} — ${j.tool_slug}: ${j.status}${j.error_message ? ` — ${j.error_message}` : ""}`);
            if (row) {
              setRow(k, {
                status: j.status === "complete" ? "complete" : j.status === "failed" ? "failed" : "running",
                sourceRowId: j.source_row_id,
              });
              // GRADING FIX (2026-08-29): the reattached monitor used to only
              // print job states — it never recorded the run nor called the
              // Claude+GPT grader, so the scores matrix stayed empty for any
              // batch that outlived its launching page session.
              if (j.status === "complete" || j.status === "failed") {
                const lb = ensureLocalBatchFor(claudeBatchId);
                let outcomeId: string | undefined;
                if (claimOnce(lb, j.id, "run")) {
                  recordLocalRun(lb, SLUG_TO_STRESS_TOOL[row.tool_slug], j.status === "complete");
                  outcomeId = newOutcomeId();
                  recordOutcome({
                    id: outcomeId,
                    batchId: lb,
                    startedAt: new Date().toISOString(),
                    finishedAt: new Date().toISOString(),
                    tool_slug: row.tool_slug,
                    variant: `claude/${j.company_name ?? "company"}`,
                    source: "claude",
                    status: j.status === "complete" ? "complete" : "failed",
                    sourceRowId: j.source_row_id,
                    resultUrl: j.source_row_id
                      ? row.result_url_pattern.replace("{id}", j.source_row_id)
                      : null,
                    error: j.error_message ?? undefined,
                    claudeScore: null,
                    gptScore: null,
                    meanScore: null,
                  });
                }
                if (j.status === "complete" && j.source_row_id && claimOnce(lb, j.id, "score")) {
                  gradingWork.push(
                    gradeAndRecord(
                      lb,
                      row.tool_slug,
                      j.source_row_id,
                      `claude-intake/${j.company_name ?? "company"}`,
                      k,
                      outcomeId,
                    ).catch((e) => appendLog(k, `· grading error — ${(e as Error).message}`)),
                  );
                }
              }
            }
          }

          const summary = `setup ${batch.setup_done}/${batch.setup_total} · jobs ${batch.completed_jobs + batch.failed_jobs}/${batch.total_jobs} (${batch.status})`;
          if (summary !== lastSummary) {
            appendAllProductsLog("batch", `… ${summary}`);
            lastSummary = summary;
          }
          if (["complete", "completed", "failed", "cancelled"].includes(batch.status)) {
            // COMPLETION LAW — "batch complete" is only printed once every
            // grading call started by this monitor has settled.
            if (gradingWork.length) {
              appendAllProductsLog("batch", `… waiting for ${gradingWork.length} grading call(s) to finish`);
              await Promise.allSettled(gradingWork);
            }
            appendAllProductsLog(
              "batch",
              `${batch.failed_jobs ? "❌" : "✅"} batch ${batch.status} — ${batch.completed_jobs} complete, ${batch.failed_jobs} failed · ${gradingWork.length} graded`,
              batch.failed_jobs ? "error" : "success",
            );
            window.sessionStorage.removeItem("eup.allProductsTest.activeClaudeBatch");
            setClaudeBatchId(null);
            return;
          }
        } catch (error) {
          appendAllProductsLog("batch", `❌ progress refresh failed — ${(error as Error).message}`, "error");
        }
        await new Promise((resolve) => setTimeout(resolve, 6000));
      }
    };

    void monitor();
    return () => {
      cancelled = true;
    };
  }, [claudeBatchId, busy, fixtures]);

  const setRow = (k: string, patch: Partial<RowState>) =>
    setState((s) => ({ ...s, [k]: { ...(s[k] ?? EMPTY), ...patch } }));

  // CANCEL BATCH — terminal-marks the active Claude-intake batch and its
  // unfinished jobs, then detaches this panel's progress monitor.
  async function cancelActiveBatch() {
    if (!claudeBatchId) return;
    setCancelling(true);
    try {
      const { cancelledJobs } = await cancelClaudeBatch(claudeBatchId);
      appendAllProductsLog(
        "batch",
        `⛔ batch ${claudeBatchId} cancelled — ${cancelledJobs} unfinished job(s) stopped`,
        "error",
      );
      window.sessionStorage.removeItem("eup.allProductsTest.activeClaudeBatch");
      setClaudeBatchId(null);
      setBusy(false);
    } catch (e) {
      appendAllProductsLog("batch", `❌ cancel failed — ${(e as Error).message}`, "error");
    } finally {
      setCancelling(false);
    }
  }


  // Every per-row line is also published to the shared run-log bus so the
  // "Live log" card on /admin/all-products-test shows this run, not only
  // server-side quality_batch_log rows.
  const appendLog = (k: string, msg: string) => {
    appendAllProductsLog(
      k,
      msg,
      msg.startsWith("❌") ? "error" : msg.startsWith("✅") ? "success" : "info",
    );
    setState((s) => {
      const row = s[k] ?? EMPTY;
      return { ...s, [k]: { ...row, log: [...row.log, msg].slice(-200) } };
    });
  };

  const toggle = (k: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });

  const failedPreflight = fixtures.filter(
    (f) => selected.has(fixtureKey(f)) && state[fixtureKey(f)]?.preflight?.ok === false,
  );

  // CLAUDE INTAKE PATH — launches a stress batch (generate-stress-fixtures →
  // static_stress_jobs → run-stress-job) and mirrors the server-side job
  // states into this panel's rows and the shared live log.
  async function runClaudeBatch(queue: SampleFixture[], userId: string) {
    const slugs = Array.from(new Set(queue.map((f) => f.tool_slug)));
    setBusy(true);
    clearAllProductsLog();
    const industryLabel = STRESS_INDUSTRIES.find((i) => i.id === industryId)?.label ?? industryId;
    appendAllProductsLog(
      "batch",
      `▶ Claude intake batch — ${slugs.length} product(s), industry "${industryLabel}", ${Math.min(2, batchNumber)} company slot(s) per geo`,
    );
    for (const f of queue) setRow(fixtureKey(f), { status: "queued", log: [], resultUrl: null });

    try {
      const batchId = await launchClaudeIntakeBatch({
        userId,
        slugs,
        industryId,
        companiesPerGeo: batchNumber,
      });
      // ONE-COLUMN LAW (2026-08-31): a Claude batch owns exactly ONE local
      // batch column, derived from the server batch id. The launching monitor
      // and any reattached monitor therefore write to the same column instead
      // of splitting one run's documents across two columns (the defect that
      // made a 14-job batch look like "6 documents, 3 graded").
      const localBatchId = ensureLocalBatchFor(batchId);
      setClaudeBatchId(batchId);
      window.sessionStorage.setItem("eup.allProductsTest.activeClaudeBatch", batchId);
      appendAllProductsLog("batch", `✓ batch ${batchId} — Claude is generating intake data server-side`);

      const seen = new Map<string, string>();
      // RELIABILITY FIX (2026-08-29): grading calls used to be fired with
      // `void` — unawaited, invisible to the batch's completion, and any
      // rejection was unhandled. They are now collected and settled before
      // the batch is declared finished, so "batch complete" means the scores
      // are in too.
      const gradingWork: Promise<void>[] = [];
      let recordedDocs = 0;
      let gradedDocs = 0;
      for (let poll = 0; poll < 400; poll++) {
        await new Promise((r) => setTimeout(r, 6000));
        // MONITOR-RESILIENCE LAW (2026-08-31): a single timed-out status read
        // used to throw straight out of this loop, abandoning the batch
        // mid-flight while the server kept producing documents. Every poll is
        // now isolated: a failed read is logged and retried on the next tick.
        let jobs: Awaited<ReturnType<typeof fetchClaudeBatchJobs>>;
        let batch: Awaited<ReturnType<typeof fetchClaudeBatchStatus>>;
        try {
          [jobs, batch] = await Promise.all([
            fetchClaudeBatchJobs(batchId),
            fetchClaudeBatchStatus(batchId),
          ]);
        } catch (readErr) {
          appendAllProductsLog(
            "batch",
            `… progress read failed, retrying — ${(readErr as Error).message}`,
          );
          continue;
        }
        for (const j of jobs) {
          if (seen.get(j.id) === j.status) continue;
          seen.set(j.id, j.status);
          const slug = STRESS_TOOL_TO_SLUG[j.tool_slug];
          const row = queue.find((f) => f.tool_slug === slug);
          const k = row ? fixtureKey(row) : `stress/${j.tool_slug}`;
          const prefix = j.status === "complete" ? "✅" : j.status === "failed" ? "❌" : "▶";
          appendLog(
            k,
            `${prefix} ${j.company_name ?? "company"} — ${j.tool_slug}: ${j.status}${j.error_message ? ` — ${j.error_message}` : ""}`,
          );
          if (row) {
            setRow(k, {
              status: j.status === "complete" ? "complete" : j.status === "failed" ? "failed" : "running",
              sourceRowId: j.source_row_id,
            });
            if (j.status === "complete" || j.status === "failed") {
              let outcomeId: string | undefined;
              if (claimOnce(localBatchId, j.id, "run")) {
                outcomeId = newOutcomeId();
                recordedDocs += 1;
                recordOutcome({
                  id: outcomeId,
                  batchId: localBatchId,
                  startedAt: new Date().toISOString(),
                  finishedAt: new Date().toISOString(),
                  tool_slug: row.tool_slug,
                  variant: `claude/${j.company_name ?? "company"}`,
                  source: "claude",
                  status: j.status === "complete" ? "complete" : "failed",
                  sourceRowId: j.source_row_id,
                  resultUrl: j.source_row_id
                    ? row.result_url_pattern.replace("{id}", j.source_row_id)
                    : null,
                  error: j.error_message ?? undefined,
                  claudeScore: null,
                  gptScore: null,
                  meanScore: null,
                });
                recordLocalRun(
                  localBatchId,
                  SLUG_TO_STRESS_TOOL[row.tool_slug],
                  j.status === "complete",
                );
              }
              if (
                j.status === "complete" && j.source_row_id &&
                claimOnce(localBatchId, j.id, "score")
              ) {
                gradedDocs += 1;
                gradingWork.push(
                  gradeAndRecord(
                    localBatchId,
                    row.tool_slug,
                    j.source_row_id,
                    `claude-intake/${j.company_name ?? "company"}`,
                    k,
                    outcomeId,
                  ).catch((e) => appendLog(k, `· grading error — ${(e as Error).message}`)),
                );
              }
            }
          } else {
            // A dispatched job whose product has no row in this queue would
            // otherwise vanish silently. Say so rather than lose the document.
            appendAllProductsLog(
              "batch",
              `⚠ job ${j.tool_slug} has no matching product row in this run — not recorded`,
              "error",
            );
          }
        }
        const progressSummary = `… setup ${batch.setup_done}/${batch.setup_total} · jobs ${batch.completed_jobs + batch.failed_jobs}/${batch.total_jobs} (${batch.status})`;
        if (poll === 0 || seen.get("__progress__") !== progressSummary) {
          appendAllProductsLog(
            "batch",
            progressSummary,
          );
          seen.set("__progress__", progressSummary);
        }
        // SETUP-GATE LAW (2026-09-02) — a "complete" status published while
        // setup is still inserting companies is premature (a worker drained
        // the first company's jobs during the fixture lull). Only "cancelled"
        // is terminal before setup finishes; otherwise keep monitoring.
        const setupFinished =
          (batch.setup_total ?? 0) > 0 && (batch.setup_done ?? 0) >= batch.setup_total;
        if (
          batch.status === "cancelled" ||
          (setupFinished && ["complete", "completed", "failed"].includes(batch.status))
        ) {
          if (gradingWork.length) {
            appendAllProductsLog("batch", `… waiting for ${gradingWork.length} grading call(s) to finish`);
            await Promise.allSettled(gradingWork);
          }
          appendAllProductsLog(
            "batch",
            `${batch.failed_jobs ? "❌" : "✅"} batch ${batch.status} — ${batch.completed_jobs} complete, ${batch.failed_jobs} failed · ${recordedDocs}/${batch.total_jobs} document(s) recorded, ${gradedDocs} graded`,
            batch.failed_jobs ? "error" : "success",
          );
          if (recordedDocs < batch.total_jobs) {
            appendAllProductsLog(
              "batch",
              `⚠ ${batch.total_jobs - recordedDocs} dispatched job(s) were never recorded in this column — reload the page to reattach and backfill`,
              "error",
            );
          }
          toast[batch.failed_jobs ? "error" : "success"](
            `Claude batch ${batch.status}: ${batch.completed_jobs} complete, ${batch.failed_jobs} failed`,
          );
          window.sessionStorage.removeItem("eup.allProductsTest.activeClaudeBatch");
          setClaudeBatchId(null);
          return;
        }
      }
      appendAllProductsLog("batch", "… still running server-side — see /admin/static-stress for the rest of this batch");
      toast.message("Batch still running server-side — it continues without this page");
    } catch (e) {
      appendAllProductsLog("batch", `❌ ${(e as Error).message}`, "error");
      toast.error(`Claude intake batch failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  /**
   * DUAL-MODEL SCORING — every product graded by Claude AND GPT.
   * Runs immediately after a successful generation, against the row/session
   * the run produced. Grading failures never fail the run itself. The result
   * (scores AND the full payload) is written onto the run's OUTCOME entry so
   * the batch outcome table can offer a per-run analysis download.
   */
  async function gradeAndRecord(
    batchId: string,
    slug: ToolSlug,
    sourceRowId: string | null,
    label: string,
    logKey: string,
    outcomeId?: string,
  ) {
    if (!sourceRowId) return;
    if (!SLUG_TO_GRADER_TOOL[slug]) {
      appendLog(logKey, "· grading skipped — no grader tool for this product");
      if (outcomeId) updateOutcome(outcomeId, { gradeError: "no grader tool for this product" });
      return;
    }
    appendLog(logKey, "· grading (Claude + GPT)…");
    const res = await gradeRun(slug, sourceRowId, label);
    if (!res) return;
    if (res.claude == null && res.gpt == null) {
      appendLog(logKey, `· grading failed — ${res.error ?? "no score"}`);
      if (outcomeId) updateOutcome(outcomeId, { gradeError: res.error ?? "no score" });
      return;
    }
    recordLocalScore(batchId, SLUG_TO_STRESS_TOOL[slug], res.claude, res.gpt);
    if (outcomeId) {
      updateOutcome(outcomeId, {
        claudeScore: res.claude,
        gptScore: res.gpt,
        meanScore: res.mean,
        gradePayload: res.payload,
      });
    }
    appendLog(
      logKey,
      `· scored — Claude ${res.claude?.toFixed(1) ?? "—"} / GPT ${res.gpt?.toFixed(1) ?? "—"}`,
    );
  }

  /**
   * OUTCOME-TABLE PDF CREATION — renders the run's document through the SAME
   * generate-report-pdf path customer result pages use, then opens the signed
   * URL and pins it on the outcome row.
   */
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  async function createPdfForOutcome(o: RunOutcome) {
    const toolType = SLUG_TO_PDF_TOOL_TYPE[o.tool_slug];
    if (!toolType || !o.sourceRowId) return;
    setPdfBusy(o.id);
    try {
      // FREEZE FIX: PDF rendering (PDFShift) can take a while but must never
      // wedge the button forever — 3-minute client cap.
      const { data, error } = await invokeWithTimeout<{ pdf_url?: string; error?: string }>(
        "generate-report-pdf",
        { tool_type: toolType, assessment_id: o.sourceRowId },
        180_000,
      );
      if (error || !data?.pdf_url) {
        const raw = error?.message || data?.error || "no pdf_url returned";
        // PDF FIX (2026-08-31): the commonest panel PDF failure is an expired
        // admin session (generate-report-pdf answers 401 auth_expired), which
        // surfaced only as an opaque "non-2xx status".
        throw new Error(
          /auth_expired|401|Session expired/i.test(raw)
            ? "session expired — sign in again, then press Create PDF"
            : raw,
        );
      }
      updateOutcome(o.id, { pdfUrl: data.pdf_url as string, pdfUrlAt: Date.now() });
      window.open(data.pdf_url as string, "_blank", "noopener");
    } catch (e) {
      toast.error(`PDF failed: ${(e as Error).message}`);
    } finally {
      setPdfBusy(null);
    }
  }

  /** GOLDEN DATA SET — download the canonical fixture package (the exact
   *  contract-conformant intake payloads the preset runs use). */
  function downloadGoldenDataSet() {
    const wanted = fixtures.filter((f) => selected.size === 0 || selected.has(fixtureKey(f)));
    const blob = new Blob(
      [JSON.stringify(wanted, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `golden-data-set-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function runSelected() {
    if (!user?.id) return toast.error("Sign in as an admin first");
    const queue = fixtures.filter((f) => selected.has(fixtureKey(f)));
    if (!queue.length) return toast.error("Select at least one product");

    if (intakeSource === "claude") return runClaudeBatch(queue, user.id);



    // INTAKE GATE — refuse the whole run rather than emit a doomed dispatch.
    const bad = queue.map((f) => preflightFixture(f)).filter((r) => !r.ok);
    if (bad.length) {
      for (const r of bad) setRow(`${r.tool_slug}/${r.variant}`, { preflight: r, status: "failed" });
      toast.error(`Preflight failed for ${bad.map((b) => b.label).join(", ")} — run refused`);
      return;
    }

    setBusy(true);
    clearAllProductsLog();
    // BATCH LAW — every press opens its own local batch column in the
    // "Tools & batch scores" matrix; results never fold into an earlier batch.
    const localBatchId = startLocalBatch();
    appendAllProductsLog(
      "batch",
      `▶ starting ${queue.length} product(s) × ${batchNumber} run(s)`,
    );
    // PRE-SET PACKAGE SELECTION LAW — each product carries 5 complete
    // datasets. Fewer than 5 requested runs → that many datasets picked at
    // random; 5 or more → exactly the 5 datasets (data is never repeated).
    const plan = new Map<string, SampleFixture[]>();
    for (const f of queue) plan.set(fixtureKey(f), pickPresetDatasets(f, batchNumber));
    const totalRuns = [...plan.values()].reduce((n, ds) => n + ds.length, 0);
    if (batchNumber > PRESET_DATASET_COUNT) {
      appendAllProductsLog(
        "batch",
        `pre-set package holds ${PRESET_DATASET_COUNT} datasets per product — capping ${batchNumber} requested runs at ${PRESET_DATASET_COUNT}`,
      );
    }
    for (const f of queue) setRow(fixtureKey(f), { status: "queued", log: [], resultUrl: null });
    let ok = 0;
    let attempted = 0;
    // CONCURRENCY LAW (2026-08-31): products run through a 4-lane worker pool.
    // Deterministic engines take ~60–70s each, so a serial 13-product sweep
    // costs ~15 min of wall time; 4 lanes collapse it to ~4 min while staying
    // well under gateway throttle limits. Datasets WITHIN a product stay
    // serial (QUEUE LAW below still applies per product).
    const LOCAL_RUN_CONCURRENCY = 4;
    const runProduct = async (f: (typeof queue)[number]) => {
      const k = fixtureKey(f);
      setRow(k, { status: "running" });
      const datasets = plan.get(k) ?? [f];
      for (let i = 1; i <= datasets.length; i++) {
        const d = datasets[i - 1];
        const runLabel = datasets.length > 1 ? ` [dataset ${i}/${datasets.length} · ${d.variant}]` : "";
        appendLog(k, `▶ ${d.title}${runLabel}`);
        attempted += 1;
        const outcomeId = newOutcomeId();
        const startedAt = new Date().toISOString();
        try {
          const out = await runGenerator(d, user.id, (m) => appendLog(k, m));
          ok += 1;
          appendLog(k, `✅ complete${runLabel} — ${out.resultUrl}`);
          setRow(k, { status: "complete", resultUrl: out.resultUrl, sourceRowId: out.sourceRowId });
          recordLocalRun(localBatchId, SLUG_TO_STRESS_TOOL[f.tool_slug], true);
          recordOutcome({
            id: outcomeId,
            batchId: localBatchId,
            startedAt,
            finishedAt: new Date().toISOString(),
            tool_slug: f.tool_slug,
            variant: d.variant,
            source: "preset",
            status: "complete",
            sourceRowId: out.sourceRowId,
            resultUrl: out.resultUrl,
            claudeScore: null,
            gptScore: null,
            meanScore: null,
          });
          await gradeAndRecord(localBatchId, f.tool_slug, out.sourceRowId, `${d.tool_slug}/${d.variant}`, k, outcomeId);
        } catch (e) {
          appendLog(k, `❌${runLabel} ${(e as Error).message}`);
          setRow(k, { status: "failed" });
          recordLocalRun(localBatchId, SLUG_TO_STRESS_TOOL[f.tool_slug], false);
          recordOutcome({
            id: outcomeId,
            batchId: localBatchId,
            startedAt,
            finishedAt: new Date().toISOString(),
            tool_slug: f.tool_slug,
            variant: d.variant,
            source: "preset",
            status: "failed",
            sourceRowId: null,
            resultUrl: null,
            error: (e as Error).message,
            claudeScore: null,
            gptScore: null,
            meanScore: null,
          });
          // QUEUE LAW (2026-08-31): a run that times out or errors ends THIS
          // product's remaining datasets only — the batch always moves on to
          // the next product instead of grinding through four more copies of
          // a generator that is currently broken.
          if (i < datasets.length) {
            appendLog(k, `⏭ skipping ${datasets.length - i} remaining dataset(s) for this product`);
          }
          break;
        }
      }
    };

    // Worker pool: each lane pulls the next product until the queue drains.
    let cursor = 0;
    const lane = async () => {
      while (cursor < queue.length) {
        const f = queue[cursor++];
        await runProduct(f);
      }
    };
    await Promise.all(
      Array.from({ length: Math.min(LOCAL_RUN_CONCURRENCY, queue.length) }, () => lane()),
    );
    setBusy(false);
    // COMPLETION LAW (2026-08-31): the pre-set path finished with a toast only,
    // so the Live log gave no terminal line and a finished batch was
    // indistinguishable from a stalled one. Always close the log.
    appendAllProductsLog(
      "batch",
      `${ok === totalRuns ? "✅" : "❌"} batch complete — ${ok}/${totalRuns} run(s) succeeded${
        attempted !== totalRuns ? ` · ${totalRuns - attempted} not attempted` : ""
      }`,
      ok === totalRuns ? "success" : "error",
    );
    toast[ok === totalRuns ? "success" : "error"](`${ok}/${totalRuns} runs completed`);
  }

  function runPreflightOnly() {
    let bad = 0;
    for (const f of fixtures) {
      const r = preflightFixture(f);
      if (!r.ok) bad += 1;
      setRow(fixtureKey(f), { preflight: r });
    }
    toast[bad ? "error" : "success"](
      bad ? `${bad} fixture(s) have intake problems` : `All ${fixtures.length} sample fixtures pass intake preflight`,
    );
  }

  const outcomes = useRunOutcomes();
  const liveLog = useAllProductsLog();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3">
          <span>All Products — sample data + live generation</span>
          <span className="font-mono text-xs text-muted-foreground">sampleGenerators · contract-preflight-gated</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          1&nbsp;Select products → 2&nbsp;choose the intake data source → 3&nbsp;set the batch size and run.
          The live log streams every step; the batch outcome table below records each run with its
          Claude&nbsp;+&nbsp;GPT scores, PDF creation, and a downloadable analysis. Every run is graded by the
          same dual-model rubric; every preset run is gated by the contract-level intake preflight.
        </p>

        {/* ── 1. PRODUCT SELECTION ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">1 · Products</span>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setSelected(new Set(fixtures.map(fixtureKey)))}
          >
            Select all
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setSelected(new Set())}>
            Clear
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              setSelected(new Set(fixtures.filter((f) => EXTENDED_SLUGS.includes(f.tool_slug)).map(fixtureKey)))
            }
          >
            Only non-SO products
          </Button>
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={showSupplemental}
              disabled={busy}
              onCheckedChange={(v) => setShowSupplemental(v === true)}
            />
            Show second-pass (supplemental capture) variants
          </label>
        </div>

        <div className="divide-y rounded border">
          {fixtures.map((f) => {
            const k = fixtureKey(f);
            const row = state[k] ?? EMPTY;
            const pf = row.preflight;
            return (
              <div key={k} className="p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Checkbox checked={selected.has(k)} onCheckedChange={() => toggle(k)} disabled={busy} />
                  <span className="min-w-[15rem] text-sm font-medium">{SLUG_LABEL[f.tool_slug]}</span>
                  <span className="font-mono text-xs text-muted-foreground">{f.variant}</span>
                  <Badge variant={SO_COVERED_SLUGS.includes(f.tool_slug) ? "secondary" : "outline"}>
                    {SO_COVERED_SLUGS.includes(f.tool_slug) ? "SO batch" : "panel only"}
                  </Badge>
                  {pf && (
                    <Badge variant={pf.ok ? "secondary" : "destructive"}>
                      {pf.ok ? "intake ok" : `intake: ${pf.issues.length} issue(s)`}
                    </Badge>
                  )}
                  {row.status !== "idle" && (
                    <Badge
                      variant={
                        row.status === "complete" ? "default" : row.status === "failed" ? "destructive" : "outline"
                      }
                    >
                      {row.status}
                    </Badge>
                  )}
                  {row.resultUrl && (
                    <Link to={row.resultUrl} className="text-xs text-primary underline">
                      open result
                    </Link>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto"
                    onClick={() => setExpanded(expanded === k ? null : k)}
                  >
                    {expanded === k ? "hide" : "details"}
                  </Button>
                </div>

                {expanded === k && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">{f.scenario_summary}</p>
                    {pf && !pf.ok && (
                      <ul className="list-inside list-disc text-xs text-destructive">
                        {pf.issues.map((i) => (
                          <li key={i.key}>
                            {i.key} — {i.problem}
                          </li>
                        ))}
                      </ul>
                    )}
                    {row.log.length > 0 && (
                      <pre className="max-h-64 overflow-auto rounded bg-muted p-2 font-mono text-[11px] leading-4">
                        {row.log.join("\n")}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── 2. INTAKE DATA SOURCE — pre-set package vs Claude-generated. ── */}
        <div className="flex flex-wrap items-end gap-4 rounded border bg-muted/30 p-3">
          <div>
            <Label className="text-xs">Intake data source</Label>
            <div className="mt-1 flex gap-1">
              <Button
                size="sm"
                variant={intakeSource === "preset" ? "default" : "outline"}
                disabled={busy}
                onClick={() => setIntakeSource("preset")}
              >
                Pre-set data package
              </Button>
              <Button
                size="sm"
                variant={intakeSource === "claude" ? "default" : "outline"}
                disabled={busy}
                onClick={() => setIntakeSource("claude")}
              >
                Claude-generated intake
              </Button>
            </div>
          </div>
          {intakeSource === "claude" && (
            <div>
              <Label htmlFor="claude-industry" className="text-xs">Industry (company profile)</Label>
              <select
                id="claude-industry"
                className="mt-1 h-9 w-64 rounded border bg-background px-2 text-sm"
                value={industryId}
                disabled={busy}
                onChange={(e) => setIndustryId(e.target.value)}
              >
                {STRESS_INDUSTRIES.map((i) => (
                  <option key={i.id} value={i.id}>{i.label}</option>
                ))}
              </select>
            </div>
          )}
          <p className="max-w-xl text-xs text-muted-foreground">
            {intakeSource === "preset"
              ? "Canonical sample fixtures are inserted directly and each generator is invoked and polled here."
              : "Claude writes a fresh, internally consistent company profile per geo (generate-stress-fixtures) and every selected product runs against it server-side via the stress harness. Progress streams into the live log; results also appear at /admin/static-stress."}
          </p>
          {claudeBatchId && intakeSource === "claude" && (
            <span className="font-mono text-[11px] text-muted-foreground">batch {claudeBatchId}</span>
          )}
        </div>

        {/* ── 3. BATCH SIZE + RUN ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-end gap-4">
          <span className="pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">3 · Batch</span>
          <div className="w-40">
            <Label htmlFor="batch-number">
              {intakeSource === "claude" ? "Company slots per geo (max 2)" : "Batch size (runs per product)"}
            </Label>
            <Input
              id="batch-number"
              type="number"
              min={1}
              max={20}
              value={batchNumber}
              disabled={busy}
              onChange={(e) => setBatchNumber(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            />
          </div>
          <Button size="sm" onClick={runSelected} disabled={busy}>
            {busy ? "Running…" : `Run selected (${selected.size})`}
          </Button>
          <Button size="sm" variant="outline" onClick={runPreflightOnly} disabled={busy}>
            Preflight intake data
          </Button>
          <Button size="sm" variant="outline" onClick={downloadGoldenDataSet} disabled={busy}>
            Download golden data set
          </Button>
          {/* CANCEL BATCH — stops the active Claude-intake batch server-side. */}
          <Button
            size="sm"
            variant="destructive"
            onClick={cancelActiveBatch}
            disabled={!claudeBatchId || cancelling}
          >
            {cancelling ? "Cancelling…" : "Cancel batch"}
          </Button>

          <p className="max-w-md text-xs text-muted-foreground">
            {intakeSource === "claude"
              ? "Claude generates this many companies per geography (US and EU), each run against every selected product."
              : `Each selected product runs this many of its 5 pre-set datasets (fewer than 5 → picked at random; 5 or more → all ${PRESET_DATASET_COUNT}).`}
          </p>
        </div>

        {failedPreflight.length > 0 && (
          <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-sm">
            Intake preflight failing for {failedPreflight.length} selected fixture(s) — runs are blocked until
            fixed.
          </div>
        )}

        {/* ── 4. LIVE LOG ─────────────────────────────────────────────── */}
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">4 · Live log</span>
            <Button size="sm" variant="ghost" onClick={() => clearAllProductsLog()} disabled={busy}>
              clear
            </Button>
          </div>
          <pre className="max-h-72 overflow-auto rounded border bg-muted/40 p-2 font-mono text-[11px] leading-4">
            {liveLog.length === 0
              ? "— no run in this session yet —"
              : liveLog
                  .map((l) => `${formatLogTime(l.t)} ${l.level === "error" ? "✖" : l.level === "success" ? "✔" : "·"} [${l.source}] ${l.msg}`)
                  .join("\n")}
          </pre>
        </div>

        {/* ── 5. TEST BATCH OUTCOME TABLE ─────────────────────────────── */}
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setOutcomesOpen((v) => !v)}
              aria-expanded={outcomesOpen}
              className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
            >
              <span aria-hidden>{outcomesOpen ? "▾" : "▸"}</span>
              5 · Batch outcomes ({outcomes.length})
            </button>
            <Button size="sm" variant="outline" disabled={!outcomes.length} onClick={() => downloadAllAnalyses(outcomes)}>
              Download analyses (JSON)
            </Button>
            <Button size="sm" variant="outline" disabled={!outcomes.length} onClick={() => downloadOutcomesCsv(outcomes)}>
              Download CSV
            </Button>
            <Button size="sm" variant="ghost" disabled={!outcomes.length || busy} onClick={() => clearOutcomes()}>
              Clear outcomes
            </Button>
          </div>
          {!outcomesOpen ? null : outcomes.length === 0 ? (
            <p className="rounded border bg-muted/30 p-3 text-xs text-muted-foreground">
              Run a batch above — every run lands here with its scores, PDF creation, and analysis download.
            </p>
          ) : (
            <div className="overflow-x-auto rounded border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-2">When</th>
                    <th className="p-2">Product</th>
                    <th className="p-2">Variant</th>
                    <th className="p-2">Source</th>
                    <th className="p-2">Status</th>
                    <th className="p-2 text-right">Claude</th>
                    <th className="p-2 text-right">GPT</th>
                    <th className="p-2 text-right">Mean</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {outcomes.map((o) => (
                    <tr key={o.id}>
                      <td className="whitespace-nowrap p-2 font-mono">{o.startedAt.slice(5, 16).replace("T", " ")}</td>
                      <td className="p-2">{SLUG_LABEL[o.tool_slug] ?? o.tool_slug}</td>
                      <td className="p-2 font-mono">{o.variant}</td>
                      <td className="p-2">{o.source}</td>
                      <td className="p-2">
                        <Badge variant={o.status === "complete" ? "default" : "destructive"}>{o.status}</Badge>
                        {(o.error || o.gradeError) && (
                          <span className="ml-1 text-destructive" title={o.error ?? o.gradeError}>!</span>
                        )}
                      </td>
                      <td className="p-2 text-right font-mono">{o.claudeScore?.toFixed(1) ?? "—"}</td>
                      <td className="p-2 text-right font-mono">{o.gptScore?.toFixed(1) ?? "—"}</td>
                      <td className="p-2 text-right font-mono">{o.meanScore?.toFixed(1) ?? "—"}</td>
                      <td className="space-x-2 whitespace-nowrap p-2">
                        {o.resultUrl && (
                          <Link to={o.resultUrl} className="text-primary underline">
                            open
                          </Link>
                        )}
                        {o.status === "complete" && SLUG_TO_PDF_TOOL_TYPE[o.tool_slug] && o.sourceRowId && (
                          o.pdfUrl ? (
                            <a href={o.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                              PDF
                            </a>
                          ) : (
                            <button
                              type="button"
                              className="text-primary underline disabled:opacity-50"
                              disabled={pdfBusy === o.id}
                              onClick={() => void createPdfForOutcome(o)}
                            >
                              {pdfBusy === o.id ? "PDF…" : "Create PDF"}
                            </button>
                          )
                        )}
                        {o.gradePayload != null && (
                          <button
                            type="button"
                            className="text-primary underline"
                            onClick={() => downloadOutcomeAnalysis(o)}
                          >
                            analysis
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AllProductsPanel;
