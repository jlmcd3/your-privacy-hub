// ITEM 371 — SHARED AUTHORITY EXHIBIT (fleet component; first wired on cppa-cyber).
//
// Renders the authorities a report actually cites as a separate exhibit placed
// at the END of the report, immediately before the universal disclaimer, in the
// form a lawyer uses for a table of authorities in a federal-court brief:
//
//   Appendix — Authorities Cited
//     Constitutional Provisions
//     Statutes
//     Regulations
//     Administrative and Regulatory Materials
//     Other Authorities
//
// Each entry is a full citation in citation-manual style, hanging-indent, and —
// ONLY where the authority has an approved corpus row — the pin-verified
// verbatim excerpt in smaller indented type with its corpus key noted. An
// authority with no approved corpus row renders CITATION ONLY. No excerpt text
// may originate anywhere but the corpus.

export type AuthorityClass =
  | "constitutional"
  | "statute"
  | "regulation"
  | "administrative"
  | "other";

export interface AuthorityExhibitEntry {
  /** Full citation, citation-manual style. */
  citation: string;
  /** As cited in the report (pinpoint form), when it differs from `citation`. */
  as_cited?: string;
  authority_class: AuthorityClass;
  /** provision_texts key, when the authority has an approved corpus row. */
  corpus_key?: string | null;
  /** Verbatim corpus text. NEVER populated from anything but the corpus. */
  excerpt?: string | null;
  /** True when `excerpt` was taken verbatim from an approved corpus row. */
  pin_verified?: boolean;
  /** Rendered in place of an excerpt when no approved corpus row exists. */
  note?: string | null;
}

export interface AuthorityExhibit {
  version: string;
  heading: string;
  entries: AuthorityExhibitEntry[];
}

export const AUTHORITY_EXHIBIT_VERSION = "ax-w1-2026-08-03";
export const AUTHORITY_EXHIBIT_HEADING = "Appendix — Authorities Cited";

export const AUTHORITY_CLASS_ORDER: readonly AuthorityClass[] = [
  "constitutional",
  "statute",
  "regulation",
  "administrative",
  "other",
];

export const AUTHORITY_CLASS_LABELS: Record<AuthorityClass, string> = {
  constitutional: "Constitutional Provisions",
  statute: "Statutes",
  regulation: "Regulations",
  administrative: "Administrative and Regulatory Materials",
  other: "Other Authorities",
};

export const CITATION_ONLY_NOTE =
  "Citation only — this authority has no approved corpus text, so no excerpt is reproduced.";

/** Classify a citation string into its table-of-authorities class. */
export function classifyAuthority(citation: string): AuthorityClass {
  const c = String(citation || "");
  if (/\bConst\.|Constitution\b/i.test(c)) return "constitutional";
  if (/\bC\.?C\.?R\.?\b|Code Regs|\bCFR\b|\bC\.F\.R\.\b|GDPR|Regulation \(EU\)|\bArt(icle)?\.? ?\d+/i.test(c)) {
    return "regulation";
  }
  if (/Civ\.? Code|Civil Code|U\.?S\.?C\.?|\bCode §|Stat\.|Act\b|Bus\. ?& ?Prof/i.test(c)) return "statute";
  if (/EDPB|Guidance|Guidelines|Advisory|Enforcement|Opinion|FSOR|Agency|Commissioner|Bulletin|FAQ/i.test(c)) {
    return "administrative";
  }
  return "other";
}

/**
 * Format a raw in-report citation into citation-manual style. Conservative:
 * only shapes we can format correctly are rewritten; anything else is returned
 * unchanged rather than mangled.
 */
export function formatCitation(citation: string): string {
  const c = String(citation || "").trim().replace(/\s+/g, " ");
  let m = /^(\d+)\s*CCR\s*§+\s*([\d.]+)/i.exec(c);
  if (m) return `Cal. Code Regs. tit. ${m[1]}, § ${m[2]}`;
  m = /^(?:Cal\.?\s*)?Civ(?:il)?\.?\s*Code\s*(?:section|§)\s*([\d.]+)/i.exec(c);
  if (m) return `Cal. Civ. Code § ${m[1]}`;
  m = /^(?:GDPR\s*)?Art(?:icle)?\.?\s*(\d+[a-z]?)\s*(?:GDPR)?$/i.exec(c);
  if (m && /GDPR/i.test(c)) {
    return `Regulation (EU) 2016/679 (General Data Protection Regulation) art. ${m[1]}`;
  }
  return c;
}

/** The pinpoint portion of a citation, e.g. "11 CCR § 7123(c)(1)" → "(c)(1)". */
function pinpointOf(asCited: string, base: string): string {
  const a = String(asCited || "").replace(/\s+/g, " ").trim();
  const b = String(base || "").replace(/\s+/g, " ").trim();
  return a.startsWith(b) ? a.slice(b.length).trim() : "";
}

export interface CorpusProvision {
  /** provision_texts.key */
  key: string;
  /** provision_texts.citation */
  citation: string;
  /** provision_texts.verbatim_excerpt — approved rows only. */
  verbatim_excerpt: string;
  status?: string;
}

/**
 * Build exhibit entries from the citations a report actually emitted plus the
 * approved corpus provisions available at generation time.
 *
 * `citations` may contain pinpoints; entries are de-duplicated on the base
 * section so the exhibit lists each authority once, the way a table of
 * authorities does.
 */
export function buildAuthorityExhibit(
  citations: readonly string[],
  provisions: readonly CorpusProvision[] = [],
): AuthorityExhibit {
  const byCitation = new Map<string, CorpusProvision>();
  for (const p of provisions) {
    if (!p || (p.status && p.status !== "approved")) continue;
    byCitation.set(normalizeSection(p.citation), p);
  }

  const seen = new Map<string, AuthorityExhibitEntry>();
  for (const raw of citations) {
    const cite = String(raw || "").trim();
    if (!cite) continue;
    const base = baseSection(cite);
    const norm = normalizeSection(base);
    if (seen.has(norm)) {
      const prior = seen.get(norm)!;
      const pin = pinpointOf(cite, base);
      if (pin && prior.as_cited && !prior.as_cited.includes(pin)) {
        prior.as_cited = `${prior.as_cited}, ${pin}`;
      } else if (pin && !prior.as_cited) {
        prior.as_cited = pin;
      }
      continue;
    }
    const provision = byCitation.get(norm);
    const pin = pinpointOf(cite, base);
    seen.set(norm, {
      citation: formatCitation(base),
      ...(pin ? { as_cited: pin } : {}),
      authority_class: classifyAuthority(base),
      corpus_key: provision?.key ?? null,
      excerpt: provision ? normalizeExcerpt(provision.verbatim_excerpt) : null,
      pin_verified: Boolean(provision),
      note: provision ? null : CITATION_ONLY_NOTE,
    });
  }

  const entries = [...seen.values()].sort((a, b) => {
    const ca = AUTHORITY_CLASS_ORDER.indexOf(a.authority_class);
    const cb = AUTHORITY_CLASS_ORDER.indexOf(b.authority_class);
    if (ca !== cb) return ca - cb;
    return a.citation.localeCompare(b.citation, "en");
  });

  return { version: AUTHORITY_EXHIBIT_VERSION, heading: AUTHORITY_EXHIBIT_HEADING, entries };
}

/** "11 CCR § 7123(c)(1)" → "11 CCR § 7123" */
export function baseSection(citation: string): string {
  const c = String(citation || "").replace(/\s+/g, " ").trim();
  const m = /^(.*?§+\s*[\d.]+)/.exec(c);
  return (m ? m[1] : c).trim();
}

function normalizeSection(citation: string): string {
  return String(citation || "")
    .replace(/\u00a7/g, "§")
    .replace(/\s+/g, " ")
    .replace(/\s*§\s*/g, " § ")
    .trim()
    .toLowerCase();
}

function normalizeExcerpt(text: string): string {
  return String(text || "").replace(/\f/g, "").replace(/[ \t]+\n/g, "\n").trim();
}

function esc(v: unknown): string {
  return String(v === null || v === undefined ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Render the exhibit as standalone HTML (used by every PDF/HTML builder).
 * Returns "" when there is nothing to cite, so callers can splice it in
 * unconditionally.
 */
export function renderAuthorityExhibitHtml(exhibit: AuthorityExhibit | null | undefined): string {
  const entries = exhibit?.entries ?? [];
  if (!entries.length) return "";
  const groups = AUTHORITY_CLASS_ORDER
    .map((cls) => ({ cls, rows: entries.filter((e) => e.authority_class === cls) }))
    .filter((g) => g.rows.length > 0);

  const body = groups.map((g) => `
    <div class="authority-group">
      <h3 class="authority-class">${esc(AUTHORITY_CLASS_LABELS[g.cls])}</h3>
      ${g.rows.map((e) => `
      <div class="authority-entry">
        <p class="authority-cite">${esc(e.citation)}${e.as_cited ? ` <span class="authority-pin">(cited at ${esc(e.as_cited)})</span>` : ""}</p>
        ${e.excerpt
          ? `<blockquote class="authority-excerpt">${esc(e.excerpt)}<span class="authority-key">Corpus key: ${esc(e.corpus_key)} · pin-verified verbatim text</span></blockquote>`
          : `<p class="authority-note">${esc(e.note || CITATION_ONLY_NOTE)}</p>`}
      </div>`).join("")}
    </div>`).join("");

  return `
  <section class="section authority-exhibit">
    <h2>${esc(exhibit?.heading || AUTHORITY_EXHIBIT_HEADING)}</h2>
    ${body}
  </section>`;
}

/** Styles for `renderAuthorityExhibitHtml`; inject once per document head. */
export const AUTHORITY_EXHIBIT_CSS = `
  .authority-exhibit .authority-group { margin-bottom:14px; page-break-inside:avoid; }
  .authority-exhibit .authority-class { font-size:12px; text-transform:uppercase; letter-spacing:.08em; margin:14px 0 8px; }
  .authority-exhibit .authority-entry { padding-left:24px; text-indent:-24px; margin-bottom:10px; page-break-inside:avoid; }
  .authority-exhibit .authority-cite { margin:0 0 3px; font-size:11.5px; }
  .authority-exhibit .authority-pin { font-size:10.5px; color:#64748b; }
  .authority-exhibit .authority-excerpt { margin:0 0 0 24px; text-indent:0; padding:6px 10px; border-left:2px solid #cbd5e1; font-size:10px; line-height:1.45; color:#334155; white-space:pre-wrap; }
  .authority-exhibit .authority-key { display:block; margin-top:4px; font-size:9px; color:#64748b; }
  .authority-exhibit .authority-note { margin:0 0 0 24px; text-indent:0; font-size:10px; color:#64748b; }
`;
