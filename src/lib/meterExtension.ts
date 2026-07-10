import { supabase } from "@/integrations/supabase/client";
import { fireCheckoutStarted } from "@/lib/analyticsEvents";

// Kicks off half-price top-up checkout for +4 additional generations
// on an existing tool assessment. Redirects the browser on success.
export async function startMeterExtension(
  toolType: string,
  assessmentId: string,
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  fireCheckoutStarted({ tool: toolType, surface: "meter_extension_topup" });
  const { data, error } = await supabase.functions.invoke("create-tool-checkout", {
    body: {
      tool_type: toolType,
      assessment_id: assessmentId,
      topup: true,
      user_id: userData?.user?.id ?? null,
    },
  });
  if (error) {
    console.error("startMeterExtension error", error);
    return;
  }
  const url = (data as any)?.url;
  if (url) window.location.href = url;
}
