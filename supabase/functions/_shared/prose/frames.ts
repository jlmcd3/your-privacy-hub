// ITEM 338 (PROSE PROGRAM 2 of 4) — FRAME LIBRARY: TYPES + LINT.
//
// A FRAME is a pinned narrative shape harvested from the July quality-loop2
// `sample_reports` corpus. Those documents are STYLE DONORS ONLY: they predate
// the corpus corrections and were scored by a broken loop, so no fact, no
// citation, and no legal standard from them may ever reach a customer.
//
// The lint below is the hard gate that enforces that rule. A frame may carry:
//   * prose shape and transitions,
//   * typed placeholders filled from the customer's own record,
//   * {{CITE:proposition_key}} slots filled ONLY from the verified-authority
//     registry at build time.
// Anything else that looks like law fails the lint.

export const FRAME_LIBRARY_VERSION = "prose-frames-2026-08-01-item338";

/** Placeholder types the realizer knows how to fill. */
export type PlaceholderKind =
  | "text" // free-text record value; rendered visibly quoted
  | "enum" // normalised answer token, rendered through the product adapter
  | "list" // array of record values, rendered with natural joiners
  | "date"
  | "count"
  | "cite"; // registry-only

export interface FramePlaceholder {
  /** Token as it appears in the frame body, without braces. e.g. "ENTITY". */
  readonly token: string;
  readonly kind: PlaceholderKind;
  /** Record path this placeholder is filled from (intake or report key). */
  readonly source: string;
  /** Required placeholders trigger fill-or-omit degradation when silent. */
  readonly required: boolean;
}

export interface FrameProvenance {
  /** sample_reports.id this frame was harvested from; null for fresh drafts. */
  readonly sample_report_id: string | null;
  readonly tool_slug: string;
  /** Report path the donor prose lived at, e.g. "risk_assessment_by_activity[0].processing_narrative". */
  readonly report_path: string;
  readonly harvested_at: string;
  /** "harvest" = mechanically de-facted; "draft" = authored for a thin product. */
  readonly origin: "harvest" | "draft";
  /** For drafts: the frame ids used as style exemplars. */
  readonly exemplars?: readonly string[];
}

export type FrameStatus = "pending_review" | "approved" | "rejected";

export interface Frame {
  readonly id: string;
  readonly product: string;
  /** Logical section this frame renders, e.g. "processing_narrative". */
  readonly section: string;
  readonly body: string;
  readonly placeholders: readonly FramePlaceholder[];
  readonly provenance: FrameProvenance;
  readonly status: FrameStatus;
  /** Set only when a CEO sign-off is recorded in the ledger. */
  readonly approved_in_ledger_item?: string;
}

export interface FrameSet {
  readonly product: string;
  readonly version: string;
  /** A product renders frames only when this is true AND every frame is approved. */
  readonly approved: boolean;
  readonly frames: readonly Frame[];
}

// ---------------------------------------------------------------------------
// LINT
// ---------------------------------------------------------------------------

/** Citation shapes that must never be hard-coded into a frame. */
const CITE_SHAPES: readonly RegExp[] = [
  /§+\s*\d/,
  /\bArt(?:icle|\.)\s*\d/i,
  /\b\d{2}\s*CCR\b/i,
  /\b\d{2}\s*C\.?F\.?R\.?\b/i,
  /\bRCW\s*\d/i,
  /\bGDPR\b/i,
  /\bCCPA\b/i,
  /\bCPRA\b/i,
  /\bHIPAA\b/i,
  /\bWP\s*248\b/i,
  /\bRecital\s*\d/i,
];

/** Authority/regulator assertions that must never be hard-coded into a frame. */
const AUTHORITY_SHAPES: readonly RegExp[] = [
  /\bCPPA\b/,
  /\bEDPB\b/,
  /\bAttorney General\b/i,
  /\bICO\b/,
  /\bFTC\b/,
  /\bsupervisory authority\b/i,
  /\bthe Agency\b/i,
];

/** Legal-standard paraphrases: a frame may not assert what the law requires. */
const LEGAL_STANDARD_SHAPES: readonly RegExp[] = [
  /\b(?:is|are|shall be|must be|will be)\s+(?:legally\s+)?required\b/i,
  /\bthe law requires\b/i,
  /\bstatutor(?:y|ily)\s+(?:required|mandated|obligated)\b/i,
  /\bregulation(?:s)?\s+requires?\b/i,
  /\bobligated under\b/i,
  /\bconstitutes? (?:a )?violation\b/i,
  /\bnon-?compliant with\b/i,
];

export interface FrameLintFinding {
  readonly frame_id: string;
  readonly rule:
    | "hardcoded_citation"
    | "authority_assertion"
    | "legal_standard"
    | "unknown_placeholder"
    | "malformed_placeholder"
    | "undeclared_placeholder"
    | "empty_body";
  readonly detail: string;
}

const PLACEHOLDER_RE = /\{\{([A-Z0-9_]+)(?::([a-z_]+))?\}\}/g;

export function extractPlaceholders(body: string): { token: string; kind?: string }[] {
  const out: { token: string; kind?: string }[] = [];
  PLACEHOLDER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PLACEHOLDER_RE.exec(String(body ?? ""))) !== null) {
    out.push({ token: m[1], kind: m[2] });
  }
  return out;
}

/** Body with every placeholder removed — what the lint actually inspects. */
export function frameProseOnly(body: string): string {
  return String(body ?? "").replace(PLACEHOLDER_RE, " ");
}

export function lintFrame(frame: Frame): FrameLintFinding[] {
  const findings: FrameLintFinding[] = [];
  const push = (rule: FrameLintFinding["rule"], detail: string) =>
    findings.push({ frame_id: frame.id, rule, detail });

  const body = String(frame.body ?? "");
  if (!body.trim()) {
    push("empty_body", "frame body is empty");
    return findings;
  }

  const prose = frameProseOnly(body);
  for (const re of CITE_SHAPES) {
    const hit = prose.match(re);
    if (hit) push("hardcoded_citation", hit[0]);
  }
  for (const re of AUTHORITY_SHAPES) {
    const hit = prose.match(re);
    if (hit) push("authority_assertion", hit[0]);
  }
  for (const re of LEGAL_STANDARD_SHAPES) {
    const hit = prose.match(re);
    if (hit) push("legal_standard", hit[0]);
  }

  for (const used of extractPlaceholders(body)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(used.token)) {
      push("malformed_placeholder", used.token);
    }
  }

  const declared = new Map(frame.placeholders.map((p) => [p.token, p]));
  for (const used of extractPlaceholders(body)) {
    const decl = declared.get(used.token);
    if (!decl) {
      push("undeclared_placeholder", used.token);
      continue;
    }
    if (used.kind && used.kind !== decl.kind) {
      push("unknown_placeholder", `${used.token}: body says :${used.kind}, declaration says ${decl.kind}`);
    }
  }
  for (const p of frame.placeholders) {
    if (!body.includes(`{{${p.token}`)) {
      push("undeclared_placeholder", `${p.token} declared but absent from body`);
    }
    if (p.kind === "cite" && !/^[a-z0-9_]+$/.test(p.source)) {
      push("unknown_placeholder", `${p.token}: cite source must be a registry proposition key`);
    }
  }

  return findings;
}

export function lintFrameSet(set: FrameSet): FrameLintFinding[] {
  return set.frames.flatMap(lintFrame);
}

/**
 * A frame set may render to customers only when it is explicitly approved and
 * every one of its frames is clean. Called by the realizer, not just tests.
 */
export function frameSetRenderable(set: FrameSet): boolean {
  if (!set.approved) return false;
  if (!set.frames.length) return false;
  if (set.frames.some((f) => f.status !== "approved")) return false;
  return lintFrameSet(set).length === 0;
}
