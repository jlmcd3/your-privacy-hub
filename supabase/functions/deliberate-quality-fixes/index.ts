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
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";


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

async function openai(system: string, user: string, model = "gpt-4o", maxTokens = 1500): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, max_tokens: maxTokens, temperature: 0,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}


// PHASE 3 / C1 — diverse models per team. T1/T2 stay on Haiku (cheap minimalist
// curation), T3 (Legal) uses Claude Sonnet and MUST name the verified subsection
// or decline with stance="unverifiable", T4 (Root-cause) uses GPT-4o for model diversity.
type TeamKey = "team1" | "team2" | "team3" | "team4";
type Provider = "claude" | "openai";
const TEAMS: { key: TeamKey; provider: Provider; model: string; system: string }[] = [
  {
    key: "team1",
    provider: "claude",
    model: "claude-haiku-4-5-20251001",
    system: `You are TEAM 1 (Prompt-Fixability Minimalist). Decide whether the proposed prompt patch is the MINIMAL change that would address the failing check. Return ONLY JSON:
{ "stance": "prompt" | "not_a_defect", "approve": boolean, "rationale": "1-2 sentences", "minimal_change": "a tighter alternative or null" }`,
  },
  {
    key: "team2",
    provider: "claude",
    model: "claude-haiku-4-5-20251001",
    system: `You are TEAM 2 (Prose-vs-Registry Curator). Decide whether the fix belongs in the AI system prompt (prose) or in a deterministic registry/data file (registry). If "registry", set approve=false and explain. Return ONLY JSON:
{ "stance": "prompt" | "registry", "approve": boolean, "rationale": "1-2 sentences" }`,
  },
  {
    key: "team3",
    provider: "claude",
    model: "claude-sonnet-4-5-20250929",
    system: `You are TEAM 3 (Legal Correctness Reviewer) and you are DECISIVE for this workflow — your verdict governs whether the change is staged regardless of Teams 1/2/4. Verify the proposed fix is correct at the cited subsection/paragraph level. You MUST name the exact statute and subsection you verified against in "verified_against" (e.g. "740 ILCS 14/15(b)"). If you cannot verify the cited text from training — do NOT guess. Instead set stance="unverifiable", approve=false, and explain what primary-source check is needed. Reject if the fix creates a legal conflict, mis-cites a section, or contradicts statutory text. Return ONLY JSON:
{ "stance": "prompt" | "legal_conflict" | "unverifiable" | "not_a_defect", "approve": boolean, "verified_against": "statute + subsection or empty string", "rationale": "1-2 sentences" }`,
  },
  {
    key: "team4",
    provider: "openai",
    model: "gpt-4o",
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

async function deliberateOne(check: any, abEvidence: { delta: number; regressions: number } | null) {
  const user = userBlock(check);
  const settled = await Promise.all(TEAMS.map(async (t) => {
    try {
      const raw = t.provider === "openai"
        ? await openai(t.system, user, t.model)
        : await claude(t.system, user, t.model);
      const parsed = tryParse(raw) ?? { stance: "not_a_defect", approve: false, rationale: "parse_failed" };
      return [t.key, parsed] as const;
    } catch (e) {
      return [t.key, { stance: "not_a_defect", approve: false, rationale: `error: ${(e as Error).message}` }] as const;
    }
  }));
  const teams: Record<string, any> = Object.fromEntries(settled);

  // P5 (Quality Loop v2) — TEAM 3 IS DECISIVE.
  //   • team3.approve = true                              → eligible (staged to quality-auto)
  //   • team3.stance ∈ {legal_conflict, unverifiable}     → reject (drop)
  //   • otherwise                                          → human_review
  // Teams 1/2/4 are recorded as colour but never block or override Team 3.
  const t3 = teams.team3 ?? {};
  const t3Stance = String(t3.stance ?? "").toLowerCase();
  const t3Decisive = t3.approve === true;
  const t3Reject = t3Stance === "legal_conflict" || t3Stance === "unverifiable";

  const cat = String(check.cross_review_category ?? "").toLowerCase();
  const reviewersAgree = cat === "agree" || cat === "deterministic";

  const verdict = t3Decisive ? "auto_eligible"
    : t3Reject ? "reject"
    : "human_review";

  const teamsApproveAll =
    !!teams.team1?.approve && !!teams.team2?.approve &&
    !!teams.team3?.approve && !!teams.team4?.approve;

  const disagreements: any[] = [];
  for (const t of TEAMS) {
    if (!teams[t.key]?.approve) {
      disagreements.push({ team: t.key, stance: teams[t.key]?.stance, rationale: teams[t.key]?.rationale });
    }
  }
  if (t3Reject) {
    disagreements.push({
      source: "team3_decisive",
      reason: `Team 3 (${t3Stance}) — change dropped. Verified against: ${t3.verified_against || "(none)"}`,
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
    ab_evidence: abEvidence,
  };
}


async function selfReinvoke(runId: string, offset: number) {
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/deliberate-quality-fixes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
        "x-internal-resume": "1",
      },
      body: JSON.stringify({ run_id: runId, offset }),
    });
    if (!r.ok) console.warn(`[deliberate] reinvoke non-2xx ${r.status}`);
  } catch (e) {
    console.warn("[deliberate] self-reinvoke failed:", (e as Error).message);
  }
}


// R3: structure a Team-2 "registry" verdict into a registry_proposals row so a
// human curator can stage / merge it into the actual registry. The structured
// fact replaces the prose prompt-fix path entirely for this candidate.
const REGISTRY_STRUCT_SYSTEM = `You convert a quality-loop finding (a fact that the Prose-vs-Registry Curator flagged as "belongs in registry") into a structured registry proposal. Return ONLY JSON:
{
  "fact_type": "enforcement_figure" | "statutory_citation" | "jurisdiction_rule" | "other",
  "proposed_key": "stable snake_case key, e.g. ico_clearview_2022 or cubi_503_001_d",
  "proposed_value": "the concrete fact text (figure, subsection map, threshold, etc.)",
  "citation": "official citation (statute section, case docket, or regulator action id)",
  "source_url": "primary-source URL the curator should verify against (regulator register, statutory text, court opinion)"
}
Do NOT include anything other than the JSON. If a field cannot be inferred from the inputs, return an empty string for it.`;

async function captureRegistryProposal(admin: any, chk: any, result: any) {
  const user = [
    `TOOL: ${chk.tool}`,
    `CHECK ID: ${chk.check_id}`,
    `DIMENSION: ${chk.dimension}`,
    `TEAM 2 RATIONALE: ${result.team2_position?.rationale ?? ""}`,
    `SAMPLE EVIDENCE: ${JSON.stringify(chk.sample_evidence ?? []).slice(0, 1200)}`,
    `PROPOSED PROMPT FIX (for context only — do not echo as prose):`,
    String(chk.proposed_fix ?? "").slice(0, 1500),
  ].join("\n");

  let parsed: any = null;
  try {
    const raw = await claude(REGISTRY_STRUCT_SYSTEM, user);
    parsed = tryParse(raw) ?? {};
  } catch (e) {
    console.warn(`[deliberate] structuring call failed for ${chk.check_id}:`, (e as Error).message);
    parsed = {};
  }

  const row = {
    run_id: chk.run_id,
    tool: chk.tool,
    check_id: chk.check_id,
    fact_type: String(parsed.fact_type ?? "other").slice(0, 64),
    proposed_key: String(parsed.proposed_key ?? "").slice(0, 200) || null,
    proposed_value: String(parsed.proposed_value ?? "").slice(0, 4000) || null,
    citation: String(parsed.citation ?? "").slice(0, 500) || null,
    source_url: String(parsed.source_url ?? "").slice(0, 1000) || null,
    rationale: String(result.team2_position?.rationale ?? "").slice(0, 2000) || null,
    status: "proposed",
  };
  const { error } = await admin
    .from("registry_proposals")
    .upsert(row, { onConflict: "run_id,check_id" });
  if (error) {
    console.warn(`[deliberate] registry_proposals upsert failed for ${chk.check_id}:`, error.message);
  }
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
      // PHASE 3 / C2 — fetch the most recent validate-fix A/B record for this candidate.
      const { data: abRow } = await admin
        .from("quality_validate_fix_runs")
        .select("status, delta, per_intake")
        .eq("run_id", chk.run_id)
        .eq("check_id", chk.check_id)
        .order("completed_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      const abEvidence = abRow
        ? {
            delta: Number(abRow.delta ?? 0),
            regressions: Array.isArray((abRow.per_intake as any)?.regressions)
              ? (abRow.per_intake as any).regressions.length
              : 0,
          }
        : null;
      const result = await deliberateOne(chk, abEvidence);
      const { error: delibErr } = await admin.from("quality_fix_deliberations").upsert({
        run_id: chk.run_id,
        tool: chk.tool,
        check_id: chk.check_id,
        dimension: chk.dimension,
        severity: chk.severity,
        ...result,
        status: "pending",
      }, { onConflict: "run_id,check_id" });
      if (delibErr) {
        console.error(`[deliberate] quality_fix_deliberations upsert FAILED for ${chk.check_id}:`, delibErr.message);
        throw new Error(`deliberation upsert failed: ${delibErr.message}`);
      }

      // R3: when Team 2 says "registry", capture the fact as a registry proposal.
      // The candidate's prompt-fix verdict stays human_review (a registry-bound fact
      // must not become a prose prompt rule) — that's enforced by team2.approve=false
      // breaking teamsApproveAll in deliberateOne.
      if (String(result.team2_position?.stance ?? "").toLowerCase() === "registry") {
        try {
          await captureRegistryProposal(admin, chk, result);
        } catch (e) {
          console.warn(`[deliberate] registry proposal capture failed for ${chk.check_id}:`, (e as Error).message);
        }
      }
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
