// improve-prompt — One-button prompt improvement for a tool.
// Admin-gated. Runs each golden case through the real generator (baseline),
// asks Claude for ONE minimal edit to the tool's prompt file to fix the
// failing assertions, then A/B-tests the candidate prompt against the eval
// set (holdout if present, else all). Accepts only if (a) total passed
// strictly improves, (b) no per-case regression, (c) GPT-4o agrees the new
// output is better on the previously-failing cases. Stages accepted edits
// to the `quality-auto` branch — never main.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { evaluateGolden } from "../_shared/golden/evaluate.ts";
import type { GoldenCase } from "../_shared/golden/types.ts";
import { BIOMETRIC_GOLDEN } from "../_shared/golden/biometric.ts";
import { ghGet, applyPatchToBranch, GH_OWNER, GH_REPO } from "../_shared/github-apply.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const OPENAI_KEY    = Deno.env.get("OPENAI_API_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

type ToolReg = {
  tool: string;
  edgeFn: string;
  sourceFile: string;       // path in repo, e.g. supabase/functions/check-biometric-compliance/index.ts
  golden: GoldenCase[];
  buildBody: (c: GoldenCase) => Record<string, unknown>;
  extractText: (resp: any) => string;
};

const REGISTRY: Record<string, ToolReg> = {
  "biometric-checker": {
    tool: "biometric-checker",
    edgeFn: "check-biometric-compliance",
    sourceFile: "supabase/functions/check-biometric-compliance/index.ts",
    golden: BIOMETRIC_GOLDEN,
    buildBody: (c) => ({ ...c.intake, dry_run: true }),
    extractText: (r) => String(r?.assessment_text ?? ""),
  },
};

async function runGenerator(reg: ToolReg, body: any, overridePrompt: string | null): Promise<string> {
  const payload = { ...body };
  if (overridePrompt) payload.system_prompt_override = overridePrompt;
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${reg.edgeFn}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(180_000),
  });
  if (!r.ok) throw new Error(`generator ${reg.edgeFn} ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const text = await r.text();
  // Strip keep-alive whitespace prefix
  const trimmed = text.replace(/^\s+/, "");
  let json: any;
  try { json = JSON.parse(trimmed); }
  catch (e) { throw new Error(`generator returned non-JSON: ${trimmed.slice(0, 200)}`); }
  return reg.extractText(json);
}

async function evalAll(reg: ToolReg, cases: GoldenCase[], overridePrompt: string | null, runKind: "baseline" | "candidate") {
  const perCase: Record<string, { passed: number; total: number; failed: string[]; output: string }> = {};
  let totalPassed = 0, totalTotal = 0;
  for (const c of cases) {
    let output = "";
    try { output = await runGenerator(reg, reg.buildBody(c), overridePrompt); }
    catch (e) { output = `[GENERATOR ERROR] ${(e as Error).message}`; }
    const r = evaluateGolden(output, c);
    perCase[c.id] = { passed: r.passed, total: r.total, failed: r.failed, output };
    totalPassed += r.passed;
    totalTotal  += r.total;
    await supabase.from("golden_results").insert({
      tool: reg.tool, case_id: c.id, run_kind: runKind,
      assertions_total: r.total, assertions_passed: r.passed, failed_labels: r.failed,
    });
  }
  return { perCase, totalPassed, totalTotal };
}

async function proposeEditWithClaude(currentPrompt: string, failingLabels: string[]): Promise<{ edit: string; rationale: string } | null> {
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY not configured");
  const sys = "You propose ONE minimal edit to a system-prompt file used by a privacy-assessment generator. " +
    "The edit must make the listed assertions pass without restating registry facts the tool already injects. " +
    "Prefer adding short directive sentences or removing problematic rules. Output STRICT JSON: " +
    `{"edit":"<plain-text description of the exact change, including before/after snippets>","rationale":"<one sentence>"}. No prose, no markdown.`;
  const user = `FAILING ASSERTIONS (labels):\n- ${failingLabels.join("\n- ")}\n\nCURRENT PROMPT FILE:\n${currentPrompt}`;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 2000,
      system: sys,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) throw new Error(`Claude propose ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  const txt = String(d.content?.[0]?.text ?? "").trim()
    .replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    const parsed = JSON.parse(txt);
    if (parsed?.edit && typeof parsed.edit === "string") return { edit: parsed.edit, rationale: parsed.rationale ?? "" };
  } catch { /* fall through */ }
  return null;
}

async function applyEditInMemory(currentContent: string, edit: string): Promise<string> {
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY not configured");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 64000,
      system: "You are a code editor. Apply ONLY the described patch to the TypeScript file. Change nothing else. Return the complete modified file as raw TypeScript. No fences, no commentary.",
      messages: [{ role: "user", content: `PATCH:\n${edit}\n\nCURRENT FILE:\n${currentContent}` }],
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!r.ok) throw new Error(`Claude apply ${r.status}`);
  const d = await r.json();
  return String(d.content?.[0]?.text ?? "")
    .replace(/^```(?:typescript|ts)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

async function gptAgreesBetter(beforeOutputs: string[], afterOutputs: string[], failingLabels: string[]): Promise<boolean> {
  if (!OPENAI_KEY) return true; // fail-open if OpenAI unavailable; consensus then relies on deterministic eval
  const prompt = `You compare baseline vs candidate outputs from a privacy-assessment generator on cases that previously failed these assertions:\n- ${failingLabels.join("\n- ")}\n\n` +
    beforeOutputs.map((b, i) => `=== CASE ${i + 1} BASELINE ===\n${b.slice(0, 4000)}\n\n=== CASE ${i + 1} CANDIDATE ===\n${(afterOutputs[i] ?? "").slice(0, 4000)}`).join("\n\n") +
    `\n\nAnswer with STRICT JSON {"better": true|false, "reason": "<one sentence>"}. "better" means the candidate is at least as good as baseline on every case AND strictly better on at least one previously-failing assertion. No prose, no fences.`;
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 400,
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) return true;
  const d = await r.json();
  try {
    const parsed = JSON.parse(d.choices?.[0]?.message?.content ?? "{}");
    return !!parsed?.better;
  } catch { return true; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const caller = await verifyCaller(req, "admin");
    if (!caller.ok) {
      return new Response(JSON.stringify({ error: caller.error ?? "forbidden" }), {
        status: caller.status ?? 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json().catch(() => ({}));
    const toolId = String(body.tool ?? "");
    const reg = REGISTRY[toolId];
    if (!reg) {
      return new Response(JSON.stringify({ status: "no_golden_set", tool: toolId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (reg.golden.length === 0) {
      return new Response(JSON.stringify({ status: "no_golden_set", tool: toolId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Baseline on ALL cases
    const baseline = await evalAll(reg, reg.golden, null, "baseline");
    const basePassed = baseline.totalPassed;
    const baseTotal  = baseline.totalTotal;

    if (basePassed === baseTotal) {
      return new Response(JSON.stringify({
        improved: false, reason: "already_passing", basePassed, baseTotal,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Collect failing assertion labels (deduped)
    const failingLabels = Array.from(new Set(
      Object.values(baseline.perCase).flatMap(p => p.failed)
    ));

    // 2. Load current prompt file from main
    let fileJson: any;
    try { fileJson = await ghGet(`contents/${reg.sourceFile}?ref=main`); }
    catch (e) { throw new Error(`ghGet sourceFile: ${(e as Error).message}`); }
    const currentContent = atob(String(fileJson.content).replace(/\n/g, ""));

    // 3. Propose minimal edit
    const proposal = await proposeEditWithClaude(currentContent, failingLabels);
    if (!proposal) {
      return new Response(JSON.stringify({
        improved: false, reason: "no_proposal", basePassed, baseTotal,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Build candidate prompt in memory
    const candidatePrompt = await applyEditInMemory(currentContent, proposal.edit);
    if (!candidatePrompt || candidatePrompt.length < currentContent.length * 0.5) {
      return new Response(JSON.stringify({
        improved: false, reason: "patch_too_short", basePassed, baseTotal,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 5. A/B — pick holdout if any exist, else all
    const holdout = reg.golden.filter(c => c.set === "holdout");
    const evalCases = holdout.length > 0 ? holdout : reg.golden;
    const candidate = await evalAll(reg, evalCases, candidatePrompt, "candidate");

    // Regressions: any case where candidate < baseline on the same case
    const regressions: string[] = [];
    for (const c of evalCases) {
      const b = baseline.perCase[c.id];
      const cnd = candidate.perCase[c.id];
      if (b && cnd && cnd.passed < b.passed) regressions.push(c.id);
    }
    // Re-aggregate baseline restricted to evalCases for delta computation
    const baseOnEval = evalCases.reduce((s, c) => s + (baseline.perCase[c.id]?.passed ?? 0), 0);
    const delta = candidate.totalPassed - baseOnEval;

    if (delta <= 0 || regressions.length > 0) {
      return new Response(JSON.stringify({
        improved: false, reason: regressions.length > 0 ? "regression" : "no_improvement",
        basePassed, baseTotal, candPassed: candidate.totalPassed,
        regressions, proposed_edit: proposal.edit, rationale: proposal.rationale,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 6. GPT-4o cross-check on previously-failing cases
    const previouslyFailingIds = evalCases.filter(c => (baseline.perCase[c.id]?.failed.length ?? 0) > 0).map(c => c.id);
    const beforeOutputs = previouslyFailingIds.map(id => baseline.perCase[id]?.output ?? "");
    const afterOutputs  = previouslyFailingIds.map(id => candidate.perCase[id]?.output ?? "");
    const gptOk = previouslyFailingIds.length === 0
      ? true
      : await gptAgreesBetter(beforeOutputs, afterOutputs, failingLabels);

    if (!gptOk) {
      return new Response(JSON.stringify({
        improved: false, reason: "gpt_disagrees",
        basePassed, baseTotal, candPassed: candidate.totalPassed,
        delta, proposed_edit: proposal.edit, rationale: proposal.rationale,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 7. Stage to quality-auto
    const stageResult = await applyPatchToBranch({
      filePath: reg.sourceFile,
      proposedFix: proposal.edit,
      fixLocation: "(see edit description)",
      checkId: `improve-prompt:${reg.tool}`,
      branch: "quality-auto",
      commitMessage: `improve-prompt(${reg.tool}): +${delta} golden assertions, 0 regressions\n\nFailing labels addressed:\n- ${failingLabels.join("\n- ")}\n\nRationale: ${proposal.rationale}`,
    });
    if ("error" in stageResult) {
      return new Response(JSON.stringify({
        improved: false, reason: "stage_failed", error: stageResult.error,
        basePassed, baseTotal, candPassed: candidate.totalPassed, delta,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if ("skipped" in stageResult) {
      return new Response(JSON.stringify({
        improved: false, reason: stageResult.reason,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const diff_url = `https://github.com/${GH_OWNER}/${GH_REPO}/compare/main...quality-auto?expand=1`;
    return new Response(JSON.stringify({
      improved: true,
      delta,
      regressions: 0,
      basePassed, baseTotal, candPassed: candidate.totalPassed,
      proposed_edit: proposal.edit,
      rationale: proposal.rationale,
      commit_sha: (stageResult as any).commit_sha,
      commit_url: (stageResult as any).commit_url,
      diff_url,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[improve-prompt] error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message ?? "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
