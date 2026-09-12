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

// BATCH a77240e3 (2026-09-12, EUN5-01, ChatGPT + Claude joint review) —
// `establishment_jurisdiction` and the free-text `controller_address` /
// `gdpr_dpa_contact` fields are independent intake answers with no
// cross-validation between them, so a record can (and, on a grader-run
// fixture, did) answer "establishment_jurisdiction: outside" while the
// controller address and named supervisory authority both read as an
// EEA/UK location — spine.ts's Article 27 / lead-authority branches then
// correctly follow the (contradicted) establishment answer, producing a
// notice that names an EEA address in Section 1 and asserts "not
// established in the EEA" a few sections later. This does not resolve the
// contradiction (the notice generator has no authority to decide which
// answer is right) — it surfaces it, the same way the required-fields
// banner surfaces an incomplete record.
import { EEA_RE, UK_RE } from "./spine.ts";

function isBlank(v: unknown): boolean {
  return v == null || String(v).trim() === "";
}

/** Non-empty only when establishment_jurisdiction says "outside" the
 *  EEA/UK while the controller address or DPA contact names an EEA/UK
 *  location — a same-record contradiction the generator cannot resolve
 *  on its own. */
export function establishmentConsistencyBannerHtml(answers: Record<string, unknown>): string {
  const establishment = String(answers.establishment_jurisdiction ?? "").trim().toLowerCase();
  if (isBlank(establishment) || EEA_RE.test(establishment) || UK_RE.test(establishment)) return "";
  const address = String(answers.controller_address ?? "").toLowerCase();
  const dpaContact = String(answers.gdpr_dpa_contact ?? "").toLowerCase();
  const hasConflict = EEA_RE.test(address) || UK_RE.test(address) || EEA_RE.test(dpaContact) || UK_RE.test(dpaContact);
  if (!hasConflict) return "";
  return `<div style="background:#7c1a1a;color:#fff;padding:12px 20px;font-size:13px;
  font-weight:600;border-radius:6px;margin-bottom:24px;letter-spacing:0.02em;
  border-left:6px solid #f87171;">
  ⚠ ESTABLISHMENT ANSWER MAY CONFLICT WITH THE RECORD — "establishment_jurisdiction" is answered as outside the EEA/UK, but the controller address or the named supervisory authority reads as an EEA/UK location. Confirm the correct establishment answer before relying on the Article 27 representative or lead-authority sections of this notice.
</div>`;
}
