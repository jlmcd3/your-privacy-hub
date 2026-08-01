// Ingests EDPB One-Stop-Shop (Article 60) final decisions register entries and
// EDPB One-Stop-Shop thematic case digests into public.edpb_oss_decisions.
//
// Sources (confirmed live 2026-08-01):
//   Register: https://www.edpb.europa.eu/our-work-tools/consistency-findings/register-for-article-60-final-decisions_en
//             (canonical alias: /registers/register-of-final-one-stop-shop-decisions_en)
//   Digests:  https://www.edpb.europa.eu/one-stop-shop-case-digests_en
//
// Content model note: this material is EDPB-authored, official, English-language
// output. It is therefore stored with a simple `status` field ('final'), mirroring
// edpb_guidelines.status — NOT the enforcement_actions verified/failed pipeline,
// which exists to police third-party-sourced claims about a regulator's decision.
// Here the publisher IS the authority.
//
// Batched + resumable: caller supplies { start_page, max_pages }. The function
// walks register pages sequentially and stops at the first empty page or when
// max_pages is exhausted, returning next_page for the follow-up call.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf";
import { normaliseArticleCitations } from "../_shared/deterministic-checks.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

const REGISTER_BASE =
  "https://www.edpb.europa.eu/registers/register-of-final-one-stop-shop-decisions_en";
const DIGEST_INDEX = "https://www.edpb.europa.eu/one-stop-shop-case-digests_en";
const USER_AGENT =
  "EndUserPrivacy-EDPBOSSIngest/1.0 (+https://enduserprivacy.com; contact: support@enduserprivacy.com)";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&rsquo;|&#8217;/g, "\u2019")
    .replace(/&ldquo;/g, "\u201c")
    .replace(/&rdquo;/g, "\u201d");
}

function absoluteUrl(href: string): string {
  return href.startsWith("http") ? href : `https://www.edpb.europa.eu${href}`;
}

function uniq(xs: string[]): string[] {
  return Array.from(new Set(xs.filter((x) => x && x.length > 0)));
}

/**
 * "Article 17 (Right to erasure ('right to be forgotten'))" -> "Article 17".
 * "Art. 5 Abs. 1 lit. a" -> "Article 5(1)(a)" via the shared normaliser, so the
 * array matches the canonical form used for enforcement_actions.statutory_provisions.
 */
function normaliseProvision(raw: string): string | null {
  const label = raw.replace(/\s*\([^()]*(?:\([^()]*\)[^()]*)*\)\s*$/, "").trim();
  const normalised = normaliseArticleCitations(label || raw).trim();
  const m = normalised.match(/Article\s+\d+[a-z]?(?:\(\d+\))?(?:\([a-z]\))?/i);
  if (m) return m[0].replace(/^article/i, "Article");
  return label ? label.slice(0, 200) : null;
}

// --- register parsing --------------------------------------------------------

interface RegisterRow {
  case_reference: string;
  decision_date: string | null;
  lead_sa: string | null;
  concerned_sas: string[];
  gdpr_provisions: string[];
  topic_tags: string[];
  outcomes: string[];
  decision_pdf_url: string | null;
}

function dlValues(block: string, labelClass: string, valueClass: string): string[] {
  // Collect every <dd class="...valueClass..."> that follows a <dt class="...labelClass...">
  const out: string[] = [];
  const re = new RegExp(
    `<dt[^>]*${labelClass}[^>]*>[\\s\\S]*?<\\/dt>([\\s\\S]*?)(?=<dt|<\\/dl>)`,
    "gi",
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    const seg = m[1];
    const ddRe = new RegExp(`<dd[^>]*${valueClass}[^>]*>([\\s\\S]*?)<\\/dd>`, "gi");
    let d: RegExpExecArray | null;
    while ((d = ddRe.exec(seg)) !== null) {
      // Nested <li> lists (topics, outcomes) -> one value per item.
      const lis = d[1].match(/<li[^>]*>[\s\S]*?<\/li>/gi);
      if (lis && lis.length > 0) {
        for (const li of lis) {
          const t = stripTags(li);
          if (t) out.push(t);
        }
      } else {
        const t = stripTags(d[1]);
        if (t) out.push(t);
      }
    }
  }
  return uniq(out);
}

export function parseRegisterPage(html: string): RegisterRow[] {
  const rows: RegisterRow[] = [];
  const parts = html.split(/<div\s[^>]*class="foss-decision-teaser"[^>]*>/i).slice(1);
  for (const raw of parts) {
    const block = raw.split("<!--/ teaser -->")[0];

    const idM = block.match(
      /foss-decision-teaser__id[^>]*>([\s\S]*?)<\/div>/i,
    );
    const case_reference = idM ? stripTags(idM[1]) : "";
    if (!/^EDPBI:/i.test(case_reference)) continue;

    const dateM = block.match(/<time[^>]*datetime="([^"T]+)/i);
    const decision_date = dateM ? dateM[1] : null;

    const leadM = block.match(
      /member-country-token__code[^>]*>([\s\S]*?)<\/div>/i,
    );
    const lead_sa = leadM ? stripTags(leadM[1]).toUpperCase() || null : null;

    const concerned_sas = uniq(
      Array.from(block.matchAll(/member-state-token__name[^>]*>([\s\S]*?)<\/div>/gi))
        .map((m) => stripTags(m[1])),
    );

    const provisionsRaw = dlValues(block, "main-legel-ref-label", "main-legel-ref-value");
    const gdpr_provisions = uniq(
      provisionsRaw.map(normaliseProvision).filter((x): x is string => Boolean(x)),
    );

    const topic_tags = dlValues(block, "relevant-topics-label", "relevant-topics-value");
    const outcomes = dlValues(block, "outcome-label", "outcome-value");

    const pdfM = block.match(/href="((?:https:\/\/[^"]*|\/[^"]*)\.pdf)"/i);

    rows.push({
      case_reference,
      decision_date,
      lead_sa,
      concerned_sas,
      gdpr_provisions,
      topic_tags,
      outcomes,
      decision_pdf_url: pdfM ? absoluteUrl(pdfM[1]) : null,
    });
  }
  return rows;
}

async function fetchText(url: string, timeoutMs = 45_000): Promise<string> {
  const r = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!r.ok) throw new Error(`http ${r.status} for ${url}`);
  return await r.text();
}

async function pdfToText(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept": "application/pdf" },
      signal: AbortSignal.timeout(60_000),
    });
    if (!r.ok) return null;
    const doc = await getDocumentProxy(new Uint8Array(await r.arrayBuffer()));
    const { text } = await extractText(doc, { mergePages: true });
    const raw = Array.isArray(text) ? text.join("\n") : String(text || "");
    return raw.replace(/\r/g, "").replace(/[ \t\u00a0]+/g, " ")
      .replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim() || null;
  } catch (e) {
    console.error("pdf extract failed", url, String(e).slice(0, 200));
    return null;
  }
}

// --- case digests ------------------------------------------------------------

interface DigestLink { title: string; url: string; date: string | null; }

export function parseDigestIndex(html: string): DigestLink[] {
  const out: DigestLink[] = [];
  const seen = new Set<string>();
  const re =
    /href="((?:https:\/\/www\.edpb\.europa\.eu)?\/documents\/support-pool-of-experts\/[^"]*one-stop-shop-case-digest[^"]*)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const url = absoluteUrl(m[1]);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ title: "", url, date: null });
  }
  return out;
}

// --- handler -----------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const xAdmin = req.headers.get("x-admin-token") ?? "";
  const bearer = auth.replace("Bearer ", "");
  const authorized =
    (ADMIN_TOKEN && (auth.includes(ADMIN_TOKEN) || xAdmin === ADMIN_TOKEN)) ||
    bearer === SUPABASE_SERVICE_KEY;
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  let body: any = {};
  try { body = await req.json(); } catch { /* empty allowed */ }

  const mode: string = String(body?.mode ?? "register"); // register | digests
  const dry_run = Boolean(body?.dry_run);
  const startPage = Number.isFinite(body?.start_page) ? Number(body.start_page) : 0;
  const maxPages = Math.min(Math.max(Number(body?.max_pages ?? 8), 1), 25);
  const fetchPdfText = Boolean(body?.fetch_pdf_text); // off by default (slow)

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const stats = {
    mode,
    pages_walked: 0,
    parsed: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    errors: [] as string[],
    last_html_len: 0,
    next_page: null as number | null,
    done: false,
  };

  async function upsertRow(row: Record<string, unknown>, hashInput: string) {
    const content_hash = await sha256(hashInput);
    const { data: existing, error: selErr } = await admin
      .from("edpb_oss_decisions")
      .select("id, content_hash")
      .eq("doc_type", row.doc_type as string)
      .eq("case_reference", row.case_reference as string)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);

    if (existing && existing.content_hash === content_hash) {
      stats.unchanged++;
      return;
    }
    if (existing) {
      const { error } = await admin
        .from("edpb_oss_decisions")
        .update({ ...row, content_hash })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      stats.updated++;
      return;
    }
    const { error } = await admin
      .from("edpb_oss_decisions")
      .insert({ ...row, content_hash });
    if (error) throw new Error(error.message);
    stats.inserted++;
  }

  try {
    if (mode === "digests") {
      const indexHtml = await fetchText(DIGEST_INDEX);
      const links = parseDigestIndex(indexHtml);
      stats.parsed = links.length;
      for (const link of links) {
        try {
          const page = await fetchText(link.url);
          const titleM = page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
          const title = titleM ? stripTags(titleM[1]) : link.url;
          const dateM = page.match(/<time[^>]*datetime="([^"T]+)/i);
          const pdfM = page.match(/href="((?:https:\/\/[^"]*|\/[^"]*)\.pdf)"/i);
          const introM = page.match(
            /<div[^>]*(?:field--name-body|node__content)[^>]*>([\s\S]{0,6000}?)<\/div>/i,
          );
          const summary_text = introM ? stripTags(introM[1]).slice(0, 4000) : null;
          const pdfUrl = pdfM ? absoluteUrl(pdfM[1]) : null;
          const docText = pdfUrl && fetchPdfText ? await pdfToText(pdfUrl) : null;

          const provisions = uniq(
            Array.from(title.matchAll(/Article\s+\d+[a-z]?/gi)).map((m) => m[0]),
          );

          const row = {
            doc_type: "case_digest",
            case_reference: link.url.split("/").pop()!.replace(/_en$/, ""),
            title,
            decision_date: dateM ? dateM[1] : null,
            lead_sa: null,
            concerned_sas: [],
            gdpr_provisions: provisions,
            topic_tags: ["one-stop-shop", "case-digest"],
            outcomes: [],
            subject: null,
            summary_text,
            source_url: link.url,
            decision_pdf_url: pdfUrl,
            source_document_text: docText,
            status: "final",
          };
          if (dry_run) continue;
          await upsertRow(row, JSON.stringify({ ...row, source_document_text: docText?.length ?? 0 }));
        } catch (e) {
          stats.errors.push(`${link.url}: ${String(e).slice(0, 200)}`);
        }
      }
      stats.done = true;
      return json(stats);
    }

    // register mode — batched, resumable
    let page = startPage;
    for (let i = 0; i < maxPages; i++) {
      const url = page === 0 ? REGISTER_BASE : `${REGISTER_BASE}?page=${page}`;
      let html: string;
      try {
        html = await fetchText(url);
      } catch (e) {
        stats.errors.push(`page ${page}: ${String(e).slice(0, 200)}`);
        break;
      }
      stats.pages_walked++;
      stats.last_html_len = html.length;
      const rows = parseRegisterPage(html);
      if (rows.length === 0) {
        stats.done = true;
        stats.next_page = null;
        return json(stats);
      }
      stats.parsed += rows.length;

      if (!dry_run) {
        for (const r of rows) {
          try {
            const docText = r.decision_pdf_url && fetchPdfText
              ? await pdfToText(r.decision_pdf_url)
              : null;
            await upsertRow(
              {
                doc_type: "oss_decision",
                case_reference: r.case_reference,
                title: null,
                decision_date: r.decision_date,
                lead_sa: r.lead_sa,
                concerned_sas: r.concerned_sas,
                gdpr_provisions: r.gdpr_provisions,
                topic_tags: r.topic_tags,
                outcomes: r.outcomes,
                // The public register does not name the controller/processor;
                // subject stays null unless a later source supplies it.
                subject: null,
                summary_text: null,
                source_url: url,
                decision_pdf_url: r.decision_pdf_url,
                source_document_text: docText,
                status: "final",
              },
              JSON.stringify({ ...r, docLen: docText?.length ?? 0 }),
            );
          } catch (e) {
            stats.errors.push(`${r.case_reference}: ${String(e).slice(0, 200)}`);
          }
        }
      }
      page++;
    }
    stats.next_page = page;
    return json(stats);
  } catch (e) {
    stats.errors.push(String(e).slice(0, 400));
    return json(stats, 500);
  }
});
