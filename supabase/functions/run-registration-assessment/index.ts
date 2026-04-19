// Free Registration Assessment — anonymous-friendly.
// Thin HTTP wrapper around the declarative rules engine in
// _shared/registration-engine.ts. All logic, deduplication, OSS handling,
// AI-Act, BDSG-DPO and data-broker rules live in the engine so they can
// be unit-tested independently with `deno test`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  runRegistrationAssessment,
  type IntakeData,
} from "../_shared/registration-engine.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const intake = (body.intake_data || {}) as IntakeData;
    const userId = body.user_id || null;
    const existingId = body.assessment_id || null;
    const shareableToken = body.shareable_token || null;

    if (!intake.organization_country && !(intake.markets_served || []).length) {
      return new Response(
        JSON.stringify({ error: "Provide organization_country or markets_served" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Run the pure rules engine
    const engineOutput = runRegistrationAssessment(intake);
    const codes = engineOutput.jurisdictions.map((j) => j.code);

    // 2. Look up requirement metadata for every recommended jurisdiction
    const { data: reqs, error: reqsErr } = await supabase
      .from("jurisdiction_requirements")
      .select("*")
      .in("jurisdiction_code", codes.length ? codes : ["__none__"]);
    if (reqsErr) throw reqsErr;

    const reqByCode = new Map((reqs || []).map((r: any) => [r.jurisdiction_code, r]));

    // 3. Compose the displayable result_summary, joining engine output with reqs
    const result_summary = {
      generated_at: new Date().toISOString(),
      confidence: engineOutput.confidence,
      confidence_reasons: engineOutput.confidence_reasons,
      rules_fired: engineOutput.rules_fired,
      warnings: engineOutput.warnings,
      obligations_summary: engineOutput.obligations_summary,
      jurisdictions: engineOutput.jurisdictions.map((j) => {
        const r = reqByCode.get(j.code);
        return {
          code: j.code,
          name: r?.jurisdiction_name || j.code,
          region: r?.region || null,
          law: r?.law_name || null,
          authority: r?.authority_name || null,
          authority_url: r?.authority_url || null,
          registration_required: r?.registration_required ?? null,
          dpo_required: r?.dpo_required ?? null,
          ai_registration_required: r?.ai_registration_required ?? null,
          representative_required: r?.representative_required ?? null,
          filing_fee_cents: r?.filing_fee_cents ?? null,
          filing_currency: r?.filing_currency ?? null,
          renewal_period_months: r?.renewal_period_months ?? null,
          notes: r?.notes ?? null,
          why: j.why,
          rule_id: j.rule_id,
          obligations: j.obligations,
        };
      }),
    };

    // 4. Persist
    let row;
    const persistPayload = {
      intake_data: intake,
      organization_country: intake.organization_country,
      organization_name: intake.organization_name,
      organization_size: intake.organization_size,
      industry: intake.industry,
      email: intake.email,
      recommended_jurisdictions: codes,
      confidence_tier: engineOutput.confidence,
      result_summary,
      status: "completed",
      user_id: userId,
    };

    if (existingId && shareableToken) {
      const { data, error } = await supabase
        .from("registration_assessments")
        .update(persistPayload)
        .eq("id", existingId)
        .eq("shareable_token", shareableToken)
        .select()
        .single();
      if (error) throw error;
      row = data;
    } else {
      const { data, error } = await supabase
        .from("registration_assessments")
        .insert(persistPayload)
        .select()
        .single();
      if (error) throw error;
      row = data;
    }

    return new Response(
      JSON.stringify({
        assessment_id: row.id,
        shareable_token: row.shareable_token,
        confidence: engineOutput.confidence,
        recommended_jurisdictions: codes,
        result_summary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("run-registration-assessment error", e);
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
