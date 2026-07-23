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

export const BUILD_STAMP = "qbp24-output-structure-corrections@2026-07-23T02:00:00Z";
console.log(`[run-registration-assessment] boot build_stamp=${BUILD_STAMP}`);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// QB-P22 item 5a — ICO Data-Protection Fee tier resolver.
// ICO tiers (published fee-tier criteria):
//   Tier 1 (£52): micro — turnover ≤ £632k OR ≤ 10 staff.
//   Tier 2 (£78): small/medium — not Tier 1, AND (turnover ≤ £36m OR ≤ 250 staff).
//   Tier 3 (£3,763): large — turnover > £36m AND > 250 staff.
// Boundary flag fires when the intake sits within one band of a threshold and
// we can't distinguish the neighbouring tier from the record alone.
type IcoTierResolution = {
  tier: 1 | 2 | 3 | null;
  fee_cents: number | null;
  narrative: string;
  boundary: boolean;
};
function resolveIcoFeeTier(intake: any): IcoTierResolution {
  const staff = Number(intake?.employee_count);
  const revenueUsd = Number(intake?.annual_revenue_usd);
  const orgSize = String(intake?.organization_size ?? "").toLowerCase();
  // GBP conversion is deliberately conservative — the ICO thresholds are in GBP;
  // we use 0.80 GBP/USD as a stable planning proxy. Boundary flag surfaces the caveat.
  const revenueGbp = Number.isFinite(revenueUsd) ? revenueUsd * 0.80 : NaN;
  const T1_TURNOVER_GBP = 632_000;
  const T2_TURNOVER_GBP = 36_000_000;
  const T1_STAFF = 10;
  const T2_STAFF = 250;
  const FEE_T1 = 5200;      // £52.00
  const FEE_T2 = 7800;      // £78.00
  const FEE_T3 = 376_300;   // £3,763.00
  const hasStaff = Number.isFinite(staff) && staff > 0;
  const hasRevenue = Number.isFinite(revenueGbp);
  // Fallback via organization_size when explicit fields are absent.
  const sizeTier: 1 | 2 | 3 | null = orgSize.includes("micro") ? 1
    : (orgSize.includes("small") || orgSize.includes("medium") || orgSize === "sme") ? 2
    : (orgSize.includes("large") || orgSize.includes("enterprise")) ? 3
    : null;
  let tier: 1 | 2 | 3 | null = null;
  let boundary = false;
  if (hasStaff || hasRevenue) {
    const staffOverT2 = hasStaff && staff > T2_STAFF;
    const revOverT2 = hasRevenue && revenueGbp > T2_TURNOVER_GBP;
    const staffLeT1 = hasStaff && staff <= T1_STAFF;
    const revLeT1 = hasRevenue && revenueGbp <= T1_TURNOVER_GBP;
    if (staffOverT2 && revOverT2) {
      tier = 3;
    } else if (staffLeT1 || revLeT1) {
      tier = 1;
      // Boundary if the other axis, when present, pushes above Tier 1.
      if ((hasStaff && staff > T1_STAFF) || (hasRevenue && revenueGbp > T1_TURNOVER_GBP)) boundary = true;
    } else {
      tier = 2;
      // Boundary if either axis sits within 10% of the T2/T3 threshold.
      if (hasStaff && staff > T2_STAFF * 0.9 && staff <= T2_STAFF) boundary = true;
      if (hasRevenue && revenueGbp > T2_TURNOVER_GBP * 0.9 && revenueGbp <= T2_TURNOVER_GBP) boundary = true;
    }
  } else if (sizeTier) {
    tier = sizeTier;
    boundary = true; // organization_size alone can't confirm the axis-based tier.
  }
  const feeMap: Record<1 | 2 | 3, number> = { 1: FEE_T1, 2: FEE_T2, 3: FEE_T3 };
  const fee_cents = tier ? feeMap[tier] : null;
  const basisBits: string[] = [];
  if (hasStaff) basisBits.push(`staff count ${staff}`);
  if (hasRevenue) basisBits.push(`turnover ≈ £${Math.round(revenueGbp).toLocaleString("en-GB")} (from annual_revenue_usd)`);
  if (!basisBits.length && sizeTier) basisBits.push(`organization_size "${orgSize}"`);
  const basis = basisBits.length ? basisBits.join(" and ") : "no distinguishing intake fields";
  const narrative = tier
    ? `ICO Data-Protection Fee resolved to Tier ${tier} (£${(feeMap[tier] / 100).toFixed(2)}) from ${basis}.`
    : `ICO Data-Protection Fee tier could not be resolved from the record (${basis}); confirm the tier via the ICO fee self-assessment.`;
  return { tier, fee_cents, narrative, boundary };
}

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
          return `Registration requirements for ${j.code} could not be resolved from the sources available to this assessment; confirm any registration obligations with ${r?.authority_name || "the relevant supervisory or enforcement authority"} before filing.`;
        })();
        // PRODUCT-PROMPT-REG — AI-ROLE FACT DISCIPLINE + EU-ACT TERRITORIALITY.
        // Read `ai_general_purpose_provider` and `ai_high_risk` VERBATIM; do
        // not conflate. Never cite the EU AI Act as a UK obligation.
        const gpaiProvider = engineOutput.obligations_summary.gpai_provider_obligations === true;
        const highRiskDeployer = engineOutput.obligations_summary.high_risk_ai_deployer_obligations === true;
        const isEuEea = new Set([
          "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
          "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","NO","IS","LI",
        ]).has(j.code);
        const isUk = j.code === "UK" || j.code === "GB";
        const aiRequired = isEuEea && (gpaiProvider || highRiskDeployer);
        const aiBasis = (() => {
          if (isUk) {
            return "EU AI Act obligations do not apply as a UK matter (the Act is EU law; the UK did not retain it post-Brexit). The UK has no comprehensive AI statute currently in force; AI governance in the UK proceeds under sector-regulator guidance following the DSIT 'A pro-innovation approach to AI regulation' White Paper (CP 815, March 2023; government response February 2024 (CP 1019)) and pre-existing UK GDPR, Equality Act 2010, and product-safety duties. Confirm the current status of the UK Government's AI Regulation Bill and any sector-regulator guidance with the ICO and the relevant regulator before concluding no AI-specific filing exists.";
          }
          if (!isEuEea) {
            return `The EU AI Act is EU law and does not apply as a ${r?.jurisdiction_name || j.code} filing obligation. Local AI rules, where present, are assessed under the jurisdiction's own framework and are outside the scope of this registration recommendation.`;
          }
          // EU/EEA — split by declared role
          if (gpaiProvider && highRiskDeployer) {
            return "Both EU AI Act tracks engaged in this jurisdiction. (1) GPAI-provider obligations per the intake's declaration that the organisation provides a general-purpose AI model: Regulation (EU) 2024/1689, Chapter V (Arts. 53–55), in application since 2 August 2025, imposes technical-documentation, transparency, and copyright-policy duties; where the Art. 51 systemic-risk condition is met, Art. 52 requires notification to the European Commission. (2) High-risk-AI deployer obligations per the intake's declaration that the organisation deploys a high-risk AI system: Chapter III (Arts. 26–29) imposes deployer duties (human oversight, input-data appropriateness, monitoring, incident reporting, and — where the deployer qualifies — the Art. 27 fundamental-rights impact assessment); Art. 49(2) requires deployers that are public authorities, Union institutions, bodies, offices or agencies (and certain other categories) to register the high-risk system's use in the EU database.";
          }
          if (gpaiProvider) {
            return "EU AI Act GPAI-provider obligations engaged per the intake's declaration that the organisation provides a general-purpose AI model: Regulation (EU) 2024/1689, Chapter V (Arts. 53–55), in application since 2 August 2025, imposes technical-documentation, transparency, and copyright-policy duties; where the Art. 51 systemic-risk condition is met, Art. 52 requires notification to the European Commission. The Act imposes no general GPAI registry filing — the Art. 71 EU database covers high-risk AI systems, not GPAI models.";
          }
          if (highRiskDeployer) {
            return "EU AI Act high-risk-AI obligations engaged per the intake's declaration that the organisation deploys a high-risk AI system: Regulation (EU) 2024/1689, Chapter III (Arts. 26–29) imposes deployer duties (human oversight per Art. 26(1), input-data appropriateness where the deployer controls input data per Art. 26(4), monitoring per Art. 26(5), incident reporting per Art. 26(5), and record-keeping per Art. 26(6)); where the deployer is a public authority or Union body (or otherwise within Art. 49(2) scope), Art. 49(2) requires registration of the high-risk system's use in the EU database maintained under Art. 71. The Art. 27 fundamental-rights impact assessment applies to the deployer categories enumerated there.";
          }
          return "The intake declares neither GPAI-provider nor high-risk-AI-deployer status, so no EU AI Act filing obligation is engaged in this jurisdiction. Other AI uses may still attract transparency, human-oversight, or fundamental-rights duties under Arts. 50, 4, and related provisions — assessed in the Governance / DPIA products, not through this filing.";
        })();
        // Data-broker evaluation (QL2-FIX-1 Item 2.3): documented even when the
        // answer is "not a data broker" — CA § 1798.99.80(c) definition anchor.
        const isBroker = engineOutput.obligations_summary.data_broker_registrations.includes(j.code);
        const isCalifornia = j.code === "US-CA";
        const dataBrokerBasis = isBroker
          ? (isCalifornia
              ? `Data-broker registration is engaged in ${j.code}: the intake declares the organisation to be a data broker, evaluated against the Cal. Civ. Code § 1798.99.80(c) definition ("a business that knowingly collects and sells to third parties the personal information of a consumer with whom the business does not have a direct relationship") and analogous state definitions.`
              : `Data-broker registration is engaged in ${j.code}: the intake declares the organisation to be a data broker; confirm the jurisdiction's own registry definition and filing requirements with its competent authority.`)
          : (isCalifornia
              ? `No data-broker-registry filing is engaged for ${j.code}: the intake does not indicate the organisation meets the Cal. Civ. Code § 1798.99.80(c) definition ("a business that knowingly collects and sells to third parties the personal information of a consumer with whom the business does not have a direct relationship") or analogous state definitions.`
              : `No data-broker-registry filing is engaged for ${j.code}: the intake does not indicate the organisation meets a data-broker definition requiring registry filing in this jurisdiction.`);
        // QB-P24 Item 2 — additive `unresolved` block. When registration
        // resolution fails (no metadata row OR registration_required is null),
        // ship a structured block naming the authority to confirm with. Existing
        // keys are UNCHANGED — this is purely additive so the frozen revision
        // path (regenerate-assessment) is not affected.
        const isUnresolved = !r || regRequired === null;
        const unresolved = isUnresolved ? {
          status: "unresolved" as const,
          authority_to_confirm: r?.authority_name || "the competent supervisory authority",
          reason: r
            ? `registration status for ${r?.jurisdiction_name || j.code} is not marked in the requirements registry`
            : `no requirements metadata row was found for ${j.code} in the registry available to this assessment`,
          next_step: `Confirm any general controller-registration, representative-appointment, or sector-authorisation obligations with ${r?.authority_name || "the competent supervisory authority"} before filing.`,
        } : null;
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
            definition_cite: isCalifornia ? "Cal. Civ. Code § 1798.99.80(c)" : null,
            met: isBroker,
            basis: dataBrokerBasis,
          },
          representative_required: obligations.includes("eu_representative")
            ? true
            : (obligations.includes("uk_representative") ? true : false),
          filing_fee_cents: (() => {
            // QB-P22 item 5a — resolve ICO tier deterministically from intake.
            const isIcoUk = j.code === "GB" || j.code === "UK" ||
              (r?.authority_name ?? "").toLowerCase().includes("ico") ||
              (r?.jurisdiction_name ?? "").toLowerCase().includes("united kingdom");
            if (!isIcoUk) return r?.filing_fee_cents ?? null;
            const tier = resolveIcoFeeTier(intake);
            return tier.fee_cents ?? r?.filing_fee_cents ?? null;
          })(),
          filing_currency: r?.filing_currency ?? null,
          renewal_period_months: r?.renewal_period_months ?? null,
          notes: (() => {
            const leadNote = "This jurisdiction serves as the organisation's lead supervisory authority under the GDPR one-stop-shop mechanism.";
            const baseNotes = r?.notes ?? null;
            const existing = wasLeadAuthority ? (baseNotes ? `${baseNotes} ${leadNote}` : leadNote) : baseNotes;
            // QB-P22 item 5a — replace generic ICO fee caveat with the resolved tier + basis;
            // keep a confirm note ONLY when the intake straddles a boundary.
            const isIcoUk = j.code === "GB" || j.code === "UK" ||
              (r?.authority_name ?? "").toLowerCase().includes("ico") ||
              (r?.jurisdiction_name ?? "").toLowerCase().includes("united kingdom");
            if (isIcoUk) {
              const tier = resolveIcoFeeTier(intake);
              const parts = [tier.narrative];
              if (tier.boundary) parts.push("Confirm the tier with the ICO fee self-assessment before filing (the intake sits near a tier boundary).");
              const icoNote = parts.join(" ");
              return existing ? `${existing} ${icoNote}` : icoNote;
            }
            return existing;
          })(),
          why: j.why,
          rule_id: j.rule_id,
          obligations,
          unresolved,
        };
      }),
    };

    // NO-INSTRUCTION-LEAKAGE: internal QA / grader-error bookkeeping never appears
    // in user-facing product output. Verified grader errors are recorded separately
    // in quality_loop2_notes (kind = 'grader_error_ledger'), not in result_summary.

    // PRODUCT-PROMPT-REG — MARKETS-SERVED COVERAGE. Every market the intake
    // records (organization_country + markets_served) MUST appear in the
    // output, either as a live-obligation entry (already produced above) or
    // as an explicit "no filing engaged because …" placeholder that names
    // the reason. Silent omission is a defect.
    try {
      const emittedCodes = new Set(result_summary.jurisdictions.map((j: any) => j.code));
      const intakeMarkets = new Set<string>([
        ...(intake.markets_served ?? []),
        ...(intake.organization_country ? [intake.organization_country] : []),
      ]);
      // GB collapses into UK per R4 dedup; treat as covered when UK is emitted.
      if (emittedCodes.has("UK")) emittedCodes.add("GB");
      const euEea = new Set([
        "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
        "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","NO","IS","LI",
      ]);
      const missing = [...intakeMarkets].filter((c) => c && !emittedCodes.has(c));
      const ossCoveredCodes: string[] = [];
      const ossCoveredNames: string[] = [];
      if (missing.length > 0) {
        const missingReqs = await supabase
          .from("jurisdiction_requirements")
          .select("*")
          .in("jurisdiction_code", missing);
        const missingReqByCode = new Map((missingReqs.data || []).map((r: any) => [r.jurisdiction_code, r]));
        for (const code of missing) {
          const r = missingReqByCode.get(code) as any;
          const isEu = euEea.has(code);
          const ossActive = isEu && intake.has_eu_establishment === true;
          // QB-P22 item 5b — for OSS-covered markets, per-entry text is only
          // the market-specific local-only status; the shared OSS mechanism
          // paragraph is emitted ONCE in result_summary.oss_group below.
          const reason = ossActive
            ? `${r?.jurisdiction_name || code}: no local-only filings identified on the current record. See the OSS mechanism block for the cross-border complaint routing that applies to this market.`
            : (r?.registration_required === false
                ? `${r?.jurisdiction_name || code} does not operate a general controller-registration scheme (${r?.law_name || "governing law"}); no filing under a general registry is engaged for this market. Sector-specific authorisations, if any, are outside the scope of a general registration filing.`
                : `The intake records this market but no registration obligation was identified for ${r?.jurisdiction_name || code} on the current record. Confirm any local filing, representative-appointment, or sector-authorisation requirements with ${r?.authority_name || "the competent supervisory authority"} before concluding no filing is due.`);
          if (ossActive) {
            ossCoveredCodes.push(code);
            ossCoveredNames.push(r?.jurisdiction_name || code);
          }
          result_summary.jurisdictions.push({
            code,
            name: r?.jurisdiction_name || code,
            region: r?.region || null,
            law: r?.law_name || null,
            authority: r?.authority_name || null,
            authority_url: r?.authority_url || null,
            registration_required: r?.registration_required ?? null,
            registration_required_basis: reason,
            dpo_required: engineOutput.obligations_summary.dpo_required,
            ai_registration_required: false,
            ai_registration_required_basis: reason,
            data_broker_evaluation: { definition_cite: null, met: false, basis: reason },
            representative_required: false,
            filing_fee_cents: r?.filing_fee_cents ?? null,
            filing_currency: r?.filing_currency ?? null,
            renewal_period_months: r?.renewal_period_months ?? null,
            notes: reason,
            why: reason,
            rule_id: ossActive ? "R11_MARKET_COVERAGE_OSS" : "R11_MARKET_COVERAGE",
            obligations: [],
            // QB-P24 Item 2 — additive `unresolved` block on placeholder entries
            // when the registry does not affirm a filing obligation. Existing
            // keys unchanged.
            unresolved: (r?.registration_required === true) ? null : {
              status: "unresolved" as const,
              authority_to_confirm: r?.authority_name || "the competent supervisory authority",
              reason: ossActive
                ? "local-only filing status not affirmed on the current record; OSS covers cross-border complaints"
                : (r ? "no registration obligation was identified from the requirements registry for this market" : "no requirements registry row was found for this market"),
              next_step: `Confirm any local filing, representative-appointment, or sector-authorisation requirements with ${r?.authority_name || "the competent supervisory authority"} before concluding no filing is due.`,
            },
          } as any);
        }
      }
      // QB-P22 item 5b — single shared OSS mechanism block listing all covered markets.
      if (ossCoveredCodes.length > 0) {
        (result_summary as any).oss_group = {
          mechanism: "GDPR one-stop-shop (Art. 56 GDPR)",
          covered_markets: ossCoveredCodes,
          covered_market_names: ossCoveredNames,
          narrative: `The following markets are covered by the GDPR one-stop-shop mechanism (Art. 56 GDPR): ${ossCoveredNames.join(", ")}. Cross-border processing complaints for these markets are directed to the lead supervisory authority identified above. Local-only filings that survive OSS (e.g. member-state DPO thresholds, sector authorisations, biometric registrations) are surfaced under each specific jurisdiction entry.`,
        };
      }
    } catch (e) {
      console.warn("[run-registration-assessment] market-coverage fill skipped:", (e as Error)?.message);
    }

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
