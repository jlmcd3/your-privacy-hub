import { supabase } from "@/integrations/supabase/client";

export interface ToolAcknowledgmentDetail {
  /**
   * LIA F20 (2026-09-15): whether the disclaimer checkbox was ticked when the
   * generate/purchase button was pressed. Stored as-is (false is honest);
   * omitted by callers that predate the column.
   */
  acknowledged?: boolean;
}

/**
 * Records that a user clicked the generate/purchase button on a tool intake
 * screen, together with the state of the disclaimer checkbox at that moment
 * (when the caller supplies it). Notice display, submission and explicit
 * acknowledgment are distinct events; only the last is an acknowledgment.
 *
 * Fire-and-forget: errors are swallowed so generation flow is never blocked.
 *
 * @param toolType e.g. 'dpa_generator', 'ir_playbook', 'biometric_checker'
 * @param userId   the authenticated user id, or null for anonymous flows
 * @param reportId the generated report id once known (optional; usually logged on intake before report exists)
 * @param detail   the checkbox state at the click (migration 20260916_tool_acknowledgments_acknowledged adds the column)
 */
export async function logToolAcknowledgment(
  toolType: string,
  userId: string | null,
  reportId?: string | null,
  detail?: ToolAcknowledgmentDetail,
) {
  try {
    const sessionId =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("eup_session_id") ?? (() => {
            const id = crypto.randomUUID();
            window.sessionStorage.setItem("eup_session_id", id);
            return id;
          })()
        : null;

    await (supabase as any).from("tool_acknowledgments").insert({
      user_id: userId,
      tool_type: toolType,
      report_id: reportId ?? null,
      session_id: sessionId,
      acknowledged_at: new Date().toISOString(),
      ...(typeof detail?.acknowledged === "boolean" ? { acknowledged: detail.acknowledged } : {}),
    });
  } catch (e) {
    // Non-fatal — never block tool generation on logging failure.
    console.warn("logToolAcknowledgment failed", e);
  }
}
