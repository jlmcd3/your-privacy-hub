// supabase/functions/generate-eu-notice/_local/spine.ts
//
// DOC 180 (2026-09-04) — THE EU / UK GDPR NOTICE SPINE. Ports the CEO-ratified
// spine document ("{{controller_name}} — EU Privacy Notice.md", 2026-09-04)
// onto the existing intake WITHOUT adding a single intake field: every value
// the spine needs that the intake collects renders from the answer; every
// value it does not collect renders as an italic bracketed customer-
// completion prompt (formal-instrument.ts `fill`). The GDPR family
// (EU_GDPR, UK_GDPR) renders through this module; every other framework
// keeps the legacy section builder in index.ts byte-for-byte.
//
// Legal positions carried here, each backed by a corpus-verified manifest
// entry in _shared/legal-text-assertions.ts:
//   - Art. 13(1)(d)/(2)(e)/(2)(f): specific legitimate interest, provision
//     requirement + consequence, and automated-decision detail — none of
//     which the intake collects — render as prompts, never as invented text.
//   - Art. 21(4): the direct-marketing objection is its own section, in a
//     callout, "clearly and separately" from the general rights list.
//   - Art. 9: the Article 9(2) condition is the customer's OWN answer
//     (special_category_basis) — never the old hardcoded alternatives map.
//   - Transfers: no placeholder can reach the page and no Transfer Impact
//     Assessment is ever asserted (the intake has no such field).
//   - UK GDPR: Article 22 is no longer in force (Data (Use and Access) Act
//     2025); the UK variant cites Articles 22A–22C, the Article 12A time
//     period, Article 45A adequacy regulations and Article 77's "complaint
//     with the Commissioner" — all from the gdpr_articles corpus.

import { fill, runIn } from "../../_shared/prose/formal-instrument.ts";
import type { EuKeyPointsBag } from "./key-points.ts";

export interface SpineFw {
  framework_code: string;
  framework_name: string;
  region?: string;
}

/** The reader the spine renders from. index.ts (the single writer for reader
 *  labels) constructs it; the spine formats nothing of its own. */
export interface SpineCtx {
  readonly fw: SpineFw;
  readonly answers: Record<string, unknown>;
  readonly generatedAtHuman: string;
  /** Reader-label form of an answer (index.ts formatAnswer). */
  readonly fmt: (key: string) => string;
  /** Raw token form (arrays comma-joined). */
  readonly token: (key: string) => string;
  /** Array form of a multi-select answer (raw codes). */
  readonly list: (key: string) => string[];
  /** Reader label for one option code. */
  readonly label: (key: string, code: string) => string;
  readonly esc: (s: unknown) => string;
}

export interface SpineSection {
  title: string;
  html: string;
}

export interface SpineResult {
  lawName: string;
  controllerName: string;
  contactEmail: string;
  /** The opening paragraph(s) under the title. */
  intro: string;
  /** The Privacy at a Glance first layer (WP260 layered notice). */
  glance: string;
  sections: SpineSection[];
  keyPoints: EuKeyPointsBag;
}

export const SPECIAL_CATEGORY_CODES = [
  "health_medical",
  "biometric",
  "race_ethnicity",
  "religion",
  "sexual_orientation",
  "political_opinions",
  "trade_union",
] as const;

/** EU/EEA lead supervisory authorities by the controller's establishment
 *  (used when the customer left gdpr_dpa_contact blank). */
export const EU_SUPERVISORY_AUTHORITIES: ReadonlyArray<readonly [string, string, string]> = [
  ["ireland", "Data Protection Commission (DPC)", "https://www.dataprotection.ie"],
  ["germany", "Bundesbeauftragte für den Datenschutz und die Informationsfreiheit (BfDI)", "https://www.bfdi.bund.de"],
  ["france", "Commission Nationale de l'Informatique et des Libertés (CNIL)", "https://www.cnil.fr"],
  ["netherlands", "Autoriteit Persoonsgegevens (AP)", "https://autoriteitpersoonsgegevens.nl"],
  ["spain", "Agencia Española de Protección de Datos (AEPD)", "https://www.aepd.es"],
  ["belgium", "Autorité de protection des données (APD)", "https://www.autoriteprotectiondonnees.be"],
  ["sweden", "Integritetsskyddsmyndigheten (IMY)", "https://www.imy.se"],
  ["denmark", "Datatilsynet", "https://www.datatilsynet.dk"],
  ["finland", "Tietosuojavaltuutetun toimisto (TSV)", "https://tietosuoja.fi"],
  ["austria", "Österreichische Datenschutzbehörde (DSB)", "https://www.dsb.gv.at"],
  ["poland", "Urząd Ochrony Danych Osobowych (UODO)", "https://uodo.gov.pl"],
  ["italy", "Garante per la protezione dei dati personali", "https://www.garanteprivacy.it"],
  ["luxembourg", "Commission Nationale pour la protection des données (CNPD)", "https://cnpd.public.lu"],
  ["portugal", "Comissão Nacional de Proteção de Dados (CNPD)", "https://www.cnpd.pt"],
  ["greece", "Hellenic Data Protection Authority (HDPA)", "https://www.dpa.gr"],
  ["norway", "Datatilsynet (Norway)", "https://www.datatilsynet.no"],
];

const EEA_RE =
  /\b(eea|eu|austria|belgium|bulgaria|croatia|cyprus|czech|denmark|estonia|finland|france|germany|greece|hungary|ireland|italy|latvia|lithuania|luxembourg|malta|netherlands|poland|portugal|romania|slovakia|slovenia|spain|sweden|iceland|liechtenstein|norway)\b/;
const UK_RE = /\b(uk|united kingdom|england|scotland|wales|northern ireland)\b/;

const p = (html: string) => `<p>${html}</p>`;
const ul = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const mailto = (esc: SpineCtx["esc"], email: string) =>
  `<a href="mailto:${esc(email)}">${esc(email)}</a>`;

export function buildGdprSpine(ctx: SpineCtx): SpineResult {
  const { fw, esc, fmt, token, list, label, generatedAtHuman } = ctx;
  const isUK = fw.framework_code === "UK_GDPR";

  // ── Vocabulary that differs between the two regimes ─────────────────────
  const LAW = isUK ? "the UK GDPR" : "the GDPR";
  const lawName = isUK
    ? "UK General Data Protection Regulation (UK GDPR)"
    : "EU General Data Protection Regulation (GDPR)";
  const lawLong = isUK
    ? "the UK General Data Protection Regulation (“UK GDPR”) and the Data Protection Act 2018"
    : "Regulation (EU) 2016/679 (the General Data Protection Regulation, “GDPR”)";
  const region = isUK ? "the United Kingdom" : "the European Economic Area (“EEA”)";
  const regionShort = isUK ? "the UK" : "the EEA";
  const adequacyPhrase = isUK
    ? "adequacy regulations made under Article 45A of the UK GDPR"
    : "an adequacy decision of the European Commission";
  const safeguardsArticle = isUK ? "Article 46 of the UK GDPR" : "Article 46 of the GDPR";
  const responseTime = isUK
    ? "before the end of the applicable time period under Article 12A of the UK GDPR"
    : "without undue delay and in any event within one month of receipt of your request (Article 12(3) of the GDPR), a period that may be extended by two further months where necessary, in which case we will tell you within the first month";
  const admLaw = isUK
    ? "Articles 22A to 22D of the UK GDPR, as inserted by the Data (Use and Access) Act 2025"
    : "Article 22 of the GDPR";

  // ── Answers ─────────────────────────────────────────────────────────────
  // Every customer-supplied value is escaped HERE, once; the `…Text` form is
  // the raw answer for callers that need it (the Key points bag).
  const controllerNameText = fmt("controller_name");
  const controllerName = controllerNameText ? esc(controllerNameText) : fill("insert the legal name of the controller");
  const controllerAddressText = fmt("controller_address");
  const controllerAddress = controllerAddressText ? esc(controllerAddressText) : fill("insert the controller's registered address");
  const contactEmailText = fmt("contact_email");
  const contactEmail = contactEmailText ? mailto(esc, contactEmailText) : fill("insert the email address for privacy questions and rights requests");
  const dpoYes = token("dpo_details") === "yes";
  const dpoNameText = fmt("dpo_name");
  const dpoName = dpoNameText ? `<strong>${esc(dpoNameText)}</strong>` : fill("insert the name or function of the Data Protection Officer");
  const dpoEmailText = fmt("dpo_email");
  const dpoEmail = dpoEmailText ? mailto(esc, dpoEmailText) : fill("insert the Data Protection Officer's contact details");

  const purposeCodes = list("processing_purposes");
  const purposes = fmt("processing_purposes");
  const categoryCodes = list("data_categories");
  const categories = fmt("data_categories");
  const basisCodes = list("lawful_basis");
  const bases = fmt("lawful_basis");
  const recipients = fmt("third_party_recipients");
  const retention = fmt("retention_period");

  const collectionSource = token("collection_source");
  const collectionLabel = fmt("collection_source");
  const sourceCats = fmt("data_source_categories");
  const sourceCatCodes = list("data_source_categories");
  const fromPublic = sourceCatCodes.includes("public_sources");

  const transfersYes = token("transfer_outside_eea") === "yes";
  const safeguardCodes = list("transfer_safeguards").filter((c) => isUK || c !== "uk_addendum");
  const safeguards = safeguardCodes.map((c) => label("transfer_safeguards", c)).join(", ");
  const destinations = fmt("transfer_destinations") || fmt("transfer_countries");
  const adequacyNote = fmt("adequacy_status");

  const specialPresent = categoryCodes.filter((c) => (SPECIAL_CATEGORY_CODES as readonly string[]).includes(c));
  const criminalPresent = categoryCodes.includes("criminal");
  const childrenPresent = categoryCodes.includes("children");
  const specialBasis = fmt("special_category_basis");

  const consentSelected = basisCodes.includes("consent");
  const liSelected = basisCodes.includes("legitimate_interests");
  const publicTaskSelected = basisCodes.includes("public_task");
  const withdrawMethod = fmt("gdpr_right_to_withdraw");
  const objectMethod = fmt("gdpr_right_to_object");
  const marketingSelected = purposeCodes.includes("marketing") || purposeCodes.includes("advertising");
  const cookiesLikely = categoryCodes.includes("internet_activity") || purposeCodes.includes("analytics") || purposeCodes.includes("advertising");

  const profilingToken = token("gdpr_profiling");
  const profilingYes = profilingToken === "yes";
  const profilingInfo = fmt("gdpr_profiling_info");
  const automatedToken = token("automated_decisions");
  const automatedYes = automatedToken === "yes";
  const automatedUnsure = automatedToken === "unsure";
  const automatedDetail = fmt("automated_decisions_detail").trim();

  const establishment = fmt("establishment_jurisdiction");
  const estLower = establishment.toLowerCase();
  const isEstEEA = EEA_RE.test(estLower);
  const isEstUK = UK_RE.test(estLower);
  const repNeeded = isUK ? !isEstUK : !isEstEEA;

  // ── Intro ───────────────────────────────────────────────────────────────
  const scopeFill = fill("insert the services, websites, applications, products or other activities this Notice covers");
  const groupsFill = fill("insert the groups of individuals this Notice covers, for example customers, website visitors or job applicants");
  const intro = [
    p(`This Privacy Notice explains how <strong>${controllerName}</strong> (“we”, “us” or “our”) collects, uses, discloses, retains and otherwise processes personal data under ${esc(lawLong)} in connection with ${scopeFill}.`),
    p(`This Notice applies to ${groupsFill} in ${esc(region)} whose personal data is processed in connection with the services, websites, applications, products or other activities described in this Notice.`),
    p(`Where a separate privacy notice or service-specific supplement applies to a particular product, service, workforce population or other processing activity, that notice supplements this Notice, and where it provides more specific information about a particular processing activity, the more specific information applies to that activity.`),
  ].join("\n");

  // ── Representative block (shared by the glance and Section 1) ──────────
  const repName = fmt(isUK ? "uk_rep_name" : "eu_rep_name");
  const repContact = fmt(isUK ? "uk_rep_contact" : "eu_rep_contact");
  const repFill = isUK
    ? fill("insert the name and contact details of the representative in the United Kingdom designated under Article 27 of the UK GDPR, or state the Article 27(2) exemption relied on")
    : fill("insert the name and contact details of the representative in the Union designated under Article 27 of the GDPR, or state the Article 27(2) exemption relied on");
  const repLine = repName
    ? `<strong>${esc(repName)}</strong>${repContact ? `, ${esc(repContact)}` : ""}`
    : repFill;

  // ── Privacy at a Glance ────────────────────────────────────────────────
  const glanceRows: string[] = [];
  glanceRows.push(runIn("Who controls your personal data", `${controllerName}, ${controllerAddress}. Contact: ${contactEmail}.${dpoYes ? ` Data Protection Officer: ${dpoName}, ${dpoEmail}.` : ""}${repNeeded ? ` Representative in ${esc(regionShort)}: ${repLine}.` : ""}`));
  glanceRows.push(runIn("Why we use personal data", purposes ? esc(purposes) : fill("insert the purposes of processing")));
  glanceRows.push(runIn("What personal data we use", categories ? esc(categories) : fill("insert the categories of personal data processed")));
  glanceRows.push(runIn("Where we obtain it", collectionLabel ? `${esc(collectionLabel)}${sourceCats && collectionSource !== "direct" ? ` — ${esc(sourceCats)}` : ""}` : fill("state whether personal data is obtained directly from individuals, from other sources, or both")));
  glanceRows.push(runIn("Who receives it", recipients ? esc(recipients) : fill("insert the categories of recipients")));
  glanceRows.push(runIn("International transfers", transfersYes
    ? `Yes — to ${destinations ? esc(destinations) : fill(`insert the countries or regions outside ${regionShort} to which personal data is transferred`)}${safeguards ? `, relying on ${esc(safeguards)}` : ""}. See the International Transfers section below.`
    : `None outside ${esc(regionShort)} that require a transfer mechanism are reported.`));
  glanceRows.push(runIn("How long we keep it", retention ? esc(retention) : fill("insert the retention period or the criteria used to determine it")));
  const choices: string[] = [`rights requests to ${contactEmail}`];
  if (consentSelected) choices.push(`withdraw consent by ${withdrawMethod ? esc(withdrawMethod) : fill("insert how individuals can withdraw consent")}`);
  if (liSelected || publicTaskSelected) choices.push(`object to processing by ${objectMethod ? esc(objectMethod) : fill("insert how individuals can object to processing")}`);
  if (marketingSelected) choices.push(`<strong>object to direct marketing at any time</strong> (see the separate section below)`);
  glanceRows.push(runIn("Your rights and choices", choices.join("; ") + "."));
  const highImpact: string[] = [];
  if (specialPresent.length || criminalPresent) highImpact.push("special-category or criminal-offence data");
  if (profilingYes) highImpact.push("profiling");
  if (automatedYes) highImpact.push("solely automated decisions with legal or similarly significant effects");
  if (childrenPresent) highImpact.push("children's personal data");
  if (highImpact.length) glanceRows.push(runIn("High-impact processing", `This Notice covers ${esc(highImpact.join("; "))}. See the relevant sections below.`));
  const glance = `<section class="fi-glance"><p><span class="fi-run">Privacy at a glance.</span> This summary is for orientation only; the numbered sections below are the Notice.</p>\n${glanceRows.join("\n")}</section>`;

  const sections: SpineSection[] = [];

  // 1 ─────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    parts.push(`<h3>Controller</h3>`);
    parts.push(p(`The data controller for the processing described in this Notice is <strong>${controllerName}</strong>, ${controllerAddress}.`));
    parts.push(p(`For privacy questions or data protection rights requests, contact ${contactEmail}.`));
    if (dpoYes) {
      parts.push(`<h3>Data Protection Officer</h3>`);
      parts.push(p(`We have appointed a Data Protection Officer.`));
      parts.push(runIn("Name / function", dpoName));
      parts.push(runIn("Contact", dpoEmail));
    }
    if (repNeeded) {
      parts.push(`<h3>${isUK ? "UK representative" : "EU representative"}</h3>`);
      parts.push(p(isUK
        ? `Where we are not established in the United Kingdom and Article 27 of the UK GDPR applies to the processing described in this Notice, our representative in the United Kingdom is: ${repLine}.`
        : `Where we are not established in the EEA and Article 27 of the GDPR applies to the processing described in this Notice, our representative in the Union is: ${repLine}.`));
      parts.push(p(`You may contact our representative, in addition to contacting us directly, about matters relating to the processing of your personal data under ${esc(LAW)}.`));
    }
    sections.push({ title: "Who Is Responsible for Your Personal Data?", html: parts.join("\n") });
  }

  // 2 ─────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    parts.push(p(`We process personal data only where it is relevant to the purposes described in this Notice. The categories of personal data we process are:`));
    parts.push(categories ? p(`<strong>${esc(categories)}</strong>`) : p(fill("insert the categories of personal data processed")));
    if (specialPresent.length || criminalPresent) {
      parts.push(p(`Some of these categories receive additional protection under ${esc(LAW)}; see the section on special-category personal data and criminal-offence information below.`));
    }
    parts.push(p(`The fact that a category appears in this section does not mean that we use every item of personal data for every purpose. The processing descriptions in Section 4 identify the personal data used for each purpose.`));
    sections.push({ title: "What Personal Data Do We Process?", html: parts.join("\n") });
  }

  // 3 ─────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    if (collectionSource === "direct") {
      parts.push(p(`We obtain personal data directly from you when you interact with us. This may include information you provide when you create or manage an account, purchase or use a product or service, communicate with us, complete a form, submit a request or otherwise provide information to us, and information collected automatically from your interaction with our services, websites, applications or connected products in the course of your direct relationship with us.`));
    } else if (collectionSource === "indirect" || collectionSource === "mixed") {
      parts.push(p(collectionSource === "mixed"
        ? `We obtain some personal data directly from you and other personal data from sources other than you.`
        : `We obtain personal data from sources other than the individual to whom the information relates.`));
      parts.push(p(`Those sources include: ${sourceCats ? `<strong>${esc(sourceCats)}</strong>` : fill("insert the categories of sources from which personal data is obtained")}.`));
      if (fromPublic) parts.push(p(`Some of this personal data is obtained from publicly accessible sources.`));
      parts.push(p(`Where personal data is obtained from a source other than you, we provide this information within a reasonable period after obtaining it and at the latest within one month; or, if the data is used to communicate with you, at the latest at the time of the first communication; or, if disclosure to another recipient is envisaged, at the latest when the data is first disclosed (Article 14(3) of ${esc(LAW)}).`));
    } else {
      parts.push(p(`${fill("state whether personal data is obtained directly from individuals, from other sources, or both, and identify any sources other than the individual")}.`));
    }
    sections.push({ title: "Where Do We Obtain Personal Data?", html: parts.join("\n") });
  }

  // 4 ─────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    parts.push(p(`We use personal data only for specified purposes and where a lawful basis is available under Article 6 of ${esc(LAW)}. The purposes for which we process personal data are: ${purposes ? `<strong>${esc(purposes)}</strong>` : fill("insert the purposes of processing")}.`));
    parts.push(p(`The Article 6 lawful bases we rely on are: ${bases ? `<strong>${esc(bases)}</strong>` : fill("insert the Article 6 lawful basis or bases relied on")}.`));
    parts.push(p(`Each purpose is described separately below so that you can understand which personal data is used, why it is used, where it comes from, the lawful basis, who receives it and how long it is kept.`));
    if (purposeCodes.length === 0) {
      parts.push(`<div class="fi-block">${p(fill("insert a description of each processing purpose: the personal data used, its source, the lawful basis, any legitimate interest pursued, the recipients, the retention period and whether providing the data is required"))}</div>`);
    }
    for (const code of purposeCodes) {
      const name = label("processing_purposes", code);
      const block: string[] = [];
      block.push(`<h3>${esc(name)}</h3>`);
      block.push(runIn("Personal data used", `the relevant categories listed in Section 2 — ${fill("state which of those categories are used for this purpose")}`));
      block.push(runIn("Source", collectionLabel ? esc(collectionLabel) + (sourceCats && collectionSource !== "direct" ? ` (${esc(sourceCats)})` : "") : fill("state where the personal data used for this purpose comes from")));
      // One lawful basis selected → it applies to every purpose, no prompt.
      // Several → the customer states which applies here; where legitimate
      // interests is among them, the SPECIFIC interest pursued (Art. 13(1)(d))
      // is asked in the same prompt rather than as a second one.
      const singleBasis = basisCodes.length === 1 ? basisCodes[0] : null;
      const liPrompt = "the specific legitimate interest of the controller or a third party pursued by this processing";
      const basisHtml = singleBasis
        ? esc(label("lawful_basis", singleBasis)) +
          (singleBasis === "legitimate_interests" ? ` — ${fill(`state ${liPrompt}`)}` : "")
        : basisCodes.length > 1
        ? fill(`state which of the lawful bases listed above applies to this purpose${liSelected ? ` and, where it is legitimate interests, ${liPrompt}` : ""}`)
        : fill(`state the Article 6 lawful basis relied on for this purpose and, where it is legitimate interests, ${liPrompt}`);
      block.push(runIn("Lawful basis", basisHtml));
      block.push(runIn("Recipients", `as identified in the section on recipients below, to the extent relevant to this purpose`));
      // Retention has one home (the retention section); a per-purpose prompt
      // appears only when the record carries no retention answer at all.
      block.push(runIn("Retention", retention
        ? `as stated in the section on how long we keep personal data below`
        : fill("insert the retention period or criteria for this purpose")));
      block.push(runIn("Whether you must provide this information", fill("state whether providing this personal data is a statutory or contractual requirement or necessary to enter into a contract, whether you are obliged to provide it, and the possible consequences of not providing it")));
      parts.push(`<div class="fi-block">${block.join("\n")}</div>`);
    }
    sections.push({ title: "How and Why Do We Use Personal Data?", html: parts.join("\n") });
  }

  // 5 (conditional) ────────────────────────────────────────────────────────
  if (specialPresent.length || criminalPresent) {
    const parts: string[] = [];
    if (specialPresent.length) {
      const catLabels = specialPresent.map((c) => label("data_categories", c)).join(", ");
      parts.push(`<h3>Special-category personal data</h3>`);
      parts.push(p(`The categories of personal data we process include personal data subject to Article 9 of ${esc(LAW)}: <strong>${esc(catLabels)}</strong>. We process that information only where both an Article 6 lawful basis and an applicable Article 9(2) condition are satisfied.`));
      parts.push(p(`The Article 9(2) condition we rely on is: ${specialBasis ? `<strong>${esc(specialBasis)}</strong>` : fill("insert the Article 9(2) condition relied on for this special-category processing")}.`));
      if (isUK) {
        const sched = fmt("uk_lawful_basis_schedule");
        parts.push(p(`Where the condition relied on requires an additional condition under Schedule 1 to the Data Protection Act 2018, the condition relied on is: ${sched ? `<strong>${esc(sched)}</strong>` : fill("insert the Schedule 1 Data Protection Act 2018 condition relied on")}.`));
      }
    }
    if (criminalPresent) {
      parts.push(`<h3>Criminal-offence information</h3>`);
      parts.push(p(`We process information relating to criminal convictions or offences only where that processing is authorised by ${isUK ? "domestic law" : "Union or Member State law"} and is subject to appropriate safeguards (Article 10 of ${esc(LAW)}).`));
      parts.push(runIn("Applicable legal authority and safeguards", fill("insert the legal authority under which criminal-offence information is processed and the safeguards applied")));
    }
    sections.push({ title: "Special-Category Personal Data and Criminal-Offence Information", html: parts.join("\n") });
  }

  // 6 ─────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    parts.push(p(`We disclose personal data, where relevant to the processing described in this Notice, to the following categories of recipients: ${recipients ? `<strong>${esc(recipients)}</strong>` : fill("insert the categories of recipients of personal data")}.`));
    parts.push(p(`Where another organisation determines its own purposes and means of processing, that organisation acts as an independent controller rather than as our processor; where we and another organisation jointly determine the purposes and means of processing, we identify the joint-controller arrangement where required. The presence of a recipient category in this section does not mean that the recipient receives every category of personal data we process.`));
    sections.push({ title: "Who Receives Personal Data?", html: parts.join("\n") });
  }

  // 7 ─────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    if (!transfersYes) {
      parts.push(p(`The personal data covered by this Notice is not transferred outside ${esc(regionShort)} in a manner that requires us to rely on a transfer mechanism under Chapter V of ${esc(LAW)}. If that changes, we will update this Notice or otherwise provide the transparency required by applicable law.`));
    } else {
      parts.push(p(`We transfer personal data to, or permit access to personal data from, countries or regions outside ${esc(regionShort)}.`));
      parts.push(runIn("Destinations", destinations ? esc(destinations) : fill(`insert the countries or regions outside ${regionShort} to which personal data is transferred or from which it is accessed`)));
      parts.push(runIn("Transfer mechanism", safeguards ? esc(safeguards) : fill(`insert the transfer mechanism relied on under ${safeguardsArticle}, for example standard data protection clauses, binding corporate rules or ${adequacyPhrase}`)));
      if (adequacyNote) parts.push(runIn("Adequacy", esc(adequacyNote)));
      parts.push(p(`Where a destination is covered by ${esc(adequacyPhrase)}, we rely on that decision for the transfer. Where it is not, we rely on appropriate safeguards under ${esc(safeguardsArticle)}${safeguardCodes.includes("derogations") ? ` or, for specific situations, on a derogation under Article 49 of ${esc(LAW)}` : ""}.`));
      parts.push(p(`You may request information about, or a copy of, the safeguards relied on by contacting us at ${contactEmail}, subject to any permitted redactions.`));
    }
    sections.push({ title: "International Transfers", html: parts.join("\n") });
  }

  // 8 (conditional) ────────────────────────────────────────────────────────
  if (cookiesLikely) {
    const parts: string[] = [];
    parts.push(p(`We use cookies and similar technologies, such as software development kits, pixels, local storage, device identifiers or comparable technologies, in connection with our websites, applications or services. We use these technologies for: ${fill("insert the purposes for which cookies and similar technologies are used, for example essential operation, analytics or advertising")}.`));
    parts.push(p(`Where applicable law requires consent before a non-essential technology is used or information is stored on or accessed from your device, we obtain the required choice before activating that technology.`));
    parts.push(runIn("Cookie settings", fill("insert where individuals can review or change their cookie choices")));
    parts.push(runIn("Cookie Notice", fill("insert where the cookie notice describing each technology, its purpose and its duration can be found")));
    sections.push({ title: "Cookies and Similar Technologies", html: parts.join("\n") });
  }

  // 9 (conditional) ────────────────────────────────────────────────────────
  if (profilingYes || automatedYes || automatedUnsure) {
    const parts: string[] = [];
    if (profilingYes) {
      parts.push(`<h3>Profiling</h3>`);
      parts.push(p(`We use profiling in connection with our processing of personal data. The purpose and consequences of that profiling are: ${profilingInfo ? `<strong>${esc(profilingInfo)}</strong>` : fill("describe what the profiling is used for and its consequences for the individual")}.`));
      if (liSelected || publicTaskSelected) parts.push(p(`Where the profiling is based on legitimate interests or a public task, you may object by ${objectMethod ? esc(objectMethod) : fill("insert how individuals can object to the profiling")}.`));
      if (marketingSelected) parts.push(p(`You have the right to object at any time to profiling to the extent it is related to direct marketing.`));
    }
    if (automatedYes || automatedUnsure) {
      parts.push(`<h3>Automated decision-making with legal or similarly significant effects</h3>`);
      if (automatedUnsure) {
        parts.push(p(`${fill("confirm whether we make decisions based solely on automated processing that produce legal effects or similarly significantly affect individuals; if so, complete this section, and if not, state that no such decisions are made")}.`));
      } else {
        parts.push(p(`We make decisions based solely on automated processing, including profiling, that produce legal effects concerning you or similarly significantly affect you, within the meaning of ${esc(admLaw)}.`));
        // The "Meaningful information …" lead renders only over supplied
        // detail; a blank answer renders the prompt alone (never a claim).
        parts.push(p(automatedDetail
          ? `Meaningful information about the logic involved, the significance and the envisaged consequences of this processing for you: <strong>${esc(automatedDetail)}</strong>.`
          : `${fill("describe the logic involved, the significance and the envisaged consequences of the automated decision-making for the individual")}.`));
        parts.push(p(isUK
          ? `Where such a decision is taken, we ensure that the safeguards required by Article 22C of the UK GDPR are in place, including measures that provide you with information about the decision, enable you to make representations about it, enable you to obtain human intervention on our part, and enable you to contest the decision.`
          : `Where such a decision is permitted under Article 22(2) of the GDPR, you have the right to obtain human intervention on our part, to express your point of view and to contest the decision (Article 22(3) of the GDPR).`));
        parts.push(runIn("How to request human intervention or contest a decision", fill("insert how an individual can obtain human intervention, express their point of view and contest a decision")));
      }
    }
    sections.push({ title: "Profiling and Automated Decision-Making", html: parts.join("\n") });
  }

  // 10 ────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    parts.push(p(`We retain personal data only for as long as reasonably necessary for the purposes for which it is processed, including where necessary to meet legal, accounting, tax, regulatory, security, fraud-prevention, dispute-resolution or recordkeeping requirements. Our retention position is: ${retention ? `<strong>${esc(retention)}</strong>` : fill("insert the retention period or the criteria used to determine it")}.`));
    parts.push(p(`Where a fixed retention period cannot be specified, we use meaningful criteria to determine the retention period. Those criteria may include:`));
    parts.push(ul([
      "the duration of an account or customer relationship;",
      "the period during which a service is provided;",
      "applicable statutory recordkeeping requirements;",
      "applicable limitation periods;",
      "the time reasonably required for security or fraud-prevention purposes;",
      "the period until consent is withdrawn;",
      "the period until a valid objection is made, where applicable; and",
      "a defined inactivity, archival or deletion schedule.",
    ]));
    parts.push(p(`Where a purpose in Section 4 uses a different retention period, that period is stated there.`));
    sections.push({ title: "How Long Do We Keep Personal Data?", html: parts.join("\n") });
  }

  // 11 ────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    parts.push(p(`Subject to the conditions and limitations in ${esc(LAW)}, you have the following rights.`));
    const rights: string[] = [
      `<strong>Access</strong> (Article 15) — to obtain confirmation as to whether or not we process personal data about you and, where we do, access to that personal data and the related information.`,
      `<strong>Rectification</strong> (Article 16) — to have inaccurate personal data corrected and, taking into account the purposes of the processing, incomplete personal data completed.`,
      `<strong>Erasure</strong> (Article 17) — to have personal data erased where one of the grounds in Article 17 applies and no exception permits or requires continued processing.`,
      `<strong>Restriction</strong> (Article 18) — to restrict processing in the circumstances set out in Article 18.`,
      `<strong>Data portability</strong> (Article 20) — where Article 20 applies, to receive personal data you provided to us in a structured, commonly used and machine-readable format and to transmit it to another controller.`,
      `<strong>Objection</strong> (Article 21) — where processing is based on Article 6(1)(e) or 6(1)(f), to object on grounds relating to your particular situation${(liSelected || publicTaskSelected) ? `, by ${objectMethod ? esc(objectMethod) : fill("insert how individuals can object to processing based on legitimate interests or a public task")}` : ""}.`,
    ];
    if (consentSelected) rights.push(`<strong>Withdraw consent</strong> — where processing is based on consent, to withdraw your consent at any time, without affecting the lawfulness of processing based on consent before its withdrawal (Article 7(3)), by ${withdrawMethod ? esc(withdrawMethod) : fill("insert how individuals can withdraw consent")}.`);
    if (automatedYes) rights.push(`<strong>Automated-decision safeguards</strong> — to obtain human intervention, express your point of view and contest a decision based solely on automated processing, as described in the section on profiling and automated decision-making.`);
    parts.push(ul(rights));
    parts.push(`<h3>How to exercise your rights</h3>`);
    parts.push(p(`You can submit a data protection rights request by contacting ${contactEmail}. We may request information reasonably necessary to verify your identity and understand your request, and will not request more personal data than is reasonably necessary for those purposes.`));
    parts.push(p(`We will respond ${esc(responseTime)}.`));
    sections.push({ title: "Your Data Protection Rights", html: parts.join("\n") });
  }

  // 12 (conditional) ───────────────────────────────────────────────────────
  if (marketingSelected) {
    const parts: string[] = [];
    parts.push(`<div class="fi-callout">${p(`<strong>You have the right to object at any time to the processing of your personal data for direct marketing purposes, including profiling to the extent that it is related to such direct marketing.</strong> If you object, we will no longer process your personal data for those purposes (Article 21(2) and (3) of ${esc(LAW)}).`)}${runIn("How to object", objectMethod ? esc(objectMethod) : fill("insert how individuals can object to direct marketing, for example an unsubscribe link or a preference centre"))}${p(`Where a marketing communication includes an unsubscribe link or preference control, you may also use that mechanism.`)}</div>`);
    sections.push({ title: "Your Right to Object to Direct Marketing", html: parts.join("\n") });
  }

  // 13 (conditional) ───────────────────────────────────────────────────────
  if (childrenPresent) {
    const parts: string[] = [];
    parts.push(p(`The processing described in this Notice includes personal data relating to children. It concerns: ${fill("insert the age group of the children whose personal data is processed")}.`));
    parts.push(runIn("Purposes", fill("insert the purposes for which children's personal data is processed")));
    parts.push(runIn("Lawful basis", fill("insert the Article 6 lawful basis relied on for the processing of children's personal data")));
    parts.push(p(`Where consent is relied on for an information society service offered directly to a child and applicable law requires authorisation from a holder of parental responsibility, our process is: ${fill("insert the process used to obtain and verify parental authorisation")}. We provide privacy information about this processing in language designed to be understandable to the children or families to whom it is directed.`));
    sections.push({ title: "Children", html: parts.join("\n") });
  }

  // 14 ────────────────────────────────────────────────────────────────────
  sections.push({
    title: "How Do We Protect Personal Data?",
    html: [
      p(`We use technical and organisational measures designed to protect personal data against accidental or unlawful destruction, loss, alteration, unauthorised disclosure or access. Those measures are selected taking into account the nature, scope, context and purposes of the processing and the risks to individuals, and may include access controls, authentication, encryption and other technical or organisational safeguards where appropriate.`),
      p(`This public Notice does not describe sensitive security configurations where disclosure could undermine those safeguards.`),
    ].join("\n"),
  });

  // 15 ────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    if (isUK) {
      const icoUrl = fmt("uk_ico_complaint") || "https://ico.org.uk/make-a-complaint/";
      parts.push(p(`You have the right to lodge a complaint with the Information Commissioner (Article 77 of the UK GDPR): <strong>Information Commissioner's Office (ICO)</strong>, <a href="${esc(icoUrl)}">${esc(icoUrl)}</a>. You may contact the Commissioner directly; we would also welcome the opportunity to address your concerns first.`));
    } else {
      const dpaContact = fmt("gdpr_dpa_contact");
      const matched = EU_SUPERVISORY_AUTHORITIES.find(([country]) => estLower.includes(country));
      const authority = dpaContact
        ? `<strong>${esc(dpaContact)}</strong>`
        : matched
        ? `<strong>${esc(matched[1])}</strong>, <a href="${esc(matched[2])}">${esc(matched[2])}</a>`
        : fill("insert the name and contact details of the supervisory authority with jurisdiction over the controller");
      parts.push(p(`You have the right to lodge a complaint with a supervisory authority, in particular in the Member State of your habitual residence, place of work or place of the alleged infringement (Article 77 of the GDPR). The supervisory authority with jurisdiction over us is: ${authority}. You may contact that authority directly; depending on the circumstances, another supervisory authority may also be competent to receive your complaint.`));
    }
    sections.push({ title: isUK ? "Complaints to the Information Commissioner" : "Complaints to a Supervisory Authority", html: parts.join("\n") });
  }

  // 16 ────────────────────────────────────────────────────────────────────
  sections.push({
    title: "Changes to This Privacy Notice",
    html: [
      p(`We may update this Privacy Notice from time to time to reflect changes in our processing activities, services, legal obligations or other relevant circumstances. When we update this Notice, we will change the last-updated date shown at the beginning of the document, and where a change materially affects how we process personal data or the choices available to you, we will provide additional notice where appropriate.`),
      runIn("Last updated", esc(generatedAtHuman)),
      runIn("Effective date", fill("insert the effective date of this Notice")),
    ].join("\n"),
  });

  // 17 ────────────────────────────────────────────────────────────────────
  {
    const parts: string[] = [];
    parts.push(p(`If you have questions about this Privacy Notice or our processing of personal data, or if you wish to exercise a data protection right, contact:`));
    parts.push(p(`<strong>${controllerName}</strong><br>${controllerAddress}<br>Email: ${contactEmail}`));
    if (dpoYes) parts.push(runIn("Data Protection Officer", `${dpoName}, ${dpoEmail}`));
    if (repNeeded) parts.push(runIn(isUK ? "UK representative" : "EU representative", repLine));
    sections.push({ title: "Contact Us", html: parts.join("\n") });
  }

  const keyPoints: EuKeyPointsBag = {
    controller: controllerNameText,
    categories,
    purposes,
    basis: bases,
    recipients,
    transfers: transfersYes,
    retention,
    contactEmail: contactEmailText,
  };

  return { lawName, controllerName: controllerNameText || "", contactEmail: contactEmailText || "", intro, glance, sections, keyPoints };
}
