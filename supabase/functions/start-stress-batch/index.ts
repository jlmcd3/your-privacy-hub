// start-stress-batch — server-side orchestrator for fixture generation.
// Receives the batch configuration, creates the batch row, then self-chains
// through every company calling generate-stress-fixtures and inserting job rows.
// Returns 202 immediately; all work runs in EdgeRuntime.waitUntil().
// Closing the browser tab after calling this is completely safe.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const ALL_TOOLS = [
  { id: "governance", geo: "both" },
  { id: "dpa",        geo: "both" },
  { id: "ir-playbook",geo: "both" },
  { id: "biometric",  geo: "both" },
  { id: "registration",geo:"both" },
  { id: "lia",        geo: "eu"   },
  { id: "dpia",       geo: "eu"   },
  { id: "ropa",       geo: "eu"   },
  { id: "eu-notice",  geo: "eu"   },
  { id: "us-notice",  geo: "us"   },
  { id: "cppa-risk",  geo: "us"   },
  { id: "cppa-cyber", geo: "us"   },
  { id: "cppa-admt",  geo: "us"   },
];

const TOOL_FIXTURE_KEY: Record<string, string> = {
  "lia": "lia", "dpia": "dpia", "governance": "governance",
  "biometric": "biometric", "dpa": "dpa", "ir-playbook": "irPlaybook",
  "ropa": "ropa", "us-notice": "usNotice", "eu-notice": "euNotice",
  "cppa-risk": "cppaRisk", "cppa-cyber": "cppaCyber", "cppa-admt": "cppaAdmt", "registration": "registration",
};

// UI/productRegistry aliases → canonical stress id used by ALL_TOOLS / fixture map.
// QualityLoop admin UI passes productRegistry slugs like "biometric-checker" /
// "dpa-generator"; normalize them so the tool isn't silently dropped.
const TOOL_ID_ALIASES: Record<string, string> = {
  "biometric-checker": "biometric",
  "dpa-generator":     "dpa",
};
function normalizeToolId(id: string): string { return TOOL_ID_ALIASES[id] ?? id; }


async function invokeFn(name: string, body: unknown, timeoutMs = 360_000): Promise<any> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  let data: any = null;
  try { data = await r.json(); } catch { /* ignore */ }
  if (!r.ok) throw new Error(`${name} ${r.status}: ${JSON.stringify(data ?? {}).slice(0, 300)}`);
  if (data?.error) throw new Error(`${name}: ${data.detail ?? data.error}`.slice(0, 300));
  return data;
}

async function generateFixtures(c: { industryLabel: string; geo: string; slot: number }, companyId: string): Promise<any> {
  const profile = await invokeFn("generate-stress-fixtures", {
    industry: c.industryLabel,
    geo: c.geo,
    company_slot: c.slot,
    company_id: companyId,
    part: "profile",
  }, 300_000);

  const geoData = await invokeFn("generate-stress-fixtures", {
    industry: c.industryLabel,
    geo: c.geo,
    company_slot: c.slot,
    company_id: companyId,
    company_name: profile.companyName ?? companyId,
    part: "geo",
  }, 300_000);

  return { ...profile, ...geoData };
}

async function processNextCompany(batchId: string, companyIndex: number): Promise<void> {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  let reachedEnd = false;

  try {
    const { data: batch } = await admin
      .from("static_stress_batches")
      .select("id, status, industries, geo_filter, selected_tools, companies, run_by")
      .eq("id", batchId)
      .single();

    if (!batch || batch.status === "cancelled") {
      reachedEnd = true;
      return;
    }

    const companies: Array<{
      industryId: string; industryLabel: string; geo: string; slot: number;
    }> = batch.companies ?? [];

    if (companyIndex >= companies.length) {
      // Setup complete — update total_jobs count and mark batch running.
      // Workers were already launched after the first company, so no need
      // to launch them here. Just update the total so the finalise guard
      // in run-stress-job knows setup is done.
      reachedEnd = true;
      const { count } = await admin
        .from("static_stress_jobs")
        .select("id", { count: "exact", head: true })
        .eq("batch_id", batchId);  // all statuses — count everything inserted

      const totalJobs = count ?? 0;

      await admin.from("static_stress_batches").update({
        total_jobs: totalJobs,
        status: totalJobs > 0 ? "running" : "complete",
        started_at: new Date().toISOString(),
      }).eq("id", batchId);
      return;
    }

    const c = companies[companyIndex];
    const companyId = `${c.geo}-${c.industryId}-slot${c.slot}`;
    const selectedTools: string[] = (batch.selected_tools ?? ALL_TOOLS.map((t) => t.id)).map(normalizeToolId);


    try {
      const fixtures = await generateFixtures(c, companyId);

      const applicable = selectedTools.filter((toolId) => {
        const td = ALL_TOOLS.find((a) => a.id === toolId);
        return td && (td.geo === "both" || td.geo === c.geo);
      });

      const jobRows = applicable
        .map((toolId) => ({
          toolId,
          payload: fixtures[TOOL_FIXTURE_KEY[toolId]],
        }))
        .filter((j) => j.payload)
        .map((j) => ({
          batch_id: batchId,
          company_id: companyId,
          company_name: fixtures.companyName ?? companyId,
          industry: c.industryLabel,
          geo: c.geo,
          tool_slug: j.toolId,
          fixture_data: j.payload,
          status: "pending",
        }));

      if (jobRows.length) {
        await admin.from("static_stress_jobs").insert(jobRows);
      }

      await admin.from("static_stress_batches")
        .update({ setup_done: companyIndex + 1 })
        .eq("id", batchId);

      // After the first company's jobs are inserted, launch 8 parallel workers.
      // They will continuously claim and process jobs as more companies are
      // added by the ongoing setup chain. Workers self-sustain via selfInvokeNext.
      if (companyIndex === 0 && jobRows.length > 0) {
        await admin.from("static_stress_batches").update({
          status: "running",
          started_at: new Date().toISOString(),
        }).eq("id", batchId);

        const WORKER_COUNT = 12;
        for (let w = 0; w < WORKER_COUNT; w++) {
          await new Promise((r) => setTimeout(r, w * 800));
          invokeFn("run-stress-job", { batch_id: batchId, job_id: null }).catch((e) =>
            console.warn(`[start-stress-batch] worker ${w} early-start launch failed:`, e)
          );
        }
      }

    } catch (err) {
      const errMsg = (err as Error).message?.slice(0, 480) ?? "unknown";
      console.warn(`[start-stress-batch] fixture failed for ${companyId}:`, errMsg);

      try {
        await admin.from("static_stress_jobs").insert({
          batch_id: batchId,
          company_id: companyId,
          company_name: `[Fixture failed] ${companyId}`,
          industry: c.industryLabel,
          geo: c.geo,
          tool_slug: "fixture-generation",
          status: "failed",
          error_message: errMsg,
          completed_at: new Date().toISOString(),
        });
      } catch (insertErr) {
        console.warn(`[start-stress-batch] failed to insert failure placeholder for ${companyId}:`, insertErr);
      }

      try {
        await admin.from("static_stress_batches")
          .update({ setup_done: companyIndex + 1 })
          .eq("id", batchId);
      } catch (updateErr) {
        console.warn(`[start-stress-batch] failed to update setup_done for ${companyId}:`, updateErr);
      }
    }


  } catch (fatalErr) {
    console.error("[start-stress-batch] fatal error in processNextCompany:", fatalErr);
    reachedEnd = true;
    try {
      await admin.from("static_stress_batches").update({
        error_log: `Setup interrupted at company ${companyIndex} — fatal error: ${(fatalErr as Error).message?.slice(0, 300) ?? "unknown"}. Click Resume Setup to continue.`,
      }).eq("id", batchId).eq("status", "pending");
    } catch { /* best-effort */ }
  } finally {
    if (!reachedEnd) {
      selfInvokeNext(batchId, companyIndex + 1);
    }
  }
}

async function repairFixtureFailures(batchId: string): Promise<{ repaired: number; failed: number }> {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: batch } = await admin
    .from("static_stress_batches")
    .select("id, selected_tools, companies")
    .eq("id", batchId)
    .single();
  if (!batch) throw new Error("batch not found");

  const { data: placeholders } = await admin
    .from("static_stress_jobs")
    .select("id, company_id, error_message")
    .eq("batch_id", batchId)
    .eq("tool_slug", "fixture-generation")
    .eq("status", "failed")
    .limit(2);

  const companies: Array<{ industryId: string; industryLabel: string; geo: string; slot: number }> = batch.companies ?? [];
  const selectedTools: string[] = (batch.selected_tools ?? ALL_TOOLS.map((t) => t.id)).map(normalizeToolId);
  let repaired = 0;
  let failed = 0;

  for (const p of placeholders ?? []) {
    const c = companies.find((candidate) => `${candidate.geo}-${candidate.industryId}-slot${candidate.slot}` === p.company_id);
    if (!c) { failed++; continue; }
    try {
      const fixtures = await generateFixtures(c, p.company_id);
      const applicable = selectedTools.filter((toolId) => {
        const td = ALL_TOOLS.find((a) => a.id === toolId);
        return td && (td.geo === "both" || td.geo === c.geo);
      });
      const rows = applicable
        .map((toolId) => ({ toolId, payload: fixtures[TOOL_FIXTURE_KEY[toolId]] }))
        .filter((j) => j.payload)
        .map((j) => ({
          batch_id: batchId,
          company_id: p.company_id,
          company_name: fixtures.companyName ?? p.company_id,
          industry: c.industryLabel,
          geo: c.geo,
          tool_slug: j.toolId,
          fixture_data: j.payload,
          status: "pending",
        }));
      if (rows.length) await admin.from("static_stress_jobs").insert(rows);
      await admin.from("static_stress_jobs").delete().eq("id", p.id);
      repaired++;
    } catch (e) {
      failed++;
      await admin.from("static_stress_jobs").update({
        error_message: `repair failed: ${(e as Error).message?.slice(0, 420) ?? "unknown"}`,
      }).eq("id", p.id);
    }
  }

  const { count } = await admin.from("static_stress_jobs")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId);
  const { count: remainingFixtures } = await admin.from("static_stress_jobs")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId)
    .eq("tool_slug", "fixture-generation")
    .eq("status", "failed");
  await admin.from("static_stress_batches").update({
    total_jobs: count ?? 0,
    status: "running",
    error_log: remainingFixtures ? `Fixture repair throttled; ${remainingFixtures} fixture placeholder(s) remain queued for repair.` : null,
  }).eq("id", batchId);
  if ((remainingFixtures ?? 0) > 0) {
    await new Promise((r) => setTimeout(r, 65_000));
    invokeFn("start-stress-batch", { batch_id: batchId, action: "repair_fixture_failures" }, 30_000)
      .catch((e) => console.warn("[start-stress-batch] chained fixture repair failed:", e));
  }
  invokeFn("run-stress-job", { batch_id: batchId, job_id: null }).catch((e) =>
    console.warn("[start-stress-batch] repair worker launch failed:", e)
  );
  return { repaired, failed };
}

function selfInvokeNext(batchId: string, nextIndex: number): void {
  const attempt = (remaining: number) => {
    (async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/start-stress-batch`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ batch_id: batchId, company_index: nextIndex }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!r.ok && remaining > 1) {
          setTimeout(() => attempt(remaining - 1), 2000);
        }
      } catch (_e) {
        if (remaining > 1) {
          setTimeout(() => attempt(remaining - 1), 2000);
        } else {
          console.error("[start-stress-batch] self-invoke exhausted retries for batch", batchId);
          try {
            const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
            await admin.from("static_stress_batches").update({
              error_log: `Setup interrupted at company ${nextIndex} — self-invoke failed. Click Resume Setup to continue.`,
            }).eq("id", batchId).eq("status", "pending");
          } catch { /* best-effort */ }
        }
      }
    })();
  };
  attempt(3);
}

Deno.serve(async (req) => {
  console.log("[start-stress-batch] build 2026-07-02-guard-v2");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const caller = await verifyCaller(req);
  if (!caller.internal) {
    if (!caller.userId) return json({ error: "forbidden" }, 403);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: caller.userId, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }

  const { batch_id, company_index, industries, geo_filter, selected_tools, run_by, action, slots_per_geo } = body ?? {};
  const slotsPerGeo = Math.max(1, Math.min(2, Number.isFinite(Number(slots_per_geo)) ? Number(slots_per_geo) : 2));

  if (action === "repair_fixture_failures" && batch_id) {
    // @ts-ignore
    EdgeRuntime.waitUntil(repairFixtureFailures(batch_id));
    return json({ accepted: true }, 202);
  }

  if (batch_id && company_index !== undefined) {
    // @ts-ignore
    EdgeRuntime.waitUntil(processNextCompany(batch_id, company_index));
    return json({ accepted: true }, 202);
  }

  if (!industries || !geo_filter || !run_by) {
    return json({ error: "missing required fields: industries, geo_filter, run_by" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const geos = geo_filter === "both" ? ["us", "eu"] : [geo_filter];
  const companies: Array<{ industryId: string; industryLabel: string; geo: string; slot: number }> = [];
  for (const ind of industries as Array<{ id: string; label: string }>) {
    for (const g of geos) {
      for (let slot = 1; slot <= slotsPerGeo; slot++) {
        companies.push({ industryId: ind.id, industryLabel: ind.label, geo: g, slot });
      }
    }
  }

  // Log synthesized companies for post-mortem debugging (all-skip runs) and
  // assert setup_total matches. If geo "both" yielded no EU (or no US) wave,
  // fail fast rather than silently produce a half-covered batch.
  console.log(`[start-stress-batch] synthesized ${companies.length} companies for geo_filter=${geo_filter} slots_per_geo=${slotsPerGeo}:`,
    JSON.stringify(companies.map((c) => `${c.geo}-${c.industryId}-slot${c.slot}`)));
  if (geo_filter === "both") {
    const hasUs = companies.some((c) => c.geo === "us");
    const hasEu = companies.some((c) => c.geo === "eu");
    if (!hasUs || !hasEu) {
      return json({ error: `geo_filter=both but companies missing wave(s): us=${hasUs} eu=${hasEu}` }, 500);
    }
  }

  const { data: batch, error: bErr } = await admin.from("static_stress_batches").insert({
    run_by,
    status: "pending",
    industries: industries.map((i: any) => i.label),
    geo_filter,
    total_jobs: 0,
    setup_total: companies.length,
    setup_done: 0,
    selected_tools: (selected_tools ?? ALL_TOOLS.map((t) => t.id)).map(normalizeToolId),
    companies,
  }).select("id").single();

  if (bErr || !batch) {
    return json({ error: `batch insert: ${bErr?.message}` }, 500);
  }

  // @ts-ignore
  EdgeRuntime.waitUntil(processNextCompany(batch.id, 0));
  return json({ batch_id: batch.id }, 202);
});
