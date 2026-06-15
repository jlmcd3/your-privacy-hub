// Extracts unit candidates from a CPPA FSOR PDF. Does NOT write to DB.
// Two modes:
//   "fsor"        - linear reasoning text (2023 + 2025 style headers)
//   "appendix45"  - 4-column landscape table (FSOR Appendix A/B, 2025)
//
// Auth: same as cppa-ingest-fsor — x-admin-token = ADMIN_SECRET_TOKEN, or
// Authorization: Bearer <service-role key>.
//
// Output: { total_units, sections: {root: count}, units: [...], total_pages }

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
  mode: "fsor" | "appendix45" | "appendix2023";
  include_sections?: string[];
  start_anchor?: string;
  stop_anchor?: string;
  column_x?: [number, number, number];
  col_bounds?: [number, number, number, number];
  page_from?: number;
  page_to?: number;
  force_shape?: boolean;
  force_rotation?: number | null;
}

function fixOcrSpaces(text: string): string {
  if (!text) return text;
  let t = text.replace(/\s+/g, " ").trim();
  t = t.replace(/\b([A-Za-z]) ([a-z]{2,})/g, "$1$2");
  t = t.replace(/([a-z]{2,}) ([a-z])\b/g, "$1$2");
  t = t.replace(/\b([A-Za-z]{2}) ([a-z])\b/g, (match, p1, p2) => {
    const joined = p1 + p2;
    const commonWords = new Set(["the","and","for","not","but","are","was","has","had","its","that","this","with","from","they","have","been","will","when","also","into","more","each","such","than","then","some","only","must","does","were","what","who","how","any","all","may","can"]);
    return commonWords.has(joined.toLowerCase()) ? joined : match;
  });
  return t;
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

async function openDoc(url: string): Promise<any> {
  const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`fetch_failed_${r.status}`);
  const buf = new Uint8Array(await r.arrayBuffer());
  await getResolvedPDFJS();
  return await getDocumentProxy(buf);
}

async function loadPagesRange(
  doc: any,
  from: number,
  to: number,
): Promise<{ pageText: string[]; pageItems: PageItem[][] }> {
  const pageText: string[] = [];
  const pageItems: PageItem[][] = [];
  for (let i = from; i <= to; i++) {
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
    // Release pdf.js page-level resources to keep memory bounded across long PDFs.
    try { p.cleanup?.(); } catch { /* ignore */ }
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

// Tolerant of PDF letter-spacing artifacts (e.g. "S u bsection (e)( 3)").
const SUB_WORD = String.raw`S\s*u\s*b\s*s\s*e\s*c\s*t\s*i\s*o\s*n\s*s?`;
const PREV_WORD = String.raw`P\s*r\s*e\s*v\s*i\s*o\s*u\s*s\s+` + SUB_WORD;
const TITLE_WORD = String.raw`T\s*i\s*t\s*l\s*e`;
const SUB_LEAD = new RegExp(
  `(?:${SUB_WORD}\\s*\\(\\s*([^)]+?)\\s*\\)((?:\\s*\\(\\s*[^)]+?\\s*\\))*)|${PREV_WORD}[^:]*|${TITLE_WORD})\\s*:`,
  "i",
);
const SUB_LEAD_G = new RegExp(SUB_LEAD.source, "gi");

function extractFsor(
  pageText: string[],
  pageStart: number,
  startAnchor?: string,
  stopAnchor?: string,
): Unit[] {
  // build joined text with page markers we can map back to real page numbers
  const MARK = "\u0001PG";
  const parts: string[] = [];
  for (let i = 0; i < pageText.length; i++) {
    parts.push(`${MARK}${i + pageStart}\u0002 ${pageText[i]}`);
  }
  const baseFull = parts.join(" ");
  let full = baseFull;
  let sliceOffset = 0;

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
    sliceOffset = si;
  }
  if (stopAnchor) {
    const ei = findAnchor(full, stopAnchor);
    if (ei < 0) throw new Error(`stop_anchor_not_found:${stopAnchor}`);
    full = full.slice(0, ei);
  }

  function pageAt(offset: number): number {
    const sub = baseFull.slice(0, sliceOffset + offset);
    const matches = [...sub.matchAll(/\u0001PG(\d+)\u0002/g)];
    return matches.length ? Number(matches[matches.length - 1][1]) : pageStart;
  }

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

    const leads = [...block.matchAll(SUB_LEAD_G)];
    const cuts: { start: number; head?: RegExpMatchArray }[] = [
      { start: 0 },
      ...leads.map((m) => ({ start: m.index ?? 0, head: m })),
    ];

    for (let c = 0; c < cuts.length; c++) {
      const segStart = cuts[c].start;
      const segEnd = c + 1 < cuts.length ? cuts[c + 1].start : block.length;
      const rawSeg = block.slice(segStart, segEnd);
      const seg = fixOcrSpaces(rawSeg.replace(/\u0001PG\d+\u0002/g, " "));
      if (!seg) continue;
      if (/^Non-substantial change/i.test(seg)) continue;
      if (seg.length < 40) continue;

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
  pageStart: number,
): Unit[] {
  const [c1, c2, c3] = columnX;
  const Y_TOL = 5;

  type Row = { y: number; cols: [string, string, string, string]; page: number };
  const rows: Row[] = [];

  for (let p = 0; p < pageItems.length; p++) {
    const pageNo = pageItems[p][0]?.page ?? (p + pageStart);
    const items = pageItems[p].filter(
      (it) => it.str.trim() && !APPENDIX_NOISE.test(it.str),
    );
    const buckets: { y: number; items: PageItem[] }[] = [];
    for (const it of items) {
      let b = buckets.find((bb) => Math.abs(bb.y - it.y) <= Y_TOL);
      if (!b) {
        b = { y: it.y, items: [] };
        buckets.push(b);
      }
      b.items.push(it);
    }
    buckets.sort((a, b) => b.y - a.y);
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
    const summary = fixOcrSpaces(cur.summary);
    const response = fixOcrSpaces(cur.response);
    if (response.length < 40) {
      cur = null;
      return;
    }
    const citation = `11 CCR § ${cur.section}${cur.citationSubs}`;
    const pageRef = `Appendix, p. ${cur.startPage}${continuation ? " (cont.)" : ""}`;
    const respChunks = splitLongUnit(response);
    const commentChunks = summary ? splitLongUnit(summary) : [];
    for (let i = 0; i < respChunks.length; i++) {
      units.push({
        agency_response: respChunks[i],
        comment_text: i === 0 && commentChunks.length > 0 ? commentChunks[0] : undefined,
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
      flush();
      cur = {
        section: m[1],
        citationSubs: m[2] ?? "",
        summary: r.cols[2],
        response: r.cols[3],
        startPage: r.page,
      };
    } else if (cur) {
      if (r.cols[2]) cur.summary += " " + r.cols[2];
      if (r.cols[3]) cur.response += " " + r.cols[3];
      if (cur.response.length > 6000) flush(true);
    }
  }
  flush();
  return units;
}

// --- mode: appendix2023 ---

async function loadPagesWithRotation(
  doc: any,
  from: number,
  to: number,
): Promise<{ page: number; rotate: number; items: PageItem[] }[]> {
  const out: { page: number; rotate: number; items: PageItem[] }[] = [];
  for (let i = from; i <= to; i++) {
    const p = await doc.getPage(i);
    const rotate = Number(p.rotate ?? 0) || 0;
    const tc = await p.getTextContent();
    const items: PageItem[] = [];
    for (const it of tc.items as any[]) {
      const str = String(it.str ?? "");
      const tr = it.transform as number[] | undefined;
      const x = tr ? tr[4] : 0;
      const y = tr ? tr[5] : 0;
      items.push({ str, x, y, page: i });
    }
    out.push({ page: i, rotate, items });
    try { p.cleanup?.(); } catch { /* ignore */ }
  }
  return out;
}

const APPENDIX2023_NOISE =
  /F\s*S\s*O\s*R\s*A\s*P\s*P\s*E\s*N\s*D\s*I\s*X|Page\s+\d+|^CPPA_RM1|^FSOR$|^APPENDIX$|^SUMMARY$|^SUBMITTED$|^DURING$|^PERIOD$|^AND$|^RESPONSE$|^TO$|^COMMENTS$|^OF$|^45$/i;
const APPENDIX2023_HEADER_WORDS =
  /^(Response|Summary|Comment|Comments|Bates|Label|Transcript|#s|No\.?|Number|#|A:|Written|Oral|Received|California|Privacy|Protection|Agency|FSOR|APPENDIX|DAY)$/i;

function appendixLabelFromUrl(url: string): string {
  const m = url.toLowerCase().match(/_app_([a-z])_/);
  return m ? `App ${m[1].toUpperCase()}` : "App ?";
}

function extractAppendix2023(
  pages: { page: number; rotate: number; items: PageItem[] }[],
  colBounds: [number, number, number, number],
  appendixLabel: string,
  includeRoots: Set<string> | null,
  forceRotation: number | null = null,
): { units: Unit[]; noCitationDropped: number } {
  const [b1, b2, b3, b4] = colBounds;
  const units: Unit[] = [];
  let noCitationDropped = 0;
  let contextCitation: string | null = null;
  let cur: {
    summary: string;
    response: string;
    startPage: number;
  } | null = null;

  function flush(continuation = false) {
    if (!cur) return;
    const summary = fixOcrSpaces(cur.summary);
    const response = fixOcrSpaces(cur.response);
    const startPage = cur.startPage;
    cur = null;
    if (response.length < 40) return;
    const citRe = /§\s*(7\d{3}(?:\s*\([a-z0-9]+\))*)/i;
    const cm = response.match(citRe) ?? summary.match(citRe);
    let citation: string;
    if (cm) {
      const citationTail = cm[1].replace(/\s+/g, "");
      const rootMatch = citationTail.match(/^(7\d{3})/);
      const root = rootMatch ? rootMatch[1] : null;
      if (includeRoots && (!root || !includeRoots.has(root))) return;
      citation = `11 CCR § ${citationTail}`;
    } else if (contextCitation) {
      const rootMatch = contextCitation.match(/^(7\d{3})/);
      const root = rootMatch ? rootMatch[1] : null;
      if (includeRoots && (!root || !includeRoots.has(root))) return;
      citation = `11 CCR § ${contextCitation}`;
    } else {
      noCitationDropped++;
      return;
    }
    const pageRef = `2023 ${appendixLabel}, p. ${startPage}${continuation ? " (cont.)" : ""}`;
    const respChunks = splitLongUnit(response);
    for (let i = 0; i < respChunks.length; i++) {
      units.push({
        agency_response: respChunks[i],
        comment_text: i === 0 && summary ? summary : undefined,
        regulation_citation: citation,
        page_ref: i === 0 ? pageRef : `2023 ${appendixLabel}, p. ${startPage} (cont.)`,
      });
    }
  }

  const ROW_GAP = 8;
  for (const pg of pages) {
    const effectiveRotate = forceRotation !== null ? forceRotation : pg.rotate;
    const rotated = effectiveRotate === 90 || effectiveRotate === 270;
    // Normalize row_axis so ascending = reading order (top-to-bottom).
    // Rotated (90/270): row_axis = x, ascending already top-to-bottom in rotated view.
    // Unrotated: row_axis = -y (invert), since PDF y grows upward.
    const rowAxisOf = (it: PageItem) => rotated ? it.x : -it.y;
    const colAxisOf = (it: PageItem) => rotated ? it.y : it.x;

    const items = pg.items.filter((it) => {
      const t = it.str.trim();
      if (!t) return false;
      if (APPENDIX2023_NOISE.test(t)) return false;
      if (APPENDIX2023_HEADER_WORDS.test(t)) return false;
      return true;
    });

    // PASS 1: cluster items into rows by row_axis gap.
    const sorted = [...items].sort((a, z) => rowAxisOf(a) - rowAxisOf(z));
    type Row = { rowAxis: number; items: PageItem[] };
    const rows: Row[] = [];
    let prevAxis: number | null = null;
    for (const it of sorted) {
      const ra = rowAxisOf(it);
      if (prevAxis === null || ra - prevAxis > ROW_GAP) {
        rows.push({ rowAxis: ra, items: [it] });
      } else {
        rows[rows.length - 1].items.push(it);
      }
      prevAxis = ra;
    }

    // PASS 2 + 3: within each row, bucket items by col_axis; accumulate units.
    for (const row of rows) {
      row.items.sort((a, z) => colAxisOf(a) - colAxisOf(z));
      const buckets: [string, string, string, string, string] = ["", "", "", "", ""];
      for (const it of row.items) {
        const c = colAxisOf(it);
        let bi = 4;
        if (c < b1) bi = 0;
        else if (c < b2) bi = 1;
        else if (c < b3) bi = 2;
        else if (c < b4) bi = 3;
        buckets[bi] = (buckets[bi] ? buckets[bi] + " " : "") + it.str;
      }
      const respCell = buckets[0].trim();
      if (/^\d+\.?$/.test(respCell)) {
        flush();
        cur = {
          summary: buckets[1],
          response: buckets[2],
          startPage: pg.page,
        };
      } else if (cur) {
        if (buckets[1]) cur.summary += " " + buckets[1];
        if (buckets[2]) cur.response += " " + buckets[2];
        if (cur.response.length > 6000) flush(true);
      }
    }
  }
  flush();
  return { units, noCitationDropped };
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
  if (mode !== "fsor" && mode !== "appendix45" && mode !== "appendix2023") {
    return json({ error: "mode must be 'fsor', 'appendix45', or 'appendix2023'" }, 400);
  }
  const includeRoots = Array.isArray(body?.include_sections)
    ? new Set(body.include_sections!.map((s) => String(s).trim()))
    : null;

  try {
    const doc = await openDoc(source_url);
    const totalPages: number = doc.numPages;
    const reqFrom = Number.isFinite(body.page_from as number) ? Number(body.page_from) : 1;
    const reqTo = Number.isFinite(body.page_to as number) ? Number(body.page_to) : totalPages;
    const pageFrom = Math.max(1, Math.min(totalPages, reqFrom));
    const pageTo = Math.max(pageFrom, Math.min(totalPages, reqTo));

    let units: Unit[];
    let noCitationDropped: number | undefined;
    if (mode === "fsor") {
      const { pageText } = await loadPagesRange(doc, pageFrom, pageTo);
      units = extractFsor(pageText, pageFrom, body.start_anchor, body.stop_anchor);
    } else {
      // Document-shape guard (shared by appendix45 + appendix2023).
      // Page-count uses cheap doc.numPages; shape sample is the first 5 pages
      // of the requested window. Whitespace is collapsed before testing because
      // per-page running headers contain artifacts that defeat literal substring
      // matching. The header regex is letter-tolerant because the PDF extractor
      // splits inside words. Column-header tokens are informational only.
      // force_shape=true skips the guard entirely.
      const FSOR_APPENDIX_RE =
        /F\s*S\s*O\s*R\s*A\s*P\s*P\s*E\s*N\s*D\s*I\s*X/i;
      const sampleEnd = Math.min(pageTo, pageFrom + 4);
      const { pageText: sampleText } = await loadPagesRange(doc, pageFrom, sampleEnd);
      const perPage = sampleText.map((t, i) => {
        const norm = (t || "").replace(/\s+/g, " ").trim();
        return {
          page: pageFrom + i,
          matched: {
            fsor_appendix: FSOR_APPENDIX_RE.test(norm),
            summary_of_comments: /Summary\s+of\s+Comments?/i.test(norm),
            agency_response: /Agency\s+Response/i.test(norm),
          },
          normalized_preview: norm.slice(0, 80),
        };
      });
      const appendixHits = perPage.filter((p) => p.matched.fsor_appendix).length;
      const anySummary = perPage.some((p) => p.matched.summary_of_comments);
      const anyAgency = perPage.some((p) => p.matched.agency_response);
      const shapeOk = appendixHits > perPage.length / 2;
      const lengthOk = mode === "appendix2023" ? true : totalPages > 100;
      const forceShape = body?.force_shape === true;
      if (forceShape) {
        console.warn(
          `[cppa-fsor-extract] force_shape=true — bypassing document-shape guard for ${source_url} (mode=${mode}, pages=${totalPages}, appendix_hits=${appendixHits}/${perPage.length})`,
        );
      } else if (!shapeOk || !lengthOk) {
        return json(
          {
            error: "document_shape_mismatch",
            url: source_url,
            mode,
            page_count: totalPages,
            failed_check: !lengthOk
              ? `length: ${totalPages} pages (need > 100)`
              : `shape: appendix_markers=${appendixHits}/${perPage.length} (need majority match on letter-tolerant /F S O R A P P E N D I X/i)`,
            sampled_pages: perPage,
            informational: {
              any_summary_of_comments: anySummary,
              any_agency_response: anyAgency,
            },
            total_units: 0,
            units: [],
            total_pages: totalPages,
          },
          422,
        );
      }
      if (mode === "appendix45") {
        const { pageItems } = await loadPagesRange(doc, pageFrom, pageTo);
        const cx = body.column_x ?? [75, 160, 430];
        units = extractAppendix(pageItems, cx, pageFrom);
      } else {
        const pages = await loadPagesWithRotation(doc, pageFrom, pageTo);
        const colBounds: [number, number, number, number] =
          body.col_bounds ?? [90, 420, 610, 670];
        const label = appendixLabelFromUrl(source_url);
        const forceRotation = body?.force_rotation !== undefined ? Number(body.force_rotation) : null;
        const res = extractAppendix2023(pages, colBounds, label, includeRoots, forceRotation);
        units = res.units;
        noCitationDropped = res.noCitationDropped;
      }
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

    return json({
      total_units: units.length,
      sections,
      units,
      total_pages: totalPages,
      page_from: pageFrom,
      page_to: pageTo,
      ...(noCitationDropped !== undefined ? { no_citation_dropped: noCitationDropped } : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ error: msg }, 400);
  }
});
