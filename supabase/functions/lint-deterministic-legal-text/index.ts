// lint-deterministic-legal-text
//
// Admin-only. Imports LEGAL_TEXT_ASSERTIONS from the three deterministic
// document generators (generate-ropa-document, generate-us-notice,
// generate-eu-notice), resolves each citation against the corpus
// (gdpr_articles for `gdpr:<jurisdiction>:<article>`; cppa_authorities for
// everything else), normalises the corpus full_text and each mustContain
// phrase (lowercase, strip non-alphanumerics), and reports per entry whether
// the corpus row was found and whether each phrase is present.
//
// Read-only: writes nothing. Auth pattern mirrors verify-registry (service-
// role bearer OR JWT + has_role('admin')).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

import {
  ROPA_LEGAL_TEXT_ASSERTIONS as ROPA_ASSERTIONS,
  US_NOTICE_LEGAL_TEXT_ASSERTIONS as US_ASSERTIONS,
  EU_NOTICE_LEGAL_TEXT_ASSERTIONS as EU_ASSERTIONS,
} from "../_shared/legal-text-assertions.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

function normalise(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

type Manifest = { citation: string; mustContain: string[] };

async function resolveCorpus(citation: string): Promise<{ found: boolean; full_text: string | null; source: string }> {
  const gdpr = /^gdpr:(eu|uk):(.+)$/i.exec(citation.trim());
  if (gdpr) {
    const jurisdiction = gdpr[1].toLowerCase();
    const article_number = gdpr[2];
    const { data, error } = await admin
      .from("gdpr_articles")
      .select("body_text")
      .eq("jurisdiction", jurisdiction)
      .eq("article_number", article_number)
      .maybeSingle();
    if (error || !data) return { found: false, full_text: null, source: "gdpr_articles" };
    return { found: true, full_text: (data as any).body_text ?? "", source: "gdpr_articles" };
  }
  const { data, error } = await admin
    .from("cppa_authorities")
    .select("full_text")
    .eq("citation", citation)
    .eq("status", "current")
    .maybeSingle();
  if (error || !data) return { found: false, full_text: null, source: "cppa_authorities" };
  return { found: true, full_text: (data as any).full_text ?? "", source: "cppa_authorities" };
}

async function lintGenerator(generator: string, entries: Manifest[]) {
  const results = [];
  for (const entry of entries) {
    const { found, full_text, source } = await resolveCorpus(entry.citation);
    const normalisedCorpus = full_text ? normalise(full_text) : "";
    const phrases = entry.mustContain.map((phrase) => ({
      phrase,
      present: found ? normalisedCorpus.includes(normalise(phrase)) : false,
    }));
    results.push({
      citation: entry.citation,
      corpus_source: source,
      corpus_row_found: found,
      phrases,
      all_phrases_present: found && phrases.every((p) => p.present),
    });
  }
  const total = results.length;
  const rows_missing = results.filter((r) => !r.corpus_row_found).length;
  const phrase_failures = results.filter((r) => r.corpus_row_found && !r.all_phrases_present).length;
  return {
    generator,
    total_assertions: total,
    corpus_rows_missing: rows_missing,
    phrase_failures,
    ok: rows_missing === 0 && phrase_failures === 0,
    entries: results,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "GET or POST" }, 405);

  // Auth: service-role bearer OR JWT with admin role.
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace("Bearer ", "");
  const isService = token && token === SERVICE_KEY;
  if (!isService) {
    if (!token) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY);
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: claims.claims.sub,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Admin only" }, 403);
  }

  try {
    const report = {
      checked_at: new Date().toISOString(),
      generators: [
        await lintGenerator("generate-ropa-document", ROPA_ASSERTIONS),
        await lintGenerator("generate-us-notice", US_ASSERTIONS),
        await lintGenerator("generate-eu-notice", EU_ASSERTIONS),
      ],
    };
    const ok = report.generators.every((g) => g.ok);
    return json({ ok, ...report });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message ?? String(e) }, 500);
  }
});
