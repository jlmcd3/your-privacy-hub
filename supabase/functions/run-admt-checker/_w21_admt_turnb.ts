// WAVE21-FIX TURN B (cppa-admt) — targeted post-pass sanitiser.
//
// Runs AFTER _w20_admt_turna.ts (B1/B2/B4) and BEFORE the LEAK-PREV emit
// gate. Fail-open, idempotent, customer-facing only.
//
// Source of record: docs/pipeline-state.md items 47/48/49 and
// docs/courier/WAVE21-DIGEST-2026-07-25.md §5.
//
// Work items (see courier WAVE21-FIX-TURNB-ADMT-2026-07-25.md):
//   B1 — REGISTRY-FIRST FALLBACK RESOLUTION AT KEYLESS CALL SITES.
//        Extend the w19 A1 registry consult to entries with no
//        proposition_key. When the entry carries the neutral fallback
//        phrase (or an empty citation) AND its own prose fields carry a
//        subsection anchor that exists in the registry, promote that
//        subsection to citation. Never invents.
//   B2 — NO EMPTY CITATION FIELDS ON OPT_OUT_GAPS (and any *_gaps).
//        An entry with empty/absent citation must resolve a
//        registry-verified pinpoint (via proposition_key or an in-prose
//        anchor already in the registry) or receive the neutral catalog
//        phrase; never an empty string.
//   B3 — BODY-TEXT COUNSEL-REFERRAL SCRUB. Rewrites "your Privacy
//        Officer should…" class sentences to a neutral form. Extends the
//        w9 pre-emit G2 pass to any customer-facing prose field the
//        model added post-G2 (defence in depth).
//   B4 — § 7001(e)(1)/§ 7001(ddd) definitional-cite guard on citation
//        fields. When an entry's CITATION consists solely of § 7001
//        subsection(s) but the entry is stating an action duty, either
//        promote to a resolvable subchapter provision (from entry
//        prose) or downgrade to the neutral catalog phrase — never
//        stand § 7001 alone as a duty anchor.
//   B5 — § 7155(a)(1) SUBMISSION-VS-TIMING GUARD in deadline_table.
//        The verbatim quote for § 7155(a)(1) covers "conduct and
//        document a risk assessment … before initiating any processing
//        activity …" — a timing anchor for RA conduct, NOT a
//        submission-content anchor. Timing rows in deadline_table that
//        cite § 7155(a)(1) but are labelled as content-of-submission
//        propositions get their citation downgraded; content-labelled
//        rows keep it. (The 4-way guard is deliberately conservative:
//        we only downgrade when the row IS content-typed. Timing rows
//        that legitimately cite it are unaffected.)
//   B6 — § 7150(b)(3) PROPOSITION GUARD. § 7150(b)(3) is the ADMT
//        threshold trigger for risk assessments; not a sell/share
//        documentation anchor. Downgrade the citation to the neutral
//        catalog phrase when the entry's proposition_key is NOT
//        ra_trigger_admt AND the entry prose/topic does NOT explicitly
//        reference "ADMT" AND "risk assessment" together.
//   B7 — INTAKE-SUPPORTED TIMELINE RESTORATION. w19 A4 stripped every
//        unmatched timeline into "on a timeline that requires
//        confirmation" and set information_needed=true. Where the
//        intake DOES carry a concrete access-response timeline
//        ("Within 45 calendar days"), restore the timeline into the
//        entry and clear the information_needed flag.
//   B8 — TELEMETRY: attach `_meta.internal.admt_w21b` mirroring the
//        risk-side A5 pattern (item 48). Also copies the w19/w20
//        turn-A diags into `_meta.internal.admt_w19a` /
//        `_meta.internal.admt_w20a` so wave-going-forward pass
//        telemetry is preserved by the P2 whitelist serializer.
//
// GUARDRAILS: no rubric/grader/registry/corpus/fixture/contract edits;
// no invented pinpoints (registry rows only); every mutation is
// deterministic; unit-tested in _tests/w21-admt-turnb.test.ts.

import {
  ADMT_VERIFIED_AUTHORITIES,
} from "../_shared/registry/admt-verified-authorities.ts";
import {
  resolveByPropositionKey,
} from "../_shared/verified-authority-resolver.ts";

export const W21_ADMT_TURNB_STAMP = "w21-admt-turnb@2026-07-25T12:20:33Z";

// Fallback / neutral phrasing.
const FALLBACK = "the applicable ADMT-subchapter provision";
const FALLBACK_ESC = FALLBACK.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const NEUTRAL_CITATION = "11 CCR §§ 7200–7222";

// Verified pinpoint set (exact subsection strings from registry).
const VERIFIED_SUBSECTIONS: Set<string> = new Set(
  Object.values(ADMT_VERIFIED_AUTHORITIES).map((r: any) => String(r.subsection || "")),
);

// Map: registry subsection string → proposition_key.
const SUBSECTION_TO_PK: Map<string, string> = new Map(
  Object.values(ADMT_VERIFIED_AUTHORITIES).map((r: any) => [String(r.subsection), String(r.proposition_key)]),
);

// Registry subsections that are § 7001 (definitions only).
const DEFINITIONAL_S7001_RE = /^11\s*CCR\s*§\s*7001(?:\([^)]+\))+\s*$/;

// Citation-token extractor: any "11 CCR § NNNN(...)" chunk in text.
const CITATION_TOKEN_RE = /11\s*CCR\s*§\s*\d+(?:\s*\([^)]+\))*/g;

// Duty-verb detector (mirrors w9 G1_DUTY_VERB_RE — locally re-authored to
// remain grader-neutral).
const DUTY_VERB_RE =
  /\b(?:must\s+(?:disclose|provide|notify|respond|confirm|deliver|honor|honour|allow|permit|conduct|document|submit)|shall\s+(?:disclose|provide|notify|respond|honor|honour|conduct|document|submit)|the\s+business\s+must|response\s+must|access\s+response|opt[-\s]?out\s+response|pre[-\s]?use\s+notice|access\s+request)\b/i;

// Counsel-referral detector — B3 (locally re-authored; see w9 G2 note).
const COUNSEL_REF_RE =
  /\b(?:(?:your|the\s+business['’]s|the\s+organi[sz]ation['’]s)\s+(?:privacy\s+officer|dpo|counsel|legal\s+team|legal\s+counsel|attorneys?|lawyers?)\s+(?:should|must|will|is\s+encouraged\s+to|is\s+advised\s+to)\b|(?:consult|engage|retain|escalate\s+to|refer\s+to|coordinate\s+with|review\s+with|obtain\s+(?:sign[-\s]?off|advice|guidance)\s+from|seek\s+(?:advice|guidance|legal\s+advice)\s+(?:from|on))\s+(?:the\s+business['’]s\s+)?(?:qualified\s+)?(?:outside|external|in[-\s]?house|your\s+privacy|your\s+legal|independent)?\s*(?:legal\s+)?(?:counsel|attorneys?|lawyers?|legal\s+team|privacy\s+officer))\b/i;
const OWNERSHIP_DISCLAIMER_RE = /must\s+review,?\s+complete,?\s+and\s+own\b/i;
const COUNSEL_NEUTRAL = "Qualified counsel must review this item before operational use.";

// B7: known intake timeline fields.
const INTAKE_TIMELINE_FIELDS = ["access_response_timeline", "response_timeline", "opt_out_timeline"];
const A4_STUB_RE = /on\s+a\s+timeline\s+that\s+requires\s+confirmation/i;
const TIMELINE_EXTRACT_RE = /within\s+(\d{1,3})\s+(business|calendar)\s+days/i;

const CUSTOMER_BUCKETS = [
  "notice_gaps", "opt_out_gaps", "access_gaps",
  "documentation_to_maintain", "top_3_actions", "priority_actions",
];

const GAP_BUCKETS = ["notice_gaps", "opt_out_gaps", "access_gaps"];

export interface W21TurnBDiag {
  version: string;
  b1_keyless_resolved: number;
  b2_empty_citations_filled: number;
  b3_counsel_scrubs: number;
  b4_definitional_only_downgrades: number;
  b5_7155_content_row_downgrades: number;
  b6_7150b3_misapplication_downgrades: number;
  b7_timelines_restored: number;
  strings_scanned: number;
  entries_scanned: number;
}

// ── Helpers ────────────────────────────────────────────────────────────

function extractAnchorFromEntry(entry: any): string | null {
  // Scan prose fields for a "11 CCR § NNNN(...)" token that matches a
  // registry subsection exactly.
  if (!entry || typeof entry !== "object") return null;
  for (const k of Object.keys(entry)) {
    if (k === "citation" || k === "citations") continue;
    const v = entry[k];
    if (typeof v !== "string" || v.length === 0) continue;
    const matches = v.match(CITATION_TOKEN_RE) || [];
    for (const raw of matches) {
      const norm = raw.replace(/\s+/g, " ").trim();
      if (VERIFIED_SUBSECTIONS.has(norm)) return norm;
    }
  }
  return null;
}

function citationIsFallbackOrEmpty(c: unknown): boolean {
  if (typeof c !== "string") return true;
  const t = c.trim();
  if (!t) return true;
  if (t === FALLBACK) return true;
  return false;
}

function citationTokens(c: string): string[] {
  return (c.match(CITATION_TOKEN_RE) || []).map((t) => t.replace(/\s+/g, " ").trim());
}

function extractIntakeTimeline(intake: any): string | null {
  if (!intake || typeof intake !== "object") return null;
  for (const f of INTAKE_TIMELINE_FIELDS) {
    const v = (intake as any)[f];
    if (typeof v !== "string") continue;
    const m = v.match(TIMELINE_EXTRACT_RE);
    if (m) return `within ${m[1]} ${m[2].toLowerCase()} days`;
  }
  return null;
}

// ── B1/B2 — per-entry keyless registry resolution + empty-citation fill.
export function resolveKeylessAndFill(
  entry: any,
  bucket: string,
): { b1: number; b2: number } {
  const diag = { b1: 0, b2: 0 };
  if (!entry || typeof entry !== "object") return diag;
  const pk = typeof entry.proposition_key === "string" ? entry.proposition_key.trim() : "";
  // If keyed and citation already sane, nothing to do here (w19 A1 owns keyed).
  if (pk) {
    // Still B2: fill empty citation from resolved row.
    if (!("citation" in entry) || (typeof entry.citation === "string" && !entry.citation.trim())) {
      const row = resolveByPropositionKey(ADMT_VERIFIED_AUTHORITIES, pk);
      if (row) {
        entry.citation = row.subsection;
        diag.b2++;
      } else {
        entry.citation = NEUTRAL_CITATION;
        diag.b2++;
      }
    }
    return diag;
  }
  // Keyless path.
  const empty = citationIsFallbackOrEmpty(entry.citation);
  if (!empty) return diag;
  const anchor = extractAnchorFromEntry(entry);
  if (anchor) {
    entry.citation = anchor;
    const foundPk = SUBSECTION_TO_PK.get(anchor);
    if (foundPk) entry.proposition_key = foundPk;
    diag.b1++;
    return diag;
  }
  // B2 — no anchor found; if this is a gap bucket and citation is empty
  // (not just fallback), promote neutral catalog phrase.
  if (GAP_BUCKETS.includes(bucket)) {
    if (typeof entry.citation !== "string" || !entry.citation.trim()) {
      entry.citation = NEUTRAL_CITATION;
      diag.b2++;
    }
  }
  return diag;
}

// ── B3 — sentence-level counsel-referral scrub across prose fields.
function splitSentences(text: string): string[] {
  if (!text) return [];
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
}

export function scrubCounselReferralProse(text: string): { out: string; hits: number } {
  if (typeof text !== "string" || text.length === 0) return { out: text, hits: 0 };
  const sents = splitSentences(text);
  let hits = 0;
  const kept: string[] = [];
  for (const s of sents) {
    if (COUNSEL_REF_RE.test(s) && !OWNERSHIP_DISCLAIMER_RE.test(s)) {
      hits++;
      kept.push(COUNSEL_NEUTRAL);
      continue;
    }
    kept.push(s);
  }
  return { out: kept.join(" ").replace(/\s{2,}/g, " ").trim(), hits };
}

// ── B4 — definitional-only § 7001 citation guard on citation fields.
export function guardDefinitionalOnlyCitation(entry: any): number {
  if (!entry || typeof entry !== "object") return 0;
  const c = typeof entry.citation === "string" ? entry.citation.trim() : "";
  if (!c) return 0;
  const parts = c.split(/\s*\+\s*/).map((p: string) => p.trim()).filter(Boolean);
  if (parts.length === 0) return 0;
  const allS7001Def = parts.every((p: string) => DEFINITIONAL_S7001_RE.test(p));
  if (!allS7001Def) return 0;
  // Does the entry state an action duty? Look for duty verbs across prose.
  let duty = false;
  for (const k of Object.keys(entry)) {
    if (k === "citation" || k === "citations" || k === "proposition_key") continue;
    const v = entry[k];
    if (typeof v === "string" && DUTY_VERB_RE.test(v)) { duty = true; break; }
  }
  if (!duty) return 0;
  // Try to promote from anchor in prose; else downgrade to neutral.
  const anchor = extractAnchorFromEntry(entry);
  if (anchor && !DEFINITIONAL_S7001_RE.test(anchor)) {
    entry.citation = anchor;
  } else {
    entry.citation = NEUTRAL_CITATION;
  }
  return 1;
}

// ── B5 — § 7155(a)(1) submission-vs-timing guard in deadline_table.
const S7155_A1 = "11 CCR § 7155(a)(1)";
const CONTENT_ROW_RE = /submission[-\s]?content|content\s+of\s+submission|what\s+to\s+submit/i;

export function guardS7155InDeadlineTable(report: any): number {
  let downs = 0;
  if (!report || typeof report !== "object") return 0;
  const dt = (report as any).deadline_table;
  if (!dt) return 0;
  const rows: any[] = Array.isArray(dt) ? dt : (Array.isArray(dt?.rows) ? dt.rows : []);
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const cit = typeof row.citation === "string" ? row.citation : "";
    if (!cit.includes("7155(a)(1)")) continue;
    // Row IS content-labelled → citation misapplied (§ 7155(a)(1) is timing).
    const label = String(row.field ?? row.topic ?? row.label ?? row.row_type ?? "");
    const rowType = String(row.type ?? "");
    const isContent = CONTENT_ROW_RE.test(label) || CONTENT_ROW_RE.test(rowType);
    if (isContent) {
      row.citation = NEUTRAL_CITATION;
      downs++;
    }
  }
  return downs;
}

// ── B6 — § 7150(b)(3) proposition guard.
export function guardS7150b3Misapplication(entry: any): number {
  if (!entry || typeof entry !== "object") return 0;
  const c = typeof entry.citation === "string" ? entry.citation : "";
  if (!c.includes("7150(b)(3)")) return 0;
  const pk = typeof entry.proposition_key === "string" ? entry.proposition_key.trim() : "";
  if (pk === "ra_trigger_admt") return 0; // legitimate use
  // Look for co-occurrence of "ADMT" and "risk assessment" in prose to
  // permit unkeyed but on-topic entries.
  let onTopic = false;
  for (const k of Object.keys(entry)) {
    if (k === "citation" || k === "citations" || k === "proposition_key") continue;
    const v = entry[k];
    if (typeof v !== "string") continue;
    if (/\bADMT\b/i.test(v) && /\brisk\s+assessment\b/i.test(v)) { onTopic = true; break; }
  }
  if (onTopic && !pk) return 0;
  // Downgrade: strip the 7150(b)(3) token from citation; keep any others.
  const parts = c.split(/\s*\+\s*/).map((p: string) => p.trim()).filter(Boolean);
  const kept = parts.filter((p: string) => !p.includes("7150(b)(3)"));
  entry.citation = kept.length > 0 ? kept.join(" + ") : NEUTRAL_CITATION;
  return 1;
}

// ── B7 — restore intake-supported timelines that A4 stripped.
export function restoreIntakeTimelinesInEntry(entry: any, intakeTimeline: string | null): number {
  if (!intakeTimeline) return 0;
  if (!entry || typeof entry !== "object") return 0;
  let restored = 0;
  for (const k of Object.keys(entry)) {
    const v = entry[k];
    if (typeof v !== "string" || v.length === 0) continue;
    if (!A4_STUB_RE.test(v)) continue;
    entry[k] = v.replace(new RegExp(A4_STUB_RE.source, "gi"), intakeTimeline);
    restored++;
  }
  if (restored > 0 && entry.information_needed === true) {
    // Only clear if all A4 stubs on the entry were restored.
    let anyLeft = false;
    for (const k of Object.keys(entry)) {
      const v = entry[k];
      if (typeof v === "string" && A4_STUB_RE.test(v)) { anyLeft = true; break; }
    }
    if (!anyLeft) entry.information_needed = false;
  }
  return restored;
}

// ── Orchestrator ────────────────────────────────────────────────────────
export function applyW21AdmtTurnB(report: any, intake: any): W21TurnBDiag {
  const diag: W21TurnBDiag = {
    version: W21_ADMT_TURNB_STAMP,
    b1_keyless_resolved: 0,
    b2_empty_citations_filled: 0,
    b3_counsel_scrubs: 0,
    b4_definitional_only_downgrades: 0,
    b5_7155_content_row_downgrades: 0,
    b6_7150b3_misapplication_downgrades: 0,
    b7_timelines_restored: 0,
    strings_scanned: 0,
    entries_scanned: 0,
  };
  if (!report || typeof report !== "object") return diag;

  const intakeTimeline = extractIntakeTimeline(intake);

  // Per-entry passes on customer buckets.
  try {
    for (const bucket of CUSTOMER_BUCKETS) {
      const arr = (report as any)[bucket];
      if (!Array.isArray(arr)) continue;
      for (const entry of arr) {
        if (!entry || typeof entry !== "object") continue;
        diag.entries_scanned++;
        // B1 + B2
        const bx = resolveKeylessAndFill(entry, bucket);
        diag.b1_keyless_resolved += bx.b1;
        diag.b2_empty_citations_filled += bx.b2;
        // B4
        diag.b4_definitional_only_downgrades += guardDefinitionalOnlyCitation(entry);
        // B6
        diag.b6_7150b3_misapplication_downgrades += guardS7150b3Misapplication(entry);
        // B7
        diag.b7_timelines_restored += restoreIntakeTimelinesInEntry(entry, intakeTimeline);
      }
    }
  } catch { /* fail-open */ }

  // B5 — deadline_table guard.
  try {
    diag.b5_7155_content_row_downgrades = guardS7155InDeadlineTable(report);
  } catch { /* fail-open */ }

  // B3 — generic prose walk for counsel referrals (customer-facing only).
  const visit = (node: any, inInternal: boolean) => {
    if (node == null) return;
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const v = node[i];
        if (typeof v === "string") {
          if (inInternal) continue;
          diag.strings_scanned++;
          const r = scrubCounselReferralProse(v);
          if (r.hits > 0) { node[i] = r.out; diag.b3_counsel_scrubs += r.hits; }
        } else if (v && typeof v === "object") visit(v, inInternal);
      }
      return;
    }
    if (typeof node !== "object") return;
    for (const k of Object.keys(node)) {
      const child = (node as any)[k];
      const childInternal = inInternal || k === "internal" || k.startsWith("_");
      if (typeof child === "string") {
        if (childInternal) continue;
        // Skip citation/proposition_key/id-like fields — B3 is prose only.
        if (k === "citation" || k === "citations" || k === "proposition_key"
            || k === "id" || k === "element_id" || k === "requirement_id") continue;
        diag.strings_scanned++;
        const r = scrubCounselReferralProse(child);
        if (r.hits > 0) { (node as any)[k] = r.out; diag.b3_counsel_scrubs += r.hits; }
      } else if (child && typeof child === "object") {
        visit(child, childInternal);
      }
    }
  };
  try { visit(report, false); } catch { /* fail-open */ }

  // B8 — telemetry under _meta.internal (whitelist-preserved by P2
  // serializer). Also mirror w19/w20 diag so wave-going-forward
  // telemetry survives serialization.
  try {
    const r = report as any;
    r._meta = (r._meta && typeof r._meta === "object") ? r._meta : {};
    r._meta.internal = (r._meta.internal && typeof r._meta.internal === "object") ? r._meta.internal : {};
    r._meta.internal.admt_w21b = diag;
    if (r._w19_admt_turna) r._meta.internal.admt_w19a = r._w19_admt_turna;
    if (r._w20_admt_turna) r._meta.internal.admt_w20a = r._w20_admt_turna;
  } catch { /* noop */ }

  return diag;
}

export const _internals = {
  DUTY_VERB_RE, COUNSEL_REF_RE, DEFINITIONAL_S7001_RE,
  CITATION_TOKEN_RE, A4_STUB_RE, TIMELINE_EXTRACT_RE,
  NEUTRAL_CITATION, FALLBACK,
  extractAnchorFromEntry, extractIntakeTimeline, splitSentences,
};
