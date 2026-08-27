// supabase/functions/generate-us-notice/_local/render.ts
//
// S-N5 (doc 80, 2026-08-27) — the PURE render layer, extracted from
// index.ts so tests can import it without index's Deno.serve listener
// (two generator index modules imported into one test process collide on
// the default port). Content moved verbatim; no behavior change.

import { REPORT_DISCLAIMER } from "../../_shared/report-disclaimer.ts";

export const LOGO_URL = `${Deno.env.get("SITE_URL") || "https://enduserprivacy.com"}/logo.png`;

export interface StateRow {
  state_code: string;
  state_name: string;
  framework_type: string;
}

export const FRAMEWORK_LABELS: Record<string, string> = {
  ccpa: "California Consumer Privacy Act (CCPA/CPRA)",
  virginia_model: "Virginia-model state privacy law",
  maryland: "Maryland Online Data Privacy Act (MODPA)",
  florida: "Florida Digital Bill of Rights (FDBR)",
  pending: "Pending state privacy law",
};

export const STATE_LAW_NAMES: Record<string, { name: string; cite: string }> = {
  CA: { name: "California Consumer Privacy Act / California Privacy Rights Act (CCPA/CPRA)", cite: "Cal. Civ. Code §1798.100 et seq." },
  VA: { name: "Virginia Consumer Data Protection Act (VCDPA)", cite: "Va. Code Ann. §59.1-571 et seq." },
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
  return `<div style="background:#7c1a1a;color:#fff;padding:12px 20px;font-size:13px;
  font-weight:600;border-radius:6px;margin-bottom:24px;letter-spacing:0.02em;
  border-left:6px solid #f87171;">
  &#9888; REQUIRED FIELDS MISSING — DO NOT PUBLISH this notice until the following ${missing.length === 1 ? "is" : "are"} completed: ${escapeHtml(missing.join(", "))}.
</div>`;
}


// S-N4 (doc 80, 2026-08-27) — the "Key points" first layer. Captures the
// value of the ICO/WP260 layered-notice structure in the one-document form:
// a deterministic summary block atop the notice, every line derived from
// the SAME answers as the body (single writer — no re-stated free text)
// and anchor-linked to the full section it summarises (the § 7012
// jump-to-the-specific-disclosure principle applied in-document).
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
  return `<section style="background:#edf2f5;border:1px solid #dde5ea;border-radius:0.5rem;padding:0.9rem 1.25rem;margin:1.25rem 0;">
  <p style="margin:0 0 0.4rem 0;font-weight:600;">Key points</p>
  <ul style="margin:0;padding-left:1.25rem;">${items.join("\n  ")}</ul>
  <p style="margin:0.5rem 0 0 0;font-size:0.8rem;color:#5c6d7a;">This summary is for orientation only; the numbered sections below are the notice.</p>
</section>`;
}

export function buildNoticeHtml(
  state: StateRow,
  answers: Record<string, unknown>,
  generatedAt: string,
  showFooter = true,
): string {
  const businessName = answerString(answers["business_name"]) || "[Business name]";
  const businessDesc = answerString(answers["business_description"]) || "";
  const contactEmail = answerString(answers["contact_email"]) || "[contact email]";
  const dataCategories = answerString(answers["data_categories"]) || "—";
  const purposes = answerString(answers["collection_purposes"]) || "—";
  const sharing = answerString(answers["third_party_sharing"]);
  const thirdParties = answerString(answers["third_party_categories"]) || "—";
  const sale = answerString(answers["sale_or_sharing"]);
  // S-N3 (doc 80, 2026-08-27) — 11 CCR § 7012(e)(4): disclose the retention
  // PERIOD or, where a period is not possible, the CRITERIA used to
  // determine it. The old `|| "Not specified"` fallback shipped a notice
  // that satisfies neither limb; now the criteria answer fills in when no
  // period is stated, and a wholly-unanswered record renders a visible
  // missing-input warning (California names the regulation) rather than a
  // silent "Not specified".
  const retentionPeriod = answerString(answers["retention_general"]).trim();
  const retentionCriteria = answerString(answers["retention_criteria"]).trim();
  const retentionHtml = retentionPeriod
    ? `<p>${escapeHtml(retentionPeriod)}</p>`
    : retentionCriteria
    ? `<p>We are not able to state a single fixed retention period for every category of personal information. The criteria we use to determine how long each category is retained: ${escapeHtml(retentionCriteria)}</p>`
    : state.framework_type === "ccpa"
    ? `<p style="background:#fdf3e7;border:1px solid #d97706;padding:0.75rem;border-radius:0.375rem;"><strong>&#9888; Retention disclosure missing.</strong> California regulation 11 CCR &sect; 7012(e)(4) requires this notice to state the length of time each category of personal information is retained or, if that is not possible, the criteria used to determine the period. Supply the retention period or the criteria before publishing this notice.</p>`
    : `<p>The retention period has not been stated in the record. Stating the period for each category of personal information, or the criteria used to determine it, is recommended before publishing this notice.</p>`;

  // INTAKE-1: controller-supplied appeals mechanism (Va. Code § 59.1-577(C)
  // and state analogues). Absent on legacy records -> empty string, so the
  // rendered notice is byte-identical to its previous output.
  const appealsMethod = answerString(answers["vam_appeals_method"]).trim();
  const appealsMethodHtml = appealsMethod
    ? `\n  <p>How to submit an appeal, and how we inform you of the outcome: ${escapeHtml(appealsMethod)} If your appeal is denied, you may contact the ${escapeHtml(state.state_name)} Attorney General to submit a complaint.</p>`
    : "";


  const showOptOut =
    sale === "sell_and_share" || sale === "sell_only" || sale === "share_only";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(state.state_name)} Privacy Notice — ${escapeHtml(businessName)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; line-height: 1.55; }
  .eup-bar { background:#0c2a44; padding:9px 1.5rem; display:flex; align-items:center;
    gap:12px; margin:-2rem -1.5rem 2rem -1.5rem; }
  .eup-bar img { height:22px; width:auto; display:block; }
  .eup-bar span { font-size:9px; font-weight:600; text-transform:uppercase;
    letter-spacing:0.12em; color:#93b5c6; }
  h1, h2 { color:#0c2a44; }
  h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.15rem; margin-top: 2rem; border-bottom: 2px solid #2d9b90; padding-bottom: 0.25rem; }
  a { color:#2d9b90; }
  .meta { color: #5c6d7a; font-size: 0.85rem; margin-bottom: 2rem; }
  .badge { display: inline-block; background: #edf2f5; padding: 0.15rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; }
  .opt-out { background:#e5f4f2; border:1px solid #2d9b90; padding:1rem; border-radius:0.375rem; margin:1rem 0; }
  footer { color:#5c6d7a; font-size: 0.75rem; margin-top: 3rem; border-top: 2px solid #2d9b90; padding-top: 1rem; }
  /* Print / PDF pagination fixes */
  h2 { break-after: avoid; page-break-after: avoid; }
  h2 + * { break-before: avoid; page-break-before: avoid; }
  p { orphans: 3; widows: 3; }
  .opt-out { break-inside: avoid; page-break-inside: avoid; }
  ul { break-inside: avoid; page-break-inside: avoid; }
  @media print {
    h2 { break-after: avoid; page-break-after: avoid; }
    h2 + * { break-before: avoid; page-break-before: avoid; }
    p { orphans: 3; widows: 3; }
    .opt-out { break-inside: avoid; page-break-inside: avoid; }
    ul { break-inside: avoid; page-break-inside: avoid; }
  }
</style>
</head>
<body>
  <div class="eup-bar">
    <img src="${LOGO_URL}" alt="End User Privacy" />
    <span>Privacy Intelligence</span>
  </div>
  <h1>${escapeHtml(state.state_name)} Privacy Notice</h1>
  <div class="meta">
    <span class="badge">${escapeHtml(resolveLawLabel(state))}${resolveLawCite(state) ? ` · ${escapeHtml(resolveLawCite(state))}` : ""}</span>
    &nbsp;·&nbsp; Last updated: ${escapeHtml(generatedAt)}
  </div>
  ${usDraftBannerHtml(missingRequiredUsFields(answers))}
  <p>This notice explains how <strong>${escapeHtml(businessName)}</strong> collects, uses, and shares the personal information of ${escapeHtml(state.state_name)} residents, and the rights they have under the ${escapeHtml(resolveLawLabel(state))}.</p>
  ${businessDesc ? `<p>${escapeHtml(businessDesc)}</p>` : ""}
  ${buildKeyPointsHtml(answers)}

  <h2 id="sec-collect">1. Information we collect</h2>
  <p>${escapeHtml(dataCategories)}</p>

  <h2 id="sec-use">2. How we use this information</h2>
  <p>${escapeHtml(purposes)}</p>

  ${state.framework_type === "ccpa" ? `<h2>2a. Where we get this information</h2>
  <p>We collect personal information from the following categories of sources:</p>
  <ul>
    <li><strong>Directly from you</strong> — when you create an account, make a purchase, contact us, or otherwise provide information to us.</li>
    <li><strong>Automatically</strong> — when you use our website, app, or services, through cookies, log files, and similar technologies.</li>
    <li><strong>From third parties</strong> — such as service providers, business partners, data analytics providers, and publicly available sources, to the extent applicable to our operations.</li>
  </ul>` : ""}

  <h2 id="sec-share">3. Sharing with third parties</h2>
  ${
    sharing === "yes"
      ? `<p>We share personal information with the following categories of recipients: ${escapeHtml(thirdParties.replace(/[.\s]+$/, ""))}.</p>`
      : `<p>We do not share personal information with third parties for their own use, except as described below. We may disclose personal information to: service providers and contractors that assist with our business operations (such as hosting, payment processing, and customer support); professional advisers including lawyers and accountants; and government or regulatory authorities when required by applicable law.</p>`
  }

  ${state.framework_type === "ccpa" ? `
  <h2>3a. Categories of recipients</h2>
  <p>In the preceding 12 months, we have disclosed personal information to the following categories of third parties:</p>
  <ul>
    <li><strong>Service providers and contractors</strong> — companies that provide services on our behalf, such as cloud hosting, analytics, payment processing, customer support, and marketing platforms, under contractual restrictions preventing them from using your personal information for their own purposes.</li>
    <li><strong>Professional advisers</strong> — lawyers, accountants, auditors, and insurers in connection with legal, financial, or regulatory obligations.</li>
    <li><strong>Government and regulatory authorities</strong> — when required by applicable law, court order, or regulatory obligation.</li>
    ${sharing === "yes" ? `<li><strong>Third-party partners</strong> — ${escapeHtml(thirdParties.replace(/[.\s]+$/, ""))}.</li>` : ""}
  </ul>

  <h2>3b. Sale and sharing — prior 12 months</h2>
  ${showOptOut
    ? `<p>In the preceding 12 months, we have sold or shared the following categories of personal information for cross-context behavioral advertising: ${escapeHtml(dataCategories)}. You have the right to opt out — see Section 5 and the "Do Not Sell or Share My Personal Information" link on our website.</p>`
    : `<p>We have <strong>not</strong> sold personal information, and we have <strong>not</strong> shared personal information for cross-context behavioral advertising, in the preceding 12 months.</p>`
  }

  <h2>3c. Business-purpose disclosures — prior 12 months</h2>
  <p>In the preceding 12 months, we have disclosed personal information to service providers and contractors for the following business purposes: operating and maintaining our services; detecting and preventing fraud and security incidents; performing analytics to improve our products; fulfilling your requests and supporting our customer relationships; and complying with legal obligations. The categories of personal information disclosed for these purposes include: identifiers, commercial information, internet or network activity, and other information you provide when using our services.</p>
  ` : ""}

  ${
    showOptOut
      ? `<div class="opt-out">
          <strong>Your right to opt out of sale or sharing.</strong>
          <p>You have the right to opt out of the sale of your personal information and of its use for cross-context behavioral advertising. To exercise this right, contact us at <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a> or use the "Do Not Sell or Share My Personal Information" link on our website.</p>
        </div>`
      : ""
  }

  <h2 id="sec-retain">4. How long we keep your information</h2>
  ${retentionHtml}

  <h2 id="sec-rights">5. Your rights</h2>
  ${state.framework_type === "ccpa"
    ? `<p>As a California resident under the CCPA/CPRA, you have the right to: (a) know what personal information we collect, use, disclose, and sell; (b) request access to or a copy of that information; (c) request correction or deletion; (d) opt out of the sale or sharing of your personal information${!showOptOut ? " (we do not currently sell or share your personal information for cross-context behavioral advertising, but this right remains available to you)" : ""}; (e) limit the use of sensitive personal information; and (f) non-discrimination for exercising these rights. You may designate an authorized agent to exercise these rights on your behalf. To exercise any right, you may: (i) email us at <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>; or (ii) submit a request through our privacy request form at our website. We will acknowledge your request within 10 business days and respond within 45 days, or notify you if an extension is needed. You may designate an authorized agent to submit requests on your behalf — we may require written proof of authorization.</p>`
    : `<p>As a ${escapeHtml(state.state_name)} resident under the ${escapeHtml(resolveLawLabel(state))}, you have the right to: (a) know what personal information we collect about you; (b) request access to or a copy of that information; (c) request correction or deletion; (d) obtain a copy of your personal data in a portable and, to the extent technically feasible, readily usable format that allows you to transmit it to another controller without hindrance; (e) opt out of the processing of your personal data for purposes of targeted advertising, the sale of personal data, or profiling in furtherance of decisions that produce legal or similarly significant effects; and (f) appeal our refusal to act on a request — if we decline your request, we will explain how to appeal, and if your appeal is denied you may contact the ${escapeHtml(state.state_name)} Attorney General. You may also designate an authorized agent to exercise these rights on your behalf.</p>${state.state_code === "CO" ? `<p>We honor opt-out preference signals such as Global Privacy Control as a valid request to opt out of targeted advertising and sale.</p>` : ""}

  <h2>5a. How to submit a rights request</h2>
  <p>To exercise any of the rights listed above, contact us by email at <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a> or through the privacy request form on our website. Please include your name, state of residence, the right you wish to exercise, and enough information to verify your identity. We will respond within <strong>45 days</strong> of receiving a verifiable request. If we need additional time, we will notify you within the initial 45-day period and may extend the response period by an additional 45 days.</p>

  <h2>5b. Appeal process</h2>
  <p>If we decline your request, we will provide you with a written explanation of our reasons. You may appeal our decision by emailing us at <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a> with the subject line "Privacy Rights Appeal." We will respond to your appeal within <strong>60 days</strong>. If we deny your appeal, you have the right to contact your state Attorney General:
  ${state.state_code === "VA" ? `<ul><li><strong>Virginia Attorney General:</strong> <a href="https://www.oag.state.va.us">oag.state.va.us</a> · (804) 786-2071</li></ul>` : ""}
  ${state.state_code === "TX" ? `<ul><li><strong>Texas Attorney General:</strong> <a href="https://www.texasattorneygeneral.gov">texasattorneygeneral.gov</a> · (800) 252-8011</li></ul>` : ""}
  ${state.state_code === "CO" ? `<ul><li><strong>Colorado Attorney General:</strong> <a href="https://coag.gov">coag.gov</a> · (720) 508-6000</li></ul>` : ""}
  ${state.state_code === "CT" ? `<ul><li><strong>Connecticut Attorney General:</strong> <a href="https://portal.ct.gov/ag">portal.ct.gov/ag</a> · (860) 808-5318</li></ul>` : ""}
  ${state.state_code === "OR" ? `<ul><li><strong>Oregon Attorney General:</strong> <a href="https://www.doj.state.or.us">doj.state.or.us</a> · (503) 378-4400</li></ul>` : ""}
  ${state.state_code === "MT" ? `<ul><li><strong>Montana Attorney General:</strong> <a href="https://doj.mt.gov">doj.mt.gov</a> · (406) 444-2026</li></ul>` : ""}
  ${!["VA","TX","CO","CT","OR","MT"].includes(state.state_code) ? `<ul><li>Contact your state Attorney General for more information about your rights and how to file a complaint.</li></ul>` : ""}
  </p>${appealsMethodHtml}`

  }

  <h2 id="sec-contact">6. How to contact us</h2>
  <p>To exercise any of these rights or for questions about this notice, contact us at <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>.</p>

  ${showFooter ? `<footer>Generated by <strong>EndUserPrivacy</strong> · enduserprivacy.com ·
${REPORT_DISCLAIMER}</footer>` : ""}
</body>
</html>`;
}
