// /all-ptest — DEEP REVIEW document source.
//
// Fetches the intake payload and the EXACT customer-facing document text for
// one generated run, for every product family the all-products harness can
// dispatch. This is a read-only mirror of the fetch block in
// grade-single-assessment/index.ts (registration shape, session shape, the
// nine QL3 row shapes): Supabase edge functions cannot import across function
// directories, and grade-single-assessment is a pinned grader, so the fetch is
// mirrored here rather than moved. Keep the two in sync when a product's row
// shape changes.
//
// CARRIED FORWARD from the grading path:
//   * skeleton_document is the customer document once present — the legacy
//     body column (analysis_text / playbook_text / document_text) is stale
//     and is never shown to a reviewer (A-TEAM DELTA 2026-08-31).
//   * HTML entities in notice output are decoded before review, so a reviewer
//     never reports "&#39;" as a defect the customer cannot see (DOC 188).
//   * A hard character cap bounds the payload so an unusually large document
//     can never blow the request body or the isolate (byte-size discipline).

import { extractCustomerDocument } from "../grader/payload.ts";

/** Hard cap on the document text handed to a reviewer. */
export const REVIEW_DOC_CAP = 400_000;
/** Hard cap on the intake JSON handed to a reviewer. */
export const REVIEW_INTAKE_CAP = 120_000;

export const QL3_TOOL_SLUGS = [
  "governance", "cppa-risk", "cppa-cyber", "cppa-admt",
  "dpia", "lia", "ir-playbook", "biometric", "dpa",
] as const;
export const SESSION_TOOL_SLUGS = ["ropa", "us-notice", "eu-notice"] as const;
export const REGISTRATION_TOOL_SLUG = "registration" as const;

export type Ql3Tool = typeof QL3_TOOL_SLUGS[number];
export type SessionTool = typeof SESSION_TOOL_SLUGS[number];
export type ReviewTool = Ql3Tool | SessionTool | typeof REGISTRATION_TOOL_SLUG;

export function isReviewTool(x: unknown): x is ReviewTool {
  return typeof x === "string" && (
    (QL3_TOOL_SLUGS as readonly string[]).includes(x) ||
    (SESSION_TOOL_SLUGS as readonly string[]).includes(x) ||
    x === REGISTRATION_TOOL_SLUG
  );
}

type ToolRowSpec = {
  table: string;
  intakeCols: string[];
  reportCol: "report_data";
  bodyCol?: string;
  bodyKey?: string;
};

const LI_INTAKE_COLS = [
  "organization_name", "sector", "jurisdictions", "relationship_type",
  "data_categories", "stated_purpose", "processing_description",
  "purpose_details", "necessity_details", "balancing_details",
  "alternatives_considered", "supplemental_context", "supplemental_responses",
  "subject_anchor", "preview_signal", "attestation",
];

export const TOOL_TABLE: Record<Ql3Tool, ToolRowSpec> = {
  "governance":  { table: "governance_assessments", intakeCols: ["intake_data"], reportCol: "report_data" },
  "cppa-risk":   { table: "cppa_assessments",       intakeCols: ["intake_data"], reportCol: "report_data" },
  "cppa-cyber":  { table: "cppa_assessments",       intakeCols: ["intake_data"], reportCol: "report_data" },
  "cppa-admt":   { table: "cppa_assessments",       intakeCols: ["intake_data"], reportCol: "report_data" },
  "dpia":        { table: "dpia_frameworks",        intakeCols: ["intake_data"], reportCol: "report_data" },
  "lia":         { table: "li_assessments",         intakeCols: LI_INTAKE_COLS,  reportCol: "report_data" },
  "ir-playbook": { table: "ir_playbooks",           intakeCols: ["intake_data"], reportCol: "report_data", bodyCol: "playbook_text", bodyKey: "playbook_text" },
  "biometric":   { table: "biometric_assessments",  intakeCols: ["intake_data"], reportCol: "report_data", bodyCol: "analysis_text", bodyKey: "assessment_text" },
  "dpa":         { table: "dpa_documents",          intakeCols: ["intake_data"], reportCol: "report_data", bodyCol: "document_text", bodyKey: "document_text" },
};

// DOC 188 — entity decoding mirror (grade-single-assessment).
const NAMED_ENTITIES: Record<string, string> = {
  quot: "\"", apos: "'", lt: "<", gt: ">", nbsp: " ",
  rsquo: "\u2019", lsquo: "\u2018", ldquo: "\u201c", rdquo: "\u201d",
  mdash: "\u2014", ndash: "\u2013", hellip: "\u2026",
  sect: "\u00a7", para: "\u00b6", copy: "\u00a9", reg: "\u00ae",
  trade: "\u2122", euro: "\u20ac", pound: "\u00a3",
};

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d{1,7});/g, (m, d: string) => {
      const cp = Number(d);
      return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    })
    .replace(/&#x([0-9a-f]{1,6});/gi, (m, h: string) => {
      const cp = parseInt(h, 16);
      return Number.isFinite(cp) && cp > 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : m;
    })
    .replace(/&([a-z]+);/gi, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/&amp;/g, "&");
}

export function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function hasSkeletonDocument(report: unknown): boolean {
  const rd = report as Record<string, unknown> | null;
  const sk = rd && typeof rd === "object" ? rd.skeleton_document : null;
  return !!sk && typeof sk === "object" && Array.isArray((sk as { sections?: unknown }).sections);
}

export interface ReviewDocument {
  id: string;
  tool: ReviewTool;
  intakeJson: string;
  documentText: string;
  documentField: string;
  truncated: boolean;
  originalLength: number;
}

export interface ReviewFetchError {
  error: string;
  status: number;
}

function sliceIntake(intake: unknown): string {
  let s: string;
  try { s = JSON.stringify(intake ?? {}); } catch { s = String(intake); }
  if (s.length <= REVIEW_INTAKE_CAP) return s;
  return `${s.slice(0, REVIEW_INTAKE_CAP)}[...intake truncated at ${REVIEW_INTAKE_CAP} chars...]`;
}

function documentTextFrom(report: unknown): { field: string; text: string } {
  const rd = (report && typeof report === "object") ? report as Record<string, unknown> : {};
  const doc = extractCustomerDocument(rd);
  if (doc) return { field: doc.field, text: decodeHtmlEntities(doc.text) };
  // Legacy / register-shaped records with no single document field: the whole
  // report is the document. Never silently review nothing.
  let s: string;
  try { s = JSON.stringify(rd, null, 2); } catch { s = String(rd); }
  return { field: "report_data", text: decodeHtmlEntities(s) };
}

// deno-lint-ignore no-explicit-any
type Admin = any;

async function fetchSessionShaped(
  admin: Admin,
  tool: SessionTool,
  id: string,
): Promise<{ intake: unknown; report: unknown; id: string } | ReviewFetchError> {
  if (tool === "ropa") {
    let sessionId = id;
    let { data: session } = await admin
      .from("ropa_sessions")
      .select("id, status, org_name, client_id, register_document")
      .eq("id", id)
      .maybeSingle();
    if (!session) {
      const { data: ver } = await admin
        .from("ropa_document_versions").select("session_id").eq("id", id).maybeSingle();
      if (!ver) return { error: "assessment_not_found", status: 404 };
      sessionId = (ver as Record<string, unknown>).session_id as string;
      const res = await admin
        .from("ropa_sessions")
        .select("id, status, org_name, client_id, register_document")
        .eq("id", sessionId).maybeSingle();
      session = res.data;
    }
    if (!session) return { error: "assessment_not_found", status: 404 };
    const s = session as Record<string, unknown>;
    if (!s.register_document) return { error: "assessment_not_generated", status: 400 };
    const [{ data: profile }, { data: activities }, { data: answers }, { data: jur }] = await Promise.all([
      admin.from("ropa_client_profiles").select("*").eq("client_id", s.client_id as string).maybeSingle(),
      admin.from("ropa_processing_activities").select("id, display_name, category, template_key").eq("session_id", s.id as string),
      admin.from("ropa_answers").select("activity_id, question_key, answer_value").eq("session_id", s.id as string),
      admin.from("ropa_jurisdiction_selections").select("jurisdiction_code").eq("client_id", s.client_id as string),
    ]);
    return {
      id: s.id as string,
      intake: { org_name: s.org_name, profile, jurisdictions: jur, activities, answers },
      report: s.register_document,
    };
  }

  const sessionTable = tool === "us-notice" ? "us_notice_sessions" : "eu_notice_sessions";
  const answersTable = tool === "us-notice" ? "us_notice_answers" : "eu_notice_answers";
  const docsTable = tool === "us-notice" ? "us_notice_documents" : "eu_notice_documents";
  const selTable = tool === "us-notice" ? "us_notice_state_selections" : "eu_notice_framework_selections";
  const bucket = tool === "us-notice" ? "us-notices" : "eu-notices";

  const { data: session } = await admin.from(sessionTable).select("*").eq("id", id).maybeSingle();
  if (!session) return { error: "assessment_not_found", status: 404 };
  const [{ data: answers }, { data: selections }, { data: docs }] = await Promise.all([
    admin.from(answersTable).select("question_key, answer_value").eq("session_id", id),
    admin.from(selTable).select("*").eq("session_id", id),
    admin.from(docsTable).select("file_path, document_format, is_combined, is_current").eq("session_id", id).eq("is_current", true),
  ]);
  const docRows = (docs ?? []) as Array<Record<string, unknown>>;
  if (docRows.length === 0) return { error: "assessment_not_generated", status: 400 };
  const chosen = docRows.filter((d) => d.is_combined).length > 0
    ? docRows.filter((d) => d.is_combined)
    : docRows;
  const parts: string[] = [];
  for (const d of chosen) {
    const { data: file } = await admin.storage.from(bucket).download(d.file_path as string);
    if (!file) continue;
    parts.push(stripHtml(await file.text()));
  }
  if (parts.length === 0) return { error: "assessment_not_generated", status: 400 };
  return {
    id,
    intake: { session, answers, selections },
    report: { document_text: parts.join("\n\n---\n\n") },
  };
}

/** Fetch intake + the exact customer document text for one generated run. */
export async function fetchReviewDocument(
  admin: Admin,
  tool: ReviewTool,
  assessmentId: string,
): Promise<ReviewDocument | ReviewFetchError> {
  let intake: unknown;
  let report: unknown;
  let rowId = assessmentId;

  if (tool === REGISTRATION_TOOL_SLUG) {
    const { data: row, error } = await admin
      .from("registration_assessments")
      .select("id, status, intake_data, result_summary")
      .eq("id", assessmentId).maybeSingle();
    if (error) return { error: error.message, status: 500 };
    if (!row) return { error: "assessment_not_found", status: 404 };
    const r = row as Record<string, unknown>;
    const status = String(r.status ?? "");
    if (status !== "completed" && status !== "complete") return { error: "assessment_not_generated", status: 400 };
    if (!r.result_summary) return { error: "assessment_not_generated", status: 400 };
    rowId = r.id as string;
    intake = r.intake_data ?? {};
    report = r.result_summary;
  } else if ((SESSION_TOOL_SLUGS as readonly string[]).includes(tool)) {
    const fetched = await fetchSessionShaped(admin, tool as SessionTool, assessmentId);
    if ("error" in fetched) return fetched;
    rowId = fetched.id;
    intake = fetched.intake;
    report = fetched.report;
  } else {
    const spec = TOOL_TABLE[tool as Ql3Tool];
    const cols = ["id", "status", spec.reportCol, ...spec.intakeCols];
    if (spec.bodyCol) cols.push(spec.bodyCol);
    const { data: row, error } = await admin
      .from(spec.table).select(cols.join(", ")).eq("id", assessmentId).maybeSingle();
    if (error) return { error: error.message, status: 500 };
    if (!row) return { error: "assessment_not_found", status: 404 };
    const rowAny = row as Record<string, unknown>;
    if (!rowAny[spec.reportCol]) return { error: "assessment_not_generated", status: 400 };
    rowId = rowAny.id as string;
    intake = spec.intakeCols.length === 1
      ? rowAny[spec.intakeCols[0]]
      : Object.fromEntries(spec.intakeCols.map((c) => [c, rowAny[c]]));
    report = rowAny[spec.reportCol];
    if (spec.bodyCol && spec.bodyKey && !hasSkeletonDocument(report)) {
      const rd = (report && typeof report === "object") ? { ...(report as Record<string, unknown>) } : {};
      rd[spec.bodyKey] = rowAny[spec.bodyCol] ?? "";
      report = rd;
    }
  }

  const { field, text } = documentTextFrom(report);
  const originalLength = text.length;
  const truncated = originalLength > REVIEW_DOC_CAP;
  return {
    id: rowId,
    tool,
    intakeJson: sliceIntake(intake),
    documentText: truncated
      ? `${text.slice(0, REVIEW_DOC_CAP)}\n[...document truncated at ${REVIEW_DOC_CAP} characters; tail not reviewed...]`
      : text,
    documentField: field,
    truncated,
    originalLength,
  };
}
