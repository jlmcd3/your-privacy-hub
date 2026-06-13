// supabase/functions/generate-eu-notice/index.ts
//
// Generates per-framework EU & Global privacy notices (HTML) from an
// eu_notice_session's answers + framework selections, uploads each file to
// the private `eu-notices` storage bucket, and atomically commits document
// rows + session status via the commit_eu_notice_generation RPC.
//
// Auth: requires a valid Supabase JWT. Ownership is enforced via
// public.owns_client() called as the requesting user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface RequestBody {
  session_id?: string;
  idempotency_key?: string;
}

interface SessionRow {
  id: string;
  client_id: string;
  status: string;
  scope: string | null;
  version_number: number | null;
}

export interface FwSel {
  framework_code: string;
  framework_name: string;
  region: string;
}

interface AnswerRow {
  question_key: string;
  answer_value: unknown;
}

const FRAMEWORK_FULL_NAMES: Record<string, string> = {
  EU_GDPR: "EU General Data Protection Regulation (GDPR)",
  UK_GDPR: "UK General Data Protection Regulation (UK GDPR)",
  CH_FADP: "Swiss Federal Act on Data Protection (FADP)",
  BR_LGPD: "Brazil Lei Geral de Proteção de Dados (LGPD)",
  JP_APPI: "Japan Act on the Protection of Personal Information (APPI)",
  IN_DPDPA: "India Digital Personal Data Protection Act (DPDPA)",
  ZA_POPIA: "South Africa Protection of Personal Information Act (POPIA)",
  CA_PIPEDA:
    "Canada Personal Information Protection and Electronic Documents Act (PIPEDA)",
  AU_PRIVACY: "Australia Privacy Act 1988",
  KR_PIPA: "South Korea Personal Information Protection Act (PIPA)",
  SG_PDPA: "Singapore Personal Data Protection Act (PDPA)",
  AE_PDPL: "UAE Personal Data Protection Law (PDPL)",
};

// ---------------------------------------------------------------------------
// (a) Multi-select label map.
// Mirrors values in src/data/eu-notice-questions/universal-questions.ts.
// Keep in sync if option codes change. The unit test in
// `index.test.ts` exercises every key used by buildNoticeHtml so a missing
// entry shows up immediately as a raw code in the test fixture.
// ---------------------------------------------------------------------------

const OPTION_LABELS: Record<string, Record<string, string>> = {
  processing_purposes: {
    service_delivery: "Service or product delivery",
    account_management: "Account management",
    marketing: "Marketing communications",
    analytics: "Analytics and product improvement",
    advertising: "Advertising / behavioural ads",
    legal_compliance: "Legal and regulatory compliance",
    security: "Security and fraud prevention",
    research: "Research and development",
    payment: "Payment processing",
    other: "Other",
  },
  data_categories: {
    identifiers: "Identifiers (name, email, IP, account ID)",
    commercial: "Commercial information (purchases, transactions)",
    internet_activity: "Internet or network activity (cookies, usage)",
    geolocation: "Geolocation data",
    audio_visual: "Audio, visual, or electronic recordings",
    professional: "Professional or employment information",
    education: "Education information",
    financial: "Financial data (account / payment numbers)",
    health_medical: "Health or medical data",
    biometric: "Biometric data",
    race_ethnicity: "Racial or ethnic origin",
    religion: "Religious beliefs",
    sexual_orientation: "Sexual orientation or gender identity",
    political_opinions: "Political opinions",
    trade_union: "Trade union membership",
    criminal: "Criminal convictions or offences",
    children: "Children's data (under 16 / under 18)",
  },
  lawful_basis: {
    consent: "Consent (Art.6(1)(a))",
    contract: "Contractual necessity (Art.6(1)(b))",
    legal_obligation: "Legal obligation (Art.6(1)(c))",
    vital_interests: "Vital interests (Art.6(1)(d))",
    public_task: "Public task (Art.6(1)(e))",
    legitimate_interests: "Legitimate interests (Art.6(1)(f))",
  },
  third_party_recipients: {
    service_providers: "Service providers (hosting, payments, email)",
    analytics: "Analytics and measurement providers",
    advertising: "Advertising and marketing partners",
    regulators: "Regulators or law-enforcement",
    affiliates: "Affiliated group companies",
    other: "Other",
  },
  transfer_safeguards: {
    adequacy: "Adequacy decision",
    sccs: "Standard Contractual Clauses (SCCs)",
    bcrs: "Binding Corporate Rules (BCRs)",
    uk_addendum: "UK International Data Transfer Addendum",
    derogations: "Derogations (Art.49)",
    other: "Other safeguard",
  },
};

export function escapeHtml(s: unknown): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Convert a stored answer value into a human-readable string.
 * - For multi-select questions, looks up each code in OPTION_LABELS.
 * - For yes/no questions, returns the raw token (callers test with === "yes").
 * - Falls back to JSON for unknown shapes.
 */
export function formatAnswer(questionKey: string, value: unknown): string {
  if (value == null) return "";
  const labelMap = OPTION_LABELS[questionKey];

  const humanizeToken = (k: string): string => {
    if (!k) return k;
    const spaced = k.replace(/_/g, " ").trim();
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  };

  if (Array.isArray(value)) {
    const labels = value.map((v) => {
      const k = String(v);
      return labelMap?.[k] ?? humanizeToken(k);
    });
    return labels.join(", ");
  }
  if (typeof value === "string") {
    return labelMap?.[value] ?? humanizeToken(value);
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

/** Raw token comparator (multi-select arrays are flattened to a Set lookup). */
function answerToken(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(String).join(",");
  if (typeof value === "string") return value;
  return String(value);
}

export interface BuildNoticeOptions {
  fw: FwSel;
  answers: Record<string, unknown>;
  generatedAtHuman: string;
}

interface NoticeSection {
  title: string;
  html: string;
}

/**
 * Build the body sections of a notice (without the <!doctype>/<html> wrapper).
 * Returned as a list so callers can compose either a standalone document or a
 * combined international notice without regex-stripping HTML.
 */
export function buildNoticeSections(opts: BuildNoticeOptions): {
  lawName: string;
  controllerName: string;
  contactEmail: string;
  intro: string;
  sections: NoticeSection[];
} {
  const { fw, answers, generatedAtHuman } = opts;
  const lawName = FRAMEWORK_FULL_NAMES[fw.framework_code] ?? fw.framework_name;
  const controllerName = formatAnswer("controller_name", answers["controller_name"]) || "[Controller name]";
  const controllerAddress = formatAnswer("controller_address", answers["controller_address"]) || "";
  const contactEmail = formatAnswer("contact_email", answers["contact_email"]) || "[contact email]";
  const dpoYes = answerToken(answers["dpo_details"]) === "yes";
  const dpoName = formatAnswer("dpo_name", answers["dpo_name"]);
  const dpoEmail = formatAnswer("dpo_email", answers["dpo_email"]);
  const purposes = formatAnswer("processing_purposes", answers["processing_purposes"]) || "—";
  const categories = formatAnswer("data_categories", answers["data_categories"]) || "—";
  const lawfulBasis = formatAnswer("lawful_basis", answers["lawful_basis"]) || "—";
  const recipients = formatAnswer("third_party_recipients", answers["third_party_recipients"]) || "—";
  const transfersYes = answerToken(answers["transfer_outside_eea"]) === "yes";
  const safeguards = formatAnswer("transfer_safeguards", answers["transfer_safeguards"]);
  const retention = formatAnswer("retention_period", answers["retention_period"]) || "Not specified";
  const automatedYes = answerToken(answers["automated_decisions"]) === "yes";

  // GDPR-style frameworks use the formal "Data Protection Officer" title;
  // non-GDPR frameworks (PIPEDA, APPI, PIPA, PDPA, etc.) use "Privacy Officer".
  const isGdprFamily =
    fw.framework_code === "EU_GDPR" || fw.framework_code === "UK_GDPR";
  const officerTitle = isGdprFamily ? "Data Protection Officer" : "Privacy Officer";

  // Identify which special categories (Art 9) are actually present in the
  // answers, so we can produce a specific Art 9(2) condition list rather than
  // a generic "typically your explicit consent" sentence.
  const dataCatRaw = answers["data_categories"];
  const dataCatArr = Array.isArray(dataCatRaw) ? dataCatRaw.map(String) : [];
  const SPECIAL_CAT_TO_ART9: Record<string, string> = {
    health_medical: "health data — Art.9(2)(a) explicit consent or 9(2)(h) preventive/occupational medicine, medical diagnosis, or healthcare provision",
    biometric: "biometric data for unique identification — Art.9(2)(a) explicit consent (default) or 9(2)(g) substantial public interest where laid down by law",
    race_ethnicity: "racial or ethnic origin — Art.9(2)(a) explicit consent",
    religion: "religious beliefs — Art.9(2)(a) explicit consent or 9(2)(d) processing by a not-for-profit body",
    sexual_orientation: "sexual orientation — Art.9(2)(a) explicit consent",
    political_opinions: "political opinions — Art.9(2)(a) explicit consent or 9(2)(d) processing by a not-for-profit body",
    trade_union: "trade union membership — Art.9(2)(b) employment / social security law or 9(2)(d) trade union processing",
    criminal: "criminal convictions or offences — processed under Art.10 (controlled by official authority or authorised by law)",
  };
  const specialCatsPresent = dataCatArr
    .map((c) => SPECIAL_CAT_TO_ART9[c])
    .filter(Boolean);

  const intro = `<p>This notice explains how <strong>${escapeHtml(controllerName)}</strong> processes personal data under the ${escapeHtml(lawName)}. Last updated: ${escapeHtml(generatedAtHuman)}.</p>`;

  const sections: NoticeSection[] = [];

  sections.push({
    title: "Who we are",
    html: `<p><strong>${escapeHtml(controllerName)}</strong>${controllerAddress ? `, ${escapeHtml(controllerAddress)}` : ""}.</p>
<p>You can contact us about this notice at <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>.</p>${
      dpoYes
        ? `\n<p>Our ${escapeHtml(officerTitle)} can be reached at ${dpoName ? `<strong>${escapeHtml(dpoName)}</strong>, ` : ""}<a href="mailto:${escapeHtml(dpoEmail || contactEmail)}">${escapeHtml(dpoEmail || contactEmail)}</a>.</p>`
        : ""
    }`,
  });

  sections.push({ title: "Personal data we process", html: `<p>${escapeHtml(categories)}</p>` });
  sections.push({ title: "Purposes of processing", html: `<p>${escapeHtml(purposes)}</p>` });

  // Lawful-basis-to-purpose mapping: when the user supplied both purposes and
  // bases, render a per-basis explanation that maps each basis to the
  // purposes it most plausibly supports. This avoids the prior generic
  // "we rely on the following lawful basis or bases" list with no linkage.
  const basisRaw = answers["lawful_basis"];
  const basisArr = Array.isArray(basisRaw) ? basisRaw.map(String) : (basisRaw ? [String(basisRaw)] : []);
  const BASIS_PURPOSE_HINT: Record<string, string> = {
    consent: "Marketing communications, optional analytics/advertising cookies, and any optional features you opt into.",
    contract: "Service or product delivery, account management, and payment processing where these are needed to perform our contract with you.",
    legal_obligation: "Legal and regulatory compliance, tax/accounting records, and responding to lawful regulator requests.",
    vital_interests: "Limited safety-critical processing where it is needed to protect a person's life or physical integrity.",
    public_task: "Processing carried out in the exercise of official authority or a task in the public interest, where applicable.",
    legitimate_interests: "Security and fraud prevention, service improvement analytics, and B2B relationship management — balanced against your rights and interests.",
  };
  const basisRows = basisArr
    .map((b) => {
      const label = OPTION_LABELS.lawful_basis?.[b] ?? b;
      const hint = BASIS_PURPOSE_HINT[b] ?? "";
      return `<li><strong>${escapeHtml(label)}</strong>${hint ? ` — ${escapeHtml(hint)}` : ""}</li>`;
    })
    .join("");

  const art9Html =
    isGdprFamily && specialCatsPresent.length > 0
      ? `\n<p>Because we process the following special category personal data, we additionally rely on a condition under <strong>Article 9(2)</strong> of the ${escapeHtml(lawName)}:</p>\n<ul>${specialCatsPresent.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>`
      : isGdprFamily
      ? `\n<p>If we process special category personal data (such as health, biometric, racial or ethnic origin, religious beliefs, trade union membership, sexual orientation, or political opinions), we will additionally rely on a condition under <strong>Article 9(2)</strong> of the ${escapeHtml(lawName)} — most commonly explicit consent under Art.9(2)(a).</p>`
      : "";

  sections.push({
    title: "Lawful basis",
    html: basisRows
      ? `<p>We rely on the following lawful basis (or bases) for our processing, mapped to the purposes above:</p>\n<ul>${basisRows}</ul>${art9Html}`
      : `<p>We rely on the following lawful basis (or bases) for our processing: ${escapeHtml(lawfulBasis)}.</p>${art9Html}`,
  });
  sections.push({
    title: "Recipients of personal data",
    html: `<p>We share personal data with the following categories of recipients: ${escapeHtml(recipients)}.</p>`,
  });

  // Representative (Art. 27): render only when establishment differs from the
  // framework's jurisdiction. We infer establishment from intake fields when
  // available; otherwise we render a placeholder so the controller addresses it.
  const establishment = formatAnswer("establishment_jurisdiction", answers["establishment_jurisdiction"]);
  const estLower = establishment.toLowerCase();
  const isEstEEA = /\b(eea|eu|austria|belgium|bulgaria|croatia|cyprus|czech|denmark|estonia|finland|france|germany|greece|hungary|ireland|italy|latvia|lithuania|luxembourg|malta|netherlands|poland|portugal|romania|slovakia|slovenia|spain|sweden|iceland|liechtenstein|norway)\b/.test(estLower);
  const isEstUK = /\b(uk|united kingdom|england|scotland|wales|northern ireland)\b/.test(estLower);
  if (fw.framework_code === "UK_GDPR" && !isEstUK) {
    const ukRepName = formatAnswer("uk_rep_name", answers["uk_rep_name"]);
    const ukRepContact = formatAnswer("uk_rep_contact", answers["uk_rep_contact"]);
    sections.push({
      title: "UK representative",
      html: ukRepName
        ? `<p>Our UK representative under UK GDPR Art. 27 is <strong>${escapeHtml(ukRepName)}</strong>${ukRepContact ? ` — ${escapeHtml(ukRepContact)}` : ""}.</p>`
        : `<p>If your organisation is not established in the UK, a UK representative under UK GDPR Art. 27 may be required — confirm this requirement with your legal counsel. If established in the UK, no UK representative is needed.</p>`,
    });
  }
  if (fw.framework_code === "EU_GDPR" && !isEstEEA) {
    const euRepName = formatAnswer("eu_rep_name", answers["eu_rep_name"]);
    const euRepContact = formatAnswer("eu_rep_contact", answers["eu_rep_contact"]);
    sections.push({
      title: "EU representative",
      html: euRepName
        ? `<p>Our EU representative under GDPR Art. 27 is <strong>${escapeHtml(euRepName)}</strong>${euRepContact ? ` — ${escapeHtml(euRepContact)}` : ""}.</p>`
        : `<p>[EU representative to be appointed — required under GDPR Art. 27 unless an exemption applies.]</p>`,
    });
  }

  if (transfersYes) {
    const destCountries = formatAnswer("transfer_destinations", answers["transfer_destinations"]) ||
      formatAnswer("transfer_countries", answers["transfer_countries"]) ||
      "[destination countries to be specified]";
    const adequacyNote = formatAnswer("adequacy_status", answers["adequacy_status"]);
    const dpiaRef = formatAnswer("transfer_impact_assessment", answers["transfer_impact_assessment"]);
    sections.push({
      title: "International transfers",
      html: `<p>We transfer personal data outside the relevant jurisdiction to recipients in: ${escapeHtml(destCountries)}.</p>
<p>Our safeguards under Art. 46 GDPR: ${escapeHtml(safeguards || "Standard Contractual Clauses (SCCs) or equivalent")}.</p>
${adequacyNote ? `<p>Adequacy status: ${escapeHtml(adequacyNote)}.</p>` : ""}
${dpiaRef ? `<p>Transfer impact assessment: ${escapeHtml(dpiaRef)}.</p>` : `<p>Where adequacy is not relied upon, a Transfer Impact Assessment is maintained and available on request.</p>`}
<p>You may request a copy of the safeguards by contacting us at <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>.</p>`,
    });
  }

  sections.push({ title: "Retention", html: `<p>${escapeHtml(retention)}</p>` });

  const complaintHtml = fw.framework_code === "UK_GDPR"
    ? `<p>You also have the right to lodge a complaint with the supervisory authority. In the United Kingdom, this is the <strong>Information Commissioner's Office (ICO)</strong> — <a href="https://ico.org.uk">ico.org.uk</a>.</p>`
    : fw.framework_code === "EU_GDPR"
    ? `<p>You also have the right to lodge a complaint with your national data protection authority (your supervisory authority under the GDPR). For organisations established in Ireland, this is the <strong>Data Protection Commission (DPC)</strong> — <a href="https://www.dataprotection.ie">dataprotection.ie</a>. For other EU/EEA Member States, contact the supervisory authority where you live, work, or where the alleged infringement took place.</p>`
    : fw.framework_code === "CH_FADP"
    ? `<p>You also have the right to lodge a complaint with the Swiss <strong>Federal Data Protection and Information Commissioner (FDPIC / EDÖB)</strong> — <a href="https://www.edoeb.admin.ch">edoeb.admin.ch</a>. Note that the revised FADP (in force 1 September 2023) does not provide for administrative fines on companies but does authorise criminal sanctions against responsible individuals for specific breaches (Art. 60–63 FADP) and requires controllers to maintain a register of processing activities, conduct DPIAs for high-risk processing, and report breaches to the FDPIC as soon as possible.</p>`
    : `<p>You also have the right to lodge a complaint with the relevant supervisory authority in your jurisdiction.</p>`;

  const consentSelected = basisArr.includes("consent");
  const rightsList = isGdprFamily
    ? `<ul>
        <li><strong>Access</strong> (Art. 15) — obtain confirmation and a copy of your personal data.</li>
        <li><strong>Rectification</strong> (Art. 16) — have inaccurate data corrected.</li>
        <li><strong>Erasure</strong> (Art. 17) — request deletion where the conditions apply.</li>
        <li><strong>Restriction</strong> (Art. 18) — limit how we process your data in specified circumstances.</li>
        <li><strong>Portability</strong> (Art. 20) — receive your data in a structured, commonly used, machine-readable format.</li>
        <li><strong>Object</strong> (Art. 21) — including absolute right to object to direct marketing.</li>
        ${consentSelected ? `<li><strong>Withdraw consent</strong> at any time, without affecting the lawfulness of processing before withdrawal (Art. 13(2)(c)).</li>` : ""}
        <li><strong>Not be subject to solely automated decisions</strong> with legal or similarly significant effects (Art. 22).</li>
      </ul>
      <p>We will respond to verified requests without undue delay and within one month (Art. 12(3)), extendable by a further two months for complex requests.</p>`
    : `<p>Under the ${escapeHtml(lawName)}, you have rights including access, rectification, erasure, restriction, portability, and objection.</p>`;

  sections.push({
    title: "Your rights",
    html: `${rightsList}\n${complaintHtml}`,
  });

  if (automatedYes) {
    sections.push({
      title: "Automated decision-making",
      html: `<p>We use automated decision-making with legal or similarly significant effects. You have the right to obtain human intervention, express your point of view, and contest the decision.</p>`,
    });
  }

  return { lawName, controllerName, contactEmail, intro, sections };
}


function renderSections(sections: NoticeSection[], startNumber = 1): string {
  return sections
    .map(
      (s, i) =>
        `<h2>${startNumber + i}. ${escapeHtml(s.title)}</h2>\n${s.html}`,
    )
    .join("\n");
}

export function buildNoticeHtml(opts: BuildNoticeOptions): string {
  const { fw, generatedAtHuman } = opts;
  const { lawName, controllerName, intro, sections } = buildNoticeSections(opts);

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${escapeHtml(fw.framework_name)} Privacy Notice — ${escapeHtml(controllerName)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 760px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; line-height: 1.55; }
  h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.15rem; margin-top: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
  .meta { color: #666; font-size: 0.85rem; margin-bottom: 2rem; }
  .badge { display: inline-block; background: #f0f0f0; padding: 0.15rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; }
  footer { color: #888; font-size: 0.75rem; margin-top: 3rem; border-top: 1px solid #eee; padding-top: 1rem; }
</style></head><body>
<h1>${escapeHtml(fw.framework_name)} Privacy Notice</h1>
<div class="meta">
  <span class="badge">${escapeHtml(lawName)}</span>
  &nbsp;·&nbsp; Last updated: ${escapeHtml(generatedAtHuman)}
</div>
${intro}
${renderSections(sections, 1)}
<footer>
  Generated by EndUserPrivacy.com. This notice is a starting template based on your inputs and is not legal advice. Review with qualified counsel before publishing.
</footer>
</body></html>`;
}

export function buildCombinedHtml(
  controllerName: string,
  contactEmail: string,
  fws: FwSel[],
  answers: Record<string, unknown>,
  generatedAtHuman: string,
): string {
  const tocHtml = fws
    .map(
      (f) =>
        `<li><a href="#${escapeHtml(f.framework_code)}" style="color:#1d4ed8;">${escapeHtml(f.framework_name)}</a> — <span style="color:#666;font-size:0.85rem;">${escapeHtml(FRAMEWORK_FULL_NAMES[f.framework_code] ?? f.framework_name)}</span></li>`,
    )
    .join("");

  const sectionsHtml = fws
    .map((f) => {
      const built = buildNoticeSections({ fw: f, answers, generatedAtHuman });
      return `<a id="${escapeHtml(f.framework_code)}"></a>
<h2 style="font-size:1.4rem;margin-top:2.5rem;">${escapeHtml(f.framework_name)}</h2>
${built.intro}
${renderSections(built.sections, 1)}`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>International Privacy Notice — ${escapeHtml(controllerName)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 820px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; line-height: 1.55; }
  h1 { font-size: 1.9rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.15rem; margin-top: 2rem; border-bottom: 1px solid #ddd; padding-bottom: 0.25rem; }
  h3 { font-size: 1rem; margin-top: 1.5rem; }
  .meta { color: #666; font-size: 0.85rem; margin-bottom: 2rem; }
  ul.toc { background:#f9fafb;border:1px solid #e5e7eb;padding:1rem 1.25rem 1rem 2.25rem;border-radius:0.5rem; }
  footer { color: #888; font-size: 0.75rem; margin-top: 3rem; border-top: 1px solid #eee; padding-top: 1rem; }
</style></head><body>
<h1>International Privacy Notice</h1>
<div class="meta">${escapeHtml(controllerName)} · Last updated: ${escapeHtml(generatedAtHuman)} · ${fws.length} framework${fws.length === 1 ? "" : "s"}</div>
<p>This notice consolidates the privacy disclosures ${escapeHtml(controllerName)} maintains across each privacy framework listed below. Use the table of contents to jump to the section that applies to you. To exercise your rights, contact us at <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>.</p>
<h2>Table of contents</h2>
<ul class="toc">${tocHtml}</ul>
${sectionsHtml}
<footer>Generated by EndUserPrivacy.com. This combined notice is a starting template based on your inputs and is not legal advice. Review with qualified counsel before publishing.</footer>
</body></html>`;
}

// ---------------------------------------------------------------------------
// HTTP handler
// ---------------------------------------------------------------------------

// (c) Statuses we'll allow generation from. 'generated' is included so the
// user can regenerate after editing (the new version supersedes the prior
// current docs via the RPC).
const ALLOWED_STATUSES = [
  "in_progress",
  "questions_complete",
  "review",
  "generated",
  "failed",
];

// Simple in-memory idempotency cache (per warm instance). Keyed by
// `${session_id}:${idempotency_key}`. Cold starts naturally evict — RPC
// row-lock + version-collision check is the durable guarantee.
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;
const idempotencyCache = new Map<string, { at: number; body: string }>();

function checkIdempotency(key: string): string | null {
  const entry = idempotencyCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > IDEMPOTENCY_TTL_MS) {
    idempotencyCache.delete(key);
    return null;
  }
  return entry.body;
}

function rememberIdempotency(key: string, body: string) {
  idempotencyCache.set(key, { at: Date.now(), body });
  // Naive cleanup
  if (idempotencyCache.size > 200) {
    const cutoff = Date.now() - IDEMPOTENCY_TTL_MS;
    for (const [k, v] of idempotencyCache) {
      if (v.at < cutoff) idempotencyCache.delete(k);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: RequestBody;
    try {
      body = (await req.json()) as RequestBody;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sessionId = body.session_id;
    if (!sessionId || typeof sessionId !== "string") {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // (c) Idempotency
    if (body.idempotency_key && typeof body.idempotency_key === "string") {
      const cached = checkIdempotency(`${sessionId}:${body.idempotency_key}`);
      if (cached) {
        return new Response(cached, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "X-Idempotent-Replay": "true",
          },
        });
      }
    }

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: session, error: sessionErr } = await admin
      .from("eu_notice_sessions")
      .select("id, client_id, status, scope, version_number")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionRow = session as SessionRow;

    // (c) Pre-check status — the RPC will re-validate under lock.
    if (!ALLOWED_STATUSES.includes(sessionRow.status)) {
      return new Response(
        JSON.stringify({
          error: `Cannot generate from status '${sessionRow.status}'`,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: ownsData, error: ownsErr } = await userClient.rpc("owns_client", {
      _client_id: sessionRow.client_id,
    });
    if (ownsErr || ownsData !== true) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    // ── Background-dispatch boundary ─────────────────────────────────────
    // Transition the row to 'generating' so the UI/poller sees progress and
    // duplicate POSTs hit the ALLOWED_STATUSES pre-check.
    const { error: markErr } = await admin
      .from("eu_notice_sessions")
      .update({ status: "generating", generation_error: null })
      .eq("id", sessionId);
    if (markErr) throw markErr;

    const responseBody = JSON.stringify({
      ok: true,
      session_id: sessionId,
      status: "generating",
    });

    if (body.idempotency_key) {
      rememberIdempotency(`${sessionId}:${body.idempotency_key}`, responseBody);
    }

    const failSession = async (message: string) => {
      try {
        await admin
          .from("eu_notice_sessions")
          .update({
            status: "failed",
            generation_error: message.slice(0, 300),
          })
          .eq("id", sessionId);
      } catch (e) {
        console.error("[generate-eu-notice] failed to mark session failed", e);
      }
    };

    EdgeRuntime.waitUntil((async () => {
      console.log(`[generate-eu-notice] background start session=${sessionId}`);
      try {
        const [fwRes, ansRes] = await Promise.all([
          admin
            .from("eu_notice_framework_selections")
            .select("framework_code, framework_name, region")
            .eq("session_id", sessionId),
          admin
            .from("eu_notice_answers")
            .select("question_key, answer_value")
            .eq("session_id", sessionId)
            .is("ropa_activity_id", null),
        ]);
        if (fwRes.error) throw fwRes.error;
        if (ansRes.error) throw ansRes.error;

        const fws = (fwRes.data ?? []) as FwSel[];
        if (fws.length === 0) {
          await failSession("No frameworks selected");
          return;
        }

        const answers: Record<string, unknown> = {};
        for (const r of (ansRes.data ?? []) as AnswerRow[]) {
          answers[r.question_key] = r.answer_value;
        }

        const nextVersion = (sessionRow.version_number ?? 0) + 1;
        const generatedAtIso = new Date().toISOString();
        const generatedAtHuman = new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const docsManifest: {
          framework_code: string;
          is_combined: boolean;
          file_path: string;
          file_size_bytes: number;
          document_format: string;
        }[] = [];

        if (fws.length > 1) {
          const controllerName = formatAnswer("controller_name", answers["controller_name"]) || "[Controller name]";
          const contactEmail = formatAnswer("contact_email", answers["contact_email"]) || "[contact email]";
          const combinedHtml = buildCombinedHtml(
            controllerName,
            contactEmail,
            fws,
            answers,
            generatedAtHuman,
          );
          const combinedBytes = new TextEncoder().encode(combinedHtml);
          const combinedPath = `${sessionRow.client_id}/${sessionId}/v${nextVersion}/_international.html`;
          const { error: upErr } = await admin.storage
            .from("eu-notices")
            .upload(combinedPath, combinedBytes, {
              contentType: "text/html; charset=utf-8",
              upsert: true,
            });
          if (upErr) throw upErr;
          docsManifest.push({
            framework_code: "_INTERNATIONAL",
            is_combined: true,
            file_path: combinedPath,
            file_size_bytes: combinedBytes.byteLength,
            document_format: "html",
          });
        }

        for (const fw of fws) {
          const html = buildNoticeHtml({ fw, answers, generatedAtHuman });
          const bytes = new TextEncoder().encode(html);
          const path = `${sessionRow.client_id}/${sessionId}/v${nextVersion}/${fw.framework_code}.html`;
          const { error: upErr } = await admin.storage
            .from("eu-notices")
            .upload(path, bytes, {
              contentType: "text/html; charset=utf-8",
              upsert: true,
            });
          if (upErr) throw upErr;
          docsManifest.push({
            framework_code: fw.framework_code,
            is_combined: false,
            file_path: path,
            file_size_bytes: bytes.byteLength,
            document_format: "html",
          });
        }

        const { error: commitErr } = await admin.rpc(
          "commit_eu_notice_generation",
          {
            _session_id: sessionId,
            _expected_status: [...ALLOWED_STATUSES, "generating"],
            _new_version: nextVersion,
            _docs: docsManifest,
            _generated_at: generatedAtIso,
          },
        );

        if (commitErr) {
          const msg = commitErr.message ?? "";
          if (msg.includes("invalid_status")) {
            await failSession("Session status changed; please retry.");
            return;
          }
          if (msg.includes("version_collision")) {
            await failSession("Another generation finished first; please reload.");
            return;
          }
          throw commitErr;
        }

        console.log(`[generate-eu-notice] background finish session=${sessionId} v=${nextVersion}`);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Internal error";
        console.error(`[generate-eu-notice] background failure session=${sessionId}`, e);
        await failSession(message);
      }
    })());

    return new Response(responseBody, {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[generate-eu-notice] error", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
