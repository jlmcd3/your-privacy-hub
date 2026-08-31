// UNIVERSAL REPORT DISCLAIMER — single backend source of truth.
//
// Mirrored byte-for-byte in src/lib/reportDisclaimer.ts. This exact text must
// appear ONCE, as the final element, on every generated report/document
// (PDF, DOCX, XLSX, HTML, markup document_text).
//
// Do not edit, reflow, or "improve" this string.

export const REPORT_DISCLAIMER =
  "EndUserPrivacy.com, owned and operated by EUP, LLC (\u201CEUP\u201D), utilizes your information in a secure manner with third party providers to generate your documents. EUP requires those third party providers to execute appropriate data processing agreements. Accordingly, your information remains confidential and is never retained by EUP providers for any purpose. Documents from EUP are intended for educational and strategic planning purposes only, so they do not establish an attorney-client relationship. Instead, they constitute general analysis of complex regulatory matters and are not a substitute for legal counsel.";

/** HTML fragment for PDF/HTML builders — unobtrusive, hairline separator.
 *
 * A-TEAM S3 RULINGS I.7/I.22 (doc 115, 2026-08-31): presentation only — the
 * ratified disclaimer STRING is untouched. The block is now a labelled
 * "Important notice" at 8.5pt with keep-together, so it reads as a designed
 * report-limitations note rather than website boilerplate in fine print. */
export function reportDisclaimerHtml(): string {
  const esc = REPORT_DISCLAIMER
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Single-level markup (spans only): applyUniversalDisclaimerHtml strips a
  // prior copy with a no-same-tag-nesting regex, so the wrapper must contain
  // no nested <div>/<p> for idempotent re-application.
  return `<div class="eup-report-disclaimer" style="margin-top:24px;padding-top:10px;border-top:1px solid #d9d9d9;break-inside:avoid;page-break-inside:avoid;">` +
    `<span style="display:block;font-family:Arial,Helvetica,sans-serif;font-size:8pt;font-weight:bold;text-transform:uppercase;letter-spacing:0.06em;color:#4a5b6a;margin:0 0 4px;">Important notice</span>` +
    `<span style="display:block;font-size:8.5pt;line-height:1.5;color:#555;">${esc}</span></div>`;
}

/** Plain-text / markdown tail for document_text style payloads. */
export function reportDisclaimerText(): string {
  return `\n\n---\n\n${REPORT_DISCLAIMER}\n`;
}

/**
 * Appends the disclaimer to a text document body, first stripping any prior
 * copy of it so the disclaimer appears exactly once.
 */
export function withReportDisclaimer(body: string): string {
  const stripped = String(body ?? "").split(REPORT_DISCLAIMER).join("").replace(/\s*---\s*$/, "");
  return stripped.replace(/\s+$/, "") + reportDisclaimerText();
}

const DISCLAIMER_BLOCK =
  /<(div|section|p|footer)\b[^>]*>(?:(?!<\1\b)[\s\S])*?<\/\1>/gi;

const DISCLAIMER_SIGNAL =
  /not legal advice|does not constitute legal advice|attorney[-\u2013]client|informational purposes only|educational purposes only|not a substitute for legal (?:counsel|advice)|starting point for your organisation|starting template/i;

/**
 * Final HTML normalizer for every PDF/HTML report builder: strips any prior
 * in-report legal disclaimer block, then appends the universal disclaimer as
 * the final element of the document body — exactly once.
 */
export function applyUniversalDisclaimerHtml(html: string): string {
  let out = String(html ?? "");
  out = out.replace(DISCLAIMER_BLOCK, (block) => {
    const text = block.replace(/<[^>]+>/g, " ");
    if (!DISCLAIMER_SIGNAL.test(text)) return block;
    // Never strip a block that carries substantive report content.
    if (text.replace(/\s+/g, " ").trim().length > 900) return block;
    return "";
  });
  const tail = reportDisclaimerHtml();
  if (/<\/body>/i.test(out)) return out.replace(/<\/body>/i, `${tail}\n</body>`);
  return out + tail;
}
