// ITEM 372 (DPIA QUALITY PILOT, METHOD 2a) — EXECUTIVE DETERMINATION BLOCK.
//
// The approved document plan puts a HEADLINE section at the top of the arc: the
// document states its determination before it states anything else. The EDPB
// template sections 0–6 are a locked CEO decision and are untouched; this block
// is ADDITIVE, and renders immediately after the identity header and the draft
// banner, before Section 0, on screen and in the PDF.
//
// It is built DETERMINISTICALLY from what the report already holds — the
// summary the engine wrote, the asks it raised, and the decision it recorded.
// Nothing here is generated, inferred, or scored: this module composes, it does
// not decide. Prose only, never a table.

export const DETERMINATION_VERSION = "det-w1-2026-08-04-item372";
export const DETERMINATION_HEADING = "Determination";

export interface DeterminationBlock {
  version: string;
  heading: string;
  /** Prose paragraphs, in render order. */
  paragraphs: string[];
  /** The missing foundations, as enumerated in the second paragraph. */
  missing_foundations: string[];
}

const MAX_FOUNDATIONS = 8;

function firstSentences(text: string, n: number): string {
  const parts = String(text ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+(?=[A-Z(“"'])/)
    .filter(Boolean);
  return parts.slice(0, n).join(" ").trim();
}

function asText(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

/** Lower-case the first letter of an ask so it reads inside a list. */
function decapitalize(s: string): string {
  const t = s.trim().replace(/[.;]+$/, "");
  if (!t) return t;
  if (/^[A-Z]{2,}/.test(t)) return t; // acronym — leave alone
  return t.charAt(0).toLowerCase() + t.slice(1);
}

function joinList(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join("; ")}; and ${items[items.length - 1]}`;
}

function numberWord(n: number): string {
  const words = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  return n < words.length ? words[n] : String(n);
}

export interface DeterminationInput {
  /** The whole report object. */
  // deno-lint-ignore no-explicit-any
  readonly report: any;
  /** Controller name, when the caller knows it from the run row. */
  readonly organizationName?: string | null;
}

export function buildDeterminationBlock(input: DeterminationInput): DeterminationBlock | null {
  const report = input?.report;
  if (!report || typeof report !== "object") return null;

  const meta = report.dpia_metadata ?? {};
  const overview = report.section_0_overview ?? {};
  const conclusion = report.section_6_conclusion ?? {};

  const controller =
    asText(input.organizationName) ||
    asText(overview?.controllers?.[0]?.name) ||
    asText(meta.controller_name);
  const activity = asText(meta.processing_activity_name) || asText(overview?.processing_name);

  const paragraphs: string[] = [];

  // 1 — what the assessment reaches, in the document's own words where it has
  // them, and from the identity facts where it does not.
  const summary = firstSentences(asText(report.executive_summary), 3);
  if (summary) {
    paragraphs.push(summary);
  } else if (controller || activity) {
    const subject = activity ? `${activity}` : "the processing described below";
    paragraphs.push(
      controller
        ? `This assessment covers ${subject}, carried out by ${controller}.`
        : `This assessment covers ${subject}.`,
    );
  }

  // 2 — the missing foundations, enumerated.
  const asks = Array.isArray(report.information_needed) ? report.information_needed : [];
  const foundations: string[] = [];
  for (const a of asks) {
    const d = typeof a === "string" ? a : asText((a as { dimensions?: unknown })?.dimensions);
    const cleaned = decapitalize(d);
    if (cleaned && !foundations.includes(cleaned)) foundations.push(cleaned);
    if (foundations.length >= MAX_FOUNDATIONS) break;
  }

  if (foundations.length) {
    const count = numberWord(foundations.length);
    const noun = foundations.length === 1 ? "foundation is" : "foundations are";
    paragraphs.push(`${count.charAt(0).toUpperCase()}${count.slice(1)} ${noun} missing: ${joinList(foundations)}.`);
  } else {
    paragraphs.push("The record answers every question this assessment had to put to it.");
  }

  // 3 — the consequence, stated plainly.
  const decision = asText(conclusion.decision);
  const incomplete =
    report.has_unresolved_placeholders === true ||
    /draft|incomplete|withheld|not\s+approved|must\s+not/i.test(decision) ||
    foundations.length > 0;

  if (incomplete) {
    paragraphs.push(
      foundations.length
        ? "Until those entries are written down, the risks this assessment records stand where it found them, and no one can sign it. The assessment is a draft."
        : "This assessment is a draft, and no one can sign it while an entry it depends on is still open.",
    );
  } else if (decision) {
    paragraphs.push(`The decision recorded is: ${decision}.`);
  }

  // 4 — what the reader should do with the rest of the document.
  paragraphs.push("The sections that follow set out each point, why it matters, and what closes it.");

  const cleaned = paragraphs.map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!cleaned.length) return null;

  return {
    version: DETERMINATION_VERSION,
    heading: DETERMINATION_HEADING,
    paragraphs: cleaned,
    missing_foundations: foundations,
  };
}

function esc(v: unknown): string {
  return String(v === null || v === undefined ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Standalone HTML for the PDF builders. "" when there is nothing to render. */
export function renderDeterminationHtml(block: DeterminationBlock | null | undefined): string {
  const paras = block?.paragraphs ?? [];
  if (!paras.length) return "";
  return `
  <section class="determination">
    <h2 class="determination-heading">${esc(block?.heading || DETERMINATION_HEADING)}</h2>
    ${paras.map((p) => `<p>${esc(p)}</p>`).join("")}
  </section>`;
}

/** Styles for `renderDeterminationHtml`; inject once per document head. */
export const DETERMINATION_CSS = `
  .determination { border:1px solid #0c2a44; border-left:5px solid #0c2a44; border-radius:8px;
    padding:16px 20px; margin:0 0 22px; background:#fbfdfe; page-break-inside:avoid; }
  .determination .determination-heading { font-size:13px; text-transform:uppercase; letter-spacing:.1em;
    color:#0c2a44; margin:0 0 10px; border:0; padding:0; }
  .determination p { margin:0 0 10px; font-size:11.5px; line-height:1.6; }
  .determination p:last-child { margin-bottom:0; }
`;
