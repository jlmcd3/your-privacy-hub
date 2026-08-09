/**
 * ITEM 422-D DEFECT 1 — FINDING → ACTION PINPOINT INHERITANCE.
 *
 * The 422-C pilot shipped priority actions anchored on catch-all subsections
 * (§ 7221(a), § 7222(a)) while THE SAME DOCUMENT'S gap findings already
 * carried the finer, registry-verified pinpoint for the very duty the action
 * remediates (rank 4: action § 7221(a); its source finding
 * `optout_designated_methods` → § 7221 / § 7221(c)(1) in terms).
 *
 * THE RULE: when a priority action DERIVES from a gap finding, the action
 * INHERITS that finding's pinpoint and proposition byte-identically. The
 * model never re-assigns what the document already resolved. Where an action
 * has NO source finding, nothing is written here and the 422-C anchor
 * vocabulary gate (`resolveAdmtActionCitations`) applies unchanged.
 *
 * LINKAGE MECHANISM — deterministic lexical derivation. No model, no clock,
 * no I/O. For each action we score every gap finding by CONTAINMENT of the
 * action's content tokens in the finding's own text (element + finding +
 * remediation). A link is taken only when the best score clears
 * `MIN_SCORE` and beats the runner-up by `MIN_MARGIN` — an ambiguous match
 * is NO match, and the action falls through to the anchor gate.
 *
 * Fail-open: any throw leaves `priority_actions` untouched.
 */

export const ADMT_ACTION_LINKAGE_VERSION =
  "admt-action-finding-linkage@item422d-2026-08-09";

/** Buckets that carry gap findings, in document order. */
export const GAP_BUCKETS: readonly string[] = [
  "notice_gaps",
  "opt_out_gaps",
  "access_gaps",
];

/** A link is taken only above this containment score. */
export const MIN_SCORE = 0.34;
/** ...and only when it beats the runner-up by this margin. */
export const MIN_MARGIN = 0.08;

const STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "onto", "each",
  "must", "shall", "should", "will", "when", "where", "which", "their", "there",
  "have", "has", "been", "before", "after", "under", "over", "than", "then",
  "business", "businesses", "consumer", "consumers", "record", "records",
  "document", "documented", "documents", "requirement", "requirements",
  "provision", "provisions", "section", "subsection", "ccr", "not", "any",
  "all", "its", "also", "such", "these", "those", "does", "did", "including",
  "include", "includes", "within", "state", "states", "stated",
]);

function tokens(s: string): string[] {
  return String(s ?? "")
    .toLowerCase()
    .replace(/11\s*ccr\s*§+\s*[\d().a-z\u2013-]+/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length >= 4 && !STOPWORDS.has(t));
}

function findingText(f: Record<string, unknown>): string {
  return [f.element, f.finding, f.remediation, f.element_id]
    .map((v) => (typeof v === "string" ? v : ""))
    .join(" ");
}

/** Containment of the action's content tokens in the finding's token set. */
export function linkageScore(actionText: string, finding: Record<string, unknown>): number {
  const a = new Set(tokens(actionText));
  if (a.size === 0) return 0;
  const f = new Set(tokens(findingText(finding)));
  if (f.size === 0) return 0;
  let hits = 0;
  for (const t of a) if (f.has(t)) hits++;
  return hits / a.size;
}

export interface SourceFindingRef {
  bucket: string;
  index: number;
  element_id: string;
  score: number;
}

export interface AdmtActionLinkageDiag {
  version: string;
  actions: number;
  linked: number;
  inherited_citation: number;
  inherited_key: number;
  cleared_key: number;
  unlinked: number;
  ambiguous: number;
  crashed: boolean;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Resolve the ONE source finding for an action, or null when none/ambiguous.
 */
export function findSourceFinding(
  actionText: string,
  report: Record<string, unknown>,
): { ref: SourceFindingRef; finding: Record<string, unknown> } | null {
  let best: { ref: SourceFindingRef; finding: Record<string, unknown> } | null = null;
  let runnerUp = 0;
  for (const bucket of GAP_BUCKETS) {
    const arr = report[bucket];
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i++) {
      const f = arr[i];
      if (!f || typeof f !== "object" || Array.isArray(f)) continue;
      const score = linkageScore(actionText, f as Record<string, unknown>);
      if (!best || score > best.ref.score) {
        if (best) runnerUp = best.ref.score;
        best = {
          ref: { bucket, index: i, element_id: str((f as Record<string, unknown>).element_id), score },
          finding: f as Record<string, unknown>,
        };
      } else if (score > runnerUp) {
        runnerUp = score;
      }
    }
  }
  if (!best || best.ref.score < MIN_SCORE) return null;
  if (best.ref.score - runnerUp < MIN_MARGIN) return null;
  return best;
}

/**
 * THE SINGLE INHERITANCE SITE. Runs directly after the item422 typed-record
 * normaliser and BEFORE `resolveAdmtActionCitations`. Entries that inherit
 * are marked `_citation_inherited = true` so the anchor gate leaves the
 * document's own resolution alone.
 */
export function linkAdmtActionsToFindings(report: unknown): AdmtActionLinkageDiag {
  const diag: AdmtActionLinkageDiag = {
    version: ADMT_ACTION_LINKAGE_VERSION,
    actions: 0,
    linked: 0,
    inherited_citation: 0,
    inherited_key: 0,
    cleared_key: 0,
    unlinked: 0,
    ambiguous: 0,
    crashed: false,
  };
  try {
    const r = report as Record<string, unknown> | null;
    if (!r || typeof r !== "object") return diag;
    const raw = r.priority_actions;
    if (!Array.isArray(raw) || raw.length === 0) return diag;

    for (const entry of raw) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const e = entry as Record<string, unknown>;
      diag.actions++;
      const text = str(e.action) || str(e.text) || str(e.title);
      if (!text) { diag.unlinked++; continue; }

      const hit = findSourceFinding(text, r);
      if (!hit) { diag.unlinked++; continue; }

      const cit = str(hit.finding.citation);
      if (!cit) { diag.unlinked++; continue; }

      diag.linked++;
      // BYTE-IDENTICAL inheritance of the document's own resolved pinpoint.
      e.citation = hit.finding.citation as string;
      diag.inherited_citation++;
      const fpk = str(hit.finding.proposition_key);
      if (fpk) {
        e.proposition_key = fpk;
        diag.inherited_key++;
      } else if (str(e.proposition_key)) {
        // The finding resolved no proposition: the action must not assert one.
        e.proposition_key = "";
        diag.cleared_key++;
      }
      e._citation_inherited = true;
      e._citation_source = "inherited_from_finding";
      e._source_finding = {
        bucket: hit.ref.bucket,
        index: hit.ref.index,
        element_id: hit.ref.element_id,
        score: Number(hit.ref.score.toFixed(3)),
      };
    }
  } catch (err) {
    diag.crashed = true;
    console.warn("[admt-action-finding-linkage] failed (non-fatal):", (err as Error)?.message);
  }
  return diag;
}
