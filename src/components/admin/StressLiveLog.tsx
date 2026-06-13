// StressLiveLog — read-only live progress log for /admin/static-stress.
// Polls static_stress_jobs every 30s and appends a snapshot per live batch
// showing counts and any status transitions since the previous snapshot.
// Does NOT mutate any state or invoke workers — safe to mount while batches run.

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type JobLite = {
  id: string;
  batch_id: string;
  status: string;
  tool_slug: string;
  company_name: string | null;
  completed_at: string | null;
  error_message: string | null;
};

type Snapshot = {
  ts: string;
  batchId: string;
  counts: { total: number; complete: number; failed: number; running: number; pending: number; cancelled: number };
  transitions: Array<{ jobId: string; from: string; to: string; tool: string; company: string; error?: string | null }>;
};

const POLL_MS = 30_000;
const MAX_ENTRIES = 200;
const STORAGE_KEY = "stress-live-log:v1";

type Persisted = { entries: Snapshot[]; prevJobs: Array<[string, JobLite]>; lastPolled: string | null };

function loadPersisted(): Persisted {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [], prevJobs: [], lastPolled: null };
    const p = JSON.parse(raw) as Persisted;
    return { entries: p.entries ?? [], prevJobs: p.prevJobs ?? [], lastPolled: p.lastPolled ?? null };
  } catch {
    return { entries: [], prevJobs: [], lastPolled: null };
  }
}

export function StressLiveLog({ batchIds }: { batchIds: string[] }) {
  const initial = useMemo(() => loadPersisted(), []);
  const [enabled, setEnabled] = useState(true);
  const [entries, setEntries] = useState<Snapshot[]>(initial.entries);
  const [lastPolled, setLastPolled] = useState<string | null>(initial.lastPolled);
  const [filterBatch, setFilterBatch] = useState<string>("all");
  const [discoveredBatchIds, setDiscoveredBatchIds] = useState<string[]>([]);
  const prevJobsRef = useRef<Map<string, JobLite>>(new Map(initial.prevJobs));
  const entriesRef = useRef<Snapshot[]>(initial.entries);



  const trackedBatchIds = useMemo(
    () => Array.from(new Set([...batchIds, ...discoveredBatchIds])).sort(),
    [batchIds, discoveredBatchIds],
  );
  const idsKey = useMemo(() => batchIds.slice().sort().join(","), [batchIds]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const poll = async () => {
      const discovered = new Set(batchIds);
      const [{ data: liveBatches }, { data: liveJobs }] = await Promise.all([
        supabase
          .from("static_stress_batches")
          .select("id")
          .in("status", ["pending", "running"])
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("static_stress_jobs")
          .select("batch_id")
          .in("status", ["pending", "running"])
          .limit(5000),
      ]);
      for (const b of liveBatches ?? []) discovered.add(b.id);
      for (const j of liveJobs ?? []) discovered.add(j.batch_id);
      const ids = Array.from(discovered).sort();
      const nextDiscovered = ids.filter((id) => !batchIds.includes(id));
      setDiscoveredBatchIds((current) => current.join(",") === nextDiscovered.join(",") ? current : nextDiscovered);

      const now = new Date().toISOString();
      if (ids.length === 0) {
        setLastPolled(now);
        return;
      }

      const { data, error } = await supabase
        .from("static_stress_jobs")
        .select("id, batch_id, status, tool_slug, company_name, completed_at, error_message")
        .in("batch_id", ids);
      if (cancelled || error || !data) return;

      const prev = prevJobsRef.current;
      const byBatch: Record<string, JobLite[]> = {};
      const transitionsByBatch: Record<string, Snapshot["transitions"]> = {};

      for (const j of data as JobLite[]) {
        (byBatch[j.batch_id] ??= []).push(j);
        const before = prev.get(j.id);
        if (before && before.status !== j.status) {
          (transitionsByBatch[j.batch_id] ??= []).push({
            jobId: j.id,
            from: before.status,
            to: j.status,
            tool: j.tool_slug,
            company: j.company_name ?? "—",
            error: j.error_message,
          });
        } else if (!before) {
          // First time we see this job — log as "new" transition
          (transitionsByBatch[j.batch_id] ??= []).push({
            jobId: j.id,
            from: "—",
            to: j.status,
            tool: j.tool_slug,
            company: j.company_name ?? "—",
            error: j.error_message,
          });
        }
      }

      const newSnapshots: Snapshot[] = [];
      for (const bid of ids) {
        const jobs = byBatch[bid] ?? [];
        if (jobs.length === 0) continue;
        const counts = { total: jobs.length, complete: 0, failed: 0, running: 0, pending: 0, cancelled: 0 };
        for (const j of jobs) {
          if (j.status === "complete") counts.complete++;
          else if (j.status === "failed") counts.failed++;
          else if (j.status === "running") counts.running++;
          else if (j.status === "pending") counts.pending++;
          else if (j.status === "cancelled") counts.cancelled++;
        }
        const transitions = transitionsByBatch[bid] ?? [];
        // First snapshot ever: skip "new" spam transitions, only counts.
        const isFirstSnapshot = prev.size === 0;
        newSnapshots.push({
          ts: now,
          batchId: bid,
          counts,
          transitions: isFirstSnapshot ? [] : transitions,
        });
      }

      // Refresh ref with latest jobs
      const next = new Map<string, JobLite>();
      for (const j of data as JobLite[]) next.set(j.id, j);
      prevJobsRef.current = next;

      const merged = newSnapshots.length > 0
        ? [...newSnapshots, ...entriesRef.current].slice(0, MAX_ENTRIES)
        : entriesRef.current;
      if (newSnapshots.length > 0) {
        entriesRef.current = merged;
        setEntries(merged);
      }
      setLastPolled(now);
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          entries: merged,
          prevJobs: Array.from(next.entries()),
          lastPolled: now,
        }));
      } catch { /* quota — ignore */ }
    };



    poll();
    const iv = setInterval(poll, POLL_MS);
    return () => { cancelled = true; clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, enabled]);

  const filtered = filterBatch === "all" ? entries : entries.filter((e) => e.batchId === filterBatch);

  return (
    <section className="border rounded p-4 space-y-3 bg-card">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h2 className="font-serif text-xl">Live activity log</h2>
          <p className="text-xs text-muted-foreground">
            Polls every 30s · read-only · does not interrupt running workers
            {lastPolled && ` · last polled ${new Date(lastPolled).toLocaleTimeString()}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="text-xs border rounded px-2 py-1 bg-background"
            value={filterBatch}
            onChange={(e) => setFilterBatch(e.target.value)}
          >
            <option value="all">All tracked batches</option>
            {trackedBatchIds.map((id) => <option key={id} value={id}>{id.slice(0, 8)}</option>)}
          </select>
          <Button size="sm" variant="outline" onClick={() => { setEntries([]); entriesRef.current = []; prevJobsRef.current = new Map(); try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ } }}>Clear</Button>
          <Button size="sm" variant={enabled ? "default" : "outline"} onClick={() => setEnabled((v) => !v)}>
            {enabled ? "Pause" : "Resume"}
          </Button>
        </div>
      </header>

      {trackedBatchIds.length === 0 && (
        <p className="text-sm text-muted-foreground">No batches to track.</p>
      )}

      {trackedBatchIds.length > 0 && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Waiting for first poll{enabled ? "…" : " (paused)"}
        </p>
      )}

      {filtered.length > 0 && (
        <ScrollArea className="h-96 border rounded">
          <div className="p-2 space-y-2 font-mono text-xs">
            {filtered.map((s, i) => (
              <div key={`${s.ts}-${s.batchId}-${i}`} className="border-l-2 border-brand-teal pl-2">
                <div className="text-muted-foreground">
                  [{new Date(s.ts).toLocaleTimeString()}] {s.batchId.slice(0, 8)}
                </div>
                <div>
                  total={s.counts.total} · ✓{s.counts.complete} · ✗{s.counts.failed} · ▶{s.counts.running} · ⏳{s.counts.pending}
                  {s.counts.cancelled > 0 && ` · ⊘${s.counts.cancelled}`}
                </div>
                {s.transitions.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-[11px]">
                    {s.transitions.slice(0, 20).map((t) => (
                      <li key={t.jobId} className={t.to === "failed" ? "text-destructive" : ""}>
                        {t.from} → {t.to} · {t.tool} · {t.company}
                        {t.error && t.to === "failed" && ` · ${t.error.slice(0, 100)}`}
                      </li>
                    ))}
                    {s.transitions.length > 20 && (
                      <li className="text-muted-foreground">…and {s.transitions.length - 20} more</li>
                    )}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </section>
  );
}
