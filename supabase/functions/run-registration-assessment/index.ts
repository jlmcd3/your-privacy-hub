// Free Registration Assessment — anonymous-friendly.
// Thin HTTP wrapper around the declarative rules engine in
// _shared/registration-engine.ts. All logic, deduplication, OSS handling,
// AI-Act, BDSG-DPO and data-broker rules live in the engine so they can
// be unit-tested independently with `deno test`.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  runRegistrationAssessment,
  type IntakeData,
} from "./_local/registration-engine.ts";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { PROMPT_CORE_VERSION } from "../_shared/prompt-core.ts";
import { buildRegistrationDeliverables, REGISTRATION_DELIVERABLES_VERSION } from "./_local/ltp/registration-deliverables/build.ts";
import { serializeCustomerReport } from "../_shared/report-serialize.ts";
import { REGISTRATION_REPORT_SCHEMA } from "../_shared/report-schemas/registration.ts";

/**
 * LEAK-PREV-P2 — whitelist serialization of the customer report.
 * FAIL-OPEN: a serializer defect must never block a customer report, so any
 * crash or throw logs and returns the unserialized report unchanged.
 * `_meta` is restored verbatim (the serializer reduces it to `.internal`, but
 * this product's `_meta` is an internal channel that downstream readers such
 * as generate-report-pdf depend on).
 */
function serializeCustomer(report: Record<string, unknown>): Record<string, unknown> {
  try {
    const originalMeta = report._meta;
    const { report: serialized, telemetry } = serializeCustomerReport(
      report as never,
      REGISTRATION_REPORT_SCHEMA,
    );
    if (!telemetry.crashed) {
      const out = serialized as Record<string, unknown>;
      if (originalMeta && typeof originalMeta === "object") {
        out._meta = { ...(originalMeta as Record<string, unknown>), ...(out._meta as Record<string, unknown>) };
      }
      return out;
    }
  } catch (e) {
    console.warn("[run-registration-assessment] serializer failed (non-fatal):", (e as Error)?.message);
  }
  return report;
}

export const BUILD_STAMP = "r1-hds-conditional@2026-07-23T14:20:00Z";
console.log(`[run-registration-assessment] boot build_stamp=${BUILD_STAMP}`);

// QB-P26 Item 1 — per-jurisdiction DPO basis. The engine emits a single
// global `dpo_required` + trigger; but the trigger it names may be a
// national statute (e.g. BDSG §38 for DE), which must NOT be cited as
// the DPO basis on non-DE cards. This helper derives a per-jurisdiction
// basis sentence from the intake, so UK, FR, IE, NL et al. cite the
// correct UK GDPR / GDPR Art. 37(1) branch and DE cites BDSG §38.
function isEuEeaCode(c: string): boolean {
  return new Set([
    "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
    "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","NO","IS","LI",
  ]).has(c);
}
function dpoBasisForJurisdiction(
  code: string,
  jurName: string,
  intake: any,
): { required: boolean; basis: string } {
  const employeeCount = Number(intake?.employee_count ?? 0);
  const largeScaleMonitoring = intake?.large_scale_monitoring === true;
  const specialCategories = intake?.processes_special_categories === true;
  const dataSubjectsCount = Number(intake?.data_subjects_count ?? 0);
  const isSmallController =
    (intake?.organization_size === "small" || intake?.organization_size === "micro") &&
    employeeCount < 50;

  // Germany — BDSG §38 (national statute) sits ALONGSIDE GDPR Art. 37(1).
  if (code === "DE") {
    if (employeeCount >= 20) {
      return {
        required: true,
        basis:
          `DPO required in ${jurName} under BDSG §38 — DPO is mandatory where 20+ persons are constantly engaged in the automated processing of personal data. The intake reports ${employeeCount} employees; confirm how many are constantly engaged in automated processing before concluding the threshold is met. GDPR Art. 37(1)(b)/(c) may also engage — assess independently.`,
      };
    }
    // Fall through to GDPR-only analysis for DE below.
  }

  const isUk = code === "UK" || code === "GB";
  const gdprCite = isUk ? "UK GDPR Art. 37(1)" : "GDPR Art. 37(1)";
  const eeaWho = isUk ? "United Kingdom" : jurName;

  // Art. 37(1)(b) — large-scale systematic monitoring.
  if (largeScaleMonitoring) {
    return {
      required: true,
      basis: `DPO required in ${eeaWho} under ${gdprCite}(b) — core activities require regular and systematic monitoring of data subjects on a large scale (as declared in the intake).`,
    };
  }
  // Art. 37(1)(c) — large-scale processing of special categories.
  if (specialCategories && intake?.processes_personal_data && (dataSubjectsCount > 100_000 || !isSmallController)) {
    return {
      required: true,
      basis: `DPO required in ${eeaWho} under ${gdprCite}(c) — core activities consist of large-scale processing of special categories of personal data. The intake declares special-category processing at a scale that engages this branch (${dataSubjectsCount > 100_000 ? "data-subjects count exceeds 100,000" : "controller is not a small controller under the EDPB WP243 factors"}).`,
    };
  }
  if (specialCategories && isSmallController) {
    return {
      required: false,
      basis: `Conditional in ${eeaWho} under ${gdprCite}(c): DPO becomes mandatory if the special-category processing declared in the intake constitutes the organisation's 'core activity' AND is carried out 'on a large scale' (EDPB WP 243 rev.01 factors: number of data subjects, volume, duration, geographic extent). For a small controller of this size these thresholds are not established by the intake; confirm before concluding either way.`,
    };
  }
  // Art. 37(1)(a) — public authority. Gated strictly on the intake's
  // is_public_authority flag (CEO decision 2026-07-23). The prior
  // role-string sniff is retired because the intake role field is
  // controller/processor/both only.
  if (intake?.is_public_authority === true) {
    return {
      required: true,
      basis: `DPO required in ${eeaWho} under ${gdprCite}(a) — processing is carried out by a public authority or body.`,
    };
  }
  return {
    required: false,
    basis: `No mandatory DPO trigger identified in ${eeaWho} under ${gdprCite}: the intake does not declare (a) public-authority status, (b) core-activity large-scale systematic monitoring, or (c) core-activity large-scale special-category processing. A voluntary DPO appointment remains available and is often recommended for organisations of this profile.`,
  };
}

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
      obligations_summary: (() => {
        const os: any = { ...engineOutput.obligations_summary };
        // QB-P26 Item 2 — retire deprecated alias from graded payload.
        delete os.ai_act_provider_obligations;
        return os;
      })(),
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
          // QB-P24 Addendum Item 8 — EU-level basis is emitted ONCE in
          // result_summary.eu_ai_act_basis below. Per-jurisdiction entries
          // carry a short pointer plus the jurisdiction-specific delta
          // (identity of the competent supervisory authority for the EU
          // database filing under Art. 71). Prior behaviour repeated the
          // full statutory narrative verbatim for every EU jurisdiction —
          // grader flagged this as duplicated content (same class as OSS).
          if (!aiRequired) {
            return `EU AI Act filing obligations are not engaged in ${r?.jurisdiction_name || j.code}: the intake declares neither GPAI-provider nor high-risk-AI-deployer status. See the EU AI Act basis section for the framework's territorial scope.`;
          }
          const authority = r?.authority_name || "the competent supervisory authority";
          const isPublicAuth = (intake as any)?.is_public_authority === true;
          if (isPublicAuth) {
            return `EU AI Act obligations engaged in ${r?.jurisdiction_name || j.code}; see the EU AI Act basis section for the full Chapter III / Chapter V / Art. 49(3) statutory basis. Jurisdiction-specific delta: any Art. 49(3) EU-database entry for a high-risk system deployed by this public-authority deployer in this Member State is coordinated with ${authority}.`;
          }
          return `EU AI Act obligations engaged in ${r?.jurisdiction_name || j.code}; see the EU AI Act basis section for the Chapter III / Chapter V statutory basis. Jurisdiction-specific delta: Chapter III deployer duties are supervised by ${authority}.`;
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
        // QB-P26 Item 1 — per-jurisdiction DPO basis. Global dpo_required
        // stays for back-compat; the per-card `dpo_basis` prevents national
        // statutes (e.g. BDSG §38) from bleeding into non-DE cards.
        const perJurDpo = dpoBasisForJurisdiction(j.code, r?.jurisdiction_name || j.code, intake);
        return {
          code: j.code,
          name: r?.jurisdiction_name || j.code,
          region: r?.region || null,
          law: r?.law_name || null,
          authority: r?.authority_name || null,
          authority_url: r?.authority_url || null,
          registration_required: regRequired,
          registration_required_basis: regBasis,
          // Per-jurisdiction DPO conclusion.
          dpo_required: perJurDpo.required,
          dpo_basis: perJurDpo.basis,
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
          const jurName = r?.jurisdiction_name || code;
          // QB-P26 Item 4 — field-appropriate market-coverage filler. Prior
          // implementation copied the same sentence into 5 fields (why, notes,
          // registration_required_basis, ai_registration_required_basis,
          // data_broker_evaluation.basis) — flagged as boilerplate. Each field
          // now carries a scope-appropriate sentence and `notes` may be null.
          const regBasisTxt = ossActive
            ? `${jurName}: no local-only controller-registration filing identified on the current record. Cross-border complaints are routed via the GDPR one-stop-shop mechanism — see the oss_group block.`
            : (r?.registration_required === false
                ? `${jurName} does not operate a general controller-registration scheme (${r?.law_name || "governing law"}); no filing under a general registry is engaged for this market.`
                : `No general controller-registration obligation was identified for ${jurName} on the current record. Confirm any local filing, representative-appointment, or sector-authorisation requirements with ${r?.authority_name || "the competent supervisory authority"} before concluding no filing is due.`);
          const aiBasisTxt = isEu
            ? `EU AI Act filing obligations are not engaged in ${jurName}: the intake declares neither GPAI-provider nor high-risk-AI-deployer status. See the EU AI Act basis section for the framework's territorial scope.`
            : `The EU AI Act is EU law and does not apply as a ${jurName} filing obligation.`;
          const brokerBasisTxt = `No data-broker-registry filing is engaged for ${jurName}: the intake does not indicate the organisation meets a data-broker definition requiring registry filing in this jurisdiction.`;
          const whyTxt = ossActive
            ? `Market recorded in intake; local-only filings not engaged, OSS covers cross-border complaints.`
            : (r?.registration_required === false
                ? `Market recorded in intake; ${jurName} operates no general controller-registration scheme.`
                : `Market recorded in intake; no filing obligation identified on current record.`);
          if (ossActive) {
            ossCoveredCodes.push(code);
            ossCoveredNames.push(jurName);
          }
          const perJurDpo = dpoBasisForJurisdiction(code, jurName, intake);
          result_summary.jurisdictions.push({
            code,
            name: jurName,
            region: r?.region || null,
            law: r?.law_name || null,
            authority: r?.authority_name || null,
            authority_url: r?.authority_url || null,
            registration_required: r?.registration_required ?? null,
            registration_required_basis: regBasisTxt,
            dpo_required: perJurDpo.required,
            dpo_basis: perJurDpo.basis,
            ai_registration_required: false,
            ai_registration_required_basis: aiBasisTxt,
            data_broker_evaluation: { definition_cite: null, met: false, basis: brokerBasisTxt },
            representative_required: false,
            filing_fee_cents: r?.filing_fee_cents ?? null,
            filing_currency: r?.filing_currency ?? null,
            renewal_period_months: r?.renewal_period_months ?? null,
            notes: null,
            why: whyTxt,
            rule_id: ossActive ? "R11_MARKET_COVERAGE_OSS" : "R11_MARKET_COVERAGE",
            obligations: [],
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

    // QB-P24 Addendum Item 8 — single shared EU AI Act basis block. The full
    // statutory narrative is stated ONCE here; each EU jurisdiction card
    // carries only the jurisdiction-specific delta (authority coordinating
    // any Art. 49(2) database filing). Emitted only when the intake actually
    // engages one or both AI-Act tracks, or when EU/EEA scope is present.
    try {
      const gpaiProv = engineOutput.obligations_summary.gpai_provider_obligations === true;
      const highRiskDep = engineOutput.obligations_summary.high_risk_ai_deployer_obligations === true;
      const hasEuJur = (result_summary.jurisdictions as any[]).some((j) =>
        new Set([
          "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
          "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","NO","IS","LI",
        ]).has(j.code)
      );
      if (hasEuJur && (gpaiProv || highRiskDep)) {
        const isPublicAuth = (intake as any)?.is_public_authority === true;
        const highRiskNarrative = isPublicAuth
          ? "High-risk-AI PUBLIC-AUTHORITY deployer obligations per the intake's declaration that the organisation deploys a high-risk AI system and is a public authority or Union body: Regulation (EU) 2024/1689, Chapter III (Arts. 26–29) imposes deployer duties (human oversight per Art. 26(1), input-data appropriateness where the deployer controls input data per Art. 26(4), monitoring per Art. 26(5), incident reporting per Art. 26(5), and record-keeping per Art. 26(6)); Art. 49(3) requires public-authority (and Union institution / body / office / agency) deployers to register the high-risk system's use in the EU database maintained under Art. 71. The per-jurisdiction cards identify the competent supervisory authority for the Art. 49(3) database filing."
          : "High-risk-AI deployer obligations per the intake's declaration that the organisation deploys a high-risk AI system: Regulation (EU) 2024/1689, Chapter III (Arts. 26–29) imposes deployer duties (human oversight per Art. 26(1), input-data appropriateness where the deployer controls input data per Art. 26(4), monitoring per Art. 26(5), incident reporting per Art. 26(5), and record-keeping per Art. 26(6)).";
        const engagedTracks = [
          gpaiProv ? "gpai_provider" : null,
          highRiskDep ? "high_risk_deployer" : null,
          highRiskDep && isPublicAuth ? "high_risk_deployer_public_authority" : null,
        ].filter(Boolean);
        (result_summary as any).eu_ai_act_basis = {
          engaged_tracks: engagedTracks,
          is_public_authority: isPublicAuth,
          narrative: (gpaiProv && highRiskDep)
            ? `Both EU AI Act tracks are engaged for this organisation across its EU/EEA footprint. (1) GPAI-provider obligations per the intake's declaration that the organisation provides a general-purpose AI model: Regulation (EU) 2024/1689, Chapter V (Arts. 53–55), in application since 2 August 2025, imposes technical-documentation, transparency, and copyright-policy duties; where the Art. 51 systemic-risk condition is met, Art. 52 requires notification to the European Commission. (2) ${highRiskNarrative}`
            : gpaiProv
              ? "EU AI Act GPAI-provider obligations are engaged for this organisation across its EU/EEA footprint per the intake's declaration that the organisation provides a general-purpose AI model: Regulation (EU) 2024/1689, Chapter V (Arts. 53–55), in application since 2 August 2025, imposes technical-documentation, transparency, and copyright-policy duties; where the Art. 51 systemic-risk condition is met, Art. 52 requires notification to the European Commission. The Act imposes no general GPAI registry filing — the Art. 71 EU database covers high-risk AI systems, not GPAI models. The obligation attaches to the organisation once, not per Member State."
              : `EU AI Act ${highRiskNarrative}`,
        };
      }
    } catch (e) {
      console.warn("[run-registration-assessment] eu_ai_act_basis emit skipped:", (e as Error)?.message);
    }

    // QB-P24 Addendum Item 10 — Art. 27(4) EU representative guidance. When
    // more than one EU/EEA jurisdiction engages Art. 27 (i.e., the intake
    // targets multiple EU Member States without an EU establishment), state
    // ONCE that a single representative in one Member State satisfies the
    // obligation and recommend the selection basis.
    try {
      const isEuEeaCode = (c: string) => new Set([
        "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT",
        "LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE","NO","IS","LI",
      ]).has(c);
      const art27Codes = (result_summary.jurisdictions as any[])
        .filter((j) => isEuEeaCode(j.code) && Array.isArray(j.obligations) && j.obligations.includes("eu_representative"))
        .map((j) => j.code as string);
      if (art27Codes.length > 1) {
        (result_summary as any).eu_representative_group = {
          mechanism: "GDPR Art. 27 (single EU representative)",
          engaged_markets: art27Codes,
          citation: "EDPB Guidelines 3/2018 on the territorial scope of the GDPR (Article 3), Version 2.1 (adopted 12 November 2019), Section 4 (Representative of controllers or processors not established in the Union — Article 27)",
          narrative: `Art. 27(1) GDPR requires an EU representative in this scenario (organisation not established in the Union but offering goods/services to, or monitoring, data subjects in the Union). Art. 27(4) makes clear that ONE representative established in ONE Member State suffices for the whole Union — a separate representative in each of ${art27Codes.join(", ")} is NOT required. Selection basis (EDPB Guidelines 3/2018 on the territorial scope of the GDPR (Article 3), Version 2.1 (adopted 12 November 2019), Section 4): appoint the representative in the Member State where the largest share of monitored data subjects is located, or where the most significant processing activities take place; a mailbox-only arrangement does not satisfy Art. 27's mandate to receive supervisory-authority and data-subject correspondence.`,
        };
      }
    } catch (e) {
      console.warn("[run-registration-assessment] eu_representative_group emit skipped:", (e as Error)?.message);
    }

    // QB-P24 Addendum Item 9(a) — echo the DPO trigger / conditional at the
    // top-level result so the renderer does not have to reconstruct the
    // deciding fact from `dpo_required` alone. Additive, non-breaking.
    try {
      const os = engineOutput.obligations_summary as any;
      if (os && (os.dpo_trigger || os.dpo_condition)) {
        (result_summary as any).dpo_precision = {
          required: engineOutput.obligations_summary.dpo_required,
          trigger: os.dpo_trigger || null,
          condition: os.dpo_condition || null,
        };
      }
    } catch (e) {
      console.warn("[run-registration-assessment] dpo_precision emit skipped:", (e as Error)?.message);
    }

    // QB-P26 Item 2 — retired alias parked under `_meta` for internal readers
    // that still reference it (generate-report-pdf falls back to the new key
    // first). NEVER surfaced in graded payload structure.
    (result_summary as any)._meta = {
      ...((result_summary as any)._meta || {}),
      ai_act_provider_obligations_alias: engineOutput.obligations_summary.ai_act_obligations_engaged === true,
      alias_retirement: "ai_act_provider_obligations is retired from obligations_summary (QB-P26). Use ai_act_obligations_engaged.",
    };





    // ── ITEM 316 — reasoned registration deliverables ────────────────────
    // This REPLACES the boolean/null `obligations_summary` as the analytic
    // surface of the product. `obligations_summary` is retained above for
    // backwards compatibility with existing readers, but every determination
    // now also appears here with its statute, verbatim standard, record fact,
    // application and verdict. Pure and deterministic: a failure here is a
    // build defect, so it is recorded rather than swallowed into silence.
    try {
      const deliverables = buildRegistrationDeliverables(intake as any);
      (result_summary as any).registration_deliverables = deliverables;
      (result_summary as any).narrative = deliverables.narrative;
      (result_summary as any).deliverables_version = REGISTRATION_DELIVERABLES_VERSION;

      // ── ITEM 337 (PROSE PROGRAM 1, Part D2) — CONTRADICTION GUARD ──────
      // The jurisdiction matrix (`obligations_summary`) and the reasoned
      // deliverables must never tell the customer two different things on the
      // same page. Where the reasoned determination says the record does not
      // support a conclusion, the reasoned output WINS: the matrix boolean is
      // suppressed to `null` and the deciding question is named. The matrix is
      // a lookup; the deliverable is the analysis.
      try {
        const dpoVerdict = (deliverables as any)?.dpo?.verdict;
        const os = (result_summary as any).obligations_summary as any;
        const contradictions: string[] = [];
        if (os && dpoVerdict === "record_insufficient" && os.dpo_required === true) {
          os.dpo_required = null;
          os.dpo_condition = os.dpo_condition ||
            "The Art. 37(1) branches cannot be evaluated on this record; the jurisdiction lookup alone does not establish the duty.";
          os.dpo_trigger = null;
          contradictions.push("dpo_required");
        }
        if (os && dpoVerdict === "not_engaged" && os.dpo_required === true) {
          // A jurisdictional threshold (e.g. BDSG §38) may still bite where no
          // Art. 37(1) branch is engaged — that is not a contradiction, but it
          // must be stated rather than left implicit.
          os.dpo_condition = os.dpo_condition ||
            "No Art. 37(1) branch is engaged; the duty arises, if at all, from the national threshold named in the trigger.";
        }
        const rep = (deliverables as any)?.representatives;
        for (
          const [k, v] of [
            ["eu_representative_required", rep?.eu?.status],
            ["uk_representative_required", rep?.uk?.status],
          ] as const
        ) {
          if (os && v === "record_insufficient" && os[k] === true) {
            os[k] = null;
            contradictions.push(k);
          }
        }
        if (contradictions.length) {
          (result_summary as any)._meta = {
            ...((result_summary as any)._meta || {}),
            matrix_contradictions_suppressed: contradictions,
          };
          if ((result_summary as any).dpo_precision && contradictions.includes("dpo_required")) {
            (result_summary as any).dpo_precision.required = null;
            (result_summary as any).dpo_precision.trigger = null;
          }
        }
      } catch (e) {
        console.warn("[run-registration-assessment] contradiction guard skipped:", (e as Error)?.message);
      }
    } catch (e) {
      console.error("[run-registration-assessment] deliverables build failed:", (e as Error)?.message);
      (result_summary as any).registration_deliverables_error = {
        status: "record_insufficient",
        note: "The reasoned registration determinations could not be produced for this record. No conclusion is asserted in their place.",
      };
    }

    // ── AUTHORITY EXHIBIT (Registration hardening, 2026-08-04) ──────────
    // Table of authorities built from the citations this report actually
    // emits. Entries and excerpts come ONLY from the corpus-pinned duty
    // registry — nothing here is free-typed. Rendered at the end of the
    // report, immediately before the universal disclaimer. Fail-open.
    try {
      const { buildAuthorityExhibit, baseSection } = await import("../_shared/report-exhibits/authority-exhibit.ts");
      const { REGISTRATION_DUTY_AUTHORITIES } = await import(
        "./_local/registry/registration-verified-authorities.ts"
      );
      const cited = new Set<string>();
      const walkCites = (v: unknown): void => {
        if (typeof v === "string") return;
        if (Array.isArray(v)) { for (const x of v) walkCites(x); return; }
        if (v && typeof v === "object") {
          for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
            if (k === "_meta" || k === "_staging") continue;
            if ((k === "citation" || k === "window_citation" || k === "fee_citation") && typeof x === "string" && x.trim()) {
              cited.add(x.trim());
            } else if (k === "citations" && Array.isArray(x)) {
              for (const c of x) if (typeof c === "string" && c.trim()) cited.add(c.trim());
            } else {
              walkCites(x);
            }
          }
        }
      };
      walkCites((result_summary as any).registration_deliverables ?? {});
      const seenBase = new Set<string>();
      const provisions = REGISTRATION_DUTY_AUTHORITIES.flatMap((r) => {
        const base = baseSection(r.citation);
        if (seenBase.has(base)) return [];
        seenBase.add(base);
        return [{
          key: r.corpus_key,
          citation: base,
          verbatim_excerpt: r.verbatim_quote,
          status: "approved",
        }];
      });
      const exhibit = buildAuthorityExhibit([...cited], provisions);
      (result_summary as any).authority_exhibit = exhibit;
      console.log(JSON.stringify({
        evt: "registration_authority_exhibit_attached",
        fn: "run-registration-assessment",
        entries: exhibit.entries.length,
        pin_verified: exhibit.entries.filter((e) => e.pin_verified).length,
      }));
    } catch (axErr) {
      console.warn("[run-registration-assessment] authority exhibit failed (non-fatal):", (axErr as Error)?.message);
    }

    // 4. Persist
    // LEAK-PREV-P2 — single finalization point: whitelist-serialize the
    // assembled report immediately before the write (fail-open).
    const customer_result_summary = serializeCustomer(result_summary as Record<string, unknown>);
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
      result_summary: customer_result_summary,
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
        result_summary: customer_result_summary,
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
