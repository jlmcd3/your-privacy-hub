// Shared generation lifecycle hook. Truth is the row's server-side timestamps —
// never a per-tab counter — so a refresh recomputes state immediately and cannot
// mask a stranded run behind another local budget.
//
// Phases:
//   loading                — first fetch not yet returned
//   running                — non-terminal AND updated_at is < 10 min old
//   slow                   — non-terminal AND updated_at is 10–20 min old
//                            (page shows "taking longer than expected"; polling continues)
//   stalled                — non-terminal AND updated_at is > 20 min old
//                            (polling STOPS; page shows a failure UI with retry + support)
//   stalled_pre_dispatch   — status === "pending" AND updated_at === created_at AND
//                            row is > 5 min old (run never started; polling STOPS)
//   ready                  — page-supplied isTerminal(row) && isReportReady(row)
//   failed                 — page-supplied isTerminal(row) && !isReportReady(row)
//                            (e.g. error / refunded / failed_resolved)
//
// Poll cadence: 3s for the first 5 minutes of the tab's lifetime, then 6s.
// The 15–25 min reaper on the server side will resolve stranded rows terminally;
// UI thresholds are deliberately aligned to that backstop.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type GenerationPhase =
  | "loading"
  | "running"
  | "slow"
  | "stalled"
  | "stalled_pre_dispatch"
  | "ready"
  | "failed";

export interface GenerationRowLike {
  status?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  [k: string]: any;
}

interface Options<T extends GenerationRowLike> {
  table: string;
  rowId: string | null | undefined;
  isTerminal: (row: T) => boolean;
  isReportReady: (row: T) => boolean;
}

const MINUTE = 60_000;
const SLOW_AFTER_MS = 10 * MINUTE;
const STALL_AFTER_MS = 20 * MINUTE;
const PRE_DISPATCH_AFTER_MS = 5 * MINUTE;
const FAST_POLL_MS = 3_000;
const SLOW_POLL_MS = 6_000;
const FAST_WINDOW_MS = 5 * MINUTE;

function derive<T extends GenerationRowLike>(
  row: T | null,
  isTerminal: (r: T) => boolean,
  isReportReady: (r: T) => boolean,
): GenerationPhase {
  if (!row) return "loading";
  if (isTerminal(row)) return isReportReady(row) ? "ready" : "failed";
  const now = Date.now();
  const updatedAt = row.updated_at ? new Date(row.updated_at).getTime() : 0;
  const createdAt = row.created_at ? new Date(row.created_at).getTime() : updatedAt;
  const status = String(row.status ?? "");
  if (
    status === "pending"
    && updatedAt > 0
    && createdAt > 0
    && Math.abs(updatedAt - createdAt) < 1_000
    && now - createdAt > PRE_DISPATCH_AFTER_MS
  ) {
    return "stalled_pre_dispatch";
  }
  if (!updatedAt) return "running";
  const age = now - updatedAt;
  if (age > STALL_AFTER_MS) return "stalled";
  if (age > SLOW_AFTER_MS) return "slow";
  return "running";
}

export function useGenerationStatus<T extends GenerationRowLike>({
  table,
  rowId,
  isTerminal,
  isReportReady,
}: Options<T>) {
  const [row, setRow] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<GenerationPhase>("loading");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tabStartRef = useRef<number>(Date.now());
  const cancelledRef = useRef(false);

  // Latest callbacks pinned in refs so fetchOnce identity stays stable
  // across renders (callers pass fresh closures each render).
  const termRef = useRef(isTerminal);
  const readyRef = useRef(isReportReady);
  useEffect(() => { termRef.current = isTerminal; }, [isTerminal]);
  useEffect(() => { readyRef.current = isReportReady; }, [isReportReady]);

  const fetchOnce = useCallback(async () => {
    if (!rowId) return;
    const { data } = await supabase
      .from(table as any)
      .select("*")
      .eq("id", rowId)
      .maybeSingle();
    if (cancelledRef.current) return;
    const r = (data as T | null) ?? null;
    setRow(r);
    setLoading(false);
    const next = derive(r, termRef.current, readyRef.current);
    setPhase(next);
    if (next === "running" || next === "slow") {
      const elapsed = Date.now() - tabStartRef.current;
      const delay = elapsed < FAST_WINDOW_MS ? FAST_POLL_MS : SLOW_POLL_MS;
      timerRef.current = setTimeout(fetchOnce, delay);
    }
  }, [rowId, table]);

  useEffect(() => {
    cancelledRef.current = false;
    tabStartRef.current = Date.now();
    if (!rowId) {
      setLoading(false);
      setPhase("loading");
      return;
    }
    setLoading(true);
    setPhase("loading");
    fetchOnce();
    return () => {
      cancelledRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [rowId, fetchOnce]);

  const refresh = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    tabStartRef.current = Date.now();
    await fetchOnce();
  }, [fetchOnce]);

  const setRowLocal = useCallback((updater: T | ((prev: T | null) => T | null)) => {
    setRow((prev) => {
      const next = typeof updater === "function" ? (updater as any)(prev) : updater;
      return next;
    });
  }, []);

  return { row, loading, phase, refresh, setRow: setRowLocal };
}
