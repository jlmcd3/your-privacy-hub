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
  type DeepReviewResult,
  type ArbitrationResult,
  type PtestEffort,
  type PtestJobRow,
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
  const [count, setCount] = useState(5);
  const [reviewEffort, setReviewEffort] = useState<PtestEffort>("high");
  const [arbEffort, setArbEffort] = useState<PtestEffort>("high");
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

      // ── Generation phase ────────────────────────────────────────────────
      // Claude-generated intake only, exactly as /admin/all-products-test:
      // a fresh company profile per geo via the stress harness.
      let docs: Array<{ tool: string; assessment_id: string; company_name: string }> = [];

      {
        say(`Launching ${selected.length} product(s) × ${count} document(s) on Claude-generated intake…`);
        id = await launchClaudeIntakeBatch({
          userId: user.id,
          slugs: selected,
          industryId,
          companiesPerGeo: count,
        });
        setBatchId(id);
        say(`Batch ${id} started.`);
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


      if (!docs.length) throw new Error("no documents were generated — nothing to review");
      say(`${docs.length} document(s) generated. Starting deep review (2 reviewers each, effort ${reviewEffort}).`);

      // ── Review + arbitration, as background jobs ────────────────────────
      // Nothing here waits on a model call. The work is enqueued and the page
      // polls; the request window can no longer cut a long document short.
      setPhase("reviewing");
      const enqueued = await enqueuePtestJobs({
        batchId: id,
        documents: docs,
        reviewEffort,
        arbitrationEffort: arbEffort,
      });
      say(`${enqueued} review and arbitration job(s) queued. Reviews run first, then one arbitration per document, then one merge per product.`);

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
        setPhase(jobRows.some((j) => j.kind.startsWith("review") && ["queued", "running"].includes(j.status)) ? "reviewing" : "arbitrating");
        const line = `Reviewing — ${done} done, ${running} running, ${failed} failed of ${jobRows.length}`;
        if (line !== lastLine) { say(line); lastLine = line; }
        // Per-job trace: each state change is logged once, never repeated on
        // subsequent polls.
        for (const j of jobRows) {
          const kindLabel = j.kind.replace("arb_", "arbitration ").replace("review_gpt", "review (GPT)").replace("review_claude", "review (Claude)");
          const label = `${j.tool_slug} · ${kindLabel} · ${j.company_name ?? "all documents"}`;
          const seen = jobStates.current.get(j.id);
          const state = `${j.status}#${j.attempts}`;
          if (seen !== state) {
            jobStates.current.set(j.id, state);
            const mark = j.status === "done" ? "✔" : j.status === "failed" ? "✖" : "·";
            say(`${mark} ${label} → ${j.status}${j.attempts > 1 ? ` (attempt ${j.attempts})` : ""}${j.error ? ` — ${j.error}` : ""}`);
          }
          const warnKey = `warn:${j.id}`;
          if (j.input_truncated && j.note && !jobStates.current.has(warnKey)) {
            jobStates.current.set(warnKey, "1");
            say(`⚠ ${label}: ${j.note}`);
          }
        }
        // Per-document score, logged once per reviewer as the review lands.
        try {
          for (const s of await fetchReviewScores(id)) {
            const key = `score:${s.assessment_id}:${s.reviewer}`;
            if (jobStates.current.has(key) || s.error) continue;
            jobStates.current.set(key, "1");
            const n = (v: number | null) => (v === null ? "—" : v.toFixed(1));
            say(`· scored ${s.tool_slug} · ${s.company_name ?? "(unnamed)"} — ${s.reviewer} ${n(s.overall_score)} (derived ${n(s.derived_score)})`);
          }
        } catch { /* scores are reporting only: never interrupt a run */ }
        if (done + failed >= jobRows.length) break;
      }

      const results = await fetchPtestResults(id);
      setReviews(results.reviews);
      setArbitrations(results.arbitrations);
      for (const a of results.arbitrations) {
        say(a.error
          ? `✖ ${a.tool}: arbitration failed — ${a.error}`
          : `✔ ${a.tool}: ${a.fixList.length} agreed fix(es), ${a.ceoSheet.length} CEO decision(s), ${a.dropped.length} dropped`);
      }
      // Persist every agreed fix and CEO decision as a tracked item. Upsert:
      // a re-sync never duplicates and never overwrites a human-set status.
      try {
        const tracked = await syncFixItems(id, results.arbitrations);
        await setBatchStatus(id, "complete");
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
  }, [user?.id, selected, industryId, count, reviewEffort, arbEffort, recordHistory, say]);

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
        <h1 className="font-serif text-2xl text-foreground">Product Review Loop</h1>
        <p className="text-sm text-muted-foreground">
          Intake → deterministic generation → two independent deep reviews → arbitration →
          agreed fix list and CEO decision sheet. Text only: wording, grammar, legal meaning, logic and
          consistency. Formatting is not reviewed.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="space-y-2">
          <span className="text-sm text-muted-foreground">Test data</span>
          <p className="text-xs text-muted-foreground">
            Claude writes a fresh, internally consistent company profile per geo and every selected
            product runs against it server-side via the stress harness — the same intake path as
            /admin/all-products-test. The pre-set data package is not used here.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1 text-sm">
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

          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Documents per product (1–8)</span>
            <input
              type="number" min={1} max={8} value={count} disabled={busy}
              onChange={(e) => setCount(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
            />
          </label>
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
              <span className="text-muted-foreground">Arbitration effort</span>
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
            disabled={busy || !selected.length || !user?.id}
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

      {!!jobs.length && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-medium text-foreground">
            Review queue ({jobs.filter((j) => j.status === "done").length}/{jobs.length} done)
          </h2>
          <ul className="grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
            {jobs.map((j) => (
              <li key={j.id} className="flex items-center justify-between gap-2 rounded border border-border px-2 py-1">
                <span className="truncate">
                  {j.tool_slug} · {j.kind.replace("arb_", "arbitration ")} · {j.company_name ?? "all documents"}
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
                  <th className="py-1 pr-3 font-medium">Claude</th>
                  <th className="py-1 pr-3 font-medium">ChatGPT</th>
                  <th className="py-1 pr-3 font-medium">Combined</th>
                  <th className="py-1 pr-3 font-medium">Derived</th>
                  <th className="py-1 pr-3 font-medium">Post-arbitration</th>
                </tr>
              </thead>
              <tbody>
                {scoreMatrix.rows.map((r) => {
                  const n = (v: number | null) => (v === null ? "—" : v.toFixed(1));
                  return (
                    <tr key={r.tool} className="border-b border-border/50">
                      <td className="py-1 pr-3 text-foreground">{r.tool}</td>
                      <td className="py-1 pr-3">{r.documents}</td>
                      <td className="py-1 pr-3">{n(r.claude)}</td>
                      <td className="py-1 pr-3">{n(r.gpt)}</td>
                      <td className="py-1 pr-3 text-foreground">{n(r.combined)}</td>
                      <td className="py-1 pr-3">{n(r.derived)}</td>
                      <td className="py-1 pr-3">{n(r.arbitration)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Combined is the headline (the reviewers' own six-dimension verdict, the same dimensions used on
            /admin/all-products-test). Derived is a deterministic cross-check computed from the findings.
            Post-arbitration scores only the agreed fix list.
          </p>
        </section>
      )}

      {arbitrations.map((a) => (
        <section key={a.tool} className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h2 className="font-serif text-lg text-foreground">{a.tool}</h2>
          {a.error ? (
            <p className="text-sm text-destructive">Arbitration failed — {a.error}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">{a.summary}</p>
              <div>
                <h3 className="text-sm font-medium text-foreground">Agreed fix list ({a.fixList.length})</h3>
                <ul className="mt-1 space-y-2 text-xs text-muted-foreground">
                  {a.fixList.map((f) => (
                    <li key={f.id} className="rounded border border-border p-2">
                      <div className="text-foreground">{f.title}</div>
                      <div>{f.severity} · {f.defect_type} · raised by {f.raised_by} · {f.occurrences?.length ?? 0} occurrence(s)</div>
                      <div>Code focus: {f.code_focus}</div>
                      <div>Change: {f.change}</div>
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
                      <div>{c.status} · raised by {c.raised_by}</div>
                      <div>{c.arbiter_reason}</div>
                    </li>
                  ))}
                  {!a.ceoSheet.length && <li>None.</li>}
                </ul>
              </div>
            </>
          )}
        </section>
      ))}

      <PtestHistory refreshKey={historyKey} />
    </div>
  );
}
