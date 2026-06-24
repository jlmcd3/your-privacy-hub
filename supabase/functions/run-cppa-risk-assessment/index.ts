// CPPA Risk Assessment — v4 (CR-2, June 2026)
// Five-stage intake + corpus-grounded generation. See
// EUP_CPPA_Risk_Assessment_Redesign.md (CR-2) for the spec.
//
// Pipeline:
//   1. Normalise intake (shim legacy flat payloads -> minimal five-stage).
//   2. Pre-generation validation (skipped/relaxed for legacy-shimmed payloads).
//   3. Parallel corpus retrieval: get-enforcement-context +
//      generate-longitudinal-synthesis.
//   4. Single generation call using the new § 7150–7158 system prompt.
//   5. Persist new-schema JSON to cppa_assessments.report_data.
//
// NOTE: The frontend intake form (src/pages/CPPARiskAssessment.tsx) and the
// result-page renderer still consume the legacy q*/i* schema. The shim keeps
// existing drafts running; the result page will need a separate redesign
// (tracked as a follow-up) before it can render the new output structure.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";

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
    && /sell|share|both/i.test(intake.q5_sell_share)
    && !/^no/i.test(intake.q5_sell_share);
  if (sells) triggers.sells_or_shares_pi = true;
  if (intake.q15_sensitive_pi === "Yes") triggers.sensitive_pi_beyond_enumerated = true;
  if (intake.q18_admt_use === "Yes" || intake.q18_admt_use === "In evaluation") triggers.admt_involved = true;
  const consumerBand = String(intake.q2_consumers ?? intake.i3_ca_consumer_band ?? "");
  if (/100[,\s]?000|million|m\+|>=?\s*100k/i.test(consumerBand)) triggers.high_volume_processing = true;
  // If nothing matched, mark sells_or_shares_pi so generation still runs.
  if (!Object.values(triggers).some(Boolean)) triggers.sells_or_shares_pi = true;

  const piCats = Array.isArray(intake.q4_pi_categories) ? intake.q4_pi_categories : [];
  const activity_details = [{
    trigger_key: Object.entries(triggers).find(([, v]) => v)?.[0] ?? "sells_or_shares_pi",
    data_categories: piCats,
    consumer_categories: [],
    purpose_description: String(intake.i1_processing_purpose ?? "Legacy intake — purpose not captured at this specificity."),
    business_benefits: String(intake.i5_business_benefits ?? "Not captured in legacy intake."),
    consumer_benefits: "",
    current_safeguards: String(intake.i7_safeguards ?? "Not captured in legacy intake."),
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
    benefits_outweigh_risks_rationale: String(im.benefitsRationale || "Not captured in intake — flag as a required fill-in."),
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
    additional_context: "Generated from legacy flat intake schema via compatibility shim.",
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
    return { ok: false, message: "At least one § 7150(b) triggering activity must be selected.", field: "triggers" };
  }
  if (lenient) return { ok: true };

  const generic = ["to improve our service", "for business purposes", "to provide services", "general operations"];
  for (const a of intake.activity_details ?? []) {
    const p = String(a.purpose_description ?? "").toLowerCase();
    if (p.length < 50 || generic.some((g) => p.includes(g))) {
      return {
        ok: false,
        message: `Processing purpose for "${a.trigger_key}" is too generic. Describe the specific purpose as required by § 7153(b).`,
        field: `activity_details.${a.trigger_key}.purpose_description`,
      };
    }
  }
  if (String(intake.impact?.benefits_outweigh_risks_rationale ?? "").length < 100) {
    return {
      ok: false,
      message: "The benefits-outweigh-risks rationale is too brief. § 7153(e) requires a substantive analysis.",
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
        focus_areas: [primaryActivity, "audit division enforcement priorities", "§ 7153 documentation requirements"],
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
// System prompt (CR-2 Step 2). Placeholders {{ENFORCEMENT}} / {{LONGITUDINAL}}
// substituted per-request.
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT_TEMPLATE = `You are a CPPA risk assessment specialist with deep expertise in Cal. Code Regs. tit. 11, §§ 7150–7158 and the California Privacy Rights Act. You are generating a formal risk assessment document that must meet the § 7153 content requirements and withstand scrutiny from the CPPA Audits Division, which formally stood up enforcement operations in February 2026 with a December 31, 2027 compliance deadline for existing processing activities.

ENFORCEMENT CONTEXT FROM CORPUS:
{{ENFORCEMENT}}

LONGITUDINAL ENFORCEMENT PATTERNS:
{{LONGITUDINAL}}

VERBATIM REGULATION TEXT (Cal. Code Regs. tit. 11 — authoritative; ground every citation in this text):
{{STATUTE}}

CPPA AGENCY COMMENTARY — FINAL STATEMENT OF REASONS (the Agency's own stated intent for these provisions):
{{FSOR}}

CORE OPERATING RULES:
1. NO ADAPTIVE GUIDANCE — Present enforcement patterns and regulatory standards as context only. Do not tell the user what answers to give or what conclusions to reach. All risk flags must cite the specific regulation, not a recommendation.
2. VALIDATE EXCEPTIONS RIGOROUSLY — For each § 7152 exception claimed, assess whether the scope description and safeguards cited are sufficient to sustain the exception under CPPA audit scrutiny. Flag weak or undocumented exception claims explicitly with citation to § 7152.
3. CITE ENFORCEMENT CORPUS — Where the enforcement context above contains relevant precedent, cite it explicitly to show the company what real enforcement looks like for activities similar to theirs.
4. FLAG EVERY INCONSISTENCY — Where intake answers contradict each other (e.g. claiming a transient use exception while also describing persistent profiling), flag it with a regulatory citation. Do not resolve it — present it for the user to address.
5. § 7153 MAPPING — Every section of the output document must map explicitly to a § 7153 required content element. Do not generate content that is not required by statute — every paragraph earns its place.
6. CYBERSECURITY AUDIT LINKAGE — If the intake reveals cybersecurity gaps or if the organisation's revenue exceeds $100M, flag the § 7158 cybersecurity audit obligation explicitly with the April 1, 2028 certification deadline.
7. ADMT LINKAGE — If ADMT is involved in any triggered activity, flag the January 1, 2027 ADMT disclosure deadline under § 7221 and recommend the ADMT Assessment tool.
8. BENEFITS-OUTWEIGH-RISKS ANALYSIS — The § 7153(e) analysis must be grounded in the specific activities and impacts described in the intake. Do not produce generic balancing language. Reference the specific benefits and harms the organisation has identified.

CITATION STANDARDS:
- GROUND IN THE PROVIDED TEXT — When the VERBATIM REGULATION TEXT above contains the provision you cite, your description of what it requires must match that text; do not paraphrase it into a different requirement. Where the AGENCY COMMENTARY (FSOR) explains a provision's intent, reflect that intent. Prefer citing provisions that appear in the provided text.
- All citations must be to Cal. Code Regs. tit. 11 (CPPA regulations) or Cal. Civ. Code § 1798 (CCPA/CPRA statute)
- Format: § 7150(b)(1) for regulations, § 1798.185 for statute
- Do not cite provisions that do not exist
- Do not cite § 7221(c)(5) for any purpose — this provision governs ADMT opt-out infrastructure, not general risk assessment
- Exception citations: § 7152(a)(1) through § 7152(a)(8) only — verify each before use

OUTPUT FORMAT — Return a single JSON object with this exact structure. No markdown fences, no preamble:

{
  "assessment_summary": {
    "company_name": string,
    "sector": string,
    "assessment_date": string,
    "triggered_activities": string[],
    "exceptions_claimed": string[],
    "exceptions_status": "All well-documented" | "Some require strengthening" | "Material gaps identified",
    "overall_risk_level": "Low" | "Moderate" | "High" | "Critical",
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
    { "exception_name": string, "statutory_basis": string, "claimed": boolean, "scope_described": string, "safeguards_described": string, "documentation_status": "Documented" | "Undocumented" | "Not claimed", "validity_assessment": string, "flags": string[] }
  ],
  "risk_assessment_by_activity": [
    { "activity": string, "statutory_basis": string, "purpose": string, "benefits_to_business": string, "benefits_to_consumers": string,
      "adverse_effects": [ { "harm_type": string, "likelihood": string, "severity": string, "description": string } ],
      "current_safeguards": string, "safeguard_gaps": string,
      "benefits_outweigh_risks_conclusion": string, "benefits_outweigh_risks_rationale": string,
      "section_7153_mapping": string }
  ],
  "inconsistency_flags": [
    { "description": string, "intake_field_1": string, "intake_field_2": string, "regulatory_citation": string, "resolution_required": string }
  ],
  "enforcement_context": {
    "relevant_precedents": string, "sector_specific_patterns": string, "audit_division_priorities": string
  },
  "priority_actions": [
    { "action": string, "statutory_basis": string, "deadline": string, "priority": "Immediate" | "Within 30 days" | "Before December 31 2027" | "Before April 1 2028" }
  ],
  "cross_tool_recommendations": {
    "cybersecurity_audit": boolean, "cybersecurity_audit_rationale": string,
    "admt_assessment": boolean, "admt_assessment_rationale": string
  },
  "document_metadata": {
    "assessment_version": "1.0",
    "statutory_framework": "Cal. Code Regs. tit. 11, §§ 7150–7158",
    "compliance_deadline": "December 31, 2027",
    "disclaimer": "This document has been generated to assist in preparing a CPPA risk assessment. It does not constitute legal advice. Review with qualified privacy counsel before submission or reliance."
  }
}`;

function buildUserPrompt(intake: FiveStageIntake): string {
  const { triggers, exceptions, activity_details, impact, org_context } = intake;
  const claimed = Object.entries(exceptions).filter(([, v]: any) => v?.claimed)
    .reduce((acc: any, [k, v]) => { acc[k] = v; return acc; }, {});
  const noExceptions = Object.values(exceptions).every((v: any) => !v?.claimed);
  return `Generate a CPPA risk assessment for the following organisation. Map all output to the § 7153 required content elements.

STAGE 1 — TRIGGERED ACTIVITIES:
${JSON.stringify(triggers, null, 2)}

Annual consumer volume: ${intake.annual_consumer_volume ?? "Not specified"}

STAGE 2 — EXCEPTION CLAIMS:
${JSON.stringify(claimed, null, 2)}
${noExceptions ? "No exceptions claimed." : ""}

STAGE 3 — PROCESSING ACTIVITY DETAILS:
${JSON.stringify(activity_details, null, 2)}

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
  system: string,
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

    const system = SYSTEM_PROMPT_TEMPLATE
      .replace("{{ENFORCEMENT}}", enforcementContext || "(no enforcement context returned by corpus)")
      .replace("{{LONGITUDINAL}}", longitudinalSynthesis || "(no longitudinal synthesis returned by corpus)")
      .replace("{{STATUTE}}", statuteContext || "(no statute text returned by corpus)")
      .replace("{{FSOR}}", fsorContext || "(no agency commentary returned by corpus)");
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
