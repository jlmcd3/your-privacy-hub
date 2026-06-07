// Weekly watcher for official CPPA/CCPA sources.
// Splits page text by citation heading and diffs per-section so cosmetic
// page changes don't unverify a whole batch.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ALERT_EMAIL = Deno.env.get("ALERT_EMAIL");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function stripHtml(html: string, selector?: string): string {
  // crude main-content extraction: drop scripts/styles, then strip tags
  let s = html;
  if (selector) {
    // very crude selector: just find the first matching tag id
    const m = selector.match(/#([\w-]+)/);
    if (m) {
      const re = new RegExp(`<[^>]*id=["']${m[1]}["'][^>]*>([\\s\\S]*?)<\\/[a-z]+>`, "i");
      const hit = s.match(re);
      if (hit) s = hit[1];
    }
  }
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "")
       .replace(/<style[\s\S]*?<\/style>/gi, "")
       .replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<[^>]+>/g, " ");
  // collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  // remove volatile lines
  s = s.replace(/\blast (updated|modified|reviewed)[^.]*\./gi, "")
       .replace(/\b(20\d{2}-\d{2}-\d{2})\b/g, "");
  return s;
}

// SECTION SPLITTING: by citation headings, e.g. "§ 7025", "1798.120"
const SECTION_HEAD_RE = /(§\s*\d{4}(?:\.\d+)?|\b1798\.\d{1,3}(?:\.\d+)?)/g;

function splitSections(text: string): Record<string, string> {
  const matches: { idx: number; cite: string }[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(SECTION_HEAD_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    matches.push({ idx: m.index, cite: m[0].replace(/\s+/g, " ").trim() });
  }
  if (matches.length === 0) return { __whole__: text };
  const out: Record<string, string> = {};
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].idx;
    const end = i + 1 < matches.length ? matches[i + 1].idx : text.length;
    const cite = matches[i].cite;
    // last-in wins (sections may be referenced multiple times; keep longest)
    const slice = text.slice(start, end).trim();
    if (!out[cite] || slice.length > out[cite].length) out[cite] = slice;
  }
  return out;
}

async function sendEmail(subject: string, body: string) {
  if (!RESEND_API_KEY || !ALERT_EMAIL) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "End User Privacy <alerts@enduserprivacy.com>",
        to: [ALERT_EMAIL],
        subject,
        text: body,
      }),
    });
  } catch (e) { console.warn("email failed:", e); }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Admin-only: write path. Require admin token or service role.
  const auth = req.headers.get("Authorization") ?? "";
  const xAdmin = req.headers.get("x-admin-token") ?? "";
  const bearer = auth.replace("Bearer ", "");
  const authorized =
    (ADMIN_TOKEN && (auth.includes(ADMIN_TOKEN) || xAdmin === ADMIN_TOKEN)) ||
    bearer === SUPABASE_SERVICE_KEY;
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Seed default registry rows if empty
  const { count } = await admin.from("cppa_source_registry")
    .select("*", { count: "exact", head: true });
  if ((count ?? 0) === 0) {
    await admin.from("cppa_source_registry").insert([
      {
        source_name: "CPPA Regulations (Title 11, Division 6, Chapter 1)",
        url: "https://cppa.ca.gov/regulations/",
        source_type: "regulation",
        extraction_selector: null,
        active: true,
      },
      {
        source_name: "CPPA Enforcement & News",
        url: "https://cppa.ca.gov/enforcement/",
        source_type: "enforcement",
        extraction_selector: null,
        active: true,
      },
      {
        source_name: "California CCPA Statute (leginfo)",
        url: "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5",
        source_type: "statute",
        extraction_selector: null,
        active: true,
      },
    ]);
  }

  const { data: sources } = await admin
    .from("cppa_source_registry").select("*").eq("active", true);

  const summary: any[] = [];
  for (const src of sources ?? []) {
    try {
      const resp = await fetch(src.url, {
        headers: { "User-Agent": "EUP-CPPA-Watcher/1.0 (+enduserprivacy.com)" },
        signal: AbortSignal.timeout(45_000),
      });
      const html = await resp.text();
      const normalised = stripHtml(html, src.extraction_selector ?? undefined);
      const sections = splitSections(normalised);

      const prior = (src.last_normalised_text as any) ?? {};
      const priorMap: Record<string, string> = typeof prior === "object" && prior !== null ? prior : {};

      const changed: string[] = [];
      const next: Record<string, string> = { ...priorMap };
      for (const [cite, txt] of Object.entries(sections)) {
        if (priorMap[cite] !== txt) {
          if (priorMap[cite] !== undefined) changed.push(cite);
          else if (Object.keys(priorMap).length > 0) changed.push(cite); // newly seen section
          next[cite] = txt;
        }
      }

      const changeDetected = changed.length > 0 && Object.keys(priorMap).length > 0;
      const patch: any = { last_checked: new Date().toISOString() };
      if (changeDetected || Object.keys(priorMap).length === 0) {
        patch.last_normalised_text = next;
        if (changeDetected) patch.last_changed = new Date().toISOString();
      }
      await admin.from("cppa_source_registry").update(patch).eq("id", src.id);

      await admin.from("cppa_ingestion_log").insert({
        run_type: "update_check",
        source_url: src.url,
        change_detected: changeDetected,
        details: {
          source_name: src.source_name,
          changed_sections: changed,
          section_count: Object.keys(sections).length,
          first_seed: Object.keys(priorMap).length === 0,
        },
      });

      if (changeDetected) {
        await sendEmail(
          `[CPPA Watcher] ${changed.length} section(s) changed: ${src.source_name}`,
          `Source: ${src.url}\nChanged sections:\n${changed.map((c) => "  " + c).join("\n")}\n\nReview at /admin/cppa-corpus`,
        );
      }

      summary.push({ source: src.source_name, change_detected: changeDetected, changed_sections: changed });
    } catch (e) {
      console.error("watcher error for", src.url, e);
      summary.push({ source: src.source_name, error: String(e) });
      await admin.from("cppa_ingestion_log").insert({
        run_type: "update_check",
        source_url: src.url,
        change_detected: false,
        details: { error: String(e) },
      });
    }
  }

  return json({ ok: true, summary });
});
