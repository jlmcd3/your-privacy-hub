import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const INCLUDED_REPORTS = 6;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Verify authenticated user via JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const jwt = authHeader.slice(7).trim();
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Invalid session" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Check Pro subscription and report credits from profiles (server-side source of truth)
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile } = await adminClient
    .from("profiles")
    .select("is_premium, monthly_reports_used, reports_reset_date, bonus_report_credits")
    .eq("id", user.id)
    .single();

  if (!profile?.is_premium) {
    return new Response(JSON.stringify({ error: "Premium subscription required" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Monthly reset logic: if reports_reset_date is before the start of the current month, reset counter
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const resetDate = profile.reports_reset_date ? new Date(profile.reports_reset_date) : null;
  let used = (resetDate && resetDate >= monthStart) ? (profile.monthly_reports_used ?? 0) : 0;
  let bonusCredits = profile.bonus_report_credits ?? 0;

  // If counter was stale (from a previous month), reset it in the database
  if (!resetDate || resetDate < monthStart) {
    await adminClient
      .from("profiles")
      .update({ monthly_reports_used: 0, reports_reset_date: monthStart.toISOString() })
      .eq("id", user.id);
    used = 0;
  }

  // Enforce cap: 6 included + bonus credits
  if (used >= INCLUDED_REPORTS && bonusCredits <= 0) {
    return new Response(JSON.stringify({
      error: "Report limit reached",
      message: `You've used all ${INCLUDED_REPORTS} included reports this month. Purchase additional report credits to generate more.`,
      used,
      included: INCLUDED_REPORTS,
      bonus_credits: bonusCredits,
    }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Call generate-custom-brief internally with admin token
  const ADMIN_SECRET = Deno.env.get("ADMIN_SECRET_TOKEN");
  if (!ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/generate-custom-brief`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ADMIN_SECRET}`,
      },
      body: JSON.stringify({ user_id: user.id }),
      signal: AbortSignal.timeout(90000),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("generate-custom-brief error:", errText);
      return new Response(JSON.stringify({ error: "Brief generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await resp.json();

    // After successful generation, increment monthly_reports_used OR decrement bonus_report_credits
    const newUsed = used + 1;
    let newBonusCredits = bonusCredits;

    if (newUsed > INCLUDED_REPORTS) {
      // This report consumes a bonus credit
      newBonusCredits = Math.max(0, bonusCredits - 1);
      await adminClient
        .from("profiles")
        .update({
          monthly_reports_used: newUsed,
          bonus_report_credits: newBonusCredits,
          reports_reset_date: monthStart.toISOString(),
        })
        .eq("id", user.id);
    } else {
      await adminClient
        .from("profiles")
        .update({
          monthly_reports_used: newUsed,
          reports_reset_date: monthStart.toISOString(),
        })
        .eq("id", user.id);
    }

    // Fetch the newly generated brief to return it
    const { data: newBrief } = await adminClient
      .from("custom_briefs")
      .select("*")
      .eq("user_id", user.id)
      .order("generated_at", { ascending: false })
      .limit(1)
      .single();

    return new Response(JSON.stringify({
      success: true,
      brief: newBrief,
      reports_used: newUsed,
      reports_included: INCLUDED_REPORTS,
      bonus_credits_remaining: newBonusCredits,
      ...result,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("on-demand brief error:", e);
    return new Response(JSON.stringify({ error: "Brief generation timed out. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
