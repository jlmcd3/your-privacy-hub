import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ProgressFile {
  startedAt: string;
  updatedAt: string;
  finishedAt: string | null;
  status: "starting" | "running" | "generating" | "done" | "error" | string;
  totalBriefs: number;
  completedBriefs: number;
  totalSteps: number;
  completedSteps: number;
  currentRegion: string | null;
  currentRole: string | null;
  currentTrack: string | null;
  recent: { t: string; label: string; ok: boolean; detail?: string }[];
  errors: { t: string; label: string; detail?: string }[];
}

const POLL_MS = 4000;

export default function AdminBriefGenStatus() {
  const [data, setData] = useState<ProgressFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`/briefgen-progress.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ProgressFile;
        if (!alive) return;
        setData(json);
        setError(null);
        setFetchedAt(new Date());
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message || "Could not load progress file");
      }
    };
    tick();
    let id: ReturnType<typeof setInterval> | null = setInterval(async () => {
      await tick();
      // Stop polling once the job has reached a terminal state.
      setData((curr) => {
        if (curr && (curr.status === "done" || curr.status === "error") && id) {
          clearInterval(id);
          id = null;
        }
        return curr;
      });
    }, POLL_MS);
    return () => { alive = false; if (id) clearInterval(id); };
  }, []);

  const stepPct = data && data.totalSteps > 0
    ? Math.round((data.completedSteps / data.totalSteps) * 100)
    : 0;
  const briefPct = data && data.totalBriefs > 0
    ? Math.round((data.completedBriefs / data.totalBriefs) * 100)
    : 0;

  const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    done: "default",
    running: "secondary",
    generating: "secondary",
    starting: "outline",
    error: "destructive",
  };

  return (
    <div className="container max-w-4xl mx-auto py-10 space-y-6">
      <div>
        <h1 className="font-serif mb-1">Sample Brief Generation Status</h1>
        <p className="text-sm text-muted-foreground">
          Live progress for <code className="font-mono text-xs">scripts/generate-sample-briefs.mjs</code>.
          Polls every {POLL_MS / 1000}s.
        </p>
      </div>

      {error && !data && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No progress file found yet at <code>/briefgen-progress.json</code>. The job may not have started, or it has not written a checkpoint yet.
            <div className="mt-2 text-xs text-destructive">{error}</div>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Status</CardTitle>
              <Badge variant={statusVariant[data.status] ?? "outline"}>{data.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-5 text-sm">
              <div>
                <div className="flex justify-between mb-1 text-xs text-muted-foreground">
                  <span>Briefs ({data.completedBriefs} / {data.totalBriefs})</span>
                  <span>{briefPct}%</span>
                </div>
                <Progress value={briefPct} />
              </div>
              <div>
                <div className="flex justify-between mb-1 text-xs text-muted-foreground">
                  <span>Steps ({data.completedSteps} / {data.totalSteps})</span>
                  <span>{stepPct}%</span>
                </div>
                <Progress value={stepPct} />
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2">
                <Stat label="Region" value={data.currentRegion ?? "—"} />
                <Stat label="Role" value={data.currentRole ?? "—"} />
                <Stat label="Track" value={data.currentTrack ?? "—"} />
              </div>

              <div className="text-xs text-muted-foreground pt-2 border-t">
                <div>Started: {fmt(data.startedAt)}</div>
                <div>Updated: {fmt(data.updatedAt)}</div>
                {data.finishedAt && <div>Finished: {fmt(data.finishedAt)}</div>}
                {fetchedAt && <div>Last poll: {fetchedAt.toLocaleTimeString()}</div>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent steps</CardTitle></CardHeader>
            <CardContent>
              {data.recent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No steps logged yet.</p>
              ) : (
                <ul className="space-y-1.5 text-sm font-mono">
                  {data.recent.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={r.ok ? "text-emerald-600" : "text-destructive"}>
                        {r.ok ? "✓" : "✗"}
                      </span>
                      <span className="text-xs text-muted-foreground w-20 shrink-0">
                        {new Date(r.t).toLocaleTimeString()}
                      </span>
                      <span className="flex-1">{r.label}</span>
                      {r.detail && <span className="text-xs text-muted-foreground">{r.detail}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {data.errors.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base text-destructive">Errors</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {data.errors.map((e, i) => (
                    <li key={i} className="border-l-2 border-destructive pl-3">
                      <div className="font-mono text-xs">{e.label}</div>
                      <div className="text-xs text-muted-foreground">{fmt(e.t)}</div>
                      {e.detail && <div className="text-xs mt-1">{e.detail}</div>}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-mono text-sm mt-0.5">{value}</div>
    </div>
  );
}

function fmt(iso: string) {
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}
