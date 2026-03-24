import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a privacy regulatory intelligence assistant for EndUserPrivacy.com,
used by DPOs, General Counsel, Chief Privacy Officers, and privacy lawyers at multinational
organizations. Your knowledge covers: global privacy laws (GDPR, UK GDPR, CCPA/CPRA, LGPD,
PIPL, PIPA, PDPA, DPDP Act, Privacy Act, POPIA, and 100+ others), all major data protection
authorities (EDPB, ICO, CNIL, DPC, Garante, AEPD, FTC, state AGs, PDPC, PPC, PIPC, ANPD,
OAIC, CAC, and others), enforcement history, AI governance regulation (EU AI Act, EDPB AI
guidance), biometric privacy (BIPA, GDPR special categories), privacy litigation (BIPA class
actions, VPPA, CIPA wiretapping), and cross-border data transfer mechanisms (SCCs, BCRs,
adequacy decisions).

Response rules:
1. Always name the specific regulator, law, and jurisdiction — never generic statements
2. Cite article/section numbers for specific legal obligations when known (e.g. "GDPR Art. 83(4)")
3. Note when laws are in transition, pending, or have uncertain enforcement status
4. For deadlines: give the specific date and enforcement start if known
5. Never give legal advice — always note "verify against primary sources and consult qualified counsel"
6. Format with short, scannable paragraphs. Use bullet points only for lists of specific items.
7. Keep answers under 350 words unless the question genuinely requires depth
8. If asked about litigation, note that you have knowledge of major cases and trends but not
   real-time court filings`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Step 1: Verify authenticated user via Supabase JWT
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const jwt = authHeader.slice(7).trim();
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired session" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Step 2: Check premium subscription via service role
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("is_premium, ask_privacy_count, ask_privacy_reset_date")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return new Response(
      JSON.stringify({ error: "Could not verify subscription status" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const FREE_LIMIT = 3;

  if (!profile.is_premium) {
    // Monthly reset check
    const today = new Date().toISOString().split("T")[0];
    const resetDate = profile.ask_privacy_reset_date;
    let currentCount = profile.ask_privacy_count ?? 0;

    if (resetDate && resetDate.slice(0, 7) < today.slice(0, 7)) {
      // New month — reset count
      await adminClient
        .from("profiles")
        .update({ ask_privacy_count: 0, ask_privacy_reset_date: today })
        .eq("id", user.id);
      currentCount = 0;
    }

    if (currentCount >= FREE_LIMIT) {
      return new Response(
        JSON.stringify({
          error: "Question limit reached",
          message: `You've used your ${FREE_LIMIT} free questions this month. Upgrade to Premium for unlimited questions.`,
          upgrade_url: "/subscribe",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  // Step 3: Process the question
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Invalid request: messages array required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trimmedMessages = messages.slice(-10);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1000,
        system: SYSTEM_PROMPT,
        messages: trimmedMessages,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Anthropic API error:", response.status, errText.slice(0, 200));
      return new Response(
        JSON.stringify({ answer: "The AI assistant is temporarily unavailable. Please try again shortly." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const answer = data.content?.[0]?.text ?? "Sorry, I couldn't process that question.";

    return new Response(
      JSON.stringify({ answer }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ask-privacy error:", error);
    return new Response(
      JSON.stringify({ answer: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
