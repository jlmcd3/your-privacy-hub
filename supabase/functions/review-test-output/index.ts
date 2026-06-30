// review-test-output — single-output reviewer.
//
// Two modes:
// 1. Legacy `mode: "rubric"` (default) — original 1-5 dimension scoring used by
//    the assertion-test admin page. Backwards-compatible with prior callers.
// 2. Improvement-cycle `mode: "improvement"` — spec'd by the Quality Loop v2
//    framework. Accepts an explicit `model` (gpt-4o OR claude-sonnet-4-6),
//    scores 0-100 across six dimensions, and returns a flat `changes[]` list
//    that the dual-model consensus stage can rank.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

const DEFAULT_CLAUDE = "claude-sonnet-4-5-20250929";

const RUBRIC_SYSTEM_PROMPT = `You are a senior privacy-compliance editor reviewing the output of an automated GDPR/CCPA assessment tool.

Score the supplied test output on a 1-5 scale across exactly these five dimensions:
1. accuracy           — Is the legal/regulatory content factually correct? Are statutes, articles, dates, fines correct?
2. usability          — Would an end-user (DPO, privacy lead, small-business owner) understand and act on this?
3. tone_quality       — Is the writing clear, professional, free of filler, and appropriately confident vs hedged?
4. annotations        — Are citations, precedents, and references real, well-targeted, and correctly formatted?
5. mistakes_to_fix    — Is the output free of factual errors, hallucinations, contradictions, or broken structure?
                        (HIGHER score = FEWER mistakes. 5 = none found. 1 = serious errors throughout.)

Return STRICT JSON, no markdown fences, no commentary. Schema:
{
  "scores": { "accuracy": 1-5, "usability": 1-5, "tone_quality": 1-5, "annotations": 1-5, "mistakes_to_fix": 1-5 },
  "summary": "2-3 sentence overall verdict",
  "strengths": ["..."],
  "weaknesses": ["..."],
  "priority_fixes": [
    { "severity": "critical|high|medium|low", "issue": "...", "suggestion": "..." }
  ]
}`;

const IMPROVEMENT_SYSTEM_PROMPT = `You are a senior privacy-compliance reviewer auditing the output of an automated assessment generator.

Review the supplied TOOL OUTPUT for errors, inconsistencies, mistakes, erroneous references, incorrect citations, formatting issues, and hallucinations. List concrete improvements.

REVIEW DISCIPLINE — the generators under review produce DRAFT privacy-compliance documents and assessments. Apply these rules exactly; getting them wrong has produced real false positives:

1. TEMPLATE PLACEHOLDERS ARE NOT ERRORS. Square-bracket fill-in fields meant for the end-user or their counsel to complete — e.g. "[TO BE COMPLETED]", "[TO COMPLETE — …]", "[Owner: …]", "[X] days", "[verify …]", "[Generation Date]" — are intentional. Do NOT list them as changes, do NOT lower ANY score for their presence, and do NOT recommend "provide/fill in the value." Only flag a placeholder if a deterministic value the generator clearly should have computed itself is missing; when in doubt, treat it as intended.

2. THE CURRENT DATE (supplied in the user message) IS AUTHORITATIVE AND IS LATER THAN YOUR TRAINING CUTOFF. NEVER flag a date, timestamp, deadline, or cited event as "in the future", "future-dated", "temporally impossible", or "should be a past date" when it is at or before the current date. Generated documents are produced on the current date, so a generation timestamp at or near it is correct. Do NOT treat a regulation, guidance, or enforcement action as impossible merely because it post-dates your training.

3. DO NOT FLAG CITATIONS AS HALLUCINATIONS FROM MEMORY. Privacy law changes often and recent changes may post-date your training. Do NOT assert that a statute, article, section, or regulation citation is non-existent, wrong, or hallucinated solely because you do not recognise it, and do NOT recommend replacing one specific citation with another unless you are certain the original is wrong AND certain of the correct form. If a citation's currency is uncertain, record it at most as a LOW-severity "verify against current primary law" change — never a critical hallucination, never a silent substitution. Illustrative recent changes your training may predate (do NOT flag these as errors): the UK Data (Use and Access) Act 2025 inserted Article 6(11) and Article 6(1)(ea) into the UK GDPR (in force 5 Feb 2026); the CPPA ADMT, risk-assessment, and cybersecurity-audit regulations took effect 1 Jan 2026.

4. DO NOT ASSERT OUTDATED LAW AS A FIX. Only recommend a legal correction you are confident reflects CURRENT law. Prefer "verify X against current primary law" over asserting a specific substitute requirement. For example, do not claim a controller must register or notify a DPA where general registration has been abolished (e.g. France/CNIL general registration ended under the GDPR in 2018). Likewise, do NOT claim that no EU–US adequacy mechanism exists, or recommend removing EU–US adequacy references on that basis — the EU–US Data Privacy Framework adequacy decision has been in force since July 2023.

5. YOU ARE SHOWN THE OUTPUT, NOT THE INTAKE. You receive the generator's OUTPUT but generally NOT the underlying intake. Do NOT assert that a value is fabricated, hallucinated, or unverifiable merely because you cannot confirm it against intake you were not given. Internal identifiers and control slugs (e.g. "c3_zero_trust", "c9_network_mon", "c16_training"), vendor names, field references, and other intake-derived facts are presumed to originate in the intake — they are NOT hallucinations by default. Flag fabrication ONLY when the output is internally self-contradictory, or the value is implausible on its face. (You MAY note that a raw internal slug like "c3_zero_trust" reads unprofessionally in user-facing prose and suggest a human-readable label — but that is at most a LOW-severity formatting note, never a hallucination or accuracy penalty.)

6. NEVER RECOMMEND INSERTING SPECIFIC FACTS FROM YOUR OWN MEMORY. These generators cite ONLY from a supplied corpus and are explicitly forbidden to cite from training knowledge. Do NOT recommend that the generator add specific enforcement cases, docket or case numbers, citation titles, guidance documents, URLs, statistics, or fine amounts that you supply from memory — your recalled specifics may be wrong, stale, or non-existent, and inserting them would manufacture hallucinations. If a case, citation, or URL appears missing or incomplete, the ONLY acceptable recommendation is "verify or insert from the supplied corpus" — never the specific item itself.

7. PRIORITISE SUBSTANCE OVER STYLE. Concentrate changes on correctness defects (internal contradictions, wrong logic, ungrounded fabrications, genuine miscitations). Do NOT pad the changes list with stylistic, verbosity, tone, or formatting preferences that do not affect correctness or usability; at most fold such observations into a single LOW-severity note.

WHAT TO FLAG (focus scoring and changes here): genuine internal contradictions (a score that conflicts with its own finding text; a stated count that does not match the items actually listed; a status that contradicts the narrative); specifics fabricated and NOT present in the intake (invented organisations, vendors, people, or enforcement actions asserted as fact without a citation); structural/JSON/parse errors; and incorrect reasoning or logic. Do NOT let any of the non-defects in rules 1–6 reduce the accuracy, citations, hallucination_free, or completeness scores.

Score each dimension 0-100 (HIGHER is better). HIGHER hallucination_free = LESS hallucination.

Return STRICT JSON, no markdown fences, no commentary. Schema:
{
  "scores": {
    "accuracy":         0-100,
    "citations":        0-100,
    "consistency":      0-100,
    "formatting":       0-100,
    "hallucination_free": 0-100,
    "completeness":     0-100
  },
  "overall": 0-100,
  "changes": [
    {
      "target_tool": "<tool slug being reviewed>",
      "location": "short locator (section heading, field name, or quoted phrase)",
      "problem": "what is wrong (1-2 sentences, specific)",
      "fix": "the concrete change to make",
      "severity": "critical|high|medium|low"
    }
  ],
  "strengths": ["..."],
  "critical_failures": ["..."]
}`;

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripFences(t: string): string {
  let c = (t ?? "").trim();
  if (c.startsWith("```")) c = c.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  return c.trim();
}
function repairJson(s: string): string {
  // Strip control chars (except \n \t \r) that break JSON.parse
  let t = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  let depthObj = 0, depthArr = 0;
  let inStr = false, esc = false;
  let lastSafe = -1;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") depthObj++;
    else if (ch === "}") { depthObj--; if (depthObj === 0 && depthArr === 0) lastSafe = i; }
    else if (ch === "[") depthArr++;
    else if (ch === "]") { depthArr--; if (depthObj === 0 && depthArr === 0) lastSafe = i; }
  }
  if (lastSafe !== -1) return t.slice(0, lastSafe + 1);
  // Truncated mid-document — close open string, drop dangling key/value, close arrays/objects.
  if (inStr) t += '"';
  t = t.replace(/,\s*$/g, "");
  t = t.replace(/[,:]\s*("[^"]*)?$/g, "");
  while (depthArr-- > 0) t += "]";
  while (depthObj-- > 0) t += "}";
  return t;
}
function tryParse(t: string): any | null {
  const c = stripFences(t);
  try { return JSON.parse(c); } catch { /* */ }
  const start = c.search(/[\{\[]/);
  if (start < 0) return null;
  const body = c.slice(start);
  try { return JSON.parse(body); } catch { /* */ }
  try { return JSON.parse(repairJson(body)); } catch { return null; }
}

// ─── Retry with exponential backoff + jitter on 429/5xx ──────────────────────
// Honors `Retry-After` (seconds or HTTP-date) when the provider sends one.
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;

function parseRetryAfter(h: string | null): number | null {
  if (!h) return null;
  const secs = Number(h);
  if (Number.isFinite(secs) && secs >= 0) return Math.min(secs * 1000, MAX_DELAY_MS);
  const t = Date.parse(h);
  if (!Number.isNaN(t)) return Math.max(0, Math.min(t - Date.now(), MAX_DELAY_MS));
  return null;
}

async function fetchWithRetry(label: string, url: string, init: RequestInit): Promise<Response> {
  let attempt = 0;
  while (true) {
    let r: Response;
    try {
      r = await fetch(url, init);
    } catch (e) {
      if (attempt >= MAX_RETRIES) throw e;
      const backoff = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
      const jitter = Math.floor(Math.random() * 500);
      console.warn(`[${label}] network error (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${(e as Error).message}; retrying in ${backoff + jitter}ms`);
      await new Promise((res) => setTimeout(res, backoff + jitter));
      attempt++;
      continue;
    }
    if (r.ok || !RETRYABLE_STATUSES.has(r.status) || attempt >= MAX_RETRIES) return r;
    const retryAfter = parseRetryAfter(r.headers.get("retry-after") ?? r.headers.get("x-ratelimit-reset"));
    const expBackoff = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
    const jitter = Math.floor(Math.random() * 500);
    const delay = (retryAfter ?? expBackoff) + jitter;
    console.warn(`[${label}] ${r.status} (attempt ${attempt + 1}/${MAX_RETRIES + 1}); retrying in ${delay}ms${retryAfter != null ? " (Retry-After)" : ""}`);
    try { await r.text(); } catch { /* drain */ }
    await new Promise((res) => setTimeout(res, delay));
    attempt++;
  }
}

async function callClaude(system: string, user: string, model: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");
  const r = await fetchWithRetry("anthropic", "https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Anthropic ${r.status}: ${t.slice(0, 400)}`);
  }
  const d = await r.json();
  if (d?.stop_reason && d.stop_reason !== "end_turn") {
    console.warn(`[review-test-output] claude stop_reason=${d.stop_reason}`);
  }
  return d?.content?.[0]?.text ?? "";
}

async function callOpenAI(system: string, user: string, model: string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");
  const r = await fetchWithRetry("openai", "https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`OpenAI ${r.status}: ${t.slice(0, 400)}`);
  }
  const d = await r.json();
  const finish = d?.choices?.[0]?.finish_reason;
  if (finish && finish !== "stop") {
    console.warn(`[review-test-output] openai finish_reason=${finish}`);
  }
  return d?.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  const internal = req.headers.get("x-internal-resume") === "1";
  if (!internal) {
    if (!authHeader?.startsWith("Bearer ")) return jsonResp({ error: "Unauthorized" }, 401);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return jsonResp({ error: "Unauthorized" }, 401);
  }

  let body: any;
  try { body = await req.json(); } catch { return jsonResp({ error: "Invalid JSON" }, 400); }

  const { testId, testLabel, output, assertions, log, mode, model, target_tool } = body || {};
  if (!testId || !output) return jsonResp({ error: "testId and output are required" }, 400);

  const outputStr = typeof output === "string" ? output : JSON.stringify(output, null, 2);
  const trimmed = outputStr.length > 120_000 ? outputStr.slice(0, 120_000) + "\n…[truncated]" : outputStr;

  const isImprovement = mode === "improvement";
  const system = isImprovement ? IMPROVEMENT_SYSTEM_PROMPT : RUBRIC_SYSTEM_PROMPT;

  // Resolve reviewer: explicit `model` wins; default = Claude (legacy behavior).
  const chosenModel: string = (model && String(model).trim()) || DEFAULT_CLAUDE;
  const isOpenAI = /^gpt-/i.test(chosenModel) || /^o[0-9]/i.test(chosenModel);

  const userMessage = [
    `CURRENT DATE (authoritative; later than your training cutoff): ${new Date().toISOString().slice(0, 10)}`,
    `TEST: ${testLabel || testId} (id=${testId})`,
    target_tool ? `TARGET TOOL: ${target_tool}` : "",
    "",
    "ASSERTIONS:",
    Array.isArray(assertions) && assertions.length > 0
      ? assertions.map((a: any) => `  ${a.passed ? "PASS" : "FAIL"} — ${a.label}`).join("\n")
      : "  (none)",
    "",
    "EXECUTION LOG (tail):",
    Array.isArray(log) && log.length > 0 ? log.slice(-15).join("\n") : "(none)",
    "",
    "TOOL OUTPUT:",
    "```",
    trimmed,
    "```",
    "",
    isImprovement
      ? "Review it now. Quote actual text in `location` or `problem` when possible. Return JSON only."
      : "Score it now. Return JSON only.",
  ].filter(Boolean).join("\n");

  let raw: string;
  try {
    raw = isOpenAI
      ? await callOpenAI(system, userMessage, chosenModel)
      : await callClaude(system, userMessage, chosenModel);
  } catch (e) {
    return jsonResp({ error: (e as Error).message }, 502);
  }

  const review = tryParse(raw);
  if (!review) return jsonResp({ error: "Reviewer returned non-JSON", raw: raw.slice(0, 1000) }, 500);

  return jsonResp({ ok: true, testId, model: chosenModel, review });
});
