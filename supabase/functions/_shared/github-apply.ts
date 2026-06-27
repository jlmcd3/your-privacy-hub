// _shared/github-apply.ts — shared GitHub plumbing for the Quality Loop.
// Used by:
//   - apply-quality-fix      (admin-gated, default branch = main)
//   - auto-apply-fixes       (service-role, always quality-auto)
//
// Surface area:
//   ghGet / ghPut                  — raw GitHub Contents API helpers
//   applyPatchWithClaude(...)      — turn (currentContent, fix, location) → newContent
//   ensureBranch(branch)           — idempotent: create `branch` from main HEAD if missing
//   applyPatchToBranch({...})      — full ghGet → patch → ghPut on a single check, on any branch

const GITHUB_TOKEN  = Deno.env.get("GITHUB_TOKEN") ?? "";
const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const GITHUB_OWNER  = Deno.env.get("GITHUB_OWNER") ?? "jlmcd3";
const GITHUB_REPO   = Deno.env.get("GITHUB_REPO")  ?? "your-privacy-hub";

export const GH_OWNER = GITHUB_OWNER;
export const GH_REPO  = GITHUB_REPO;

function ghHeaders(extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
}

export async function ghGet(path: string): Promise<any> {
  const r = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/${path}`, {
    headers: ghHeaders(),
    signal: AbortSignal.timeout(45_000),
  });
  if (!r.ok) throw new Error(`GitHub GET ${path}: ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

export async function ghPut(path: string, body: any): Promise<any> {
  const r = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/${path}`, {
    method: "PUT",
    headers: ghHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });
  if (!r.ok) {
    const err = new Error(`GitHub PUT ${path}: ${r.status} ${(await r.text()).slice(0, 200)}`);
    (err as any).status = r.status;
    throw err;
  }
  return r.json();
}

export async function applyPatchWithClaude(
  currentContent: string,
  checkId: string,
  proposedFix: string,
  fixLocation: string,
): Promise<string> {
  if (!ANTHROPIC_KEY) throw new Error("ANTHROPIC_API_KEY not configured");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 64000,
      system: "You are a code editor. Apply ONLY the specified patch to the TypeScript file — change nothing else. Return the complete modified file content as raw TypeScript. No explanation, no markdown, no code fences.",
      messages: [{ role: "user", content: `Apply this patch.\n\nPATCH LOCATION: ${fixLocation}\nCHECK BEING FIXED: ${checkId}\n\nPATCH TO APPLY:\n${proposedFix}\n\nCURRENT FILE:\n${currentContent}\n\nReturn the complete modified file. Raw TypeScript only.` }],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) throw new Error(`Claude patch ${r.status}`);
  const d = await r.json();
  return (d.content?.[0]?.text ?? "")
    .replace(/^```(?:typescript|ts)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

// Idempotent: creates `branch` off main HEAD if missing. Safe to call concurrently
// (a race with another invocation surfaces as 422 from GitHub, which we treat as success).
export async function ensureBranch(branch: string): Promise<void> {
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN not configured");
  const r = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/ref/heads/${branch}`, {
    headers: ghHeaders(),
    signal: AbortSignal.timeout(30_000),
  });
  if (r.ok) return;
  if (r.status !== 404) {
    throw new Error(`ensureBranch GET status ${r.status} for ${branch}`);
  }
  const main = await ghGet("git/ref/heads/main");
  const sha = main?.object?.sha;
  if (!sha) throw new Error("ensureBranch: could not resolve main HEAD sha");
  const createRes = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs`, {
    method: "POST",
    headers: ghHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!createRes.ok && createRes.status !== 422) {
    throw new Error(`ensureBranch create failed: ${createRes.status} ${(await createRes.text()).slice(0, 200)}`);
  }
}

export type ApplyPatchResult =
  | { commit_sha: string; commit_url: string; commit_message: string }
  | { skipped: true; reason: string }
  | { error: string };

export async function applyPatchToBranch(opts: {
  filePath: string;
  proposedFix: string;
  fixLocation: string;
  checkId: string;
  branch: string;
  commitMessage?: string;
}): Promise<ApplyPatchResult> {
  if (!GITHUB_TOKEN) return { error: "GITHUB_TOKEN not configured" };
  try { await ensureBranch(opts.branch); } catch (e) { return { error: `ensureBranch: ${(e as Error).message}` }; }

  let fileJson: any;
  try { fileJson = await ghGet(`contents/${opts.filePath}?ref=${opts.branch}`); }
  catch (e) { return { error: `ghGet: ${(e as Error).message}` }; }

  const currentContent = atob(fileJson.content.replace(/\n/g, ""));
  let patched: string;
  try { patched = await applyPatchWithClaude(currentContent, opts.checkId, opts.proposedFix, opts.fixLocation); }
  catch (e) { return { error: `Claude patch: ${(e as Error).message}` }; }

  if (!patched || patched.length < currentContent.length * 0.5) {
    return { skipped: true, reason: "Patch produced suspiciously short output" };
  }

  const commitMessage = opts.commitMessage ??
    `fix(quality-loop): ${opts.checkId}\n\nApplied via EndUserPrivacy quality loop on branch ${opts.branch}.`;

  let pushResult: any;
  try {
    pushResult = await ghPut(`contents/${opts.filePath}`, {
      message: commitMessage,
      content: btoa(unescape(encodeURIComponent(patched))),
      sha: fileJson.sha,
      branch: opts.branch,
    });
  } catch (e) {
    if ((e as any).status === 409) {
      // Concurrent push changed the file underneath us — refetch sha and retry once.
      try {
        const fresh = await ghGet(`contents/${opts.filePath}?ref=${opts.branch}`);
        pushResult = await ghPut(`contents/${opts.filePath}`, {
          message: commitMessage,
          content: btoa(unescape(encodeURIComponent(patched))),
          sha: fresh.sha,
          branch: opts.branch,
        });
      } catch (e2) { return { error: `ghPut retry: ${(e2 as Error).message}` }; }
    } else {
      return { error: `ghPut: ${(e as Error).message}` };
    }
  }

  const commit_sha = pushResult?.commit?.sha ?? "";
  const commit_url = pushResult?.commit?.html_url ??
    `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/commit/${commit_sha}`;
  return { commit_sha, commit_url, commit_message: commitMessage };
}
