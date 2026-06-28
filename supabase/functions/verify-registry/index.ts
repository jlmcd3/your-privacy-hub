// FORK-R1 R5 — Scheduled registry verification.
//
// For every registry entry across enforcement-figures + statutory-rules:
//   - flag any whose lastVerified is older than 90 days
//   - HTTP-check that each verifyAgainst URL resolves (2xx, with HEAD then GET
//     fallback for servers that don't support HEAD)
// Results land in public.registry_verification_log so an admin page can surface
// stale or broken entries for human re-verification against primary law.
//
// Nothing is auto-changed. This flags WHAT to re-check — the deep confirmation
// (figure still matches the source) stays human.
//
// Triggered by pg_cron weekly (see schedule SQL); also callable manually by admin.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ICO_FIGURES } from "../_shared/enforcement-figures-registry.ts";
import { allStatutoryEntries } from "../_shared/registry/statutory-rules-registry.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY     = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const STALE_DAYS = 90;
const HTTP_TIMEOUT_MS = 15_000;

type Entry = {
  source: string;     // registry name (e.g. "ICO_FIGURES", "BIPA_CITATIONS")
  entry_id: string;   // entry.id
  verify_against: string;
  last_verified: string;
};

function collectEntries(): Entry[] {
  const out: Entry[] = [];
  for (const f of ICO_FIGURES) {
    out.push({
      source: "ICO_FIGURES",
      entry_id: f.id,
      verify_against: f.verifyAgainst,
      last_verified: f.lastVerified,
    });
  }
  for (const e of allStatutoryEntries()) {
    out.push({
      source: e.source,
      entry_id: e.id,
      verify_against: e.verifyAgainst,
      last_verified: e.lastVerified,
    });
  }
  return out;
}

function ageDays(lastVerified: string): number {
  const t = Date.parse(lastVerified);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - t) / 86_400_000);
}

async function checkUrl(url: string): Promise<{ ok: boolean; status: number; method: "HEAD" | "GET"; error?: string }> {
  // HEAD first (cheap). Fall back to GET if the server returns 405/501 etc.
  try {
    const h = await fetch(url, { method: "HEAD", redirect: "follow", signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
    if (h.ok) return { ok: true, status: h.status, method: "HEAD" };
    if (h.status !== 405 && h.status !== 501 && h.status !== 403) {
      return { ok: false, status: h.status, method: "HEAD" };
    }
  } catch (e) {
    // fall through to GET — some hosts reject HEAD outright
    console.log(`[verify-registry] HEAD failed for ${url}: ${(e as Error).message}`);
  }
  try {
    const g = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(HTTP_TIMEOUT_MS) });
    // Drain body briefly to release connection.
    try { await g.body?.cancel(); } catch { /* */ }
    return { ok: g.ok, status: g.status, method: "GET" };
  } catch (e) {
    return { ok: false, status: 0, method: "GET", error: (e as Error).message?.slice(0, 200) };
  }
}

async function runVerification() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const entries = collectEntries();
  const checkedAt = new Date().toISOString();
  const rows: any[] = [];

  // Limit concurrency to avoid hammering regulators.
  const CONCURRENCY = 4;
  let cursor = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (cursor < entries.length) {
      const idx = cursor++;
      const e = entries[idx];
      const age = ageDays(e.last_verified);
      const stale = age > STALE_DAYS;
      let check: { ok: boolean; status: number; method: "HEAD" | "GET"; error?: string };
      try {
        check = await checkUrl(e.verify_against);
      } catch (err) {
        check = { ok: false, status: 0, method: "HEAD", error: (err as Error).message?.slice(0, 200) };
      }
      rows.push({
        entry_id: e.entry_id,
        source: e.source,
        verify_against: e.verify_against,
        last_verified: e.last_verified,
        age_days: Number.isFinite(age) ? age : null,
        stale,
        ok: check.ok,
        http_status: check.status,
        http_method: check.method,
        error: check.error ?? null,
        checked_at: checkedAt,
      });
    }
  });
  await Promise.all(workers);

  if (rows.length > 0) {
    const { error } = await admin.from("registry_verification_log").insert(rows);
    if (error) console.error("[verify-registry] insert failed:", error.message);
  }

  const stale = rows.filter(r => r.stale).length;
  const broken = rows.filter(r => !r.ok).length;
  console.log(`[verify-registry] checked=${rows.length} stale=${stale} broken=${broken}`);
  return { checked_at: checkedAt, checked: rows.length, stale, broken };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "GET or POST" }, 405);

  // pg_cron / cron job: trust the service-role bearer.
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  const isService = token === SERVICE_KEY;
  const isCron = req.headers.get("x-cron-invocation") === "1";

  if (!isService && !isCron) {
    if (!token) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: claims.claims.sub, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin only" }, 403);
  }

  try {
    const summary = await runVerification();
    return json({ ok: true, ...summary });
  } catch (e) {
    console.error("[verify-registry] failed:", e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});
