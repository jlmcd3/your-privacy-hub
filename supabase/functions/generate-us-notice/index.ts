// supabase/functions/generate-us-notice/index.ts
//
// Generates per-state US privacy notices (HTML) from a us_notice_session's
// answers + state selections, uploads each file to the private `us-notices`
// storage bucket, records rows in us_notice_documents, and marks the session
// as completed.
//
// Auth: requires a valid Supabase JWT. Ownership is enforced via
// public.owns_client() called as the requesting user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { REPORT_DISCLAIMER } from "../_shared/report-disclaimer.ts";
import { verifyCaller } from "../_shared/verify-caller.ts";


const LOGO_URL = `${Deno.env.get("SITE_URL") || "https://enduserprivacy.com"}/logo.png`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Machine-checkable manifest of statutory assertions carried by the hardcoded
// templates below. lint-deterministic-legal-text resolves each `citation`
// against the corpus (cppa_authorities) and verifies every `mustContain`
// phrase appears in the corpus full_text. Update the shared module alongside
// any template edit that changes a statutory claim.
import { US_NOTICE_LEGAL_TEXT_ASSERTIONS } from "../_shared/legal-text-assertions.ts";
export const LEGAL_TEXT_ASSERTIONS = US_NOTICE_LEGAL_TEXT_ASSERTIONS;



interface RequestBody {
  session_id?: string;
}

interface SessionRow {
  id: string;
  client_id: string;
  status: string;
  scope: string | null;
  version_number: number | null;
}

interface StateRow {
  state_code: string;
  state_name: string;
  framework_type: string;
}

interface AnswerRow {
  question_key: string;
  answer_value: unknown;
}

const FRAMEWORK_LABELS: Record<string, string> = {
  ccpa: "California Consumer Privacy Act (CCPA/CPRA)",
  virginia_model: "Virginia-model state privacy law",
  maryland: "Maryland Online Data Privacy Act (MODPA)",
  florida: "Florida Digital Bill of Rights (FDBR)",
  pending: "Pending state privacy law",
};

const STATE_LAW_NAMES: Record<string, { name: string; cite: string }> = {
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

function resolveLawLabel(state: StateRow): string {
  const named = STATE_LAW_NAMES[state.state_code];
  if (named) return named.name;
  return FRAMEWORK_LABELS[state.framework_type] ?? state.state_name + " state privacy law";
}
function resolveLawCite(state: StateRow): string {
  return STATE_LAW_NAMES[state.state_code]?.cite ?? "";
}

function escapeHtml(s: unknown): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function answerString(value: unknown): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function buildNoticeHtml(
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
  const retention = answerString(answers["retention_general"]) || "Not specified";

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

  <p>This notice explains how <strong>${escapeHtml(businessName)}</strong> collects, uses, and shares the personal information of ${escapeHtml(state.state_name)} residents, and the rights they have under the ${escapeHtml(resolveLawLabel(state))}.</p>
  ${businessDesc ? `<p>${escapeHtml(businessDesc)}</p>` : ""}

  <h2>1. Information we collect</h2>
  <p>${escapeHtml(dataCategories)}</p>

  <h2>2. How we use this information</h2>
  <p>${escapeHtml(purposes)}</p>

  ${state.framework_type === "ccpa" ? `<h2>2a. Where we get this information</h2>
  <p>We collect personal information from the following categories of sources:</p>
  <ul>
    <li><strong>Directly from you</strong> — when you create an account, make a purchase, contact us, or otherwise provide information to us.</li>
    <li><strong>Automatically</strong> — when you use our website, app, or services, through cookies, log files, and similar technologies.</li>
    <li><strong>From third parties</strong> — such as service providers, business partners, data analytics providers, and publicly available sources, to the extent applicable to our operations.</li>
  </ul>` : ""}

  <h2>3. Sharing with third parties</h2>
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

  <h2>4. How long we keep your information</h2>
  <p>${escapeHtml(retention)}</p>

  <h2>5. Your rights</h2>
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
  </p>`
  }

  <h2>6. How to contact us</h2>
  <p>To exercise any of these rights or for questions about this notice, contact us at <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>.</p>

  ${showFooter ? `<footer>Generated by <strong>EndUserPrivacy</strong> · enduserprivacy.com ·
${REPORT_DISCLAIMER}</footer>` : ""}
</body>
</html>`;
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

    
    const caller = await verifyCaller(req);
    if (!caller.userId && !caller.internal) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") || "";
    // For non-internal callers, we use a user-scoped client for owns_client RPC.
    const userClient = caller.internal
      ? null
      : createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authHeader } },
        });


    // Parse + validate body.
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

    // Service-role client for privileged reads/writes.
    const admin = createClient(supabaseUrl, serviceKey);

    // Load session.
    const { data: session, error: sessionErr } = await admin
      .from("us_notice_sessions")
      .select("id, client_id, status, scope, version_number")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check ownership: internal callers (service-role) bypass; otherwise try RPC, then fall back to admin check.
    let ownsClient = caller.internal;
    if (!ownsClient && userClient) {
      try {
        const { data: ownsData, error: ownsErr } = await userClient.rpc(
          "owns_client",
          { _client_id: (session as SessionRow).client_id },
        );
        if (!ownsErr) ownsClient = ownsData === true;
      } catch { /* fall through to admin check */ }
    }

    if (!ownsClient && caller.userId) {
      const { data: clientCheck } = await admin
        .from("clients")
        .select("id")
        .eq("id", (session as SessionRow).client_id)
        .eq("owner_id", caller.userId)
        .maybeSingle();
      ownsClient = !!clientCheck;
    }


    if (!ownsClient) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load states + answers in parallel.
    const [statesRes, answersRes] = await Promise.all([
      admin
        .from("us_notice_state_selections")
        .select("state_code, state_name, framework_type")
        .eq("session_id", sessionId),
      admin
        .from("us_notice_answers")
        .select("question_key, answer_value")
        .eq("session_id", sessionId),
    ]);

    if (statesRes.error) throw statesRes.error;
    if (answersRes.error) throw answersRes.error;

    const states = ((statesRes.data ?? []) as StateRow[]).sort((a, b) => {
      // California first (most comprehensive law, consumers read it first).
      // All other states follow alphabetically by state name.
      if (a.state_code === "CA") return -1;
      if (b.state_code === "CA") return 1;
      return a.state_name.localeCompare(b.state_name);
    });
    if (states.length === 0) {
      return new Response(
        JSON.stringify({ error: "No states selected for this session" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const answers: Record<string, unknown> = {};
    for (const r of (answersRes.data ?? []) as AnswerRow[]) {
      answers[r.question_key] = r.answer_value;
    }

    // Mark previous current docs as not current (we're producing a new version).
    await admin
      .from("us_notice_documents")
      .update({ is_current: false })
      .eq("session_id", sessionId)
      .eq("is_current", true);

    const nextVersion = ((session as SessionRow).version_number ?? 0) + 1;
    const generatedAtIso = new Date().toISOString();
    const generatedAtHuman = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const generated: { state: string; path: string; size: number; combined?: boolean }[] = [];

    // ---------- Combined "all-states suite" master notice ----------
    // When the session covers multiple states, also produce a single master
    // notice that aggregates every per-state section into one document.
    const isSuite =
      ((session as SessionRow).scope === "all_states") || states.length > 1;

    if (isSuite) {
      const businessName = answerString(answers["business_name"]) || "[Business name]";
      const contactEmail = answerString(answers["contact_email"]) || "[contact email]";
      const sectionsHtml = states
        .map((s) => {
          const label = resolveLawLabel(s);
          return `<section style="margin-top:2.5rem;padding-top:1.5rem;border-top:2px solid #e5e7eb;">
  <h2 style="font-size:1.35rem;">${escapeHtml(s.state_name)}</h2>
  <p style="color:#666;font-size:0.85rem;margin-top:-0.25rem;">${escapeHtml(label)}</p>
  <p>This section applies to residents of <strong>${escapeHtml(s.state_name)}</strong>. ${escapeHtml(businessName)} honors the rights granted under ${escapeHtml(label)}, including access, correction, deletion, portability, and (where applicable) the right to opt out of sale, sharing, or targeted advertising.</p>
  <p>To exercise these rights as a ${escapeHtml(s.state_name)} resident, contact us at <a href="mailto:${escapeHtml(contactEmail)}">${escapeHtml(contactEmail)}</a>.</p>
</section>`;
        })
        .join("\n");

      const tocHtml = states
        .map(
          (s) =>
            `<li><a href="#${escapeHtml(s.state_code)}" style="color:#2d9b90;">${escapeHtml(s.state_name)}</a> — <span style="color:#5c6d7a;font-size:0.85rem;">${escapeHtml(resolveLawLabel(s))}</span></li>`,
        )
        .join("");

      const combinedHtml = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>US Privacy Notice Suite — ${escapeHtml(businessName)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 820px; margin: 2rem auto; padding: 0 1.5rem; color: #1a1a1a; line-height: 1.55; }
  .eup-bar { background:#0c2a44; padding:9px 1.5rem; display:flex; align-items:center;
    gap:12px; margin:-2rem -1.5rem 2rem -1.5rem; }
  .eup-bar img { height:22px; width:auto; display:block; }
  .eup-bar span { font-size:9px; font-weight:600; text-transform:uppercase;
    letter-spacing:0.12em; color:#93b5c6; }
  h1, h2 { color:#0c2a44; }
  h1 { font-size: 1.9rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.35rem; border-bottom: 2px solid #2d9b90; padding-bottom:0.25rem; }
  a { color:#2d9b90; }
  .meta { color:#5c6d7a; font-size: 0.85rem; margin-bottom: 2rem; }
  ul.toc { background:#edf2f5;border:1px solid #dde5ea;padding:1rem 1.25rem 1rem 2.25rem;border-radius:0.5rem; }
  .opt-out { background:#e5f4f2; border:1px solid #2d9b90; padding:1rem; border-radius:0.375rem; margin:1rem 0; }
  footer { color:#5c6d7a; font-size: 0.75rem; margin-top: 3rem; border-top: 2px solid #2d9b90; padding-top: 1rem; }
</style></head><body>
<div class="eup-bar">
  <img src="${LOGO_URL}" alt="End User Privacy" />
  <span>Privacy Intelligence</span>
</div>
<h1>US State Privacy Notice Suite</h1>
<div class="meta">${escapeHtml(businessName)} · Last updated: ${escapeHtml(generatedAtHuman)} · ${states.length} state${states.length === 1 ? "" : "s"} covered</div>
${states.length < 10
  ? `<div style="background:#fff8e1;border:1px solid #f59e0b;border-radius:0.375rem;padding:0.75rem 1rem;margin-bottom:1.5rem;font-size:0.85rem;color:#92400e;">
      <strong>Scope note:</strong> This suite covers ${states.length} state${states.length === 1 ? "" : "s"} (${states.map((s) => escapeHtml(s.state_name)).join(", ")}). As of 2024–2026, approximately 20 US states have enacted comprehensive privacy laws. This document does not constitute a complete US national privacy notice; the applicability of additional state laws depends on where your organisation directs business and processes residents' personal information, and further clarification is advisable.
    </div>`
  : ""
}
<p>This suite consolidates the privacy notices ${escapeHtml(businessName)} maintains for residents of each US state listed below. Each state's section incorporates the rights and disclosures required by that state's privacy law. Use the table of contents to jump to the section that applies to you.</p>
<h2>Table of contents</h2>
<ul class="toc">${tocHtml}</ul>
${states
  .map(
    (s) =>
      `<a id="${escapeHtml(s.state_code)}"></a>${
        // Reuse the per-state body sections so the suite stays consistent.
        buildNoticeHtml(s, answers, generatedAtHuman, false)
          .replace(/^[\s\S]*?<body>/, "")
          .replace(/<\/body>[\s\S]*$/, "")
          .replace(/<div class="eup-bar">[\s\S]*?<\/div>/, "")
          .replace(/<h1>[^<]*<\/h1>/, `<h2>${escapeHtml(s.state_name)} Privacy Notice</h2>`)
      }`,
  )
  .join("\n")}
<footer>Generated by <strong>EndUserPrivacy</strong> · enduserprivacy.com ·
${REPORT_DISCLAIMER}</footer>
</body></html>`;

      const combinedBytes = new TextEncoder().encode(combinedHtml);
      const combinedPath = `${(session as SessionRow).client_id}/${sessionId}/v${nextVersion}/_suite.html`;
      const { error: combinedUploadErr } = await admin.storage
        .from("us-notices")
        .upload(combinedPath, combinedBytes, {
          contentType: "text/html; charset=utf-8",
          upsert: true,
        });
      if (combinedUploadErr) {
        console.error("[generate-us-notice] combined upload error", combinedUploadErr);
        throw combinedUploadErr;
      }
      const { error: combinedInsertErr } = await admin.from("us_notice_documents").insert({
        session_id: sessionId,
        client_id: (session as SessionRow).client_id,
        state_code: null,
        framework_type: "pending",
        is_combined: true,
        version_number: nextVersion,
        document_format: "html",
        file_path: combinedPath,
        file_size_bytes: combinedBytes.byteLength,
        is_current: true,
        generated_at: generatedAtIso,
      });
      if (combinedInsertErr) {
        console.error("[generate-us-notice] combined insert error", combinedInsertErr);
        throw combinedInsertErr;
      }
      generated.push({ state: "_suite", path: combinedPath, size: combinedBytes.byteLength, combined: true });
    }

    for (const state of states) {
      const html = buildNoticeHtml(state, answers, generatedAtHuman);
      const bytes = new TextEncoder().encode(html);
      const path = `${(session as SessionRow).client_id}/${sessionId}/v${nextVersion}/${state.state_code}.html`;

      const { error: uploadErr } = await admin.storage
        .from("us-notices")
        .upload(path, bytes, {
          contentType: "text/html; charset=utf-8",
          upsert: true,
        });

      if (uploadErr) {
        console.error("[generate-us-notice] upload error", state.state_code, uploadErr);
        throw uploadErr;
      }

      const { error: insertErr } = await admin.from("us_notice_documents").insert({
        session_id: sessionId,
        client_id: (session as SessionRow).client_id,
        state_code: state.state_code,
        framework_type: state.framework_type,
        is_combined: false,
        version_number: nextVersion,
        document_format: "html",
        file_path: path,
        file_size_bytes: bytes.byteLength,
        is_current: true,
        generated_at: generatedAtIso,
      });

      if (insertErr) {
        console.error("[generate-us-notice] insert error", state.state_code, insertErr);
        throw insertErr;
      }

      generated.push({ state: state.state_code, path, size: bytes.byteLength });
    }

    // Update session.
    await admin
      .from("us_notice_sessions")
      .update({
        status: "completed",
        version_number: nextVersion,
        completed_at: generatedAtIso,
        last_activity_at: generatedAtIso,
      })
      .eq("id", sessionId);

    return new Response(
      JSON.stringify({
        ok: true,
        version: nextVersion,
        documents: generated,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("[generate-us-notice] error", err);
    const message = err instanceof Error ? err.message : "Internal error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
