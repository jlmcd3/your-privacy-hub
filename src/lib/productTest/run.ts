// /admin/product-test — run orchestration (doc 272, full outline).
//
// startRun() does the synchronous setup (insert the run row, resolve fixture
// picks and variants, insert the document rows) then hands back a handle and
// keeps working in the background: a worker pool of `settings.concurrency`
// generates each document (src/lib/productTest/generate.ts, reusing the
// assertion runner's per-tool arms), grades it (product-test-grade, via
// src/lib/productTest/grade.ts), and writes the stability check itself for
// any (tool, fixture, variant) group with more than one copy (doc 272 §6.6).
// Nothing here calls a model: generation hits the product's own deployed
// function exactly as a customer would; grading is one call to our own
// edge function; nothing else.
//
// A run survives a page reload: every document and check is a row, and the
// run row's own `log` column is the same log the page renders, batched to at
// most one write every 2 seconds (doc 272 §5).

import { supabase } from "@/integrations/supabase/client";
import { PANEL_BY_TOOL, type PanelFixture } from "@/lib/ptestPanels";
import { generateDocument } from "./generate";
import { fetchVariants, gradeDocument } from "./grade";
import {
  distinctFixtureIndexes,
  goldenVariant,
  overallSummary,
  planDocumentUnits,
  planFixturePicks,
  selectVariantsByKind,
  stabilitySeverityFor,
  summaryFromDocuments,
  toolSummary,
  wantsMessyVariants,
  type FixturePick,
} from "./plan";
import type {
  CheckRow,
  DocumentRow,
  DocumentStatus,
  PanelTool,
  ProductTestSettings,
  RunRow,
  RunSummary,
  ToolSummary as ToolSummaryT,
  Variant,
} from "./types";

const RUNS_TABLE = "product_test_runs";
const DOCS_TABLE = "product_test_documents";
const CHECKS_TABLE = "product_test_checks";
const LOG_FLUSH_MS = 2_000;

function nowIso(): string {
  return new Date().toISOString();
}

function fixtureAt(tool: PanelTool, fixtureIndex: number): PanelFixture {
  const panel = PANEL_BY_TOOL[tool];
  const f = panel[fixtureIndex];
  if (!f) throw new Error(`no fixture at ${tool}[${fixtureIndex}] (panel has ${panel.length})`);
  return f;
}

// ─── Run handle ─────────────────────────────────────────────────────────────

export interface StartRunOptions {
  userId: string;
  /** Called for every log line, in addition to the batched DB write. */
  onLog?: (line: string) => void;
  /** Called whenever a document row changes locally. */
  onDocumentUpdate?: (doc: DocumentRow) => void;
  /** Called whenever the run row's own state changes (status/summary). */
  onRunUpdate?: (run: Partial<RunRow> & { id: string }) => void;
}

export interface RunHandle {
  runId: string;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  isPaused: () => boolean;
  /** Resolves once every document has reached a terminal state (or the run
   *  was stopped) and the run row carries its final status and summary. */
  done: Promise<RunRow>;
}

interface WorkItem {
  doc: DocumentRow;
  tool: PanelTool;
  fixture: PanelFixture;
  variant: Variant;
}

export async function startRun(rawSettings: ProductTestSettings, opts: StartRunOptions): Promise<RunHandle> {
  const settings: ProductTestSettings = {
    tools: [...new Set(rawSettings.tools)],
    copies: Math.max(1, Math.min(15, Math.round(rawSettings.copies) || 1)),
    repeatSameFixture: !!rawSettings.repeatSameFixture,
    variantKinds: rawSettings.variantKinds?.length ? rawSettings.variantKinds : ["golden"],
    concurrency: Math.max(1, Math.min(8, Math.round(rawSettings.concurrency) || 3)),
  };
  if (!settings.tools.length) throw new Error("startRun: settings.tools must name at least one product");

  // ── Log (in-memory canonical copy; flushed to the row at most every 2s) ──
  const logLines: string[] = [];
  let lastFlush = 0;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  let runId = "";

  const flushLog = async (force = false) => {
    if (!runId) return;
    const since = Date.now() - lastFlush;
    if (!force && since < LOG_FLUSH_MS) {
      if (!flushTimer) {
        flushTimer = setTimeout(() => { flushTimer = null; void flushLog(true); }, LOG_FLUSH_MS - since);
      }
      return;
    }
    lastFlush = Date.now();
    try {
      await (supabase as any).from(RUNS_TABLE).update({ log: logLines }).eq("id", runId);
    } catch {
      // The log is reporting only; a failed flush is retried on the next line.
    }
  };

  const say = (line: string) => {
    logLines.push(`${new Date().toLocaleTimeString()}  ${line}`);
    opts.onLog?.(line);
    void flushLog();
  };

  // ── Run row ──────────────────────────────────────────────────────────────
  const { data: runRow, error: runErr } = await (supabase as any)
    .from(RUNS_TABLE)
    .insert({ created_by: opts.userId, status: "running", settings, log: [], summary: null })
    .select("*")
    .single();
  if (runErr || !runRow) throw new Error(`product_test_runs insert: ${runErr?.message ?? "no row returned"}`);
  runId = runRow.id as string;
  say(`Run ${runId} started — ${settings.tools.join(", ")} · ${settings.copies} copy/copies · ${settings.repeatSameFixture ? "same fixture repeated" : "sequential fixtures"} · variants: ${settings.variantKinds.join(", ")}`);

  // ── Pause / stop (mirrors AssertionRunner) ──────────────────────────────
  const abortController = new AbortController();
  let paused = false;
  let pauseResolve: (() => void) | null = null;
  let pausePromise: Promise<void> = Promise.resolve();
  const waitIfPaused = async () => { if (paused) await pausePromise; };
  const pause = () => {
    if (paused) return;
    paused = true;
    pausePromise = new Promise((r) => { pauseResolve = r; });
    say("Paused.");
  };
  const resume = () => {
    if (!paused) return;
    paused = false;
    pauseResolve?.();
    pauseResolve = null;
    say("Resumed.");
  };
  const stop = () => {
    resume();
    abortController.abort();
    say("Stop requested.");
  };

  // ── Plan: fixture picks → variants → document units ─────────────────────
  const picks: FixturePick[] = planFixturePicks(settings.tools, settings.copies, settings.repeatSameFixture);
  const pairs = distinctFixtureIndexes(picks);
  const variantsByKey = new Map<string, Variant[]>();
  const messy = wantsMessyVariants(settings.variantKinds);

  for (const { tool, fixtureIndex } of pairs) {
    if (abortController.signal.aborted) break;
    const fixture = fixtureAt(tool, fixtureIndex);
    const key = `${tool}#${fixtureIndex}`;
    try {
      if (messy) {
        say(`Fetching variants for ${tool} · ${fixture.id}…`);
        const all = await fetchVariants(tool, fixture.id, fixture.intake, abortController.signal);
        const kept = selectVariantsByKind(all, settings.variantKinds);
        variantsByKey.set(key, kept.length ? kept : [goldenVariant(fixture.intake)]);
        say(`${tool} · ${fixture.id}: ${kept.length} variant(s) selected of ${all.length} returned.`);
      } else {
        variantsByKey.set(key, [goldenVariant(fixture.intake)]);
      }
    } catch (e) {
      say(`⚠ variants failed for ${tool} · ${fixture.id} — ${(e as Error).message}. Falling back to golden only.`);
      variantsByKey.set(key, [goldenVariant(fixture.intake)]);
    }
  }

  const units = planDocumentUnits(picks, variantsByKey);
  if (!units.length) {
    await (supabase as any).from(RUNS_TABLE).update({ status: "failed", log: logLines }).eq("id", runId);
    throw new Error("startRun: plan produced no documents");
  }

  const insertRows = units.map((u) => {
    const fixture = fixtureAt(u.tool, u.fixtureIndex);
    return {
      run_id: runId,
      tool: u.tool,
      fixture_id: fixture.id,
      variant_id: u.variant.variant_id,
      copy_index: u.copyIndex,
      status: "pending" as DocumentStatus,
    };
  });
  const { data: insertedDocs, error: docsErr } = await (supabase as any)
    .from(DOCS_TABLE)
    .insert(insertRows)
    .select("*");
  if (docsErr || !insertedDocs) {
    await (supabase as any).from(RUNS_TABLE).update({ status: "failed", log: logLines }).eq("id", runId);
    throw new Error(`product_test_documents insert: ${docsErr?.message ?? "no rows returned"}`);
  }
  say(`${insertedDocs.length} document(s) planned across ${settings.tools.length} product(s).`);

  // Pair each inserted row back to its unit (tool+fixture_id+variant_id+copy_index is unique per run).
  const unitByKey = new Map<string, { unit: typeof units[number]; fixture: PanelFixture }>();
  for (const u of units) {
    const fixture = fixtureAt(u.tool, u.fixtureIndex);
    unitByKey.set(`${u.tool}#${fixture.id}#${u.variant.variant_id}#${u.copyIndex}`, { unit: u, fixture });
  }
  const localDocs = new Map<string, DocumentRow>(); // by id
  const workItems: WorkItem[] = [];
  for (const row of insertedDocs as DocumentRow[]) {
    localDocs.set(row.id, row);
    const found = unitByKey.get(`${row.tool}#${row.fixture_id}#${row.variant_id}#${row.copy_index}`);
    if (!found) continue;
    workItems.push({ doc: row, tool: found.unit.tool, fixture: found.fixture, variant: found.unit.variant });
  }

  const setDoc = (id: string, patch: Partial<DocumentRow>) => {
    const cur = localDocs.get(id);
    if (cur) {
      const next = { ...cur, ...patch };
      localDocs.set(id, next);
      opts.onDocumentUpdate?.(next);
    }
  };
  const updateDoc = async (id: string, patch: Record<string, unknown>) => {
    setDoc(id, patch as Partial<DocumentRow>);
    try {
      await (supabase as any).from(DOCS_TABLE).update(patch).eq("id", id);
    } catch (e) {
      say(`⚠ document ${id.slice(0, 8)} write failed — ${(e as Error).message}`);
    }
  };

  // ── Stability bookkeeping (doc 272 §6.6) ────────────────────────────────
  // Groups by (tool, fixture, variant); a group of size > 1 only occurs when
  // "repeat same fixture" put several copies through the identical triple.
  const groupKey = (w: WorkItem) => `${w.tool}#${w.fixture.id}#${w.variant.variant_id}`;
  const groupMembers = new Map<string, string[]>(); // key -> document ids
  for (const w of workItems) {
    const k = groupKey(w);
    groupMembers.set(k, [...(groupMembers.get(k) ?? []), w.doc.id]);
  }
  const groupSettled = new Map<string, Set<string>>();
  const stabilityChecks: CheckRow[] = [];

  const maybeRunStability = async (w: WorkItem) => {
    const k = groupKey(w);
    const members = groupMembers.get(k) ?? [];
    if (members.length < 2) return;
    const settled = groupSettled.get(k) ?? new Set<string>();
    settled.add(w.doc.id);
    groupSettled.set(k, settled);
    if (settled.size < members.length) return;

    const hashes = members
      .map((id) => localDocs.get(id))
      .filter((d): d is DocumentRow => !!d && d.status === "graded" && !!d.document_hash)
      .map((d) => d.document_hash as string);
    if (hashes.length < 2) {
      say(`⚠ stability check skipped for ${k} — fewer than 2 graded copies.`);
      return;
    }
    const allEqual = hashes.every((h) => h === hashes[0]);
    const severity = stabilitySeverityFor(w.tool);
    const repDocId = members[0];
    const row = {
      run_id: runId,
      document_id: repDocId,
      tool: w.tool,
      fixture_id: w.fixture.id,
      variant_id: w.variant.variant_id,
      check_id: "stability.hash-identical",
      family: "stability",
      severity,
      passed: allEqual,
      block_key: null,
      quote: null,
      expected: hashes[0],
      actual: allEqual ? hashes[0] : [...new Set(hashes)].join(" | "),
      rule_ref: null,
      status: "open",
      class: null,
      note: null,
    };
    try {
      const { data, error } = await (supabase as any).from(CHECKS_TABLE).insert(row).select("*").single();
      if (error) throw error;
      stabilityChecks.push(data as CheckRow);
      say(`${allEqual ? "✔" : "✖"} stability — ${w.tool} · ${w.fixture.id} · ${w.variant.variant_id}: ${hashes.length} copies, ${allEqual ? "identical" : "DIFFERED"}.`);
    } catch (e) {
      say(`⚠ stability check row failed to write for ${k} — ${(e as Error).message}`);
    }
  };

  // ── Answered key never surfaces (doc 272 §6.2; lead 2026-09-18) ─────────
  // A thin-one variant removes one ANSWERED optional/conditional key. If its
  // document hashes identical to the fixture's golden document, the product
  // never read that key: the answer had no effect anywhere. Reported once
  // per (fixture, key) when every document of the fixture has settled.
  const fixtureMembers = new Map<string, string[]>(); // `${tool}#${fixture.id}` -> document ids
  for (const w of workItems) {
    const k = `${w.tool}#${w.fixture.id}`;
    fixtureMembers.set(k, [...(fixtureMembers.get(k) ?? []), w.doc.id]);
  }
  const fixtureSettled = new Map<string, Set<string>>();
  const workByDocId = new Map(workItems.map((w) => [w.doc.id, w]));
  const surfaceChecks: CheckRow[] = [];

  const maybeRunSurfaceChecks = async (w: WorkItem) => {
    const k = `${w.tool}#${w.fixture.id}`;
    const members = fixtureMembers.get(k) ?? [];
    const settled = fixtureSettled.get(k) ?? new Set<string>();
    settled.add(w.doc.id);
    fixtureSettled.set(k, settled);
    if (settled.size < members.length) return;

    const goldenDoc = members.map((id) => localDocs.get(id)).find((d) => d && d.variant_id === "golden" && d.status === "graded" && d.document_hash);
    if (!goldenDoc) return;
    for (const id of members) {
      const d = localDocs.get(id);
      const item = workByDocId.get(id);
      if (!d || !item || item.variant.kind !== "thin-one" || d.status !== "graded" || !d.document_hash) continue;
      if (!item.variant.removed_keys.length) continue;
      // Only a key the form ASKED counts (the variants function lists the
      // removed key under must_report_not_recorded exactly when it was asked
      // of this record); a conditional key whose trigger is off may be
      // answered in a fixture and legitimately have no effect.
      if (!item.variant.expectations.must_report_not_recorded.length) continue;
      const identical = d.document_hash === goldenDoc.document_hash;
      const row = {
        run_id: runId,
        document_id: d.id,
        tool: w.tool,
        fixture_id: w.fixture.id,
        variant_id: d.variant_id,
        check_id: "fidelity.answered_key_never_surfaces",
        family: "fidelity",
        severity: "high",
        passed: !identical,
        block_key: item.variant.removed_keys.join(","),
        quote: null,
        expected: `removing the answered key "${item.variant.removed_keys.join(",")}" changes the document`,
        actual: identical ? "document identical to golden — the key had no effect" : "document differs from golden",
        rule_ref: "doc272-6.2",
        status: "open",
        class: null,
        note: null,
      };
      try {
        const { data, error } = await (supabase as any).from(CHECKS_TABLE).insert(row).select("*").single();
        if (error) throw error;
        surfaceChecks.push(data as CheckRow);
        if (identical) say(`✖ answered key never surfaces — ${w.tool} · ${w.fixture.id} · ${item.variant.removed_keys.join(",")}`);
      } catch (e) {
        say(`⚠ surface check row failed to write for ${k} — ${(e as Error).message}`);
      }
    }
  };

  // ── Worker pool ──────────────────────────────────────────────────────────
  const panelCompaniesByTool = new Map<PanelTool, string[]>();
  for (const t of settings.tools) panelCompaniesByTool.set(t, PANEL_BY_TOOL[t].map((f) => f.company));

  const gradeResponses: Array<{ tool: PanelTool; passedChecks: number; totalChecks: number; checks: Array<{ passed: boolean; severity: "critical" | "high" | "editorial" }> }> = [];

  let cursor = 0;
  const runWorker = async () => {
    while (cursor < workItems.length) {
      if (abortController.signal.aborted) return;
      await waitIfPaused();
      if (abortController.signal.aborted) return;
      const item = workItems[cursor++];
      const { doc, tool, fixture, variant } = item;
      const label = `${tool} · ${fixture.id} · ${variant.variant_id} · copy ${doc.copy_index}`;

      try {
        say(`▶ ${label} — generating…`);
        await updateDoc(doc.id, { status: "generating" });
        const gen = await generateDocument(tool, variant.intake, {
          userId: opts.userId,
          signal: abortController.signal,
          log: (l) => say(`  ${label}: ${l}`),
        });
        await updateDoc(doc.id, {
          status: "generated",
          source_table: gen.sourceTable,
          source_row_id: gen.sourceRowId,
        });
        say(`✔ ${label} — generated (${gen.sourceTable} ${gen.sourceRowId.slice(0, 8)}).`);

        say(`  ${label}: grading…`);
        const graded = await gradeDocument(
          {
            runId,
            documentId: doc.id,
            tool,
            fixtureId: fixture.id,
            variantId: variant.variant_id,
            intake: variant.intake,
            output: gen.output,
            expectations: variant.expectations,
            panelCompanies: panelCompaniesByTool.get(tool) ?? [],
          },
          abortController.signal,
        );
        const s = graded.summary;
        await updateDoc(doc.id, {
          status: "graded",
          document_hash: s.document_hash,
          checks_total: s.total,
          checks_failed: s.failed,
          critical: s.critical,
          high: s.high,
          editorial: s.editorial,
          document_pass: s.document_pass,
          completed_at: nowIso(),
        });
        gradeResponses.push({
          tool,
          passedChecks: s.passed,
          totalChecks: s.total,
          checks: graded.checks.map((c) => ({ passed: c.passed, severity: c.severity })),
        });
        say(`✔ ${label} — graded: ${s.passed}/${s.total} checks passed (${s.critical} critical, ${s.high} high, ${s.editorial} editorial) — document ${s.document_pass ? "PASS" : "FAIL"}${graded.persist_error ? ` [persist error: ${graded.persist_error}]` : ""}`);
      } catch (e) {
        const msg = (e as Error).message;
        await updateDoc(doc.id, { status: "failed", error: msg, completed_at: nowIso() });
        say(`✖ ${label} — FAILED: ${msg}`);
      } finally {
        await maybeRunStability(item);
        await maybeRunSurfaceChecks(item);
      }
    }
  };

  const done = (async (): Promise<RunRow> => {
    const workers = Array.from({ length: Math.min(settings.concurrency, workItems.length) }, () => runWorker());
    await Promise.all(workers);

    // ── Final summary (doc 272 §6 "Score") ──────────────────────────────
    const docsByTool = new Map<PanelTool, DocumentRow[]>();
    for (const d of localDocs.values()) {
      const list = docsByTool.get(d.tool as PanelTool) ?? [];
      list.push(d);
      docsByTool.set(d.tool as PanelTool, list);
    }
    const checksByTool = new Map<PanelTool, Array<{ passed: boolean; severity: "critical" | "high" | "editorial" }>>();
    for (const g of gradeResponses) checksByTool.set(g.tool, [...(checksByTool.get(g.tool) ?? []), ...g.checks]);
    for (const c of [...stabilityChecks, ...surfaceChecks]) {
      const t = c.tool as PanelTool;
      checksByTool.set(t, [...(checksByTool.get(t) ?? []), { passed: c.passed, severity: c.severity }]);
    }

    const byTool: RunSummary["byTool"] = {};
    const perToolForOverall: Record<string, ReturnType<typeof toolSummary>> = {};
    for (const tool of settings.tools) {
      const ts = toolSummary(docsByTool.get(tool) ?? [], checksByTool.get(tool) ?? []);
      byTool[tool] = ts;
      perToolForOverall[tool] = ts;
    }
    const summary: RunSummary = { overall: overallSummary(perToolForOverall), byTool };

    const finalStatus = abortController.signal.aborted ? "stopped" : "complete";
    say(`Run ${finalStatus} — ${summary.overall.documents} document(s), ${summary.overall.checks_passed}/${summary.overall.checks_total} checks passed, document pass rate ${(summary.overall.document_pass_rate * 100).toFixed(1)}%.`);
    await flushLog(true);
    await (supabase as any).from(RUNS_TABLE).update({ status: finalStatus, summary, log: logLines }).eq("id", runId);
    opts.onRunUpdate?.({ id: runId, status: finalStatus, summary });

    return { ...runRow, status: finalStatus, summary, log: logLines } as RunRow;
  })();

  return { runId, pause, resume, stop, isPaused: () => paused, done };
}

// ─── Reads (recover state after reload; doc 272 §5, §9) ───────────────────────

export async function fetchRecentRuns(limit = 20): Promise<RunRow[]> {
  const { data, error } = await (supabase as any)
    .from(RUNS_TABLE)
    .select("id, created_at, created_by, status, settings, log, summary, lead_note")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`product_test_runs read: ${error.message}`);
  return (data ?? []) as RunRow[];
}

export async function fetchRun(runId: string): Promise<RunRow | null> {
  const { data, error } = await (supabase as any)
    .from(RUNS_TABLE)
    .select("id, created_at, created_by, status, settings, log, summary, lead_note")
    .eq("id", runId)
    .maybeSingle();
  if (error) throw new Error(`product_test_runs read: ${error.message}`);
  return (data ?? null) as RunRow | null;
}

export async function fetchRunDocuments(runId: string): Promise<DocumentRow[]> {
  const out: DocumentRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await (supabase as any)
      .from(DOCS_TABLE)
      .select("*")
      .eq("run_id", runId)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`product_test_documents read: ${error.message}`);
    const rows = (data ?? []) as DocumentRow[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

const PAGE = 1000;

/** Check ids the PAGE writes (not the grading function): they are not
 *  counted in a document row's check columns, so the summary adds them. */
export const PAGE_CHECK_IDS: ReadonlySet<string> = new Set(["stability.hash-identical", "fidelity.answered_key_never_surfaces"]);

/**
 * Keyset-paged read of check rows (lead fix 2026-09-18, run 8e0f2e5c): a
 * 1,196-document run carried 34,818 check rows; offset paging with an ORDER
 * BY over that many rows, re-run on every 4-second poll, hit the database
 * statement timeout ("canceling statement due to statement timeout") and
 * the page lost the run. Rows are now read by `id > last` in pages of 1,000,
 * and the live page reads only what it shows (see fetchFailedChecks).
 */
async function fetchChecksWhere(runId: string, filter: (q: any) => any): Promise<CheckRow[]> {
  const out: CheckRow[] = [];
  let lastId = 0;
  for (;;) {
    const { data, error } = await filter(
      (supabase as any).from(CHECKS_TABLE).select("*").eq("run_id", runId).gt("id", lastId),
    ).order("id", { ascending: true }).limit(PAGE);
    if (error) throw new Error(`product_test_checks read: ${error.message}`);
    const rows = (data ?? []) as CheckRow[];
    out.push(...rows);
    if (rows.length < PAGE) break;
    lastId = rows[rows.length - 1].id;
  }
  return out;
}

/** Every check row of a run — for the export and the offline archive only. */
export function fetchRunChecks(runId: string): Promise<CheckRow[]> {
  return fetchChecksWhere(runId, (q) => q);
}

/** Only the failed rows — what the failures table shows. */
export function fetchFailedChecks(runId: string): Promise<CheckRow[]> {
  return fetchChecksWhere(runId, (q) => q.eq("passed", false));
}

/** Only the page-written rows (stability, answered-key-never-surfaces),
 *  passed or failed — the summary needs them because the document rows'
 *  check columns do not include them. */
export function fetchPageChecks(runId: string): Promise<CheckRow[]> {
  return fetchChecksWhere(runId, (q) => q.in("check_id", [...PAGE_CHECK_IDS]));
}

// ─── Resume (lead fix 2026-09-18, run 8e0f2e5c) ─────────────────────────────
//
// The driver lives in the browser tab. If the tab closes, reloads or loses
// the page, the pending queue freezes with the run still "running". A
// resumed run takes every document still pending, generating or failed,
// rebuilds its variant (the variants call is deterministic, so the same
// tool + fixture yields the same variant ids), and runs generate → grade
// over them with the same worker pool. Cross-copy checks (stability,
// answered-key-never-surfaces) need a fixture's whole group and are not
// recomputed on a resume; the export says which documents were resumed.

export async function resumeRun(runId: string, opts: StartRunOptions): Promise<RunHandle> {
  const runRow = await fetchRun(runId);
  if (!runRow) throw new Error(`resumeRun: run ${runId} not found`);
  const settings = runRow.settings;
  const concurrency = Math.max(1, Math.min(8, Math.round(settings?.concurrency ?? 3) || 3));
  const all = await fetchRunDocuments(runId);
  const todo = all.filter((d) => d.status === "pending" || d.status === "generating" || d.status === "failed" || d.status === "generated");
  if (!todo.length) throw new Error("resumeRun: nothing to resume — every document is graded");

  const logLines: string[] = [...(runRow.log ?? [])];
  let lastFlush = 0;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  const flushLog = async (force = false) => {
    const since = Date.now() - lastFlush;
    if (!force && since < LOG_FLUSH_MS) {
      if (!flushTimer) flushTimer = setTimeout(() => { flushTimer = null; void flushLog(true); }, LOG_FLUSH_MS - since);
      return;
    }
    lastFlush = Date.now();
    try { await (supabase as any).from(RUNS_TABLE).update({ log: logLines, status: "running" }).eq("id", runId); } catch { /* reporting only */ }
  };
  const say = (line: string) => {
    logLines.push(`${new Date().toLocaleTimeString()}  ${line}`);
    opts.onLog?.(line);
    void flushLog();
  };
  say(`Run ${runId} resumed — ${todo.length} document(s) still to generate or grade (${all.length - todo.length} already graded).`);
  await (supabase as any).from(RUNS_TABLE).update({ status: "running" }).eq("id", runId);
  opts.onRunUpdate?.({ id: runId, status: "running" });

  const abortController = new AbortController();
  let paused = false;
  let pauseResolve: (() => void) | null = null;
  let pausePromise: Promise<void> = Promise.resolve();
  const waitIfPaused = async () => { if (paused) await pausePromise; };
  const pause = () => { if (paused) return; paused = true; pausePromise = new Promise((r) => { pauseResolve = r; }); say("Paused."); };
  const resume = () => { if (!paused) return; paused = false; pauseResolve?.(); pauseResolve = null; say("Resumed."); };
  const stop = () => { resume(); abortController.abort(); say("Stop requested."); };

  // Rebuild the variants per (tool, fixture) the pending documents need.
  const variantByDoc = new Map<string, { fixture: PanelFixture; variant: Variant }>();
  const pairs = new Map<string, { tool: PanelTool; fixture: PanelFixture; needsMessy: boolean }>();
  for (const d of todo) {
    const tool = d.tool as PanelTool;
    const fixture = PANEL_BY_TOOL[tool]?.find((f) => f.id === d.fixture_id);
    if (!fixture) { say(`⚠ ${d.tool} · ${d.fixture_id}: fixture no longer in the panel — skipped`); continue; }
    const key = `${tool}#${fixture.id}`;
    const cur = pairs.get(key) ?? { tool, fixture, needsMessy: false };
    if (d.variant_id !== "golden") cur.needsMessy = true;
    pairs.set(key, cur);
  }
  for (const { tool, fixture, needsMessy } of pairs.values()) {
    let variants: Variant[] = [goldenVariant(fixture.intake)];
    if (needsMessy) {
      try {
        variants = [...variants, ...(await fetchVariants(tool, fixture.id, fixture.intake, abortController.signal)).filter((v) => v.variant_id !== "golden")];
      } catch (e) {
        say(`⚠ variants failed for ${tool} · ${fixture.id} — ${(e as Error).message}; its messy documents stay pending.`);
      }
    }
    for (const d of todo) {
      if (d.tool !== tool || d.fixture_id !== fixture.id) continue;
      const v = variants.find((x) => x.variant_id === d.variant_id);
      if (v) variantByDoc.set(d.id, { fixture, variant: v });
      else say(`⚠ ${tool} · ${fixture.id} · ${d.variant_id}: variant not rebuilt — stays pending.`);
    }
  }
  const workItems: WorkItem[] = todo.flatMap((d) => {
    const found = variantByDoc.get(d.id);
    return found ? [{ doc: d, tool: d.tool as PanelTool, fixture: found.fixture, variant: found.variant }] : [];
  });

  const localDocs = new Map<string, DocumentRow>(all.map((d) => [d.id, d]));
  const updateDoc = async (id: string, patch: Record<string, unknown>) => {
    const cur = localDocs.get(id);
    if (cur) { const next = { ...cur, ...patch } as DocumentRow; localDocs.set(id, next); opts.onDocumentUpdate?.(next); }
    try { await (supabase as any).from(DOCS_TABLE).update(patch).eq("id", id); } catch (e) { say(`⚠ document ${id.slice(0, 8)} write failed — ${(e as Error).message}`); }
  };
  const panelCompaniesByTool = new Map<PanelTool, string[]>();
  for (const t of new Set(workItems.map((w) => w.tool))) panelCompaniesByTool.set(t, PANEL_BY_TOOL[t].map((f) => f.company));

  let cursor = 0;
  const runWorker = async () => {
    while (cursor < workItems.length) {
      if (abortController.signal.aborted) return;
      await waitIfPaused();
      if (abortController.signal.aborted) return;
      const { doc, tool, fixture, variant } = workItems[cursor++];
      const label = `${tool} · ${fixture.id} · ${variant.variant_id} · copy ${doc.copy_index} (resumed)`;
      try {
        say(`▶ ${label} — generating…`);
        await updateDoc(doc.id, { status: "generating", error: null });
        const gen = await generateDocument(tool, variant.intake, { userId: opts.userId, signal: abortController.signal, log: (l) => say(`  ${label}: ${l}`) });
        await updateDoc(doc.id, { status: "generated", source_table: gen.sourceTable, source_row_id: gen.sourceRowId });
        const graded = await gradeDocument({ runId, documentId: doc.id, tool, fixtureId: fixture.id, variantId: variant.variant_id, intake: variant.intake, output: gen.output, expectations: variant.expectations, panelCompanies: panelCompaniesByTool.get(tool) ?? [] }, abortController.signal);
        const s = graded.summary;
        await updateDoc(doc.id, { status: "graded", document_hash: s.document_hash, checks_total: s.total, checks_failed: s.failed, critical: s.critical, high: s.high, editorial: s.editorial, document_pass: s.document_pass, completed_at: nowIso() });
        say(`✔ ${label} — graded: ${s.passed}/${s.total} — document ${s.document_pass ? "PASS" : "FAIL"}`);
      } catch (e) {
        const msg = (e as Error).message;
        await updateDoc(doc.id, { status: "failed", error: msg, completed_at: nowIso() });
        say(`✖ ${label} — FAILED: ${msg}`);
      }
    }
  };

  const done = (async (): Promise<RunRow> => {
    const workers = Array.from({ length: Math.min(concurrency, workItems.length) }, () => runWorker());
    await Promise.all(workers);
    const docs = Array.from(localDocs.values());
    let pageChecks: CheckRow[] = [];
    try { pageChecks = await fetchPageChecks(runId); } catch { /* summary degrades to columns only */ }
    const byTool: RunSummary["byTool"] = {};
    const perTool: Record<string, ToolSummaryT> = {};
    for (const tool of new Set(docs.map((d) => d.tool as PanelTool))) {
      const ts = summaryFromDocuments(docs.filter((d) => d.tool === tool), pageChecks.filter((c) => c.tool === tool));
      byTool[tool] = ts;
      perTool[tool] = ts;
    }
    const summary: RunSummary = { overall: overallSummary(perTool), byTool };
    const unfinished = docs.some((d) => d.status === "pending" || d.status === "generating");
    const finalStatus = abortController.signal.aborted || unfinished ? "stopped" : "complete";
    say(`Run ${finalStatus} after resume — ${summary.overall.documents} document(s), ${summary.overall.checks_passed}/${summary.overall.checks_total} checks passed, document pass rate ${(summary.overall.document_pass_rate * 100).toFixed(1)}%.`);
    await flushLog(true);
    await (supabase as any).from(RUNS_TABLE).update({ status: finalStatus, summary, log: logLines }).eq("id", runId);
    opts.onRunUpdate?.({ id: runId, status: finalStatus, summary });
    return { ...runRow, status: finalStatus, summary, log: logLines } as RunRow;
  })();

  return { runId, pause, resume, stop, isPaused: () => paused, done };
}

/** The CEO's free-text report on a run: what a check did not catch (doc 275). */
export async function updateRunLeadNote(runId: string, note: string | null): Promise<void> {
  const { error } = await (supabase as any).from(RUNS_TABLE).update({ lead_note: note }).eq("id", runId);
  if (error) throw new Error(`product_test_runs lead_note update: ${error.message}`);
}

export async function updateCheck(
  checkId: number,
  patch: { status?: CheckRow["status"]; class?: CheckRow["class"]; note?: string | null },
): Promise<void> {
  const { error } = await (supabase as any).from(CHECKS_TABLE).update(patch).eq("id", checkId);
  if (error) throw new Error(`product_test_checks update: ${error.message}`);
}
