// Deterministic parser for ICO "Action we've taken / Enforcement action" pages.
// The ICO publishes no API and retired its enforcement RSS feed, but every
// action page is rendered from the same Umbraco template, so the fields we need
// (party name, date, action type, sector, narrative, decision PDF) are all
// recoverable without a model. No LLM is used anywhere in this module.

export interface IcoAction {
  url: string;
  subject: string;
  decisionDate: string | null; // ISO yyyy-mm-dd
  actionType: string | null;
  sector: string | null;
  narrative: string;
  pdfUrl: string | null;
  fineAmount: string | null;
  fineGbp: number | null;
}

// Action types that are enforcement actions under the UK GDPR / DPA 2018 /
// PECR regime. Anything else on the ICO site (audits, practice
// recommendations, FOI decision notices) is not an enforcement action.
const ENFORCEMENT_TYPES = [
  "reprimand",
  "monetary penalty",
  "fine",
  "enforcement notice",
  "preliminary enforcement notice",
  "prosecution",
  "undertaking",
  "assessment notice",
  "information notice",
  "caution",
  "civil monetary penalt",
];

const EXCLUDED_TYPES = [
  "audit",
  "practice recommendation",
  "decision notice", // FOI decisions, not privacy enforcement
  "advisory",
];

const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};

export function isEnforcementActionUrl(url: string): boolean {
  try {
    const p = new URL(url).pathname.replace(/\/+$/, "");
    if (!p.startsWith("/action-weve-taken/enforcement/")) return false;
    // The hub itself and any anchor/query-only variant carry no case content.
    return p.split("/").filter(Boolean).length >= 4;
  } catch {
    return false;
  }
}

export function isEnforcementType(actionType: string | null): boolean {
  if (!actionType) return false;
  const t = actionType.toLowerCase();
  if (EXCLUDED_TYPES.some((x) => t.includes(x))) return false;
  return ENFORCEMENT_TYPES.some((x) => t.includes(x));
}

export function parseIcoDate(raw: string | null): string | null {
  if (!raw) return null;
  const m = raw.trim().match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!m) return null;
  const mm = MONTHS[m[2].toLowerCase()];
  if (!mm) return null;
  return `${m[3]}-${mm}-${m[1].padStart(2, "0")}`;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&pound;/g, "£")
    .replace(/&#xA3;/g, "£")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function metaField(html: string, label: string): string | null {
  // <li ...><span>Date</span> <strong ...>7 August 2026</strong></li>
  const re = new RegExp(
    `<span[^>]*>\\s*${label}\\s*</span>\\s*<strong[^>]*>([\\s\\S]*?)</strong>`,
    "i",
  );
  const m = html.match(re);
  return m ? stripTags(m[1]) || null : null;
}

export function parseFine(text: string): { fineAmount: string | null; fineGbp: number | null } {
  const m = text.match(/£\s?([\d][\d,]*(?:\.\d+)?)\s*(million|m\b|thousand|k\b)?/i);
  if (!m) return { fineAmount: null, fineGbp: null };
  let n = parseFloat(m[1].replace(/,/g, ""));
  const unit = (m[2] || "").toLowerCase();
  if (unit.startsWith("m")) n *= 1_000_000;
  if (unit.startsWith("thousand") || unit === "k") n *= 1_000;
  return { fineAmount: m[0].trim(), fineGbp: Number.isFinite(n) ? n : null };
}

/** Parse a fetched ICO enforcement page. Returns null when the page is not a
 *  usable enforcement action (no title, no narrative, or a non-enforcement type). */
export function parseIcoActionPage(url: string, html: string): IcoAction | null {
  if (!isEnforcementActionUrl(url)) return null;

  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const subject = h1 ? stripTags(h1[1]) : "";
  if (!subject || subject.length < 3 || /^skip to/i.test(subject)) return null;

  const actionType = metaField(html, "Type");
  if (!isEnforcementType(actionType)) return null;

  const decisionDate = parseIcoDate(metaField(html, "Date"));
  const sector = metaField(html, "Sector");

  const prose = html.match(/<div class="prose[^"]*">([\s\S]*?)<\/div>/i);
  const narrative = prose ? stripTags(prose[1]) : "";
  if (narrative.length < 60) return null;

  const pdfMatch = html.match(/x-href="([^"]*\.pdf[^"]*)"/i) ??
    html.match(/href="([^"]*\/media2\/[^"]*\.pdf[^"]*)"/i);
  const pdfUrl = pdfMatch ? new URL(pdfMatch[1], "https://ico.org.uk").toString() : null;

  const { fineAmount, fineGbp } = parseFine(narrative);

  return { url, subject, decisionDate, actionType, sector, narrative, pdfUrl, fineAmount, fineGbp };
}

/** Extract enforcement action URLs from the ICO sitemap XML. */
export function extractSitemapActionUrls(xml: string): string[] {
  const out = new Set<string>();
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    const u = m[1];
    if (isEnforcementActionUrl(u)) out.add(u.replace(/\/+$/, "/"));
  }
  return [...out];
}
