/**
 * ALL-PRODUCTS-TEST — live log bus.
 *
 * The QualityConsole "Live log" card reads quality_batch_log, which only ever
 * carries rows for batches dispatched by quality-batch-orchestrator. Runs
 * started from the AllProductsPanel (sample data + live generation) never
 * appear there, so on /admin/all-products-test the card looked idle while a
 * run was clearly in flight.
 *
 * This module is a tiny in-memory pub/sub the panel writes to and the console
 * subscribes to, so the Live log shows the actual local run log alongside the
 * server-side batch log. It is deliberately module-scoped (not context) so the
 * two components need no shared parent state.
 */
import { useEffect, useState } from "react";

export type AllProductsLogLevel = "info" | "error" | "success";

export interface AllProductsLogLine {
  t: string;
  level: AllProductsLogLevel;
  /** Fixture / product label the line belongs to, e.g. "ropa/primary". */
  source: string;
  msg: string;
}

const MAX_LINES = 500;
const STORAGE_KEY = "eup.allProductsTest.liveLog.v1";

function loadLines(): AllProductsLogLine[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as AllProductsLogLine[]).slice(-MAX_LINES) : [];
  } catch {
    return [];
  }
}

let lines: AllProductsLogLine[] = loadLines();
const listeners = new Set<(l: AllProductsLogLine[]) => void>();

function emit() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* The in-memory log remains usable if storage is unavailable. */
  }
  for (const fn of listeners) fn(lines);
}

export function appendAllProductsLog(
  source: string,
  msg: string,
  level: AllProductsLogLevel = "info",
) {
  lines = [...lines, { t: new Date().toISOString(), level, source, msg }].slice(-MAX_LINES);
  emit();
}

export function clearAllProductsLog() {
  lines = [];
  emit();
}

export function getAllProductsLog(): AllProductsLogLine[] {
  return lines;
}

/** Subscribe a component to the run log. */
export function useAllProductsLog(): AllProductsLogLine[] {
  const [snapshot, setSnapshot] = useState<AllProductsLogLine[]>(lines);
  useEffect(() => {
    const fn = (l: AllProductsLogLine[]) => setSnapshot(l);
    listeners.add(fn);
    setSnapshot(lines);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return snapshot;
}
