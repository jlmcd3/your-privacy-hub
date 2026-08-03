// UNIVERSAL REPORT DISCLAIMER — single backend source of truth.
//
// Mirrored byte-for-byte in src/lib/reportDisclaimer.ts. This exact text must
// appear ONCE, as the final element, on every generated report/document
// (PDF, DOCX, XLSX, HTML, markup document_text).
//
// Do not edit, reflow, or "improve" this string.

export const REPORT_DISCLAIMER =
  "EndUserPrivacy.com (\u201CEUP\u201D) utilizes your information in a secure manner with third party providers, including AI providers, to prepare your documents. EUP prohibits those providers from retaining that information or using it to train their models. Accordingly, your information remains confidential and is never retained by EUP providers for machine learning or for any other purpose. Documents from EUP are intended for educational and strategic planning purposes only, so they do not establish an attorney-client relationship. Instead, they constitute general analysis of complex regulatory matters and are not a substitute for legal counsel.";

/** HTML fragment for PDF/HTML builders — unobtrusive, hairline separator. */
export function reportDisclaimerHtml(): string {
  const esc = REPORT_DISCLAIMER
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p class="eup-report-disclaimer" style="margin-top:24px;padding-top:8px;border-top:1px solid #d9d9d9;font-size:8pt;line-height:1.45;color:#666;">${esc}</p>`;
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
  /not legal advice|legal advice|attorney-client|attorney–client|legal counsel|qualified counsel|informational purposes|educational purposes only/i;

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
