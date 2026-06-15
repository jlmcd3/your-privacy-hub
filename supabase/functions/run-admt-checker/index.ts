// supabase/functions/run-admt-checker/index.ts
// ADMT Compliance Checker — gap analysis generator.
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

    const system = `You are a California privacy compliance specialist analyzing a business's ADMT compliance under CPPA final regulations (11 CCR Article 11, §§ 7200–7222, effective January 1, 2027).

Your task: produce a structured gap analysis identifying what the business is doing correctly, what is missing or deficient, and specific remediation steps for each gap. Every finding must cite the specific regulation paragraph (e.g., "§ 7220(c)(1)"). Do not invent citations.

Return ONLY valid JSON — no markdown, no preamble.`;

    const userPrompt = `Analyze this business's ADMT compliance and produce a gap report.

ADMT SYSTEM: ${intake.system_name}
DESCRIPTION: ${intake.system_description}
DECISION DOMAINS: ${(intake.decision_domains ?? []).join("; ")}
HUMAN REVIEW: ${intake.human_review}
TRAINS ADMT ON PI: ${intake.training_data_use}
PROFILING USE: ${intake.profiling_use}

PRE-USE NOTICE:
- Delivery: ${(intake.notice_delivery ?? []).join("; ")}
- Has specific purpose: ${intake.notice_has_specific_purpose}
- Purpose text: ${intake.notice_purpose_text || "(not provided)"}
- Opt-out described: ${intake.notice_has_opt_out_desc}
- Access right described: ${intake.notice_has_access_desc}
- Anti-retaliation: ${intake.notice_has_anti_retaliation}
- How ADMT works: ${intake.notice_has_how_it_works}
- Alternative process: ${intake.notice_has_alternative_process}

OPT-OUT:
- Approach: ${intake.opt_out_exception}
- Methods: ${(intake.opt_out_methods ?? []).join("; ")}
- Link title: ${intake.opt_out_link_title || "(not provided)"}
- No cookie-banner-only: ${intake.opt_out_no_cookie_banner}
- No account required: ${intake.opt_out_no_account_required}
- Confirmation mechanism: ${intake.opt_out_confirmation_mechanism}
- Appeal process: ${intake.opt_out_appeal_process || "(not applicable)"}
- Fairness documentation: ${intake.opt_out_fairness_doc || "(not applicable)"}

ACCESS RIGHT:
- Submission methods: ${intake.access_submission_methods}
- Verification process: ${intake.access_verification_process}
- Logic disclosure: ${intake.access_logic_disclosure}
- Outcome disclosure: ${intake.access_outcome_disclosure}
- Response timeline: ${intake.access_response_timeline}
- Trade secret policy: ${intake.access_trade_secret_policy || "(not documented)"}

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
    "triggers_significant_decision": true | false,
    "triggers_risk_assessment": true | false,
    "triggers_profiling": true | false,
    "summary": "2-3 sentence plain-language scope conclusion"
  },
  "notice_gaps": [
    { "element": "...", "status": "compliant|gap|missing", "finding": "...", "citation": "11 CCR § 7220(c)(X)", "remediation": "..." }
  ],
  "opt_out_gaps": [
    { "element": "...", "status": "compliant|gap|missing", "finding": "...", "citation": "11 CCR § 7221(X)", "remediation": "..." }
  ],
  "access_gaps": [
    { "element": "...", "status": "compliant|gap|missing", "finding": "...", "citation": "11 CCR § 7222(X)", "remediation": "..." }
  ],
  "risk_assessment_note": "one sentence",
  "priority_actions": ["...", "...", "..."],
  "compliant_elements": ["..."]
}`;

    const rawText = await callGateway(system, userPrompt, 6000);
    const report = tryParseJson(rawText);

    if (!report) {
      await supabase.from("cppa_assessments").update({
        status: "error",
        report_data: { error: "parse_failed", raw: rawText.slice(0, 500) },
      }).eq("id", assessment_id);
      return json({ error: "parse_failed" }, 502);
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
