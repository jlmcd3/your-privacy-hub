// supabase/functions/run-admt-checker/index.ts
// ADMT Compliance Assessment — gap analysis generator.
// Pipeline: retrieve corpus → generate gap analysis JSON → persist.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { PRODUCT_MAX_OUTPUT_TOKENS } from "../_shared/generation-policy.ts";
import {
  resolveCitations,
  stripModelCitations,
  validateReport,
  normalizeIntake,
  type ElementId,
} from "../_shared/admt-citation-registry.ts";
import { buildSystemContent, type SystemBlock, type ToolModule } from "../_shared/prompt-core.ts";
import { lintReportText, hasHardViolations } from "../_shared/output-lint.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callAnthropic(
  system: string | SystemBlock[],
  user: string,
  maxTokens: number,
  label = "admt"
): Promise<{ text: string; stopReason: string | null }> {
  const t0 = Date.now();
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(900_000),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t.slice(0, 300)}`);
  }
  const d = await res.json();
  const text = d.content?.[0]?.text ?? "";
  const stopReason: string | null = d.stop_reason ?? null;
  console.log(
    `[run-admt-checker] label=${label} elapsed=${Date.now() - t0}ms stop=${stopReason} chars=${text.length}`
  );
  return { text, stopReason };
}

function tryParseJson(text: string): any | null {
  // Strip markdown fences anywhere in the string (model sometimes adds trailing prose).
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  // Remove a trailing fence even if followed by more prose.
  const fenceIdx = cleaned.lastIndexOf("```");
  if (fenceIdx > 0) cleaned = cleaned.slice(0, fenceIdx);
  cleaned = cleaned.trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }

  // Brace-balanced extraction from the first '{'.
  const start = cleaned.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        const candidate = cleaned.slice(start, i + 1);
        try { return JSON.parse(candidate); } catch { return null; }
      }
    }
  }
  // Greedy fallback.
  const m = cleaned.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth: accept a valid user JWT OR service-role invocation (webhook).
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  let authorized = false;
  if (token && token === SUPABASE_SERVICE_KEY) {
    authorized = true;
  } else if (token) {
    const tmp = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await tmp.auth.getUser(token);
    if (data?.user) authorized = true;
  }
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const assessment_id: string = String(body?.assessment_id ?? "").trim();
  if (!assessment_id) return json({ error: "assessment_id required" }, 400);

  const { data: assessment } = await supabase
    .from("cppa_assessments")
    .select("*")
    .eq("id", assessment_id)
    .eq("module", "admt")
    .single();

  if (!assessment) return json({ error: "Assessment not found" }, 404);

  const fnRun = await startFunctionRun(supabase, "run-admt-checker", {
    archetype: "background",
    trustClass: "user",
    invokedBy: "user",
    metadata: { assessment_id },
  });
  // Return 202 immediately; run generation in background
  // @ts-ignore — EdgeRuntime is provided by the Supabase edge runtime
  EdgeRuntime.waitUntil((async () => {
   try {
    await supabase.from("cppa_assessments").update({ status: "processing" }).eq("id", assessment_id);
    const intake = assessment.intake_data as any;


    // 1. Retrieve ADMT authorities from corpus (best-effort).
    let authorities: any[] = [];
    let deadlines: any[] = [];
    try {
      const retrieveRes = await supabase.functions.invoke("cppa-retrieve-context", {
        body: {
          topics: ["admt", "significant-decision", "pre-use-notice", "profiling"],
          query: `ADMT compliance ${(intake.decision_domains ?? []).join(" ")} opt-out pre-use notice access right`,
          include_deadlines: true,
          full_text_limit: 12,
          limit: 20,
        },
      });
      const d = (retrieveRes?.data ?? {}) as any;
      authorities = d.authorities ?? [];
      deadlines = d.deadlines ?? [];
    } catch (e) {
      console.warn("[run-admt-checker] retrieve-context failed:", e);
    }

    const authBlock = authorities
      .map((a: any, i: number) =>
        `[A${i + 1}] ${a.citation} — ${a.title}\n${(a.full_text ?? a.plain_summary ?? "").slice(0, 3000)}`)
      .join("\n\n");

    const deadlineBlock = deadlines.length
      ? deadlines.map((d: any, i: number) =>
          `[D${i + 1}] ${d.obligation} | deadline: ${d.compliance_deadline ?? "—"} | basis: ${d.primary_authority_citation}`)
          .join("\n")
      : "(none)";

    const today = new Date().toISOString().slice(0, 10);

    const authoritiesBlock = `REGULATION AUTHORITIES:
${authBlock}

COMPLIANCE DEADLINES:
${deadlineBlock}`;

    const system: SystemBlock[] = buildSystemContent({
      toolModule: ADMT_TOOL_MODULE,
      currentDate: today,
      injected: authoritiesBlock,
    });

    const d = (intake as any).admt_detail || {};
    const userPrompt = `Analyze this business's ADMT compliance and produce a gap report.

ADMT SYSTEM: ${intake.system_name}
SYSTEM TYPE: ${intake.system_type || "(not specified)"}
DESCRIPTION: ${intake.system_description}
CALIFORNIA CONSUMERS PROCESSED ANNUALLY (APPROX.): ${intake.ca_consumer_count || "(not provided)"}
DECISION DOMAINS: ${(intake.decision_domains ?? []).join("; ")}${d.decision_domains_other ? ` — OTHER (described by business, assess against § 7001(ddd)): ${d.decision_domains_other}` : ""}
DECISION PROFILE: vendor/product: ${d.vendor_product || "(n/a)"}; hosting: ${d.hosting || "(n/a)"}; model type(s): ${(d.model_types ?? []).join(", ") || "(n/a)"}; decision effect(s): ${(d.decision_effects ?? []).join(", ") || "(n/a)"}; cadence: ${d.decision_cadence || "(n/a)"}; ADMT output is sole factor: ${d.sole_factor || "(not answered)"}; other factors: ${d.other_factors || "(n/a)"}; feeds future significant decisions: ${d.feeds_future_decisions || "(n/a)"}; solely advertising: ${d.solely_advertising || "(n/a)"}
HUMAN REVIEW: ${intake.human_review}
HUMAN-INVOLVEMENT SELF-TEST (§ 7001(e)(1)): reviewer present: ${d.hi_reviewer_present || "(not answered)"}; role: ${d.hi_reviewer_role || "(n/a)"}; stage: ${d.hi_stage || "(n/a)"}; (A) knows how to interpret output: ${d.hi_trained || "(n/a)"}; (B) reviews output + other info: ${d.hi_reviews_other_info || "(n/a)"}; (C) authority to change decision: ${d.hi_authority_override || "(n/a)"}; override rate: ${d.hi_override_rate || "(n/a)"}
TRAINS ADMT ON PI: ${intake.training_data_use}
PROFILING USE: ${intake.profiling_use}
THIRD-PARTY ADMT TOOLS IN USE: ${intake.third_party_admt || "(none disclosed)"}
VENDOR DILIGENCE: status: ${d.vendor_status || "(n/a)"}; documentation on file: ${(d.vendor_docs ?? []).join(", ") || "(none)"}; contract — audit rights: ${d.v_audit || "(n/a)"}, consumer-request assistance: ${d.v_assist || "(n/a)"}, opt-out propagation: ${d.v_optout || "(n/a)"}, appeal support: ${d.v_appeal || "(n/a)"}, incident notification: ${d.v_incident || "(n/a)"}; vendor makes ADMT available to other businesses: ${d.vendor_makes_available || "(n/a)"}; vendor training / model-improvement rights: ${d.vendor_training_rights || "(n/a)"}
NUMBER OF DISTINCT ADMT SYSTEMS THIS BUSINESS OPERATES: ${intake.admt_system_count || "(not specified — assume single system)"}
PRIOR ACCESS REQUESTS FROM THIS CONSUMER (ESTIMATED, 12-MONTH PERIOD): ${intake.prior_access_requests_12mo || "(not tracked)"}

PRE-USE NOTICE:
- Delivery method(s): ${(intake.notice_delivery ?? []).join("; ")}
- Has specific purpose statement: ${intake.notice_has_specific_purpose}
- Purpose text (verbatim from notice): ${intake.notice_purpose_text || "(not provided)"}
- Describes opt-out right: ${intake.notice_has_opt_out_desc}
- Describes access right: ${intake.notice_has_access_desc}
- Includes anti-retaliation statement: ${intake.notice_has_anti_retaliation}
- Explains how ADMT works: ${intake.notice_has_how_it_works}
- Describes alternative process for opt-out consumers: ${intake.notice_has_alternative_process}

OPT-OUT:
- Approach / exception claimed: ${intake.opt_out_exception}${d.opt_out_exception_other ? ` — business's own description (assess whether a § 7221(b) exception is established): ${d.opt_out_exception_other}` : ""}
- Opt-out methods provided: ${(intake.opt_out_methods ?? []).join("; ")}
- Opt-out link title: ${intake.opt_out_link_title || "(not provided)"}
- Not relying on cookie banner only: ${intake.opt_out_no_cookie_banner}
- No account creation required to opt out: ${intake.opt_out_no_account_required}
- Confirmation mechanism: ${intake.opt_out_confirmation_mechanism}
- Appeal process: ${intake.opt_out_appeal_process || "(not applicable)"}
- Fairness documentation: ${intake.opt_out_fairness_doc || "(not applicable)"}
- Validity & non-discrimination detail: protected characteristics tested: ${(d.bias_protected_chars ?? []).join(", ") || "(n/a)"}; proxy variables / mitigation: ${d.bias_proxy_vars || "(n/a)"}; testing cadence: ${d.bias_testing_cadence || "(n/a)"}; last test: ${d.bias_last_test || "(n/a)"}; next test: ${d.bias_next_test || "(n/a)"}; adverse-impact analysis: ${d.bias_adverse_impact || "(n/a)"}; outcome / FPR / FNR by group: ${d.bias_outcome_summary || "(n/a)"}
- Appeal mechanics: reviewer role: ${d.appeal_reviewer_role || "(n/a)"}; trained: ${d.appeal_trained || "(n/a)"}; authority to overturn: ${d.appeal_authority_overturn || "(n/a)"}; consumer may submit: ${(d.appeal_consumer_submit ?? []).join(", ") || "(n/a)"}; timeline: ${d.appeal_timeline || "(n/a)"}; outcomes: ${(d.appeal_outcomes ?? []).join(", ") || "(n/a)"}; reversal rate: ${d.appeal_reversal_rate || "(n/a)"}
- 15-business-day opt-out process documented: ${intake.opt_out_15_day_process || "(not described — operational gap)"}

ACCESS RIGHT:
- Submission methods: ${intake.access_submission_methods}
- Identity verification process: ${intake.access_verification_process}
- Logic disclosure: ${intake.access_logic_disclosure}
- Outcome disclosure: ${intake.access_outcome_disclosure}
- Response timeline: ${intake.access_response_timeline}
- Trade secret / security carve-out policy: ${intake.access_trade_secret_policy || "(not documented)"}
- Secure transmission method: ${d.access_secure_transmission || "(not specified)"}
- Partial / complete denial basis: ${d.access_denial_basis || "(not specified)"}

(Regulation authorities and compliance deadlines are provided in the system context.)



Return this JSON structure exactly. Do not add fields not listed here. Do not omit required fields.
{
  "system_name": "${intake.system_name}",
  "compliance_deadline": "January 1, 2027",
  "overall_status": "compliant" | "gaps_identified" | "significant_gaps",

  "scope_analysis": {
    "is_admt": true | false,
    "is_admt_reasoning": "Cite the specific element(s) of the system description that do or do not satisfy 11 CCR § 7001(e). Quote relevant facts.",
    "triggers_significant_decision": true | false,
    "significant_decision_reasoning": "Cite which § 7001(ddd) subcategory applies (or does not) and why, based on the system description.",
    "human_review_qualifies": true | false,
    "human_review_reasoning": "Analyze whether the described human review satisfies all three elements of § 7001(e)(1)(A)-(C). State clearly whether it does or does not constitute 'human involvement' as defined.",
    "triggers_risk_assessment": true | false,
    "risk_assessment_reasoning": "State which regulatory trigger(s) apply based on the system description. Only reference triggers supported by the REGULATION AUTHORITIES provided.",
    "triggers_profiling": true | false,
    "exception_claimed": "name of exception claimed, or 'none' if opt-out is provided",
    "exception_qualifies": true | false | "cannot_determine",
    "exception_reasoning": "If an exception was claimed, analyze whether the specific facts described satisfy the statutory requirements. Be direct: state whether the exception is or is not established based on the facts provided. If the business did not claim an exception, state 'No exception claimed — opt-out right required.'",
    "third_party_responsibility_note": "If third-party ADMT tools were listed, note here that the business remains the CCPA-responsible party. Otherwise leave as empty string.",
    "summary": "3-4 sentence plain-language scope conclusion that incorporates the reasoning above."
  },

  "consolidated_notice_analysis": {
    "applicable": true | false,
    "basis": "State which of the four § 7220(e) consolidation scenarios applies, if any: (1) one ADMT for multiple purposes; (2) multiple ADMTs for one purpose; (3) multiple ADMTs for multiple purposes; (4) systematic use of a single ADMT. Only mark applicable:true if the intake describes multiple ADMT systems OR multiple uses of a single ADMT that could be consolidated. If the business operates a single ADMT for a single purpose, mark applicable:false and explain why consolidation is irrelevant here.",
    "conditions_to_consolidate": "If applicable:true, list the mandatory conditions the consolidated notice must satisfy: it must include ALL required § 7220(c) elements for EACH ADMT system or use covered. Generic or combined descriptions that obscure individual system requirements do not satisfy this.",
    "consolidation_benefit": "If applicable:true, briefly describe the operational benefit (e.g., 'A single notice can cover both the credit scoring model and the fraud detection system, reducing notice delivery touchpoints from two to one').",
    "consolidation_risk": "If applicable:true, describe the compliance trap: a consolidated notice that omits required elements for any one system is non-compliant for that system. The business cannot use consolidation to simplify away disclosure obligations.",
    "recommendation": "One plain-language sentence: either 'Consolidation not applicable — single ADMT/single purpose detected' or 'Consolidation eligible — recommend reviewing § 7220(e) conditions with counsel before consolidating.'"
  },

  "enforcement_context": {
    "penalty_per_violation_unintentional": 2663,
    "penalty_per_violation_intentional": 7988,
    "penalty_statutory_basis": "Cal. Civ. Code § 1798.155(a) (2025-2026 CPI-adjusted figures)",
    "ca_consumer_count_provided": "${intake.ca_consumer_count || 'not provided'}",
    "aggregate_exposure_note": "Based on the gaps identified and the consumer volume provided (or noted as not provided), briefly describe the scale of potential exposure. Note that the CPPA may count each affected consumer as a separate violation. Do not cite specific enforcement actions or settlements unless they appear in the REGULATION AUTHORITIES block provided — if none do, omit that reference."
  },

  "notice_gaps": [
    {
      "element_id": "notice_purpose | notice_optout | notice_access | notice_antiretaliation | notice_howworks | notice_alternative_process | notice_trade_secret",
      "element": "Plain-English name of the element (no section number)",
      "status": "compliant" | "gap" | "missing",
      "finding": "Specific finding in plain language. Do NOT include any '§' or section number — refer to it as 'the cited provision'.",
      "citation": "",
      "remediation": "Specific action the business must take. No section numbers.",
      "enforcement_exposure": "Per-violation exposure if gap or missing. No section numbers."
    }
  ],

  "opt_out_gaps": [
    {
      "element_id": "optout_offer | optout_designated_methods | optout_account_barrier | optout_confirmation | optout_processing",
      "element": "Plain-English name of the element (no section number)",
      "status": "compliant" | "gap" | "missing",
      "finding": "Specific finding. For the 15-business-day operational process: if intake.opt_out_15_day_process was blank or '(not described)', flag this under optout_processing. No section numbers.",
      "citation": "",
      "remediation": "Specific action required. No section numbers.",
      "enforcement_exposure": "Per-violation exposure if gap or missing. No section numbers."
    }
  ],

  "access_gaps": [
    {
      "element_id": "access_specific_purpose | access_logic | access_outcome_sole_factor | access_antiretaliation | access_trade_secret | access_timeline | access_secure_transmission | access_denial_basis | access_aggregate_log | access_verification",
      "element": "Plain-English name of the element (no section number)",
      "status": "compliant" | "gap" | "missing",
      "finding": "Specific finding. No section numbers.",
      "citation": "",
      "remediation": "Specific action required. No section numbers.",
      "enforcement_exposure": "Per-violation exposure if gap or missing. No section numbers."
    }
  ],

  "risk_assessment_obligation": {
    "required": true | false,
    "triggers_identified": ["Plain-English names of triggers that apply (e.g., 'ADMT used to make a significant decision', 'training ADMT on personal information'). NO section numbers."],
    "compliance_deadline_existing_activities": "December 31, 2027 (for processing activities initiated before January 1, 2026)",
    "compliance_deadline_new_activities": "Before initiating new or materially changed processing activities",
    "submission_requirement": "Plain-English description. No section numbers.",
    "summary": "2-3 sentence plain-language description. No section numbers."
  },

  "documentation_to_maintain": [
    {
      "element_id": "sp_contract_terms | ra_program | human_involvement | qualifies_admt | significant_decision | compliance_deadline",
      "document": "Name of document or record",
      "purpose": "What it demonstrates to the CPPA",
      "citation": ""
    }
  ],


  "aggregate_access_response": {
    "applicable": "true | false | 'cannot_determine'",
    "threshold": "Business used the ADMT with respect to the consumer more than four times within a 12-month period (§ 7222(j))",
    "explanation": "If the business has used the ADMT with respect to the consumer more than four times in a 12-month period, it may respond with aggregate-level logic and output summaries instead of individualized responses. The threshold measures ADMT decisions/uses with respect to the consumer — NOT the count of inbound access requests. If the intake does not track this, recommend the business begin logging per-consumer ADMT use frequency.",
    "what_aggregate_response_may_include": "If applicable, note that the aggregate response may include aggregate-level summaries of the ADMT's logic and outputs, but must still include the specific purpose (§ 7222(b)(1)), and the business must still respond to the other required elements of § 7222. The aggregate option is specifically for the logic and output disclosures under § 7222(b)(2)-(3), not a complete exemption from responding.",
    "operational_note": "If applicable, recommend the business document which consumers have crossed the four-use threshold and maintain a per-consumer ADMT-use log to support the aggregate-response decision."
  },

  "priority_actions": [
    "Numbered action item with specific deadline where known. Based only on gaps identified above."
  ],

  "compliant_elements": ["List of elements assessed as compliant, with brief explanation."]
}`;

    let rawText: string;
    {
      const first = await callAnthropic(system, userPrompt, PRODUCT_MAX_OUTPUT_TOKENS, "gap-analysis");
      if (first.stopReason === "max_tokens") {
        console.warn(`[run-admt-checker] gap-analysis truncated at ${PRODUCT_MAX_OUTPUT_TOKENS} — single retry`);
        const retry = await callAnthropic(system, userPrompt, PRODUCT_MAX_OUTPUT_TOKENS, "gap-analysis-retry");
        rawText = retry.text;
      } else {
        rawText = first.text;
      }
    }
    let report = tryParseJson(rawText);

    // If parsing failed, retry once with a strict JSON-only directive.
    if (!report) {
      console.warn(
        `[run-admt-checker] parse_failed on first pass — chars=${rawText.length} head=${JSON.stringify(rawText.slice(0, 200))} tail=${JSON.stringify(rawText.slice(-300))}`
      );
      const strictRetry = await callAnthropic(
        system,
        userPrompt +
          "\n\nCRITICAL OUTPUT REQUIREMENT: Respond with a single valid JSON object only. No markdown fences, no commentary before or after. The first character MUST be '{' and the last character MUST be '}'. Escape all internal quotes and newlines per JSON spec.",
        PRODUCT_MAX_OUTPUT_TOKENS,
        "gap-analysis-json-retry"
      );
      report = tryParseJson(strictRetry.text);
      if (report) {
        rawText = strictRetry.text;
      } else {
        console.error(
          `[run-admt-checker] parse_failed after retry — tail=${JSON.stringify(strictRetry.text.slice(-500))}`
        );
        await supabase.from("cppa_assessments").update({
          status: "error",
          report_data: {
            error: "parse_failed",
            raw_head: rawText.slice(0, 400),
            raw_tail: rawText.slice(-400),
            retry_tail: strictRetry.text.slice(-400),
          },
        }).eq("id", assessment_id);
        return;
      }
    }

    // ── Layer 3 + Layer 4 — Resolver injection & validator ──────────────────
    // The model writes prose only. Here we (a) overwrite `citation` on every
    // finding with the registry-resolved canonical string(s) keyed by
    // `element_id` + normalized intake, (b) strip any §/7xxx tokens the model
    // may have authored in prose fields, and (c) run the validator.
    try {
      const normalized = normalizeIntake(intake);
      const proseFields = ["finding", "remediation", "enforcement_exposure", "element"] as const;
      const resolveInto = (arr: any[] | undefined) => {
        if (!Array.isArray(arr)) return;
        for (const item of arr) {
          for (const f of proseFields) {
            if (item && typeof item[f] === "string") item[f] = stripModelCitations(item[f]);
          }
          const eid = (item?.element_id ?? "") as ElementId | "";
          if (eid) {
            const r = resolveCitations(eid as ElementId, intake);
            item.citation = r.sections.join(" + ");
            item.citation_ids = r.citationIds;
          } else {
            item.citation = "";
          }
        }
      };
      resolveInto(report.notice_gaps);
      resolveInto(report.opt_out_gaps);
      resolveInto(report.access_gaps);
      resolveInto(report.documentation_to_maintain);

      // Surface an assumption flag if the RA program resolver flagged one.
      const raResolved = resolveCitations("ra_program", intake);
      if (raResolved.assumptionFlag && report.risk_assessment_obligation) {
        report.risk_assessment_obligation.assumption_note = raResolved.assumptionFlag;
      }
      if (report.risk_assessment_obligation) {
        report.risk_assessment_obligation.resolved_citations = raResolved.sections;
      }

      // Scrub a few free-text places the model may slip a citation into.
      for (const k of ["scope_analysis", "consolidated_notice_analysis", "aggregate_access_response", "enforcement_context"]) {
        const obj = report[k];
        if (obj && typeof obj === "object") {
          for (const subKey of Object.keys(obj)) {
            if (typeof obj[subKey] === "string") obj[subKey] = stripModelCitations(obj[subKey]);
          }
        }
      }
      if (Array.isArray(report.priority_actions)) {
        report.priority_actions = report.priority_actions.map((s: any) => typeof s === "string" ? stripModelCitations(s) : s);
      }
      if (Array.isArray(report.compliant_elements)) {
        report.compliant_elements = report.compliant_elements.map((s: any) => typeof s === "string" ? stripModelCitations(s) : s);
      }

      // Validate.
      const issues = validateReport(report, intake);
      if (issues.length) {
        console.warn(`[run-admt-checker] validator issues: ${JSON.stringify(issues)}`);
        report._validator_issues = issues;
      }
      // Echo normalized intake summary into the report for traceability.
      report._normalized_intake = normalized;
    } catch (resolveErr) {
      console.warn("[run-admt-checker] citation resolver failed (non-fatal):", resolveErr);
    }

    // ── Light English backstop — lint the assembled narrative, NOT citations
    // (registry-controlled). On hard violations fire one regeneration retry
    // through the existing strict-JSON retry path.
    try {
      const narrativeFields: string[] = [];
      const push = (s: unknown) => { if (typeof s === "string" && s.trim().length) narrativeFields.push(s); };
      push(report?.scope_analysis?.summary);
      push(report?.scope_analysis?.is_admt_reasoning);
      push(report?.scope_analysis?.significant_decision_reasoning);
      push(report?.scope_analysis?.human_review_reasoning);
      push(report?.scope_analysis?.exception_reasoning);
      push(report?.scope_analysis?.risk_assessment_reasoning);
      push(report?.scope_analysis?.third_party_responsibility_note);
      push(report?.consolidated_notice_analysis?.basis);
      push(report?.consolidated_notice_analysis?.recommendation);
      push(report?.aggregate_access_response?.explanation);
      push(report?.risk_assessment_obligation?.summary);
      for (const arr of [report.notice_gaps, report.opt_out_gaps, report.access_gaps]) {
        if (Array.isArray(arr)) for (const it of arr) { push(it?.finding); push(it?.remediation); push(it?.enforcement_exposure); }
      }
      if (Array.isArray(report.priority_actions)) for (const s of report.priority_actions) push(s);
      const lint = lintReportText(narrativeFields.join("\n\n"));
      if (hasHardViolations(lint)) {
        console.warn(`[run-admt-checker] lint hard violations: ${JSON.stringify(lint.violations)}`);
        const lintRetry = await callAnthropic(
          system,
          userPrompt +
            "\n\nPREVIOUS DRAFT contained English-style violations (meta-commentary, unresolved tokens, or other non-customer-facing artifacts). Produce the JSON again, cleanly. Same JSON shape; no markdown.",
          PRODUCT_MAX_OUTPUT_TOKENS,
          "lint-retry"
        );
        const reLinted = tryParseJson(lintRetry.text);
        if (reLinted) {
          // Re-run resolver on the retry payload so citations remain registry-controlled.
          try {
            const proseFields = ["finding", "remediation", "enforcement_exposure", "element"] as const;
            const resolveInto2 = (arr: any[] | undefined) => {
              if (!Array.isArray(arr)) return;
              for (const item of arr) {
                for (const f of proseFields) {
                  if (item && typeof item[f] === "string") item[f] = stripModelCitations(item[f]);
                }
                const eid = (item?.element_id ?? "") as ElementId | "";
                if (eid) {
                  const r = resolveCitations(eid as ElementId, intake);
                  item.citation = r.sections.join(" + ");
                  item.citation_ids = r.citationIds;
                } else {
                  item.citation = "";
                }
              }
            };
            resolveInto2(reLinted.notice_gaps);
            resolveInto2(reLinted.opt_out_gaps);
            resolveInto2(reLinted.access_gaps);
            resolveInto2(reLinted.documentation_to_maintain);
          } catch (e) {
            console.warn("[run-admt-checker] resolver on lint-retry failed (non-fatal):", e);
          }
          report = reLinted;
          report._lint_retry = { violations: lint.violations };
        } else {
          report._lint_unrecovered = { violations: lint.violations };
        }
      }
    } catch (lintErr) {
      console.warn("[run-admt-checker] lint backstop failed (non-fatal):", lintErr);
    }




    // ── PASS 2: Sample Language Drafting ─────────────────────────────────────
    // For every gap/missing item, generate ready-to-use draft language the user
    // can paste directly into their notice, opt-out mechanism, or access
    // right response. Uses the user's actual intake values so output is
    // specific — never generic. [BRACKETED PLACEHOLDERS] only for info the
    // business must supply themselves (URLs, contact emails, specific dates).
    // Non-fatal: if this call fails, the gap analysis result is still saved.

    const gapItems = [
      ...(report.notice_gaps ?? []).filter((i: any) => i.status !== "compliant").map((i: any) => ({ ...i, section: "notice" })),
      ...(report.opt_out_gaps ?? []).filter((i: any) => i.status !== "compliant").map((i: any) => ({ ...i, section: "opt_out" })),
      ...(report.access_gaps ?? []).filter((i: any) => i.status !== "compliant").map((i: any) => ({ ...i, section: "access" })),
    ];

    if (gapItems.length > 0) {
      try {
        const decisionDomain = (intake.decision_domains ?? []).join(", ");
        const systemName = intake.system_name ?? "the automated system";
        const purposeText = intake.notice_purpose_text || "";
        const systemDescription = intake.system_description ?? "";
        const humanReview = intake.human_review ?? "";
        const optOutMethods = (intake.opt_out_methods ?? []).join(" and ");
        const optOutLinkTitle = intake.opt_out_link_title || "Opt Out of Automated Decisions";
        const optOutConfirmation = intake.opt_out_confirmation_mechanism || "";
        const optOutAppeal = intake.opt_out_appeal_process || "";
        const accessMethods = intake.access_submission_methods || "";
        const accessTimeline = intake.access_response_timeline || "45 days";
        const accessLogic = intake.access_logic_disclosure || "";
        const accessOutcome = intake.access_outcome_disclosure || "";
        const tradeSecret = intake.access_trade_secret_policy || "";
        const altProcess = intake.notice_has_alternative_process === "Yes"
          ? "Consumers who opt out will have their application reviewed by a human reviewer."
          : "";

        const draftSystem = `You are a California privacy compliance attorney drafting plain-language ADMT compliance language for a business under CPPA final regulations (11 CCR §§ 7220–7222, effective January 1, 2027).

Your task: for each gap item listed, write ready-to-use draft language the business can paste directly into their privacy notice, website, opt-out mechanism, or consumer response template.

CRITICAL DRAFTING RULES:
1. Use the business's ACTUAL system name, purpose, and decision domain — never write generic placeholders where real information was provided.
2. Use [BRACKETED PLACEHOLDERS] ONLY for information the business must supply that was not provided (e.g., [YOUR-WEBSITE.com/opt-out], [privacy@yourcompany.com]).
3. Language must be plain and specific — § 7220(c)(1) prohibits generic statements like "to make significant decisions." Write "to determine your eligibility for a loan" not "for automated decision purposes."
4. Tone: clear, direct, consumer-facing. No legalese. No passive voice where active is possible.
5. Length: Pre-use notice paragraphs 2–5 sentences. Opt-out confirmation 1–3 sentences. Access response template 1 paragraph per section.
6. Do NOT include legal disclaimers in the draft language — that appears elsewhere in the product.
7. Return ONLY valid JSON — no markdown, no preamble.`;

        const draftPrompt = `Draft sample compliance language for each gap item below. Use the business's actual information.

BUSINESS CONTEXT:
- System name: ${systemName}
- System description: ${systemDescription}
- Decision domain(s): ${decisionDomain}
- Purpose statement (if provided): ${purposeText}
- Human review: ${humanReview}
- Opt-out methods: ${optOutMethods}
- Opt-out link title: ${optOutLinkTitle}
- Opt-out confirmation: ${optOutConfirmation}
- Appeal process: ${optOutAppeal}
- Access submission methods: ${accessMethods}
- Access response timeline: ${accessTimeline}
- Logic disclosure: ${accessLogic}
- Outcome disclosure: ${accessOutcome}
- Trade secret policy: ${tradeSecret}
- Alternative process for opt-outs: ${altProcess}

GAP ITEMS REQUIRING DRAFT LANGUAGE:
${gapItems.map((item, i) => `[${i}] SECTION: ${item.section} | ELEMENT: ${item.element} | CITATION: ${item.citation} | FINDING: ${item.finding} | REMEDIATION: ${item.remediation}`).join("\n")}

For each item, produce draft language appropriate to its section:
- "notice" items → draft Pre-Use Notice language (the actual text to show consumers before ADMT is applied)
- "opt_out" items → draft opt-out mechanism text (link title, confirmation message, or appeal acknowledgment)
- "access" items → draft Access Right response template (what the business sends when a consumer requests access)

Return this JSON structure exactly:
{
  "drafts": [
    {
      "index": 0,
      "element": "exact element name from input",
      "section": "notice|opt_out|access",
      "citation": "citation from input",
      "sample_language": "Ready-to-use draft text. Use [PLACEHOLDER] only where business-specific information was not provided.",
      "usage_note": "One sentence explaining where/how to deploy this language (e.g., 'Add to your privacy notice at collection, before any data is used for scoring.')"
    }
  ]
}`;

        let draftRaw: string;
        {
          const first = await callAnthropic(draftSystem, draftPrompt, PRODUCT_MAX_OUTPUT_TOKENS, "sample-language");
          if (first.stopReason === "max_tokens") {
            console.warn(`[run-admt-checker] sample-language truncated at ${PRODUCT_MAX_OUTPUT_TOKENS} — single retry`);
            const retry = await callAnthropic(draftSystem, draftPrompt, PRODUCT_MAX_OUTPUT_TOKENS, "sample-language-retry");
            draftRaw = retry.text;
          } else {
            draftRaw = first.text;
          }
        }
        const draftResult = tryParseJson(draftRaw);

        if (draftResult?.drafts && Array.isArray(draftResult.drafts)) {
          for (const draft of draftResult.drafts) {
            const section = draft.section as "notice" | "opt_out" | "access";
            const targetArray =
              section === "notice" ? report.notice_gaps :
              section === "opt_out" ? report.opt_out_gaps :
              report.access_gaps;
            if (!Array.isArray(targetArray)) continue;
            const target = targetArray.find((item: any) => item.element === draft.element);
            if (target) {
              target.sample_language = draft.sample_language ?? null;
              target.usage_note = draft.usage_note ?? null;
            }
          }
        }
      } catch (draftErr) {
        console.warn("[run-admt-checker] sample language drafting failed (non-fatal):", draftErr);
      }
    }

    await supabase.from("cppa_assessments").update({
      status: "complete",
      report_data: report,
      updated_at: new Date().toISOString(),
    }).eq("id", assessment_id);
    await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "cppa_assessments", sourceRowId: assessment_id });
   } catch (e) {
    console.error("[run-admt-checker] pipeline error:", e);
    await supabase.from("cppa_assessments").update({
      status: "error",
      report_data: { error: String(e) },
    }).eq("id", assessment_id);
    await failFunctionRun(supabase, fnRun, e, { metadata: { assessment_id } });
   }
  })());

  return json({ accepted: true, assessment_id }, 202);
});
