// Shared GDPR parsing helpers used by ingest-gdpr-eu, ingest-gdpr-uk,
// and verify-gdpr-ingestion. Parsers MUST stay identical across callers
// so that sha256(body_text) verification holds.

export const EU_SOURCE_URL =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02016R0679-20160504";

// The consolidated text above omits the preamble; recitals exist only in the
// original act. Articles stay on the consolidated URL (incorporates corrigenda).
export const EU_RECITALS_SOURCE_URL =
  "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679";

// EUR-Lex serves bot-style User-Agents a challenge page that parses to nothing.
// All EUR-Lex fetches must use these browser-equivalent headers.
export const SOURCE_FETCH_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-GB,en;q=0.9",
};

export const UK_INSERTED_IDS = ["4A", "44A", "45A", "45B", "45C", "47A", "49A"];

export function ukArticleXmlUrl(id: string): string {
  return `https://www.legislation.gov.uk/eur/2016/679/article/${id}/data.xml`;
}

export function ukArticleSourceUrl(id: string): string {
  return `https://www.legislation.gov.uk/eur/2016/679/article/${id}`;
}

// --- EU (EUR-Lex HTML) --------------------------------------------------------

export function htmlToText(html: string): string {
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<\/(p|div|li|tr|h[1-6]|br)\s*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|li|tr|td|th|h[1-6]|table|tbody|thead|span|a|b|i|em|strong|sup|sub)[^>]*>/gi, "");
  s = s.replace(/<[^>]+>/g, "");
  s = s.replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[a-z]+;/gi, " ");
  s = s.replace(/[ \t\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

export interface ParsedRecital { number: number; body: string; }
export interface ParsedArticle { number: string; title: string; chapter: string | null; body: string; }

export function parseRecitals(text: string): ParsedRecital[] {
  const adoptedIdx = text.search(/HAVE\s+ADOPTED\s+THIS\s+REGULATION/i);
  const preamble = adoptedIdx > 0 ? text.slice(0, adoptedIdx) : text;
  const recitals: ParsedRecital[] = [];
  const re = /(?:^|\n)\((\d{1,3})\)\s+([\s\S]*?)(?=\n\(\d{1,3}\)\s+|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(preamble)) !== null) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 200) {
      const body = m[2].trim().replace(/\s+/g, " ");
      if (body.length > 10) recitals.push({ number: n, body });
    }
  }
  const seen = new Set<number>();
  return recitals.filter((r) => (seen.has(r.number) ? false : (seen.add(r.number), true)));
}

export function parseArticles(text: string): ParsedArticle[] {
  const adoptedIdx = text.search(/HAVE\s+ADOPTED\s+THIS\s+REGULATION/i);
  const body = adoptedIdx > 0 ? text.slice(adoptedIdx) : text;

  const headingRe = /^Article\s+(\d{1,3})\s*$/gm;
  const matches: Array<{ num: string; start: number; end: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(body)) !== null) {
    matches.push({ num: m[1], start: m.index, end: m.index + m[0].length });
  }
  const articles: ParsedArticle[] = [];
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    const segment = body.slice(cur.end, next ? next.start : body.length);

    const lines = segment.split("\n").map((l) => l.trim());
    const titleLines: string[] = [];
    let bodyStartIdx = 0;
    for (let j = 0; j < lines.length; j++) {
      const ln = lines[j];
      if (!ln) {
        if (titleLines.length > 0) { bodyStartIdx = j + 1; break; }
        continue;
      }
      if (/^\d+\.\s/.test(ln) || /^\(\d+\)\s/.test(ln)) {
        bodyStartIdx = j;
        break;
      }
      titleLines.push(ln);
      if (titleLines.length >= 3) { bodyStartIdx = j + 1; break; }
    }
    const title = titleLines.join(" ").trim();
    const articleBody = lines.slice(bodyStartIdx).join("\n").trim();

    const before = body.slice(0, cur.start);
    const chapMatches = [...before.matchAll(/\bCHAPTER\s+[IVXLC]+\b[^\n]*(?:\n[^\n]+)?/g)];
    const chapter = chapMatches.length ? chapMatches[chapMatches.length - 1][0].replace(/\s+/g, " ").trim() : null;

    if (articleBody.length > 20) {
      articles.push({ number: cur.num, title, chapter, body: articleBody });
    }
  }
  const seen = new Set<string>();
  return articles.filter((a) => (seen.has(a.number) ? false : (seen.add(a.number), true)));
}

// --- UK (CLML XML) ------------------------------------------------------------

export interface ParsedUkArticle { number: string; title: string; body: string; }

function decodeEntities(s: string): string {
  return s.replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, c) => String.fromCodePoint(parseInt(c, 10)))
    .replace(/&[a-z]+;/gi, " ");
}

function stripTag(xml: string, localName: string): string {
  const re = new RegExp(`<(?:[A-Za-z0-9]+:)?${localName}\\b[^>]*>[\\s\\S]*?</(?:[A-Za-z0-9]+:)?${localName}>`, "gi");
  return xml.replace(re, "");
}

function firstInner(xml: string, localName: string): string | null {
  const re = new RegExp(`<(?:[A-Za-z0-9]+:)?${localName}\\b[^>]*>([\\s\\S]*?)</(?:[A-Za-z0-9]+:)?${localName}>`, "i");
  const m = xml.match(re);
  return m ? m[1] : null;
}

export function xmlToText(xml: string): string {
  let s = xml;
  for (const tag of [
    "Annotations", "Commentary", "CommentaryRef", "CommentaryCitation",
    "Footnotes", "Footnote", "Reference", "AppendText",
    "EditorialNote", "AnnotationCitation",
  ]) {
    s = stripTag(s, tag);
  }
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  s = s.replace(/\bF\d{1,3}\b/g, " ");
  s = s.replace(/Textual Amendments[\s\S]{0,200}?(?=\n|$)/gi, " ");
  s = s.replace(/Modifications etc[^.\n]{0,200}/gi, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function parseUkArticleXml(xml: string, identifier: string): ParsedUkArticle | null {
  const body = firstInner(xml, "P1") ?? xml;
  const rawTitle = firstInner(body, "Title") ?? firstInner(body, "Heading") ?? "";
  const title = xmlToText(rawTitle);
  let bodyXml = body;
  bodyXml = stripTag(bodyXml, "Title");
  bodyXml = stripTag(bodyXml, "Heading");
  bodyXml = stripTag(bodyXml, "Pnumber");
  const text = xmlToText(bodyXml);
  if (text.length < 20) return null;
  return { number: identifier, title, body: text };
}

export async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
