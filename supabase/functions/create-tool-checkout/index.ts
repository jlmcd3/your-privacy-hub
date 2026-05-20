import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, resolvePriceId } from "../_shared/stripe.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Tool catalog. Lookup keys map to prices created in the payment system
// (see payments--batch_create_product results). Fallback cents reflect
// the v7 pricing model — standalone = full per-use price, subscriber =
// Professional rate (25% off). Intelligence subscribers (20% off) are
// computed at runtime. Keep in sync with src/hooks/useToolPrice.ts
// FALLBACK and src/config/pricing.ts PRICING.tools.
const TOOLS: Record<
  string,
  {
    name: string;
    standalone_lookup: string;
    subscriber_lookup: string | null;
    table: string;
    fallback_standalone_cents: number;
    fallback_subscriber_cents: number;
  }
> = {
  li_assessment: {
    name: "Legitimate Interest Assessment Tool",
    standalone_lookup: "li_standalone_v2",
    subscriber_lookup: "li_subscriber_v2",
    table: "li_assessments",
    fallback_standalone_cents: 3500,
    fallback_subscriber_cents: 2625,
  },
  governance_assessment: {
    name: "Privacy Program Assessment Tool",
    standalone_lookup: "hc_standalone_v2",
    subscriber_lookup: "hc_subscriber_v2",
    table: "governance_assessments",
    fallback_standalone_cents: 5500,
    fallback_subscriber_cents: 4125,
  },
  dpia_framework: {
    name: "Impact Assessment Builder",
    standalone_lookup: "dpia_standalone_v2",
    subscriber_lookup: "dpia_subscriber_v2",
    table: "dpia_frameworks",
    fallback_standalone_cents: 4500,
    fallback_subscriber_cents: 3375,
  },
  dpa_generator: {
    name: "Your Custom DPA",
    standalone_lookup: "dpa_standalone_v2",
    subscriber_lookup: "dpa_subscriber_v2",
    table: "dpa_documents",
    fallback_standalone_cents: 4500,
    fallback_subscriber_cents: 3375,
  },
  ir_playbook: {
    name: "Your Breach Response Playbook",
    standalone_lookup: "ir_standalone_v2",
    subscriber_lookup: "ir_subscriber_v2",
    table: "ir_playbooks",
    fallback_standalone_cents: 2000,
    fallback_subscriber_cents: 1500,
  },
  biometric_checker: {
    name: "Biometric Privacy Compliance Checker",
    standalone_lookup: "biometric_standalone_v2",
    subscriber_lookup: "biometric_subscriber_v2",
    table: "biometric_assessments",
    fallback_standalone_cents: 1000,
    fallback_subscriber_cents: 800,
  },
  ropa_initial: {
    name: "RoPA Builder — Initial Generation",
    standalone_lookup: "ropa_initial_standalone",
    subscriber_lookup: "ropa_initial_subscriber",
    table: "ropa_sessions",
    fallback_standalone_cents: 4000,
    fallback_subscriber_cents: 3000,
  },
  ropa_refresh: {
    name: "RoPA Builder — Annual Refresh",
    standalone_lookup: "ropa_refresh_standalone",
    subscriber_lookup: "ropa_refresh_subscriber",
    table: "ropa_sessions",
    fallback_standalone_cents: 4000,
    fallback_subscriber_cents: 3000,
  },
  us_notice_single: {
    name: "US Privacy Notice — Single State",
    standalone_lookup: "us_notice_v7_standalone",
    subscriber_lookup: "us_notice_v7_subscriber",
    table: "us_notice_sessions",
    fallback_standalone_cents: 3000,
    fallback_subscriber_cents: 2300,
  },
  us_notice_all_states: {
    name: "US Privacy Notice — All States Suite",
    standalone_lookup: "us_notice_v7_standalone",
    subscriber_lookup: "us_notice_v7_subscriber",
    table: "us_notice_sessions",
    fallback_standalone_cents: 3000,
    fallback_subscriber_cents: 2300,
  },
  us_notice_refresh: {
    name: "US Notice — Annual Refresh",
    standalone_lookup: "us_notice_v7_standalone",
    subscriber_lookup: "us_notice_v7_subscriber",
    table: "us_notice_sessions",
    fallback_standalone_cents: 3000,
    fallback_subscriber_cents: 2300,
  },
  eu_notice_single: {
    name: "EU & Global Notice — Single Framework",
    standalone_lookup: "eu_notice_v7_standalone",
    subscriber_lookup: "eu_notice_v7_subscriber",
    table: "eu_notice_sessions",
    fallback_standalone_cents: 5000,
    fallback_subscriber_cents: 3800,
  },
  eu_notice_suite: {
    name: "EU Notice Suite — GDPR + UK GDPR + FADP",
    standalone_lookup: "eu_notice_v7_standalone",
    subscriber_lookup: "eu_notice_v7_subscriber",
    table: "eu_notice_sessions",
    fallback_standalone_cents: 5000,
    fallback_subscriber_cents: 3800,
  },
  eu_notice_full_international: {
    name: "EU & Global Notice — Full International",
    standalone_lookup: "eu_notice_v7_standalone",
    subscriber_lookup: "eu_notice_v7_subscriber",
    table: "eu_notice_sessions",
    fallback_standalone_cents: 5000,
    fallback_subscriber_cents: 3800,
  },
  eu_notice_refresh: {
    name: "EU & Global Notice — Annual Refresh",
    standalone_lookup: "eu_notice_v7_standalone",
    subscriber_lookup: "eu_notice_v7_subscriber",
    table: "eu_notice_sessions",
    fallback_standalone_cents: 5000,
    fallback_subscriber_cents: 3800,
  },
  cppa_risk_assessment: {
    name: "CPPA Risk Assessment — Module 1",
    standalone_lookup: "cppa_risk_standalone",
    subscriber_lookup: "cppa_risk_subscriber",
    table: "cppa_assessments",
    fallback_standalone_cents: 6000,
    fallback_subscriber_cents: 4500,
  },
  cppa_cybersecurity: {
    name: "CPPA Cybersecurity Readiness — Module 2",
    standalone_lookup: "cppa_cyber_standalone",
    subscriber_lookup: "cppa_cyber_subscriber",
    table: "cppa_assessments",
    fallback_standalone_cents: 8000,
    fallback_subscriber_cents: 6000,
  },
  cppa_suite: {
    name: "CPPA Full Audit Suite",
    standalone_lookup: "cppa_suite_standalone",
    subscriber_lookup: "cppa_suite_subscriber",
    table: "cppa_assessments",
    fallback_standalone_cents: 14000,
    fallback_subscriber_cents: 10500,
  },
};

// Tools whose row insert needs a `module` discriminator (CPPA family).
const MODULE_FOR_TOOL: Record<string, string> = {
  cppa_risk_assessment: "risk_assessment",
  cppa_cybersecurity: "cybersecurity",
  cppa_suite: "suite",
};

const SESSION_TABLES = new Set([
  "ropa_sessions",
  "us_notice_sessions",
  "eu_notice_sessions",
]);

const DEFAULT_REVIEW_PATHS: Record<string, string> = {
  ropa_sessions: "/ropa/review",
  us_notice_sessions: "/us-notices/review",
  eu_notice_sessions: "/eu-notices/review",
};

// Resolve the Stripe environment. Always prefer the explicit value the
// client sends (derived from the publishable token prefix), so test cards
// from the preview never land in live mode.
function detectEnv(override?: string): StripeEnv {
  if (override === "sandbox" || override === "live") return override;
  if (Deno.env.get("STRIPE_SANDBOX_API_KEY")) return "sandbox";
  return Deno.env.get("STRIPE_LIVE_API_KEY") ? "live" : "sandbox";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tool_type, user_id, intake_data, return_url, environment, embedded, success_path } = await req.json();
    const tool = TOOLS[tool_type];
    if (!tool) {
      return new Response(JSON.stringify({ error: "Invalid tool type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // v8 gating:
    //   - Every tool is per-use (no "included free" tier).
    //   - Founding subscribers (founding_subscriber = true) get 20% off
    //     Smart Tools / 15% off Convenience Tools, applied to standalone.
    //   - Professional annual subscribers may use 1 free Convenience Tool
    //     run per client per month (free_run_used_this_month gate).
    const CPPA_TOOL_LOOKUPS = new Set([
      "cppa_risk_standalone", "cppa_risk_subscriber",
      "cppa_cyber_standalone", "cppa_cyber_subscriber",
      "cppa_suite_standalone", "cppa_suite_subscriber",
    ]);
    const isCppa = !!(tool.standalone_lookup && CPPA_TOOL_LOOKUPS.has(tool.standalone_lookup));

    // Classify tool for founding-discount %.
    const SMART_TOOL_TYPES = new Set([
      "li_assessment", "governance_assessment", "dpia_framework",
      "cppa_risk_assessment", "cppa_cybersecurity", "cppa_suite",
      "dpa_generator", "biometric_checker",
    ]);
    const CONVENIENCE_TOOL_TYPES = new Set([
      "ir_playbook", "ropa_initial", "ropa_refresh",
      "us_notice_single", "us_notice_all_states", "us_notice_refresh",
      "eu_notice_single", "eu_notice_suite", "eu_notice_full_international", "eu_notice_refresh",
    ]);
    const isSmart = SMART_TOOL_TYPES.has(tool_type);
    const isConvenience = CONVENIENCE_TOOL_TYPES.has(tool_type);

    let isFoundingSubscriber = false;
    let isProfessionalAnnual = false;
    let subscriptionType: string | null = null;
    if (user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_premium, is_pro, subscription_type, founding_subscriber, professional_annual")
        .eq("id", user_id)
        .single();
      subscriptionType = (profile as any)?.subscription_type ?? null;
      isFoundingSubscriber = (profile as any)?.founding_subscriber === true
        || subscriptionType === "annual_founding";
      isProfessionalAnnual = (profile as any)?.professional_annual === true
        || subscriptionType === "annual" || subscriptionType === "annual_founding";
    }

    const isSubscriber = isFoundingSubscriber; // backwards-compat alias used below

    // Always charge the standalone Stripe price (subscriber lookup deprecated under v8);
    // founding discount is computed at runtime via price_data fallback.
    const lookupKey = tool.standalone_lookup;

    const env = detectEnv(environment);
    const stripe = createStripeClient(env);

    const standaloneCents = tool.fallback_standalone_cents;

    // NOTE: free convenience-run consumption is enforced client-side via
    // checkFreeConvenienceRun()/consumeFreeConvenienceRun() in
    // src/lib/freeConvenienceRun.ts. Stripe disallows $0 sessions, so when
    // a free run is available the client should mark the row as paid
    // directly and skip create-tool-checkout entirely.

    let amountCents: number;
    if (isFoundingSubscriber && (isSmart || isConvenience)) {
      const pct = isSmart ? 0.20 : 0.15;
      amountCents = Math.round(standaloneCents * (1 - pct));
    } else {
      const resolved = await resolvePriceId(stripe, lookupKey);
      amountCents = resolved?.unit_amount ?? standaloneCents;
    }

    // Preserve legacy variable names referenced later in the file.
    const stripePrice: { id: string; unit_amount?: number | null } | null = null;
    const subscriberCents = tool.fallback_subscriber_cents;
    const isProfessionalSubscriber = isProfessionalAnnual; // alias for legacy code below
    const isIntelligenceSubscriber = subscriptionType === "monthly";
    void subscriberCents; void stripePrice; void isIntelligenceSubscriber;



    const rawOrigin = return_url || req.headers.get("origin") || Deno.env.get("SITE_URL") || "";
    const origin = /^https?:\/\//i.test(rawOrigin) ? rawOrigin.replace(/\/$/, "") : "https://www.enduserprivacy.com";

    const lineItemBase = stripePrice
      ? { price: stripePrice.id, quantity: 1 }
      : {
          price_data: {
            currency: "usd",
            product_data: { name: tool.name },
            unit_amount: amountCents,
          },
          quantity: 1,
        };

    // ── Session-based tools (RoPA / US Notice / EU Notice) ──
    // The session row already exists from the Q&A flow. Do NOT insert a new
    // row. Generation is triggered by the user from the review screen after
    // the webhook marks payment_confirmed.
    const isSessionTool = SESSION_TABLES.has(tool.table);
    if (isSessionTool) {
      const sessionId = (intake_data as any)?.session_id;
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "session_id required for this tool type" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const defaultPath = DEFAULT_REVIEW_PATHS[tool.table] || "/account";
      const returnPath = success_path || `${defaultPath}?payment_success=true`;
      const joinChar = returnPath.includes("?") ? "&" : "?";

      const checkoutParams: Record<string, unknown> = {
        payment_method_types: ["card"],
        line_items: [lineItemBase as any],
        mode: "payment",
        metadata: {
          tool_type,
          assessment_id: sessionId,
          user_id: user_id || "",
          tier: isProfessionalSubscriber ? "professional" : isIntelligenceSubscriber ? "intelligence" : "standalone",
        },
      };

      if (embedded) {
        checkoutParams.ui_mode = "embedded";
        checkoutParams.return_url = `${origin}${returnPath}${joinChar}session_id={CHECKOUT_SESSION_ID}`;
      } else {
        checkoutParams.success_url = `${origin}${returnPath}`;
        checkoutParams.cancel_url = `${origin}${defaultPath}`;
      }

      const sessionResp = await stripe.checkout.sessions.create(checkoutParams as any);

      return new Response(
        JSON.stringify(
          embedded
            ? { client_secret: sessionResp.client_secret, assessment_id: sessionId }
            : { url: sessionResp.url, assessment_id: sessionId },
        ),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── CPPA assessments — table uses a `module` discriminator ──
    let assessmentRecord: { id: string } | null = null;
    let suiteCyberId: string | null = null;
    if (MODULE_FOR_TOOL[tool_type]) {
      const baseRow = {
        user_id: user_id || null,
        status: "pending" as const,
        intake_data: intake_data || {},
        purchase_price_cents: amountCents,
      };

      if (tool_type === "cppa_suite") {
        // Suite purchase creates one row per module so each can be processed independently.
        const { data: riskRow, error: riskErr } = await supabase
          .from("cppa_assessments")
          .insert({ ...baseRow, module: "risk_assessment" })
          .select("id")
          .single();
        if (riskErr || !riskRow) {
          console.error("CPPA suite (risk) insert error:", riskErr);
          throw new Error("Failed to create CPPA suite assessment rows");
        }
        const { data: cyberRow, error: cyberErr } = await supabase
          .from("cppa_assessments")
          .insert({ ...baseRow, module: "cybersecurity" })
          .select("id")
          .single();
        if (cyberErr || !cyberRow) {
          console.error("CPPA suite (cyber) insert error:", cyberErr);
          throw new Error("Failed to create CPPA suite assessment rows");
        }
        assessmentRecord = riskRow;
        suiteCyberId = cyberRow.id;
      } else {
        const { data: row, error: insErr } = await supabase
          .from("cppa_assessments")
          .insert({ ...baseRow, module: MODULE_FOR_TOOL[tool_type] })
          .select("id")
          .single();
        if (insErr || !row) {
          console.error("CPPA insert error:", insErr);
          throw new Error("Failed to create CPPA assessment row");
        }
        assessmentRecord = row;
      }
    }

    // ── All other tools ──
    if (!assessmentRecord) {
      let assessmentData: Record<string, unknown> = {};
      if (tool_type === "li_assessment") {
        // Whitelist columns that actually exist on li_assessments. The
        // intake form passes extra analytics fields (e.g. preview_assessment_id)
        // that are not persisted columns — spreading them caused the insert
        // to fail with PGRST204 "column not found".
        const LI_ALLOWED_KEYS = new Set([
          "processing_description",
          "data_categories",
          "relationship_type",
          "jurisdictions",
          "sector",
          "stated_purpose",
          "alternatives_considered",
          "purpose_details",
          "necessity_details",
          "balancing_details",
          "stage",
          "client_id",
        ]);
        const filteredIntake: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(intake_data || {})) {
          if (LI_ALLOWED_KEYS.has(k)) filteredIntake[k] = v;
        }
        assessmentData = {
          user_id,
          status: "pending",
          processing_description: intake_data?.processing_description || "",
          purchased_as_standalone: !isSubscriber,
          purchase_price_cents: amountCents,
          ...filteredIntake,
        };
      } else {
        assessmentData = {
          user_id,
          status: "pending",
          intake_data: intake_data || {},
          purchased_as_standalone: !isSubscriber,
          purchase_price_cents: amountCents,
        };
      }

      const { data: record, error } = await supabase
        .from(tool.table)
        .insert(assessmentData)
        .select()
        .single();
      if (error || !record) {
        console.error("Insert error:", error);
        throw new Error("Failed to create assessment record");
      }
      assessmentRecord = record;
    }

    const record = assessmentRecord!;

    // CPPA suite uses a combined result page; other tools use /<slug>/result/:id.
    const toolPath = tool_type.replace(/_/g, "-");
    const successPath =
      tool_type === "cppa_suite"
        ? `/cppa-suite/result?risk_id=${record.id}&cyber_id=${suiteCyberId}&purchased=true`
        : `/${toolPath}/result/${record.id}?purchased=true`;
    const cancelPath =
      tool_type === "cppa_suite" ? `/cppa-risk-assessment` : `/${toolPath}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [lineItemBase as any],
      mode: "payment",
      metadata: {
        tool_type,
        assessment_id: record.id,
        // For suite purchases, also stash the second (cybersecurity) row so the
        // webhook can dispatch both edge functions after payment.
        ...(suiteCyberId ? { suite_cyber_id: suiteCyberId } : {}),
        user_id: user_id || "",
        tier: isProfessionalSubscriber ? "professional" : isIntelligenceSubscriber ? "intelligence" : "standalone",
      },
      ...(embedded
        ? {
            ui_mode: "embedded",
            return_url: `${origin}${successPath}${successPath.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
          }
        : {
            success_url: `${origin}${successPath}`,
            cancel_url: `${origin}${cancelPath}`,
          }),
    });

    return new Response(
      JSON.stringify(
        embedded
          ? {
              client_secret: session.client_secret,
              assessment_id: record.id,
              suite_cyber_id: suiteCyberId,
            }
          : {
              url: session.url,
              assessment_id: record.id,
              suite_cyber_id: suiteCyberId,
            },
      ),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("create-tool-checkout error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message || "Failed to create checkout session" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
