/**
 * First-mention glossary linker for Research guide pages.
 *
 * Given an ordered list of section objects (shape: { content?: string, ... }),
 * walks them in order and wraps the FIRST occurrence of each curated term in
 * an anchor pointing at /glossary#{slug}. At most one link per term per page.
 *
 * Skips matches that fall inside an existing <a>…</a>, inside a heading
 * (h1–h6), or inside an HTML tag/attribute.
 */

import glossaryData from "@/data/glossary.json";

interface CuratedTerm {
  /** Display phrase to match (case-insensitive). */
  pattern: string;
  /** Glossary slug to link to. */
  slug: string;
}

/**
 * Curated list per spec. Order matters: longer phrases first so they win
 * over shorter ones that they contain. Every slug is verified to exist in
 * src/data/glossary.json at module load.
 */
const CURATED: CuratedTerm[] = [
  { pattern: "data protection impact assessment", slug: "dpia" },
  { pattern: "standard contractual clauses", slug: "standard-contractual-clauses" },
  { pattern: "automated decision[- ]making", slug: "automated-decision-making" },
  { pattern: "special category data", slug: "special-category-data" },
  { pattern: "supervisory authority", slug: "supervisory-authority" },
  { pattern: "legitimate interest", slug: "legitimate-interest" },
  { pattern: "adequacy decision", slug: "adequacy-decision" },
  { pattern: "biometric data", slug: "biometric-data" },
  { pattern: "data controller", slug: "data-controller" },
  { pattern: "data processor", slug: "data-processor" },
  { pattern: "sensitive data", slug: "sensitive-data" },
  { pattern: "personal data", slug: "personal-data" },
  { pattern: "data broker", slug: "data-broker" },
];

// Verify slugs exist; drop any that don't.
const GLOSSARY_SLUGS = new Set(
  (glossaryData as Array<{ slug: string }>).map((t) => t.slug),
);
const TERMS: CuratedTerm[] = CURATED.filter((t) => GLOSSARY_SLUGS.has(t.slug));

const LINK_CLASS = "text-brand-teal underline-offset-2 hover:underline";

function escapeForRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True if the character index sits inside an open <a>…</a>, <hN>…</hN>, or HTML tag. */
function isProtected(html: string, idx: number): boolean {
  const before = html.slice(0, idx);

  // Inside an HTML tag (attribute area)?
  const lastLt = before.lastIndexOf("<");
  const lastGt = before.lastIndexOf(">");
  if (lastLt > lastGt) return true;

  // Inside <a>…</a>?
  const lastOpenA = Math.max(
    before.lastIndexOf("<a "),
    before.lastIndexOf("<a\n"),
    before.lastIndexOf("<a\t"),
    before.lastIndexOf("<a>"),
  );
  const lastCloseA = before.lastIndexOf("</a>");
  if (lastOpenA > lastCloseA) return true;

  // Inside an open heading?
  const headingOpenMatches = before.match(/<h[1-6](\s[^>]*)?>/gi) || [];
  const headingCloseMatches = before.match(/<\/h[1-6]>/gi) || [];
  if (headingOpenMatches.length > headingCloseMatches.length) return true;

  return false;
}

function linkFirstMention(html: string, term: CuratedTerm): { html: string; linked: boolean } {
  // Pattern may already include regex (e.g. character class for hyphen/space).
  // Use word boundary on each end.
  const re = new RegExp(`\\b(?:${term.pattern})\\b`, "i");
  let cursor = 0;
  while (cursor < html.length) {
    const slice = html.slice(cursor);
    const m = slice.match(re);
    if (!m || m.index === undefined) return { html, linked: false };
    const absIdx = cursor + m.index;
    if (!isProtected(html, absIdx)) {
      const matched = html.slice(absIdx, absIdx + m[0].length);
      const replacement = `<a href="/glossary#${term.slug}" class="${LINK_CLASS}">${matched}</a>`;
      return {
        html: html.slice(0, absIdx) + replacement + html.slice(absIdx + m[0].length),
        linked: true,
      };
    }
    cursor = absIdx + m[0].length;
  }
  return { html, linked: false };
}

/**
 * Generic section type accepted by ResearchPageLayout. We only touch `content`
 * (HTML string); everything else passes through unchanged.
 */
type SectionLike = { content?: string } & Record<string, unknown>;

/**
 * Wrap the FIRST page-wide occurrence of each curated glossary term in a
 * /glossary#{slug} link. Returns a new array of sections; never mutates input.
 */
export function linkGlossaryFirstMentions<T extends SectionLike>(sections: T[]): T[] {
  const remaining = new Set(TERMS.map((t) => t.slug));
  return sections.map((section) => {
    if (!section.content || remaining.size === 0) return section;
    let html = section.content;
    for (const term of TERMS) {
      if (!remaining.has(term.slug)) continue;
      const result = linkFirstMention(html, term);
      if (result.linked) {
        html = result.html;
        remaining.delete(term.slug);
      }
    }
    return html === section.content ? section : { ...section, content: html };
  });
}
