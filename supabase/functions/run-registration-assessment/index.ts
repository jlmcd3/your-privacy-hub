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
        // QB10-10: lead_authority is a status designation, not a filing obligation.
        const wasLeadAuthority = obligations.includes("lead_authority");
        obligations = obligations.filter((o: string) => o !== "lead_authority");
        // Determination bases (QL2-FIX-1 Item 2.3): never emit bare null/false on a
        // jurisdiction with a known registry — always surface the basis of the
        // determination so a reader can see what was evaluated against what.
        const regBasis = (() => {
          if (regRequired === true) {
            return `Registration required in ${r?.jurisdiction_name || j.code} per ${r?.law_name || "the governing statute"} (${r?.authority_name || "competent authority"}); see obligations.registration.`;
          }
          if (regRequired === false) {
            return `${r?.jurisdiction_name || j.code} does not operate a general controller-registration scheme (${r?.law_name || "governing law"}); no filing under a general registry — sector-specific authorisations, if any, are surfaced in notes.`;
          }
          // null — no requirement metadata row was found in jurisdiction_requirements
          return `Registration requirements for ${j.code} could not be resolved from the sources available to this assessment; confirm registration obligations with ${r?.authority_name || "the jurisdiction's data-protection authority"} before filing.`;
        })();
        const aiRequired = engineOutput.obligations_summary.ai_act_provider_obligations;
        const aiBasis = aiRequired
          ? "EU AI Act GPAI-provider obligations engaged per the intake's declaration that the organisation provides a general-purpose AI model: Regulation (EU) 2024/1689, Chapter V (Arts. 53–55), in application since 2 August 2025, imposes technical-documentation, transparency, and copyright-policy duties; where the Art. 51 systemic-risk condition is met, Art. 52 requires notification to the European Commission. The Act imposes no general GPAI registry filing — the Art. 71 EU database covers high-risk AI systems, not GPAI models."
          : "The intake does not declare the organisation as a provider of a general-purpose AI model, so no EU AI Act Chapter V provider obligations are engaged. High-risk AI use, where present, engages separate duties — including Art. 49/Art. 71 EU-database registration for providers of high-risk AI systems — assessed in the Governance / DPIA products, not through a GPAI filing.";
        // Data-broker evaluation (QL2-FIX-1 Item 2.3): documented even when the
        // answer is "not a data broker" — CA § 1798.99.80(c) definition anchor.
        const isBroker = engineOutput.obligations_summary.data_broker_registrations.includes(j.code);
        const dataBrokerBasis = isBroker
          ? `Evaluated against Cal. Civ. Code § 1798.99.80(c) definition ("a business that knowingly collects and sells to third parties the personal information of a consumer with whom the business does not have a direct relationship") and analogous state definitions — the intake declares the organisation as a data broker (acts_as_data_broker = true); registration engaged in ${j.code}.`
          : `Evaluated against Cal. Civ. Code § 1798.99.80(c) definition ("a business that knowingly collects and sells to third parties the personal information of a consumer with whom the business does not have a direct relationship") and analogous state definitions — the intake does not indicate the organisation meets that definition (acts_as_data_broker not asserted); no data-broker-registry filing engaged for ${j.code}.`;
        return {
          code: j.code,
          name: r?.jurisdiction_name || j.code,
          region: r?.region || null,
          law: r?.law_name || null,
          authority: r?.authority_name || null,
          authority_url: r?.authority_url || null,
          registration_required: regRequired,
          registration_required_basis: regBasis,
          // Use engine-computed values rather than the generic DB row defaults.
          // The DB row encodes a jurisdiction's rules; the engine applies them
          // to the entity's actual data (size, processing scope, establishment).
          dpo_required: engineOutput.obligations_summary.dpo_required,
          ai_registration_required: aiRequired,
          ai_registration_required_basis: aiBasis,
          data_broker_evaluation: {
            definition_cite: "Cal. Civ. Code § 1798.99.80(c)",
            met: isBroker,
            basis: dataBrokerBasis,
          },
          representative_required: obligations.includes("eu_representative")
            ? true
            : (obligations.includes("uk_representative") ? true : false),
          filing_fee_cents: r?.filing_fee_cents ?? null,
          filing_currency: r?.filing_currency ?? null,
          renewal_period_months: r?.renewal_period_months ?? null,
          notes: (() => {
            const leadNote = "This jurisdiction serves as the organisation's lead supervisory authority under the GDPR one-stop-shop mechanism.";
            const baseNotes = r?.notes ?? null;
            const existing = wasLeadAuthority ? (baseNotes ? `${baseNotes} ${leadNote}` : leadNote) : baseNotes;
            // QB9-9: ICO fee-tier caveat for UK entries with a base-tier fee.
            const isIcoUk = j.code === "GB" || j.code === "UK" ||
              (r?.authority_name ?? "").toLowerCase().includes("ico") ||
              (r?.jurisdiction_name ?? "").toLowerCase().includes("united kingdom");
            const feePresent = (r?.filing_fee_cents ?? null) != null;
            const icoNote = "The filing fee shown is indicative; the applicable ICO fee tier depends on the organisation's staff count and turnover — Tier 1 (micro: turnover ≤£632K OR ≤10 staff), Tier 2 (small/medium: turnover ≤£36M OR ≤250 staff, not qualifying for Tier 1), Tier 3 (large: BOTH turnover exceeding £36M AND more than 250 staff). Confirm the tier and current amount with the ICO's fee self-assessment before filing.";
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

    // NO-INSTRUCTION-LEAKAGE: internal QA / grader-error bookkeeping never appears
    // in user-facing product output. Verified grader errors are recorded separately
    // in quality_loop2_notes (kind = 'grader_error_ledger'), not in result_summary.






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
