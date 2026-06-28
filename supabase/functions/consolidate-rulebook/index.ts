// consolidate-rulebook — P-B of FIX_quality_loop_actually_improving.
//
// Admin-gated. Reads a tool's generator file from GitHub, asks a strong Claude
// model to MERGE redundant rules and RESOLVE contradictions (no semantic
// changes), then stages the consolidated file to `quality-auto` for human
// review. NEVER pushes to main directly.
//
// Body: { tool: "biometric-checker" | ... }
//
// Companion to the quality loop: generateProposedFix only ever APPENDS to the
// rulebook. This function gives the loop the opposite operation — pruning.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ghGet, applyPatchToBranch } from "../_shared/github-apply.ts";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY      = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const APPLY_BRANCH  = Deno.env.get("QUALITY_APPLY_BRANCH") ?? "quality-auto";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// Keep in sync with apply-quality-fix / auto-apply-fixes TOOL_FILE_PATH.
const TOOL_FILE_PATH: Record<string, string> = {
  "cppa-admt":            "supabase/functions/run-admt-checker/index.ts",
  "cppa-risk":            "supabase/functions/run-cppa-risk-assessment/index.ts",
  "cppa-cyber":           "supabase/functions/run-cppa-cybersecurity/index.ts",
  "lia":                  "supabase/functions/run-li-assessment/index.ts",
  "dpia":                 "supabase/functions/run-dpia-framework/index.ts",
  "governance":           "supabase/functions/run-governance-assessment/index.ts",
  "biometric-checker":    "supabase/functions/check-biometric-compliance/index.ts",
  "dpa-generator":        "supabase/functions/generate-dpa/index.ts",
  "ir-playbook":          "supabase/functions/generate-ir-playbook/index.ts",
  "registration":         "supabase/functions/generate-registration-docs/index.ts",
};

const CONSOLIDATE_SYSTEM = `You are a senior privacy-engineering editor reviewing a system prompt that drives a regulatory compliance tool. The prompt has been edited many times by an automated quality loop that only ever APPENDS rules; it never removes anything. Your job is the opposite operation.

You will be given the ENTIRE TypeScript source file for the tool. Locate the in-file system prompt / rulebook constants (typically named like *_RULEBOOK, *_IDENTITY, *_SYSTEM, or strings passed as the "system" field in an Anthropic call). Then:

1. Identify rules that are REDUNDANT (two or more rules say the same thing in different words).
2. Identify rules that OVERLAP (one rule is a strict subset of another, or two rules cover the same surface area with different phrasings).
3. Identify rules that CONTRADICT each other.

Produce a consolidated version that:
- PRESERVES every distinct constraint. If you are unsure whether two rules are truly equivalent, KEEP BOTH.
- Removes pure duplication and merges overlapping phrasings into a single, clearer rule.
- Resolves contradictions by keeping the more specific/recent rule and removing the looser/older one. If a contradiction cannot be resolved without judgment, KEEP BOTH and add a "// REVIEW: contradiction —" comment.
- Changes NOTHING outside the rulebook strings: do not rewrite TypeScript logic, schemas, control flow, imports, or function bodies. Only edit the prompt/rulebook string contents.

Output FORMAT — return EXACTLY this, no markdown fences:

===CHANGELOG===
- merged: "<short description of the rules merged>" (was N rules, now 1)
- removed: "<short description of the duplicate removed>"
- resolved: "<short description of the contradiction resolved>" → kept "<which>"
...
===FILE===
<the complete modified TypeScript file, raw>`;

async function callClaude(system: string, user: string, maxTokens = 64000): Promise<string> {
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY not configured");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.content?.[0]?.text ?? "";
}

function splitOutput(raw: string): { changelog: string; file: string } | null {
  const fileIdx = raw.indexOf("===FILE===");
  const clIdx   = raw.indexOf("===CHANGELOG===");
  if (fileIdx < 0 || clIdx < 0 || clIdx >= fileIdx) return null;
  const changelog = raw.slice(clIdx + "===CHANGELOG===".length, fileIdx).trim();
  const file = raw.slice(fileIdx + "===FILE===".length).trim()
    .replace(/^```(?:typescript|ts)?\s*/i, "").replace(/```\s*$/i, "").trim();
  if (!file || file.length < 200) return null;
  return { changelog, file };
}

async function runConsolidation(tool: string, requestedBy: string | null) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const filePath = TOOL_FILE_PATH[tool];
  if (!filePath) throw new Error(`Unknown tool: ${tool}`);

  // 1. Pull current file.
  const fileJson = await ghGet(`contents/${filePath}?ref=main`);
  const currentContent = atob(fileJson.content.replace(/\n/g, ""));

  // 2. Ask Claude to consolidate.
  const raw = await callClaude(
    CONSOLIDATE_SYSTEM,
    `TOOL: ${tool}\nFILE PATH: ${filePath}\nCURRENT FILE LENGTH: ${currentContent.length} chars\n\nFULL CURRENT FILE:\n${currentContent}`,
  );
  const parts = splitOutput(raw);
  if (!parts) throw new Error("Consolidation output did not contain ===CHANGELOG=== / ===FILE=== markers");

  // 3. Sanity check — shouldn't lose more than 30% of the file in a pure consolidation.
  if (parts.file.length < currentContent.length * 0.7) {
    throw new Error(`Consolidated file is suspiciously short (${parts.file.length} vs ${currentContent.length}) — refusing to stage`);
  }

  // 4. Stage to quality-auto. Wrap parts.file as a single-file "patch" that replaces the
  //    entire file via applyPatchToBranch's Claude-applier — but we already have the patched
  //    content, so we use ghPut directly via a minimal path: stage by encoding patched body
  //    as the proposed fix and instructing the applier to replace the file verbatim.
  //    Simpler: build a synthetic patch that says "replace file with the provided content".
  const result = await applyPatchToBranch({
    filePath,
    proposedFix: `Replace the entire file with this consolidated version (no other changes). VERBATIM REPLACEMENT — do not re-edit:\n\n${parts.file}`,
    fixLocation: `Entire file ${filePath} — consolidation pass (no semantic change, duplication/contradiction removal only)`,
    checkId: `consolidate-${tool}`,
    branch: APPLY_BRANCH,
    commitMessage: `chore(quality-loop): consolidate ${tool} rulebook\n\nMerges duplicates and resolves contradictions in the system prompt.\nNo distinct constraint removed. Staged to ${APPLY_BRANCH} for human review.\n\nChangelog:\n${parts.changelog}\n\nRequested by: ${requestedBy ?? "service"}`,
  });

  // 5. Record in quality_score_ledger so the admin UI can show what happened.
  try {
    await admin.from("quality_score_ledger").insert({
      tool_name: tool,
      run_date: new Date().toISOString(),
      overall_score: 0,
      accuracy_score: 0, completeness_score: 0, citation_quality_score: 0,
      regulatory_coverage_score: 0, actionability_score: 0, consistency_score: 0,
      documents_evaluated: 0, findings_count: 0,
      agree_count: 0, claude_only_count: 0, gpt_only_count: 0, conflict_count: 0,
    });
  } catch (e) {
    console.warn("[consolidate-rulebook] ledger insert failed (non-fatal):", (e as Error).message);
  }

  return { result, changelog: parts.changelog, original_length: currentContent.length, consolidated_length: parts.file.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  if (!token) return json({ error: "Unauthorized" }, 401);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const tool = String(body?.tool ?? "");
  if (!tool) return json({ error: "tool required" }, 400);

  const userClient = createClient(SUPABASE_URL, ANON_KEY);
  const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: claims.claims.sub, _role: "admin" });
  if (!isAdmin) return json({ error: "Admin only" }, 403);

  try {
    const out = await runConsolidation(tool, claims.claims.sub as string);
    return json({ ok: true, ...out });
  } catch (e) {
    console.error("[consolidate-rulebook] failed:", e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
