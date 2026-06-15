// supabase/functions/run-admt-checker/index.ts
// ADMT Compliance Assessment — gap analysis generator.
// Pipeline: retrieve corpus → generate gap analysis JSON → persist.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY") ?? "";

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

async function callGateway(system: string, user: string, maxTokens: number): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(720_000),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gateway ${res.status}: ${t.slice(0, 300)}`);
  }
  const d = await res.json();
  return d.choices?.[0]?.message?.content || "";
}

function tryParseJson(text: string): any | null {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); } catch { /* fall through */ }
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

  await supabase.from("cppa_assessments").update({ status: "processing" }).eq("id", assessment_id);

  try {
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

    const system = `You are a senior California privacy compliance attorney producing a formal ADMT compliance assessment under CPPA final regulations (11 CCR Article 11, §§ 7200–7222, effective January 1, 2027).

This assessment will be reviewed by in-house counsel and may be shared with outside legal advisors. It must meet a law-firm standard: every conclusion must show its reasoning; every gap must identify the specific regulatory text violated; every exception claim must be tested against statutory requirements, not just accepted.

ANALYTICAL STANDARDS:
1. Scope analysis must show REASONING, not just conclusions. For each trigger, explain specifically why the system description does or does not meet the statutory definition. Quote relevant elements of the system description in your reasoning.
2. Exception qualification: if the user claims a § 7221(b) exception, analyze whether the facts they described actually satisfy the statutory requirements. A user who claims the human appeal exception but describes a reviewer who cannot override the output does NOT qualify — say so explicitly. A fairness exception that lacks documented disparity testing does NOT qualify — say so explicitly. Be direct: this is legal analysis, not customer service.
3. Enforcement exposure: for each Missing or Gap item, include an enforcement_exposure field estimating per-violation exposure ($2,663 unintentional / $7,988 intentional per Cal. Civ. Code § 1798.155(a)) and note that the CPPA's technology team actively scans for ADMT non-compliance without requiring a consumer complaint.
4. Operational gaps: test not just notice content but operational process. A business with an opt-out link but no documented 15-business-day compliance process has a gap under § 7221(e)–(g).
5. Third-party ADMT: if third-party tools are listed, note that the business remains the responsible party under CCPA regardless of whether the ADMT is proprietary or licensed.
6. Risk assessment obligation: produce a detailed risk_assessment_obligation section (not just a one-line note) that states the specific triggers, deadlines, attestation requirement, and executive certification requirement.
7. Documentation requirements: produce a documentation_checklist array listing what the business must be able to produce to the CPPA on demand.

Return ONLY valid JSON — no markdown, no preamble.`;

    const userPrompt = `Produce a formal ADMT compliance assessment for this business.

ADMT SYSTEM: ${intake.system_name}
SYSTEM TYPE: ${intake.system_type || "(not provided)"}
DESCRIPTION: ${intake.system_description}
CALIFORNIA CONSUMERS PROCESSED ANNUALLY: ${intake.ca_consumer_count || "(not provided)"}
DECISION DOMAINS: ${(intake.decision_domains ?? []).join("; ")}
HUMAN REVIEW: ${intake.human_review}
TRAINS ADMT ON PI: ${intake.training_data_use}
PROFILING USE: ${intake.profiling_use}
THIRD-PARTY ADMT TOOLS: ${intake.third_party_admt || "(none disclosed)"}

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
- Approach / exception claimed: ${intake.opt_out_exception}
- Opt-out methods provided: ${(intake.opt_out_methods ?? []).join("; ")}
- Opt-out link title: ${intake.opt_out_link_title || "(not provided)"}
- Not relying on cookie banner only: ${intake.opt_out_no_cookie_banner}
- No account creation required to opt out: ${intake.opt_out_no_account_required}
- Confirmation mechanism: ${intake.opt_out_confirmation_mechanism}
- Appeal/human review process (if claiming human appeal exception): ${intake.opt_out_appeal_process || "(not described)"}
- Fairness/non-discrimination testing (if claiming employment/education exception): ${intake.opt_out_fairness_doc || "(not described)"}
- 15-business-day opt-out compliance process: ${intake.opt_out_15_day_process || "(not described — operational gap)"}

ACCESS RIGHT:
- Submission methods: ${intake.access_submission_methods}
- Identity verification process: ${intake.access_verification_process}
- Logic disclosure: ${intake.access_logic_disclosure}
- Outcome disclosure: ${intake.access_outcome_disclosure}
- Response timeline: ${intake.access_response_timeline}
- Trade secret / security carve-out policy: ${intake.access_trade_secret_policy || "(not documented)"}

REGULATION AUTHORITIES:
${authBlock}

COMPLIANCE DEADLINES:
${deadlineBlock}

Return this JSON structure:
{
  "system_name": "${intake.system_name}",
  "compliance_deadline": "January 1, 2027",
  "overall_status": "compliant" | "gaps_identified" | "significant_gaps",

  "scope_analysis": {
    "is_admt": true | false,
    "is_admt_reasoning": "Specific reasoning citing elements of the system description that do or do not satisfy § 7001(e)",
    "triggers_significant_decision": true | false,
    "significant_decision_reasoning": "Specific reasoning citing which § 7001(ddd) category applies and why",
    "triggers_risk_assessment": true | false,
    "risk_assessment_reasoning": "Which § 7150 trigger(s) apply and why",
    "triggers_profiling": true | false,
    "human_review_qualifies": true | false,
    "human_review_reasoning": "Does the described human review satisfy § 7001(e)(1)(A)-(C)? Show reasoning.",
    "exception_qualification": {
      "exception_claimed": "name of exception or 'none'",
      "qualifies": true | false | "uncertain",
      "qualification_reasoning": "Detailed analysis of whether the facts described satisfy the statutory requirements for this exception. Be direct — if they don't qualify, say so."
    },
    "third_party_note": "If third-party ADMT tools were listed, note that the business remains the CCPA-responsible party",
    "summary": "3-4 sentence plain-language scope conclusion incorporating the reasoning above"
  },

  "enforcement_context": {
    "per_violation_unintentional": 2663,
    "per_violation_intentional": 7988,
    "ca_consumer_count": "${intake.ca_consumer_count || 'not provided'}",
    "aggregate_exposure_note": "Based on the consumer volume provided and the gaps identified, a single uncorrected pattern violation affecting all in-scope consumers could generate exposure of [calculate or note 'consumer count not provided']. The CPPA actively scans for ADMT non-compliance without requiring a consumer complaint (see PlayOn Sports settlement, March 2026: $1.1M for a company that self-identified and remediated months before agency contact).",
    "proactive_enforcement_note": "The CPPA's technology team autonomously scans public-facing websites for non-compliance, including broken opt-out mechanisms and missing ADMT notices, without any consumer complaint."
  },

  "notice_gaps": [
    {
      "element": "specific notice element name",
      "status": "compliant|gap|missing",
      "finding": "Specific finding citing what was provided and what is required",
      "citation": "11 CCR § 7220(c)(X)",
      "remediation": "Specific remediation steps",
      "enforcement_exposure": "Per-violation exposure for this element and why",
      "sample_language": null
    }
  ],

  "opt_out_gaps": [
    {
      "element": "specific opt-out element name",
      "status": "compliant|gap|missing",
      "finding": "Specific finding",
      "citation": "11 CCR § 7221(X)",
      "remediation": "Specific remediation steps",
      "enforcement_exposure": "Per-violation exposure",
      "sample_language": null
    }
  ],

  "access_gaps": [
    {
      "element": "specific access element name",
      "status": "compliant|gap|missing",
      "finding": "Specific finding",
      "citation": "11 CCR § 7222(X)",
      "remediation": "Specific remediation steps",
      "enforcement_exposure": "Per-violation exposure",
      "sample_language": null
    }
  ],

  "risk_assessment_obligation": {
    "required": true | false,
    "triggers": ["list of specific § 7150 triggers that apply"],
    "existing_activity_deadline": "December 31, 2027",
    "new_activity_deadline": "Before initiating new or modified processing",
    "attestation_deadline": "April 1, 2028 (for assessments conducted in 2026–2027)",
    "attestation_requirement": "Executive-certified attestation that risk assessments were completed, signed under penalty of perjury by a senior executive with direct compliance responsibility",
    "ag_demand_risk": "The California Attorney General may demand a copy of risk assessments at any time, independent of the 2028 deadline",
    "summary": "2-3 sentence plain-language description of what this business must do and by when"
  },

  "documentation_checklist": [
    {
      "item": "Document name/type",
      "description": "What it must contain",
      "retention": "How long to keep it",
      "regulatory_basis": "11 CCR § X"
    }
  ],

  "priority_actions": [
    "Numbered action with owner suggestion and specific deadline"
  ],

  "compliant_elements": ["list of compliant items"]
}`;

    const rawText = await callGateway(system, userPrompt, 8000);
    const report = tryParseJson(rawText);

    if (!report) {
      await supabase.from("cppa_assessments").update({
        status: "error",
        report_data: { error: "parse_failed", raw: rawText.slice(0, 500) },
      }).eq("id", assessment_id);
      return json({ error: "parse_failed" }, 502);
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

        const draftRaw = await callGateway(draftSystem, draftPrompt, 5000);
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

    return json({ success: true, assessment_id, status: "complete" });
  } catch (e) {
    console.error("[run-admt-checker] error:", e);
    await supabase.from("cppa_assessments").update({
      status: "error",
      report_data: { error: String(e) },
    }).eq("id", assessment_id);
    return json({ error: String(e) }, 500);
  }
});
