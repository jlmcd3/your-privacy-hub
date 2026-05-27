// Track 3 — Discovery worker.
//
// For a single legacy enforcement_actions row:
//  1. Fetches the GDPRhub summary page at legacy_summary_url.
//  2. Parses the infobox for the "Decision Document" / "Decision Document URL"
//     external link (the regulator-direct URL).
//  3. Validates that the discovered URL host is on the regulator's allowlist.
//  4. Writes back primary_source_url, primary_source_url_discovered_at, and
//     primary_source_status:
//        - 'pending_fetch'              — discovered and host-allowed
//        - 'discovered_aggregator_only' — link present but host not on allowlist
//        - 'discovered_no_link'         — infobox parsed but no link found
//
// Throws on any DB write failure (the silent-INSERT failure mode is fixed
// in this pipeline as standard).
//
// Body: { row_id: string, dry_run?: boolean }
// Auth: x-admin-token header == ADMIN_SECRET_TOKEN.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { DOMParser, Element } from "https://deno.land/x/deno_dom@v0.1.45/deno-dom-wasm.ts";
import {
  resolveRegulatorAlias,
  urlHostAllowed,
  TRACK3_REGULATORS,
  type RegulatorAliasKey,
} from "../_shared/track3-regulator-aliases.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";

interface DiscoverResult {
  row_id: string;
  status:
    | "pending_fetch"
    | "discovered_aggregator_only"
    | "discovered_no_link"
    | "fetch_error_summary"
    | "skipped_no_summary_url";
  primary_source_url: string | null;
  reason?: string;
  http_status?: number;
}

async function fetchHtml(url: string): Promise<{ ok: boolean; status: number; html: string }> {
  try {
    const r = await fetch(url, {
      headers: {
        "user-agent": BROWSER_UA,
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en;q=0.9",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) return { ok: false, status: r.status, html: "" };
    const html = await r.text();
    return { ok: true, status: r.status, html };
  } catch (e) {
    console.warn(`[discover] fetch failed ${url}: ${(e as Error).message}`);
    return { ok: false, status: 0, html: "" };
  }
}

/**
 * Parses the GDPRhub infobox for the regulator-direct "Decision Document" URL.
 *
 * GDPRhub uses a MediaWiki infobox table. The decision-document field appears
 * under several label variations across the corpus:
 *   - "Decision Document"
 *   - "Decision Document URL"
 *   - "Original Source"
 *   - "Original Document"
 *   - "Source URL"
 * In every case the value cell contains a single external <a href> we want.
 *
 * Strategy: walk every row of every infobox table, lowercase the th/td-label
 * text, and pick the first matching label whose value cell has an external
 * link.
 */
function extractPrimarySourceFromGdprhub(html: string): string | null {
  if (!html) return null;
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) return null;

  const LABEL_PATTERNS = [
    /decision\s*document\s*url/i,
    /decision\s*document/i,
    /original\s*source/i,
    /original\s*document/i,
    /source\s*url/i,
    /decision\s*url/i,
  ];

  // Iterate every table row anywhere in the page; infoboxes vary by template.
  const rows = doc.querySelectorAll("table tr");
  let firstExternalCandidate: string | null = null;

  for (const r of rows) {
    const el = r as Element;
    const label = (el.querySelector("th")?.textContent ?? "").trim();
    if (!label) continue;
    const matches = LABEL_PATTERNS.some((re) => re.test(label));
    if (!matches) continue;
    const valueCell = el.querySelector("td");
    if (!valueCell) continue;
    // Prefer the first anchor that has an absolute http(s) href.
    const anchors = valueCell.querySelectorAll("a[href]");
    for (const a of anchors) {
      const href = (a as Element).getAttribute("href") ?? "";
      if (/^https?:\/\//i.test(href)) {
        if (!firstExternalCandidate) firstExternalCandidate = href;
        return href;
      }
    }
  }
  return firstExternalCandidate;
}

async function discoverOne(
  supabase: ReturnType<typeof createClient>,
  rowId: string,
  dryRun: boolean,
): Promise<DiscoverResult> {
  // Load the row.
  const { data: row, error: loadErr } = await supabase
    .from("enforcement_actions")
    .select(
      "id, legacy_summary_url, regulator, regulator_canonical, primary_source_status",
    )
    .eq("id", rowId)
    .maybeSingle();

  if (loadErr) throw new Error(`load row failed: ${loadErr.message}`);
  if (!row) throw new Error(`row not found: ${rowId}`);

  if (!row.legacy_summary_url) {
    return {
      row_id: rowId,
      status: "skipped_no_summary_url",
      primary_source_url: null,
      reason: "legacy_summary_url is null",
    };
  }

  // Resolve regulator alias for host validation.
  const aliasKey = (Object.keys(TRACK3_REGULATORS) as RegulatorAliasKey[]).find(
    (k) => {
      const a = TRACK3_REGULATORS[k];
      return (
        a.regulatorMatches.includes(row.regulator ?? "") ||
        a.regulatorMatches.includes(row.regulator_canonical ?? "")
      );
    },
  );
  const alias = aliasKey ? TRACK3_REGULATORS[aliasKey] : null;

  // Fetch the GDPRhub summary page.
  const fetched = await fetchHtml(row.legacy_summary_url);
  if (!fetched.ok) {
    return {
      row_id: rowId,
      status: "fetch_error_summary",
      primary_source_url: null,
      http_status: fetched.status,
      reason: `gdprhub fetch returned ${fetched.status}`,
    };
  }

  const candidate = extractPrimarySourceFromGdprhub(fetched.html);
  if (!candidate) {
    if (!dryRun) {
      const { error } = await supabase
        .from("enforcement_actions")
        .update({
          primary_source_status: "discovered_no_link",
          primary_source_url_discovered_at: new Date().toISOString(),
        })
        .eq("id", rowId);
      if (error) throw new Error(`write discovered_no_link failed: ${error.message}`);
    }
    return { row_id: rowId, status: "discovered_no_link", primary_source_url: null };
  }

  // Host validation.
  const hostOk = alias
    ? urlHostAllowed(candidate, alias.allowedHosts)
    : false;

  const newStatus = hostOk ? "pending_fetch" : "discovered_aggregator_only";

  if (!dryRun) {
    const { error } = await supabase
      .from("enforcement_actions")
      .update({
        primary_source_url: candidate,
        primary_source_url_discovered_at: new Date().toISOString(),
        primary_source_status: newStatus,
      })
      .eq("id", rowId);
    if (error) throw new Error(`write discovery failed: ${error.message}`);
  }

  return {
    row_id: rowId,
    status: newStatus,
    primary_source_url: candidate,
    reason: hostOk ? undefined : `host not on allowlist for ${aliasKey ?? "unknown regulator"}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const adminTok = req.headers.get("x-admin-token");
  if (!adminTok || adminTok !== Deno.env.get("ADMIN_SECRET_TOKEN")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { row_id?: string; dry_run?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!body.row_id) {
    return new Response(JSON.stringify({ error: "row_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const result = await discoverOne(supabase, body.row_id, Boolean(body.dry_run));
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[discover] error:", e);
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// Exports for unit testing.
export { extractPrimarySourceFromGdprhub, discoverOne };
