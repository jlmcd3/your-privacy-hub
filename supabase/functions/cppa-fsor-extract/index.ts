// Extracts unit candidates from a CPPA FSOR PDF. Does NOT write to DB.
// Two modes:
//   "fsor"        - linear reasoning text (2023 + 2025 style headers)
//   "appendix45"  - 4-column landscape table (FSOR Appendix A/B, 2025)
//
// Auth: same as cppa-ingest-fsor — x-admin-token = ADMIN_SECRET_TOKEN, or
// Authorization: Bearer <service-role key>.
//
// Output: { total_units, sections: {root: count}, units: [...] }

// unpdf bundles a serverless build of pdfjs (no node-canvas), works in Deno edge.
// @ts-ignore esm.sh resolves bare modules
import { getDocumentProxy, getResolvedPDFJS } from "https://esm.sh/unpdf@0.12.1";

const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

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

interface ExtractInput {
  source_url: string;
  mode: "fsor" | "appendix45";
  include_sections?: string[];
  start_anchor?: string;
  stop_anchor?: string;
  column_x?: [number, number, number];
}

interface Unit {
  agency_response: string;
  comment_text?: string;
  regulation_citation: string;
  page_ref: string;
}

interface PageItem {
  str: string;
  x: number;
  y: number;
  page: number;
}

async function loadPages(url: string): Promise<{ pageText: string[]; pageItems: PageItem[][] }> {
  const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`fetch_failed_${r.status}`);
  const buf = new Uint8Array(await r.arrayBuffer());
  await getResolvedPDFJS();
  const doc = await getDocumentProxy(buf);
  const pageText: string[] = [];
  const pageItems: PageItem[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const p = await doc.getPage(i);
    const tc = await p.getTextContent();
    const items: PageItem[] = [];
    for (const it of tc.items as any[]) {
      const str = String(it.str ?? "");
      const tr = it.transform as number[] | undefined;
      const x = tr ? tr[4] : 0;
      const y = tr ? tr[5] : 0;
      items.push({ str, x, y, page: i });
    }
    pageItems.push(items);
    pageText.push(items.map((it) => it.str).join(" "));
  }
  return { pageText, pageItems };
}

// --- mode: fsor ---

function splitLongUnit(text: string, max = 6000): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let remaining = text;
  while (remaining.length > max) {
    let cut = remaining.lastIndexOf(". ", max);
    if (cut < max * 0.5) cut = max;
    out.push(remaining.slice(0, cut + 1).trim());
    remaining = remaining.slice(cut + 1).trim();
  }
  if (remaining) out.push(remaining);
  return out;
}

const SUB_LEAD = /(?:Subsections?\s*\(([^)]+)\)(?:\([^)]+\))*|Previous\s+subsections?\s*[^:]*|Title)\s*:/i;
const SUB_LEAD_G = /(?:Subsections?\s*\(([^)]+)\)((?:\([^)]+\))*)|Previous\s+subsections?\s*[^:]*|Title)\s*:/gi;

function extractFsor(
  pageText: string[],
  startAnchor?: string,
  stopAnchor?: string,
): Unit[] {
  // build joined text with page markers we can map back to page numbers
  const MARK = "\u0001PG";
  const parts: string[] = [];
  for (let i = 0; i < pageText.length; i++) {
    parts.push(`${MARK}${i + 1}\u0002 ${pageText[i]}`);
  }
  let full = parts.join(" ");

  // Whitespace- and case-insensitive anchor finder.
  // PDF text extraction can insert arbitrary spacing, NBSPs, or page markers
  // between words, so search a normalized shadow string but return original offset.
  function searchableWithMap(value: string, trim = false): { text: string; map: number[] } {
    let text = "";
    const map: number[] = [];
    let lastWasSpace = false;
    for (let i = 0; i < value.length; i++) {
      const ch = value[i];
      if (/\s|[\u0001\u0002\u00a0\u2000-\u200d\ufeff]/.test(ch)) {
        if (!lastWasSpace) {
          text += " ";
          map.push(i);
          lastWasSpace = true;
        }
      } else {
        text += ch.toLowerCase();
        map.push(i);
        lastWasSpace = false;
      }
    }
    if (!trim) return { text, map };
    const start = text.search(/\S/);
    if (start < 0) return { text: "", map: [] };
    const trimmedText = text.slice(start).trimEnd();
    return { text: trimmedText, map: map.slice(start, start + trimmedText.length) };
  }

  function findAnchor(hay: string, needle: string): number {
    if (!needle) return -1;
    const normalizedHay = searchableWithMap(hay);
    const normalizedNeedle = searchableWithMap(needle, true).text;
    const idx = normalizedHay.text.indexOf(normalizedNeedle);
    return idx >= 0 ? normalizedHay.map[idx] : -1;
  }

  if (startAnchor) {
    const si = findAnchor(full, startAnchor);
    if (si < 0) throw new Error(`start_anchor_not_found:${startAnchor}`);
    full = full.slice(si);
  }
  if (stopAnchor) {
    const ei = findAnchor(full, stopAnchor);
    if (ei < 0) throw new Error(`stop_anchor_not_found:${stopAnchor}`);
    full = full.slice(0, ei);
  }

  // helper: page number at a given offset
  function pageAt(offset: number): number {
    const sub = full.slice(0, offset);
    const matches = [...sub.matchAll(/\u0001PG(\d+)\u0002/g)];
    return matches.length ? Number(matches[matches.length - 1][1]) : 1;
  }
  // strip markers for downstream regex but keep mapping via pageAt on original
  const stripped = full.replace(/\u0001PG\d+\u0002/g, " ");
  // mapping function from stripped offset -> full offset
  // simpler: we'll do header detection on `full` directly (markers don't match header regexes)

  const patterns: { re: RegExp; name: string }[] = [
    { re: /(?:Amend|Adopt|Delete)\s+§\s*(7\s*\d\s*\d\s*\d)\s*\./g, name: "2025" },
    { re: /\b[A-Z]{1,2}\.\s+§\s*(7\s*\d\s*\d\s*\d)\s*\./g, name: "2023" },
    { re: /§\s*(7\s*\d\s*\d\s*\d)\s*\./g, name: "fallback" },
  ];
  let best: { name: string; matches: { index: number; section: string }[] } = {
    name: "none",
    matches: [],
  };
  for (const p of patterns) {
    const m = [...full.matchAll(p.re)].map((x) => ({
      index: x.index ?? 0,
      section: x[1].replace(/\s+/g, ""),
    }));
    if (m.length > best.matches.length) best = { name: p.name, matches: m };
    if (best.matches.length > 20) break;
  }

  const units: Unit[] = [];
  const headers = best.matches;
  for (let h = 0; h < headers.length; h++) {
    const start = headers[h].index;
    const end = h + 1 < headers.length ? headers[h + 1].index : full.length;
    const block = full.slice(start, end);
    const section = headers[h].section;

    // find subsection leads inside block
    const leads = [...block.matchAll(SUB_LEAD_G)];
    const cuts: { start: number; head?: RegExpMatchArray }[] = [
      { start: 0 },
      ...leads.map((m) => ({ start: m.index ?? 0, head: m })),
    ];

    for (let c = 0; c < cuts.length; c++) {
      const segStart = cuts[c].start;
      const segEnd = c + 1 < cuts.length ? cuts[c + 1].start : block.length;
      const rawSeg = block.slice(segStart, segEnd);
      const seg = rawSeg.replace(/\u0001PG\d+\u0002/g, " ").replace(/\s+/g, " ").trim();
      if (!seg) continue;
      if (/^Non-substantial change/i.test(seg)) continue;
      if (seg.length < 40) continue;

      // build citation
      let citation = `11 CCR § ${section}`;
      const head = cuts[c].head;
      if (head && head[1]) {
        const subs = head[1];
        const more = head[2] ?? "";
        citation += `(${subs})${more}`;
      }

      const pgNum = pageAt(start + segStart);
      const segs = splitLongUnit(seg);
      for (const s of segs) {
        units.push({
          agency_response: s,
          regulation_citation: citation,
          page_ref: `p. ${pgNum}`,
        });
      }
    }
  }
  return units;
}

// --- mode: appendix45 ---

const APPENDIX_NOISE = /California Privacy Protection Agency|Page \d+ of \d+|FSOR APPENDIX/i;
const SECTION_PAT = /^(?:Previous\s+)?(7\d{3})((?:\([a-z0-9]+\))*)$/i;

function extractAppendix(
  pageItems: PageItem[][],
  columnX: [number, number, number],
): Unit[] {
  const [c1, c2, c3] = columnX;
  const Y_TOL = 5;

  type Row = { y: number; cols: [string, string, string, string]; page: number };
  const rows: Row[] = [];

  for (let p = 0; p < pageItems.length; p++) {
    const pageNo = p + 1;
    const items = pageItems[p].filter(
      (it) => it.str.trim() && !APPENDIX_NOISE.test(it.str),
    );
    // group items by y (within tolerance)
    const buckets: { y: number; items: PageItem[] }[] = [];
    for (const it of items) {
      let b = buckets.find((bb) => Math.abs(bb.y - it.y) <= Y_TOL);
      if (!b) {
        b = { y: it.y, items: [] };
        buckets.push(b);
      }
      b.items.push(it);
    }
    buckets.sort((a, b) => b.y - a.y); // top to bottom in PDF coords
    for (const b of buckets) {
      const cols: [string, string, string, string] = ["", "", "", ""];
      const sorted = b.items.sort((a, z) => a.x - z.x);
      for (const it of sorted) {
        let ci = 3;
        if (it.x < c1) ci = 0;
        else if (it.x < c2) ci = 1;
        else if (it.x < c3) ci = 2;
        cols[ci] = (cols[ci] ? cols[ci] + " " : "") + it.str;
      }
      rows.push({ y: b.y, cols, page: pageNo });
    }
  }

  const units: Unit[] = [];
  let cur: {
    section: string;
    citationSubs: string;
    summary: string;
    response: string;
    startPage: number;
  } | null = null;

  function flush(continuation = false) {
    if (!cur) return;
    const summary = cur.summary.replace(/\s+/g, " ").trim();
    const response = cur.response.replace(/\s+/g, " ").trim();
    if (response.length < 40) {
      cur = null;
      return;
    }
    const citation = `11 CCR § ${cur.section}${cur.citationSubs}`;
    const pageRef = `Appendix, p. ${cur.startPage}${continuation ? " (cont.)" : ""}`;
    const respChunks = splitLongUnit(response);
    for (let i = 0; i < respChunks.length; i++) {
      units.push({
        agency_response: respChunks[i],
        comment_text: i === 0 ? summary || undefined : undefined,
        regulation_citation: citation,
        page_ref: i === 0 ? pageRef : `Appendix, p. ${cur!.startPage} (cont.)`,
      });
    }
    cur = null;
  }

  for (const r of rows) {
    const secCell = r.cols[0].trim();
    const m = secCell.match(SECTION_PAT);
    if (m) {
      // new section -> flush prior
      flush();
      cur = {
        section: m[1],
        citationSubs: m[2] ?? "",
        summary: r.cols[2],
        response: r.cols[3],
        startPage: r.page,
      };
    } else if (cur) {
      // continuation row of the open unit
      if (r.cols[2]) cur.summary += " " + r.cols[2];
      if (r.cols[3]) cur.response += " " + r.cols[3];
      // emit early if response too long
      if (cur.response.length > 6000) flush(true);
    }
  }
  flush();
  return units;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization") ?? "";
  const xAdmin = req.headers.get("x-admin-token") ?? "";
  const bearer = auth.replace("Bearer ", "");
  const authorized =
    (ADMIN_TOKEN && (auth.includes(ADMIN_TOKEN) || xAdmin === ADMIN_TOKEN)) ||
    (SUPABASE_SERVICE_KEY && bearer === SUPABASE_SERVICE_KEY);
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  let body: ExtractInput;
  try {
    body = (await req.json()) as ExtractInput;
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const source_url = String(body?.source_url ?? "").trim();
  const mode = body?.mode;
  if (!source_url) return json({ error: "source_url required" }, 400);
  if (mode !== "fsor" && mode !== "appendix45") {
    return json({ error: "mode must be 'fsor' or 'appendix45'" }, 400);
  }
  const includeRoots = Array.isArray(body?.include_sections)
    ? new Set(body.include_sections!.map((s) => String(s).trim()))
    : null;

  try {
    const { pageText, pageItems } = await loadPages(source_url);
    let units: Unit[];
    if (mode === "fsor") {
      units = extractFsor(pageText, body.start_anchor, body.stop_anchor);
    } else {
      const cx = body.column_x ?? [75, 160, 430];
      units = extractAppendix(pageItems, cx);
    }

    if (includeRoots) {
      units = units.filter((u) => {
        const m = u.regulation_citation.match(/§\s*(7\d{3})/);
        return m && includeRoots.has(m[1]);
      });
    }

    const sections: Record<string, number> = {};
    for (const u of units) {
      const m = u.regulation_citation.match(/§\s*(7\d{3})/);
      const root = m ? m[1] : "unknown";
      sections[root] = (sections[root] ?? 0) + 1;
    }

    return json({ total_units: units.length, sections, units });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 400);
  }
});
