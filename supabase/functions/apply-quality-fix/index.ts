// apply-quality-fix — admin-gated quality-loop applier.
//
// Default target = main (GITHUB_BRANCH env). Optional `body.branch` lets callers
// (including the QualityLoop UI's "Promote quality-auto → main" flow) target an
// alternate branch. GitHub plumbing is shared with auto-apply-fixes via
// _shared/github-apply.ts.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ghGet, ghPut, applyPatchWithClaude, ensureBranch } from "../_shared/github-apply.ts";

const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY   = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY      = Deno.env.get("SUPABASE_ANON_KEY")!;
const GITHUB_TOKEN  = Deno.env.get("GITHUB_TOKEN") ?? "";
const GITHUB_BRANCH = Deno.env.get("GITHUB_BRANCH") ?? "main";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// Keep this map in sync with auto-apply-fixes.TOOL_FILE_PATH.
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
  "rofa":                 "supabase/functions/run-rofa/index.ts",
  "privacy-notice-us":    "supabase/functions/generate-privacy-notice/index.ts",
  "global-privacy-notice":"supabase/functions/generate-privacy-notice/index.ts",
  "registration":         "supabase/functions/generate-registration-docs/index.ts",
  "ask-privacy":          "supabase/functions/ask-privacy/index.ts",
  "weekly-brief":         "supabase/functions/generate-weekly-brief/index.ts",
  "custom-brief":         "supabase/functions/generate-custom-brief/index.ts",
  "trend-report":         "supabase/functions/generate-trend-report/index.ts",
  "state-law":            "supabase/functions/check-state-privacy-laws/index.ts",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } =
    await createClient(SUPABASE_URL, ANON_KEY).auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) return json({ error: "Unauthorized", detail: claimsErr?.message ?? "no claims" }, 401);
  const userId = claimsData.claims.sub as string;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: isAdmin, error: roleErr } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (roleErr) return json({ error: "Role check failed", detail: roleErr.message }, 500);
  if (!isAdmin) return json({ error: "Admin only" }, 403);

  if (!GITHUB_TOKEN) return json({ error: "GITHUB_TOKEN not configured" }, 500);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const ids: string[] = Array.isArray(body.check_result_ids) ? body.check_result_ids
    : body.check_result_id ? [body.check_result_id] : [];
  if (!ids.length) return json({ error: "check_result_ids required" }, 400);

  // B4: optional branch override. Defaults to GITHUB_BRANCH (main). For non-main
  // branches we make sure the branch exists first.
  const branch: string = typeof body.branch === "string" && body.branch ? body.branch : GITHUB_BRANCH;
  if (branch !== GITHUB_BRANCH) {
    try { await ensureBranch(branch); }
    catch (e) { return json({ error: `ensureBranch(${branch}) failed: ${(e as Error).message}` }, 500); }
  }

  const { data: checks, error: chkErr } = await admin.from("quality_check_results")
    .select("*, quality_runs(tool)").in("id", ids);
  if (chkErr || !checks?.length) return json({ error: "check results not found" }, 404);

  // RX-2: re-check fix_applied for all requested ids in one query so concurrent
  // tabs / duplicate clicks don't double-apply.
  const { data: freshStatus } = await admin
    .from("quality_check_results")
    .select("id, fix_applied")
    .in("id", ids);
  const alreadyAppliedIds = new Set(
    (freshStatus ?? []).filter((r: any) => r.fix_applied).map((r: any) => r.id),
  );

  const byFile = new Map<string, typeof checks>();
  const earlyResults: Array<{ check_id: string; success: boolean; skipped?: boolean; error?: string }> = [];
  for (const chk of checks) {
    const tool = (chk as any).quality_runs?.tool ?? (chk as any).tool;
    const filePath = TOOL_FILE_PATH[tool];
    if (!filePath) { earlyResults.push({ check_id: chk.check_id, success: false, error: `No file path for tool: ${tool}` }); continue; }
    if (!byFile.has(filePath)) byFile.set(filePath, []);
    byFile.get(filePath)!.push(chk);
  }

  const results: Array<{ check_id: string; success: boolean; skipped?: boolean; commit_url?: string; error?: string }> = [...earlyResults];

  for (const [filePath, fileChecks] of byFile) {
    try {
      const ghFile = await ghGet(`contents/${filePath}?ref=${branch}`);
      let currentContent = atob(ghFile.content.replace(/\n/g, ""));
      const currentSha   = ghFile.sha;

      for (const chk of fileChecks) {
        if (alreadyAppliedIds.has(chk.id)) {
          results.push({ check_id: chk.check_id, success: true, skipped: true, error: "Already applied — skipped duplicate" });
          continue;
        }
        if (!chk.proposed_fix) {
          results.push({ check_id: chk.check_id, success: false, error: "No proposed fix stored" });
          continue;
        }
        const patched = await applyPatchWithClaude(currentContent, chk.check_id, chk.proposed_fix, chk.fix_location ?? "");
        if (!patched || patched.length < currentContent.length * 0.5) {
          results.push({ check_id: chk.check_id, success: false, error: "Patch produced suspiciously short output — rejected" });
          continue;
        }
        currentContent = patched;
      }

      const appliedIds = fileChecks.map((c) => c.check_id).join(", ");
      const commitMessage =
        `fix(quality-loop): prompt patches for ${appliedIds}\n\n` +
        `Applied via EndUserPrivacy quality refinement loop on branch ${branch}.\n` +
        `Checks fixed: ${appliedIds}\nFile: ${filePath}`;

      let pushResult: any;
      try {
        pushResult = await ghPut(`contents/${filePath}`, {
          message: commitMessage,
          content: btoa(unescape(encodeURIComponent(currentContent))),
          sha: currentSha,
          branch,
        });
      } catch (e) {
        if ((e as any).status === 409) {
          console.warn(`[apply-quality-fix] 409 on ${filePath}, refetching sha and retrying once`);
          const freshFile = await ghGet(`contents/${filePath}?ref=${branch}`);
          pushResult = await ghPut(`contents/${filePath}`, {
            message: commitMessage,
            content: btoa(unescape(encodeURIComponent(currentContent))),
            sha: freshFile.sha,
            branch,
          });
        } else { throw e; }
      }

      const commitSha = pushResult?.commit?.sha ?? "";
      const commitUrl = pushResult?.commit?.html_url ??
        `https://github.com/${Deno.env.get("GITHUB_OWNER") ?? "jlmcd3"}/${Deno.env.get("GITHUB_REPO") ?? "your-privacy-hub"}/commit/${commitSha}`;

      for (const chk of fileChecks) {
        if (alreadyAppliedIds.has(chk.id)) continue;
        await admin.from("quality_check_results").update({
          fix_applied: true, fix_commit_sha: commitSha, fix_applied_at: new Date().toISOString(),
        }).eq("id", chk.id);

        const tool = (chk as any).quality_runs?.tool ?? (chk as any).tool;
        await admin.from("quality_applied_patches").insert({
          run_id: chk.run_id, check_result_id: chk.id, tool,
          edge_function: TOOL_FILE_PATH[tool]?.split("/")[2] ?? tool,
          file_path: filePath, check_id: chk.check_id,
          patch_description: `Quality loop fix on ${branch}: ${chk.check_id} (${chk.dimension}, ${chk.severity}, ${Math.round((chk.fail_rate ?? 0) * 100)}% fail rate)`,
          old_text: "(see commit diff)", new_text: chk.proposed_fix,
          commit_sha: commitSha, commit_url: commitUrl,
          applied_by: userId,
        });
        results.push({ check_id: chk.check_id, success: true, commit_url: commitUrl });
      }
    } catch (e) {
      const err = (e as Error).message?.slice(0, 200);
      for (const chk of fileChecks) results.push({ check_id: chk.check_id, success: false, error: err });
    }
  }

  console.log("[apply-quality-fix] complete", JSON.stringify({
    branch,
    total: results.length,
    succeeded: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
  }));

  return json({ results, branch }, 200);
});
