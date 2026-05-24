// Shared caller verification for AI/tool edge functions.
// Returns either { userId } for an authenticated end-user, or { internal: true }
// if the caller is another trusted server-side function invoking via the service-role key.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CallerResult {
  userId: string | null;
  internal: boolean;
  error?: string;
}

export async function verifyCaller(req: Request): Promise<CallerResult> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { userId: null, internal: false, error: "missing_authorization" };
  }
  const token = authHeader.slice("Bearer ".length).trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) {
    return { userId: null, internal: true };
  }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return { userId: null, internal: false, error: "invalid_token" };
    }
    return { userId: data.user.id, internal: false };
  } catch (_e) {
    return { userId: null, internal: false, error: "auth_failed" };
  }
}
