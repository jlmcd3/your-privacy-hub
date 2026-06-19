// Shared caller verification for AI/tool edge functions.
// v2 — backward compatible. Existing callers calling verifyCaller(req) and reading
// caller.userId / caller.internal continue to work unchanged. Adds a `mode` parameter
// and admin role checking.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type TrustMode = "public" | "internal" | "user" | "admin";

export interface CallerResult {
  ok: boolean;
  userId: string | null;
  internal: boolean;
  status?: number;   // suggested HTTP status when !ok (401/403)
  error?: string;
}

export async function verifyCaller(req: Request, mode: TrustMode = "user"): Promise<CallerResult> {
  if (mode === "public") {
    return { ok: true, userId: null, internal: false };
  }

  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { ok: false, userId: null, internal: false, status: 401, error: "missing_authorization" };
  }
  const token = authHeader.slice("Bearer ".length).trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  // Internal service-key caller
  if (serviceKey && token === serviceKey) {
    if (mode === "admin") {
      // internal callers are trusted as admin-equivalent for admin-mode functions
      return { ok: true, userId: null, internal: true };
    }
    return { ok: true, userId: null, internal: true };
  }
  if (mode === "internal") {
    return { ok: false, userId: null, internal: false, status: 401, error: "internal_only" };
  }

  // End-user token validation (getUser — unchanged, proven)
  let userId: string | null = null;
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return { ok: false, userId: null, internal: false, status: 401, error: "invalid_token" };
    }
    userId = data.user.id;
  } catch (_e) {
    return { ok: false, userId: null, internal: false, status: 401, error: "auth_failed" };
  }

  if (mode === "admin") {
    try {
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false } },
      );
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) {
        return { ok: false, userId, internal: false, status: 403, error: "admin_only" };
      }
    } catch (_e) {
      return { ok: false, userId, internal: false, status: 403, error: "role_check_failed" };
    }
  }

  return { ok: true, userId, internal: false };
}
