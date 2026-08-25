// email-citations
// Email-side mirror of the web viewer's <CitedText> / <SourcesList> components.
//
// The weekly brief stores section prose with inline `[ref:N]` markers plus a
// `source_map` of { N: { title, url, source } }. On the web we render those as
// superscript links plus a per-section source list. In email we must do the
// same, but with two constraints:
//
//   1. Translation runs over the assembled HTML. Anchors and URLs must NOT be
//      present while the translator works, or hrefs get mangled. So the brief
//      renderer emits plain `[ref:N]` markers plus a `[[sources]]` token at the
//      end of each section, and this module hydrates them AFTER translation.
//   2. No <style>/classes — Outlook and Gmail strip them. Everything inline.
//
// hydrateEmailCitations() is token-scoped: each `[[sources]]` token consumes
// the refs found since the previous token, so no section bookkeeping is needed.

export type EmailSourceMap = Record<
  string,
  { title?: string | null; url?: string | null; source?: string | null }
>;

export const SOURCES_TOKEN = "[[sources]]";

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Only http(s) links are emitted; anything else degrades to a plain marker.
function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const u = url.trim();
  return /^https?:\/\//i.test(u) ? u : null;
}

const SUP_STYLE =
  "font-size:10px;line-height:0;vertical-align:super;color:#2a9d8f;text-decoration:none;font-weight:600";

/** Replace `[ref:N]` markers with linked superscripts (or plain ones). */
export function linkifyRefs(html: string, sourceMap: EmailSourceMap): string {
  return html.replace(/\[ref:(\d+)\]/g, (_m, n: string) => {
    const url = safeUrl(sourceMap?.[n]?.url);
    if (!url) {
      return `<sup style="font-size:10px;line-height:0;vertical-align:super;color:#94a3b8">[${n}]</sup>`;
    }
    const label = [sourceMap[n]?.source, sourceMap[n]?.title]
      .filter(Boolean)
      .join(" — ");
    return `<a href="${escapeHtml(url)}" title="${escapeHtml(label)}" style="text-decoration:none"><sup style="${SUP_STYLE}">[${n}]</sup></a>`;
  });
}

/** Ordered, de-duplicated ref numbers appearing in a chunk of text. */
export function refsIn(text: string): string[] {
  const found = [...text.matchAll(/\[ref:(\d+)\]/g)].map((m) => m[1]);
  return [...new Set(found)].sort((a, b) => Number(a) - Number(b));
}

/** Render the "Sources" list for a set of ref numbers. Empty string if none. */
export function renderSourcesList(refs: string[], sourceMap: EmailSourceMap): string {
  const rows = refs
    .map((n) => ({ n, ...(sourceMap?.[n] ?? {}) }))
    .filter((s) => safeUrl(s.url) && s.title)
    .map((s) => {
      const url = safeUrl(s.url)!;
      const title = s.title!.length > 110 ? s.title!.slice(0, 107) + "…" : s.title!;
      const src = s.source
        ? `<span style="color:#94a3b8">${escapeHtml(s.source)}</span> `
        : "";
      return `<tr><td style="padding:2px 6px 2px 0;font-size:11px;color:#94a3b8;vertical-align:top;white-space:nowrap">[${s.n}]</td>
<td style="padding:2px 0;font-size:12px;line-height:1.4"><a href="${escapeHtml(url)}" style="color:#2a9d8f;text-decoration:none">${src}${escapeHtml(title)}</a></td></tr>`;
    })
    .join("\n");

  if (!rows) return "";
  return `<div style="margin:10px 0 0;padding-top:8px;border-top:1px solid #e2e8f0">
<div style="font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8;margin-bottom:4px">Sources</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%">${rows}</table>
</div>`;
}

/**
 * Post-translation hydration: turn `[ref:N]` markers into linked superscripts
 * and each `[[sources]]` token into a source list covering the refs used since
 * the previous token.
 */
export function hydrateEmailCitations(html: string, sourceMap: EmailSourceMap | null | undefined): string {
  const map = sourceMap ?? {};
  const segments = html.split(SOURCES_TOKEN);

  return segments
    .map((segment, i) => {
      const linked = linkifyRefs(segment, map);
      // The final segment has no trailing token.
      if (i === segments.length - 1) return linked;
      return linked + renderSourcesList(refsIn(segment), map);
    })
    .join("");
}
