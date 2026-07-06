// grade-single-assessment — standalone, admin-gated one-off grader for a
// SINGLE cppa_assessments row (Doc W step 4f baseline for BELIEVED fixture,
// and future Doc R Cyber/ADMT believed fixtures).
//
// CONSTRAINTS (Doc W follow-on):
//  1. Admin-gated via has_role — never anon-invocable.
//  2. Read-only over the assessment. Never writes to cppa_assessments,
//     quality_loop2_baselines, quality_loop2_results, quality_loop2_runs,
//     tool_run_meter, or any product-baseline table.
//  3. Reuses the RUBRIC_GENERAL prompt VERBATIM from run-quality-batch,
//     but as an inline copy — run-quality-batch is NOT imported, edited,
//     or referenced. Its rubric checklist IDs, weights, and grader model
//     choices are duplicated read-only so drift would show up in code diff.
//  4. Writes only to quality_loop2_notes (kind: 'believed_fixture_baseline')
//     — never upserts the 'cppa-risk' product key or any legacy key.
//  5. Standalone invocation only — never wired into ql2-orchestrator
//     or run-stress-job.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}

// ---- BEGIN verbatim copy from run-quality-batch (RUBRIC_GENERAL + prompt) ----
// Kept in sync manually. Do NOT mutate here — this is a read-only mirror so
// run-quality-batch's rubric stays the single source of truth for the loop.
type RubricCheck = { id: string; dimension: string; severity: string; description: string };
const RUBRIC_GENERAL: RubricCheck[] = [
  { id: "rubric_generic_boilerplate",       dimension: "analysis",      severity: "medium",
    description: "Reasoning is generic boilerplate that could apply to any company; not tailored to THIS intake's facts." },
  { id: "rubric_unsupported_business_claim", dimension: "hallucination", severity: "high",
    description: "Document asserts facts about the business that are not in the intake (invented users, revenue, jurisdictions, etc.)." },
  { id: "rubric_actionability",             dimension: "intelligence",  severity: "medium",
    description: "Recommendations are not actionable for a real compliance professional (vague, no owner, no trigger)." },
  { id: "rubric_internal_reasoning_leak",   dimension: "formatting",    severity: "high",
    description: "Internal AI reasoning/meta-commentary visible in customer-facing text (\"as an AI\", \"based on the provided\", \"my analysis\")." },
  { id: "rubric_citation_misapplied",       dimension: "citation",      severity: "high",
    description: "A real cited section is applied to the wrong proposition (right citation, wrong claim)." },
];
function rubricChecklistText(checks: RubricCheck[]): string {
  return checks.map(c => `- id: "${c.id}"  [${c.dimension}/${c.severity}] — ${c.description}`).join("\n");
}
function buildRubricSystemPrompt(role: "claude" | "gpt"): string {
  const checks = RUBRIC_GENERAL;
  return `You are a quality assurance reviewer (${role.toUpperCase()}) for an AI-generated legal compliance document platform.

Evaluate the document against the FIXED checklist below. Score each dimension 0–100.

DIMENSIONS:
1. accuracy       — Legal conclusions correct for the intake facts.
2. citation       — Cited sections are real, correctly numbered, and correctly applied.
3. hallucination  — HIGHER = LESS hallucination. No invented facts or non-existent regulations.
4. analysis       — Reasoning is specific to THIS intake, not generic boilerplate.
5. intelligence   — Output is actionable for a real compliance professional.
6. formatting     — Clean output; no AI meta-commentary.

CORPUS-VERIFIED RECENT AMENDMENTS (do not deduct for these): the platform's legal corpus is verified against official texts, including changes that may postdate your training knowledge. The following are CORRECT statements of current law; treat them as accurate, do not flag them for verification, and do not deduct from any dimension for asserting them: (1) Cal. Civ. Code § 1798.82, as amended by SB 446 (effective January 1, 2026): individual notice within 30 calendar days of discovery or notification per (a)(2)(A); for breaches affecting more than 500 California residents, a single sample copy to the California Attorney General within 15 calendar days of consumer notice per (f); both statutory delay allowances retained per (a)(2)(B). (2) CCPA post-CPRA subsection lettering in Cal. Civ. Code § 1798.140: 'service provider' is defined at subsection (ag), not the pre-2020 (v) lettering. (3) UK GDPR Article 6(11), inserted by the Data (Use and Access) Act 2025 (recognised-legitimate-interests examples: direct marketing, intra-group transmission for internal administrative purposes, network and information security). This list is exhaustive: it does not license any OTHER uncited or unverifiable legal claim, and all normal citation and hallucination scrutiny continues to apply to everything else.

CHECKLIST (evaluate ONLY these; use the EXACT id given; do not add, rename, or omit):
${rubricChecklistText(checks)}

Return ONLY valid JSON of this exact shape:
{
  "dimension_scores": { "accuracy": 0-100, "citation": 0-100, "hallucination": 0-100, "analysis": 0-100, "intelligence": 0-100, "formatting": 0-100 },
  "overall_score": 0-100,
  "findings": [
    { "check_id": "<EXACT id from the checklist above>", "dimension": "...", "severity": "...", "passed": true|false, "evidence": "quoted text or null" }
  ],
  "strengths": ["..."],
  "critical_failures": ["..."]
}`;
}
// Weights mirror weightsFor("cppa-risk") in run-quality-batch (non-editorial path).
const WEIGHTS = { accuracy: 0.30, citation: 0.25, hallucination: 0.20, analysis: 0.15, intelligence: 0.05, formatting: 0.05 };
// ---- END verbatim copy ----

async function claudeCall(system: string, user: string, maxTokens = 5000): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-opus-4-6", max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.content?.[0]?.text ?? "";
}

async function gptCall(system: string, user: string, maxTokens = 3000): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o", max_tokens: maxTokens, response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) throw new Error(`GPT ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}

function tryParse(s: string): any { try { return JSON.parse(s); } catch { const m = s.match(/\{[\s\S]*\}/); return m ? (() => { try { return JSON.parse(m[0]); } catch { return null; } })() : null; } }

function computeOverall(scores: any): number {
  return Math.round(
    (scores.accuracy ?? 60) * WEIGHTS.accuracy +
    (scores.citation ?? 60) * WEIGHTS.citation +
    (scores.hallucination ?? 60) * WEIGHTS.hallucination +
    (scores.analysis ?? 60) * WEIGHTS.analysis +
    (scores.intelligence ?? 60) * WEIGHTS.intelligence +
    (scores.formatting ?? 60) * WEIGHTS.formatting
  );
}

async function gradeOne(role: "claude" | "gpt", intake: any, report: any) {
  const sys = buildRubricSystemPrompt(role);
  const user = `TOOL: cppa-risk\nINTAKE: ${JSON.stringify(intake ?? {}).slice(0, 2500)}\nREPORT: ${JSON.stringify(report ?? {}).slice(0, 18000)}\nEvaluate this report. Quote actual text as evidence for each finding.`;
  const raw = role === "claude" ? await claudeCall(sys, user) : await gptCall(sys, user);
  const parsed = tryParse(raw);
  if (!parsed?.dimension_scores) throw new Error(`${role} returned no dimension_scores`);
  const overall = computeOverall(parsed.dimension_scores);
  return { dimension_scores: parsed.dimension_scores, overall_score: overall, findings: parsed.findings ?? [], strengths: parsed.strengths ?? [], critical_failures: parsed.critical_failures ?? [] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "missing_authorization" }, 401);
  const token = authHeader.slice(7).trim();

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "invalid_jwt" }, 401);
  const userId = userData.user.id;

  const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) return json({ error: "admin_only" }, 403);

  let body: { assessment_id?: string; fixture_label?: string; dry_run?: boolean } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  if (!body.assessment_id) return json({ error: "missing_assessment_id" }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: row, error: selErr } = await admin
    .from("cppa_assessments")
    .select("id, intake_data, report_data, status, created_at")
    .eq("id", body.assessment_id)
    .maybeSingle();
  if (selErr) return json({ error: selErr.message }, 500);
  if (!row) return json({ error: "assessment_not_found" }, 404);
  if (!row.report_data) return json({ error: "assessment_not_generated" }, 400);


  let claudeRes: any = null, claudeErr: string | null = null;
  let gptRes: any = null, gptErr: string | null = null;
  try { claudeRes = await gradeOne("claude", row.intake_data, row.report_data); }
  catch (e) { claudeErr = (e as Error).message; }
  try { gptRes = await gradeOne("gpt", row.intake_data, row.report_data); }
  catch (e) { gptErr = (e as Error).message; }

  const payload = {
    assessment_id: row.id,
    fixture_label: body.fixture_label ?? "believed_fixture",
    graded_at: new Date().toISOString(),
    graded_by: userId,
    tool: "cppa-risk",
    claude: claudeRes ? { overall_score: claudeRes.overall_score, dimension_scores: claudeRes.dimension_scores, findings_count: claudeRes.findings.length, critical_failures: claudeRes.critical_failures } : { error: claudeErr },
    gpt: gptRes ? { overall_score: gptRes.overall_score, dimension_scores: gptRes.dimension_scores, findings_count: gptRes.findings.length, critical_failures: gptRes.critical_failures } : { error: gptErr },
    note: "One-off grader (grade-single-assessment). NOT a product baseline. Never used by ql2-orchestrator or run-stress-job.",
  };

  let stored_note_id: string | null = null;
  if (!body.dry_run) {
    // Constraint 4: only quality_loop2_notes, distinctly keyed.
    const { data: noteRow, error: noteErr } = await admin
      .from("quality_loop2_notes")
      .insert({ kind: "believed_fixture_baseline", note: JSON.stringify(payload) })
      .select("id")
      .single();
    if (noteErr) return json({ error: `note_insert_failed: ${noteErr.message}`, payload }, 500);
    stored_note_id = noteRow?.id ?? null;
  }

  return json({ ok: true, stored_note_id, payload });
});
