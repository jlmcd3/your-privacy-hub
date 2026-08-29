/**
 * ALL-PRODUCTS-TEST — local (in-page) run history.
 *
 * The "Tools & batch scores" card is built from server-side rows:
 * quality_batch_runs (skeleton-graded batches) and static_stress_jobs
 * (Claude-intake harness). Runs started from the AllProductsPanel with the
 * PRE-SET data package never touch either table — they insert intake, invoke
 * the generator and poll entirely from the browser — so they left no trace in
 * the scores card.
 *
 * This module keeps a small pass/fail tally per product slug, persisted to
 * localStorage so it survives a reload, and exposes a subscription the console
 * reads. It records NO scores: the pre-set path is not graded, so the card
 * shows it as a pass/fail count only, never as a quality number.
 */
import { useEffect, useState } from "react";

export interface LocalRunHistoryEntry {
  total: number;
  complete: number;
  failed: number;
  lastAt: string | null;
  /** Dual-model grading (grade-single-assessment): running sums + count. */
  scored?: number;
  claudeSum?: number;
  gptSum?: number;
}

export type LocalRunHistory = Record<string, LocalRunHistoryEntry>;

const KEY = "eup.allProductsTest.localRunHistory.v2";

let cache: LocalRunHistory = load();
const listeners = new Set<(h: LocalRunHistory) => void>();

function load(): LocalRunHistory {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LocalRunHistory) : {};
  } catch {
    return {};
  }
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* quota / private mode — the in-memory tally still works */
  }
}

/** Record one finished in-page run for a stress-harness tool slug. */
export function recordLocalRun(toolSlug: string, ok: boolean) {
  const prev = cache[toolSlug] ?? { total: 0, complete: 0, failed: 0, lastAt: null };
  cache = {
    ...cache,
    [toolSlug]: {
      total: prev.total + 1,
      complete: prev.complete + (ok ? 1 : 0),
      failed: prev.failed + (ok ? 0 : 1),
      lastAt: new Date().toISOString(),
    },
  };
  persist();
  for (const fn of listeners) fn(cache);
}

/**
 * Record a Claude + GPT grading result for one finished in-page run, so the
 * scores card shows real dual-model numbers for every product.
 */
export function recordLocalScore(toolSlug: string, claude: number | null, gpt: number | null) {
  if (claude == null && gpt == null) return;
  const prev = cache[toolSlug] ?? { total: 0, complete: 0, failed: 0, lastAt: null };
  cache = {
    ...cache,
    [toolSlug]: {
      ...prev,
      scored: (prev.scored ?? 0) + 1,
      claudeSum: (prev.claudeSum ?? 0) + (claude ?? 0),
      gptSum: (prev.gptSum ?? 0) + (gpt ?? 0),
    },
  };
  persist();
  for (const fn of listeners) fn(cache);
}

export function clearLocalRunHistory() {
  cache = {};
  persist();
  for (const fn of listeners) fn(cache);
}

export function getLocalRunHistory(): LocalRunHistory {
  return cache;
}

export function useLocalRunHistory(): LocalRunHistory {
  const [snapshot, setSnapshot] = useState<LocalRunHistory>(cache);
  useEffect(() => {
    const fn = (h: LocalRunHistory) => setSnapshot(h);
    listeners.add(fn);
    setSnapshot(cache);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return snapshot;
}
