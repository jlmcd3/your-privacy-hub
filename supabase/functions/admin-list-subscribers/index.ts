// List all non-free subscribers (admin-only). Joins profiles with auth.users
// via the service role to include email addresses.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Invalid user" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Forbidden" }, 403);

    // Fetch all paid profiles
    const { data: profiles, error: pErr } = await admin
      .from("profiles")
      .select(
        "id, subscription_tier, subscription_type, subscription_interval, subscription_plan, subscription_end_date, stripe_customer_id, stripe_subscription_id, founding_subscriber, founding_subscriber_set_at, is_premium, is_pro, professional_annual, created_at",
      )
      .neq("subscription_tier", "free")
      .not("subscription_tier", "is", null)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (pErr) return json({ error: pErr.message }, 500);

    // Fetch emails via admin API; paginate.
    const emailById = new Map<string, { email: string | null; created_at: string }>();
    let page = 1;
    const perPage = 1000;
    // Limit to a few pages to be safe.
    for (let i = 0; i < 20; i++) {
      const { data: usersPage, error: uErr } = await admin.auth.admin.listUsers({
        page,
        perPage,
      });
      if (uErr) return json({ error: uErr.message }, 500);
      for (const u of usersPage.users) {
        emailById.set(u.id, { email: u.email ?? null, created_at: u.created_at });
      }
      if (usersPage.users.length < perPage) break;
      page++;
    }

    const rows = (profiles ?? []).map((p) => ({
      ...p,
      email: emailById.get(p.id)?.email ?? null,
      auth_created_at: emailById.get(p.id)?.created_at ?? null,
    }));

    return json({ ok: true, rows });
  } catch (e: any) {
    return json({ error: e?.message || String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
