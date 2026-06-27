// run-quality-batch — orchestrates one "Run N Tests" press.
// Pipeline: generate intakes → build docs → Claude eval → GPT eval →
//           cross-review → aggregate → propose fixes.
// Returns 202 immediately. All work in EdgeRuntime.waitUntil().

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY       = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_KEY  = Deno.env.get("ANTHROPIC_API_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Per-invocation chunk size: slow tools get 1 doc, fast tools get 2.
const SLOW_TOOLS = new Set(["governance", "cppa-risk", "cppa-admt", "registration"]);
const docsPerInvocation = (tool: string) => (SLOW_TOOLS.has(tool) ? 1 : 2);
const EVALUATION_TIMEOUT_MS = 90_000;
const CROSS_REVIEW_TIMEOUT_MS = 45_000;
const HEARTBEAT_INTERVAL_MS = 10_000;

// B3: editorial tools — score accuracy + citation + no-adaptive-guidance, drop
// structured-field checks, zero `formatting` weight. The 5pp from formatting
// rolls into `accuracy` so the overall score still sums to 100.
const EDITORIAL_TOOLS = new Set([
  "ask-privacy", "weekly-brief", "custom-brief", "trend-report", "state-law",
]);
const isEditorial = (tool: string) => EDITORIAL_TOOLS.has(tool);
function weightsFor(tool: string) {
  return isEditorial(tool)
    ? { accuracy: 0.35, citation: 0.25, hallucination: 0.20, analysis: 0.15, intelligence: 0.05, formatting: 0 }
    : { accuracy: 0.30, citation: 0.25, hallucination: 0.20, analysis: 0.15, intelligence: 0.05, formatting: 0.05 };
}


type Admin = ReturnType<typeof createClient>;

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}

// Per-call wall-clock cap so one stalled upstream API can't burn the whole function budget.
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

async function claude(system: string, user: string, maxTokens = 4000, model = "claude-opus-4-6", signal?: AbortSignal): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    signal: signal ?? AbortSignal.timeout(90_000),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.content?.[0]?.text ?? "";
}

async function gpt4o(system: string, user: string, maxTokens = 3000): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) throw new Error(`GPT-4o ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}

async function o3(system: string, user: string, maxTokens = 3000): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "o3",
      max_completion_tokens: maxTokens,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!r.ok) throw new Error(`o3 ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}

function tryParse(t: string): any | null {
  const c = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(c); } catch { /* */ }
  const m = c.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

async function invokeFn(name: string, body: unknown): Promise<any> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SERVICE_KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(600_000),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${name} ${r.status}: ${JSON.stringify(d).slice(0, 200)}`);
  return d;
}

interface Check {
  id: string; dimension: string; severity: string;
  run: (intake: any, report: any) => { passed: boolean; evidence?: string };
}

const CHECKS: Check[] = [
  {
    id: "adtech_not_significant_decision", dimension: "accuracy", severity: "critical",
    run: (intake, report) => {
      const domains: string[] = intake?.decision_domains ?? [];
      if (!domains.some(d => /advertising|adtech|audience/i.test(d))) return { passed: true };
      const triggers = report?.scope_analysis?.triggers_significant_decision;
      if (triggers === true || triggers === "true")
        return { passed: false, evidence: `triggers_significant_decision=true for advertising domain` };
      return { passed: true };
    },
  },
  {
    id: "gaming_not_significant_decision", dimension: "accuracy", severity: "critical",
    run: (intake, report) => {
      const domains: string[] = intake?.decision_domains ?? [];
      const desc: string = intake?.system_description ?? "";
      if (!domains.some(d => /entertainment|gaming/i.test(d)) && !/gaming|entertainment/i.test(desc))
        return { passed: true };
      const triggers = report?.scope_analysis?.triggers_significant_decision;
      if (triggers === true || triggers === "true")
        return { passed: false, evidence: `triggers_significant_decision=true for gaming/entertainment` };
      return { passed: true };
    },
  },
  {
    id: "art11_gate_enforced", dimension: "accuracy", severity: "critical",
    run: (_intake, report) => {
      const triggers = report?.scope_analysis?.triggers_significant_decision;
      if (triggers === true || triggers === "true") return { passed: true };
      const gaps = [
        ...(report?.notice_gaps ?? []),
        ...(report?.opt_out_gaps ?? []),
        ...(report?.access_gaps ?? []),
      ].filter((g: any) => g.status !== "compliant");
      if (gaps.length)
        return { passed: false, evidence: `${gaps.length} Article 11 gaps populated despite triggers_significant_decision=false` };
      return { passed: true };
    },
  },
  {
    id: "no_7221_c_5", dimension: "citation", severity: "high",
    run: (_intake, report) => {
      const s = JSON.stringify(report ?? "");
      const idx = s.indexOf("7221(c)(5)");
      if (idx >= 0)
        return { passed: false, evidence: `§ 7221(c)(5) found: ...${s.slice(Math.max(0, idx - 40), idx + 60)}...` };
      return { passed: true };
    },
  },
  {
    id: "no_7152_a_3_trade_secret", dimension: "citation", severity: "high",
    run: (_intake, report) => {
      const s = JSON.stringify(report ?? "");
      if (s.includes("7152(a)(3)"))
        return { passed: false, evidence: "§ 7152(a)(3) cited as ADMT trade-secret exception — incorrect" };
      return { passed: true };
    },
  },
  {
    id: "no_british_spelling", dimension: "formatting", severity: "medium",
    run: (_intake, report) => {
      const s = JSON.stringify(report ?? "").toLowerCase();
      const hits = ["personalise", "recognise", "organisation", "colour", "behaviour", "analyse"]
        .filter(w => s.includes(w));
      if (hits.length) return { passed: false, evidence: `British spelling: ${hits.join(", ")}` };
      return { passed: true };
    },
  },
  {
    id: "no_prompt_artifacts", dimension: "formatting", severity: "high",
    run: (_intake, report) => {
      const s = JSON.stringify(report ?? "").toLowerCase();
      const hits = ["provided authority block", "provided subset", "regulations typically require",
        "while not explicitly covered", "based on the provided", "authority block only includes",
        "note: the provided"].filter(a => s.includes(a));
      if (hits.length) return { passed: false, evidence: `Prompt artifact: ${hits[0]}` };
      return { passed: true };
    },
  },
  {
    id: "no_double_numbering", dimension: "formatting", severity: "medium",
    run: (_intake, report) => {
      const actions: string[] = report?.priority_actions ?? [];
      const bad = actions.filter(a => /^\s*\d+[.)]\s*\d+[.)]/.test(a));
      if (bad.length) return { passed: false, evidence: `Double-numbered: "${bad[0].slice(0, 80)}"` };
      return { passed: true };
    },
  },
  {
    id: "notice_gaps_when_inscope", dimension: "accuracy", severity: "high",
    run: (_intake, report) => {
      const triggers = report?.scope_analysis?.triggers_significant_decision;
      if (triggers !== true && triggers !== "true") return { passed: true };
      if (!report?.notice_gaps?.length)
        return { passed: false, evidence: "notice_gaps empty despite triggers_significant_decision=true" };
      return { passed: true };
    },
  },
  {
    id: "overall_status_present", dimension: "formatting", severity: "medium",
    run: (_intake, report) => {
      if (!report?.overall_status)
        return { passed: false, evidence: "overall_status field missing or empty" };
      return { passed: true };
    },
  },
  {
    id: "no_hallucinated_section_numbers", dimension: "citation", severity: "high",
    run: (_intake, report) => {
      const s = JSON.stringify(report ?? "");
      const bad = [...s.matchAll(/§\s*(\d{4,5})(?:\([a-z0-9]+\))*/gi)]
        .map(m => parseInt(m[1]))
        .filter(n => n > 100 && n < 7000);
      if (bad.length)
        return { passed: false, evidence: `Suspicious section numbers outside known range: ${[...new Set(bad)].slice(0, 3).map(n => `§ ${n}`).join(", ")}` };
      return { passed: true };
    },
  },
];

const CLAUDE_RUBRIC_SYSTEM = `You are a quality assurance reviewer for an AI-generated legal compliance document platform. Evaluate the compliance report against this 6-dimension rubric and return structured JSON.

DIMENSIONS:
1. accuracy (0-100): Legal conclusions correct for the intake facts. Scope analysis right. Exceptions properly analyzed.
2. citation (0-100): All cited sections are real, correctly numbered, and correctly applied to the proposition being cited.
3. hallucination (0-100, higher = LESS hallucination): No invented facts, non-existent regulations, or unsupported claims about the business.
4. analysis (0-100): Reasoning is specific to THIS business's facts — not generic boilerplate that could apply to anyone.
5. intelligence (0-100): Output is genuinely useful and actionable for a real compliance professional.
6. formatting (0-100): No double-numbered lists, no prompt artifacts, no British spelling in US documents, clean layout.

ALWAYS flag as critical failures:
- Advertising classified as a "significant decision" under CPPA § 7001(ddd)
- Gaming service eligibility classified as a "significant decision"
- § 7221(c)(5) cited for denied opt-out appeals
- § 7152(a)(3) cited as ADMT trade-secret exception
- Gap arrays populated when triggers_significant_decision is false
- Any invented section numbers (real ADMT sections: 7001, 7150-7157, 7200-7222)

Return ONLY valid JSON:
{
  "dimension_scores": { "accuracy": 0-100, "citation": 0-100, "hallucination": 0-100, "analysis": 0-100, "intelligence": 0-100, "formatting": 0-100 },
  "overall_score": 0-100,
  "llm_findings": [
    { "check_id": "snake_case_id", "dimension": "accuracy|citation|hallucination|analysis|intelligence|formatting", "severity": "critical|high|medium|low", "passed": true|false, "evidence": "specific quoted text or null", "proposed_fix": "exact prompt text change to prevent this, or null" }
  ],
  "strengths": ["what the document does well"],
  "critical_failures": ["descriptions of critical failures, empty array if none"]
}`;

async function evaluateDocumentClaude(tool: string, intake: any, report: any): Promise<any> {
  const detFindings = CHECKS.map(c => {
    try {
      const r = c.run(intake ?? {}, report ?? {});
      return { check_id: c.id, check_type: "deterministic", dimension: c.dimension, severity: c.severity, passed: r.passed, evidence: r.evidence ?? null, proposed_fix: null };
    } catch (e) {
      return { check_id: c.id, check_type: "deterministic", dimension: c.dimension, severity: c.severity, passed: false, evidence: `Error: ${(e as Error).message?.slice(0, 80)}`, proposed_fix: null };
    }
  });

  let claudeResult: any = null;
  try {
    const raw = await claude(CLAUDE_RUBRIC_SYSTEM, `TOOL: ${tool}\nINTAKE: ${JSON.stringify(intake ?? {}).slice(0, 2500)}\nREPORT: ${JSON.stringify(report ?? {}).slice(0, 18000)}\nEvaluate this report. Quote actual text as evidence for each finding.`, 5000);
    claudeResult = tryParse(raw);
  } catch (e) {
    console.warn("[run-quality-batch] Claude rubric eval failed:", (e as Error).message);
  }

  const llmFindings = (claudeResult?.llm_findings ?? []).map((f: any) => ({ ...f, check_type: "llm" }));
  const scores = {
    accuracy:      claudeResult?.dimension_scores?.accuracy      ?? 60,
    citation:      claudeResult?.dimension_scores?.citation      ?? 60,
    hallucination: claudeResult?.dimension_scores?.hallucination ?? 60,
    analysis:      claudeResult?.dimension_scores?.analysis      ?? 60,
    intelligence:  claudeResult?.dimension_scores?.intelligence  ?? 60,
    formatting:    claudeResult?.dimension_scores?.formatting    ?? 60,
  };
  for (const f of detFindings) {
    if (!f.passed) {
      const penalty = f.severity === "critical" ? 25 : f.severity === "high" ? 12 : f.severity === "medium" ? 6 : 2;
      (scores as any)[f.dimension] = Math.max(0, (scores as any)[f.dimension] - penalty);
    }
  }
  const overall = Math.round(scores.accuracy * 0.30 + scores.citation * 0.25 + scores.hallucination * 0.20 + scores.analysis * 0.15 + scores.intelligence * 0.05 + scores.formatting * 0.05);
  return { dimension_scores: scores, overall_score: overall, findings: [...detFindings, ...llmFindings], strengths: claudeResult?.strengths ?? [], critical_failures: claudeResult?.critical_failures ?? [] };
}

const GPT_RUBRIC_SYSTEM = `You are a quality assurance reviewer for an AI-generated legal compliance document platform. Evaluate the compliance document against a 6-dimension rubric and return structured JSON.

EVALUATION DIMENSIONS (score each 0-100):
1. accuracy: Are the legal conclusions correct for the described facts? Is the scope analysis right?
2. citation: Are all cited sections real, correctly numbered, and correctly applied?
3. hallucination: Score HIGHER for LESS hallucination. No invented facts or non-existent regulations.
4. analysis: Is the reasoning specific to THIS business's facts, or generic boilerplate?
5. intelligence: Is the output genuinely useful and actionable for a real compliance professional?
6. formatting: Clean output — no double-numbered lists, no internal AI commentary, no British spelling in US documents.

FLAG as critical failures:
- Advertising classified as a "significant decision" under any privacy regulation
- Gaming or entertainment service eligibility classified as a "significant decision"
- Any section number that appears invented or outside the known range for this regulation
- Internal AI reasoning visible in customer-facing text
- Gap arrays populated when the scope analysis says obligations are not triggered

Return ONLY valid JSON:
{
  "dimension_scores": { "accuracy": 0-100, "citation": 0-100, "hallucination": 0-100, "analysis": 0-100, "intelligence": 0-100, "formatting": 0-100 },
  "overall_score": 0-100,
  "findings": [
    { "check_id": "descriptive_snake_case_id", "dimension": "accuracy|citation|hallucination|analysis|intelligence|formatting", "severity": "critical|high|medium|low", "passed": true|false, "evidence": "exact quoted text or null" }
  ],
  "strengths": ["what the document does well"],
  "critical_failures": ["critical failures, empty array if none"]
}`;

async function evaluateDocumentGPT(tool: string, intake: any, report: any): Promise<{ eval: any | null; skipReason?: string; error?: string }> {
  if (!OPENAI_API_KEY) {
    return { eval: null, skipReason: "OPENAI_API_KEY not set in edge function env" };
  }
  try {
    const raw = await gpt4o(GPT_RUBRIC_SYSTEM, `TOOL: ${tool}\nINTAKE: ${JSON.stringify(intake ?? {}).slice(0, 2000)}\nDOCUMENT TO EVALUATE: ${JSON.stringify(report ?? {}).slice(0, 15000)}\nEvaluate this compliance document. Quote actual text as evidence for each finding.`, 3000);
    const parsed = tryParse(raw);
    if (!parsed?.dimension_scores) {
      return { eval: null, error: `GPT returned unexpected structure (first 120 chars: ${raw.slice(0, 120)})` };
    }
    return { eval: parsed };
  } catch (e) {
    return { eval: null, error: (e as Error).message };
  }
}

const CROSS_REVIEW_SYSTEM = `You are a senior privacy compliance reviewer reconciling two independent AI evaluations of the same compliance document. Identify where the evaluators agree, disagree, and what disagreements reveal about the document generator's weaknesses.

Categorise each finding as:
- "agree": Both evaluators reached the same conclusion. High confidence.
- "claude_only": Claude flagged it, GPT did not. Could be over-flagging or GPT missing it.
- "gpt_only": GPT flagged it, Claude did not. HIGHEST PRIORITY — Claude has a blind spot. Propose a rubric addition to fix it.
- "conflict": Both flagged it with substantially different evidence or conclusions. Needs manual legal review.

Return ONLY valid JSON:
{
  "dimension_scores_reconciled": { "accuracy": 0-100, "citation": 0-100, "hallucination": 0-100, "analysis": 0-100, "intelligence": 0-100, "formatting": 0-100 },
  "overall_score_reconciled": 0-100,
  "findings": [
    {
      "check_id": "string",
      "dimension": "accuracy|citation|hallucination|analysis|intelligence|formatting",
      "severity": "critical|high|medium|low",
      "category": "agree|claude_only|gpt_only|conflict",
      "passed": true|false,
      "evidence_claude": "Claude's evidence or null",
      "evidence_gpt": "GPT's evidence or null",
      "reconciled_conclusion": "One sentence conclusion for a human reviewer",
      "rubric_addition": "If gpt_only: exact text to add to Claude's rubric to catch this in future. Otherwise null."
    }
  ],
  "summary": "2-3 sentence plain-language cross-review summary",
  "gpt_only_findings": ["check_ids where GPT caught something Claude missed"],
  "conflict_findings": ["check_ids where evaluators disagreed"]
}`;

async function crossReviewEvaluations(tool: string, intake: any, report: any, claudeEval: any, gptEval: any): Promise<any | null> {
  if (!gptEval) return null;
  try {
    const userMsg = `TOOL: ${tool}
INTAKE: ${JSON.stringify(intake ?? {}).slice(0, 1500)}
DOCUMENT: ${JSON.stringify(report ?? {}).slice(0, 5000)}
CLAUDE'S EVALUATION: ${JSON.stringify({ dimension_scores: claudeEval?.dimension_scores, overall_score: claudeEval?.overall_score, findings: claudeEval?.findings?.filter((f: any) => !f.passed) ?? [], critical_failures: claudeEval?.critical_failures ?? [] })}
GPT-4o'S EVALUATION: ${JSON.stringify({ dimension_scores: gptEval?.dimension_scores, overall_score: gptEval?.overall_score, findings: gptEval?.findings?.filter((f: any) => !f.passed) ?? [], critical_failures: gptEval?.critical_failures ?? [] })}
Reconcile these evaluations. Identify all agreements, disagreements, and blind spots.`;
    // Cross-review uses claude-haiku-4-5 — same instruction-following, ~10× faster than o3.
    const raw = await claude(CROSS_REVIEW_SYSTEM, userMsg, 3000, "claude-haiku-4-5-20251001");
    return tryParse(raw);
  } catch (e) {
    console.warn("[run-quality-batch] cross-review failed (non-fatal):", (e as Error).message);
    return null;
  }
}

async function generateIntakes(tool: string, count: number): Promise<any[]> {
  const toolDescriptions: Record<string, string> = {
    "cppa-admt": `CPPA ADMT compliance assessment. Required fields: system_name, system_type, system_description, decision_domains (array — use: employment, financial_services, healthcare, advertising, entertainment_personalization, service_eligibility), human_review, training_data_use, profiling_use, notice_delivery (array), notice_has_specific_purpose, notice_purpose_text, notice_has_opt_out_desc, notice_has_access_desc, notice_has_anti_retaliation, notice_has_how_it_works, notice_has_alternative_process, opt_out_exception, opt_out_methods (array), opt_out_link_title, opt_out_no_cookie_banner, opt_out_no_account_required, opt_out_confirmation_mechanism, opt_out_appeal_process, opt_out_fairness_doc, opt_out_15_day_process, access_submission_methods, access_verification_process, access_logic_disclosure, access_outcome_disclosure, access_response_timeline, access_trade_secret_policy, ca_consumer_count, prior_access_requests_12mo. Include a mix: 2 advertising/adtech (NOT significant decisions), 2 gaming (NOT significant decisions), 2 HR/employment (significant decisions), 2 fintech credit scoring (significant decisions), 1 healthcare AI (significant decision), 1 recommendation engine (NOT significant decision).`,
    "lia": `Legitimate Interests Assessment. Return objects matching the li_assessments table schema EXACTLY (no extra columns or the insert will fail). Required top-level fields: stage (literal "final"), status (literal "pending"), organization_name (string — note US spelling), processing_description (string, >=80 chars, specific), relationship_type (string, e.g. "Existing customer (direct)","Prospect (indirect — from data broker)","Employee","Patient (indirect — from clinic)"), data_categories (string[] from ["Contact details","Identifiers","Financial data","Health or medical data","Biometric data","Location data","Device/technical data","Behavioural / browsing data","Inferences","Sensitive data — other"]), jurisdictions (string[] from ["EU (GDPR)","United Kingdom (UK GDPR)","US — California (CCPA/CPRA)","US — other state","Canada (PIPEDA)","Other"]), sector (string), stated_purpose (string), alternatives_considered (string). Plus three JSONB blocks: purpose_details: { interest_holder, interest_type, purpose_text }; necessity_details: { alternatives, why_consent_not_used, data_minimised, pseudonymisation_options }; balancing_details: { reasonable_expectation, vulnerable_subjects (string[]), potential_harm, safeguards (string[]), opt_out_mechanism, special_category_data (boolean), employment_safeguards, statutory_restrictions, balancing_text }. Vary sectors (Healthcare, FinTech, Logistics, Retail, AdTech, HR) and posture — some well-balanced, some weak safeguards, some questionable necessity. DO NOT emit fields named organisation_name, processing_activity, legitimate_interest_claimed, necessity_analysis, balancing_test_factors, data_subject_expectations, or safeguards (top-level) — these columns do not exist.`,
    "dpia": `DPIA Framework. Fields: organisation_name, processing_activity_name, processing_description, legal_basis, data_categories (array), data_subjects, scale, duration, third_parties, transfers, new_technology_or_method, systematic_nature.`,
    "cppa-risk": `CPPA Risk Assessment — FIVE-STAGE intake schema (Cal. Code Regs. tit. 11 §§ 7150–7158). Return objects with EXACTLY these top-level keys: triggers, exceptions, activity_details, impact, org_context, annual_consumer_volume.

triggers (object of booleans): sells_or_shares_pi, targeted_advertising, profiling_significant_effects, sensitive_pi_beyond_enumerated, high_volume_processing, admt_involved. At least one must be true.

exceptions (object — eight § 7152(a)(1)–(8) keys, each an object): fraud_detection, security_integrity, debugging, transient_use, internal_research, employment_context, legal_compliance, consumer_request. Each value: { claimed: boolean, scope: string, safeguards: string, documented: boolean }. When claimed=false, scope/safeguards may be empty strings.

activity_details (array): one block per triggered activity that is NOT fully covered by an exception. Each block: { trigger_key: string (one of the trigger keys), data_categories: string[] (subset of ["name/contact","identifiers","financial","health","biometric","location","browsing/search history","inferences","sensitive PI","other"]), consumer_categories: string[] (subset of ["customers","website visitors","employees","minors under 16","minors under 13","vulnerable populations","general public"]), purpose_description: string (>=50 chars, specific — not generic phrases like "to improve our service"), business_benefits: string, consumer_benefits: string, current_safeguards: string, known_gaps: string, third_party_recipients: string, cross_context_tracking: boolean, profiling_inferences: boolean, children_in_scope: boolean }.

impact: { likelihood_of_harm: "Remote"|"Possible"|"Likely"|"Near certain", severity_of_harm: "Minimal"|"Moderate"|"Significant"|"Severe", harm_types: string[] (from ["Financial harm","Physical harm","Discrimination","Reputational harm","Emotional distress","Chilling effects on free expression","Unauthorised disclosure","Identity theft / fraud"]), vulnerable_populations_detail: string, benefits_outweigh_risks: "Yes — clearly"|"Yes — with mitigation"|"Uncertain"|"No — risks outweigh benefits", benefits_outweigh_risks_rationale: string (>=100 chars), cybersecurity_gaps_identified: boolean, prior_assessments_conducted: boolean, prior_assessment_date: string (ISO date or "") }.

org_context: { company_name: string, sector: string, annual_revenue_threshold: string (e.g. "<$25M","$25M–$100M","$100M–$500M",">$500M"), privacy_counsel_engaged: boolean, dpo_or_privacy_officer: boolean, board_level_oversight: boolean, existing_privacy_programme: string, cppa_audit_notification_received: boolean, additional_context: string }.

annual_consumer_volume: string (approximate count).

Vary the scenarios: AdTech (multi-trigger, contested transient_use exception), Healthcare SaaS (sensitive PI, well-documented security/debugging/research/legal exceptions), HR/employment-context-only (single employment_context exception), FinTech credit scoring (profiling_significant_effects + ADMT + cybersecurity gaps), small retailer below thresholds (mostly false triggers — should result in voluntary review), and a high-risk profiling/minors scenario (children_in_scope=true). Mix posture: some weak/undocumented exception claims, some clear gaps, some well-controlled.`,
    "cppa-cyber": `CPPA Cybersecurity Audit. Fields: company_name, industry_sector, profile (object: incidents_12mo, framework, last_audit), controls (object mapping control IDs to [status, notes]).`,
    "governance": `Governance Assessment. Same fields as CPPA risk assessment.`,
    "dpa-generator": `Data Processing Agreement (DPA) generator. Required camelCase fields exactly: controllerName (string), controllerJurisdiction (e.g. "UK","DE","US-CA","EU"), processorName (string), processorJurisdiction (string), services (one-line description of the processing services), dataCategories (array of strings, e.g. ["name","email","IP address","behavioral data"]), dataSubjectCount (string range like "1000-10000"), retention (string like "3 years"), hasSubProcessors (boolean), subProcessorList (string, only if hasSubProcessors is true), legalFramework (one of "GDPR","UK GDPR","CCPA","PIPEDA","Dual EU/US"), auditRights (string description), includeTransferClause (boolean), transferMechanism (string — "Standard Contractual Clauses","Adequacy decision","Binding Corporate Rules", or "N/A"), documentType (one of "gdpr","us-state","canada","dual-eu-us","dual-eu-ca"). Vary sectors (AdTech, Healthcare, FinTech, HR) and jurisdictions; include some intra-EU and some cross-border transfers.`,
    "ir-playbook": `Incident Response Playbook generator. Required camelCase fields exactly: organizationName (string), discoveryDateTime (ISO date-time within the last 7 days), cause (e.g. "Ransomware attack","Phishing-led credential theft","Misconfigured S3 bucket","Insider exfiltration","Third-party vendor breach"), dataTypes (array, e.g. ["PII","health information","financial records","credentials"]), affectedCount (string range like "1000-10000"), jurisdictions (array of ISO codes like ["US-CA","US-TX","UK","EU"]), processorInvolved (boolean), processorName (string, only if processorInvolved), contained (one of "Yes","Partially","No","Under investigation"), organisationType (sector string). Vary sectors (Healthcare, Retail, FinTech, EdTech) and severity.`,
    "biometric-checker": `Biometric compliance checker. Required camelCase fields exactly: orgName (string), orgType (sector string), biometricTypes (array — e.g. ["facial geometry"],["fingerprint","hand geometry"],["iris scan","fingerprint"]), purpose (string — e.g. "Loss prevention","Workforce time and attendance","Physical access control"), jurisdictions (array of US-state codes like ["US-IL"],["US-TX"],["US-WA"]), enrolledCount (string range like "500-5000"). Vary compliance posture: include some with no written policy, some without informed consent, some with third-party sharing, some with undefined retention.`,

    // B3: editorial / customer-facing Anthropic generators below — score against
    // the editorial rubric (accuracy + citation + no-adaptive-guidance; drop
    // structured-field checks; formatting weight = 0).
    "registration": `Registration Manager filing checklist. Required camelCase fields exactly: organizationName (string), organizationType (sector string), processingActivities (string, one-line description of the processing), dataCategories (array of strings, e.g. ["personal data","health data","biometric data","financial data","children's data"]), recordsProcessed (string range like "5000-50000"), jurisdictions (array of jurisdiction codes, e.g. ["FR","DE","UK","ES","IT"]), hasDPO (boolean), crossBorderTransfers (boolean), highRiskProcessing (boolean), aiActHighRisk (boolean), urgency ("Standard"|"Expedited"|"Audit-triggered"). Vary postures (well-prepared vs missing DPO appointment vs unclear cross-border transfer mechanism) and jurisdiction sets (single-state, multi-state, EEA+UK).`,
    "ask-privacy": `Ask Privacy — natural-language privacy/regulatory Q&A. Required field: question (string, 30-280 chars, a SPECIFIC operational privacy question). Vary topics: GDPR Art. 6 lawful basis edge cases, CPRA opt-out scope, EU AI Act high-risk classification, breach notification timelines per jurisdiction, sensitive-data definitions, cross-border transfer mechanisms post-Schrems II, ADMT pre-use notice timing, biometric data under BIPA vs TX CUBI, DPA controller/processor distinctions, DPO appointment thresholds. Mix easy vs ambiguous; include a few that should produce a "consult counsel" disclaimer.`,
    "weekly-brief": `Weekly Brief generator. Required camelCase fields: subscriberName (string), audience (one of "GC/CPO","Privacy Engineer","Compliance Analyst","Policy Researcher"), focusJurisdictions (array of region/state codes — e.g. ["EU","UK","US-CA","US-NY"]), focusTopics (array — e.g. ["enforcement","new legislation","DPA guidance","AI regulation","ad-tech"]), excludeTopics (array, may be empty), timeWindowDays (integer 7–14). Vary audience and breadth — some broad/multi-jurisdiction, some deep-niche (e.g. AdTech in California only).`,
    "custom-brief": `Custom Brief generator. Required camelCase fields: subscriberName (string), briefTitle (string, descriptive), researchQuestion (string, 60–280 chars, a specific research/horizon-scan question), jurisdictions (array of region/state codes), topics (array of focus topics), timeWindowDays (integer 14–90), depth (one of "summary","comprehensive"). Vary topics (ADMT, BIPA enforcement, EU AI Act, dark patterns, children's privacy, biometric privacy in retail, employee monitoring) and depth.`,
    "trend-report": `Trend Report generator. Required camelCase fields: theme (string, the trend theme — e.g. "AI Act high-risk classification convergence", "Biometric privacy enforcement trends 2026", "Cross-border transfer mechanism shifts post-Schrems II"), jurisdictions (array), industries (array, e.g. ["AdTech","HealthTech","FinTech","Retail","HR/EmpTech"]), timeWindowMonths (integer 3–24), audience (one of "Executive","Legal","Engineering"). Vary themes (some highly active, some quieter), audiences, and windows.`,
    "state-law": `US State Privacy Law check. Required camelCase fields: state (one of "California","Colorado","Connecticut","Virginia","Texas","Utah","Oregon","Washington","Maryland","Tennessee","Indiana","Iowa","Montana","Delaware","New Jersey","New Hampshire","Kentucky","Minnesota","Rhode Island"), businessType (sector string), processingActivities (string description), dataCategories (array including some sensitive types), consumerVolume (string range like "10000-100000"), sellsSharesPI (boolean), hasOptOutMechanism (boolean), question (string — a specific compliance question about this state's law). Vary states and posture (some near-threshold, some clearly in-scope, some borderline).`,
  };
  const description = toolDescriptions[tool] ?? `${tool} compliance tool. Use realistic and varied scenarios.`;
  const intakeTimeoutMs = tool === "cppa-risk" ? 300_000 : 180_000;
  const raw = await claude(
    `You generate realistic, varied test intake objects for privacy compliance tools. Use realistic company names and vary compliance posture — some nearly compliant, some with gaps, some edge cases. Never generate all-compliant inputs. Return ONLY a valid JSON array, no markdown.`,
    `Generate ${count} varied realistic intake objects for the "${tool}" compliance tool.\n\n${description}\n\nReturn a JSON array of exactly ${count} objects.`,
    8000,
    "claude-sonnet-4-6",
    AbortSignal.timeout(intakeTimeoutMs)
  );
  const parsed = tryParse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error(`Intake generator returned invalid data for ${tool}`);
  return parsed.slice(0, count);
}

async function buildDocument(admin: Admin, tool: string, intake: any, userId: string): Promise<{ sourceTable: string; sourceRowId: string; reportData: any } | null> {
  try {
    const poll = async (table: string, id: string) => {
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const { data } = await admin.from(table).select("status, report_data").eq("id", id).single();
        if ((data as any)?.status === "complete") return (data as any)?.report_data;
        if (["error", "failed", "cancelled"].includes((data as any)?.status ?? ""))
          throw new Error(`${table} status=${(data as any)?.status}`);
      }
      throw new Error(`timeout polling ${table}`);
    };

    if (tool === "cppa-admt") {
      const { data: rec, error } = await admin.from("cppa_assessments").insert({ user_id: userId, module: "admt", status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("run-admt-checker", { assessment_id: rec.id }).catch(() => {});
      return { sourceTable: "cppa_assessments", sourceRowId: rec.id, reportData: await poll("cppa_assessments", rec.id) };
    }
    if (tool === "cppa-risk") {
      const { data: rec, error } = await admin.from("cppa_assessments").insert({ user_id: userId, module: "risk_assessment", status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("run-cppa-risk-assessment", { assessment_id: rec.id }).catch(() => {});
      return { sourceTable: "cppa_assessments", sourceRowId: rec.id, reportData: await poll("cppa_assessments", rec.id) };
    }
    if (tool === "cppa-cyber") {
      const { data: rec, error } = await admin.from("cppa_assessments").insert({ user_id: userId, module: "cybersecurity", status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("run-cppa-cybersecurity", { assessment_id: rec.id }).catch(() => {});
      return { sourceTable: "cppa_assessments", sourceRowId: rec.id, reportData: await poll("cppa_assessments", rec.id) };
    }
    if (tool === "lia") {
      // Whitelist columns to li_assessments schema — drop any AI-hallucinated keys
      const LIA_COLS = ["stage","status","organization_name","processing_description","relationship_type","data_categories","jurisdictions","sector","stated_purpose","alternatives_considered","purpose_details","necessity_details","balancing_details","preview_signal"];
      const cleaned: any = {};
      for (const k of LIA_COLS) if (intake?.[k] !== undefined) cleaned[k] = intake[k];
      if (!cleaned.stage) cleaned.stage = "final";
      if (!cleaned.status) cleaned.status = "pending";
      const { data: rec, error } = await admin.from("li_assessments").insert({ ...cleaned, user_id: userId }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("run-li-assessment", { assessment_id: rec.id }).catch(() => {});
      return { sourceTable: "li_assessments", sourceRowId: rec.id, reportData: await poll("li_assessments", rec.id) };
    }
    if (tool === "dpia") {
      const { data: rec, error } = await admin.from("dpia_frameworks").insert({ ...intake, user_id: userId }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("run-dpia-framework", { framework_id: rec.id }).catch(() => {});
      return { sourceTable: "dpia_frameworks", sourceRowId: rec.id, reportData: await poll("dpia_frameworks", rec.id) };
    }
    if (tool === "governance") {
      const { data: rec, error } = await admin.from("governance_assessments").insert({ ...intake, user_id: userId }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("run-governance-assessment", { assessment_id: rec.id }).catch(() => {});
      return { sourceTable: "governance_assessments", sourceRowId: rec.id, reportData: await poll("governance_assessments", rec.id) };
    }
    if (tool === "dpa-generator") {
      const { data: rec, error } = await admin.from("dpa_documents").insert({ user_id: userId, status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("generate-dpa", { assessment_id: rec.id, user_id: userId }).catch(() => {});
      return { sourceTable: "dpa_documents", sourceRowId: rec.id, reportData: await poll("dpa_documents", rec.id) };
    }
    if (tool === "ir-playbook") {
      const { data: rec, error } = await admin.from("ir_playbooks").insert({ user_id: userId, status: "pending", intake_data: intake, organization_name: intake?.organizationName ?? "Test Org" }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("generate-ir-playbook", { assessment_id: rec.id, user_id: userId }).catch(() => {});
      return { sourceTable: "ir_playbooks", sourceRowId: rec.id, reportData: await poll("ir_playbooks", rec.id) };
    }
    if (tool === "biometric-checker") {
      const { data: rec, error } = await admin.from("biometric_assessments").insert({ user_id: userId, status: "pending", intake_data: intake }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      await invokeFn("check-biometric-compliance", { ...intake, assessment_id: rec.id, user_id: userId, stress_run: true });

      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 2500));
        const { data } = await admin.from("biometric_assessments")
          .select("status, analysis_text, report_data")
          .eq("id", rec.id).single();
        if ((data as any)?.status === "complete") {
          return {
            sourceTable: "biometric_assessments",
            sourceRowId: rec.id,
            reportData: { ...((data as any)?.report_data ?? {}), assessment_text: (data as any)?.analysis_text ?? "" },
          };
        }
        if (["error", "failed", "cancelled"].includes((data as any)?.status ?? ""))
          throw new Error(`biometric_assessments status=${(data as any)?.status}`);
      }
      throw new Error("timeout polling biometric_assessments");
    }

    // B3: Registration — fan-out filing generator. Poll registration_orders.
    if (tool === "registration") {
      const { data: rec, error } = await admin.from("registration_orders").insert({
        user_id: userId,
        status: "pending",
        intake_data: intake,
        organization_name: intake?.organizationName ?? "Test Org",
        jurisdictions: intake?.jurisdictions ?? [],
      }).select("id").single();
      if (error || !rec) throw new Error(`insert: ${error?.message}`);
      invokeFn("generate-registration-docs", { order_id: rec.id, user_id: userId }).catch(() => {});
      // Generous poll budget — multi-jurisdiction filings can run long.
      for (let i = 0; i < 240; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const { data } = await admin.from("registration_orders").select("status").eq("id", rec.id).single();
        const s = (data as any)?.status;
        if (s === "complete" || s === "generated") {
          const { data: docs } = await admin.from("registration_documents")
            .select("jurisdiction, document_type, content_text").eq("order_id", rec.id);
          return {
            sourceTable: "registration_orders",
            sourceRowId: rec.id,
            reportData: { documents: docs ?? [], document_count: docs?.length ?? 0 },
          };
        }
        if (["error", "failed", "cancelled"].includes(s ?? "")) throw new Error(`registration_orders status=${s}`);
      }
      throw new Error("timeout polling registration_orders");
    }

    // B3: editorial generators — call the edge function directly, capture the
    // JSON response as the document body. These don't have a per-row "complete"
    // status — the response IS the artifact.
    if (tool === "ask-privacy") {
      const resp = await invokeFn("ask-privacy", { ...intake, user_id: userId, stress_run: true });
      return { sourceTable: "(transient)", sourceRowId: crypto.randomUUID(), reportData: resp };
    }
    if (tool === "weekly-brief") {
      const resp = await invokeFn("generate-weekly-brief", { ...intake, user_id: userId, stress_run: true });
      return { sourceTable: "(transient)", sourceRowId: crypto.randomUUID(), reportData: resp };
    }
    if (tool === "custom-brief") {
      const resp = await invokeFn("generate-custom-brief", { ...intake, user_id: userId, stress_run: true });
      return { sourceTable: "(transient)", sourceRowId: crypto.randomUUID(), reportData: resp };
    }
    if (tool === "trend-report") {
      const resp = await invokeFn("generate-trend-report", { ...intake, user_id: userId, stress_run: true });
      return { sourceTable: "(transient)", sourceRowId: crypto.randomUUID(), reportData: resp };
    }
    if (tool === "state-law") {
      const resp = await invokeFn("check-state-privacy-laws", { ...intake, user_id: userId, stress_run: true });
      return { sourceTable: "(transient)", sourceRowId: crypto.randomUUID(), reportData: resp };
    }

    console.warn(`[run-quality-batch] no builder for tool: ${tool}`);
    return null;
  } catch (e) {
    console.warn(`[run-quality-batch] buildDocument failed:`, (e as Error).message);
    return null;
  }
}

async function generateProposedFix(tool: string, checkId: string, dimension: string, evidence: string[]): Promise<{ fix: string; location: string }> {
  const toolToEdgeFn: Record<string, string> = {
    "cppa-admt": "run-admt-checker", "cppa-risk": "run-cppa-risk-assessment",
    "cppa-cyber": "run-cppa-cybersecurity", "lia": "run-li-assessment",
    "dpia": "run-dpia-framework", "governance": "run-governance-assessment",
    "dpa-generator": "generate-dpa", "ir-playbook": "generate-ir-playbook",
    "biometric-checker": "check-biometric-compliance",
    // B3 — extended customer-facing Anthropic generators
    "registration": "generate-registration-docs",
    "ask-privacy": "ask-privacy",
    "weekly-brief": "generate-weekly-brief",
    "custom-brief": "generate-custom-brief",
    "trend-report": "generate-trend-report",
    "state-law": "check-state-privacy-laws",
  };
  const edgeFn = toolToEdgeFn[tool] ?? `run-${tool}`;
  const raw = await claude(
    `You are a prompt engineer for legal compliance AI systems. Given a failing quality check, write a precise targeted fix to the generation system prompt. Write the ACTUAL replacement text — not a description of what to change. Format as JSON: { "location": "where in the prompt", "new_text": "the complete replacement text" }`,
    `TOOL: ${tool}\nEDGE FUNCTION: ${edgeFn}\nFAILING CHECK: ${checkId}\nDIMENSION: ${dimension}\nEVIDENCE:\n${evidence.slice(0, 3).map((e, i) => `[${i + 1}] ${e}`).join("\n")}\nWrite the prompt patch.`,
    1500
  ).catch(() => "");
  const parsed = tryParse(raw);
  return { fix: parsed?.new_text ?? raw.slice(0, 1500), location: parsed?.location ?? `${edgeFn} system prompt — ${dimension} dimension` };
}

async function selfReinvoke(runId: string): Promise<void> {
  // Fire-and-forget self-call so the current invocation can return cleanly.
  // Each new invocation gets its own fresh runtime budget.
  fetch(`${SUPABASE_URL}/functions/v1/run-quality-batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "x-internal-resume": "1",
    },
    body: JSON.stringify({ resume_run_id: runId }),
  }).catch(e => console.warn("[run-quality-batch] self-reinvoke failed:", (e as Error).message));
}

type PartialState = {
  dimTotals: Record<string, number>;
  gptTotals: Record<string, number>;
  built: number;
  gptBuilt: number;
  allDocFindings: any[];
  logBuf: Array<{ t: string; level: string; msg: string }>;
};

function emptyState(): PartialState {
  return {
    dimTotals: { accuracy: 0, citation: 0, hallucination: 0, analysis: 0, intelligence: 0, formatting: 0 },
    gptTotals: { accuracy: 0, citation: 0, hallucination: 0, analysis: 0, intelligence: 0, formatting: 0 },
    built: 0,
    gptBuilt: 0,
    allDocFindings: [],
    logBuf: [],
  };
}

async function runBatch(runId: string): Promise<void> {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const upd = (data: any) => admin.from("quality_runs").update(data).eq("id", runId);

  // Heartbeat: write last_heartbeat_at every 10s independent of log messages.
  const heartbeat = setInterval(() => {
    admin.from("quality_runs").update({ last_heartbeat_at: new Date().toISOString() }).eq("id", runId)
      .then(() => {}, () => {});
  }, HEARTBEAT_INTERVAL_MS);

  // Load run state
  const { data: runRow, error: runErr } = await admin
    .from("quality_runs")
    .select("id, tool, batch_size, run_number, created_by, user_id, status, next_doc_index, intakes, partial_state, progress_log")
    .eq("id", runId).single();
  if (runErr || !runRow) {
    clearInterval(heartbeat);
    console.error("[run-quality-batch] cannot load run:", runErr?.message);
    return;
  }
  const run: any = runRow;
  const tool: string = run.tool;
  const batchSize: number = run.batch_size;
  const userId: string = run.user_id ?? run.created_by;
  const runNumber: number = run.run_number;

  const state: PartialState = run.partial_state ?? emptyState();
  // Restore log buffer from saved state OR from progress_log so log keeps appending across invocations.
  const logBuf: Array<{ t: string; level: string; msg: string }> =
    Array.isArray(state.logBuf) && state.logBuf.length
      ? state.logBuf
      : Array.isArray(run.progress_log) ? run.progress_log : [];
  state.logBuf = logBuf;

  const log = async (level: "info" | "warn" | "error" | "success", msg: string) => {
    const entry = { t: new Date().toISOString(), level, msg: String(msg).slice(0, 500) };
    logBuf.push(entry);
    if (level === "error" || level === "warn") console.warn(`[quality-batch ${level}]`, msg);
    else console.log(`[quality-batch]`, msg);
    try { await admin.from("quality_runs").update({ progress_log: logBuf, last_heartbeat_at: new Date().toISOString() }).eq("id", runId); } catch { /* */ }
  };

  const persistState = async (extra: Record<string, any> = {}) => {
    try {
      await admin.from("quality_runs").update({
        partial_state: state,
        last_heartbeat_at: new Date().toISOString(),
        ...extra,
      }).eq("id", runId);
    } catch { /* */ }
  };

  try {
    // ---------- 1. Intake generation (only on first invocation) ----------
    let intakes: any[] = Array.isArray(run.intakes) ? run.intakes : [];
    if (intakes.length === 0) {
      await log("info", `Starting run #${runNumber} for ${tool} (${batchSize} documents)`);
      await log(OPENAI_API_KEY ? "success" : "warn",
        OPENAI_API_KEY
          ? `OPENAI_API_KEY detected — GPT-4o cross-review enabled`
          : `OPENAI_API_KEY NOT detected — GPT-4o cross-review will be SKIPPED for every doc`);
      await upd({ status: "generating" });
      await log("info", `Generating ${batchSize} intake scenarios via Claude…`);
      try {
        intakes = await generateIntakes(tool, batchSize);
        await log("success", `Generated ${intakes.length} intake scenarios`);
      } catch (e) {
        await log("error", `Intake generation failed: ${(e as Error).message}`);
        await upd({ status: "error", error: `Intake generation failed: ${(e as Error).message}`, completed_at: new Date().toISOString() });
        clearInterval(heartbeat);
        return;
      }
      await admin.from("quality_runs").update({ intakes, status: "building" }).eq("id", runId);
    } else {
      await log("info", `Resuming run #${runNumber} for ${tool} at doc ${(run.next_doc_index ?? 0) + 1}/${intakes.length}`);
      await upd({ status: "building" });
    }

    // ---------- 2. Process chunk of docs ----------
    const startIdx = run.next_doc_index ?? 0;
    const chunkSize = docsPerInvocation(tool);
    const endIdx = Math.min(startIdx + chunkSize, intakes.length);

    for (let i = startIdx; i < endIdx; i++) {
      // Cancel check
      const { data: cancelCheck } = await admin.from("quality_runs").select("cancel_requested").eq("id", runId).single();
      if ((cancelCheck as any)?.cancel_requested) {
        await log("warn", `Run cancelled by user after ${i}/${intakes.length} documents`);
        await upd({ status: "cancelled", completed_at: new Date().toISOString(), error: "Cancelled by user" });
        clearInterval(heartbeat);
        return;
      }

      const intake = intakes[i];
      const docLabel = `Doc ${i + 1}/${intakes.length}`;
      await log("info", `${docLabel}: building…`);

      const { data: docRow } = await admin.from("quality_run_documents").insert({
        run_id: runId, tool, doc_number: i + 1, intake_data: intake, status: "building",
      }).select("id").single();
      if (!docRow) { await log("warn", `${docLabel}: could not insert doc row`); continue; }

      const result = await buildDocument(admin, tool, intake, userId);
      if (!result) {
        await log("warn", `${docLabel}: build failed`);
        await admin.from("quality_run_documents").update({ status: "error", error: "build failed" }).eq("id", docRow.id);
        continue;
      }

      await log("info", `${docLabel}: built — evaluating Claude + GPT-4o + cross-review in parallel…`);
      await admin.from("quality_run_documents").update({
        report_data: result.reportData, source_table: result.sourceTable,
        source_row_id: result.sourceRowId, status: "evaluating",
      }).eq("id", docRow.id);

      // Run Claude eval and GPT eval in parallel.
      const [claudeEval, gptResult] = await Promise.all([
        withTimeout(evaluateDocumentClaude(tool, intake, result.reportData), EVALUATION_TIMEOUT_MS, "Claude eval")
          .catch(e => { console.warn("Claude eval failed:", e.message); return null; }),
        withTimeout(evaluateDocumentGPT(tool, intake, result.reportData), EVALUATION_TIMEOUT_MS, "GPT-4o eval")
          .catch(e => ({ eval: null as any, error: e.message })),
      ]);

      if (!claudeEval) {
        await log("error", `${docLabel}: Claude evaluation failed or timed out`);
        await admin.from("quality_run_documents").update({ status: "error", error: "Claude evaluation failed or timed out" }).eq("id", docRow.id);
        continue;
      }
      const gptEval = gptResult.eval;
      if (gptEval) {
        await log("success", `${docLabel}: GPT-4o OK (overall ${gptEval.overall_score}/100)`);
      } else if (gptResult.skipReason) {
        await log("warn", `${docLabel}: GPT-4o SKIPPED — ${gptResult.skipReason}`);
      } else {
        await log("error", `${docLabel}: GPT-4o FAILED — ${gptResult.error ?? "unknown error"}`);
      }

      // Cross-review (depends on both prior evals, so run after).
      const crossReview = await withTimeout(
        crossReviewEvaluations(tool, intake, result.reportData, claudeEval, gptEval),
        CROSS_REVIEW_TIMEOUT_MS, "Cross-review",
      ).catch(e => { console.warn("Cross-review failed:", e.message); return null; });

      await log("success", `${docLabel}: scored ${claudeEval.overall_score}/100${gptEval ? ` (GPT ${gptEval.overall_score}/100)` : ""}`);

      const finalScores  = crossReview?.dimension_scores_reconciled ?? claudeEval.dimension_scores;
      const finalOverall = crossReview?.overall_score_reconciled    ?? claudeEval.overall_score;

      for (const dim of Object.keys(state.dimTotals)) {
        state.dimTotals[dim] += (finalScores as any)[dim] ?? 60;
      }
      if (gptEval?.dimension_scores) {
        for (const dim of Object.keys(state.gptTotals)) {
          state.gptTotals[dim] += (gptEval.dimension_scores as any)[dim] ?? 60;
        }
        state.gptBuilt++;
      }
      state.built++;

      const crossStatus = !gptEval ? "gpt_failed" : !crossReview ? "pending" : "complete";

      await admin.from("quality_run_documents").update({
        dimension_scores: { ...finalScores, overall: finalOverall },
        overall_score: finalOverall,
        gpt_evaluation: gptEval ?? null,
        gpt_dimension_scores: gptEval?.dimension_scores ?? null,
        gpt_overall_score: gptEval?.overall_score ?? null,
        cross_review: crossReview ?? null,
        cross_review_status: crossStatus,
        status: "complete",
      }).eq("id", docRow.id);

      const findingRows = claudeEval.findings.map((f: any) => ({
        run_id: runId, doc_id: docRow.id, tool, run_number: runNumber,
        check_id: f.check_id, check_type: f.check_type, dimension: f.dimension,
        severity: f.severity, passed: f.passed, evidence: f.evidence ?? null,
      }));
      if (findingRows.length) await admin.from("quality_findings").insert(findingRows);

      const crossFindingsMap = new Map<string, any>(
        (crossReview?.findings ?? []).map((f: any) => [f.check_id, f])
      );
      state.allDocFindings.push(...claudeEval.findings.map((f: any) => ({
        ...f,
        doc_id: docRow.id,
        cross_category: crossFindingsMap.get(f.check_id)?.category ?? null,
        cross_evidence_gpt: crossFindingsMap.get(f.check_id)?.evidence_gpt ?? null,
        rubric_addition: crossFindingsMap.get(f.check_id)?.rubric_addition ?? null,
      })));

      const claudeCheckIds = new Set(claudeEval.findings.map((f: any) => f.check_id));
      for (const gptFinding of (gptEval?.findings ?? []).filter((f: any) => !f.passed)) {
        if (!claudeCheckIds.has(gptFinding.check_id)) {
          state.allDocFindings.push({
            check_id: gptFinding.check_id, check_type: "gpt_only",
            dimension: gptFinding.dimension, severity: gptFinding.severity,
            passed: false, evidence: gptFinding.evidence ?? null, doc_id: docRow.id,
            cross_category: "gpt_only", cross_evidence_gpt: gptFinding.evidence ?? null,
            rubric_addition: crossFindingsMap.get(gptFinding.check_id)?.rubric_addition ?? null,
          });
        }
      }

      await persistState({ next_doc_index: i + 1 });
    }

    // ---------- 3. More work? Self-reinvoke ----------
    if (endIdx < intakes.length) {
      await log("info", `Chunk complete (${endIdx}/${intakes.length}). Self-reinvoking for next chunk…`);
      await persistState({ next_doc_index: endIdx });
      selfReinvoke(runId);
      clearInterval(heartbeat);
      return;
    }

    // ---------- 4. Final aggregation ----------
    if (state.built === 0) {
      await log("error", `No documents completed successfully`);
      await upd({ status: "error", completed_at: new Date().toISOString(), error: "No documents completed" });
      clearInterval(heartbeat);
      return;
    }

    await upd({ status: "evaluating" });
    await log("info", `All documents processed (${state.built}/${intakes.length} built). Aggregating scores…`);

    const avg = (v: number) => state.built > 0 ? Math.round(v / state.built) : 0;
    const scores = {
      accuracy: avg(state.dimTotals.accuracy), citation: avg(state.dimTotals.citation),
      hallucination: avg(state.dimTotals.hallucination), analysis: avg(state.dimTotals.analysis),
      intelligence: avg(state.dimTotals.intelligence), formatting: avg(state.dimTotals.formatting),
    };
    const w = weightsFor(tool);
    const overall = Math.round(scores.accuracy * w.accuracy + scores.citation * w.citation + scores.hallucination * w.hallucination + scores.analysis * w.analysis + scores.intelligence * w.intelligence + scores.formatting * w.formatting);

    const byCheck = new Map<string, any[]>();
    for (const f of state.allDocFindings) {
      if (!byCheck.has(f.check_id)) byCheck.set(f.check_id, []);
      byCheck.get(f.check_id)!.push(f);
    }

    // Cap exists because Claude fix-generation is the long pole. Running batches of
    // FIX_CONCURRENCY in parallel lets us raise MAX_AI_FIXES well above the sequential ceiling
    // while staying inside the edge runtime budget.
    const MAX_AI_FIXES = 50;
    const FIX_CONCURRENCY = 5;
    type CheckAgg = {
      checkId: string; findings: any[]; first: any;
      passed: number; failed: number; failRate: number; evidence: string[];
      crossCategory: string | null; gptEvidence: string[]; rubricAddition: string | null;
      severityRank: number;
    };
    const aggregates: CheckAgg[] = [];
    for (const [checkId, findings] of byCheck) {
      const passed   = findings.filter(f => f.passed).length;
      const failed   = findings.filter(f => !f.passed).length;
      const failRate = findings.length ? failed / findings.length : 0;
      const evidence = findings.filter(f => !f.passed && f.evidence).map(f => f.evidence).slice(0, 3);
      const first    = findings[0];

      const gptOnlyCount  = findings.filter(f => f.cross_category === "gpt_only").length;
      const conflictCount = findings.filter(f => f.cross_category === "conflict").length;
      const agreeCount    = findings.filter(f => f.cross_category === "agree").length;
      let crossCategory: string | null = null;
      if (gptOnlyCount > 0)          crossCategory = "gpt_only";
      else if (conflictCount > 0)    crossCategory = "conflict";
      else if (agreeCount > 0)       crossCategory = "agree";
      else if (findings.some(f => !f.passed)) crossCategory = "claude_only";

      const gptEvidence    = findings.filter(f => f.cross_evidence_gpt).map(f => f.cross_evidence_gpt).slice(0, 3);
      const rubricAddition = findings.filter(f => f.rubric_addition).map(f => f.rubric_addition)[0] ?? null;
      const sev = String(first?.severity ?? "").toLowerCase();
      const severityRank = sev === "critical" ? 3 : sev === "high" ? 2 : sev === "medium" ? 1 : 0;

      aggregates.push({ checkId, findings, first, passed, failed, failRate, evidence, crossCategory, gptEvidence, rubricAddition, severityRank });
    }

    // Skip check_ids already successfully patched into this tool's file recently —
    // avoids proposing (and re-applying) the same instruction across separate runs.
    const { data: recentlyApplied, error: recentLookupErr } = await admin
      .from("quality_applied_patches")
      .select("check_id")
      .eq("tool", tool)
      .gte("applied_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (recentLookupErr) {
      console.warn("[run-quality-batch] dedup lookup failed, proceeding without it:", recentLookupErr.message);
    }
    const alreadyFixedIds = new Set((recentlyApplied ?? []).map((r: any) => r.check_id));

    // Rank candidates for AI fix-generation: needs evidence, failRate>0.2, no rubric override,
    // not a conflict (those require manual legal review). Sort by severity then impact (failed × failRate).
    const aiCandidates = aggregates
      .filter(a => !a.rubricAddition && a.failRate > 0.2 && a.evidence.length > 0 && a.crossCategory !== "conflict")
      .filter(a => !alreadyFixedIds.has(a.checkId))
      .sort((x, y) => (y.severityRank - x.severityRank) || (y.failed * y.failRate - x.failed * x.failRate))
      .slice(0, MAX_AI_FIXES);

    await log("info", `Aggregating ${byCheck.size} unique checks; generating AI fixes for top ${aiCandidates.length} (cap ${MAX_AI_FIXES}, concurrency ${FIX_CONCURRENCY})…`);

    // Run fix-generation in parallel batches so we can raise the cap without exceeding runtime.
    const fixResults = new Map<string, { fix: string; location: string } | null>();
    for (let i = 0; i < aiCandidates.length; i += FIX_CONCURRENCY) {
      const batch = aiCandidates.slice(i, i + FIX_CONCURRENCY);
      const settled = await Promise.all(batch.map(a =>
        withTimeout(
          generateProposedFix(tool, a.checkId, a.first.dimension, a.evidence),
          30_000,
          `generateProposedFix(${a.checkId})`,
        ).catch(e => { console.warn(`[fix-gen] skipped ${a.checkId}:`, e?.message); return null; })
      ));
      batch.forEach((a, idx) => fixResults.set(a.checkId, settled[idx] ?? null));
    }

    for (const a of aggregates) {
      let proposedFix = a.rubricAddition ?? "";
      let fixLocation = a.rubricAddition
        ? "Evaluator rubric — add to CLAUDE_RUBRIC_SYSTEM in run-quality-batch/index.ts"
        : "";

      if (!proposedFix && fixResults.has(a.checkId)) {
        const fix = fixResults.get(a.checkId);
        proposedFix = fix?.fix ?? "";
        fixLocation = fix?.location ?? "";
      }

      // RX-1b: if this check was filtered out because it was already patched recently,
      // surface that explicitly instead of showing a blank fix.
      if (!proposedFix && alreadyFixedIds.has(a.checkId)) {
        fixLocation = "DUPLICATE: already applied in a prior run — see quality_applied_patches";
      }

      const gptFailed  = a.findings.filter(f => !f.passed && f.cross_category === "gpt_only").length;
      const gptPassed  = Math.max(0, state.gptBuilt - gptFailed);
      const gptFailRate = state.gptBuilt > 0 ? gptFailed / state.gptBuilt : 0;

      await admin.from("quality_check_results").upsert({
        run_id: runId, tool, run_number: runNumber, check_id: a.checkId,
        check_type: a.first.check_type, dimension: a.first.dimension, severity: a.first.severity,
        pass_count: a.passed, fail_count: a.failed, fail_rate: a.failRate,
        sample_evidence: a.evidence,
        gpt_pass_count: gptPassed, gpt_fail_count: gptFailed, gpt_fail_rate: gptFailRate,
        gpt_sample_evidence: a.gptEvidence.length ? a.gptEvidence : null,
        cross_review_category: a.crossCategory,
        cross_review_summary: a.rubricAddition
          ? `GPT-only finding — Claude missed this. Proposed rubric addition: ${a.rubricAddition.slice(0, 120)}…`
          : a.crossCategory === "agree" ? "Both evaluators agree on this finding."
          : a.crossCategory === "conflict" ? "Evaluators disagree — requires manual legal review."
          : null,
        proposed_fix: proposedFix || null,
        fix_location: fixLocation || null,
        fix_selected: false, fix_applied: false,
      }, { onConflict: "run_id,check_id" });
    }

    const gptAvg = (v: number) => state.gptBuilt > 0 ? Math.round(v / state.gptBuilt) : null;
    const gptScores = state.gptBuilt > 0 ? {
      gpt_score_accuracy:      gptAvg(state.gptTotals.accuracy),
      gpt_score_citation:      gptAvg(state.gptTotals.citation),
      gpt_score_hallucination: gptAvg(state.gptTotals.hallucination),
      gpt_score_analysis:      gptAvg(state.gptTotals.analysis),
      gpt_score_intelligence:  gptAvg(state.gptTotals.intelligence),
      gpt_score_formatting:    gptAvg(state.gptTotals.formatting),
      gpt_score_overall: Math.round(
        (gptAvg(state.gptTotals.accuracy) ?? 0) * w.accuracy + (gptAvg(state.gptTotals.citation) ?? 0) * w.citation +
        (gptAvg(state.gptTotals.hallucination) ?? 0) * w.hallucination + (gptAvg(state.gptTotals.analysis) ?? 0) * w.analysis +
        (gptAvg(state.gptTotals.intelligence) ?? 0) * w.intelligence + (gptAvg(state.gptTotals.formatting) ?? 0) * w.formatting
      ),
    } : {};

    const gptOnlyTotal  = state.allDocFindings.filter(f => f.cross_category === "gpt_only" && !f.passed).length;
    const conflictTotal = state.allDocFindings.filter(f => f.cross_category === "conflict").length;

    await upd({
      status: "complete", completed_at: new Date().toISOString(),
      score_accuracy: scores.accuracy, score_citation: scores.citation,
      score_hallucination: scores.hallucination, score_analysis: scores.analysis,
      score_intelligence: scores.intelligence, score_formatting: scores.formatting,
      score_overall: overall,
      checks_total: state.allDocFindings.length,
      checks_passed: state.allDocFindings.filter(f => f.passed).length,
      checks_failed: state.allDocFindings.filter(f => !f.passed).length,
      ...gptScores,
      cross_review_complete: state.gptBuilt > 0,
      gpt_only_count: gptOnlyTotal,
      conflict_count: conflictTotal,
    });
    await log("success", `Run complete — overall score ${overall}/100 (${state.allDocFindings.filter(f => !f.passed).length} failures across ${byCheck.size} checks)`);

    // Aggregate snapshot
    try {
      const num = (n: number) => parseFloat(Number(n ?? 0).toFixed(2));
      const agreeTotal     = state.allDocFindings.filter(f => f.cross_category === "agree").length;
      const claudeOnlyTot  = state.allDocFindings.filter(f => f.cross_category === "claude_only").length;
      await admin.from("quality_score_ledger").insert({
        tool_name: tool,
        run_date: new Date().toISOString(),
        quality_run_id: runId,
        overall_score: num(overall),
        accuracy_score: num(scores.accuracy),
        completeness_score: num(scores.analysis),
        citation_quality_score: num(scores.citation),
        regulatory_coverage_score: num(scores.intelligence),
        actionability_score: num(scores.formatting),
        consistency_score: num(scores.hallucination),
        documents_evaluated: state.built,
        findings_count: state.allDocFindings.length,
        agree_count: agreeTotal,
        claude_only_count: claudeOnlyTot,
        gpt_only_count: gptOnlyTotal,
        conflict_count: conflictTotal,
      });
    } catch (ledgerErr) {
      console.error("[run-quality-batch] ledger insert failed:", ledgerErr);
    }

  } catch (e) {
    console.error("[run-quality-batch] fatal:", e);
    await log("error", `Fatal: ${(e as Error).message}`);
    await upd({ status: "error", error: (e as Error).message?.slice(0, 300), completed_at: new Date().toISOString() }).catch(() => {});
  } finally {
    clearInterval(heartbeat);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized: missing bearer token" }, 401);
  const token = authHeader.replace("Bearer ", "");

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  // ---------- Resume path: called by self-reinvoke with service-role bearer ----------
  const isInternalResume = req.headers.get("x-internal-resume") === "1" && token === SERVICE_KEY;
  if (isInternalResume) {
    const resumeId: string | undefined = body?.resume_run_id;
    if (!resumeId) return json({ error: "resume_run_id required" }, 400);
    // @ts-ignore
    EdgeRuntime.waitUntil(runBatch(resumeId));
    return json({ resumed: resumeId }, 202);
  }

  // ---------- Normal path: admin user starts a new run ----------
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized", detail: claimsErr?.message ?? "no claims" }, 401);
  const userId = claimsData.claims.sub as string;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) return json({ error: "Admin only" }, 403);

  const { tool, batch_size: requestedBatch } = body;
  const batch_size = requestedBatch ?? 5;
  if (!tool) return json({ error: "tool required" }, 400);

  const { count } = await admin.from("quality_runs").select("id", { count: "exact", head: true }).eq("tool", tool);
  const runNumber = (count ?? 0) + 1;

  const { data: run, error: rErr } = await admin.from("quality_runs").insert({
    tool, status: "pending", batch_size, run_number: runNumber,
    created_by: userId, user_id: userId,
    started_at: new Date().toISOString(),
    last_heartbeat_at: new Date().toISOString(),
    next_doc_index: 0,
  }).select("id").single();
  if (rErr || !run) return json({ error: `run insert: ${rErr?.message}` }, 500);

  // @ts-ignore
  EdgeRuntime.waitUntil(runBatch(run.id));
  return json({ run_id: run.id, tool, batch_size, run_number: runNumber }, 202);
});
