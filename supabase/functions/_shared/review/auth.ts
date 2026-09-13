// /all-ptest — shared admin gate.
// Either an admin JWT (has_role), or an internal service-role caller carrying
// x-internal-resume: 1. Identical to the gate the two review endpoints shipped
// with; extracted so the driver cannot drift from it.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-resume",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
export const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
export const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}

export interface AuthOk { userId: string | null; internal: boolean }

export async function requireAdmin(req: Request): Promise<AuthOk | Response> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "missing_authorization" }, 401);
  const token = authHeader.slice(7).trim();
  if (req.headers.get("x-internal-resume") === "1" && token === SERVICE_KEY) {
    return { userId: null, internal: true };
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "invalid_jwt" }, 401);
  const userId = userData.user.id;
  const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) return json({ error: "admin_only" }, 403);
  return { userId, internal: false };
}

export const isResponse = (v: unknown): v is Response => v instanceof Response;
