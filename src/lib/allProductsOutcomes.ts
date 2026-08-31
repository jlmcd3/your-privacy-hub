/**
 * ALL-PRODUCTS-TEST — per-run OUTCOME store (2026-08-29).
 *
 * The panel used to keep only an aggregate pass/fail tally per product
 * (allProductsRunHistory). This module records ONE ENTRY PER RUN — product,
 * variant, intake source, generated row id, result link, status, Claude/GPT
 * scores, and the full grade payload — so the page can render a real batch
 * outcome table with per-run PDF creation and a downloadable analysis, which
 * the aggregate tally could not support.
 *
 * Persistence is localStorage (browser-local, admin tooling): the capped
 * newest-first list survives reloads; export helpers produce JSON/CSV
 * downloads client-side.
 */
import { useEffect, useState } from "react";
import type { ToolSlug } from "@/lib/sampleFixtures";

export interface RunOutcome {
  id: string;
  /** Local batch column this run belongs to (drives per-batch zip/md exports). */
  batchId?: string | null;
  startedAt: string;
  finishedAt: string | null;
  tool_slug: ToolSlug;
  variant: string;
  /** "preset" | "claude" */
  source: string;
  status: "complete" | "failed";
  sourceRowId: string | null;
  resultUrl: string | null;
  error?: string;
  claudeScore: number | null;
  gptScore: number | null;
  meanScore: number | null;
  gradeError?: string;
  /** Full grade-single-assessment payload for the analysis download. */
  gradePayload?: unknown;
  /** Set once a PDF has been created for this run (storage URL or path). */
  pdfUrl?: string | null;
  /**
   * SIGNED-URL LAW (2026-08-31): generate-report-pdf returns a signed URL that
   * expires after 600s. Record when it was minted so consumers can re-render
   * instead of downloading an expired link.
   */
  pdfUrlAt?: number;

}

const KEY = "eup.allProductsTest.runOutcomes.v1";
const MAX_ENTRIES = 400;

let cache: RunOutcome[] = load();
const listeners = new Set<(o: RunOutcome[]) => void>();

function load(): RunOutcome[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RunOutcome[]) : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* quota — keep in-memory list */
  }
}

function emit() {
  persist();
  for (const l of listeners) l(cache);
}

export function newOutcomeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function recordOutcome(entry: RunOutcome) {
  cache = [entry, ...cache].slice(0, MAX_ENTRIES);
  emit();
}

export function updateOutcome(id: string, patch: Partial<RunOutcome>) {
  cache = cache.map((o) => (o.id === id ? { ...o, ...patch } : o));
  emit();
}

export function clearOutcomes() {
  cache = [];
  emit();
}

export function getOutcomes(): RunOutcome[] {
  return cache;
}

export function useRunOutcomes(): RunOutcome[] {
  const [state, setState] = useState<RunOutcome[]>(cache);
  useEffect(() => {
    const fn = (o: RunOutcome[]) => setState([...o]);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return state;
}

// ── Downloads (client-side blobs) ───────────────────────────────────────────

function downloadBlob(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Full analysis for one run (grade payload + run facts) as JSON. */
export function downloadOutcomeAnalysis(o: RunOutcome) {
  downloadBlob(
    `analysis-${o.tool_slug}-${o.variant}-${o.id}.json`,
    "application/json",
    JSON.stringify(o, null, 2),
  );
}

/** Every recorded outcome as a JSON bundle. */
export function downloadAllAnalyses(outcomes: RunOutcome[]) {
  downloadBlob(
    `all-products-test-analyses-${new Date().toISOString().slice(0, 10)}.json`,
    "application/json",
    JSON.stringify(outcomes, null, 2),
  );
}

/** Compact CSV of the outcome table (no payloads). */
export function downloadOutcomesCsv(outcomes: RunOutcome[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["started_at", "product", "variant", "source", "status", "claude", "gpt", "mean", "source_row_id", "result_url", "error"].join(","),
    ...outcomes.map((o) =>
      [
        o.startedAt, o.tool_slug, o.variant, o.source, o.status,
        o.claudeScore ?? "", o.gptScore ?? "", o.meanScore ?? "",
        o.sourceRowId ?? "", o.resultUrl ?? "", o.error ?? o.gradeError ?? "",
      ].map(esc).join(","),
    ),
  ];
  downloadBlob(
    `all-products-test-outcomes-${new Date().toISOString().slice(0, 10)}.csv`,
    "text/csv",
    rows.join("\n"),
  );
}
