// Free Registration Assessment — anonymous-friendly.
// Takes intake data (org country, size, industry, processing activities, AI usage,
// markets served) and returns a recommended set of jurisdictions with confidence
// tier, plus a result_summary for display. Persists to registration_assessments
// and returns the shareable_token so the user can come back without an account.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

interface IntakeData {
  organization_name?: string;
  organization_country?: string; // ISO code where org is established
  organization_size?: "micro" | "small" | "medium" | "large" | "enterprise";
  industry?: string;
  email?: string;
  // Processing context
  processes_personal_data?: boolean;
  processes_special_categories?: boolean; // health, biometric, etc
  processes_children_data?: boolean;
  uses_ai_systems?: boolean;
  ai_high_risk?: boolean; // EU AI Act high-risk
  cross_border_transfers?: boolean;
  // Markets — ISO codes of markets where org offers goods/services or monitors
  markets_served?: string[];
  // Self-declared role
  acts_as_data_broker?: boolean;
  has_eu_establishment?: boolean;
  has_uk_establishment?: boolean;
}

function deriveJurisdictions(intake: IntakeData): { codes: string[]; confidence: "high" | "medium" | "low"; rationale: Record<string, string> } {
  const codes = new Set<string>();
  const rationale: Record<string, string> = {};

  // Always include the home country if it's in our table
  if (intake.organization_country) {
    codes.add(intake.organization_country);
    rationale[intake.organization_country] = "Established in this jurisdiction";
  }

  // Markets served drive extraterritorial application
  for (const m of intake.markets_served || []) {
    codes.add(m);
    rationale[m] = `Offers goods/services to residents of ${m}`;
  }

  // EU presence triggers EU-wide attention; pick lead or all served EU codes
  if (intake.has_eu_establishment) {
    rationale["IE"] = rationale["IE"] || "Common EU lead supervisory authority";
  }

  // UK separate
  if (intake.has_uk_establishment || (intake.markets_served || []).includes("UK")) {
    codes.add("UK");
    rationale["UK"] = "UK GDPR applies; ICO annual fee required";
  }

  // California data broker
  if (intake.acts_as_data_broker && (intake.markets_served || []).includes("US-CA")) {
    codes.add("US-CA");
    rationale["US-CA"] = "Data broker registration required with CPPA";
  }

  // Confidence: high if intake is rich; medium if moderate; low if minimal
  const filled = [
    intake.organization_country,
    intake.organization_size,
    intake.industry,
    intake.markets_served?.length,
    intake.processes_personal_data !== undefined,
  ].filter(Boolean).length;

  const confidence = filled >= 4 ? "high" : filled >= 2 ? "medium" : "low";
  return { codes: Array.from(codes), confidence, rationale };
}

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

    const { codes, confidence, rationale } = deriveJurisdictions(intake);

    // Fetch full requirement rows for the recommended jurisdictions
    const { data: reqs, error: reqsErr } = await supabase
      .from("jurisdiction_requirements")
      .select("*")
      .in("jurisdiction_code", codes.length ? codes : ["__none__"]);
    if (reqsErr) throw reqsErr;

    const result_summary = {
      generated_at: new Date().toISOString(),
      confidence,
      rationale,
      jurisdictions: (reqs || []).map((r) => ({
        code: r.jurisdiction_code,
        name: r.jurisdiction_name,
        region: r.region,
        law: r.law_name,
        authority: r.authority_name,
        authority_url: r.authority_url,
        registration_required: r.registration_required,
        dpo_required: r.dpo_required,
        ai_registration_required: r.ai_registration_required,
        representative_required: r.representative_required,
        filing_fee_cents: r.filing_fee_cents,
        filing_currency: r.filing_currency,
        renewal_period_months: r.renewal_period_months,
        notes: r.notes,
        why: rationale[r.jurisdiction_code],
      })),
    };

    let row;
    if (existingId && shareableToken) {
      // Update existing assessment (e.g. user revising answers)
      const { data, error } = await supabase
        .from("registration_assessments")
        .update({
          intake_data: intake,
          organization_country: intake.organization_country,
          organization_name: intake.organization_name,
          organization_size: intake.organization_size,
          industry: intake.industry,
          email: intake.email,
          recommended_jurisdictions: codes,
          confidence_tier: confidence,
          result_summary,
          status: "completed",
          user_id: userId,
        })
        .eq("id", existingId)
        .eq("shareable_token", shareableToken)
        .select()
        .single();
      if (error) throw error;
      row = data;
    } else {
      const { data, error } = await supabase
        .from("registration_assessments")
        .insert({
          user_id: userId,
          intake_data: intake,
          organization_country: intake.organization_country,
          organization_name: intake.organization_name,
          organization_size: intake.organization_size,
          industry: intake.industry,
          email: intake.email,
          recommended_jurisdictions: codes,
          confidence_tier: confidence,
          result_summary,
          status: "completed",
        })
        .select()
        .single();
      if (error) throw error;
      row = data;
    }

    return new Response(
      JSON.stringify({
        assessment_id: row.id,
        shareable_token: row.shareable_token,
        confidence,
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
