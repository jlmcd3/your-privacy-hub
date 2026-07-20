// MC-S1b Task 1 — pure conflict-gate for admin-redeploy.
//
// Two-source conflict detection for edge-function redeploys:
//   (a) In-flight quality runs (quality_runs, quality_batch_runs, quality_loop3_batches)
//       whose status is NOT in the terminal set.
//   (b) DPIA staging units still pending/processing/dispatching inside
//       dpia_frameworks.report_data->'_staging'->'units'.
//
// This module is pure — it takes a SupabaseClient-shaped `db` and returns a
// structured conflict list. Extracted so unit tests can exercise the logic
// without a live database.

export type ConflictSource = "quality_runs" | "quality_batch_runs" | "quality_loop3_batches" | "dpia_staging";

export interface RedeployConflict {
  source: ConflictSource;
  id: string;
  detail: string;
}

// SWEEP-2 T1 — production status vocab for the three quality-run tables is
// {complete, cancelled, success, failed, error, deliberating}. The historical
// "completed" spelling never landed in production; keeping it here is harmless
// and preserves compatibility with any future writer that emits it.
const TERMINAL = new Set(["complete", "completed", "failed", "cancelled", "success", "error"]);
const NON_TERMINAL_STAGING = new Set(["pending", "processing", "dispatching"]);

// Minimal DB shape so this can be unit-tested with a fake client.
export interface RedeployGateDb {
  from(table: string): {
    select(cols: string): {
      not?: (col: string, op: string, list: string[]) => any;
      in?: (col: string, list: string[]) => any;
      limit(n: number): Promise<{ data: any[] | null; error: { message: string } | null }>;
    } | any;
  };
}

export async function detectRedeployConflicts(db: any): Promise<RedeployConflict[]> {
  const conflicts: RedeployConflict[] = [];

  // (a) in-flight quality tables — three parallel probes.
  const [qr, qbr, qlb] = await Promise.all([
    db.from("quality_runs").select("id,status")
      .not("status", "in", `(${[...TERMINAL].join(",")})`).limit(50),
    db.from("quality_batch_runs").select("id,status,phase")
      .not("status", "in", `(${[...TERMINAL].join(",")})`).limit(50),
    db.from("quality_loop3_batches").select("id,status")
      .not("status", "in", `(${[...TERMINAL].join(",")})`).limit(50),
  ]);
  for (const r of qr?.data ?? []) {
    conflicts.push({ source: "quality_runs", id: String(r.id), detail: `status=${r.status}` });
  }
  for (const r of qbr?.data ?? []) {
    conflicts.push({ source: "quality_batch_runs", id: String(r.id), detail: `status=${r.status} phase=${r.phase ?? "?"}` });
  }
  for (const r of qlb?.data ?? []) {
    conflicts.push({ source: "quality_loop3_batches", id: String(r.id), detail: `status=${r.status}` });
  }

  // (b) DPIA staging units still non-terminal.
  const { data: dpiaRows } = await db.from("dpia_frameworks")
    .select("id,report_data")
    .not("report_data", "is", null)
    .limit(500);
  for (const row of (dpiaRows ?? [])) {
    const units = row?.report_data?._staging?.units;
    if (!units || typeof units !== "object") continue;
    for (const [key, u] of Object.entries(units as Record<string, any>)) {
      const st = u?.status;
      if (typeof st === "string" && NON_TERMINAL_STAGING.has(st)) {
        conflicts.push({ source: "dpia_staging", id: String(row.id), detail: `unit=${key} status=${st}` });
        break; // one entry per row is enough
      }
    }
  }

  return conflicts;
}

export const OVERRIDE_TOKEN = "OVERRIDE-REDEPLOY";

export function summariseConflicts(list: RedeployConflict[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of list) out[c.source] = (out[c.source] ?? 0) + 1;
  return out;
}
