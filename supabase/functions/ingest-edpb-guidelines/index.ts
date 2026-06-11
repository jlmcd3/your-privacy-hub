// Ingests curated EDPB guideline PDFs into edpb_guidelines as embedded chunks.
// Registry seeded with placeholder pdf_url values — entries are skipped until
// verified edpb.europa.eu URLs replace "VERIFY_URL".
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";
// ANTHROPIC_API_KEY reserved for future tagging passes; not required for the
// current chunk-and-embed flow but documented as part of the scaffold.
const _ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_DIMS = 1536;
const EMBED_INPUT_MAX = 6000;
const EMBED_GAP_MS = 150;
const CHUNK_TARGET_CHARS = 1500;
const PLACEHOLDER_URL = "VERIFY_URL";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

interface RegistryEntry {
  guideline_ref: string;
  title: string;
  adopted_date: string; // ISO date
  related_articles: string[];
  topic_tags: string[];
  pdf_url: string;
}

const SEED_REGISTRY: RegistryEntry[] = [
  {
    guideline_ref: "EDPB Guidelines 1/2024",
    title: "Guidelines 1/2024 on processing of personal data based on Article 6(1)(f) GDPR (legitimate interests)",
    adopted_date: "2024-10-08",
    related_articles: ["6"],
    topic_tags: ["legitimate-interest", "lawful-basis"],
    pdf_url: "https://www.edpb.europa.eu/system/files/2024-10/edpb_guidelines_202401_legitimateinterest_en.pdf",
  },
  {
    guideline_ref: "EDPB Guidelines 2/2019",
    title: "Guidelines 2/2019 on the processing of personal data under Article 6(1)(b) GDPR in the context of the provision of online services to data subjects",
    adopted_date: "2019-10-08",
    related_articles: ["6"],
    topic_tags: ["contract", "lawful-basis", "online-services"],
    pdf_url: "https://edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines-art_6-1-b-adopted_after_public_consultation_en.pdf",
  },
  {
    guideline_ref: "WP248 rev.01",
    title: "Guidelines on Data Protection Impact Assessment (DPIA) and determining whether processing is \"likely to result in a high risk\" for the purposes of Regulation 2016/679",
    adopted_date: "2017-10-04",
    related_articles: ["35", "36"],
    topic_tags: ["dpia", "risk-assessment"],
    pdf_url: "https://ec.europa.eu/newsroom/just/document.cfm?doc_id=47711",
  },
  {
    guideline_ref: "EDPB Guidelines 9/2022",
    title: "Guidelines 9/2022 on personal data breach notification under GDPR",
    adopted_date: "2023-03-28",
    related_articles: ["33", "34"],
    topic_tags: ["breach-notification", "incident-response"],
    pdf_url: "https://www.edpb.europa.eu/system/files/2023-04/edpb_guidelines_202209_personal_data_breach_notification_v2.0_en.pdf",
  },
  {
    guideline_ref: "EDPB Guidelines 07/2020",
    title: "Guidelines 07/2020 on the concepts of controller and processor in the GDPR",
    adopted_date: "2021-07-07",
    related_articles: ["4", "26", "28"],
    topic_tags: ["controller", "processor", "joint-controllers"],
    pdf_url: "https://edpb.europa.eu/system/files/2021-07/eppb_guidelines_202007_controllerprocessor_final_en.pdf",
  },
  {
    guideline_ref: "EDPB Guidelines 05/2020",
    title: "Guidelines 05/2020 on consent under Regulation 2016/679",
    adopted_date: "2020-05-04",
    related_articles: ["4", "7"],
    topic_tags: ["consent", "lawful-basis"],
    pdf_url: "https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_202005_consent_en.pdf",
  },
  {
    guideline_ref: "EDPB Guidelines 3/2018",
    title: "Guidelines 3/2018 on the territorial scope of the GDPR (Article 3)",
    adopted_date: "2019-11-12",
    related_articles: ["3"],
    topic_tags: ["territorial-scope", "extraterritoriality"],
    pdf_url: "https://www.edpb.europa.eu/sites/default/files/files/file1/edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_0.pdf",
  },
  {
    guideline_ref: "EDPB Recommendations 01/2020",
    title: "Recommendations 01/2020 on measures that supplement transfer tools to ensure compliance with the EU level of protection of personal data",
    adopted_date: "2021-06-18",
    related_articles: ["44", "45", "46", "49"],
    topic_tags: ["international-transfers", "schrems-ii", "supplementary-measures"],
    pdf_url: "https://www.edpb.europa.eu/system/files/2021-06/edpb_recommendations_202001vo.2.0_supplementarymeasurestransferstools_en.pdf",
  },
  {
    guideline_ref: "EDPB Guidelines 01/2022",
    title: "Guidelines 01/2022 on data subject rights — Right of access",
    adopted_date: "2023-03-28",
    related_articles: ["15"],
    topic_tags: ["data-subject-rights", "right-of-access", "dsar"],
    pdf_url: "https://www.edpb.europa.eu/system/files/2023-04/edpb_guidelines_202201_data_subject_rights_access_v2_en.pdf",
  },
  {
    guideline_ref: "WP260 rev.01",
    title: "Guidelines on transparency under Regulation 2016/679",
    adopted_date: "2018-04-11",
    related_articles: ["12", "13", "14"],
    topic_tags: ["transparency", "privacy-notice"],
    pdf_url: "https://www.edpb.europa.eu/system/files/2023-09/wp260rev01_en.pdf",
  },
];

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

async function embed(text: string): Promise<number[]> {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, EMBED_INPUT_MAX),
      dimensions: EMBEDDING_DIMS,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!r.ok) throw new Error(`Embed ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d = await r.json();
  const v = d?.data?.[0]?.embedding;
  if (!Array.isArray(v) || v.length !== EMBEDDING_DIMS) {
    throw new Error(`Bad embedding shape: len=${v?.length}`);
  }
  return v;
}

// --- PDF text + chunking -----------------------------------------------------

async function pdfToText(bytes: Uint8Array): Promise<string> {
  const doc = await getDocumentProxy(bytes);
  const { text } = await extractText(doc, { mergePages: true });
  const raw = Array.isArray(text) ? text.join("\n") : String(text || "");
  return raw
    .replace(/\r/g, "")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Detects "1.", "2.3", "4.5.6" style numbered headings at line starts; returns
// the closest preceding heading for each chunk to use as section_heading.
function isHeadingLine(line: string): boolean {
  const t = line.trim();
  if (t.length === 0 || t.length > 200) return false;
  return /^\d+(?:\.\d+){0,3}\.?\s+\S/.test(t);
}

interface Chunk { text: string; section_heading: string | null; }

function chunkText(full: string): Chunk[] {
  const paragraphs = full.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: Chunk[] = [];
  let buf = "";
  let currentHeading: string | null = null;
  let chunkHeading: string | null = null;

  const flush = () => {
    const t = buf.trim();
    if (t.length >= 100) chunks.push({ text: t, section_heading: chunkHeading });
    buf = "";
    chunkHeading = currentHeading;
  };

  for (const para of paragraphs) {
    // A paragraph may itself start with a heading line.
    const firstLine = para.split("\n", 1)[0];
    if (isHeadingLine(firstLine)) {
      currentHeading = firstLine.trim().slice(0, 200);
      // If buffer has content, flush before starting a new section.
      if (buf.length >= CHUNK_TARGET_CHARS * 0.5) flush();
      if (!chunkHeading) chunkHeading = currentHeading;
    }
    const candidate = buf ? buf + "\n\n" + para : para;
    if (candidate.length > CHUNK_TARGET_CHARS && buf.length > 0) {
      flush();
      buf = para;
      chunkHeading = currentHeading;
    } else {
      buf = candidate;
      if (!chunkHeading) chunkHeading = currentHeading;
    }
  }
  if (buf.trim().length >= 100) chunks.push({ text: buf.trim(), section_heading: chunkHeading });
  return chunks;
}

// --- Main handler -------------------------------------------------------------

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
  const dry_run: boolean = Boolean(body?.dry_run);
  const only: string[] | null = Array.isArray(body?.only) && body.only.length > 0
    ? body.only.map((s: any) => String(s))
    : null;

  const entries = only
    ? SEED_REGISTRY.filter((e) => only.includes(e.guideline_ref))
    : SEED_REGISTRY;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const userAgent = "EndUserPrivacy-EDPBIngest/1.0 (+https://enduserprivacy.com; contact: ops@enduserprivacy.com)";

  const perGuideline: Array<Record<string, unknown>> = [];

  for (const entry of entries) {
    const summary: Record<string, unknown> = {
      guideline_ref: entry.guideline_ref,
      status: "ok",
      chunks_inserted: 0,
      chunks_unchanged: 0,
      embed_failures: 0,
    };

    if (!entry.pdf_url || entry.pdf_url === PLACEHOLDER_URL) {
      console.warn(`skip ${entry.guideline_ref}: pdf_url missing/placeholder`);
      summary.status = "skipped_no_url";
      perGuideline.push(summary);
      continue;
    }

    try {
      const r = await fetch(entry.pdf_url, {
        headers: { "User-Agent": userAgent, "Accept": "application/pdf" },
        signal: AbortSignal.timeout(60_000),
      });
      if (!r.ok) throw new Error(`pdf fetch http ${r.status}`);
      const bytes = new Uint8Array(await r.arrayBuffer());
      const text = await pdfToText(bytes);
      const chunks = chunkText(text);
      summary.chunks_parsed = chunks.length;

      if (dry_run) {
        summary.status = "dry_run";
        summary.sample = chunks[0] ?? null;
        perGuideline.push(summary);
        continue;
      }

      for (const ch of chunks) {
        const content_hash = await sha256(entry.guideline_ref + "|" + ch.text);
        const { data: existing } = await admin
          .from("edpb_guidelines")
          .select("id")
          .eq("guideline_ref", entry.guideline_ref)
          .eq("content_hash", content_hash)
          .maybeSingle();
        if (existing) {
          (summary.chunks_unchanged as number)++;
          continue;
        }

        let embedding: number[] | null = null;
        try {
          embedding = await embed(ch.text);
        } catch (e) {
          console.error(`embed ${entry.guideline_ref} failed:`, String(e).slice(0, 200));
          (summary.embed_failures as number)++;
        }

        const row: any = {
          guideline_ref: entry.guideline_ref,
          title: entry.title,
          adopted_date: entry.adopted_date,
          status: "final",
          related_articles: entry.related_articles,
          topic_tags: entry.topic_tags,
          section_heading: ch.section_heading,
          excerpt_text: ch.text,
          source_url: entry.pdf_url,
          content_hash,
          embedding: embedding as any,
          embedding_model: embedding ? EMBEDDING_MODEL : null,
        };
        const { error } = await admin.from("edpb_guidelines").insert(row);
        if (error) {
          console.error(`${entry.guideline_ref} insert error:`, error.message);
        } else {
          (summary.chunks_inserted as number)++;
        }
        if (embedding) await new Promise((res) => setTimeout(res, EMBED_GAP_MS));
      }
    } catch (e) {
      console.error(`${entry.guideline_ref} failed:`, String(e).slice(0, 300));
      summary.status = "error";
      summary.error = String(e).slice(0, 300);
    }
    perGuideline.push(summary);
  }

  return json({
    dry_run,
    registry_total: SEED_REGISTRY.length,
    processed: perGuideline.length,
    per_guideline: perGuideline,
  });
});
