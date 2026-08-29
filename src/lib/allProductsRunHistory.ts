/**
 * ALL-PRODUCTS-TEST — local (in-page) run history, BATCH-SCOPED.
 *
 * Runs started from AllProductsPanel with the PRE-SET data package never touch
 * quality_batch_runs or static_stress_jobs — they insert intake, invoke the
 * generator and poll entirely from the browser — so they leave no server-side
 * batch row for the "Tools & batch scores" matrix.
 *
 * BATCH LAW: every press of "Run selected" opens its OWN local batch. Results
 * are recorded against that batch id only, and the console renders each local
 * batch as its own column appended to the RIGHT of the server batches. A new
 * run must never be folded into a pre-existing batch column.
 */
import { useEffect, useState } from "react";

export interface LocalToolResult {
  total: number;
  complete: number;
  failed: number;
  /** Dual-model grading (grade-single-assessment): running sums + count. */
  scored: number;
  claudeSum: number;
  gptSum: number;
}

export interface LocalBatch {
  id: string;
  started_at: string;
  last_at: string;
  /** keyed by stress tool slug */
  tools: Record<string, LocalToolResult>;
}

const KEY = "eup.allProductsTest.localBatches.v1";
const MAX_BATCHES = 10;

let cache: LocalBatch[] = load();
const listeners = new Set<(b: LocalBatch[]) => void>();

function load(): LocalBatch[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as LocalBatch[]) : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* quota / private mode — the in-memory list still works */
  }
}

function emit() {
  persist();
  for (const fn of listeners) fn(cache);
}

function emptyResult(): LocalToolResult {
  return { total: 0, complete: 0, failed: 0, scored: 0, claudeSum: 0, gptSum: 0 };
}

function mutate(batchId: string, tool: string, fn: (r: LocalToolResult) => LocalToolResult) {
  const idx = cache.findIndex((b) => b.id === batchId);
  if (idx === -1) return;
  const batch = cache[idx];
  const next: LocalBatch = {
    ...batch,
    last_at: new Date().toISOString(),
    tools: { ...batch.tools, [tool]: fn(batch.tools[tool] ?? emptyResult()) },
  };
  cache = [...cache.slice(0, idx), next, ...cache.slice(idx + 1)];
  emit();
}

/** Open a NEW local batch. Returns its id — pass it to every record* call. */
export function startLocalBatch(): string {
  const now = new Date().toISOString();
  const batch: LocalBatch = {
    id: `local-${now}-${Math.random().toString(36).slice(2, 8)}`,
    started_at: now,
    last_at: now,
    tools: {},
  };
  cache = [...cache, batch].slice(-MAX_BATCHES);
  emit();
  return batch.id;
}

/** Record one finished in-page run inside the given local batch. */
export function recordLocalRun(batchId: string, toolSlug: string, ok: boolean) {
  mutate(batchId, toolSlug, (r) => ({
    ...r,
    total: r.total + 1,
    complete: r.complete + (ok ? 1 : 0),
    failed: r.failed + (ok ? 0 : 1),
  }));
}

/** Record a Claude + GPT grading result inside the given local batch. */
export function recordLocalScore(
  batchId: string,
  toolSlug: string,
  claude: number | null,
  gpt: number | null,
) {
  if (claude == null && gpt == null) return;
  mutate(batchId, toolSlug, (r) => ({
    ...r,
    scored: r.scored + 1,
    claudeSum: r.claudeSum + (claude ?? 0),
    gptSum: r.gptSum + (gpt ?? 0),
  }));
}

export function clearLocalRunHistory() {
  cache = [];
  emit();
}

export function getLocalBatches(): LocalBatch[] {
  return cache;
}

export function useLocalBatches(): LocalBatch[] {
  const [snapshot, setSnapshot] = useState<LocalBatch[]>(cache);
  useEffect(() => {
    const fn = (b: LocalBatch[]) => setSnapshot(b);
    listeners.add(fn);
    setSnapshot(cache);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return snapshot;
}
