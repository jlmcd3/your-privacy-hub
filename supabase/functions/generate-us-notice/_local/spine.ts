// supabase/functions/generate-us-notice/_local/spine.ts
//
// DOC 181 (2026-09-04) — THE U.S. PRIVACY NOTICE SPINE. Ports the CEO-ratified
// spine ("Canonical_Fully_Written_US_Privacy_Notice_Template_2026-09-04.md")
// onto the existing intake WITHOUT adding a single intake field: every fact
// the spine needs that the intake collects renders from the answer; every
// fact it does not collect renders as an italic bracketed customer-completion
// prompt (formal-instrument.ts `fill`).
//
// One notice, layered (the spine's Appendix C): Privacy at a glance → national
// core → California Privacy Disclosures (when California is in the edition) →
// State-Specific Privacy Addendum (the states in the edition) → companion
// California notices as lettered appendices. Every document the generator
// writes is this spine: the per-state rows are STATE EDITIONS (the addendum
// limited to that state, the California layer only for California), and the
// combined row is the national notice for every selected state.
//
// Legal positions carried here, each backed by a corpus-verified manifest
// entry in _shared/legal-text-assertions.ts (cppa_authorities holds the CCPA
// statute and regulations; it holds NO other state's statute, so the state
// addendum stays at the law-name + citation level the product already used):
//   - The Right to Limit renders only where sensitive personal information is
//     collected (11 CCR § 7027); the pre-doc181 template asserted it for every
//     California notice unconditionally.
//   - Sale, CCPA "sharing" and other-state "targeted advertising" are distinct
//     legal states derived from the one sale_or_sharing answer plus the
//     Virginia-model opt-out answer; an unknown state is a prompt, never a
//     claim.
//   - The California 12-month disclosures, Notice at Collection, opt-out and
//     limit notices, financial-incentive and ADMT pre-use notices follow
//     11 CCR §§ 7011–7016, 7025, 7027, 7060–7063, 7070–7072.

import { fill, runIn } from "../../_shared/prose/formal-instrument.ts";

export interface UsStateRow {
  state_code: string;
  state_name: string;
  framework_type: string;
}

/** A row of us_state_privacy_laws the handler passes through (optional; the
 *  render is a pure function and works without it). Only the enforcement
 *  contact, law name and effective date are read — the table's rights flags
 *  contradict the intake's own statutory notes and are not relied on. */
export interface UsLawRow {
  state_code: string;
  law_name?: string | null;
  effective_date?: string | null;
  enforcement_body?: string | null;
  enforcement_url?: string | null;
}

export interface UsSpineCtx {
  /** The states in THIS edition (one for a state edition; all for the national notice). */
  readonly states: readonly UsStateRow[];
  /** The edition's state code, or null for the national notice. */
  readonly edition: string | null;
  readonly answers: Record<string, unknown>;
  readonly generatedAt: string;
  readonly laws?: Readonly<Record<string, UsLawRow>>;
  readonly fmt: (key: string) => string;
  readonly token: (key: string) => string;
  readonly codes: (key: string) => string[];
  readonly label: (key: string, code: string) => string;
  readonly esc: (s: unknown) => string;
  /** Law name + citation resolvers (render.ts STATE_LAW_NAMES). */
  readonly lawName: (state: UsStateRow) => string;
  readonly lawCite: (state: UsStateRow) => string;
}

export interface UsSpineSection {
  title: string;
  html: string;
  /** Anchor id kept for the S-N4 Key points contract (#sec-collect etc.). */
  id?: string;
}

export interface UsSpineResult {
  title: string;
  subtitle: string;
  intro: string;
  glance: string;
  sections: UsSpineSection[];
}

/** CEO ruling 2026-09-04: these four 2026 enactments stay out of every
 *  rendered state list until a legal check confirms them. The registry does
 *  not carry them today; the guard is here so a later activation cannot
 *  silently render them. */
export const UNVERIFIED_STATE_CODES: ReadonlySet<string> = new Set(["AL", "LA", "OK", "VT"]);

const SENSITIVE_CODES = new Set([
  "health_medical", "biometric", "race_ethnicity", "religion", "sexual_orientation",
  "citizenship", "mental_health", "geolocation", "financial",
]);

const p = (html: string) => `<p>${html}</p>`;
const ul = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

function humanDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function buildUsSpine(ctx: UsSpineCtx): UsSpineResult {
  const { esc, fmt, token, codes, label, generatedAt } = ctx;
  const states = ctx.states.filter((s) => !UNVERIFIED_STATE_CODES.has(s.state_code));
  const unverified = ctx.states.filter((s) => UNVERIFIED_STATE_CODES.has(s.state_code));
  const hasCA = states.some((s) => s.state_code === "CA");
  const nonCA = states.filter((s) => s.state_code !== "CA");
  const has = (code: string) => states.some((s) => s.state_code === code);
  const mailto = (email: string) => `<a href="mailto:${esc(email)}">${esc(email)}</a>`;

  // ── Answers ─────────────────────────────────────────────────────────────
  const businessText = fmt("business_name");
  const business = businessText ? esc(businessText) : fill("insert the legal name of the business");
  /** Sentence-ending period after the business name, unless the name already ends in one ("Inc."). */
  const bizDot = businessText && /[.!?]$/.test(businessText) ? "" : ".";
  const businessDesc = fmt("business_description");
  const emailText = fmt("contact_email");
  const email = emailText ? mailto(emailText) : fill("insert the email address for privacy questions and rights requests");
  const categoryCodes = codes("data_categories");
  const categories = fmt("data_categories");
  const purposeCodes = codes("collection_purposes");
  const purposes = fmt("collection_purposes");
  const sharingYes = token("third_party_sharing") === "yes";
  const thirdParties = fmt("third_party_categories");
  const thirdPartyCodes = codes("third_party_categories");
  const sources = fmt("data_sources").trim();
  const retentionPeriod = fmt("retention_general").trim();
  const retentionCriteria = fmt("retention_criteria").trim();

  const saleTok = token("sale_or_sharing");
  const saleKnown = ["sell_and_share", "sell_only", "share_only", "no", "neither"].includes(saleTok);
  const sells = saleTok === "sell_and_share" || saleTok === "sell_only";
  const shares = saleTok === "sell_and_share" || saleTok === "share_only";
  const taTok = token("vam_targeted_advertising_optout");
  const targeted = taTok ? taTok !== "not_applicable" : shares;
  const targetedKnown = !!taTok || saleKnown;
  const optOutApplies = sells || shares || targeted;
  const optOutUnknown = !saleKnown && !taTok;

  const spiTok = token("ccpa_sensitive_data");
  const sensitiveCodesPresent = categoryCodes.filter((c) => SENSITIVE_CODES.has(c));
  const sensitivePresent = spiTok === "yes" || sensitiveCodesPresent.length > 0 || token("vam_sensitive_data_consent") === "yes_consent" || token("vam_sensitive_data_consent") === "no_consent";
  const childrenPresent = categoryCodes.includes("children") || token("ccpa_minors") === "yes" || token("fl_children_known") === "yes" || token("fl_known_children") === "yes" || token("md_minor_targeted_ads") === "yes";
  const profilingTok = token("vam_profiling");
  const profilingYes = profilingTok === "yes" || token("fl_profiling_opt_out") === "yes";
  const profilingUnsure = profilingTok === "unsure";
  const admtTok = token("ccpa_admt");
  const incentiveTok = token("ccpa_financial_incentive");
  const roleTok = token("vam_controller_processor_role");
  const appealsMethod = fmt("vam_appeals_method").trim();
  const healthData = token("ct_consumer_health_data") === "yes" || token("md_consumer_health_data") === "yes";

  // ── Title / intro ───────────────────────────────────────────────────────
  const editionState = ctx.edition ? states.find((s) => s.state_code === ctx.edition) ?? ctx.states.find((s) => s.state_code === ctx.edition) : null;
  const title = businessText ? `${businessText} — U.S. Privacy Notice` : "U.S. Privacy Notice";
  const subtitle = editionState
    ? `Edition for residents of ${editionState.state_name}`
    : `Covering residents of ${states.map((s) => s.state_name).join(", ")}`;
  const scopeFill = fill("insert the websites, applications, products, services or other activities this Notice covers");
  const groupsFill = fill("insert the groups of individuals this Notice covers, for example customers, website visitors or app users");
  const intro = [
    p(`This U.S. Privacy Notice explains how <strong>${business}</strong> (“we”, “us” or “our”) collects, uses, discloses, retains and otherwise processes personal information in connection with ${scopeFill}.`),
    p(`This Notice applies to ${groupsFill} in the United States to the extent the processing described here is subject to applicable U.S. state privacy law. Where a separate notice applies to a particular population or processing activity — such as an employee or applicant notice, a consumer health data notice, a children's notice, a financial incentive notice or a service-specific notice — that more specific notice supplements this Notice.`),
    hasCA ? p(`California residents should also review the <strong>California Privacy Disclosures</strong> below.`) : "",
  ].filter(Boolean).join("\n");

  // ── Privacy at a glance (S-N4 anchors preserved) ────────────────────────
  const rows: string[] = [];
  rows.push(runIn("Who we are", `${business}${bizDot} Privacy contact: ${email}.`));
  rows.push(`<p><span class="fi-run"><a href="#sec-collect">What personal information we collect:</a></span> ${categories ? esc(categories) : fill("insert the categories of personal information collected")}</p>`);
  rows.push(`<p><span class="fi-run"><a href="#sec-use">Why we collect and use it:</a></span> ${purposes ? esc(purposes) : fill("insert the purposes of collection and use")}</p>`);
  rows.push(runIn("Where it comes from", sources ? esc(sources) : fill("insert the categories of sources of personal information")));
  rows.push(`<p><span class="fi-run"><a href="#sec-share">Who receives it:</a></span> ${sharingYes && thirdParties ? esc(thirdParties) : "service providers and contractors working for us; no third parties for their own purposes except as the disclosure section describes"}</p>`);
  rows.push(`<p><span class="fi-run"><a href="#sec-rights">Sale, sharing and targeted advertising:</a></span> ${
    optOutUnknown
      ? fill("state whether personal information is sold, shared for cross-context behavioral advertising, or processed for targeted advertising")
      : optOutApplies
      ? `we ${[sells ? "sell personal information" : "", shares ? "share personal information for cross-context behavioral advertising" : "", targeted && !shares ? "process personal information for targeted advertising" : ""].filter(Boolean).join(", ")} as described below; you can opt out`
      : `we do not sell or share personal information for cross-context behavioral advertising, and we do not process it for targeted advertising`
  }</p>`);
  if (sensitivePresent) rows.push(runIn("Sensitive personal information", `we process one or more categories of sensitive personal information or sensitive data; additional protections and choices may apply depending on your state`));
  rows.push(`<p><span class="fi-run"><a href="#sec-retain">How long we keep it:</a></span> ${retentionPeriod ? esc(retentionPeriod) : retentionCriteria ? "determined by the criteria stated in the retention section" : fill("insert the retention period or the criteria used to determine it")}</p>`);
  rows.push(`<p><span class="fi-run"><a href="#sec-contact">Your rights:</a></span> know, access, correct, delete, and opt out where applicable — contact ${email}</p>`);
  const glance = `<section class="fi-glance"><p><span class="fi-run">Privacy at a glance.</span> Key points of this Notice, for orientation only; the numbered sections below are the notice.</p>\n${rows.join("\n")}</section>`;

  const sections: UsSpineSection[] = [];

  // 1 ──────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    parts.push(p(`The business responsible for this Notice is <strong>${business}</strong>${bizDot}${businessDesc ? ` ${esc(businessDesc.replace(/[.\s]+$/, ""))}.` : ""} Privacy contact: ${email}.`));
    // The role answer renders as reader prose, never as its intake option label.
    if (roleTok === "controller") {
      parts.push(p(`For the processing described in this Notice we act as the controller${hasCA ? " — or, under the CCPA, the business —" : ""} that determines the purposes and means of the processing.`));
    } else if (roleTok === "processor") {
      parts.push(p(`For the processing described in this Notice we act as a processor or service provider on behalf of other organisations. Where we act solely in that capacity, the organisation we act for may be responsible for providing the applicable consumer-facing privacy notice and responding to privacy rights requests concerning that processing. ${fill("identify the processing performed solely on behalf of another organisation")}.`));
    } else if (roleTok === "both") {
      parts.push(p(`We act as the controller or business for some of the processing described in this Notice and as a processor or service provider on behalf of other organisations for the rest. Where we act solely as a processor or service provider, the organisation we act for may be responsible for providing the applicable consumer-facing privacy notice and responding to privacy rights requests concerning that processing. ${fill("identify which processing is performed as a business or controller and which solely on behalf of another organisation")}.`));
    } else if (roleTok === "unsure") {
      parts.push(p(`${fill("confirm whether the business acts as a controller or business, a processor or service provider, or both, for the processing covered by this Notice")}.`));
    }
    sections.push({ title: "About This Notice and Our Role", html: parts.join("\n") });
  }

  // 2 ──────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    parts.push(p(`We collect the following categories of personal information: ${categories ? `<strong>${esc(categories)}</strong>` : fill("insert the categories of personal information collected")}.`));
    if (categoryCodes.includes("other")) parts.push(p(`${fill("describe the other categories of personal information collected")}.`));
    parts.push(p(`The categories are described in reader-friendly terms${hasCA ? "; for California, each category is also mapped to the applicable statutory category in the California Privacy Disclosures below" : ""}. The fact that a category appears in this Notice does not mean that every item within that category is collected about every individual or used for every purpose.`));
    sections.push({ id: "sec-collect", title: "Categories of Personal Information We Collect", html: parts.join("\n") });
  }

  // 3 ──────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    parts.push(p(`We obtain personal information from the following categories of sources: ${sources ? `<strong>${esc(sources.replace(/[.\s]+$/, ""))}</strong>` : fill("insert the categories of sources, for example directly from you, automatically from your use of our website or app, service providers, business partners, advertising or analytics partners, or publicly available sources")}.`));
    if (hasCA) parts.push(p(`The California disclosures below use source categories with enough specificity to provide a meaningful understanding of where personal information is collected.`));
    sections.push({ title: "Sources of Personal Information", html: parts.join("\n") });
  }

  // 4 ──────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    parts.push(p(`We collect and use personal information for the following purposes: ${purposes ? `<strong>${esc(purposes)}</strong>` : fill("insert the purposes for which personal information is collected and used")}. We use personal information only for purposes reasonably related to our products, services, operations, legal obligations and other disclosed activities.`));
    if (purposeCodes.length > 0) {
      parts.push(p(`Each purpose is described separately below; a category is not used for every purpose merely because both appear in this Notice.`));
      for (const code of purposeCodes) {
        parts.push(`<div class="fi-block"><h3>${esc(label("collection_purposes", code))}</h3>${runIn("Personal information used, sources and recipients for this purpose", fill("state which categories of personal information are used for this purpose, where they come from and who receives them, where these differ from the general statements in this Notice"))}</div>`);
      }
    }
    sections.push({ id: "sec-use", title: "Why We Collect and Use Personal Information", html: parts.join("\n") });
  }

  // 5 ──────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    if (sharingYes) {
      parts.push(p(`We disclose personal information in connection with the purposes described in this Notice to the following categories of recipients: ${thirdParties ? `<strong>${esc(thirdParties.replace(/[.\s]+$/, ""))}</strong>` : fill("insert the categories of recipients")}.`));
    } else {
      parts.push(p(`We do not disclose personal information to third parties for their own purposes except as specifically described in this Notice.`));
    }
    parts.push(`<h3>Service providers and contractors</h3>`);
    parts.push(p(`We disclose personal information to service providers and contractors that process information on our behalf or provide services to us, under contracts that limit their use of personal information to providing those services.${hasCA ? " The categories of personal information disclosed to service providers or contractors and the purposes for those disclosures are described in the California Privacy Disclosures where California law applies." : ""}`));
    parts.push(`<h3>Third parties and independent controllers</h3>`);
    parts.push(p(`We disclose personal information to third parties or independent controllers only where described in this Notice, such as advertising partners, business partners, affiliates acting for their own purposes, or other organisations. Where personal information is sold, shared under California law, or processed for targeted advertising, those practices are described separately below.`));
    parts.push(`<h3>Government, legal and safety disclosures</h3>`);
    parts.push(p(`We disclose personal information where reasonably necessary to comply with law, legal process or lawful government requests; to protect rights or safety; to investigate fraud or security incidents; or to establish, exercise or defend legal claims, subject to applicable law.`));
    sections.push({ id: "sec-share", title: "How We Disclose Personal Information", html: parts.join("\n") });
  }

  // 6 ──────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    parts.push(p(`The terms “sale”, “sharing” and “targeted advertising” are defined differently under state privacy laws and are not interchangeable.`));
    parts.push(`<h3>Sale</h3>`);
    parts.push(p(optOutUnknown
      ? `${fill("state whether personal information is sold as that term is defined under the applicable state privacy laws and, if so, the categories sold, the categories of recipients and the purposes")}.`
      : sells
      ? `We sell certain personal information as that term is defined under one or more applicable state privacy laws. The categories involved: ${fill("insert the categories of personal information sold")}; the categories of recipients: ${fill("insert the categories of recipients")}; the purposes: ${fill("insert the purposes of the sale")}. You may opt out as described under Your Privacy Choices.`
      : `We do not sell personal information as the term is defined under the state privacy laws applicable to the processing described in this Notice.`));
    parts.push(`<h3>California sharing</h3>`);
    parts.push(p(optOutUnknown
      ? `${fill("state whether personal information is shared for cross-context behavioral advertising as “sharing” is defined under the CCPA")}.`
      : shares
      ? `We share certain personal information for cross-context behavioral advertising as “sharing” is defined under the CCPA. The categories shared: ${fill("insert the categories of personal information shared")}; the categories of third parties: ${fill("insert the categories of third parties")}; the purposes: ${fill("insert the purposes of the sharing")}. California residents may opt out as described under Your Privacy Choices.`
      : `We do not share personal information for cross-context behavioral advertising as “sharing” is defined under the CCPA.`));
    parts.push(`<h3>Targeted advertising</h3>`);
    parts.push(p(!targetedKnown
      ? `${fill("state whether personal data is processed for targeted advertising as that term is defined under the applicable state privacy laws")}.`
      : targeted
      ? `We process personal data for targeted advertising as that term is defined under one or more applicable state privacy laws. You may opt out as described under Your Privacy Choices.${
        taTok === "yes_link_and_uoom"
          ? " We provide an opt-out link and honour universal opt-out mechanisms such as Global Privacy Control."
          : taTok === "yes_link_only"
          ? ` We provide an opt-out link; we do not currently process universal opt-out signals. ${fill("where a selected state requires recognising universal opt-out mechanisms, describe how the signal will be honoured")}.`
          : taTok === "no"
          ? ` ${fill("insert the mechanism by which individuals can opt out of targeted advertising, which the applicable state laws require")}.`
          : ""
      }`
      : `We do not process personal data for targeted advertising as that term is defined under the applicable state privacy laws.`));
    sections.push({ title: "Sale, California Sharing and Targeted Advertising", html: parts.join("\n") });
  }

  // 7 (conditional) ────────────────────────────────────────────────────────
  if (optOutApplies || optOutUnknown) {
    const parts: string[] = [];
    parts.push(p(`You may submit an applicable sale, sharing or targeted-advertising opt-out request through: ${runInline("Privacy Choices", fill("insert the “Do Not Sell or Share My Personal Information” / “Your Privacy Choices” link or page"))}; or by contacting us at ${email}. ${fill("insert any other opt-out method offered")}.`));
    parts.push(p(`We do not require you to create an account solely to submit an opt-out request where applicable law prohibits that requirement. The precise effect of your choice depends on the state law that applies and on the processing involved.`));
    sections.push({ title: "Your Privacy Choices", html: parts.join("\n") });
  }

  // 8 (conditional) — signals matter only where an opt-out right exists
  // (sale, CCPA sharing or targeted advertising, or that state is unknown).
  // The Colorado UOOM answer renders once, in the State-Specific Addendum.
  if (optOutApplies || optOutUnknown) {
    const parts: string[] = [];
    parts.push(p(`Where required by applicable law, we process recognised browser- or device-based universal opt-out preference signals, such as Global Privacy Control, as valid requests to opt out of covered sale, sharing or targeted advertising.`));
    parts.push(runIn("Signals recognised", fill("insert the opt-out preference signals recognised, for example Global Privacy Control")));
    parts.push(runIn("How the signal applies", fill("state whether the signal applies to the browser, the device, a known account, and offline sales")));
    parts.push(runIn("Frictionless processing", fill("state whether the signal is processed without any additional step by the consumer")));
    sections.push({ title: "Universal Opt-Out Preference Signals", html: parts.join("\n") });
  }

  // 9 (conditional) ────────────────────────────────────────────────────────
  if (sensitivePresent || spiTok === "unsure" || hasCA) {
    const parts: string[] = [];
    if (hasCA) {
      parts.push(`<h3>California sensitive personal information</h3>`);
      if (spiTok === "yes" || (!spiTok && sensitiveCodesPresent.length > 0)) {
        parts.push(p(`We collect or use personal information that qualifies as sensitive personal information under California law${sensitiveCodesPresent.length ? `, including ${esc(sensitiveCodesPresent.map((c) => label("data_categories", c)).join(", "))}` : ""}. The purposes: ${fill("insert the purposes for which sensitive personal information is used or disclosed")}.`));
        parts.push(p(`A California Right to Limit exists only where sensitive personal information is used or disclosed for purposes other than those permitted by 11 CCR § 7027(m). ${fill("confirm whether sensitive personal information is used or disclosed for purposes outside those permitted by 11 CCR § 7027(m); if it is, insert the “Limit the Use of My Sensitive Personal Information” link, and if it is not, state that no Right to Limit is offered because the uses fall within the permitted purposes")}.`));
      } else if (spiTok === "no") {
        parts.push(p(`We do not collect or use personal information that qualifies as sensitive personal information under California law, and we therefore do not offer the California Right to Limit.`));
      } else {
        // Batch 4ed05f22 (2026-09-05): "unsure" AND an unanswered question both
        // land here. An unanswered question is never an affirmative denial — it
        // is a customer-completion prompt, the same as every other uncollected
        // fact in this instrument.
        parts.push(p(`${fill("confirm whether sensitive personal information as defined by the CCPA is collected or used and, if so, complete the sensitive-information disclosures and the Right to Limit determination")}.`));
      }
    }
    if (nonCA.length) {
      parts.push(`<h3>Sensitive data under other state privacy laws</h3>`);
      const consentTok = token("vam_sensitive_data_consent");
      parts.push(p(consentTok === "no_sensitive"
        ? `We do not process sensitive data as defined under the applicable state privacy laws.`
        : consentTok === "yes_consent"
        ? `Some state privacy laws require consent before processing sensitive data. Where those laws apply, we obtain opt-in consent before processing sensitive data. How we obtain and manage that consent: ${fill("describe how opt-in consent is obtained and how it can be withdrawn")}.`
        : consentTok === "no_consent"
        ? `${fill("the record states that sensitive data is processed without opt-in consent; state privacy laws that require consent are not satisfied by notice language — describe the consent mechanism that will be implemented, or remove the processing")}.`
        : `${fill("state whether sensitive data as defined under the applicable state privacy laws is processed and, where consent is required, how it is obtained")}.`));
      const stateBits: string[] = [];
      if (token("nj_financial_education_data") === "yes") stateBits.push(`New Jersey: financial, education or insurance data treated as sensitive data is processed.`);
      if (token("md_precise_geolocation") === "yes") stateBits.push(`Maryland: precise geolocation data is collected.`);
      if (token("fl_sensitive_geolocation") === "yes") stateBits.push(`Florida: precise geolocation data is collected.`);
      if (token("fl_biometric") === "yes") stateBits.push(`Florida: biometric data is collected.`);
      if (token("md_sensitive_data_sale") === "yes") stateBits.push(`Maryland: ${fill("the record states that sensitive personal data of Maryland residents is sold; Maryland prohibits that sale outright — state the practice that will apply to Maryland residents")}.`);
      if (stateBits.length) parts.push(ul(stateBits.map((s) => s)));
    }
    sections.push({ title: "Sensitive Personal Information and Sensitive Data", html: parts.join("\n") });
  }

  // 10 ─────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    if (retentionPeriod) {
      parts.push(p(`Our general retention description: <strong>${esc(retentionPeriod)}</strong>.`));
    } else if (retentionCriteria) {
      parts.push(p(`We are not able to state a single fixed retention period for every category of personal information. The criteria we use to determine how long each category is retained: <strong>${esc(retentionCriteria)}</strong>.`));
    } else if (hasCA) {
      parts.push(p(`<strong>Retention disclosure missing.</strong> California regulation 11 CCR &sect; 7012(e)(4) requires this notice to state the length of time each category of personal information is retained or, if that is not possible, the criteria used to determine the period. ${fill("insert the retention period for each category of personal information, or the criteria used to determine it")}.`));
    } else {
      parts.push(p(`The retention period has not been stated in the record. ${fill("insert the retention period for each category of personal information, or the criteria used to determine it")}.`));
    }
    parts.push(p(`We retain personal information only for as long as reasonably necessary and proportionate to the disclosed purposes, taking into account applicable legal, regulatory, security, fraud-prevention, accounting, tax, dispute-resolution and recordkeeping requirements.${hasCA ? " For California, the Notice at Collection identifies the retention period for each category or, where that is not possible, the criteria used to determine the period." : ""}`));
    sections.push({ id: "sec-retain", title: "Retention", html: parts.join("\n") });
  }

  // 11 ─────────────────────────────────────────────────────────────────────
  {
    const rights = [
      `<strong>Right to know, confirm or access</strong> — to confirm whether we process personal information about you and to obtain information about that processing or a copy of the personal information.`,
      `<strong>Right to correction</strong> — to ask us to correct inaccurate personal information.`,
      `<strong>Right to deletion</strong> — to ask us to delete personal information, subject to exceptions.`,
      `<strong>Right to data portability</strong> — to obtain a portable copy of certain personal information.`,
      `<strong>Right to opt out of sale</strong> — where applicable, to opt out of the sale of your personal information.`,
      `<strong>Right to opt out of targeted advertising</strong> — where applicable, to opt out of processing for targeted advertising.`,
      `<strong>Right to opt out of covered profiling</strong> — where applicable, to opt out of profiling in furtherance of decisions that produce legal or similarly significant effects.`,
      `<strong>Sensitive-data rights</strong> — depending on your state, to consent to, withdraw consent from, or limit certain sensitive-data processing.`,
      `<strong>Right to appeal</strong> — where required by applicable state law, to appeal our denial of a privacy rights request.`,
      `<strong>Non-discrimination and non-retaliation</strong> — we will not unlawfully discriminate or retaliate against you because you exercise a privacy right.`,
    ];
    sections.push({
      id: "sec-rights",
      title: "U.S. State Privacy Rights",
      html: [p(`Depending on where you live and the law that applies, you may have some or all of the following rights.`), ul(rights), p(`The exact rights available depend on your state and the processing involved; the State-Specific Privacy Addendum below identifies the law that applies to residents of each state covered by this Notice.`)].join("\n"),
    });
  }

  // 12 ─────────────────────────────────────────────────────────────────────
  sections.push({
    title: "How to Exercise Privacy Rights",
    html: [
      p(`To submit a privacy rights request, contact us by email at ${email}, or through ${fill("insert any online request form, toll-free telephone number or other request method offered — some state laws require at least two methods")}. Please describe the right you wish to exercise and provide the information reasonably necessary for us to process the request.`),
      p(`We will respond within the time required by the law that applies to you${hasCA ? " — for California requests, within 45 calendar days of receipt, extendable once where reasonably necessary with notice to you, and we confirm receipt of a request to know, delete or correct within 10 business days" : ""}. If we need additional time where the law permits, we will tell you why and how long we expect to take.`),
    ].join("\n"),
  });

  // 13 ─────────────────────────────────────────────────────────────────────
  sections.push({
    title: "Verification of Requests",
    html: [
      p(`To protect personal information from unauthorised access, correction or deletion, we may need to verify your identity before completing certain requests. Our general verification process: ${fill("describe how identity is verified, for example by matching information you provide against information we hold, or through an existing password-protected account")}.`),
      p(`We use information reasonably appropriate to the type and sensitivity of the personal information and the right requested, and we do not use verification to create unnecessary friction or to discourage the exercise of privacy rights. Opt-out requests that applicable law says must not be verified are processed in accordance with that law.`),
    ].join("\n"),
  });

  // 14 ─────────────────────────────────────────────────────────────────────
  sections.push({
    title: "Authorized Agents",
    html: [
      p(`Where applicable law permits, you may authorise another person or entity to submit a request on your behalf. An authorised agent may submit a request through ${fill("insert how an authorized agent submits a request, and the proof of authorisation required")}. We may require evidence that the agent is authorised to act for you and may ask you to verify your identity directly where permitted by law.`),
    ].join("\n"),
  });

  // 15 (conditional) ────────────────────────────────────────────────────────
  if (nonCA.length) {
    const parts: string[] = [];
    parts.push(p(`If we deny your privacy rights request and applicable state law provides a right to appeal, you may submit an appeal using ${appealsMethod ? `the following process. How to submit an appeal, and how we inform you of the outcome: ${esc(appealsMethod.replace(/[.\s]+$/, ""))}` : fill("insert how an appeal is submitted and how the individual is informed of the outcome")}. We will review the appeal and respond within the period required by the law that applies.`));
    // INTAKE-1 contract: the exact sentence "you may contact the {State}
    // Attorney General to submit a complaint." renders for every non-CA state.
    const agLine = (s: UsStateRow) => `you may contact the ${esc(s.state_name)} Attorney General to submit a complaint.${agContact(s) ? ` Contact: ${agContact(s)}.` : ""}`;
    parts.push(nonCA.length === 1
      ? p(`If your appeal is denied, ${agLine(nonCA[0])}`)
      : [p(`If your appeal is denied, you may contact your state Attorney General to submit a complaint:`), ul(nonCA.map((s) => `${esc(s.state_name)}: ${agLine(s)}`))].join("\n"));
    sections.push({ title: "Appeals of Denied Requests", html: parts.join("\n") });
  }

  // 16 (conditional) ────────────────────────────────────────────────────────
  if (childrenPresent) {
    const parts: string[] = [];
    parts.push(p(`The processing described in this Notice includes personal information relating to children or minors.`));
    if (hasCA) {
      parts.push(`<h3>California residents under 16</h3>`);
      parts.push(runIn("Actual knowledge of sale or sharing of personal information of children under 13", fill("state yes or no")));
      parts.push(runIn("Actual knowledge of sale or sharing of personal information of consumers aged 13 to 15", fill("state yes or no")));
      parts.push(p(`We do not sell or share the personal information of consumers under 16 without the affirmative authorisation required by California law — from a parent or guardian for a child under 13, and from the consumer for a consumer aged 13 to 15. Authorisation method: ${fill("describe the opt-in authorisation process, or state that no such sale or sharing occurs")}.`));
      if (token("ccpa_minors") === "yes") parts.push(p(`The record states that personal information of California residents aged 13 to 15 is knowingly collected or used.`));
    }
    if (token("md_minor_targeted_ads") === "yes") parts.push(p(`Maryland: ${fill("the record states that targeted advertising is served to consumers known to be aged 13 to 17; Maryland prohibits that processing — state the practice that will apply to Maryland minors")}.`));
    if (token("fl_children_known") === "yes" || token("fl_known_children") === "yes") parts.push(p(`Florida: personal information of known minors under 18 is processed; we do not sell that information or serve targeted advertising to known minors without the consent Florida law requires.`));
    parts.push(p(`COPPA requirements for children under 13 are addressed separately where applicable.`));
    sections.push({ title: "Children and Minors", html: parts.join("\n") });
  }

  // 17 (conditional) ────────────────────────────────────────────────────────
  if (profilingYes || profilingUnsure) {
    const parts: string[] = [];
    parts.push(p(profilingUnsure && !profilingYes
      ? `${fill("confirm whether profiling is used in furtherance of decisions that produce legal or similarly significant effects and, if so, complete this section")}.`
      : `We use profiling in furtherance of decisions that may produce legal or similarly significant effects. The processing involves: ${fill("describe the profiling and the decisions it informs")}. Where applicable state law provides an opt-out, you may submit that request through the methods described under Your Privacy Choices and How to Exercise Privacy Rights.`));
    sections.push({ title: "Profiling and Significant Decisions", html: parts.join("\n") });
  }

  // 18 (conditional) ────────────────────────────────────────────────────────
  if (hasCA && (admtTok === "yes" || admtTok === "unsure")) {
    sections.push({
      title: "California Automated Decisionmaking Technology",
      html: p(admtTok === "unsure"
        ? `${fill("confirm whether automated decisionmaking technology is used to make significant decisions about California consumers and, if so, complete the ADMT Pre-use Notice appendix")}.`
        : `We use automated decisionmaking technology (“ADMT”) subject to the California Privacy Protection Agency's ADMT regulations for significant decisions. California consumers may have rights to opt out of covered ADMT use and to access information about that use, subject to applicable exceptions and the regulations' compliance timing (pre-existing covered use must comply no later than January 1, 2027). The required pre-use disclosure is set out in the California ADMT Pre-use Notice appendix.`),
    });
  }

  // 19 (conditional) ────────────────────────────────────────────────────────
  if (hasCA) {
    sections.push({
      title: "Financial Incentives and Price or Service Differences",
      html: p(incentiveTok === "yes"
        ? `We offer a financial incentive or price or service difference involving personal information, such as a loyalty or rewards programme. Participation is voluntary and subject to the opt-in and withdrawal terms described in the California Notice of Financial Incentive appendix.`
        : incentiveTok === "no"
        ? `We do not offer a financial incentive or price or service difference that requires a California Notice of Financial Incentive.`
        : `${fill("state whether a loyalty programme, rewards programme or other financial incentive is offered in exchange for personal information")}.`),
    });
  }

  // 20 ─────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    parts.push(p(`This addendum supplements the national core of this Notice for residents of the states below, identifying the law that applies and any state-specific practice the business has recorded. Rights are described in general terms above; the exact rights available under each law are those the law provides.`));
    for (const s of states) {
      parts.push(`<h3>${esc(s.state_name)}</h3>`);
      const law = ctx.laws?.[s.state_code];
      const eff = humanDate(law?.effective_date);
      parts.push(runIn("Applicable law", `${esc(ctx.lawName(s))}${ctx.lawCite(s) ? ` (${esc(ctx.lawCite(s))})` : ""}${eff ? `, effective ${esc(eff)}` : ""}`));
      if (s.state_code === "CA") {
        parts.push(p(`California residents: see the California Privacy Disclosures below for the disclosures required by the CCPA and its regulations.`));
      } else {
        parts.push(p(`${esc(s.state_name)} residents may exercise the rights provided by the ${esc(ctx.lawName(s))} — including, where the law provides them, rights to access, correct, delete and obtain a portable copy of personal data, to opt out of sale, targeted advertising and certain profiling, and to appeal a denied request — using the request methods described above. Enforcement: ${agContact(s) || `the ${esc(s.state_name)} Attorney General`}.`));
      }
      const bits = stateSpecificBits(s.state_code);
      if (bits.length) parts.push(ul(bits));
    }
    for (const s of unverified) {
      parts.push(`<h3>${esc(s.state_name)}</h3>`);
      parts.push(p(`${fill(`the ${s.state_name} comprehensive privacy law is not yet included in this Notice pending legal verification of its enactment and citation; insert the applicable ${s.state_name} disclosures once confirmed`)}.`));
    }
    sections.push({ title: "State-Specific Privacy Addendum", html: parts.join("\n") });
  }

  // 21 ─────────────────────────────────────────────────────────────────────
  sections.push({
    title: "Security",
    html: [
      p(`We maintain reasonable administrative, technical and physical safeguards designed to protect personal information against unauthorised access, acquisition, destruction, use, modification or disclosure. Security practices vary based on the nature and sensitivity of the information and the systems involved.`),
      p(`This public Notice does not describe security configurations where disclosure could undermine those safeguards.`),
    ].join("\n"),
  });

  // 22 ─────────────────────────────────────────────────────────────────────
  sections.push({
    title: "Changes to This Notice",
    html: [
      p(`We may update this Notice when our practices, services or legal obligations change. When we do, we will update the date at the beginning of this Notice. Where applicable law requires notice before collecting a new category of personal information or using personal information for a materially different or incompatible purpose, we will provide the required notice before that processing begins.`),
      runIn("Last updated", esc(generatedAt)),
      runIn("Effective date", fill("insert the effective date of this Notice")),
    ].join("\n"),
  });

  // 23 ─────────────────────────────────────────────────────────────────────
  sections.push({
    id: "sec-contact",
    title: "Contact Us",
    html: [
      p(`If you have questions about this Notice or our privacy practices, contact:`),
      p(`<strong>${business}</strong><br>Email: ${email}<br>${fill("insert the business address, privacy telephone number and rights-request portal, where available")}`),
    ].join("\n"),
  });

  // ── California Privacy Disclosures + companion appendices ────────────────
  if (hasCA) {
    const parts: string[] = [];
    parts.push(p(`This section supplements the U.S. Privacy Notice for California residents and provides the information required by the California Consumer Privacy Act (“CCPA”) and its implementing regulations. It describes our practices both currently and, where specified, during the 12 months preceding the Last Updated date.`));
    parts.push(`<h3>CA-1. Personal information practices during the preceding 12 months</h3>`);
    const rowsHtml: string[] = [];
    const catRows = categoryCodes.length ? categoryCodes.map((c) => label("data_categories", c)) : (categories ? [categories] : []);
    for (const cat of catRows) {
      rowsHtml.push(`<tr><td>${esc(cat)}</td><td>${sources ? esc(sources.replace(/[.\s]+$/, "")) : fill("insert the categories of sources")}</td><td>${purposes ? esc(purposes.replace(/[.\s]+$/, "")) : fill("insert the business or commercial purposes")}</td><td>${optOutUnknown ? fill("state whether sold or shared") : (sells || shares) ? `Yes — ${[sells ? "sold" : "", shares ? "shared" : ""].filter(Boolean).join(" and ")}; ${fill("insert the categories of third parties and the purposes for this category, where they differ")}` : "No"}</td><td>${sharingYes && thirdPartyCodes.includes("service_providers") || !sharingYes ? "Yes — service providers and contractors" : fill("state whether disclosed to service providers or contractors for a business purpose")}</td><td>${retentionPeriod ? esc(retentionPeriod) : retentionCriteria ? esc(retentionCriteria) : fill("insert the retention period or criteria")}</td></tr>`);
    }
    if (!rowsHtml.length) rowsHtml.push(`<tr><td colspan="6">${fill("insert one row per California statutory category of personal information collected in the preceding 12 months: examples, sources, purposes, whether sold or shared and to whom, whether disclosed to service providers or contractors and for what purposes, and the retention period or criteria")}</td></tr>`);
    parts.push(`<table class="fi-table"><thead><tr><th>Category</th><th>Sources</th><th>Purposes</th><th>Sold or shared in the preceding 12 months</th><th>Disclosed for a business purpose</th><th>Retention</th></tr></thead><tbody>${rowsHtml.join("")}</tbody></table>`);
    // doc129 pin: the business-purpose disclosure grounds its purposes in the
    // intake (`escapeHtml(purposes…)`), never in an invented list.
    const escapeHtml = esc;
    const purposesTrimmed = purposes.replace(/[.\s]+$/, "");
    parts.push(p(`In the preceding 12 months, we have disclosed personal information to service providers and contractors for the business purposes described in this notice: ${escapeHtml(purposesTrimmed) || fill("insert the business purposes")}. ${fill("confirm that each category above maps to the California statutory category and adjust any row whose sources, purposes, sale/sharing status or retention differ from the general statements")}.`));
    parts.push(p(optOutUnknown ? `${fill("state whether any category of personal information was sold or shared in the preceding 12 months")}.` : (sells || shares) ? `In the preceding 12 months we have ${[sells ? "sold" : "", shares ? "shared" : ""].filter(Boolean).join(" and ")} personal information as described in the table above.` : `We have not sold or shared California consumers' personal information during the 12 months preceding the Last Updated date.`));

    parts.push(`<h3>CA-2. Sensitive personal information</h3>`);
    parts.push(p(spiTok === "yes" ? `The sensitive personal information we process, the purposes, and the Right to Limit determination are set out in the Sensitive Personal Information section above.` : spiTok === "no" ? `We do not use or disclose sensitive personal information for purposes that require a California consumer to exercise the Right to Limit.` : `${fill("confirm whether sensitive personal information is collected and complete the sensitive-information disclosures")}.`));

    parts.push(`<h3>CA-3. Sale, sharing and consumers under 16</h3>`);
    parts.push(p(`${optOutUnknown ? fill("state whether personal information is sold") : sells ? "We sell personal information" : "We do not sell personal information"}. ${optOutUnknown ? fill("state whether personal information is shared for cross-context behavioral advertising") : shares ? "We share personal information for cross-context behavioral advertising" : "We do not share personal information for cross-context behavioral advertising"}. ${childrenPresent ? "The opt-in process for consumers under 16 is described under Children and Minors above." : "We do not have actual knowledge that we sell or share the personal information of consumers under 16."}`));

    parts.push(`<h3>CA-4. California privacy rights</h3>`);
    parts.push(ul([
      `the right to know the categories and specific pieces of personal information we maintain and the related source, purpose and disclosure information;`,
      `the right to delete;`,
      `the right to correct inaccurate personal information;`,
      `the right to opt out of sale or sharing;`,
      ...(spiTok !== "no" ? [`the Right to Limit qualifying use or disclosure of sensitive personal information, where applicable;`] : []),
      ...(admtTok === "yes" || admtTok === "unsure" ? [`applicable ADMT rights under the compliance timing and scope of the final regulations;`] : []),
      `the right not to be discriminated or retaliated against for exercising CCPA rights.`,
    ]));

    parts.push(`<h3>CA-5. Request methods</h3>`);
    parts.push(p(`Submit requests to know, access, delete or correct by email at ${email} ${fill("and insert at least one additional designated method, such as a toll-free telephone number, an online form or an in-app mechanism, as the CCPA and its regulations require for this business")}.`));
    parts.push(`<h3>CA-6. Verification</h3>`);
    parts.push(p(`We verify requests to know, delete and correct as described under Verification of Requests above. We do not require verification for opt-out requests where the CCPA prohibits verification.`));
    parts.push(`<h3>CA-7. Authorized agents</h3>`);
    parts.push(p(`An authorized agent may submit a CCPA request on a consumer's behalf as described under Authorized Agents above; we may require the agent to provide proof of authorisation and may require the consumer to verify identity directly where permitted.`));
    parts.push(`<h3>CA-8. Opt-out preference signals</h3>`);
    // Batch 4ed05f22 (2026-09-05): the sale/sharing answer can be unknown
    // (unanswered, or "not_sure"). Sections 6, CA-1 and CA-3 already prompt in
    // that state; this sentence asserted "we do not sell or share" instead.
    parts.push(p(optOutUnknown
      ? `${fill("state whether personal information is sold or shared and, if it is, confirm that recognised opt-out preference signals are processed as California law requires")}.`
      : sells || shares
      ? `We process applicable opt-out preference signals as required by California law; the signals recognised and how they apply are described under Universal Opt-Out Preference Signals above.`
      : `Because we do not sell or share personal information, no opt-out preference signal processing is required; if that changes, this Notice will describe how signals are processed.`));
    parts.push(`<h3>CA-9. Last updated</h3>`);
    parts.push(p(`Last updated: ${esc(generatedAt)}. ${fill("where 11 CCR § 7102 metrics reporting applies, insert the request metrics or a link to them")}.`));
    sections.push({ title: "California Privacy Disclosures", html: parts.join("\n") });

    // Companion appendices.
    sections.push({
      title: "Appendix A — California Notice at Collection",
      html: [
        p(`Provided at or before the point where we collect personal information. We collect the categories identified below for the purposes stated.`),
        `<table class="fi-table"><thead><tr><th>Category to be collected</th><th>Purpose(s) for collection and use</th><th>Sold or shared?</th><th>Retention period or criteria</th></tr></thead><tbody>${(catRows.length ? catRows : [""]).map((cat) => `<tr><td>${cat ? esc(cat) : fill("insert the category")}</td><td>${purposes ? esc(purposes.replace(/[.\s]+$/, "")) : fill("insert the purposes")}</td><td>${optOutUnknown ? fill("state") : (sells || shares) ? "Yes" : "No"}</td><td>${retentionPeriod ? esc(retentionPeriod) : retentionCriteria ? esc(retentionCriteria) : fill("insert the retention period or criteria")}</td></tr>`).join("")}</tbody></table>`,
        p(`${fill("confirm the current collection state row by row — the Notice at Collection must consume CURRENT collection, not the preceding-12-month record")}.`),
        (sells || shares || optOutUnknown) ? p(`You may opt out at: ${fill("insert the “Do Not Sell or Share My Personal Information” / “Your Privacy Choices” link")}.`) : "",
        (spiTok !== "no") ? p(`Where the Right to Limit applies, you may limit certain use and disclosure of sensitive personal information at: ${fill("insert the “Limit the Use of My Sensitive Personal Information” link")}.`) : "",
        p(`For our full privacy practices and rights, see our Privacy Policy: ${fill("insert the Privacy Policy URL")}.`),
      ].filter(Boolean).join("\n"),
    });
    if (sells || shares || optOutUnknown) {
      sections.push({
        title: "Appendix B — California Notice of Right to Opt Out of Sale or Sharing",
        html: [
          p(`California law gives you the right to direct us not to sell or share your personal information. ${sells ? "We sell the categories of personal information described in our California Privacy Disclosures. " : ""}${shares ? "We share the categories of personal information described in our California Privacy Disclosures for cross-context behavioral advertising. " : ""}${optOutUnknown ? fill("state which categories are sold or shared") + ". " : ""}`),
          p(`You may exercise your right to opt out using: ${fill("insert the “Do Not Sell or Share My Personal Information” link and any interactive opt-out form")}. Where applicable, we also process recognised opt-out preference signals as described in our Privacy Policy. You do not need to submit a request to know, delete or correct in order to opt out.`),
        ].join("\n"),
      });
    }
    if (spiTok !== "no") {
      sections.push({
        title: "Appendix C — California Notice of Right to Limit",
        html: [
          p(`Where we use or disclose sensitive personal information for purposes that give California consumers a Right to Limit under the CCPA, this notice applies. The sensitive personal information involved: ${fill("insert the categories")}. The uses or disclosures subject to limitation: ${fill("insert the purposes outside 11 CCR § 7027(m)")}.`),
          p(`You may exercise the Right to Limit at: ${fill("insert the “Limit the Use of My Sensitive Personal Information” link")}. We will process the request in accordance with the CCPA and its regulations. ${fill("if no use or disclosure falls outside the permitted purposes, delete this appendix and state under Sensitive Personal Information that no Right to Limit is offered")}.`),
        ].join("\n"),
      });
    }
    if (incentiveTok === "yes") {
      sections.push({
        title: "Appendix D — California Notice of Financial Incentive",
        html: [
          p(`We offer the following financial incentive or price or service difference: ${fill("summarise the programme")}.`),
          runIn("Material terms", fill("insert the material terms of the incentive or price or service difference")),
          runIn("Categories of personal information implicated", fill("insert the categories")),
          runIn("How to opt in", fill("insert the opt-in method")),
          runIn("How to withdraw", fill("insert the withdrawal method")),
          runIn("Good-faith estimate of the value of the consumer's data", fill("insert the estimate")),
          runIn("Method used to calculate that value", fill("insert the valuation method")),
          runIn("Relationship between the data value and the incentive", fill("describe the relationship")),
          p(`Participation is voluntary.`),
        ].join("\n"),
      });
    }
    if (admtTok === "yes") {
      sections.push({
        title: "Appendix E — California ADMT Pre-use Notice",
        html: [
          p(`We use automated decisionmaking technology (“ADMT”) to make the following significant decision: ${fill("describe the significant decision")}.`),
          runIn("Specific purpose", fill("insert the purpose for which the ADMT is used")),
          runIn("How the ADMT is used", fill("describe the ADMT's role in the decision")),
          runIn("Personal information used", fill("insert the categories of personal information processed by the ADMT")),
          runIn("Output and its use", fill("describe what the ADMT produces and how the output is used")),
          runIn("ADMT opt-out method", fill("insert the opt-out method")),
          runIn("ADMT access method", fill("insert how a consumer requests information about the ADMT")),
          runIn("Human appeal or review method, where relied on", fill("insert the human-review method, if any")),
          p(`This Pre-use Notice must be provided prominently at or before the applicable collection or use point under the final regulations and their compliance timing.`),
        ].join("\n"),
      });
    }
  }

  if (healthData) {
    sections.push({
      title: `Appendix ${hasCA ? "F" : "A"} — Consumer Health Data Privacy Notice`,
      html: [
        p(`This supplemental notice applies to consumer health data processed in connection with ${fill("insert the scope")}. We collect the following categories of consumer health data: ${fill("insert the categories")}; for the purposes: ${fill("insert the purposes")}; from the sources: ${fill("insert the sources")}; and we disclose it to: ${fill("insert the recipients")}.`),
        p(`Consumers may exercise applicable consumer-health-data rights using: ${fill("insert the request method")}. This supplement is governed by the specific law in scope${has("CT") ? " (Connecticut consumer health data)" : ""}${has("MD") ? " (Maryland consumer health data)" : ""}.`),
      ].join("\n"),
    });
  }

  return { title, subtitle, intro, glance, sections };

  // ── helpers bound to ctx ────────────────────────────────────────────────
  /** Enforcement contact from the law registry; "" when no row carries one. */
  function agContact(s: UsStateRow): string {
    const law = ctx.laws?.[s.state_code];
    if (!law?.enforcement_body) return "";
    const url = law.enforcement_url ? (law.enforcement_url.startsWith("http") ? law.enforcement_url : `https://${law.enforcement_url}`) : "";
    return `${esc(law.enforcement_body)}${url ? `, <a href="${esc(url)}">${esc(law.enforcement_url ?? url)}</a>` : ""}`;
  }
  function runInline(labelText: string, valueHtml: string): string {
    return `<span class="fi-run">${esc(labelText)}:</span> ${valueHtml}`;
  }
  function stateSpecificBits(code: string): string[] {
    const bits: string[] = [];
    const t = (k: string) => token(k);
    switch (code) {
      case "CO":
        if (t("co_uoom_honored")) bits.push(`Universal opt-out mechanism (including Global Privacy Control): ${esc(t("co_uoom_honored") === "yes" ? "honoured" : t("co_uoom_honored") === "no" ? "not yet honoured — " : "to be confirmed — ")}${t("co_uoom_honored") !== "yes" ? fill("Colorado requires recognising universal opt-out mechanisms; describe how the signal will be honoured") : ""}`);
        break;
      case "TX":
        if (t("tx_small_business_carveout") === "yes") bits.push(`Small-business status: the record states the business is an SBA-defined small business; Texas exempts such businesses from most obligations other than the sale of sensitive data, which still requires consent. ${fill("confirm the exemption applies before relying on it")}`);
        break;
      case "CT":
        if (t("ct_consumer_health_data") === "yes") bits.push(`Consumer health data is processed; see the Consumer Health Data Privacy Notice appendix.`);
        break;
      case "OR":
        bits.push(`On request, we identify the specific third parties to which we have disclosed a consumer's personal data, as Oregon law requires${t("or_specific_third_parties") === "no" ? ` — ${fill("the record states this capability is not yet in place; describe how it will be met")}` : ""}.`);
        break;
      case "NJ":
        if (t("nj_financial_education_data") === "yes") bits.push(`Financial, education or insurance data treated as sensitive data under New Jersey law is processed; opt-in consent applies.`);
        break;
      case "DE":
        if (t("de_nonprofit_status") === "yes") bits.push(`Non-profit status: Delaware's law applies to non-profits; this Notice applies to our organisation accordingly.`);
        break;
      case "MN":
        if (t("mn_data_inventory")) bits.push(`Data inventory: ${t("mn_data_inventory") === "yes" ? "we maintain the written data inventory Minnesota law requires." : fill("Minnesota requires a written data inventory; confirm it is maintained")}`);
        break;
      case "MD":
        if (t("md_data_minimisation")) bits.push(`Data minimisation: ${esc(label("md_data_minimisation", t("md_data_minimisation")))}${t("md_data_minimisation") === "broader" ? ` — ${fill("Maryland limits collection to what is reasonably necessary and proportionate to the requested service; state the practice that will apply to Maryland residents")}` : ""}.`);
        break;
      case "FL":
        bits.push(`Florida Digital Bill of Rights applicability: ${t("fl_scope_confirmation") === "yes" ? "the record confirms the business meets the FDBR controller threshold." : t("fl_scope_confirmation") === "no" ? "the record states the business does not meet the FDBR controller threshold; the Florida disclosures are provided voluntarily." : fill("confirm whether the business meets the FDBR controller threshold")}`);
        if (t("fl_government_moderation") === "yes") bits.push(`Content moderation: ${fill("Florida's platform transparency provisions may apply; describe the moderation criteria disclosed")}`);
        break;
    }
    return bits;
  }
}
