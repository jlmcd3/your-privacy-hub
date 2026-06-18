// verify-github-token — lightweight check that GITHUB_TOKEN is set and
// has write access to the target repo. Called from the quality loop admin UI.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GITHUB_TOKEN = Deno.env.get("GITHUB_TOKEN") ?? "";
const GITHUB_OWNER = Deno.env.get("GITHUB_OWNER") ?? "jlmcd3";
const GITHUB_REPO = Deno.env.get("GITHUB_REPO") ?? "your-privacy-hub";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  const { data: userData } = await createClient(SUPABASE_URL, ANON_KEY).auth.getUser(token);
  if (!userData?.user) return json({ ok: false, error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: isAdmin } = await admin.rpc("has_role", {
    _user_id: userData.user.id,
    _role: "admin",
  });
  if (!isAdmin) return json({ ok: false, error: "Admin only" }, 403);

  if (!GITHUB_TOKEN) {
    return json({
      ok: false,
      error: "GITHUB_TOKEN secret is not set.",
      fix: "Add GITHUB_TOKEN to edge function secrets.",
    });
  }

  try {
    const r = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        signal: AbortSignal.timeout(10_000),
      },
    );

    if (!r.ok) {
      const body = await r.text();
      return json({
        ok: false,
        error: `GitHub API returned ${r.status}`,
        detail: body.slice(0, 300),
        likely_cause:
          r.status === 401
            ? "Token is invalid or expired — regenerate at https://github.com/settings/tokens"
            : r.status === 403
            ? "Token lacks repo scope — regenerate with full repo scope"
            : r.status === 404
            ? "Repo not found — check GITHUB_OWNER and GITHUB_REPO secrets"
            : "Unexpected error",
      });
    }

    const repoData = await r.json();
    const permissions = repoData.permissions ?? {};
    const canPush = permissions.push === true || permissions.admin === true;

    return json({
      ok: canPush,
      repo: `${GITHUB_OWNER}/${GITHUB_REPO}`,
      default_branch: repoData.default_branch,
      permissions,
      can_push: canPush,
      message: canPush
        ? `✅ Token valid. Push access confirmed for ${GITHUB_OWNER}/${GITHUB_REPO}.`
        : `⚠️ Token is valid but lacks push access. Regenerate with full repo scope.`,
    });
  } catch (e) {
    return json({ ok: false, error: String(e) });
  }
});
