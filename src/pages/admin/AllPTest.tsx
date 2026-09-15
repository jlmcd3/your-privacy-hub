// /all-ptest — PRODUCT REVIEW LOOP.
//
// Same generation machinery as /admin/all-products-test (Claude-generated
// intake -> start-stress-batch -> run-stress-job), with the rubric grader
// replaced by two independent deep reviews and a new arbitration stage:
//
//   intake (Claude) -> deterministic generation -> deep review x2
//   -> arbitration -> Agreed Fix List + CEO Decision Sheet
//
// Formatting and layout are settled and are NOT reviewed here; the loop reads
// the customer-facing text for wording, grammar, legal meaning, logic and
// internal consistency. PDFs are not part of this loop.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  STRESS_INDUSTRIES,
  SLUG_TO_STRESS_TOOL,
  launchClaudeIntakeBatch,
  fetchClaudeBatchJobs,
  fetchClaudeBatchStatus,
  cancelClaudeBatch,
  type StressJobRow,
} from "@/lib/claudeIntake";
import { type ToolSlug } from "@/lib/sampleFixtures";

import {
  enqueuePtestJobs,
  tickPtestDriver,
  fetchPtestJobs,
  fetchPtestResults,
  cancelPtestJobs,
  buildPtestMarkdown,
  buildScoreMatrix,
  fetchReviewScores,
  downloadMarkdown,
  assertAdminSession,
  jobKindLabel,
  isReviewPhaseKind,
  seedGoldenPanel,
  listGoldenPanel,
  addGoldenFromAssessment,
  toggleGolden,
  fetchBatchDiff,
  launchFixtureBatch,
  fetchPanelCatalogue,
  type PanelCatalogueRow,
  type DeepReviewResult,
  type ArbitrationResult,
  type PtestEffort,
  type PtestJobRow,
  type PtestGoldenRow,
  type BatchDiff,
} from "@/lib/ptestRun";
import { PtestHistory } from "@/components/admin/PtestHistory";
import { recordBatchStart, setBatchStatus, syncFixItems } from "@/lib/ptestHistory";

const PRODUCTS: Array<{ slug: ToolSlug; label: string }> = [
  { slug: "cppa_risk", label: "CPPA Risk Assessment" },
  { slug: "cppa_cyber", label: "CPPA Cybersecurity Audit" },
  { slug: "cppa_admt", label: "CPPA ADMT Checker" },
  { slug: "dpia", label: "DPIA Framework" },
  { slug: "li_assessment", label: "Legitimate Interests Assessment" },
  { slug: "governance", label: "Governance Assessment" },
  { slug: "ir_playbook", label: "Incident Response Playbook" },
  { slug: "biometric", label: "Biometric Checker" },
  { slug: "dpa", label: "Custom DPA" },
];

const EFFORTS: PtestEffort[] = ["low", "medium", "high", "max"];
// Review and arbitration run as background jobs, so the request window no
// longer caps how long a model may think. Higher effort costs more and takes
// longer; it can no longer time the work out.
const EFFORT_WARNING = "Reviews and arbitration run as background jobs, so higher effort no longer risks a timeout — it only costs more and takes longer.";
/** Wall clock for the generation phase before the run gives up polling. */
const GENERATION_POLL_LIMIT_MS = 60 * 60 * 1000;

type Phase = "idle" | "generating" | "reviewing" | "arbitrating" | "done" | "error";

export default function AllPTest() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<ToolSlug[]>(["cppa_risk", "cppa_cyber", "cppa_admt"]);
  const [industryId, setIndustryId] = useState("web");
  // INTAKE SOURCE (CEO 2026-09-14): "panel" picks one committed fixture per
  // product at random (fifteen per product under ptest-fixtures/_local/panels);
  // "claude" writes a fresh company profile via the stress harness. Either
  // way the documents are generated server-side and then reviewed.
  // Default is "panel": the thirteen authored panels landed 2026-09-14.
  const [intakeSource, setIntakeSource] = useState<"panel" | "claude">("panel");
  // Documents per product from the chosen source (0 = golden panel only).
  const [count, setCount] = useState(1);
  const [useGolden, setUseGolden] = useState(true);
  const [catalogue, setCatalogue] = useState<PanelCatalogueRow[]>([]);
  const [reviewEffort, setReviewEffort] = useState<PtestEffort>("high");
  const [arbEffort, setArbEffort] = useState<PtestEffort>("high");
  const [goldens, setGoldens] = useState<PtestGoldenRow[]>([]);
  const [goldenBusy, setGoldenBusy] = useState(false);
  const [addProduct, setAddProduct] = useState("cppa-risk");
  const [addAssessment, setAddAssessment] = useState("");
  const [compareWith, setCompareWith] = useState("");
  const [diff, setDiff] = useState<BatchDiff | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);
  // INTAKE SOURCE — Claude-generated intake only. The pre-set data package is
  // deliberately not available on this page.


  const [phase, setPhase] = useState<Phase>("idle");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [reviews, setReviews] = useState<DeepReviewResult[]>([]);
  const [arbitrations, setArbitrations] = useState<ArbitrationResult[]>([]);
  const [jobs, setJobs] = useState<PtestJobRow[]>([]);
  // Bumped whenever a run records or updates history, so the panel reloads.
  const [historyKey, setHistoryKey] = useState(0);
  const cancelled = useRef(false);
  // Last seen status per review/arbitration job, so every state change is
  // written to the log exactly once.
  const jobStates = useRef<Map<string, string>>(new Map());
  const logRef = useRef<HTMLPreElement | null>(null);


  const say = useCallback((line: string) => {
    const stamp = new Date().toLocaleTimeString();
    setLog((prev) => [...prev, `${stamp}  ${line}`]);
  }, []);

  // Keep the newest line in view while a run is in progress.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  // History row first: a run that later fails is still visible and its
  // partial fix items remain reachable.
  const recordHistory = useCallback(async (id: string) => {
    try {
      await recordBatchStart({
        batchId: id,
        runBy: user?.id ?? null,
        industry: STRESS_INDUSTRIES.find((i) => i.id === industryId)?.label ?? industryId,

        products: selected,
        documentsPerProduct: count,
        reviewEffort,
        arbitrationEffort: arbEffort,
      });
      setHistoryKey((k) => k + 1);
    } catch (e) {
      say(`History row not recorded — ${(e as Error).message}`);
    }
  }, [user?.id, industryId, selected, count, reviewEffort, arbEffort, say]);


  const toggle = (slug: ToolSlug) =>
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const busy = phase === "generating" || phase === "reviewing" || phase === "arbitrating";

  // ── Golden panel (DOC 261 Stage 0) ──────────────────────────────────────
  const loadGoldens = useCallback(async () => {
    try { setGoldens(await listGoldenPanel()); } catch (e) { say(`Golden panel read failed — ${(e as Error).message}`); }
  }, [say]);
  useEffect(() => { if (user?.id) void loadGoldens(); }, [user?.id, loadGoldens]);
  useEffect(() => {
    if (!user?.id) return;
    fetchPanelCatalogue().then(setCatalogue).catch((e) => say(`Fixture panel catalogue unavailable — ${(e as Error).message}`));
  }, [user?.id, say]);

  const seedPanel = useCallback(async () => {
    setGoldenBusy(true);
    try {
      await assertAdminSession();
      const rows = await seedGoldenPanel();
      setGoldens(rows);
      say(`Golden panel seeded from the *_PERFECT fixtures — ${rows.length} intake(s) on the panel.`);
    } catch (e) { say(`Golden seed failed — ${(e as Error).message}`); }
    setGoldenBusy(false);
  }, [say]);

  const addGolden = useCallback(async () => {
    if (!addAssessment.trim()) return;
    setGoldenBusy(true);
    try {
      await assertAdminSession();
      const g = await addGoldenFromAssessment(addProduct, addAssessment.trim());
      say(`Added ${g.product} · ${g.label} to the golden panel (intake copied from ${addAssessment.trim().slice(0, 8)}).`);
      setAddAssessment("");
      await loadGoldens();
    } catch (e) { say(`Golden add failed — ${(e as Error).message}`); }
    setGoldenBusy(false);
  }, [addAssessment, addProduct, loadGoldens, say]);

  const flipGolden = useCallback(async (g: PtestGoldenRow) => {
    try { await toggleGolden(g.id, !g.enabled); await loadGoldens(); } catch (e) { say(`Golden toggle failed — ${(e as Error).message}`); }
  }, [loadGoldens, say]);

  const runDiff = useCallback(async () => {
    if (!batchId || !compareWith.trim()) return;
    setDiffError(null);
    try {
      setDiff(await fetchBatchDiff(compareWith.trim(), batchId));
    } catch (e) { setDiffError((e as Error).message); }
  }, [batchId, compareWith]);

  const productSlugs = useMemo(() => selected.map((s) => SLUG_TO_STRESS_TOOL[s]).filter(Boolean), [selected]);
  const goldenCount = useMemo(() => goldens.filter((g) => g.enabled && productSlugs.includes(g.product)).length, [goldens, productSlugs]);

  const run = useCallback(async () => {
    if (!user?.id) return;
    cancelled.current = false;
    // A new run starts a fresh log; the previous run's log is replaced.
    setLog([]); setReviews([]); setArbitrations([]); setJobs([]); setBatchId(null);
    jobStates.current = new Map();
    let id: string | null = null;
    try {
      await assertAdminSession();
      setPhase("generating");
      setDiff(null);

      // ── Generation phase ────────────────────────────────────────────────
      // Documents (optional): from the fixture panel (one random committed
      // fixture per product, via ptest-fixtures → start-stress-batch) or from
      // Claude-generated intake, exactly as /admin/all-products-test. Either
      // way the stress harness generates them server-side and is polled below.
      // The golden panel is regenerated by the driver's `generate` jobs
      // (DOC 261 Stage 0), never here.
      let docs: Array<{ tool: string; assessment_id: string; company_name: string }> = [];
      const wantGolden = useGolden && goldenCount > 0;
      if (count === 0 && !wantGolden) throw new Error("nothing to run — enable the golden panel (and seed it) or set fresh documents per product above 0");

      if (count === 0) {
        id = crypto.randomUUID();
        setBatchId(id);
        say(`Batch ${id} — golden panel only (${goldenCount} intake(s), each regenerated twice for the determinism check).`);
        await recordHistory(id);
      } else {
        if (intakeSource === "panel") {
          say(`Picking ${count} fixture(s) per product at random from the fixture panel for ${selected.length} product(s)…`);
          const launched = await launchFixtureBatch({ userId: user.id, products: productSlugs, perProduct: count });
          id = launched.batchId;
          setBatchId(id);
          say(`Batch ${id} started on the fixture panel (seed ${launched.seed} — reproduces this pick).`);
          for (const p of launched.picks) say(`· ${p.tool} ← ${p.id} — ${p.company} (${p.sector}, ${p.geo}): ${p.label}`);
          if (launched.emptyPanels.length) say(`⚠ no fixtures on the panel for: ${launched.emptyPanels.join(", ")} — those products were skipped.`);
        } else {
          say(`Launching ${selected.length} product(s) × ${count} fresh document(s) on Claude-generated intake…`);
          id = await launchClaudeIntakeBatch({
            userId: user.id,
            slugs: selected,
            industryId,
            companiesPerGeo: count,
          });
          setBatchId(id);
          say(`Batch ${id} started.`);
        }
        await recordHistory(id);

        // Each poll is individually bounded inside claudeIntake; a read that
        // fails is logged and retried on the next tick, never fatal.
        const started = Date.now();
        let sjobs: StressJobRow[] = [];
        for (;;) {
          if (cancelled.current) { say("Cancelled."); setPhase("idle"); return; }
          if (Date.now() - started > GENERATION_POLL_LIMIT_MS) {
            throw new Error("generation did not finish within the polling window");
          }
          await new Promise((r) => setTimeout(r, 6_000));
          try {
            const status = await fetchClaudeBatchStatus(id);
            sjobs = await fetchClaudeBatchJobs(id);
            const done = sjobs.filter((j) => ["completed", "complete", "succeeded"].includes(j.status)).length;
            const failed = sjobs.filter((j) => ["failed", "error", "cancelled"].includes(j.status)).length;
            say(`Generating — setup ${status.setup_done}/${status.setup_total} · documents ${done} done, ${failed} failed of ${sjobs.length}`);
            const terminal = ["completed", "complete", "failed", "cancelled", "done"].includes(status.status);
            if (terminal || (sjobs.length > 0 && done + failed >= sjobs.length)) break;
          } catch (e) {
            say(`Status read retried — ${(e as Error).message}`);
          }
        }
        docs = sjobs
          .filter((j) => ["completed", "complete", "succeeded"].includes(j.status) && j.source_row_id)
          .map((j) => ({
            tool: j.tool_slug,
            assessment_id: j.source_row_id as string,
            company_name: j.company_name ?? "(unnamed)",
          }));
      }


      if (!docs.length && !wantGolden) throw new Error("no documents were generated — nothing to review");
      if (docs.length) say(`${docs.length} fresh document(s) generated.`);
      say(`Starting the v2 loop: lint → W-RECORD (Claude) · W-LAW (Claude + GPT) · W-REASON (GPT) → classify + gate → deterministic merge (effort ${reviewEffort}).`);

      // ── Lint + workers + classify + merge, as background jobs ──────────
      // Nothing here waits on a model call. The work is enqueued and the page
      // polls; the request window can no longer cut a long document short.
      setPhase("reviewing");
      const { enqueued, goldens: goldenQueued } = await enqueuePtestJobs({
        batchId: id,
        documents: docs,
        reviewEffort,
        arbitrationEffort: arbEffort,
        golden: wantGolden,
        products: productSlugs,
        reportDate: new Date().toISOString().slice(0, 10),
      });
      say(`${enqueued} job(s) queued${goldenQueued ? ` (${goldenQueued} golden regeneration(s))` : ""}: generate → lint → four workers per document → classify + gate → one merge per product.`);

      let lastLine = "";
      let finalJobs: PtestJobRow[] = [];
      for (;;) {
        if (cancelled.current) { say("Cancelled."); setPhase("idle"); return; }
        await new Promise((r) => setTimeout(r, 6_000));
        // Ticking every poll keeps the chain alive even if a hop was lost.
        await tickPtestDriver(id);
        let jobRows: PtestJobRow[] = [];
        try {
          jobRows = await fetchPtestJobs(id);
        } catch (e) {
          say(`Job read retried — ${(e as Error).message}`);
          continue;
        }
        setJobs(jobRows);
        finalJobs = jobRows;
        const done = jobRows.filter((j) => j.status === "done").length;
        const failed = jobRows.filter((j) => ["failed", "cancelled"].includes(j.status)).length;
        const running = jobRows.filter((j) => j.status === "running").length;
        setPhase(jobRows.some((j) => isReviewPhaseKind(j.kind) && ["queued", "running"].includes(j.status)) ? "reviewing" : "arbitrating");
        const line = `Working — ${done} done, ${running} running, ${failed} failed of ${jobRows.length}`;
        if (line !== lastLine) { say(line); lastLine = line; }
        // Per-job trace: each state change is logged once, never repeated on
        // subsequent polls.
        for (const j of jobRows) {
          const label = `${j.tool_slug} · ${jobKindLabel(j.kind)} · ${j.company_name ?? "all documents"}`;
          const seen = jobStates.current.get(j.id);
          const state = `${j.status}#${j.attempts}`;
          if (seen !== state) {
            jobStates.current.set(j.id, state);
            const mark = j.status === "done" ? "✔" : j.status === "failed" ? "✖" : "·";
            say(`${mark} ${label} → ${j.status}${j.attempts > 1 ? ` (attempt ${j.attempts})` : ""}${j.error ? ` — ${j.error}` : ""}${j.status === "done" && j.note ? ` — ${j.note}` : ""}`);
          }
          const warnKey = `warn:${j.id}`;
          if (j.input_truncated && j.note && !jobStates.current.has(warnKey)) {
            jobStates.current.set(warnKey, "1");
            say(`⚠ ${label}: ${j.note}`);
          }
        }
        // Per-document worker result, logged once as each lands.
        try {
          for (const s of await fetchReviewScores(id)) {
            const key = `score:${s.assessment_id}:${s.reviewer}`;
            if (jobStates.current.has(key) || s.error) continue;
            jobStates.current.set(key, "1");
            const n = (v: number | null) => (v === null ? "—" : v.toFixed(1));
            say(s.reviewer.includes("/") || s.reviewer === "LINT"
              ? `· ${s.tool_slug} · ${s.company_name ?? "(unnamed)"} — ${s.reviewer} landed (findings deduction ${n(s.derived_score)})`
              : `· scored ${s.tool_slug} · ${s.company_name ?? "(unnamed)"} — ${s.reviewer} ${n(s.overall_score)} (derived ${n(s.derived_score)})`);
          }
        } catch { /* scores are reporting only: never interrupt a run */ }
        if (done + failed >= jobRows.length) break;
      }

      const results = await fetchPtestResults(id);
      setReviews(results.reviews);
      setArbitrations(results.arbitrations);
      for (const a of results.arbitrations) {
        say(a.error
          ? `✖ ${a.tool}: ${a.metrics ? "merge" : "arbitration"} failed — ${a.error}`
          : a.metrics
          ? `✔ ${a.tool}: ${a.fixList.length} queued fix(es), ${a.ceoSheet.length} CEO question(s), ${a.dropped.length} observed/intake/merged · classes ${Object.entries(a.metrics.by_class ?? {}).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}${a.singleReviewer ? " · PARTIAL COVERAGE" : ""}`
          : `✔ ${a.tool}: ${a.fixList.length} agreed fix(es), ${a.ceoSheet.length} CEO decision(s), ${a.dropped.length} dropped`);
      }
      // Persist every agreed fix and CEO decision as a tracked item. Upsert:
      // a re-sync never duplicates and never overwrites a human-set status.
      try {
        const tracked = await syncFixItems(id, results.arbitrations);
        // A batch that lost any job closes as PARTIAL. Only a run where every
        // job landed may read as complete.
        const lost = finalJobs.filter((j) => ["failed", "cancelled"].includes(j.status)).length;
        if (lost > 0) {
          await setBatchStatus(id, "partial", `${lost} job(s) failed or were cancelled`);
          say(`⚠ Batch closed as PARTIAL — ${lost} job(s) failed or were cancelled.`);
        } else {
          await setBatchStatus(id, "complete");
        }
        setHistoryKey((k) => k + 1);
        say(`${tracked} fix/decision item(s) recorded in run history.`);
      } catch (e) {
        say(`Fix tracking not saved — ${(e as Error).message}`);
      }
      setPhase("done");
      say("Run complete.");
    } catch (e) {
      say(`Run stopped — ${(e as Error).message}`);
      if (id) { try { await setBatchStatus(id, "error", (e as Error).message); setHistoryKey((k) => k + 1); } catch { /* history is secondary */ } }
      setPhase("error");
    }
  }, [user?.id, selected, industryId, count, reviewEffort, arbEffort, recordHistory, say, useGolden, goldenCount, productSlugs, intakeSource]);

  const stop = useCallback(async () => {
    cancelled.current = true;
    if (batchId) {
      try {
        const cancelledJobs = (await cancelClaudeBatch(batchId)).cancelledJobs;

        await cancelPtestJobs(batchId);
        try { await setBatchStatus(batchId, "cancelled"); setHistoryKey((k) => k + 1); } catch { /* history is secondary */ }
        say(`Cancel requested — ${cancelledJobs} generation job(s) stopped; queued review work cancelled.`);
      } catch (e) {
        say(`Cancel failed — ${(e as Error).message}`);
      }
    }
  }, [batchId, say]);

  const scoreMatrix = useMemo(() => buildScoreMatrix(reviews, arbitrations), [reviews, arbitrations]);

  const markdown = useMemo(
    () =>
      batchId
        ? buildPtestMarkdown({
            batchId,
            industry: STRESS_INDUSTRIES.find((i) => i.id === industryId)?.label ?? industryId,
            effortReview: reviewEffort,
            effortArbitration: arbEffort,
            reviews,
            arbitrations,
          })
        : "",
    [batchId, industryId, reviewEffort, arbEffort, reviews, arbitrations],
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl text-foreground">Product Review Loop (v2 — DOC 261)</h1>
        <p className="text-sm text-muted-foreground">
          Golden panel (+ optional fresh intake) → deterministic generation, twice, hash-checked → lint →
          three evidence-scoped workers (record fidelity · legal grounding on the registry · reasoning) →
          deterministic validation → one classification pass → the queue gate → queued fixes, CEO questions,
          intake artifacts. No arbiter re-judges merits; progress is measured on identical inputs.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Test data</span>
          <p className="text-xs text-muted-foreground">
            <strong>Fixture panel</strong>: fifteen complete, internally consistent dummy intakes per product;
            each run picks one at random per product (the seed is logged so a pick can be reproduced).
            <strong> Claude-generated intake</strong>: a fresh company profile via the stress harness, as on
            /admin/all-products-test. The <strong>golden panel</strong> (below) is the fixed regression input,
            regenerated twice with the report date injected.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1 text-sm">
            <label className="block space-y-1">
              <span className="text-muted-foreground">Intake source</span>
              <select
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-50"
                value={intakeSource}
                disabled={busy}
                onChange={(e) => setIntakeSource(e.target.value as "panel" | "claude")}
              >
                <option value="panel">Fixture panel — random fixture per product</option>
                <option value="claude">Claude-generated intake (stress harness)</option>
              </select>
            </label>
            {intakeSource === "claude" && (
              <label className="block space-y-1">
                <span className="text-muted-foreground">Industry</span>
                <select
                  className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm disabled:opacity-50"
                  value={industryId}
                  disabled={busy}
                  onChange={(e) => setIndustryId(e.target.value)}
                >
                  {STRESS_INDUSTRIES.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
                </select>
              </label>
            )}
            {intakeSource === "panel" && !!catalogue.length && (
              <p className="text-[11px] text-muted-foreground">
                Panel: {catalogue.filter((c) => productSlugs.includes(c.tool)).map((c) => `${c.tool} ${c.size}/${c.expected}`).join(" · ") || "—"}
              </p>
            )}
          </div>

          <div className="space-y-1 text-sm">
            <label className="block space-y-1">
              <span className="text-muted-foreground">Documents per product (0–8; 0 = golden panel only)</span>
              <input
                type="number" min={0} max={8} value={count} disabled={busy}
                onChange={(e) => setCount(Math.max(0, Math.min(8, Number(e.target.value) || 0)))}
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={useGolden} disabled={busy} onChange={(e) => setUseGolden(e.target.checked)} />
              Include the golden panel ({goldenCount} enabled for the selected products)
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Review effort</span>
              <select
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                value={reviewEffort} disabled={busy}
                onChange={(e) => setReviewEffort(e.target.value as PtestEffort)}
              >
                {EFFORTS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Classifier effort (capped at medium)</span>
              <select
                className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
                value={arbEffort} disabled={busy}
                onChange={(e) => setArbEffort(e.target.value as PtestEffort)}
              >
                {EFFORTS.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            </label>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">{EFFORT_WARNING}</p>

        <div className="flex flex-wrap gap-2">
          {PRODUCTS.map((p) => {
            const on = selected.includes(p.slug);
            return (
              <button
                key={p.slug}
                type="button"
                disabled={busy}
                onClick={() => toggle(p.slug)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  on
                    ? "border-brand-teal bg-brand-teal/10 text-brand-teal-text"
                    : "border-border text-muted-foreground hover:border-brand-teal/50"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={busy || !selected.length || !user?.id || (count === 0 && (!useGolden || goldenCount === 0))}
            onClick={() => void run()}
            className="rounded bg-brand-teal px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Running…" : "Run review loop"}
          </button>
          {busy && (
            <button type="button" onClick={() => void stop()} className="rounded border border-border px-3 py-2 text-sm">
              Stop
            </button>
          )}
          {!!markdown && (
            <button
              type="button"
              onClick={() => downloadMarkdown(`all-ptest-${batchId}.md`, markdown)}
              className="rounded border border-border px-3 py-2 text-sm"
            >
              Download full report (.md)
            </button>
          )}
          <span className="text-xs text-muted-foreground">
            Phase: {phase}{batchId ? ` · batch ${batchId.slice(0, 8)}` : ""}
          </span>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground">Golden panel ({goldens.length} intake{goldens.length === 1 ? "" : "s"})</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={goldenBusy || busy} onClick={() => void seedPanel()} className="rounded border border-border px-2 py-1 text-xs disabled:opacity-50">
              Seed from *_PERFECT fixtures
            </button>
            <button type="button" disabled={goldenBusy} onClick={() => void loadGoldens()} className="rounded border border-border px-2 py-1 text-xs disabled:opacity-50">
              Refresh
            </button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Fixed intakes, regenerated twice per batch through the production functions (report date injected,
          model layers dark). A hash mismatch fails that document's generation as a P0. Add a stored production
          intake by assessment id; its intake is copied so the panel never drifts.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select value={addProduct} disabled={goldenBusy || busy} onChange={(e) => setAddProduct(e.target.value)} className="rounded border border-border bg-background px-2 py-1 text-xs">
            <option value="cppa-risk">cppa-risk</option>
            <option value="cppa-cyber">cppa-cyber</option>
            <option value="cppa-admt">cppa-admt</option>
          </select>
          <input
            value={addAssessment} disabled={goldenBusy || busy} placeholder="assessment id (cppa_assessments)"
            onChange={(e) => setAddAssessment(e.target.value)}
            className="w-72 rounded border border-border bg-background px-2 py-1 text-xs"
          />
          <button type="button" disabled={goldenBusy || busy || !addAssessment.trim()} onClick={() => void addGolden()} className="rounded border border-border px-2 py-1 text-xs disabled:opacity-50">
            Add to panel
          </button>
        </div>
        {!!goldens.length && (
          <ul className="grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
            {goldens.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1">
                <span className="truncate">
                  {g.product} · {g.label} <span className="opacity-70">({g.source}{g.assessment_id ? ` · row ${g.assessment_id.slice(0, 8)}` : ""})</span>
                </span>
                <button type="button" disabled={busy} onClick={() => void flipGolden(g)} className={g.enabled ? "text-brand-teal-text" : "text-muted-foreground"}>
                  {g.enabled ? "enabled" : "disabled"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!!jobs.length && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-medium text-foreground">
            Job queue ({jobs.filter((j) => j.status === "done").length}/{jobs.length} done)
          </h2>
          <ul className="grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
            {jobs.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1">
                <span className="truncate">
                  {j.tool_slug} · {jobKindLabel(j.kind)} · {j.company_name ?? "all documents"}
                </span>
                <span className={
                  j.status === "done" ? "text-brand-teal-text"
                    : j.status === "failed" ? "text-destructive"
                    : "text-muted-foreground"
                }>
                  {j.status}{j.attempts > 1 ? ` (attempt ${j.attempts})` : ""}
                </span>
              </li>
            ))}
          </ul>
          {jobs.some((j) => j.error) && (
            <ul className="mt-2 space-y-1 text-[11px] text-destructive">
              {jobs.filter((j) => j.error).map((j) => <li key={`e-${j.id}`}>{j.tool_slug} · {j.kind}: {j.error}</li>)}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-foreground">
            Run log{batchId ? ` · batch ${batchId.slice(0, 8)}` : ""} ({log.length} line{log.length === 1 ? "" : "s"})
          </h2>
          {!!log.length && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void navigator.clipboard.writeText(log.join("\n"))}
                className="rounded border border-border px-2 py-1 text-xs"
              >
                Copy log
              </button>
              <button
                type="button"
                onClick={() => downloadMarkdown(`all-ptest-log-${batchId ?? "run"}.txt`, log.join("\n"))}
                className="rounded border border-border px-2 py-1 text-xs"
              >
                Download log
              </button>
            </div>
          )}
        </div>
        <pre
          ref={logRef}
          className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-muted-foreground"
        >
          {log.length ? log.join("\n") : "No run yet. Starting a run clears this log and streams progress here."}
        </pre>
      </section>

      {!!scoreMatrix.rows.length && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-medium text-foreground">
            Batch scores — mean {scoreMatrix.batchMean === null ? "—" : scoreMatrix.batchMean.toFixed(1)}
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] text-muted-foreground">
              <thead>
                <tr className="border-b border-border text-foreground">
                  <th className="py-1 pr-3 font-medium">Product</th>
                  <th className="py-1 pr-3 font-medium">Docs</th>
                  <th className="py-1 pr-3 font-medium">Composite</th>
                  <th className="py-1 pr-3 font-medium">Queued</th>
                  <th className="py-1 pr-3 font-medium">CEO</th>
                  <th className="py-1 pr-3 font-medium">Observed</th>
                  <th className="py-1 pr-3 font-medium">Classes</th>
                  <th className="py-1 pr-3 font-medium">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {scoreMatrix.rows.map((r) => {
                  const n = (v: number | null | undefined) => (v === null || v === undefined ? "—" : typeof v === "number" ? v.toFixed(1) : String(v));
                  const c = (v: number | null | undefined) => (v === null || v === undefined ? "—" : String(v));
                  return (
                    <tr key={r.tool} className="border-b border-border/50">
                      <td className="py-1 pr-3 text-foreground">{r.tool}</td>
                      <td className="py-1 pr-3">{r.documents}</td>
                      <td className="py-1 pr-3 text-foreground">{n(r.combined)}</td>
                      <td className="py-1 pr-3">{c(r.queued)}</td>
                      <td className="py-1 pr-3">{c(r.ceo)}</td>
                      <td className="py-1 pr-3">{c(r.observed)}</td>
                      <td className="py-1 pr-3">{r.by_class ? Object.entries(r.by_class).map(([k, v]) => `${k} ${v}`).join(", ") || "—" : "—"}</td>
                      <td className="py-1 pr-3">{r.partial_coverage ? <span className="text-destructive">partial on {r.partial_coverage}</span> : "full"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            The class/route table is the acceptance gate; the composite (100 minus lint defects × 2 and the
            severity weights of validated findings) is the trend line only. Legacy batches show their reviewer
            means under Composite.
          </p>
        </section>
      )}

      {!!batchId && phase === "done" && (
        <section className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h2 className="text-sm font-medium text-foreground">Before / after on identical inputs</h2>
          <p className="text-xs text-muted-foreground">
            Compare this batch with an earlier batch that ran the same golden panel under the same settings.
            Accepted when every queued item is gone and no new critical/high finding appeared.
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <input
              value={compareWith} placeholder="earlier batch id" onChange={(e) => setCompareWith(e.target.value)}
              className="w-80 rounded border border-border bg-background px-2 py-1 text-xs"
            />
            <button type="button" disabled={!compareWith.trim()} onClick={() => void runDiff()} className="rounded border border-border px-2 py-1 text-xs disabled:opacity-50">
              Compare
            </button>
            {diffError && <span className="text-destructive">{diffError}</span>}
          </div>
          {diff && (
            <div className="space-y-2 text-[11px] text-muted-foreground">
              <p className={diff.accepted ? "text-brand-teal-text" : "text-destructive"}>{diff.acceptance_note}{diff.settings_note ? ` — ${diff.settings_note}` : ""}</p>
              {diff.goldens.map((g) => (
                <div key={g.golden_ref} className="rounded border border-border p-2">
                  <div className="text-foreground">{g.product} · {g.label ?? g.golden_ref} · composite {g.composite_before ?? "—"} → {g.composite_after ?? "—"}</div>
                  <div>gone {g.gone.length} · persists {g.persists.length} · new {g.new.length} · lint {Object.values(g.lint_before).reduce((a, b) => a + b, 0)} → {Object.values(g.lint_after).reduce((a, b) => a + b, 0)}</div>
                  {g.new.map((f) => <div key={`n-${f.key}`}>+ NEW {f.severity} {f.fix_class ?? ""} @ {f.block_key}: “{f.quote.slice(0, 140)}”</div>)}
                  {g.persists.filter((f) => f.route === "fix_list").map((f) => <div key={`p-${f.key}`}>= PERSISTS (queued) @ {f.block_key}: “{f.quote.slice(0, 140)}”</div>)}
                  {g.gone.map((f) => <div key={`g-${f.key}`}>− gone @ {f.block_key}: “{f.quote.slice(0, 100)}”</div>)}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {arbitrations.map((a) => (
        <section key={a.tool} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="font-serif text-lg text-foreground">
            {a.tool}
            {a.singleReviewer && (
              <span className="ml-2 align-middle text-xs font-sans text-destructive">{a.metrics ? "partial coverage" : "single reviewer"}</span>
            )}
          </h2>
          {a.error ? (
            <p className="text-sm text-destructive">{a.metrics ? "Merge" : "Arbitration"} failed — {a.error}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{a.summary}</p>
              <div>
                <h3 className="text-sm font-medium text-foreground">{a.metrics ? "Queued fix list" : "Agreed fix list"} ({a.fixList.length})</h3>
                <ul className="mt-1 space-y-2 text-xs text-muted-foreground">
                  {a.fixList.map((f) => (
                    <li key={f.id} className="rounded border border-border p-2">
                      <div className="text-foreground">{f.title}</div>
                      <div>{f.severity} · {f.defect_type} · raised by {f.raised_by} · {f.occurrences?.length ?? 0} occurrence(s)</div>
                      {f.fix_class && <div>Class: {f.fix_class} · rule/clause: {f.rule_ref ?? "—"} · gate: {f.gate_reason ?? "—"}</div>}
                      <div>Code focus: {f.code_focus}</div>
                      {f.change && <div>Change: {f.change}</div>}
                      {f.fix_class && <div>Acceptance: {f.regression_test}</div>}
                    </li>
                  ))}
                  {!a.fixList.length && <li>None.</li>}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">CEO decision sheet ({a.ceoSheet.length})</h3>
                <ul className="mt-1 space-y-2 text-xs text-muted-foreground">
                  {a.ceoSheet.map((c) => (
                    <li key={c.id} className="rounded border border-border p-2">
                      <div className="text-foreground">{c.question}</div>
                      <div>{c.status} · raised by {c.raised_by}{c.fix_class ? ` · ${c.fix_class}` : ""}</div>
                      <div>{c.arbiter_reason}</div>
                    </li>
                  ))}
                  {!a.ceoSheet.length && <li>None.</li>}
                </ul>
              </div>
              {a.metrics && a.dropped.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-foreground">Observed, intake artifacts, lint backlog ({a.dropped.filter((d) => d.kind).length})</h3>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    {a.dropped.filter((d) => d.kind).map((d) => (
                      <li key={d.id} className="rounded border border-border p-2">
                        <div>{d.kind} · {d.fix_class ?? "—"} · {d.block_key ?? "—"}</div>
                        <div className="text-foreground">{d.quote}</div>
                        <div>{d.reason}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      ))}

      <PtestHistory refreshKey={historyKey} />
    </div>
  );
}
