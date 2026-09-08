// ICO (UK) enforcement ingestion.
// The ICO publishes no data API and its enforcement RSS feed was retired, so
// discovery walks the public sitemap and each candidate action page is parsed
// deterministically (no model) by _local/parse.ts. Only pages whose declared
// ICO action type is an enforcement action are landed; audits, practice
// recommendations and FOI decision notices are rejected at the gate.
//
// Actions:
//   discover  -> { urls, total }            list enforcement action pages from the sitemap
//   run       -> { scanned, inserted, ... } fetch + parse + land (supports dryRun/limit)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import {
  extractSitemapActionUrls,
  parseIcoActionPage,
  type IcoAction,
} from "./_local/parse.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const UA = "enduserprivacy-ingest/1.0";
const SITEMAP = "https://ico.org.uk/sitemap.xml";

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function discover(): Promise<string[]> {
  const xml = await fetchText(SITEMAP);
  if (!xml) return [];
  return extractSitemapActionUrls(xml);
}

function etidFor(url: string): string {
  return `ico:${url}`;
}

async function alreadyLanded(action: IcoAction): Promise<boolean> {
  const variants = [action.url, action.url.replace(/\/$/, "")];
  const { data: byUrl } = await supabase
    .from("enforcement_actions")
    .select("id")
    .in("source_url", variants)
    .limit(1);
  if (byUrl && byUrl.length > 0) return true;

  const { data: byEtid } = await supabase
    .from("enforcement_actions")
    .select("id")
    .eq("etid", etidFor(action.url))
    .limit(1);
  if (byEtid && byEtid.length > 0) return true;

  if (action.decisionDate) {
    const { data: bySubject } = await supabase
      .from("enforcement_actions")
      .select("id")
      .eq("regulator", "ICO")
      .eq("subject", action.subject)
      .eq("decision_date", action.decisionDate)
      .limit(1);
    if (bySubject && bySubject.length > 0) return true;
  }
  return false;
}

function rowFor(a: IcoAction): Record<string, unknown> {
  return {
    etid: etidFor(a.url),
    source_database: "ICO",
    source_url: a.url,
    regulator: "ICO",
    jurisdiction: "United Kingdom",
    law: "UK GDPR / Data Protection Act 2018",
    subject: a.subject,
    violation: a.narrative,
    decision_date: a.decisionDate,
    action_type: a.actionType,
    sector: a.sector,
    fine_amount: a.fineAmount,
    primary_source_url: a.pdfUrl,
    primary_source_status: a.pdfUrl ? "pending_fetch" : "pending_discovery",
    source_document_text: a.narrative,
    public_listed: true,
    triage_class: "resolved",
    quality_flags: ["missing_key_compliance_failure", "missing_preventive_measures"],
    quality_flagged_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // DB-held handshake token (same pattern as enforcement-cleanup) so scheduled
  // and internal callers that cannot read function secrets can still run.
  const driverTok = req.headers.get("x-driver-token");
  let authorised = false;
  if (driverTok) {
    const { data: tokenRow } = await supabase
      .from("internal_driver_tokens")
      .select("token")
      .eq("name", "ingest-ico-enforcement")
      .maybeSingle();
    if (tokenRow?.token && tokenRow.token === driverTok) authorised = true;
  }
  const caller = authorised
    ? { ok: true as const, userId: null, internal: true }
    : await verifyCaller(req, "admin");
  if (!caller.ok) {
    return new Response(JSON.stringify({ error: caller.error }), {
      status: caller.status ?? 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "run");
  const limit = Number(body.limit ?? 40);
  const offset = Number(body.offset ?? 0);
  const dryRun = body.dryRun === true;

  if (action === "discover") {
    const urls = await discover();
    return new Response(JSON.stringify({ total: urls.length, urls: urls.slice(0, 500) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const urls = (await discover()).slice(offset, offset + limit);
  let scanned = 0, inserted = 0, skippedExisting = 0, rejected = 0, fetchFailed = 0, errors = 0;
  const samples: unknown[] = [];

  for (const url of urls) {
    scanned++;
    const html = await fetchText(url);
    if (!html) { fetchFailed++; continue; }
    const parsed = parseIcoActionPage(url, html);
    if (!parsed) { rejected++; continue; }
    if (await alreadyLanded(parsed)) { skippedExisting++; continue; }
    if (samples.length < 5) samples.push({ ...parsed, narrative: parsed.narrative.slice(0, 200) });
    if (dryRun) { inserted++; continue; }
    const { error } = await supabase.from("enforcement_actions").insert(rowFor(parsed));
    if (error) {
      errors++;
      console.error("ico insert failed", url, error.message);
      continue;
    }
    inserted++;
  }

  return new Response(
    JSON.stringify({
      ok: true, dryRun, offset, limit,
      scanned, inserted, skippedExisting, rejected, fetchFailed, errors, samples,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
