// build-marker: sync-li-tracker@2026-09-08
console.log("[build-marker] sync-li-tracker 2026-09-08");
//
// REPEATABLE LOADER for the public Legitimate Interest Tracker.
//
//   screen  — deterministic LI confirmation over newly ingested enforcement
//             actions. Records candidates in li_ingest_candidates only; it
//             never creates authority_relevance_profiles rows (B5-1: profiles
//             come from the classify pipeline followed by verification).
//   preview — dry run of the load: what would be inserted/updated/skipped.
//   sync    — idempotent upsert of quote-verified, curated LIA profiles into
//             li_tracker_entries, keyed by source_profile_id. Never deletes,
//             and never touches rows it does not own.
//   status  — counts.

import { verifyCaller } from "../_shared/verify-caller.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { LOADER_VERSION, mapProfile, PUBLISHABLE_STAGES, type ProfileRow, type SourceMeta, type TrackerEntry } from "./_local/map.ts";
import { screenAction, SCREEN_VERSION, type ScreenInput } from "./_local/screen.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-driver-token, x-internal-cron",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function authorize(req: Request): Promise<boolean> {
  const adminTok = req.headers.get("x-admin-token");
  if (adminTok && adminTok === Deno.env.get("ADMIN_SECRET_TOKEN")) return true;

  const driverTok = req.headers.get("x-driver-token");
  if (driverTok) {
    const { data } = await admin()
      .from("internal_driver_tokens")
      .select("token")
      .eq("name", "sync-li-tracker")
      .maybeSingle();
    if (data?.token && data.token === driverTok) return true;
  }

  const caller = await verifyCaller(req);
  if (caller.internal) return true;
  if (!caller.userId) return false;
  const { data: isAdmin } = await admin().rpc("has_role", { _user_id: caller.userId, _role: "admin" });
  return !!isAdmin;
}

/** Resolve the corpus row behind each profile, per source table. */
async function loadSourceMeta(
  db: ReturnType<typeof admin>,
  profiles: ProfileRow[],
): Promise<Map<string, SourceMeta>> {
  const out = new Map<string, SourceMeta>();

  const enfIds = profiles.filter((p) => p.source_table === "enforcement_actions" && p.source_row_id).map((p) => p.source_row_id!);
  if (enfIds.length) {
    const { data } = await db
      .from("enforcement_actions")
      .select("id, regulator, jurisdiction, case_reference, source_url, primary_source_url, decision_date")
      .in("id", enfIds);
    for (const r of data ?? []) {
      out.set(`enforcement_actions:${r.id}`, {
        dpa_source: r.regulator,
        jurisdiction: r.jurisdiction,
        case_reference: r.case_reference,
        source_url: r.primary_source_url ?? r.source_url,
        dated_on: r.decision_date,
      });
    }
  }

  const guideIds = profiles.filter((p) => p.source_table === "edpb_guidelines" && p.source_row_id).map((p) => p.source_row_id!);
  if (guideIds.length) {
    const { data } = await db
      .from("edpb_guidelines")
      .select("id, guideline_ref, title, source_url, adopted_date")
      .in("id", guideIds);
    for (const r of data ?? []) {
      out.set(`edpb_guidelines:${r.id}`, {
        dpa_source: "EDPB",
        jurisdiction: "EU",
        case_reference: r.guideline_ref ?? r.title,
        source_url: r.source_url,
        dated_on: r.adopted_date,
      });
    }
  }

  return out;
}

async function buildEntries(db: ReturnType<typeof admin>) {
  const { data, error } = await db
    .from("authority_relevance_profiles")
    .select("id, product, source_table, source_row_id, country, instrument, use_case_class, outcome_posture, rule_statement, extracted_quote, quote_verified, self_consistency_agreement, pipeline_stage, ratified_at, curated_at")
    .eq("product", "lia")
    .eq("quote_verified", true)
    .in("pipeline_stage", PUBLISHABLE_STAGES as unknown as string[]);
  if (error) throw new Error(error.message);

  const profiles = (data ?? []) as ProfileRow[];
  const meta = await loadSourceMeta(db, profiles);

  const entries: TrackerEntry[] = [];
  const skipped: { profile_id: string; reason: string }[] = [];
  for (const p of profiles) {
    const m = meta.get(`${p.source_table}:${p.source_row_id}`) ?? null;
    const r = mapProfile(p, m);
    if (r.ok) entries.push(r.entry);
    else skipped.push({ profile_id: r.profile_id, reason: r.reason });
  }
  return { considered: profiles.length, entries, skipped };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!(await authorize(req))) return json({ error: "forbidden" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body ok */ }
  const action = String(body.action ?? "status");
  const db = admin();

  try {
    if (action === "status") {
      const [{ count: entryCount }, { count: loaded }, { count: candidates }] = await Promise.all([
        db.from("li_tracker_entries").select("id", { count: "exact", head: true }),
        db.from("li_tracker_entries").select("id", { count: "exact", head: true }).not("source_profile_id", "is", null),
        db.from("li_ingest_candidates").select("id", { count: "exact", head: true }).eq("confirmed", true),
      ]);
      return json({ ok: true, loader_version: LOADER_VERSION, tracker_entries: entryCount ?? 0, loader_owned: loaded ?? 0, confirmed_candidates: candidates ?? 0 });
    }

    if (action === "preview" || action === "sync") {
      const { considered, entries, skipped } = await buildEntries(db);

      const reasons: Record<string, number> = {};
      for (const s of skipped) reasons[s.reason] = (reasons[s.reason] ?? 0) + 1;

      if (action === "preview") {
        return json({ ok: true, dry_run: true, loader_version: LOADER_VERSION, considered, eligible: entries.length, skipped: reasons, sample: entries.slice(0, 5) });
      }

      const now = new Date().toISOString();
      let written = 0;
      for (let i = 0; i < entries.length; i += 50) {
        const chunk = entries.slice(i, i + 50).map((e) => ({ ...e, synced_at: now, updated_at: now }));
        const { error } = await db.from("li_tracker_entries").upsert(chunk, { onConflict: "source_profile_id" });
        if (error) throw new Error(error.message);
        written += chunk.length;
      }

      // Mark any ingest candidate whose action has now reached the tracker.
      const enfIds = entries.map((e) => e.source_enforcement_id).filter(Boolean) as string[];
      if (enfIds.length) {
        await db.from("li_ingest_candidates")
          .update({ downstream_state: "loaded", updated_at: now })
          .in("enforcement_action_id", enfIds);
      }

      return json({ ok: true, loader_version: LOADER_VERSION, considered, written, skipped: reasons });
    }

    if (action === "screen") {
      const limit = Math.min(Math.max(Number(body.limit ?? 100), 1), 500);
      const since = typeof body.since === "string" ? body.since : null;

      let q = db
        .from("enforcement_actions")
        .select("id, law, violation, subject, source_document_text, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (since) q = q.gte("created_at", since);
      const { data, error } = await q;
      if (error) throw new Error(error.message);

      const rows = (data ?? []) as (ScreenInput & { created_at: string })[];
      const outcomes = rows.map((r) => screenAction(r));
      const now = new Date().toISOString();

      if (body.dry_run !== true && outcomes.length) {
        const payload = outcomes.map((o) => ({
          enforcement_action_id: o.enforcement_action_id,
          screen_version: SCREEN_VERSION,
          confirmed: o.confirmed,
          reason: o.reason,
          signal_hits: o.signal_hits,
          instrument: o.instrument,
          downstream_state: o.confirmed ? "pending_classification" : "not_li",
          updated_at: now,
        }));
        for (let i = 0; i < payload.length; i += 100) {
          const { error: upErr } = await db
            .from("li_ingest_candidates")
            .upsert(payload.slice(i, i + 100), { onConflict: "enforcement_action_id" });
          if (upErr) throw new Error(upErr.message);
        }
      }

      const confirmed = outcomes.filter((o) => o.confirmed);
      const reasons: Record<string, number> = {};
      for (const o of outcomes) reasons[o.reason] = (reasons[o.reason] ?? 0) + 1;
      return json({
        ok: true,
        screen_version: SCREEN_VERSION,
        dry_run: body.dry_run === true,
        screened: outcomes.length,
        confirmed: confirmed.length,
        reasons,
        confirmed_ids: confirmed.map((c) => c.enforcement_action_id).slice(0, 50),
      });
    }

    return json({ error: `unknown action: ${action}` }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message ?? e) }, 500);
  }
});
