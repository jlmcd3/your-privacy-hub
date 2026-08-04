// supabase/functions/generate-ropa-document/index.ts
//
// Generates a RoPA document (PDF + optional DOCX + optional XLSX) for a
// session, uploads each format to the private `ropa-documents` storage bucket,
// records the result in ropa_document_versions, marks the session as
// generated, and returns short-lived signed URLs.
//
// Auth: requires a valid Supabase JWT. Ownership of the underlying client is
// enforced via the public.owns_client() SECURITY DEFINER function (called as
// the requesting user).
//
// Library imports use esm.sh because npm/Node-only packages do not load in
// Deno. PDF rendering uses the configured PDF service.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { REPORT_DISCLAIMER, reportDisclaimerHtml } from "../_shared/report-disclaimer.ts";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  WidthType,
  BorderStyle,
} from "https://esm.sh/docx@9.6.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

// Machine-checkable manifest of statutory assertions carried by the hardcoded
// templates below. lint-deterministic-legal-text resolves each `citation`
// against the corpus (gdpr_articles / cppa_authorities) and verifies every
// `mustContain` phrase appears in the corpus full_text. Update the shared
// module alongside any template edit that changes a statutory claim.
import { ROPA_LEGAL_TEXT_ASSERTIONS } from "../_shared/legal-text-assertions.ts";
export const LEGAL_TEXT_ASSERTIONS = ROPA_LEGAL_TEXT_ASSERTIONS;


const LOGO_URL = `${Deno.env.get("SITE_URL") || "https://enduserprivacy.com"}/logo.png`;

// ─────────────────────────────────────────────────────────────────────────────
// CORS
// ─────────────────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Format = "pdf" | "docx" | "xlsx";

interface RequestBody {
  session_id: string;
  // Either-or:
  format?: Format; // generate a single format
  download_only?: boolean; // refresh signed URL for an already generated file
  include_word?: boolean; // or generate PDF + (DOCX) + (XLSX)
  include_excel?: boolean;
  document_date?: string;
  author_name?: string;
  internal_reference?: string | null;
  // Attestation (Section 5). All optional: when absent the attestation frame
  // still renders with the lines marked for completion.
  approved_by_name?: string | null;
  approved_by_title?: string | null;
  approval_date?: string | null;
  next_review_due?: string | null;
  // Legacy nested shape from the spec
  document_settings?: {
    document_date?: string;
    author_name?: string;
    internal_reference?: string | null;
    approved_by_name?: string | null;
    approved_by_title?: string | null;
    approval_date?: string | null;
    next_review_due?: string | null;
  };
}

interface DocumentSettings {
  documentDate: string;
  authorName: string;
  internalReference: string | null;
  approvedByName: string | null;
  approvedByTitle: string | null;
  approvalDate: string | null;
  nextReviewDue: string;
}


// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function answerToString(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) {
    return value.length === 0 ? "—" : value.map((v) => answerToString(v)).join(", ");
  }
  if (typeof value === "object") return JSON.stringify(value);
  if (value === "" ) return "—";
  return String(value);
}

const LAW_NAMES: Record<string, string> = {
  EU_GDPR: "EU General Data Protection Regulation (Regulation 2016/679)",
  UK_GDPR: "UK GDPR / Data Protection Act 2018",
  CH_FADP: "Swiss Federal Act on Data Protection (revFADP)",
  US_CCPA: "California Consumer Privacy Act / CPRA",
  US_VA: "Virginia Consumer Data Protection Act (VCDPA)",
  US_CO: "Colorado Privacy Act (CPA)",
  US_CT: "Connecticut Data Privacy Act (CTDPA)",
  US_TX: "Texas Data Privacy and Security Act (TDPSA)",
  BR_LGPD: "Brazilian General Data Protection Law (LGPD)",
  CA_PIPEDA: "Canadian Personal Information Protection and Electronic Documents Act (PIPEDA)",
  AU_PRIVACY: "Australian Privacy Act 1988",
  SG_PDPA: "Singapore Personal Data Protection Act",
  IN_DPDP: "India Digital Personal Data Protection Act 2023",
  JP_APPI: "Japan Act on the Protection of Personal Information (APPI)",
  KR_PIPA: "South Korea Personal Information Protection Act (PIPA)",
};

const LAW_NAMES_SHORT: Record<string, string> = {
  EU_GDPR: "EU GDPR", UK_GDPR: "UK GDPR", CH_FADP: "Swiss FADP",
  US_CCPA: "CCPA/CPRA", US_VA: "VCDPA", US_CO: "CPA", US_CT: "CTDPA", US_TX: "TDPSA",
  BR_LGPD: "LGPD", CA_PIPEDA: "PIPEDA", AU_PRIVACY: "AU Privacy Act",
  SG_PDPA: "SG PDPA", IN_DPDP: "DPDP", JP_APPI: "APPI", KR_PIPA: "PIPA",
};

function humanize(token: string): string {
  if (!token) return "—";
  return token.replace(/_/g, " ");
}

const EU_EEA_MEMBER_STATE_NAMES: Record<string, string> = {
  AT: "Austria",  BE: "Belgium",  BG: "Bulgaria",  HR: "Croatia",
  CY: "Cyprus",   CZ: "Czech Republic", DK: "Denmark", EE: "Estonia",
  FI: "Finland",  FR: "France",   DE: "Germany",  GR: "Greece",
  HU: "Hungary",  IE: "Ireland",  IT: "Italy",    LV: "Latvia",
  LT: "Lithuania", LU: "Luxembourg", MT: "Malta", NL: "Netherlands",
  PL: "Poland",   PT: "Portugal", RO: "Romania",  SK: "Slovakia",
  SI: "Slovenia", ES: "Spain",    SE: "Sweden",
  NO: "Norway",   IS: "Iceland",  LI: "Liechtenstein",
  GB: "Great Britain",
  EU: "the European Union",
};

function lawLabel(j: string): string {
  if (LAW_NAMES[j]) return LAW_NAMES[j];
  if (EU_EEA_MEMBER_STATE_NAMES[j]) {
    return `GDPR (Regulation (EU) 2016/679) as applicable in ${EU_EEA_MEMBER_STATE_NAMES[j]}`;
  }
  return humanize(j);
}
function lawLabelShort(j: string): string {
  return LAW_NAMES_SHORT[j] ?? humanize(j);
}
function jurisdictionList(arr: string[], short = false): string {
  return (arr || []).map((j) => short ? lawLabelShort(j) : lawLabel(j)).join(", ");
}

const LAWFUL_BASIS_LABELS: Record<string, string> = {
  consent: "Consent — Art. 6(1)(a)",
  contract: "Contract — Art. 6(1)(b)",
  legal_obligation: "Legal obligation — Art. 6(1)(c)",
  vital_interests: "Vital interests — Art. 6(1)(d)",
  public_task: "Public task — Art. 6(1)(e)",
  legitimate_interests: "Legitimate interests — Art. 6(1)(f)",
};

const CATEGORY_LABELS: Record<string, string> = {
  customer_service:  "Customer Service",
  marketing:         "Marketing & Communications",
  hr_employment:     "HR & Employment",
  finance_legal:     "Finance & Legal",
  technology:        "Technology & Security",
  operations:        "Operations",
  third_party:       "Third-Party & Vendor Management",
  other:             "Other",
};

function categoryLabel(code: string): string {
  return CATEGORY_LABELS[code] ?? humanize(code);
}

function lawfulBasisLabel(value: unknown): string {
  const v = answerToString(value);
  return LAWFUL_BASIS_LABELS[v] ?? v;
}

function activityRole(ans: Record<string, unknown>, profile: any): string {
  return answerToString(
    ans.role ??
      ([profile?.is_controller && "Controller", profile?.is_processor && "Processor"]
        .filter(Boolean)
        .join(" + ") || "—"),
  );
}

const QUESTION_LABELS: Record<string, string> = {
  info_card: "Information acknowledged",
  role: "Role",
  purpose: "Purpose",
  lawful_basis: "Lawful basis",
  special_category_basis: "Special category basis",
  data_subjects: "Data subjects",
  data_categories: "Data categories",
  processor_platform: "Processors / recipients",
  recipients: "Recipients",
  transfer_destination: "Transfer destination",
  transfer_country: "Transfer country",
  cross_border_destination: "Cross-border destination",
  transfer_mechanism: "Transfer mechanism",
  transfer_safeguard: "Transfer safeguard",
  transfer_basis: "Transfer basis",
  transfer_lawful_basis: "Transfer lawful basis",
  retention_period: "Retention period",
  security_measures: "Security measures",
  access_controls: "Access controls",
  uses_processors: "Uses third-party processors",
  unsubscribe_mechanism: "Unsubscribe mechanism",
  incident_log: "Breach / incident register",
  notices_displayed: "Surveillance notices displayed",
  activity_owner: "Activity owner",
  collection_sources: "Collection sources",
  processing_operations: "Processing operations performed",
  related_assessments: "Related LIA / DPIA",
  retention_varies_by_category: "Retention varies by data category",
  retention_by_category: "Retention by data category",
  rights_handling_override: "Rights-handling process (activity override)",
};


function questionLabel(key: string): string {
  return QUESTION_LABELS[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function renderPdf(html: string, title: string): Promise<Uint8Array> {
  const pdfApiKey =
    Deno.env.get("PDFSHIFT_API_KEY") ||
    Deno.env.get("PDF_SERVICE_API_KEY") ||
    Deno.env.get("PDFShift");
  if (!pdfApiKey) throw new Error("PDF service is not configured");

  const safeTitle = title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const response = await fetch("https://api.pdfshift.io/v3/convert/pdf", {
    method: "POST",
    headers: {
      "X-API-Key": pdfApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: html,
      format: "Letter",
      margin: { top: "16mm", right: "14mm", bottom: "18mm", left: "14mm" },
      sandbox: Deno.env.get("PDFSHIFT_SANDBOX") === "true",
      footer: {
        source:
          '<div style="font-family:Helvetica,Arial,sans-serif;font-size:9px;color:#5c6d7a;width:100%;padding:0 14mm;display:flex;justify-content:space-between;">' +
          `<span>${safeTitle}</span>` +
          '<span>EndUserPrivacy.com · Page <span class="pageNumber"></span> / <span class="totalPages"></span></span>' +
          "</div>",
        spacing: 4,
      },
    }),
    signal: AbortSignal.timeout(135000),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(`PDF rendering failed (${response.status}): ${errBody.slice(0, 300)}`);
  }

  return new Uint8Array(await response.arrayBuffer());
}

const TO_BE_COMPLETED = "To be completed";

function plusTwelveMonths(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return TO_BE_COMPLETED;
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export function readDocumentSettings(body: RequestBody): DocumentSettings {
  const ds = body.document_settings ?? {};
  const documentDate =
    body.document_date ?? ds.document_date ?? new Date().toISOString().slice(0, 10);
  const clean = (v: unknown): string | null => {
    const s = typeof v === "string" ? v.trim() : "";
    return s ? s : null;
  };
  return {
    documentDate,
    authorName: body.author_name ?? ds.author_name ?? "—",
    internalReference: body.internal_reference ?? ds.internal_reference ?? null,
    approvedByName: clean(body.approved_by_name ?? ds.approved_by_name),
    approvedByTitle: clean(body.approved_by_title ?? ds.approved_by_title),
    approvalDate: clean(body.approval_date ?? ds.approval_date),
    nextReviewDue:
      clean(body.next_review_due ?? ds.next_review_due) ?? plusTwelveMonths(documentDate),
  };
}

// Art. 4(2) GDPR operations taxonomy — value → register label. Mirrors
// PROCESSING_OPERATION_OPTIONS in src/data/ropa-questions/index.ts.
const PROCESSING_OPERATION_LABELS: Record<string, string> = {
  collection: "Collection",
  recording: "Recording",
  organisation: "Organisation",
  structuring: "Structuring",
  storage: "Storage",
  adaptation: "Adaptation or alteration",
  retrieval: "Retrieval",
  consultation: "Consultation",
  use: "Use",
  disclosure_transmission: "Disclosure by transmission",
  dissemination: "Dissemination",
  combination: "Combination",
  restriction: "Restriction",
  erasure: "Erasure or destruction",
};

function processingOperationsLabel(value: unknown): string {
  const list = Array.isArray(value) ? value : value ? [value] : [];
  if (list.length === 0) return "—";
  return list
    .map((v) => PROCESSING_OPERATION_LABELS[String(v)] ?? answerToString(v))
    .join(", ");
}

function relatedAssessmentsLabel(value: unknown): string {
  const list = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
  if (list.length === 0) return "None on file";
  return list.map((v) => answerToString(v)).join("; ");
}

// Client-level rights-handling process with per-activity override.
function rightsHandlingLabel(
  ans: Record<string, unknown>,
  profile: any,
): string {
  const override = answerToString(ans.rights_handling_override);
  if (override !== "—") return `${override} (activity-specific override)`;
  const base = answerToString(profile?.rights_handling_process);
  return base;
}

// Optional retention-by-category breakdown: renders only when the
// "retention varies by category" follow-up has actually been answered.
function retentionByCategory(ans: Record<string, unknown>): string | null {
  const varies = answerToString(ans.retention_varies_by_category).toLowerCase();
  if (varies !== "yes") return null;
  const detail = answerToString(ans.retention_by_category);
  return detail === "—" ? null : detail;
}


function resolveFormatsToGenerate(body: RequestBody): Format[] {
  if (body.format) return [body.format];
  const formats: Format[] = ["pdf"];
  if (body.include_word) formats.push("docx");
  if (body.include_excel) formats.push("xlsx");
  return formats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Document builders
// ─────────────────────────────────────────────────────────────────────────────

interface AssembledData {
  session: any;
  client: any;
  profile: any;
  jurisdictions: string[];
  activities: any[];
  // activity_id -> { question_key -> answer_value }
  answersByActivity: Record<string, Record<string, unknown>>;
  flags: any[];
  refreshNotes: string[];
  settings: DocumentSettings;
}

interface CrossBorderTransfer {
  activity: string;
  data: string;
  destination: string;
  mechanism: string;
  basis: string;
}

function collectTransfers(d: AssembledData): CrossBorderTransfer[] {
  const out: CrossBorderTransfer[] = [];
  for (const a of d.activities) {
    const ans = d.answersByActivity[a.id] ?? {};
    const destination =
      ans["transfer_destination"] ??
      ans["transfer_country"] ??
      ans["cross_border_destination"];
    if (!destination) continue;
    const destStr = answerToString(destination);
    if (/no\s+third[- ]country\s+transfer/i.test(destStr) || /^none$/i.test(destStr.trim())) continue;
    const mechanism =
      ans["transfer_mechanism"] ??
      ans["transfer_safeguard"] ??
      "Not specified";
    const explicitBasis =
      ans["transfer_basis"] ?? ans["transfer_lawful_basis"];
    const mechanismStr = answerToString(mechanism);
    const basisStr = explicitBasis
      ? answerToString(explicitBasis)
      : (mechanismStr && mechanismStr !== "—" && mechanismStr !== "Not specified"
          ? mechanismStr
          : "Not recorded — complete before relying on this register");
    const data =
      ans["data_categories"] ?? ans["personal_data_types"] ?? "—";
    out.push({
      activity: a.display_name,
      data: answerToString(data),
      destination: destStr,
      mechanism: mechanismStr,
      basis: basisStr,
    });
  }
  return out;
}

// ── HTML (used as the "PDF") ────────────────────────────────────────────────

export function buildHtml(d: AssembledData): string {
  const lawList = d.jurisdictions
    .map((j) => `<li>${escapeHtml(lawLabel(j))}</li>`)
    .join("");

  const activitySections = d.activities
    .map((a) => {
      const ans = d.answersByActivity[a.id] ?? {};
      return `
        <section class="activity">
          <h3>${escapeHtml(a.display_name)}</h3>
          <table class="kv">
            <tbody>
              <tr><th>Role</th><td>${escapeHtml(answerToString(ans.role ?? (d.profile?.is_controller ? "Controller" : d.profile?.is_processor ? "Processor" : "—")))}</td></tr>
              <tr><th>Category</th><td>${escapeHtml(categoryLabel(a.category))}</td></tr>
              <tr><th>Activity owner</th><td>${escapeHtml(answerToString(ans.activity_owner))}</td></tr>
              <tr><th>Purpose</th><td>${escapeHtml(answerToString(ans.purpose))}</td></tr>
              <tr><th>Lawful basis</th><td>${escapeHtml(lawfulBasisLabel(ans.lawful_basis))}</td></tr>
              <tr><th>Special category basis</th><td>${escapeHtml(answerToString(ans.special_category_basis))}</td></tr>
              <tr><th>Data subjects</th><td>${escapeHtml(answerToString(ans.data_subjects))}</td></tr>
              <tr><th>Data categories</th><td>${escapeHtml(answerToString(ans.data_categories))}</td></tr>
              <tr><th>Collection sources</th><td>${escapeHtml(answerToString(ans.collection_sources))}</td></tr>
              <tr><th>Processing operations performed</th><td>${escapeHtml(processingOperationsLabel(ans.processing_operations))}</td></tr>
              <tr><th>Processors / recipients</th><td>${escapeHtml(answerToString(ans.processor_platform ?? ans.recipients))}</td></tr>
              <tr><th>Cross-border transfers</th><td>${escapeHtml(answerToString(ans.transfer_destination ?? "None"))}${ans.transfer_mechanism ? ` (${escapeHtml(answerToString(ans.transfer_mechanism))})` : ""}</td></tr>
              <tr><th>Retention period</th><td>${escapeHtml(answerToString(ans.retention_period))}</td></tr>
              ${(() => {
                const byCat = retentionByCategory(ans);
                return byCat
                  ? `<tr><th>Retention by data category</th><td>${escapeHtml(byCat)}</td></tr>`
                  : "";
              })()}
              <tr><th>Rights-handling process</th><td>${escapeHtml(rightsHandlingLabel(ans, d.profile))}</td></tr>
              <tr><th>Related LIA / DPIA</th><td>${escapeHtml(relatedAssessmentsLabel(ans.related_assessments))}</td></tr>

              <tr><th>Security measures</th><td>${escapeHtml(answerToString(ans.security_measures))}</td></tr>
              <tr><th>Access controls</th><td>${escapeHtml(answerToString(ans.access_controls))}</td></tr>
              <tr><th>Last reviewed</th><td>${escapeHtml(d.settings.documentDate)}</td></tr>
            </tbody>
          </table>
          <p class="footer-note">Recorded pursuant to: ${d.profile?.is_processor && !d.profile?.is_controller ? "Article 30(2) GDPR (processor activity)" : "Article 30(1) GDPR (controller activity)"}</p>
        </section>
      `;
    })
    .join("");

  const allAnswerSections = d.activities
    .map((a) => {
      const ans = d.answersByActivity[a.id] ?? {};
      // Collapse duplicates: if both processor_platform and recipients carry the same content, drop "recipients".
      const skip = new Set<string>(["info_card"]);
      const procVal = answerToString(ans.processor_platform);
      const recVal = answerToString(ans.recipients);
      if (procVal !== "—" && procVal === recVal) skip.add("recipients");
      const rows = Object.entries(ans)
        .filter(([key]) => !skip.has(key))
        .map(([key, value]) => {
          const display = key === "lawful_basis"
            ? lawfulBasisLabel(value)
            : answerToString(value);
          return `
          <tr>
            <th>${escapeHtml(questionLabel(key))}</th>
            <td>${escapeHtml(display)}</td>
          </tr>
        `;
        })
        .join("");
      if (!rows) return "";
      return `
        <section class="activity">
          <h3>${escapeHtml(a.display_name)}</h3>
          <table class="kv"><tbody>${rows}</tbody></table>
        </section>
      `;
    })
    .filter(Boolean)
    .join("");

  const transfers = collectTransfers(d);
  const transferTable = transfers.length === 0
    ? `<p><em>No cross-border transfers have been recorded in this draft. This statement cannot be confirmed as accurate until processor, recipient, and data destination fields have been completed for all processing activities.</em></p>`
    : `
      <table class="grid">
        <thead><tr>
          <th>Activity</th><th>Data</th><th>Destination</th><th>Safeguard mechanism</th><th>Basis</th>
        </tr></thead>
        <tbody>
          ${transfers.map((t) => `
            <tr>
              <td>${escapeHtml(t.activity)}</td>
              <td>${escapeHtml(t.data)}</td>
              <td>${escapeHtml(t.destination)}</td>
              <td>${escapeHtml(t.mechanism)}</td>
              <td>${escapeHtml(t.basis)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

  const refreshNotes = d.refreshNotes.length === 0
    ? ""
    : `
      <section>
        <h3>Regulatory Developments Noted Since Last Review</h3>
        <ul>${d.refreshNotes.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}</ul>
      </section>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Records of Processing Activities — ${escapeHtml(d.client?.name ?? "")}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; max-width: 880px; margin: 32px auto; padding: 0 32px; line-height: 1.5; }
    body { font-family:Georgia,'Times New Roman',serif; color:#1a1916;
      max-width:880px; margin:0 auto; padding:0; line-height:1.5;
      background:#f5f8fa; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .shell { background:#fff; border:1px solid #dde5ea; border-radius:14px;
      overflow:hidden; margin:32px; }
    .header { background:#0c2a44; color:#fff; padding:22px 26px 24px; }
    .header .logo-img { display:block; height:32px; width:auto; margin-bottom:12px; object-fit:contain; }
    .header .eyebrow { font-size:9px; font-weight:600; text-transform:uppercase;
      letter-spacing:0.14em; color:#93b5c6; margin:0 0 4px; }
    .header h1 { font-family:Georgia,serif; font-size:20px; margin:0; font-weight:700; line-height:1.3; }
    .header .meta { margin-top:6px; font-size:11px; color:#cbd5e1; }
    .confidential { font-size:10px; color:#8a9eb1; text-transform:uppercase;
      letter-spacing:0.1em; margin-top:8px; }
    .body { padding:24px 26px 32px; }
    h2 { font-size:16px; color:#0c2a44; border-bottom:1px solid #dde5ea;
      padding-bottom:4px; margin-top:28px; }
    table.kv { width:100%; border-collapse:collapse; margin:8px 0 16px; }
    table.kv th { text-align:left; padding:4px 12px 4px 0; color:#5c6d7a;
      font-weight:600; vertical-align:top; width:200px; font-size:12px; }
    table.kv td { padding:4px 0; font-size:13px; }
    table.grid { width:100%; border-collapse:collapse; font-size:12px; }
    table.grid th, table.grid td { border:1px solid #dde5ea; padding:6px 8px;
      text-align:left; vertical-align:top; }
    table.grid th { background:#edf2f5; color:#0c2a44; }
    .activity { page-break-inside:avoid; margin-bottom:16px; padding-bottom:8px;
      border-bottom:1px dashed #dde5ea; }
    .signature { margin-top:32px; border-top:2px solid #2d9b90; padding-top:16px; }
    .footer-note { font-size:11px; color:#5c6d7a; margin-top:24px; }

    /* ── Print / PDF pagination fixes (PDFShift/Chromium) ──────────── */
    .activity { break-inside: avoid; page-break-inside: avoid; }
    h2, h3 { break-after: avoid; page-break-after: avoid; }
    h2 + *, h3 + * { break-before: avoid; page-break-before: avoid; }
    table.kv tr { break-inside: avoid; page-break-inside: avoid; }
    ul { break-inside: avoid; page-break-inside: avoid; }
    .signature { break-before: avoid; page-break-before: avoid; }
    .signature + * { break-inside: avoid; page-break-inside: avoid; }
    .footer-note:last-child { break-before: avoid; page-break-before: avoid; }
    @media print {
      .activity { break-inside: avoid; page-break-inside: avoid; }
      h2, h3 { break-after: avoid; page-break-after: avoid; }
      h2 + *, h3 + * { break-before: avoid; page-break-before: avoid; }
      table.kv tr { break-inside: avoid; page-break-inside: avoid; }
      ul { break-inside: avoid; page-break-inside: avoid; }
      .signature { break-before: avoid; page-break-before: avoid; }
      .signature + * { break-inside: avoid; page-break-inside: avoid; }
      .footer-note:last-child { break-before: avoid; page-break-before: avoid; }
    }
  </style>
</head>
<body>

  <div class="shell">
  <header class="header">
    <img class="logo-img" src="${LOGO_URL}" alt="End User Privacy" />
    <p class="eyebrow">Compliance Document · Article 30 Record</p>
    <h1>${escapeHtml(d.client?.name ?? "")} — Records of Processing Activities</h1>
    <div class="meta">
      ${escapeHtml(d.settings.documentDate)} · Jurisdictions: ${escapeHtml(jurisdictionList(d.jurisdictions, true) || "—")} · Version ${d.session.version_number}
      ${d.settings.authorName ? ` · Author: ${escapeHtml(d.settings.authorName)}` : ""}
      ${d.settings.internalReference ? ` · Ref: ${escapeHtml(d.settings.internalReference)}` : ""}
    </div>
    <div class="confidential">Confidential — Internal Compliance Record</div>
  </header>
  <div class="body">

  <p style="font-size: 13px; margin-top: 24px;">This record is maintained in accordance with Article 30 of the General Data Protection Regulation (EU) 2016/679 (GDPR) and, where applicable, Article 30 of the UK GDPR as retained by the Data Protection Act 2018. It is intended to document the processing activities carried out by the controller and, where relevant, the processor. <strong>This record must be reviewed and completed before it can be relied upon as a compliant Article 30 record.</strong></p>

  <h2>1. Client record</h2>
  <table class="kv">
    <tbody>
      <tr><th>Role</th><td>${[d.profile?.is_controller && "Controller", d.profile?.is_processor && "Processor"].filter(Boolean).join(" + ") || "—"}</td></tr>
      <tr><th>Legal entity</th><td>${escapeHtml(d.profile?.legal_entity_type ?? "—")}</td></tr>
      <tr><th>Registered address</th><td>${escapeHtml(answerToString(d.profile?.registered_address))}</td></tr>
      <tr><th>Company / registration number</th><td>${escapeHtml(answerToString(d.profile?.registration_number))}</td></tr>
      <tr><th>Incorporation jurisdiction</th><td>${escapeHtml(answerToString(d.profile?.incorporation_jurisdiction))}</td></tr>

      <tr><th>Sector</th><td>${escapeHtml(d.client?.sector ?? "—")}</td></tr>
      <tr><th>Employee band</th><td>${escapeHtml(d.profile?.employee_band ?? "—")}</td></tr>
      <tr><th>DPO</th><td>${
        d.profile?.dpo_name
          ? escapeHtml(d.profile.dpo_name) +
            (d.profile?.dpo_email ? ` &lt;${escapeHtml(d.profile.dpo_email)}&gt;` : "") +
            (d.profile?.dpo_phone ? ` · ${escapeHtml(d.profile.dpo_phone)}` : "")
          : `<span style="color:#5c6d7a;font-style:italic;">Not designated — Article 37 GDPR requires DPO designation for: (a) public authorities and bodies; (b) controllers whose core activities require large-scale, regular and systematic monitoring of data subjects; or (c) controllers whose core activities involve large-scale processing of special category or criminal offence data. Confirm whether a DPO is required for this controller before leaving this field blank.</span>`
      }</td></tr>
      ${(() => {
        const euRep = (d.profile?.eu_rep_name ?? "").trim();
        const ukRep = (d.profile?.uk_rep_name ?? "").trim();
        const euRow = !euRep
          ? `<tr><th>EU representative</th><td style="color:#5c6d7a;font-style:italic;">Not designated — Article 27 EU GDPR requires a representative only for controllers not established in the EU/EEA. If this controller is EU/EEA-established, no representative is required and this field should remain blank.</td></tr>`
          : `<tr><th>EU representative</th><td>${escapeHtml(euRep)}${d.profile?.eu_rep_email ? ` &lt;${escapeHtml(d.profile.eu_rep_email)}&gt;` : ""}</td></tr>`;
        const ukRow = !ukRep
          ? `<tr><th>UK representative</th><td style="color:#5c6d7a;font-style:italic;">Not designated — Article 27 UK GDPR requires a representative only for controllers not established in the UK. If this controller is UK-established, no representative is required and this field should remain blank.</td></tr>`
          : `<tr><th>UK representative</th><td>${escapeHtml(ukRep)}${d.profile?.uk_rep_email ? ` &lt;${escapeHtml(d.profile.uk_rep_email)}&gt;` : ""}</td></tr>`;
        return euRow + ukRow;
      })()}
      <tr><th>Jurisdictions</th><td>${escapeHtml(jurisdictionList(d.jurisdictions, true) || "—")}</td></tr>
    </tbody>
  </table>
  <p class="footer-note">This record is maintained pursuant to <strong>Article 30</strong> of the General Data Protection Regulation (GDPR) and UK GDPR, which requires controllers and processors to maintain records of processing activities. It satisfies the requirements of:</p>
  <ul>${lawList}</ul>

  <h2>2. Processing activities</h2>
  ${activitySections || "<p><em>No activities recorded.</em></p>"}

  ${allAnswerSections ? `<h2>3. Intake answer register (verbatim responses, normalised labels)</h2>${allAnswerSections}` : ""}

  <h2>${allAnswerSections ? "4" : "3"}. Cross-border transfer register</h2>
  ${transferTable}

  ${refreshNotes}

  <h2>${allAnswerSections ? "5" : "4"}. Controller / processor statement</h2>
  <p>This record was prepared by <strong>${escapeHtml(d.settings.authorName)}</strong> on <strong>${escapeHtml(d.settings.documentDate)}</strong>.
  It constitutes our Article 30 record of processing activities (Records of Processing Activities — RoPA) maintained under ${escapeHtml(jurisdictionList(d.jurisdictions) || "applicable law")}.
  We are committed to reviewing and updating this record at least annually.</p>
  ${(() => {
    const hasIncomplete = d.activities.some((a) => {
      const ans = d.answersByActivity[a.id] ?? {};
      const purpose = answerToString(ans["purpose"]);
      const lawfulBasis = answerToString(ans["lawful_basis"]);
      return purpose === "—" || lawfulBasis === "—";
    });
    if (hasIncomplete) {
      return `
        <div style="margin: 24px 0; padding: 14px 18px; background: #fff8e1; border: 2px solid #f59e0b; border-radius: 8px; font-size: 13px; color: #92400e;">
          <strong>⚠ DRAFT — Required fields incomplete</strong><br/>
          One or more processing activities are missing a purpose or lawful basis. This record does not yet satisfy the requirements of Article 30(1)(b) GDPR. Complete all required fields before signing or relying on this document.
        </div>
      `;
    }
    return "";
  })()}
  <div class="signature">
    <table class="kv">
      <tbody>
        <tr><th>Approved by (name)</th><td>${escapeHtml(d.settings.approvedByName ?? TO_BE_COMPLETED)}</td></tr>
        <tr><th>Approved by (title)</th><td>${escapeHtml(d.settings.approvedByTitle ?? TO_BE_COMPLETED)}</td></tr>
        <tr><th>Approval date</th><td>${escapeHtml(d.settings.approvalDate ?? TO_BE_COMPLETED)}</td></tr>
        <tr><th>Next review due</th><td>${escapeHtml(d.settings.nextReviewDue)}</td></tr>
      </tbody>
    </table>
  </div>


  <p class="footer-note" style="margin-top: 32px;">This record was last reviewed on ${escapeHtml(d.settings.documentDate)}. Maintained in compliance with Article 30 GDPR obligations. Review recommended at least annually or upon any material change to processing activities.</p>

  ${reportDisclaimerHtml()}
  </div></div>
</body>
</html>`;
}

// ── DOCX ────────────────────────────────────────────────────────────────────

function p(text: string, opts: { bold?: boolean; size?: number; heading?: HeadingLevel } = {}) {
  return new Paragraph({
    heading: opts.heading,
    children: [new TextRun({ text, bold: opts.bold, size: opts.size })],
  });
}

function kvRow(label: string, value: string) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        children: [p(label, { bold: true, size: 20 })],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [p(value, { size: 20 })],
      }),
    ],
  });
}

export async function buildDocx(d: AssembledData): Promise<Uint8Array> {
  const sections: any[] = [];

  const cover = [
    p(d.client?.name ?? "", { heading: HeadingLevel.TITLE, bold: true }),
    p("Records of Processing Activities", { heading: HeadingLevel.HEADING_2 }),
    p(`Date: ${d.settings.documentDate}`),
    p(`Jurisdictions: ${jurisdictionList(d.jurisdictions, true) || "—"}`),
    p(`Author: ${d.settings.authorName} · Version ${d.session.version_number}`),
    ...(d.settings.internalReference
      ? [p(`Internal reference: ${d.settings.internalReference}`)]
      : []),
    p("Confidential — internal compliance record.", { size: 18 }),
    p(""),
  ];

  // Apply the same EU/UK representative suppression heuristic used in the
  // HTML output, so the DOCX is consistent: if the intake records the
  // controller's own organisation name as the EU/UK representative, treat the
  // controller as established in that jurisdiction and surface the
  // "Not required" line rather than echoing the org name as the representative.
  const orgNameForRepCheck = (d.client?.name ?? "").trim().toLowerCase();
  const euRepName = (d.profile?.eu_rep_name ?? "").trim();
  const ukRepName = (d.profile?.uk_rep_name ?? "").trim();
  const euRepValue = !euRepName
    ? "Not designated — Article 27 EU GDPR applies only to controllers not established in the EU/EEA"
    : `${euRepName}${d.profile?.eu_rep_email ? ` <${d.profile.eu_rep_email}>` : ""}`;
  const ukRepValue = !ukRepName
    ? "Not designated — Article 27 UK GDPR applies only to controllers not established in the UK"
    : `${ukRepName}${d.profile?.uk_rep_email ? ` <${d.profile.uk_rep_email}>` : ""}`;

  const clientTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      kvRow(
        "Role",
        [d.profile?.is_controller && "Controller", d.profile?.is_processor && "Processor"]
          .filter(Boolean)
          .join(" + ") || "—",
      ),
      kvRow("Legal entity", d.profile?.legal_entity_type ?? "—"),
      kvRow("Registered address", answerToString(d.profile?.registered_address)),
      kvRow("Company / registration number", answerToString(d.profile?.registration_number)),
      kvRow("Incorporation jurisdiction", answerToString(d.profile?.incorporation_jurisdiction)),

      kvRow("Sector", d.client?.sector ?? "—"),
      kvRow("Employee band", d.profile?.employee_band ?? "—"),
      kvRow(
        "DPO",
        d.profile?.dpo_name
          ? `${d.profile.dpo_name}${d.profile?.dpo_email ? ` <${d.profile.dpo_email}>` : ""}${d.profile?.dpo_phone ? ` · ${d.profile.dpo_phone}` : ""}`
          : "Not designated — confirm Article 37 GDPR designation triggers before leaving blank",
      ),
      kvRow("EU representative", euRepValue),
      kvRow("UK representative", ukRepValue),
      kvRow("Jurisdictions", jurisdictionList(d.jurisdictions, true) || "—"),
    ],
  });

  const lawList = d.jurisdictions.map(
    (j) => p(`• ${LAW_NAMES[j] ?? j}`, { size: 18 }),
  );

  const activityBlocks: any[] = [];
  for (const a of d.activities) {
    const ans = d.answersByActivity[a.id] ?? {};
    activityBlocks.push(p(a.display_name, { heading: HeadingLevel.HEADING_3 }));
    activityBlocks.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          kvRow("Role", activityRole(ans, d.profile)),
          kvRow("Category", categoryLabel(a.category)),
          kvRow("Activity owner", answerToString(ans.activity_owner)),
          kvRow("Purpose", answerToString(ans.purpose)),
          kvRow("Lawful basis", lawfulBasisLabel(ans.lawful_basis)),
          kvRow("Special category basis", answerToString(ans.special_category_basis)),
          kvRow("Data subjects", answerToString(ans.data_subjects)),
          kvRow("Data categories", answerToString(ans.data_categories)),
          kvRow("Collection sources", answerToString(ans.collection_sources)),
          kvRow(
            "Processing operations performed",
            processingOperationsLabel(ans.processing_operations),
          ),
          kvRow(
            "Processors / recipients",
            answerToString(ans.processor_platform ?? ans.recipients),
          ),
          kvRow(
            "Cross-border transfers",
            answerToString(ans.transfer_destination ?? "None"),
          ),
          kvRow("Retention period", answerToString(ans.retention_period)),
          ...(retentionByCategory(ans)
            ? [kvRow("Retention by data category", retentionByCategory(ans) as string)]
            : []),
          kvRow("Rights-handling process", rightsHandlingLabel(ans, d.profile)),
          kvRow("Related LIA / DPIA", relatedAssessmentsLabel(ans.related_assessments)),
          kvRow("Security measures", answerToString(ans.security_measures)),
          kvRow("Access controls", answerToString(ans.access_controls)),
          kvRow("Last reviewed", d.settings.documentDate),
        ],
      }),
    );

    activityBlocks.push(p(""));
  }

  const allAnswerBlocks: any[] = [];
  for (const a of d.activities) {
    const ans = d.answersByActivity[a.id] ?? {};
    const entries = Object.entries(ans).filter(([key]) => key !== "info_card");
    if (entries.length === 0) continue;
    allAnswerBlocks.push(p(a.display_name, { heading: HeadingLevel.HEADING_3 }));
    allAnswerBlocks.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: entries.map(([key, value]) => kvRow(questionLabel(key), answerToString(value))),
      }),
    );
    allAnswerBlocks.push(p(""));
  }

  const transfers = collectTransfers(d);
  const transferRows = [
    new TableRow({
      tableHeader: true,
      children: ["Activity", "Data", "Destination", "Mechanism", "Basis"].map(
        (h) =>
          new TableCell({ children: [p(h, { bold: true, size: 18 })] }),
      ),
    }),
    ...(transfers.length === 0
      ? [
          new TableRow({
            children: [
              new TableCell({
                children: [p("No cross-border transfers recorded in this draft — transfer status cannot be confirmed until processor and recipient fields are completed.", { size: 18 })],
                columnSpan: 5,
              }),
            ],
          }),
        ]
      : transfers.map(
          (t) =>
            new TableRow({
              children: [t.activity, t.data, t.destination, t.mechanism, t.basis].map(
                (v) =>
                  new TableCell({ children: [p(v, { size: 18 })] }),
              ),
            }),
        )),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          ...cover,
          p("1. Client record", { heading: HeadingLevel.HEADING_2 }),
          clientTable,
          p("This record satisfies the requirements of:", { size: 18 }),
          ...lawList,
          p(""),
          p("2. Processing activities", { heading: HeadingLevel.HEADING_2 }),
          ...activityBlocks,
          p("3. Cross-border transfer register", { heading: HeadingLevel.HEADING_2 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: transferRows,
          }),
          p(""),
          ...(allAnswerBlocks.length > 0
            ? [p("4. Complete answer register", { heading: HeadingLevel.HEADING_2 }), ...allAnswerBlocks]
            : []),
          p(""),
          p(allAnswerBlocks.length > 0 ? "5. Controller / processor statement" : "4. Controller / processor statement", { heading: HeadingLevel.HEADING_2 }),
          p(
            `This record was prepared by ${d.settings.authorName} on ${d.settings.documentDate}. It constitutes our record of processing activities under the applicable laws listed above. We are committed to reviewing and updating this record at least annually.`,
          ),
          p(""),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              kvRow("Approved by (name)", d.settings.approvedByName ?? TO_BE_COMPLETED),
              kvRow("Approved by (title)", d.settings.approvedByTitle ?? TO_BE_COMPLETED),
              kvRow("Approval date", d.settings.approvalDate ?? TO_BE_COMPLETED),
              kvRow("Next review due", d.settings.nextReviewDue),
            ],
          }),

          p(""),
          p(REPORT_DISCLAIMER, { size: 16 }),
        ],
      },
    ],
  });

  // Packer.toBuffer returns Node Buffer in Node, ArrayBuffer/Uint8Array in
  // Deno. Coerce to Uint8Array so we can pass it to the storage upload.
  const out = await Packer.toBuffer(doc);
  return out instanceof Uint8Array ? out : new Uint8Array(out as ArrayBuffer);
}

// ── XLSX ────────────────────────────────────────────────────────────────────

export function buildXlsx(d: AssembledData): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — client record
  const clientSheet = XLSX.utils.aoa_to_sheet([
    ["Client name", d.client?.name ?? ""],
    [
      "Role",
      [d.profile?.is_controller && "Controller", d.profile?.is_processor && "Processor"]
        .filter(Boolean)
        .join(" + ") || "—",
    ],
    ["Legal entity", d.profile?.legal_entity_type ?? "—"],
    ["Registered address", answerToString(d.profile?.registered_address)],
    ["Company / registration number", answerToString(d.profile?.registration_number)],
    ["Incorporation jurisdiction", answerToString(d.profile?.incorporation_jurisdiction)],
    ["Sector", d.client?.sector ?? "—"],
    ["Employee band", d.profile?.employee_band ?? "—"],
    ["DPO", `${d.profile?.dpo_name ?? "Not designated"}${d.profile?.dpo_email ? ` <${d.profile.dpo_email}>` : ""}${d.profile?.dpo_phone ? ` · ${d.profile.dpo_phone}` : ""}`],
    ["EU representative", `${d.profile?.eu_rep_name ?? "—"}${d.profile?.eu_rep_email ? ` <${d.profile.eu_rep_email}>` : ""}`],
    ["UK representative", `${d.profile?.uk_rep_name ?? "—"}${d.profile?.uk_rep_email ? ` <${d.profile.uk_rep_email}>` : ""}`],
    ["Jurisdictions", jurisdictionList(d.jurisdictions, true) || "—"],
    ["Document date", d.settings.documentDate],
    ["Author", d.settings.authorName],
    ["Version", d.session.version_number],
    ...(d.settings.internalReference
      ? [["Internal reference", d.settings.internalReference]]
      : []),
    [],
    ["Attestation"],
    ["Approved by (name)", d.settings.approvedByName ?? TO_BE_COMPLETED],
    ["Approved by (title)", d.settings.approvedByTitle ?? TO_BE_COMPLETED],
    ["Approval date", d.settings.approvalDate ?? TO_BE_COMPLETED],
    ["Next review due", d.settings.nextReviewDue],
  ]);
  XLSX.utils.book_append_sheet(wb, clientSheet, "Client record");

  // Sheet 2 — activities
  const activityHeader = [
    "Activity",
    "Role",
    "Category",
    "Activity owner",
    "Purpose",
    "Lawful basis",
    "Special category basis",
    "Data subjects",
    "Data categories",
    "Collection sources",
    "Processing operations performed",
    "Processors / recipients",
    "Transfer destination",
    "Transfer mechanism",
    "Retention",
    "Retention by data category",
    "Rights-handling process",
    "Related LIA / DPIA",
    "Security measures",
    "Access controls",
    "Last reviewed",
  ];
  const activityRows = d.activities.map((a) => {
    const ans = d.answersByActivity[a.id] ?? {};
    return [
      a.display_name,
      activityRole(ans, d.profile),
      a.category,
      answerToString(ans.activity_owner),
      answerToString(ans.purpose),
      lawfulBasisLabel(ans.lawful_basis),
      answerToString(ans.special_category_basis),
      answerToString(ans.data_subjects),
      answerToString(ans.data_categories),
      answerToString(ans.collection_sources),
      processingOperationsLabel(ans.processing_operations),
      answerToString(ans.processor_platform ?? ans.recipients),
      answerToString(ans.transfer_destination ?? "None"),
      answerToString(ans.transfer_mechanism),
      answerToString(ans.retention_period),
      retentionByCategory(ans) ?? "—",
      rightsHandlingLabel(ans, d.profile),
      relatedAssessmentsLabel(ans.related_assessments),
      answerToString(ans.security_measures),
      answerToString(ans.access_controls),
      d.settings.documentDate,
    ];
  });

  const activitySheet = XLSX.utils.aoa_to_sheet([activityHeader, ...activityRows]);
  XLSX.utils.book_append_sheet(wb, activitySheet, "Activities");

  const answerSheet = XLSX.utils.aoa_to_sheet([
    ["Activity", "Question key", "Question", "Answer"],
    ...d.activities.flatMap((a) => {
      const ans = d.answersByActivity[a.id] ?? {};
      return Object.entries(ans)
        .filter(([key]) => key !== "info_card")
        .map(([key, value]) => [a.display_name, key, questionLabel(key), answerToString(value)]);
    }),
  ]);
  XLSX.utils.book_append_sheet(wb, answerSheet, "All answers");

  // Sheet 4 — transfers
  const transfers = collectTransfers(d);
  const transferSheet = XLSX.utils.aoa_to_sheet([
    ["Activity", "Data", "Destination", "Mechanism", "Basis"],
    ...transfers.map((t) => [t.activity, t.data, t.destination, t.mechanism, t.basis]),
  ]);
  XLSX.utils.sheet_add_aoa(transferSheet, [[], [REPORT_DISCLAIMER]], { origin: -1 });
  XLSX.utils.book_append_sheet(wb, transferSheet, "Transfers");

  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new Uint8Array(out);
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

