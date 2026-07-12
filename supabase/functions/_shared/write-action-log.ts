// Server-side writer for admin_action_log. Clients never write directly —
// only edge functions running under service_role. Errors are logged but
// non-fatal so a logging failure never blocks a successful operator action.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function writeActionLog(
  supabase: SupabaseClient,
  entry: {
    actor_user_id: string;
    action: string;
    target_table?: string | null;
    target_id?: string | null;
    payload?: Record<string, unknown>;
    result?: Record<string, unknown>;
    ok: boolean;
  },
): Promise<void> {
  const { error } = await supabase.from("admin_action_log").insert({
    actor_user_id: entry.actor_user_id,
    action: entry.action,
    target_table: entry.target_table ?? null,
    target_id: entry.target_id ?? null,
    payload: entry.payload ?? {},
    result: entry.result ?? {},
    ok: entry.ok,
  });
  if (error) {
    console.error(JSON.stringify({
      evt: "action_log_write_failed",
      action: entry.action,
      message: error.message,
    }));
  }
}
