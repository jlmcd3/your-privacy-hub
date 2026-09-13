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

import { useCallback, useMemo, useRef, useState } from "react";
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
import type { ToolSlug } from "@/lib/sampleFixtures";
import {
  deepReviewDocument,
  arbitrateProduct,
  mapLimited,
  buildPtestMarkdown,
  downloadMarkdown,
  assertAdminSession,
  type DeepReviewResult,
  type ArbitrationResult,
  type PtestEffort,
} from "@/lib/ptestRun";

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
// MEASURED 2026-09-13 on a 289k-char CPPA Risk report: Claude review at "low"
// took 137s, GPT at "low" 48s, arbitration over 21 findings at "medium" 180s.
// Arbitration at "high" was still running at ~200s and the backend killed the
// request. The defaults below sit inside that envelope; higher levels are
// selectable but can exceed the backend's per-request limit on long documents.
const EFFORT_WARNING = "Defaults are measured to finish inside the backend time limit. Higher levels give deeper analysis but can time out on long documents.";
/** Bounded review concurrency — proven on the grading harness. */
const REVIEW_CONCURRENCY = 3;
/** Wall clock for the generation phase before the run gives up polling. */
const GENERATION_POLL_LIMIT_MS = 60 * 60 * 1000;

type Phase = "idle" | "generating" | "reviewing" | "arbitrating" | "done" | "error";

export default function AllPTest() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<ToolSlug[]>(["cppa_risk", "cppa_cyber", "cppa_admt"]);
  const [industryId, setIndustryId] = useState("web");
  const [count, setCount] = useState(5);
  const [reviewEffort, setReviewEffort] = useState<PtestEffort>("low");
  const [arbEffort, setArbEffort] = useState<PtestEffort>("medium");

  const [phase, setPhase] = useState<Phase>("idle");
  const [batchId, setBatchId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [reviews, setReviews] = useState<DeepReviewResult[]>([]);
  const [arbitrations, setArbitrations] = useState<ArbitrationResult[]>([]);
  const cancelled = useRef(false);

  const say = useCallback((line: string) => {
    const stamp = new Date().toLocaleTimeString();
    setLog((prev) => [...prev, `${stamp}  ${line}`]);
  }, []);

  const toggle = (slug: ToolSlug) =>
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));

  const busy = phase === "generating" || phase === "reviewing" || phase === "arbitrating";

  const run = useCallback(async () => {
    if (!user?.id) return;
    cancelled.current = false;
    setLog([]); setReviews([]); setArbitrations([]); setBatchId(null);
    let id: string | null = null;
    try {
      await assertAdminSession();
      setPhase("generating");
      say(`Launching ${selected.length} product(s) × ${count} document(s) on Claude-generated intake…`);
      id = await launchClaudeIntakeBatch({
        userId: user.id,
        slugs: selected,
        industryId,
        companiesPerGeo: count,
      });
      setBatchId(id);
      say(`Batch ${id} started.`);

      // ── Generation phase ────────────────────────────────────────────────
      // Each poll is individually bounded inside claudeIntake; a read that
      // fails is logged and retried on the next tick, never fatal.
      const started = Date.now();
      let jobs: StressJobRow[] = [];
      for (;;) {
        if (cancelled.current) { say("Cancelled."); setPhase("idle"); return; }
        if (Date.now() - started > GENERATION_POLL_LIMIT_MS) {
          throw new Error("generation did not finish within the polling window");
        }
        await new Promise((r) => setTimeout(r, 6_000));
        try {
          const status = await fetchClaudeBatchStatus(id);
          jobs = await fetchClaudeBatchJobs(id);
          const done = jobs.filter((j) => ["completed", "complete", "succeeded"].includes(j.status)).length;
          const failed = jobs.filter((j) => ["failed", "error", "cancelled"].includes(j.status)).length;
          say(`Generating — setup ${status.setup_done}/${status.setup_total} · documents ${done} done, ${failed} failed of ${jobs.length}`);
          const terminal = ["completed", "complete", "failed", "cancelled", "done"].includes(status.status);
          if (terminal || (jobs.length > 0 && done + failed >= jobs.length)) break;
        } catch (e) {
          say(`Status read retried — ${(e as Error).message}`);
        }
      }

      const ready = jobs.filter(
        (j) => ["completed", "complete", "succeeded"].includes(j.status) && j.source_row_id,
      );
      if (!ready.length) throw new Error("no documents were generated — nothing to review");
      say(`${ready.length} document(s) generated. Starting deep review (2 reviewers each, effort ${reviewEffort}).`);

      // ── Deep review phase ───────────────────────────────────────────────
      setPhase("reviewing");
      const results = await mapLimited(ready, REVIEW_CONCURRENCY, async (job) => {
        if (cancelled.current) {
          return {
            ok: false, tool: job.tool_slug, assessmentId: job.source_row_id as string,
            companyName: job.company_name ?? "", reviews: {}, error: "cancelled",
          } as DeepReviewResult;
        }
        const res = await deepReviewDocument({
          tool: job.tool_slug,
          assessmentId: job.source_row_id as string,
          batchId: id as string,
          companyName: job.company_name ?? "(unnamed)",
          effort: reviewEffort,
        });
        const counts = Object.entries(res.reviews)
          .map(([k, v]) => `${k}:${v.error ? "failed" : (v.findings?.length ?? 0)}`)
          .join(" · ");
        say(res.error
          ? `✖ ${job.tool_slug} — ${job.company_name ?? ""}: review failed — ${res.error}`
          : `✔ ${job.tool_slug} — ${job.company_name ?? ""}: ${counts}`);
        setReviews((prev) => [...prev, res]);
        return res;
      });

      if (cancelled.current) { say("Cancelled before arbitration."); setPhase("idle"); return; }

      // ── Arbitration phase ───────────────────────────────────────────────
      // One arbitration per product: three products' findings in one turn
      // would blow the input window and blur the cause analysis.
      setPhase("arbitrating");
      const tools = Array.from(new Set(results.map((r) => r.tool)));
      say(`Arbitrating ${tools.length} product(s) at effort ${arbEffort}…`);
      const arbs: ArbitrationResult[] = [];
      for (const tool of tools) {
        const a = await arbitrateProduct({ batchId: id, tool, effort: arbEffort });
        arbs.push(a);
        setArbitrations((prev) => [...prev, a]);
        say(a.error
          ? `✖ ${tool}: arbitration failed — ${a.error}`
          : `✔ ${tool}: ${a.fixList.length} agreed fix(es), ${a.ceoSheet.length} CEO decision(s), ${a.dropped.length} dropped`);
      }
      setPhase("done");
      say("Run complete.");
    } catch (e) {
      say(`Run stopped — ${(e as Error).message}`);
      setPhase("error");
    }
  }, [user?.id, selected, industryId, count, reviewEffort, arbEffort, say]);

  const stop = useCallback(async () => {
    cancelled.current = true;
    if (batchId) {
      try {
        const { cancelledJobs } = await cancelClaudeBatch(batchId);
        say(`Cancel requested — ${cancelledJobs} job(s) stopped.`);
      } catch (e) {
        say(`Cancel failed — ${(e as Error).message}`);
      }
    }
  }, [batchId, say]);

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
          Claude-generated intake → deterministic generation → two independent deep reviews → arbitration →
          agreed fix list and CEO decision sheet. Text only: wording, grammar, legal meaning, logic and
          consistency. Formatting is not reviewed.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Industry</span>
            <select
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm"
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

      {!!log.length && (
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-medium text-foreground">Run log</h2>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-5 text-muted-foreground">
            {log.join("\n")}
          </pre>
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
    </div>
  );
}
