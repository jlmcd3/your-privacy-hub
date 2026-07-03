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
import { verifyCaller } from "../_shared/verify-caller.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { PROMPT_CORE_VERSION } from "../_shared/prompt-core.ts";

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
  console.log(`[qb9] run-registration-assessment build active · core=${PROMPT_CORE_VERSION}`);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const fnRun = await startFunctionRun(supabase, "run-registration-assessment", {
    archetype: "foreground",
    trustClass: "user",
    invokedBy: "user",
  });
  try {
    const body = await req.json();
    const intake = (body.intake_data || {}) as IntakeData;
    // Anonymous-friendly: only trust user_id from verified JWT or internal calls.
    const caller = await verifyCaller(req).catch(() => ({ userId: null, internal: false }));
    const userId = caller.internal ? (body.user_id || null) : (caller.userId || null);
    const existingId = body.assessment_id || null;
    const shareableToken = body.shareable_token || null;
    const clientId = body.client_id || null;

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
        const regRequired = r?.registration_required ?? null;
        // Reconcile: the engine's per-jurisdiction `obligations` array and the
        // DB-row `registration_required` flag must agree. The DB row is the
        // authoritative source for whether GENERAL controller registration is
        // required in that jurisdiction (e.g., France/CNIL abolished general
        // registration in 2018). Strip "registration" from obligations when
        // the flag is false/null; add it when the flag is true and it's
        // missing. Sector-specific authorizations (health/biometric, etc.)
        // belong in `notes`, not in the `registration` obligation slot.
        let obligations = Array.isArray(j.obligations) ? [...j.obligations] : [];
        if (regRequired === true && !obligations.includes("registration")) {
          obligations.push("registration");
        } else if (regRequired !== true && obligations.includes("registration")) {
          obligations = obligations.filter((o: string) => o !== "registration");
        }
        return {
          code: j.code,
          name: r?.jurisdiction_name || j.code,
          region: r?.region || null,
          law: r?.law_name || null,
          authority: r?.authority_name || null,
          authority_url: r?.authority_url || null,
          registration_required: regRequired,
          // Use engine-computed values rather than the generic DB row defaults.
          // The DB row encodes a jurisdiction's rules; the engine applies them
          // to the entity's actual data (size, processing scope, establishment).
          dpo_required: engineOutput.obligations_summary.dpo_required,
          ai_registration_required: engineOutput.obligations_summary.ai_act_provider_obligations,
          representative_required: obligations.includes("eu_representative")
            ? true
            : (obligations.includes("uk_representative") ? true : false),
          filing_fee_cents: r?.filing_fee_cents ?? null,
          filing_currency: r?.filing_currency ?? null,
          renewal_period_months: r?.renewal_period_months ?? null,
          notes: (() => {
            const existing = r?.notes ?? null;
            // QB9-9: ICO fee-tier caveat for UK entries with a base-tier fee.
            const isIcoUk = j.code === "GB" || j.code === "UK" ||
              (r?.authority_name ?? "").toLowerCase().includes("ico") ||
              (r?.jurisdiction_name ?? "").toLowerCase().includes("united kingdom");
            const feePresent = (r?.filing_fee_cents ?? null) != null;
            const icoNote = "The filing fee shown is the base-tier amount from our records; the applicable ICO fee tier depends on the organisation's staff count and turnover — confirm the tier and current amount with the ICO's fee self-assessment before filing.";
            if (isIcoUk && feePresent) {
              return existing ? `${existing} ${icoNote}` : icoNote;
            }
            return existing;
          })(),
          why: j.why,
          rule_id: j.rule_id,
          obligations,
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
      client_id: clientId,
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

    await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "registration_assessments", sourceRowId: row.id });
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
    await failFunctionRun(supabase, fnRun, e);
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
