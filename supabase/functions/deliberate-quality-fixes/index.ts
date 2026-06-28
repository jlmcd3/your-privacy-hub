// deliberate-quality-fixes — B2 of Workstream B (Phase 2 Quality Loop Augmentation).
//
// For every failing quality_check_results row in a run with a proposed_fix, runs
// 4 parallel Claude persona calls (Teams 1-4). Each returns
//   { stance, approve, rationale, minimal_change? }
//
// Verdict gate (unanimity across ALL viewpoints — no free-roaming devil's-advocate):
//   verdict = "auto_eligible"  iff
//       Claude AND GPT cross-review concurred (candidate.cross_review_category === "agree")
//       AND all four teams approved.
//   verdict = "reject"         iff all four teams say not_a_defect / withhold approval
//   verdict = "human_review"   otherwise (carry dissent reason)
//
// Never applies a patch from here — that is auto-apply-fixes (Workstream B5).
// Chunked with self-reinvoke (CHUNK_SIZE candidates per invocation) so a large
// run cannot exhaust the 400s edge wall-clock.


import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL   = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY    = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY       = Deno.env.get("SUPABASE_ANON_KEY")!;
const ANTHROPIC_KEY  = Deno.env.get("ANTHROPIC_API_KEY")!;


const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const CHUNK_SIZE = 4;

function tryParse(t: string): any | null {
  const c = (t ?? "").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try { return JSON.parse(c); } catch { /* */ }
  const m = c.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

async function claude(system: string, user: string, model = "claude-haiku-4-5-20251001", maxTokens = 1500): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.content?.[0]?.text ?? "";
}


type TeamKey = "team1" | "team2" | "team3" | "team4";
const TEAMS: { key: TeamKey; system: string }[] = [
  {
    key: "team1",
    system: `You are TEAM 1 (Prompt-Fixability Minimalist). Decide whether the proposed prompt patch is the MINIMAL change that would address the failing check. Return ONLY JSON:
{ "stance": "prompt" | "not_a_defect", "approve": boolean, "rationale": "1-2 sentences", "minimal_change": "a tighter alternative or null" }`,
  },
  {
    key: "team2",
    system: `You are TEAM 2 (Prose-vs-Registry Curator). Decide whether the fix belongs in the AI system prompt (prose) or in a deterministic registry/data file (registry). If "registry", set approve=false and explain. Return ONLY JSON:
{ "stance": "prompt" | "registry", "approve": boolean, "rationale": "1-2 sentences" }`,
  },
  {
    key: "team3",
    system: `You are TEAM 3 (Legal Correctness Reviewer). Verify the proposed fix is correct at the cited subsection/paragraph level. Reject if it creates a legal conflict, mis-cites a section, or contradicts statutory text. Return ONLY JSON:
{ "stance": "prompt" | "legal_conflict" | "not_a_defect", "approve": boolean, "rationale": "1-2 sentences" }`,
  },
  {
    key: "team4",
    system: `You are TEAM 4 (Root-Cause Auditor). Decide whether the root cause is genuinely a prompt defect, OR something a prompt patch CANNOT fix (deploy lag, RLS, schema drift, runtime/parse failure, missing trigger). Approve ONLY if the root cause is a prompt defect. Return ONLY JSON:
{ "stance": "prompt" | "systems" | "not_a_defect", "approve": boolean, "rationale": "1-2 sentences" }`,
  },
];


function userBlock(check: any): string {
  return [
    `TOOL: ${check.tool}`,
    `CHECK ID: ${check.check_id}`,
    `DIMENSION: ${check.dimension}`,
    `SEVERITY: ${check.severity}`,
    `FAIL RATE: ${Math.round((Number(check.fail_rate) || 0) * 100)}%`,
    `SAMPLE EVIDENCE: ${JSON.stringify(check.sample_evidence ?? []).slice(0, 800)}`,
    `FIX LOCATION: ${check.fix_location ?? "(none)"}`,
    `PROPOSED FIX:\n${(check.proposed_fix ?? "").slice(0, 2000)}`,
  ].join("\n");
}

async function deliberateOne(check: any) {
  const user = userBlock(check);
  const settled = await Promise.all(TEAMS.map(async (t) => {
    try {
      const raw = await claude(t.system, user);
      const parsed = tryParse(raw) ?? { stance: "not_a_defect", approve: false, rationale: "parse_failed" };
      return [t.key, parsed] as const;
    } catch (e) {
      return [t.key, { stance: "not_a_defect", approve: false, rationale: `error: ${(e as Error).message}` }] as const;
    }
  }));
  const teams: Record<string, any> = Object.fromEntries(settled);

  const teamsApproveAll =
    !!teams.team1?.approve && !!teams.team2?.approve &&
    !!teams.team3?.approve && !!teams.team4?.approve;
  const reviewersAgree = check.cross_review_category === "agree"; // Claude AND GPT concurred
  const allNotDefect = TEAMS.every(
    (t) => teams[t.key]?.stance === "not_a_defect" && !teams[t.key]?.approve,
  );

  const verdict =
    allNotDefect ? "reject" :
    (reviewersAgree && teamsApproveAll) ? "auto_eligible" : "human_review";

  const disagreements: any[] = [];
  for (const t of TEAMS) {
    if (!teams[t.key]?.approve) {
      disagreements.push({ team: t.key, stance: teams[t.key]?.stance, rationale: teams[t.key]?.rationale });
    }
  }
  if (!reviewersAgree) {
    disagreements.push({
      source: "cross_review",
      reason: `Claude/GPT did not agree (category=${check.cross_review_category ?? "unknown"})`,
    });
  }

  return {
    team1_position: teams.team1,
    team2_position: teams.team2,
    team3_position: teams.team3,
    team4_position: teams.team4,
    devils_advocate: null,
    team3_approve: !!teams.team3?.approve,
    team4_approve: !!teams.team4?.approve,
    consensus: reviewersAgree && teamsApproveAll,
    verdict,
    disagreements,
    recommended_change: teams.team1?.minimal_change ?? check.proposed_fix,
    change_location: check.fix_location,
  };
}


function selfReinvoke(runId: string, offset: number) {
  fetch(`${SUPABASE_URL}/functions/v1/deliberate-quality-fixes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      "x-internal-resume": "1",
    },
    body: JSON.stringify({ run_id: runId, offset }),
  }).catch((e) => console.warn("[deliberate] self-reinvoke failed:", (e as Error).message));
}

async function deliberateRun(runId: string, offset: number) {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: candidates, error } = await admin
    .from("quality_check_results")
    .select("id, tool, run_id, check_id, dimension, severity, fail_count, fail_rate, sample_evidence, proposed_fix, fix_location, cross_review_category")
    .eq("run_id", runId)
    .gt("fail_count", 0)
    .not("proposed_fix", "is", null);
  if (error) { console.error("[deliberate] fetch failed:", error.message); return; }
  if (!candidates?.length) { console.log("[deliberate] no candidates for run", runId); return; }

  // Skip checks that already have a deliberation row.
  const { data: existing } = await admin
    .from("quality_fix_deliberations")
    .select("check_id").eq("run_id", runId);
  const done = new Set((existing ?? []).map((r: any) => r.check_id));
  const pending = candidates.filter((c: any) => !done.has(c.check_id));
  const slice = pending.slice(offset, offset + CHUNK_SIZE);
  console.log(`[deliberate] run=${runId} offset=${offset} pending=${pending.length} processing=${slice.length}`);

  for (const chk of slice) {
    try {
      const result = await deliberateOne(chk);
      await admin.from("quality_fix_deliberations").upsert({
        run_id: chk.run_id,
        tool: chk.tool,
        check_id: chk.check_id,
        dimension: chk.dimension,
        severity: chk.severity,
        ...result,
        status: "pending",
      }, { onConflict: "run_id,check_id" });
    } catch (e) {
      console.warn(`[deliberate] check ${chk.check_id} failed:`, (e as Error).message);
    }
  }

  if (offset + CHUNK_SIZE < pending.length) {
    selfReinvoke(runId, offset + CHUNK_SIZE);
  } else {
    console.log(`[deliberate] run=${runId} complete (offset=${offset + slice.length}/${pending.length})`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  const runId: string = body?.run_id;
  if (!runId) return json({ error: "run_id required" }, 400);

  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  const isInternal = req.headers.get("x-internal-resume") === "1" && token === SERVICE_KEY;

  if (!isInternal) {
    const { data: claims, error: claimsErr } = await createClient(SUPABASE_URL, ANON_KEY).auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized", detail: claimsErr?.message ?? "no claims" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: claims.claims.sub, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);
  }

  const offset = Number(body?.offset ?? 0);

  // @ts-ignore
  EdgeRuntime.waitUntil(deliberateRun(runId, offset));
  return json({ accepted: true, run_id: runId, offset }, 202);
});
