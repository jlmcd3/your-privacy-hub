// CPPA Risk Assessment — v4 (CR-2, June 2026)
// Five-stage intake + corpus-grounded generation. See
// EUP_CPPA_Risk_Assessment_Redesign.md (CR-2) for the spec.
//
// Pipeline:
//   1. Normalise intake (shim legacy flat payloads -> minimal five-stage).
//   2. Pre-generation validation (skipped/relaxed for legacy-shimmed payloads).
//   3. Parallel corpus retrieval: get-enforcement-context +
//      generate-longitudinal-synthesis.
//   4. Single generation call using the new § 7150–7157 system prompt.
//   5. Persist new-schema JSON to cppa_assessments.report_data.
//
// NOTE: The frontend intake form (src/pages/CPPARiskAssessment.tsx) and the
// result-page renderer still consume the legacy q*/i* schema. The shim keeps
// existing drafts running; the result page will need a separate redesign
// (tracked as a follow-up) before it can render the new output structure.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import { buildSystemContent, type SystemBlock, type ToolModule } from "../_shared/prompt-core.ts";
import { BANNED_PHRASES } from "../_shared/citation-verifier.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";
// [REVISED] authoritative § 7150(b) section strings — single source of truth
import { CITATION_REGISTRY } from "../_shared/admt-citation-registry.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ---------------------------------------------------------------------------
// Shim: legacy flat (q1..q20, i1..i9) intake -> minimal five-stage structure.
// ---------------------------------------------------------------------------
type FiveStageIntake = {
  triggers: Record<string, boolean>;
  exceptions: Record<string, { claimed: boolean; scope: string; safeguards: string; documented: boolean }>;
  activity_details: any[];
  impact: Record<string, any>;
  org_context: Record<string, any>;
  annual_consumer_volume?: string;
  content_detail?: Record<string, any>;
};

const EMPTY_TRIGGERS = {
  sells_or_shares_pi: false,
  targeted_advertising: false,
  profiling_significant_effects: false,
  sensitive_pi_beyond_enumerated: false,
  high_volume_processing: false,
  admt_involved: false,
};

const EMPTY_EXCEPTIONS = {
  fraud_detection: { claimed: false, scope: "", safeguards: "", documented: false },
  security_integrity: { claimed: false, scope: "", safeguards: "", documented: false },
  debugging: { claimed: false, scope: "", safeguards: "", documented: false },
  transient_use: { claimed: false, scope: "", safeguards: "", documented: false },
  internal_research: { claimed: false, scope: "", safeguards: "", documented: false },
  employment_context: { claimed: false, scope: "", safeguards: "", documented: false },
  legal_compliance: { claimed: false, scope: "", safeguards: "", documented: false },
  consumer_request: { claimed: false, scope: "", safeguards: "", documented: false },
};

function shimLegacyIntake(intake: any): FiveStageIntake {
  console.warn(
    "[cppa-risk] legacy flat intake detected (intake.triggers undefined). " +
      "Shimming to minimal five-stage structure. Frontend should be migrated to the five-stage wizard.",
  );

  // Heuristic trigger mapping from legacy fields.
  const triggers = { ...EMPTY_TRIGGERS };
  const sells = typeof intake.q5_sell_share === "string"
    && /sell|share|both|^yes/i.test(intake.q5_sell_share)
    && !/^no/i.test(intake.q5_sell_share);
  if (sells) triggers.sells_or_shares_pi = true;
  if (intake.q15_sensitive_pi === "Yes") triggers.sensitive_pi_beyond_enumerated = true;
  // Precise geolocation is sensitive PI under § 1798.140(ae)(1).
  const piCatsForTrig = Array.isArray(intake.q4_pi_categories) ? intake.q4_pi_categories : [];
  if (piCatsForTrig.some((c: string) => /precise geolocation/i.test(String(c)))) triggers.sensitive_pi_beyond_enumerated = true;
  // Under-16 actual knowledge elevates to sensitive PI (§ 7001(bbb)).
  if (typeof intake.q15b_under16_knowledge === "string" && /^yes/i.test(intake.q15b_under16_knowledge)) triggers.sensitive_pi_beyond_enumerated = true;
  // Profiling via systematic observation / sensitive location (§ 7150(b)(4)).
  if (typeof intake.q5b_profiling_observation === "string" && /yes|both/i.test(intake.q5b_profiling_observation)) triggers.profiling_significant_effects = true;
  if (intake.q18_admt_use === "Yes" || intake.q18_admt_use === "In evaluation") triggers.admt_involved = true;
  // Training ADMT / facial / emotion / biometric (§ 7150(b)(6)).
  if (typeof intake.q18b_admt_training === "string" && /^yes/i.test(intake.q18b_admt_training)) triggers.admt_involved = true;
  // NOTE: high consumer volume is NOT a § 7150(b) Risk-Assessment trigger.
  // It is a § 7120 cyber-audit trigger — handled by the CPPA Cybersecurity tool.
  // Do not auto-set any § 7150(b) trigger from volume alone.
  // If no § 7150(b) trigger matches, validation below will surface a clear error.

  const piCats = Array.isArray(intake.q4_pi_categories) ? intake.q4_pi_categories : [];
  const activity_details = [{
    trigger_key: Object.entries(triggers).find(([, v]) => v)?.[0] ?? "sells_or_shares_pi",
    data_categories: piCats,
    consumer_categories: [],
    purpose_description: String(intake.i1_processing_purpose ?? "Legacy intake — purpose not captured at this specificity."),
    business_benefits: String((intake.impact_intake?.businessBenefits ?? "").trim() || "Not provided."),
    consumer_benefits: String((intake.impact_intake?.consumerBenefits ?? "").trim() || "Not provided."),
    stakeholder_public_benefits: String((intake.impact_intake?.stakeholderBenefits ?? "").trim() || "Not provided."),
    current_safeguards: String((intake.impact_intake?.safeguards ?? "").trim() || "Not provided."),
    minimum_pi_necessary: String((intake.i1b_min_pi ?? "").trim() || "Not provided."),
    pi_sources: String((intake.i4b_sources ?? "").trim() || "Not provided."),
    known_gaps: "",
    third_party_recipients: String(intake.i6_vendors ?? ""),
    cross_context_tracking: !!triggers.sells_or_shares_pi,
    profiling_inferences: !!triggers.admt_involved,
    children_in_scope: false,
  }];

  const hasDpia = intake.i9_has_existing_dpia === "Yes" || intake.i9_has_existing_dpia === true;
  const im = (intake.impact_intake ?? {}) as Record<string, any>;
  const impact = {
    likelihood_of_harm: String(im.likelihood || "Possible"),
    severity_of_harm: String(im.severity || "Moderate"),
    harm_types: Array.isArray(im.harmTypes) ? im.harmTypes : [],
    vulnerable_populations_detail: String(im.vulnerable ?? ""),
    benefits_outweigh_risks: String(im.benefitsOutweigh || "Uncertain"),
    benefits_outweigh_risks_rationale: String(im.benefitsRationale || "[Not provided in intake]"),
    cybersecurity_gaps_identified: im.cyberGaps === "Yes",
    prior_assessments_conducted: hasDpia,
    prior_assessment_date: "",
  };

  const org_context = {
    company_name: String(intake.entity_name || "[FILL IN — business legal name]"),
    sector: String(intake.q3_sector ?? "Not specified"),
    annual_revenue_threshold: String(intake.q1_revenue ?? "Not specified"),
    privacy_counsel_engaged: false,
    dpo_or_privacy_officer: false,
    board_level_oversight: false,
    existing_privacy_programme: "Not specified",
    cppa_audit_notification_received: false,
    additional_context: "",
  };

  // Map the user's claimed § 7152 exceptions over the empty baseline.
  const exceptionsIntake = (intake.exceptions_intake ?? {}) as Record<string, any>;
  const exceptions = { ...EMPTY_EXCEPTIONS };
  for (const [key, v] of Object.entries(exceptionsIntake)) {
    if (v && v.claimed && key in exceptions) {
      (exceptions as Record<string, any>)[key] = {
        claimed: true,
        scope: String(v.scope ?? ""),
        safeguards: String(v.safeguards ?? ""),
        documented: Boolean(v.scope || v.safeguards),
      };
    }
  }

  // Recover the § 7152(a)(1)–(9) content the wizard collects but the v4 slots don't carry.
  const content_detail = {
    retention_period: String(intake.i2_retention_period ?? ""),
    retention_criteria: String(intake.i2_retention_criteria ?? ""),
    retention_detail: String(intake.i2_retention_detail ?? ""),
    consumer_disclosures: Array.isArray(intake.i4_disclosure_mechanisms)
      ? intake.i4_disclosure_mechanisms.join("; ")
      : String(intake.i4_disclosure_mechanisms ?? ""),
    admt_logic: String(intake.i5_admt_logic ?? ""),
    admt_training_source: String(intake.i5_admt_training_source ?? ""),
    admt_fairness_testing: String(intake.i5_admt_fairness_testing ?? ""),
    admt_human_review: String(intake.i5_admt_human_review ?? ""),
    admt_description: String(intake.q19_admt_description ?? ""),
    admt_opt_out: String(intake.q20_admt_opt_out ?? ""),
    internal_contributors: String(intake.i7_internal_contributors ?? ""),
    external_consultees: String(intake.i7_external_consultees ?? ""),
    certifying_exec_name: String(intake.i8_certifying_exec_name ?? ""),
    certifying_exec_title: String(intake.i8_certifying_exec_title ?? ""),
    certifying_contact_email: String(intake.i8_contact_email ?? ""),
    certifying_contact_phone: String(intake.i8_contact_phone ?? ""),
    existing_dpia: hasDpia ? String(intake.i9_existing_dpia_summary ?? "Yes — summary not provided") : "No",
    sensitive_pi_limit_offered: String(intake.q16_sensitive_limit ?? ""),
    sensitive_pi_basis: String(intake.q17_sensitive_basis ?? ""),
    opt_out_link: String(intake.q9_opt_out ?? ""),
    notice_at_collection: String(intake.q12_notice_at_collection ?? ""),
    minimum_pi_necessary: String(intake.i1b_min_pi ?? ""),
    pi_sources: String(intake.i4b_sources ?? ""),
    under16_actual_knowledge: String(intake.q15b_under16_knowledge ?? ""),
    profiling_observation_trigger: String(intake.q5b_profiling_observation ?? ""),
    admt_training_trigger: String(intake.q18b_admt_training ?? ""),
    business_benefits: String(intake.impact_intake?.businessBenefits ?? ""),
    consumer_benefits: String(intake.impact_intake?.consumerBenefits ?? ""),
    stakeholder_public_benefits: String(intake.impact_intake?.stakeholderBenefits ?? ""),
    planned_safeguards: String(intake.impact_intake?.safeguards ?? ""),
    harm_sources_and_causes: String(intake.impact_intake?.harmCauses ?? ""),
  };

  return {
    triggers,
    exceptions,
    activity_details,
    impact,
    org_context,
    annual_consumer_volume: String(intake.q2_consumers ?? ""),
    content_detail,
  };
}

function normaliseIntake(intake: any): { intake: FiveStageIntake; wasLegacyShimmed: boolean } {
  if (intake?.triggers === undefined) {
    return { intake: shimLegacyIntake(intake ?? {}), wasLegacyShimmed: true };
  }
  // Ensure required substructures are present even on partially-populated new intakes.
  return {
    intake: {
      triggers: { ...EMPTY_TRIGGERS, ...(intake.triggers ?? {}) },
      exceptions: { ...EMPTY_EXCEPTIONS, ...(intake.exceptions ?? {}) },
      activity_details: Array.isArray(intake.activity_details) ? intake.activity_details : [],
      impact: intake.impact ?? {},
      org_context: intake.org_context ?? {},
      annual_consumer_volume: intake.annual_consumer_volume,
    },
    wasLegacyShimmed: false,
  };
}

// ---------------------------------------------------------------------------
// Validation (CR-2 Step 5). Relaxed when payload was shimmed from legacy.
// Returns { ok, error?, field? }.
// ---------------------------------------------------------------------------
function validateFiveStage(intake: FiveStageIntake, lenient: boolean): { ok: true } | { ok: false; message: string; field: string } {
  if (!Object.values(intake.triggers).some((v) => v === true)) {
    return {
      ok: false,
      message:
        "No § 7150(b) triggering activity is selected. The CPPA Risk Assessment is only required when one of the § 7150(b) triggers applies (sell/share, targeted advertising, profiling with significant effects, sensitive PI beyond enumerated, ADMT, or training ADMT). If your only trigger is high consumer volume, the applicable obligation is the § 7120 cybersecurity audit — please run the CPPA Cybersecurity tool instead.",
      field: "triggers",
    };
  }
  // Runs in BOTH modes: a blank/placeholder company name produced
  // "[FILL IN — business legal name]" in finished reports. Block it.
  const companyName = String(intake.org_context?.company_name ?? "");
  if (!companyName.trim() || companyName.includes("[FILL IN")) {
    return { ok: false, message: "The business legal name is missing. Please complete the entity name on Step 1 before generating.", field: "org_context.company_name" };
  }
  if (lenient) return { ok: true };

  const generic = ["to improve our service", "for business purposes", "to provide services", "general operations"];
  for (const a of intake.activity_details ?? []) {
    const p = String(a.purpose_description ?? "").toLowerCase();
    if (p.length < 50 || generic.some((g) => p.includes(g))) {
      return {
        ok: false,
        message: `Processing purpose for "${a.trigger_key}" is too generic. Describe the specific purpose as required by § 7152(a)(1).`,
        field: `activity_details.${a.trigger_key}.purpose_description`,
      };
    }
  }
  if (String(intake.impact?.benefits_outweigh_risks_rationale ?? "").length < 100) {
    return {
      ok: false,
      message: "The benefits-outweigh-risks rationale is too brief. § 7152(a)(4) (benefits) and the § 7154 balancing goal require a substantive analysis.",
      field: "impact.benefits_outweigh_risks_rationale",
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Corpus retrieval (CR-2 Step 1).
// ---------------------------------------------------------------------------
async function retrieveCorpusContext(intake: FiveStageIntake): Promise<{ enforcementContext: string; longitudinalSynthesis: string; statuteContext: string; fsorContext: string }> {
  const primaryActivity = Object.entries(intake.triggers)
    .filter(([, v]) => v === true)
    .map(([k]) => k.replace(/_/g, " "))
    .join(", ");
  const sector = intake.org_context?.sector ?? "general";
  const corpusQuery = `CPPA risk assessment ${sector} ${primaryActivity} California privacy enforcement`;

  const statuteTopics = ["risk-assessment", "thresholds"];
  if (intake.triggers.admt_involved) statuteTopics.push("admt", "significant-decision");
  if (intake.triggers.profiling_significant_effects) statuteTopics.push("profiling");

  const [enforcementRes, longitudinalRes, statuteRes] = await Promise.allSettled([
    supabase.functions.invoke("get-enforcement-context", {
      body: { query: corpusQuery, jurisdictions: ["California", "US-CA", "United States"], regime: "ccpa", limit: 8 },
    }),
    supabase.functions.invoke("generate-longitudinal-synthesis", {
      body: {
        topic: `CPPA enforcement patterns ${sector} sector risk assessment`,
        jurisdiction: "US-CA",
        regulation: "CPPA",
        focus_areas: [primaryActivity, "audit division enforcement priorities", "§ 7152 documentation requirements"],
      },
    }),
    supabase.functions.invoke("cppa-retrieve-context", {
      body: { topics: statuteTopics, query: `risk assessment ${primaryActivity}`, include_deadlines: false, full_text_limit: 10, limit: 16 },
    }),
  ]);

  const enforcementRows = enforcementRes.status === "fulfilled"
    ? (enforcementRes.value?.data?.results ?? [])
    : (console.warn("[cppa-risk] get-enforcement-context failed:", enforcementRes.reason), []);
  const enforcementContext = Array.isArray(enforcementRows) && enforcementRows.length
    ? enforcementRows.slice(0, 8).map((r: any) => {
        const fine = r.fine_amount ?? r.fine_eur_equivalent;
        const failure = r.key_compliance_failure ?? r.violation ?? "compliance failure not specified";
        return `• ${r.regulator ?? "Regulator"}${r.jurisdiction ? ` (${r.jurisdiction})` : ""}${r.subject ? ` — ${r.subject}` : ""}: ${failure}${fine ? ` [fine: ${fine}]` : ""}${r.decision_date ? ` (${r.decision_date})` : ""}${r.source_url ? ` ${r.source_url}` : ""}`;
      }).join("\n")
    : "";
  const longitudinalSynthesis = longitudinalRes.status === "fulfilled"
    ? (longitudinalRes.value?.data?.synthesis ?? "")
    : (console.warn("[cppa-risk] generate-longitudinal-synthesis failed:", longitudinalRes.reason), "");

  // Verbatim statutory text + plain summaries from the CPPA authorities corpus.
  const authorities: any[] = statuteRes.status === "fulfilled" ? (statuteRes.value?.data?.authorities ?? []) : [];
  if (statuteRes.status === "rejected") console.warn("[cppa-risk] cppa-retrieve-context failed:", statuteRes.reason);
  const statuteContext = authorities
    .map((a: any) => `${a.citation}${a.title ? ` — ${a.title}` : ""}\nPlain summary: ${a.plain_summary ?? ""}\nRegulation text: ${String(a.full_text ?? "").slice(0, 1200)}`)
    .join("\n\n");

  // Agency's own commentary (Final Statement of Reasons) for the retrieved citations.
  let fsorContext = "";
  try {
    const cites = authorities.map((a: any) => a.citation).filter(Boolean).slice(0, 20);
    if (cites.length) {
      const { data: fsorRows } = await supabase
        .from("cppa_fsor_commentary")
        .select("regulation_citation, agency_position_summary")
        .in("regulation_citation", cites)
        .not("agency_position_summary", "is", null)
        .limit(20);
      fsorContext = (fsorRows ?? [])
        .map((r: any) => `${r.regulation_citation}: ${r.agency_position_summary}`)
        .join("\n\n");
    }
  } catch (e) {
    console.warn("[cppa-risk] FSOR commentary fetch failed:", e);
  }

  return { enforcementContext, longitudinalSynthesis, statuteContext, fsorContext };
}

// ---------------------------------------------------------------------------
// Tool Module (CR-2 Step 2). Generic regulator-facing rules now live in the
// shared prompt core (_shared/prompt-core.ts); this module carries only what
// is specific to CPPA Risk Assessment.
// ---------------------------------------------------------------------------
export const CPPA_RISK_TOOL_MODULE: ToolModule = {
  identity:
    "You are a CPPA risk assessment specialist with deep expertise in Cal. Code Regs. tit. 11 §§ 7150–7157 and the California Privacy Rights Act. You produce a formal risk assessment that must meet the § 7152 content requirements and withstand scrutiny from the CPPA Audits Division (operational since February 2026; existing-activity compliance deadline December 31, 2027).",
  citationFramework:
    "Cite only Cal. Code Regs. tit. 11 (format \"§ 7150(b)(1)\") or Cal. Civ. Code § 1798 (format \"§ 1798.185\"). Never cite § 7221(c)(5) for any purpose. Exception citations are § 7152(a)(1)–(8) only — verify each exists in the provided regulation text before use. § 7150(b) trigger→subsection mappings are provided to you explicitly below and in the regulation text; use those exact subsections — never assign a § 7150(b) subsection from memory.",
  outputMode: "strict-JSON",
  languageVariant: "american",
  extraRules: [
    "§ 7152 MAPPING: every output section maps to a § 7152 required content element; generate nothing not required by statute.",
    "§ 7152(a)(4) BENEFITS-OUTWEIGH: ground the balancing in the specific benefits and harms in the intake; no generic balancing language.",
    "EXCEPTION ELEMENT-TEST: for each § 7152 exception claimed, test every element; conclude the exception is sustained only if all elements are documented, otherwise list the missing elements and set the status to insufficient basis.",
    "CYBERSECURITY-AUDIT LINKAGE: if the intake reveals cybersecurity gaps or revenue exceeds $100M, flag the cybersecurity-audit obligation as a prospective, staggered obligation tied to annual gross revenue: April 1, 2028 if 2026 revenue exceeded $100M; April 1, 2029 if 2027 revenue is $50M–$100M; April 1, 2030 if under $50M. Where the intake does not pin the revenue band, do NOT assert a single date as definitive — set `deadline` to the earliest band that could apply and use `deadline_basis` to spell out the conditional cohorts (e.g. \"April 1, 2028 if 2026 annual gross revenue > $100M; April 1, 2029 if 2027 revenue $50M–$100M\"). Where the intake does pin the band, use that band's single date.",
    "ADMT LINKAGE: if ADMT is involved in any triggered activity, flag the January 1, 2027 ADMT disclosure deadline under § 7221 and route the user to the ADMT Assessment tool (prospective).",
    "TRIGGER ROUTING: a sensitive-PI trigger applies only where a genuine § 7001(bbb) SPI element is present — income, debt-to-income, or credit history are not per se SPI.",
    "CONSUMER CATEGORIES: every `consumer_categories` value must be a human-readable label (e.g., \"California residents\", \"Employees\", \"Job applicants\", \"Minors under 16\", \"Website visitors\"). Never emit raw intake keys (no snake_case, no field IDs) and never leave the array empty — if unknown, use [\"Not specified in intake\"].",
    "PRIORITY ACTIONS: split severity from deadline. `severity` is one of Immediate | High | Medium | Low (operational urgency). `deadline` is an ISO-style date (YYYY-MM-DD) or a known statutory deadline (\"December 31, 2027\" for existing-activity § 7155(b); \"April 1, 2028\" for § 7121(a) cyber-audit certification (revenue >$100M in 2026 — confirm cohort per § 7121(a)'s staggered schedule before asserting a single date); \"January 1, 2027\" for § 7220 ADMT pre-use notice). `deadline_basis` cites the statutory or operational source for the date. Do not encode the deadline inside the severity enum.",
    "§ 1798.140(d)(1) THRESHOLDS: § 1798.140(d)(1) defines a covered \"business\" by THREE ALTERNATIVE thresholds — (A) annual gross revenue over $25M, (B) buying/selling/sharing PI of 100,000+ consumers or households, or (C) deriving 50%+ of annual revenue from selling or sharing PI. Subsection (C) is the selling/sharing-revenue prong — NEVER describe (C) as a general \"revenue floor\" or imply a dollar revenue range straddles (C). When discussing the § 7121(a) cyber-audit linkage, state all three thresholds and which the intake figures bear on; do not collapse them into a single revenue test.",
    "VOLUME IS NOT A § 7150(b) TRIGGER: high consumer volume alone does not trigger a § 7150(b) risk assessment (it is a § 7120 cyber-audit signal). If the intake or an activity asserts volume as the basis for the assessment, do NOT search for or speculate about which § 7150(b) subsection it maps to, and do NOT emit a \"NOTE FOR COUNSEL\" asking which subsection applies. State it plainly as a user-asserted gap: \"The intake characterises this activity as high-volume processing. Volume alone is not an enumerated § 7150(b) trigger; the user must confirm which enumerated trigger (selling/sharing, targeted advertising, profiling with significant effects, sensitive PI, or ADMT/training) applies to the processing as described.\" Flag the gap; do not resolve it.",
    "ENFORCEMENT CLAIMS ARE CORPUS-ONLY: any specific enforcement action — naming a date, an outcome (e.g. \"shutdown\"), a party, a docket, or a fine — must come from the supplied enforcement corpus (get-enforcement-context) and be attributable to it. NEVER assert a specific enforcement action from training memory. Do NOT state things like \"the CPPA's February 2025 enforcement action resulting in the shutdown of a data broker\" unless that action appears in the supplied corpus. If the corpus contains no on-point action, state the enforcement posture generically (e.g. \"the CPPA has signalled that disproportionate consumer-profiling risk is an enforcement priority\") and direct the reader to the CPPA's public enforcement records — do not invent a specific case to illustrate the point.",
    "ORG-CONTEXT DEFAULTS ARE NOT FINDINGS OF ABSENCE: org_context booleans that arrive false from the compatibility shim — privacy_counsel_engaged, dpo_or_privacy_officer, board_level_oversight, cppa_audit_notification_received — mean \"not captured in the intake,\" NOT \"confirmed absent.\" NEVER assert in safeguard_gaps, adverse-effect, or any narrative that the organisation has \"no privacy counsel,\" \"no DPO/privacy officer,\" or \"no board oversight\" on the basis of these defaults; at most state the item is \"not documented in the intake.\" Where another field contradicts the default (e.g. external consultees name outside privacy counsel, or a certifying executive holds a Chief Privacy Officer title), do NOT assert absence at all — defer to the inconsistency flag, which records the contradiction for the user to resolve.",
    "THIRD PARTY ≠ SALE/SHARE: classifying a recipient as a third party (rather than a service provider/contractor) does NOT by itself make a disclosure a \"sale\" or \"share.\" Under the § 1798.140 definitions of \"sell\" and \"share,\" a sale/share additionally requires monetary or other valuable consideration, or that the disclosure is for cross-context behavioural advertising. When the intake shows a vendor (e.g. a support/ticketing tool) that may not be under a compliant service-provider contract, state the two determinations SEPARATELY: (1) recipient classification (service provider/contractor vs third party), and (2) whether any transfer is a sale/share (which turns on consideration or cross-context advertising and, if present, triggers a separate § 7150(b)(1) assessment). Never write that non-service-provider status \"is\" or \"constitutes\" a sale/share — flag both as items the user must confirm.",
    "§ 7152(a) SUBSECTION DISCIPLINE: cite each element to its own subsection and never reuse (a)(2) as a catch-all. (a)(1) = processing summary and specific (non-generic) purpose; (a)(2) = categories of PI and whether they include sensitive PI (NOT minimum-PI, NOT consumer categories); (a)(3) = the processing-operation details; (a)(4) = benefits; (a)(5) = negative impacts; (a)(6) = safeguards; (a)(8)–(a)(9) = the individuals involved and the decisionmaker with authority to proceed. The benefits-outweigh-risks balancing itself is the § 7154 goal, not a content element. Consumer categories belong to the (a)(1) processing summary, never (a)(2).",
  ].join("\n"),
  schema: `OUTPUT FORMAT — Return a single JSON object with this exact structure. No markdown fences, no preamble:

{
  "assessment_summary": {
    "company_name": string,
    "sector": string,
    "assessment_date": string,
    "triggered_activities": string[],
    "exceptions_claimed": string[],
    "exceptions_status": "All well-documented" | "Some require strengthening" | "Material gaps identified" | "Insufficient basis to assess",
    "overall_risk_level": "Low" | "Moderate" | "High" | "Critical" | "Insufficient basis",
    "cybersecurity_audit_required": boolean,
    "admt_disclosure_required": boolean,
    "corpus_enforcement_note": string
  },
  "scope_and_triggers": {
    "triggered_activities_detail": [
      { "activity": string, "statutory_basis": string, "data_categories": string[], "consumer_categories": string[], "assessment_required": boolean, "assessment_required_rationale": string }
    ],
    "scope_notes": string
  },
  "exception_analysis": [
    { "exception_name": string, "statutory_basis": string, "claimed": boolean, "scope_described": string, "safeguards_described": string, "documentation_status": "Documented" | "Undocumented" | "Insufficient basis" | "Not claimed", "missing_elements": string[], "validity_assessment": string, "flags": string[] }
  ],
  "risk_assessment_by_activity": [
    { "activity": string, "statutory_basis": string, "purpose": string, "benefits_to_business": string, "benefits_to_consumers": string,
      "adverse_effects": [ { "harm_type": string, "likelihood": string, "severity": string, "description": string } ],
      "current_safeguards": string, "safeguard_gaps": string,
      "benefits_outweigh_risks_conclusion": "Yes" | "No" | "Uncertain" | "Insufficient basis", "benefits_outweigh_risks_rationale": string,
      "section_7152_mapping": string }
  ],
  "inconsistency_flags": [
    { "description": string, "intake_field_1": string, "intake_field_2": string, "regulatory_citation": string, "resolution_required": string }
  ],
  "enforcement_context": {
    "relevant_precedents": string, "sector_specific_patterns": string, "audit_division_priorities": string
  },
  "priority_actions": [
    { "action": string, "statutory_basis": string, "severity": "Immediate" | "High" | "Medium" | "Low", "deadline": string, "deadline_basis": string }
  ],
  "cross_tool_recommendations": {
    "cybersecurity_audit": boolean, "cybersecurity_audit_rationale": string,
    "admt_assessment": boolean, "admt_assessment_rationale": string
  },
  "document_metadata": {
    "assessment_version": "1.0",
    "statutory_framework": "Cal. Code Regs. tit. 11, §§ 7150–7157",
    "compliance_deadline": "December 31, 2027",
    "disclaimer": "This document has been generated to assist in preparing a CPPA risk assessment. It does not constitute legal advice. Review with qualified privacy counsel before submission or reliance."
  }
}`,
};

function buildUserPrompt(intake: FiveStageIntake): string {
  const { triggers, exceptions, activity_details, impact, org_context } = intake;
  const noExceptions = Object.values(exceptions).every((v: any) => !v?.claimed);

  // [REVISED] Pull authoritative § 7150(b) subsection strings from the registry —
  // never hardcode § 7150(b)(N) literals in this file.
  const SEC_OBSERVE  = CITATION_REGISTRY.ra_trigger_observe.section;  // systematic observation
  const SEC_LOCATION = CITATION_REGISTRY.ra_trigger_location.section; // sensitive location
  const SEC_TRAIN    = CITATION_REGISTRY.ra_trigger_train.section;    // train ADMT / biometric

  // Plain-language labels — never emit the raw snake_case keys into the prompt,
  // or the model echoes them ("cross_context_tracking: true") into the report.
  const TRIGGER_LABELS: Record<string, string> = {
    sells_or_shares_pi: "Selling or sharing personal information",
    targeted_advertising: "Cross-context behavioural / targeted advertising",
    profiling_significant_effects: "Profiling via systematic observation or sensitive-location presence",
    sensitive_pi_beyond_enumerated: "Processing sensitive personal information",
    high_volume_processing: "High consumer volume (NOTE: not a § 7150(b) trigger — applicable § 7120 cyber-audit obligation only)",
    admt_involved: "Automated decisionmaking technology (use and/or training)",
  };
  const EXCEPTION_LABELS: Record<string, string> = {
    fraud_detection: "Fraud prevention / detection",
    security_integrity: "Security & integrity of systems and data",
    debugging: "Debugging to identify and repair errors",
    transient_use: "Transient / short-term use",
    internal_research: "Internal research for technological development",
    employment_context: "Employment-context processing",
    legal_compliance: "Compliance with a legal obligation",
    consumer_request: "Performing a service the consumer requested",
  };
  const yn = (b: any) => (b ? "yes" : "no");

  // high_volume_processing is never a § 7150(b) trigger (it is a § 7120 cyber-audit
  // signal). Detection no longer sets it; this guard also drops any stray supplied value.
  const activeTriggers = Object.entries(triggers)
    .filter(([k, v]) => v && k !== "high_volume_processing")
    .map(([k]) => TRIGGER_LABELS[k] ?? k);
  const claimedList = Object.entries(exceptions)
    .filter(([, v]: any) => v?.claimed)
    .map(([k, v]: any) => `- ${EXCEPTION_LABELS[k] ?? k}: scope — ${String(v.scope || "not described")}; safeguards — ${String(v.safeguards || "not described")}`);
  const activityProse = (activity_details ?? [])
    .filter((a: any) => a?.trigger_key !== "high_volume_processing")
    .map((a: any, i: number) => {
    const cats = Array.isArray(a.data_categories) ? a.data_categories.join(", ") : String(a.data_categories ?? "not specified");
    const cons = Array.isArray(a.consumer_categories) && a.consumer_categories.length ? a.consumer_categories.join(", ") : "not specified";
    return `Activity ${i + 1} — ${TRIGGER_LABELS[a.trigger_key] ?? a.trigger_key}:
  Data categories: ${cats}
  Consumer categories: ${cons}
  Specific purpose: ${String(a.purpose_description ?? "not provided")}
  Minimum PI necessary (§ 7152(a)(3)): ${String(a.minimum_pi_necessary ?? "Not provided.")}
  Sources of the PI (§ 7152(a)(3)): ${String(a.pi_sources ?? "Not provided.")}
  Recipients / third parties: ${String(a.third_party_recipients || "none stated")}
  Benefit to the business (§ 7152(a)(4)): ${String(a.business_benefits ?? "Not provided.")}
  Benefit to the consumer (§ 7152(a)(4)): ${String(a.consumer_benefits ?? "Not provided.")}
  Benefit to other stakeholders / the public: ${String(a.stakeholder_public_benefits ?? "Not provided.")}
  Planned safeguards (§ 7152(a)(6)): ${String(a.current_safeguards ?? "Not provided.")}
  Cross-context tracking: ${yn(a.cross_context_tracking)}; profiling/inferences: ${yn(a.profiling_inferences)}; children in scope: ${yn(a.children_in_scope)}`;
  }).join("\n\n");

  const today = new Date().toISOString().slice(0, 10);

  return `Generate a CPPA risk assessment for the following organisation. Map all output to the § 7152 required content elements. Use ${today} as the assessment_date — do not invent a different date.

STAGE 1 — TRIGGERED ACTIVITIES (§ 7150(b)):
${activeTriggers.length ? activeTriggers.map((t) => `- ${t}`).join("\n") : "- None explicitly indicated."}

Annual consumer volume: ${intake.annual_consumer_volume ?? "Not specified"}

STAGE 2 — § 7152 EXCEPTION / BUSINESS-PURPOSE CLAIMS:
${noExceptions ? "No exceptions claimed." : claimedList.join("\n")}

STAGE 3 — PROCESSING ACTIVITY DETAILS:
${activityProse || "No activity detail provided."}

STAGE 4 — IMPACT ASSESSMENT:
Likelihood of harm: ${impact.likelihood_of_harm}
Severity of harm: ${impact.severity_of_harm}
Harm types identified: ${(impact.harm_types ?? []).join(", ")}
${impact.vulnerable_populations_detail ? `Vulnerable populations detail: ${impact.vulnerable_populations_detail}` : ""}
Benefits outweigh risks (organisation assessment): ${impact.benefits_outweigh_risks}
Rationale: ${impact.benefits_outweigh_risks_rationale}
Cybersecurity gaps identified: ${impact.cybersecurity_gaps_identified ? "Yes" : "No"}
Prior assessments conducted: ${impact.prior_assessments_conducted ? `Yes (${impact.prior_assessment_date ?? "date not specified"})` : "No"}

STAGE 5 — ORGANISATIONAL CONTEXT:
Company: ${org_context.company_name}
Sector: ${org_context.sector}
Annual revenue threshold: ${org_context.annual_revenue_threshold}
Privacy counsel engaged: ${org_context.privacy_counsel_engaged ? "Yes" : "No"}
DPO/Privacy Officer: ${org_context.dpo_or_privacy_officer ? "Yes" : "No"}
Board-level privacy oversight: ${org_context.board_level_oversight ? "Yes" : "No"}
Existing privacy programme: ${org_context.existing_privacy_programme}
CPPA audit notification received: ${org_context.cppa_audit_notification_received ? "YES — URGENT" : "No"}
${org_context.additional_context ? `Additional context: ${org_context.additional_context}` : ""}
${intake.content_detail ? `
§ 7152(a)(1)–(9) CONTENT DETAIL (from the user's intake — map each to its required content element; treat blanks as fill-ins, not findings of absence):
Retention period: ${intake.content_detail.retention_period || "not provided"}
Retention criteria: ${intake.content_detail.retention_criteria || "not provided"}
Retention detail: ${intake.content_detail.retention_detail || "not provided"}
How consumers are informed / disclosures (§ 7152(a)(3)(E)): ${intake.content_detail.consumer_disclosures || "not provided"}
ADMT — logic: ${intake.content_detail.admt_logic || "n/a"}
ADMT — training-data source: ${intake.content_detail.admt_training_source || "n/a"}
ADMT — fairness/bias testing: ${intake.content_detail.admt_fairness_testing || "n/a"}
ADMT — human review / appeal: ${intake.content_detail.admt_human_review || "n/a"}
ADMT — description: ${intake.content_detail.admt_description || "n/a"}
ADMT — opt-out offered: ${intake.content_detail.admt_opt_out || "n/a"}
Sensitive-PI use-limitation offered: ${intake.content_detail.sensitive_pi_limit_offered || "n/a"}
Sensitive-PI processing basis: ${intake.content_detail.sensitive_pi_basis || "n/a"}
"Do Not Sell/Share" opt-out link: ${intake.content_detail.opt_out_link || "n/a"}
Notice at collection: ${intake.content_detail.notice_at_collection || "n/a"}
Minimum PI necessary (§ 7152(a)(3)): ${intake.content_detail.minimum_pi_necessary || "not provided"}
Sources of the PI (§ 7152(a)(3)): ${intake.content_detail.pi_sources || "not provided"}
Under-16 actual knowledge (§ 7001(bbb)): ${intake.content_detail.under16_actual_knowledge || "not stated"}
Systematic-observation profiling trigger (${SEC_OBSERVE}): ${intake.content_detail.profiling_observation_trigger || "no"}
Sensitive-location profiling trigger (${SEC_LOCATION}): ${intake.content_detail.profiling_observation_trigger || "no"}
ADMT / biometric training trigger (${SEC_TRAIN}): ${intake.content_detail.admt_training_trigger || "no"}
Negative-impact sources and causes (§ 7152(a)(5)): ${intake.content_detail.harm_sources_and_causes || "not provided"}
Contributors to this assessment (§ 7152(a)(8)): ${intake.content_detail.internal_contributors || "not provided"}
External consultees: ${intake.content_detail.external_consultees || "none stated"}
Certifying executive (§ 7157): ${intake.content_detail.certifying_exec_name || "[FILL IN]"}${intake.content_detail.certifying_exec_title ? `, ${intake.content_detail.certifying_exec_title}` : ""}${intake.content_detail.certifying_contact_email ? ` (${intake.content_detail.certifying_contact_email})` : ""}
Existing DPIA/assessment to cross-reference: ${intake.content_detail.existing_dpia || "No"}
` : ""}
Return only valid JSON matching the specified output structure. No preamble, no markdown fences.`;
}

// ---------------------------------------------------------------------------
// Model call — Claude Sonnet 4.6 via Anthropic API direct.
// ---------------------------------------------------------------------------
async function callModel(
  system: string | SystemBlock[],
  user: string,
  label = "generate-v4"
): Promise<{ text: string; stopReason: string | null }> {
  const t0 = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: PRODUCT_MAX_OUTPUT_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(900_000),
  });
  const elapsed = Date.now() - t0;
  if (!res.ok) {
    const t = await res.text();
    console.error(`[${label}] HTTP ${res.status} in ${elapsed}ms: ${t.slice(0, 300)}`);
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 300)}`);
  }
  const d = await res.json();
  const text = d.content?.[0]?.text ?? "";
  const stopReason: string | null = d.stop_reason ?? null;
  console.log(`[${label}] ok in ${elapsed}ms chars=${text.length} stop=${stopReason}`);
  return { text, stopReason };
}

function tryParseJson(text: string): any | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------
async function runPipeline(assessment_id: string) {
  try {
    const { data: row } = await supabase.from("cppa_assessments").select("*").eq("id", assessment_id).single();
    if (!row) return;
    await supabase.from("cppa_assessments").update({ status: "processing" }).eq("id", assessment_id);

    const { intake: fiveStage, wasLegacyShimmed } = normaliseIntake(row.intake_data ?? {});

    const validation = validateFiveStage(fiveStage, /* lenient */ wasLegacyShimmed);
    if (!validation.ok) {
      await supabase.from("cppa_assessments").update({
        status: "error",
        report_data: { error: "VALIDATION_FAILED", message: validation.message, field: validation.field },
      }).eq("id", assessment_id);
      return;
    }

    // Corpus retrieval (parallel).
    const { enforcementContext, longitudinalSynthesis, statuteContext, fsorContext } = await retrieveCorpusContext(fiveStage);

    const today = new Date().toISOString().slice(0, 10);
    const injected = [
      `ENFORCEMENT CONTEXT FROM CORPUS:\n${enforcementContext || "(none returned)"}`,
      `LONGITUDINAL ENFORCEMENT PATTERNS:\n${longitudinalSynthesis || "(none returned)"}`,
      `VERBATIM REGULATION TEXT (Cal. Code Regs. tit. 11 — authoritative; ground every citation in this text):\n${statuteContext || "(none returned)"}`,
      `CPPA AGENCY COMMENTARY — FINAL STATEMENT OF REASONS:\n${fsorContext || "(none returned)"}`,
    ].join("\n\n");
    const system = buildSystemContent({
      toolModule: CPPA_RISK_TOOL_MODULE,
      currentDate: today,
      injected,
    });
    const userPrompt = buildUserPrompt(fiveStage);

    const t0 = Date.now();
    let parsed: any = null;
    let debugRaw = "";
    let lastStopReason: string | null = null;

    const first = await callModel(system, userPrompt, "generate-v4");
    lastStopReason = first.stopReason;

    // Helper: re-call Claude at an explicit token ceiling.
    const callAt = async (maxTokens: number, label: string) => {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: maxTokens,
          system,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: AbortSignal.timeout(900_000),
      });
      if (!res.ok) {
        console.warn(`[${label}] http ${res.status}`);
        return { text: "", stopReason: null as string | null };
      }
      const data = await res.json();
      const text = data.content?.[0]?.text ?? "";
      const stopReason: string | null = data.stop_reason ?? null;
      console.log(`[${label}] ok chars=${text.length} stop=${stopReason}`);
      return { text, stopReason };
    };

    if (first.stopReason === "max_tokens") {
      // First call already runs at the model ceiling (PRODUCT_MAX_OUTPUT_TOKENS).
      // Truncation here is exceptional; one retry at the same ceiling is the
      // most we can do synchronously. Cross-product retry/refund flow picks up
      // any residual failures.
      console.warn(`[cppa-risk v4] output truncated at ${PRODUCT_MAX_OUTPUT_TOKENS} tokens — single retry`);
      const retry = await callAt(PRODUCT_MAX_OUTPUT_TOKENS, "generate-v4-retry-max");
      lastStopReason = retry.stopReason;
      debugRaw = retry.text;
      parsed = tryParseJson(retry.text);
    } else {
      debugRaw = first.text;
      parsed = tryParseJson(first.text);
      if (!parsed) {
        console.warn("[cppa-risk v4] first parse failed — retrying once");
        const retry = await callModel(system, userPrompt, "generate-v4-retry");
        lastStopReason = retry.stopReason;
        debugRaw = retry.text;
        parsed = tryParseJson(retry.text);
      }
    }

    console.log(`[cppa-risk v4] generation total ${Date.now() - t0}ms stop=${lastStopReason}`);

    if (!parsed || !parsed.assessment_summary) {
      const errorCode = lastStopReason === "max_tokens"
        ? "generation_truncated"
        : "generation_parse_failed";
      await supabase.from("cppa_assessments").update({
        status: "error",
        report_data: {
          error: errorCode,
          stop_reason: lastStopReason,
          debug: debugRaw.slice(0, 4000),
        },
      }).eq("id", assessment_id);
      return;
    }

    // Post-generation verification (soft): banned phrases + hard lint violations.
    // One regeneration via the existing retry path if either fires.
    try {
      const flat = JSON.stringify(parsed);
      const banned = BANNED_PHRASES.filter((p) => flat.includes(p));
      const lint = lintReportText(flat);
      if (banned.length || hasHardViolations(lint)) {
        console.warn(JSON.stringify({
          evt: "post_gen_violation",
          fn: "run-cppa-risk-assessment",
          banned,
          violations: lint.violations?.slice(0, 20) ?? [],
        }));
        const retry = await callModel(system, userPrompt, "generate-v4-retry");
        const retryParsed = tryParseJson(retry.text);
        if (retryParsed && retryParsed.assessment_summary) {
          parsed = retryParsed;
          lastStopReason = retry.stopReason;
          debugRaw = retry.text;
        }
      }
    } catch (e) {
      console.warn("[cppa-risk v4] post-gen verification error:", e);
    }


    const report_data = {
      schema_version: "v4-five-stage",
      generated_at: new Date().toISOString(),
      legacy_shim_applied: wasLegacyShimmed,
      normalised_intake: fiveStage,
      ...parsed,
      retrieval_meta: {
        enforcement_context_chars: enforcementContext.length,
        longitudinal_synthesis_chars: longitudinalSynthesis.length,
      },
    };

    await supabase.from("cppa_assessments")
      .update({ status: "complete", report_data })
      .eq("id", assessment_id);
  } catch (e) {
    console.error("run-cppa-risk-assessment v4 error:", e);
    try {
      await supabase.from("cppa_assessments")
        .update({ status: "error", report_data: { error: String(e) } })
        .eq("id", assessment_id);
    } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// HTTP entrypoint (unchanged contract: accepts { assessment_id }).
// ---------------------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let assessment_id: string | undefined;
  try {
    const body = await req.json();
    assessment_id = body?.assessment_id;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!assessment_id) {
    return new Response(JSON.stringify({ error: "assessment_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    await supabase.from("cppa_assessments").update({ status: "processing" }).eq("id", assessment_id);
  } catch { /* row presence is re-checked inside runPipeline */ }

  const fnRun = await startFunctionRun(supabase, "run-cppa-risk-assessment", {
    archetype: "background",
    trustClass: "user",
    invokedBy: "user",
    metadata: { assessment_id },
  });
  const wrapped = (async () => {
    try {
      await runPipeline(assessment_id!);
      await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "cppa_assessments", sourceRowId: assessment_id! });
    } catch (e) {
      console.error("pipeline error:", e);
      await failFunctionRun(supabase, fnRun, e, { metadata: { assessment_id } });
    }
  })();
  // @ts-ignore Deno Edge Runtime API
  const er = (globalThis as any).EdgeRuntime;
  if (er?.waitUntil) {
    er.waitUntil(wrapped);
  }


  return new Response(JSON.stringify({ accepted: true, assessment_id }), {
    status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
