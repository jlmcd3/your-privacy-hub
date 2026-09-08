// TEMPORARY one-off admin helper (ledger A8-6) — server-side corpus recovery.
//
// Fetches a named URL from the edge runtime, extracts text (HTML / XML / PDF),
// applies the A8-6 guard, and writes source_document_text only when the guard
// passes. No text ever crosses the chat boundary. DELETE AFTER USE.
//
// Body: { targets: [{ id, url, required?: string[] }], dry_run?: boolean }
//       { action: "flag", name: "CYBER_DETERMINISTIC_ENABLED" }
//       { action: "url_only", updates: [{ id, url }] }
// Auth: x-admin-token == ADMIN_SECRET_TOKEN, or a JWT belonging to an admin.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
const MAX_RESPONSE_BYTES = 24_000_000;
const MIN_NEW_CHARS = 5_000;
const BOT_MARKERS = [
  "just a moment",
  "security verification",
  "no eres un robot",
  "zoeken in uitspraken",
];

async function sha256Text(s: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const NAMED: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", hellip: "…",
  mdash: "—", ndash: "–", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  laquo: "«", raquo: "»", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç",
  ecirc: "ê", ocirc: "ô", ucirc: "û", icirc: "î", acirc: "â", euro: "€",
  uuml: "ü", ouml: "ö", auml: "ä", sect: "§", para: "¶", deg: "°",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(+n); } catch { return _; } })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return _; } })
    .replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (m, n) => NAMED[n] ?? m);
}

function markupToText(src: string): string {
  const stripped = src
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|li|tr|h[1-6]|br|para|section|title|emphasis)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(stripped)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function pdfToText(bytes: ArrayBuffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("https://esm.sh/unpdf@0.12.1");
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  const joined = Array.isArray(text) ? text.join("\n") : String(text ?? "");
  return joined.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

async function fetchText(url: string): Promise<{ text: string; http: number }> {
  const resp = await fetch(url, {
    headers: {
      "user-agent": BROWSER_UA,
      "accept": "text/html,application/xhtml+xml,application/xml,application/pdf,*/*;q=0.8",
      "accept-language": "en,fr;q=0.8,nl;q=0.8",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(120_000),
  });
  if (!resp.ok) {
    try { await resp.body?.cancel(); } catch { /* noop */ }
    return { text: "", http: resp.status };
  }
  const ct = (resp.headers.get("content-type") || "").toLowerCase();
  const buf = await resp.arrayBuffer();
  if (buf.byteLength > MAX_RESPONSE_BYTES) return { text: "", http: 413 };
  const isPdf = ct.includes("pdf") || url.toLowerCase().split("?")[0].endsWith(".pdf");
  const text = isPdf
    ? await pdfToText(buf)
    : markupToText(new TextDecoder("utf-8", { fatal: false }).decode(buf));
  return { text, http: resp.status };
}

async function authorised(req: Request): Promise<boolean> {
  const token = req.headers.get("x-admin-token");
  const adminSecret = Deno.env.get("ADMIN_SECRET_TOKEN");
  if (adminSecret && token === adminSecret) return true;

  const driverTok = req.headers.get("x-driver-token");
  if (driverTok) {
    const c = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: row } = await c.from("internal_driver_tokens")
      .select("token").eq("name", "admin-recover-source-text").maybeSingle();
    if (row?.token && row.token === driverTok) return true;
  }

  const auth = req.headers.get("authorization") ?? "";
  const jwt = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!jwt) return false;
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: userRes } = await client.auth.getUser(jwt);
  const uid = userRes?.user?.id;
  if (!uid) return false;
  const { data } = await client.rpc("has_role", { _user_id: uid, _role: "admin" });
  return data === true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!(await authorised(req))) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  if (body.action === "flag") {
    const name = String(body.name ?? "");
    const v = Deno.env.get(name);
    return json({ name, set: v !== undefined, value: v ?? null });
  }

  if (body.action === "url_only") {
    const out: unknown[] = [];
    for (const u of body.updates ?? []) {
      const { error } = await supabase
        .from("enforcement_actions")
        .update({ primary_source_url: u.url, refetch_last_error: null })
        .eq("id", u.id);
      out.push({ id: u.id, url: u.url, ok: !error, error: error?.message ?? null });
    }
    return json({ results: out });
  }

  const results: unknown[] = [];
  for (const t of body.targets ?? []) {
    const res: Record<string, unknown> = { id: t.id, url: t.url };
    try {
      const { data: row, error } = await supabase
        .from("enforcement_actions")
        .select("id, source_document_text, source_url")
        .eq("id", t.id)
        .maybeSingle();
      if (error || !row) throw new Error(error?.message ?? "row not found");
      const prev = (row.source_document_text as string | null) ?? "";
      res.prev_len = prev.length;

      const { text, http } = await fetchText(t.url);
      res.http = http;
      res.fetched_len = text.length;

      const lower = text.toLowerCase();
      const marker = BOT_MARKERS.find((m) => lower.includes(m));
      let reason: string | null = null;
      if (marker) reason = `bot_check_marker ("${marker}")`;
      else if (text.length < MIN_NEW_CHARS) reason = `text_too_short (${text.length} < ${MIN_NEW_CHARS})`;
      else if (text.length <= prev.length) reason = `not_longer_than_stored (${text.length} <= ${prev.length})`;
      else {
        const missing = (t.required ?? []).filter((r: string) => !text.includes(r));
        if (missing.length) reason = `required_substring_missing (${missing.join(", ")})`;
      }

      if (reason) {
        res.guard = "rejected";
        res.reason = reason;
        res.head300 = text.slice(0, 300);
        res.has_plural_accented = text.includes("intérêts légitimes");
        if (!body.dry_run) {
          await supabase.from("enforcement_actions")
            .update({ refetch_last_error: reason })
            .eq("id", t.id);
        }
      } else {
        res.guard = "passed";
        res.sha256 = await sha256Text(text);
        res.new_len = text.length;
        if (!body.dry_run) {
          const { error: wErr } = await supabase
            .from("enforcement_actions")
            .update({
              source_document_text: text,
              source_document_fetched_at: new Date().toISOString(),
              primary_source_url: t.url,
              refetch_last_error: null,
            })
            .eq("id", t.id);
          if (wErr) throw new Error(`write failed: ${wErr.message}`);
          const { data: after } = await supabase
            .from("enforcement_actions")
            .select("source_document_text")
            .eq("id", t.id)
            .maybeSingle();
          const stored = (after?.source_document_text as string | null) ?? "";
          res.stored_len = stored.length;
          res.stored_sha256 = await sha256Text(stored);
        }
      }
    } catch (e) {
      res.guard = "error";
      res.reason = (e as Error).message;
    }
    results.push(res);
  }
  return json({ results });
});
