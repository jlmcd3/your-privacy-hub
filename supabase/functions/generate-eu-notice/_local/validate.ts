// supabase/functions/generate-eu-notice/_local/validate.ts
//
// S-N5 (doc 80, 2026-08-27) — the required-field screen, extracted from
// index.ts so tests can import it without index's Deno.serve listener.
//
// The old hasRequiredFieldsBlank checked only controller_name/contact_email
// while the banner copy claimed six fields were checked (the 8-26 audit's
// overstating-copy finding). The check now covers exactly the fields the
// banner names, and the banner names exactly the fields actually missing.

const EU_REQUIRED_NOTICE_FIELDS: ReadonlyArray<readonly [key: string, label: string]> = [
  ["controller_name", "controller name"],
  ["contact_email", "contact email"],
  ["data_categories", "data categories"],
  ["processing_purposes", "processing purposes"],
  ["lawful_basis", "lawful basis"],
  ["retention_period", "retention"],
] as const;

function isBlankAnswer(v: unknown): boolean {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  return String(v).trim() === "";
}

function escapeBannerText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Labels of required notice fields the answers leave blank. */
export function missingRequiredEuFields(answers: Record<string, unknown>): string[] {
  return EU_REQUIRED_NOTICE_FIELDS
    .filter(([key]) => isBlankAnswer(answers[key]))
    .map(([, label]) => label);
}

export function draftBannerHtml(missing: string[]): string {
  if (missing.length === 0) return "";
  return `<div style="background:#7c1a1a;color:#fff;padding:12px 20px;font-size:13px;
  font-weight:600;border-radius:6px;margin-bottom:24px;letter-spacing:0.02em;
  border-left:6px solid #f87171;">
  ⚠ REQUIRED FIELDS MISSING — DO NOT PUBLISH this notice until the following ${missing.length === 1 ? "is" : "are"} completed: ${escapeBannerText(missing.join(", "))}.
</div>`;
}
