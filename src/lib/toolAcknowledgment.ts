import { supabase } from "@/integrations/supabase/client";

/**
 * Records that a user clicked the generate/purchase button on a tool intake
 * screen, regardless of whether they had ticked the disclaimer checkbox.
 *
 * Fire-and-forget: errors are swallowed so generation flow is never blocked.
 *
 * @param toolType e.g. 'dpa_generator', 'ir_playbook', 'biometric_checker'
 * @param userId   the authenticated user id, or null for anonymous flows
 * @param reportId the generated report id once known (optional; usually logged on intake before report exists)
 */
export async function logToolAcknowledgment(
  toolType: string,
  userId: string | null,
  reportId?: string | null,
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
    });
  } catch (e) {
    // Non-fatal — never block tool generation on logging failure.
    console.warn("logToolAcknowledgment failed", e);
  }
}
