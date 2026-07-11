// Checked write for generation lifecycle status. supabase-js returns errors
// rather than throwing; historically every lifecycle write in this codebase
// discarded that error, which let a DB-side failure (trigger/RLS/constraint)
// strand paid runs silently (2026-07-11 incident). Always use this helper
// for status-lifecycle writes and payment-evidence writes.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function lifecycleUpdate(
  supabase: SupabaseClient,
  table: string,
  rowId: string,
  patch: Record<string, unknown>,
  ctx: { fn: string; phase: string },
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await supabase.from(table).update(patch).eq("id", rowId);
  if (error) {
    console.error(JSON.stringify({
      evt: "lifecycle_write_failed",
      fn: ctx.fn,
      phase: ctx.phase,
      table,
      row_id: rowId,
      code: (error as any).code ?? null,
      message: error.message,
    }));
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
