// Shared poller for edge functions that dispatch background work via the
// `long_running_jobs` table. Invokes the same edge function with { job_id }
// to read status, since the table is admin-RLS-gated.
import { supabase } from "@/integrations/supabase/client";

export type JobRow = {
  id: string;
  kind: string;
  tool: string | null;
  status: "pending" | "running" | "complete" | "error" | string;
  progress: string | null;
  result: any;
  error: string | null;
  started_at: string;
  completed_at: string | null;
};

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onProgress?: (row: JobRow) => void;
}

export async function pollJob(
  functionName: string,
  jobId: string,
  opts: PollOptions = {},
): Promise<JobRow> {
  const interval = opts.intervalMs ?? 5000;
  const timeout = opts.timeoutMs ?? 15 * 60_000; // 15 min default
  const deadline = Date.now() + timeout;

  while (Date.now() < deadline) {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { job_id: jobId },
    });
    if (error) throw error;
    const row = data as JobRow;
    opts.onProgress?.(row);
    if (row.status === "complete" || row.status === "error") return row;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`Job ${jobId} did not complete within ${timeout}ms`);
}
