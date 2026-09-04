// supabase/functions/generate-us-notice/_local/render.ts
//
// S-N5 (doc 80, 2026-08-27) — the PURE render layer, extracted from
// index.ts so tests can import it without index's Deno.serve listener
// (two generator index modules imported into one test process collide on
// the default port).
//
// DOC 181 (2026-09-04) — REBUILT ONTO THE U.S. PRIVACY NOTICE SPINE. The
// prose now lives in _local/spine.ts (a pure function over the closures this
// file supplies, so formatUsAnswer stays the single writer for reader
// labels); this file keeps the intake-facing helpers, the required-field
// screen, and the formal-instrument document wrapper (Georgia, numbered
// sections, bold+underlined headings, no navy bar, no logo — CEO design
// principle 7, 2026-09-03). Two entry points:
//   buildNoticeHtml(state, …)          — a STATE EDITION: the full spine with
//                                        the addendum limited to that state
//                                        and the California layer only for CA.
//   buildNationalNoticeHtml(states, …) — the national notice covering every
//                                        selected state (the is_combined row).

import { REPORT_DISCLAIMER } from "../../_shared/report-disclaimer.ts";
import { completionBannerHtml, countFills, FI_CSS } from "../../_shared/prose/formal-instrument.ts";
import { formatUsAnswer, US_OPTION_LABELS, usAnswerCodes } from "./labels.ts";
import { buildUsSpine, type UsLawRow, type UsSpineResult, type UsStateRow } from "./spine.ts";

export interface StateRow {
  state_code: string;
  state_name: string;
  framework_type: string;
}
export type { UsLawRow };

export const FRAMEWORK_LABELS: Record<string, string> = {
  ccpa: "California Consumer Privacy Act (CCPA/CPRA)",
  virginia_model: "Virginia-model state privacy law",
  maryland: "Maryland Online Data Privacy Act (MODPA)",
  florida: "Florida Digital Bill of Rights (FDBR)",
  pending: "Pending state privacy law",
};

export const STATE_LAW_NAMES: Record<string, { name: string; cite: string }> = {
  CA: { name: "California Consumer Privacy Act / California Privacy Rights Act (CCPA/CPRA)", cite: "Cal. Civ. Code §1798.100 et seq." },
  VA: { name: "Virginia Consumer Data Protection Act (VCDPA)", cite: "Va. Code Ann. §§59.1-575 to 59.1-585" },
  CO: { name: "Colorado Privacy Act (CPA)", cite: "C.R.S. §6-1-1301 et seq." },
  CT: { name: "Connecticut Data Privacy Act (CTDPA)", cite: "Conn. Pub. Acts 22-15" },
  UT: { name: "Utah Consumer Privacy Act (UCPA)", cite: "Utah Code §13-61-101 et seq." },
  TX: { name: "Texas Data Privacy and Security Act (TDPSA)", cite: "Tex. Bus. & Com. Code §541.001 et seq." },
  OR: { name: "Oregon Consumer Privacy Act (OCPA)", cite: "Or. Rev. Stat. §646A.570 et seq." },
  MT: { name: "Montana Consumer Data Privacy Act (MCDPA)", cite: "Mont. Code Ann. §30-14-2801 et seq." },
  IA: { name: "Iowa Consumer Data Protection Act (ICDPA)", cite: "Iowa Code Ch. 715D" },
  TN: { name: "Tennessee Information Protection Act (TIPA)", cite: "Tenn. Code Ann. §47-18-3201 et seq." },
  IN: { name: "Indiana Consumer Data Protection Act", cite: "Ind. Code §24-15-1-1 et seq." },
  DE: { name: "Delaware Personal Data Privacy Act (DPDPA)", cite: "Del. Code Ann. tit. 6, §12D-101 et seq." },
  NH: { name: "New Hampshire Privacy Act", cite: "N.H. Rev. Stat. Ann. §507-H" },
  NJ: { name: "New Jersey Data Privacy Act", cite: "N.J. Stat. Ann. §56:8-166.4 et seq." },
  KY: { name: "Kentucky Consumer Data Protection Act", cite: "Ky. Rev. Stat. §367.3611 et seq." },
  NE: { name: "Nebraska Data Privacy Act", cite: "Neb. Rev. Stat. §87-1101 et seq." },
  RI: { name: "Rhode Island Data Transparency and Privacy Protection Act", cite: "R.I. Gen. Laws §6-48.1-1 et seq." },
  MN: { name: "Minnesota Consumer Data Privacy Act", cite: "Minn. Stat. §325O" },
  MD: { name: "Maryland Online Data Privacy Act (MODPA)", cite: "Md. Code, Com. Law §14-4601 et seq." },
  FL: { name: "Florida Digital Bill of Rights (FDBR)", cite: "Fla. Stat. §501.701 et seq." },
};

export function resolveLawLabel(state: StateRow): string {
  const named = STATE_LAW_NAMES[state.state_code];
  if (named) return named.name;
  return FRAMEWORK_LABELS[state.framework_type] ?? state.state_name + " state privacy law";
}
export function resolveLawCite(state: StateRow): string {
  return STATE_LAW_NAMES[state.state_code]?.cite ?? "";
}

export function escapeHtml(s: unknown): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function answerString(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/** Scalar option code of a single-choice answer ("" when blank or multi). */
function answerToken(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.length === 1 ? String(value[0]).trim() : "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "boolean") return value ? "yes" : "no";
  return String(value).trim();
}

// S-N5 (doc 80, 2026-08-27) — BANNER PARITY. The EU generator has rendered a
// visible do-not-publish banner for missing required fields since 8-26's
// audit found the asymmetry: the US generator had NO equivalent, so a
// business with a blank business_name shipped a notice reading "[Business
// name]" with no on-document warning at all. Same design as the EU side:
// the check covers exactly the fields the banner names, and the banner
// names exactly the fields actually missing.
const US_REQUIRED_NOTICE_FIELDS: ReadonlyArray<readonly [key: string, label: string]> = [
  ["business_name", "business name"],
  ["contact_email", "contact email"],
  ["data_categories", "data categories"],
  ["collection_purposes", "collection purposes"],
] as const;

function isBlankAnswer(v: unknown): boolean {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  return String(v).trim() === "";
}

/** Labels of required notice fields the answers leave blank. */
export function missingRequiredUsFields(answers: Record<string, unknown>): string[] {
  return US_REQUIRED_NOTICE_FIELDS
    .filter(([key]) => isBlankAnswer(answers[key]))
    .map(([, label]) => label);
}

export function usDraftBannerHtml(missing: string[]): string {
  if (missing.length === 0) return "";
  return `<div class="fi-banner" role="alert"><strong>REQUIRED FIELDS MISSING &mdash; DO NOT PUBLISH</strong> this notice until the following ${missing.length === 1 ? "is" : "are"} completed: ${escapeHtml(missing.join(", "))}.</div>`;
}

// S-N4 (doc 80, 2026-08-27) — the "Key points" first layer. Captures the
// value of the ICO/WP260 layered-notice structure in the one-document form:
// a deterministic summary block atop the notice, every line derived from
// the SAME answers as the body (single writer — no re-stated free text)
// and anchor-linked to the full section it summarises (the § 7012
// jump-to-the-specific-disclosure principle applied in-document).
//
// DOC 181: superseded in rendered documents by the spine's "Privacy at a
// glance" block (same single-writer rule, same section anchors); retained
// as an exported pure function for the S-N4 contract test.
export function buildKeyPointsHtml(answers: Record<string, unknown>): string {
  const categories = answerString(answers["data_categories"]).trim();
  const purposes = answerString(answers["collection_purposes"]).trim();
  const sharing = answerString(answers["third_party_sharing"]).trim();
  const thirdParties = answerString(answers["third_party_categories"]).trim();
  const sale = answerString(answers["sale_or_sharing"]).trim();
  const retentionPeriod = answerString(answers["retention_general"]).trim();
  const retentionCriteria = answerString(answers["retention_criteria"]).trim();
  const contactEmail = answerString(answers["contact_email"]).trim();

  const sells = sale === "sell_and_share" || sale === "sell_only" || sale === "share_only";
  const items: string[] = [];
  if (categories) items.push(`<li><a href="#sec-collect">What we collect:</a> ${escapeHtml(categories)}</li>`);
  if (purposes) items.push(`<li><a href="#sec-use">Why:</a> ${escapeHtml(purposes)}</li>`);
  items.push(sharing === "yes" && thirdParties
    ? `<li><a href="#sec-share">Who receives it:</a> ${escapeHtml(thirdParties)}</li>`
    : `<li><a href="#sec-share">Who receives it:</a> service providers working for us; no third parties for their own use except as the sharing section describes</li>`);
  items.push(sells
    ? `<li><a href="#sec-rights">Sale or sharing:</a> we sell or share personal information as described below; you can opt out</li>`
    : `<li><a href="#sec-rights">Sale or sharing:</a> we do not sell or share personal information for cross-context behavioral advertising</li>`);
  if (retentionPeriod) items.push(`<li><a href="#sec-retain">How long:</a> ${escapeHtml(retentionPeriod)}</li>`);
  else if (retentionCriteria) items.push(`<li><a href="#sec-retain">How long:</a> determined by the criteria stated in the retention section</li>`);
  if (contactEmail) items.push(`<li><a href="#sec-contact">Your rights:</a> know, access, correct, delete, and opt out where applicable — contact ${escapeHtml(contactEmail)}</li>`);

  if (items.length === 0) return "";
  return `<section class="fi-glance">
  <p><span class="fi-run">Key points</span></p>
  <ul>${items.join("\n  ")}</ul>
  <p>This summary is for orientation only; the numbered sections below are the notice.</p>
</section>`;
}

/** The spine for one edition, wired to this file's closures. */
export function buildUsSpineFor(
  states: readonly StateRow[],
  edition: string | null,
  answers: Record<string, unknown>,
  generatedAt: string,
  laws?: Readonly<Record<string, UsLawRow>>,
): UsSpineResult {
  return buildUsSpine({
    states: states as readonly UsStateRow[],
    edition,
    answers,
    generatedAt,
    laws,
    fmt: (key) => formatUsAnswer(key, answers[key]).trim(),
    token: (key) => answerToken(answers[key]),
    codes: (key) => usAnswerCodes(key, answers[key]),
    label: (key, code) => US_OPTION_LABELS[key]?.[code] ?? code,
    esc: escapeHtml,
    lawName: (s) => resolveLawLabel(s as StateRow),
    lawCite: (s) => resolveLawCite(s as StateRow),
  });
}

interface FormalDocumentArgs {
  htmlTitle: string;
  metaHtml: string;
  answers: Record<string, unknown>;
  spine: UsSpineResult;
  showFooter: boolean;
}

/** The formal-instrument document: numbered sections, appendices unnumbered. */
function formalDocument({ htmlTitle, metaHtml, answers, spine, showFooter }: FormalDocumentArgs): string {
  let n = 0;
  const sectionsHtml = spine.sections.map((s) => {
    const isAppendix = /^Appendix\b/.test(s.title);
    const heading = isAppendix ? escapeHtml(s.title) : `${++n}. ${escapeHtml(s.title)}`;
    return `<h2${s.id ? ` id="${s.id}"` : ""}>${heading}</h2>\n${s.html}`;
  }).join("\n\n");
  const body = [spine.intro, spine.glance, sectionsHtml].join("\n\n");
  const fills = countFills(body);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(htmlTitle)}</title>
<style>${FI_CSS}</style>
</head>
<body>
  <h1>${escapeHtml(spine.title)}</h1>
  <div class="fi-meta">${metaHtml}</div>
  ${usDraftBannerHtml(missingRequiredUsFields(answers))}
  ${completionBannerHtml(fills)}
${body}
  ${showFooter ? `<footer class="fi-footer">${REPORT_DISCLAIMER}</footer>` : ""}
</body>
</html>`;
}

/** A STATE EDITION of the U.S. Privacy Notice for one selected state. */
export function buildNoticeHtml(
  state: StateRow,
  answers: Record<string, unknown>,
  generatedAt: string,
  showFooter = true,
  laws?: Readonly<Record<string, UsLawRow>>,
): string {
  const spine = buildUsSpineFor([state], state.state_code, answers, generatedAt, laws);
  const businessName = answerString(answers["business_name"]).trim();
  const cite = resolveLawCite(state);
  return formalDocument({
    htmlTitle: `${state.state_name} Privacy Notice${businessName ? ` — ${businessName}` : ""}`,
    metaHtml: `${escapeHtml(spine.subtitle)}<br>${escapeHtml(resolveLawLabel(state))}${cite ? ` &middot; ${escapeHtml(cite)}` : ""}<br>Last updated: ${escapeHtml(generatedAt)}`,
    answers,
    spine,
    showFooter,
  });
}

/** The NATIONAL U.S. Privacy Notice covering every selected state. */
export function buildNationalNoticeHtml(
  states: readonly StateRow[],
  answers: Record<string, unknown>,
  generatedAt: string,
  laws?: Readonly<Record<string, UsLawRow>>,
  showFooter = true,
): string {
  const spine = buildUsSpineFor(states, null, answers, generatedAt, laws);
  const businessName = answerString(answers["business_name"]).trim();
  return formalDocument({
    htmlTitle: `U.S. Privacy Notice${businessName ? ` — ${businessName}` : ""}`,
    metaHtml: `${escapeHtml(spine.subtitle)}<br>Last updated: ${escapeHtml(generatedAt)}`,
    answers,
    spine,
    showFooter,
  });
}
