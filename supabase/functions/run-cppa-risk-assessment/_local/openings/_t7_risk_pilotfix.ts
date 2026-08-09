// T7-RISK-PILOT-FIX — Deterministic post-emitter repair for cppa-risk report_data.
//
// Authoritative spec: docs/design/OPENING-PARAGRAPH-DESIGN.md.
// Scope this file: cppa-risk pilot only. Fail-open (try/catch every helper;
// availability is never blocked). Model NEVER writes/edits the opening; this
// module ONLY repairs emitter-mechanical defects flagged by wave-26 first-read
// (quality_run 17fe2863, run 139).
//
// Fix classes (all detect-and-omit; no string surgery grammar; whole-sentence
// excision doctrine per ledger item 84c cross-tool note):
//   F1 Garbled slot interpolation ("The the § 7150(b)(N) trigger analysis
//      <label> trigger …") — detect and drop the ENTIRE offending sentence
//      (start-of-sentence through terminal period inclusive) with whitespace
//      re-join.
//   F2 Truncated citation "(11 CCR )" (empty pinpoint) — drop the parenthetical.
//   F3 Empty regulatory_citation "" — omit field per contract-safe omission.
//   F4 Subsection conflation on inconsistency_flags/scope entries — when the
//      resolved trigger set (from _meta.internal.risk_t7_opening.s1_triggers)
//      disagrees with the labeled § 7150(b)(N), rewrite the label from the
//      resolved set when unambiguous, otherwise strip the pinpoint.
//   F5 Duplicate information_needed entries — canonical-key dedup (stable key
//      = field + citation + question semantics), idempotent.
//   F6 Scope_notes negative enumeration contradicting a resolved trigger —
//      drop the whole sentence.
//   F7 § 7001(ddd) enumerations with categories beyond verified corpus — keep
//      only the verified subset; if none verified, drop the parenthetical enum.

export const T7_RISK_PILOTFIX_VERSION = "t7-risk-pilotfix@2026-07-25";
export const T7_RISK_PILOTFIX_STAMP = "t7-risk-pilotfix@2026-07-25T22:30:00Z";

// § 7001(ddd) verified enumeration — sourced from cppa_authorities row
// 'Cal. Civ. Code § 1798.140' definitions cross-ref; the emitter must never
// present categories beyond this list.
const CCPA_7001_DDD_VERIFIED = new Set<string>([
  "systematic observation",
  "sensitive location",
  "sensitive personal information",
  "automated decisionmaking technology",
  "significant decision",
]);

export interface PilotFixCounters {
  f1_garbled_sentences_dropped: number;
  f2_truncated_citations_stripped: number;
  f3_empty_reg_citations_omitted: number;
  f4_subsection_labels_relabeled: number;
  f4_subsection_pinpoints_stripped: number;
  f5_information_needed_deduped: number;
  f6_scope_notes_contradictions_dropped: number;
  f7_7001ddd_enum_scrubs: number;
  fields_scanned: number;
  errors: number;
}

const zeroCounters = (): PilotFixCounters => ({
  f1_garbled_sentences_dropped: 0,
  f2_truncated_citations_stripped: 0,
  f3_empty_reg_citations_omitted: 0,
  f4_subsection_labels_relabeled: 0,
  f4_subsection_pinpoints_stripped: 0,
  f5_information_needed_deduped: 0,
  f6_scope_notes_contradictions_dropped: 0,
  f7_7001ddd_enum_scrubs: 0,
  fields_scanned: 0,
  errors: 0,
});

// Split a string into sentences preserving terminal punctuation. Whole-sentence
// units — a sentence extends from a start boundary through its terminal period.
function splitSentences(s: string): string[] {
  const out: string[] = [];
  const re = /[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m[0]) out.push(m[0]);
  }
  return out.length ? out : [s];
}

function rejoinSentences(parts: string[]): string {
  return parts.map((p) => p.replace(/\s+$/, "")).filter(Boolean).join(" ").trim();
}

// F1 — pattern: "The the § 7150(b)(N) trigger analysis <label> trigger ..."
// and any close variant ("the the ", doubled article followed by pinpoint).
const F1_PATTERNS: RegExp[] = [
  /\bThe the\b/i,
  /\bthe the \u00A7\s*7150\(b\)/i,
  /trigger analysis[^.!?]{0,80}trigger is the sole/i,
];

function fixF1_dropGarbledSentences(s: string, c: PilotFixCounters): string {
  try {
    if (typeof s !== "string" || !s) return s;
    const parts = splitSentences(s);
    let dropped = 0;
    const kept = parts.filter((sent) => {
      const hit = F1_PATTERNS.some((rx) => rx.test(sent));
      if (hit) dropped += 1;
      return !hit;
    });
    if (dropped === 0) return s;
    c.f1_garbled_sentences_dropped += dropped;
    return rejoinSentences(kept);
  } catch { c.errors += 1; return s; }
}

// F2 — remove "(11 CCR )" or "(11 CCR §)" truncated parentheticals.
function fixF2_stripTruncatedCitations(s: string, c: PilotFixCounters): string {
  try {
    if (typeof s !== "string" || !s) return s;
    let hits = 0;
    const out = s.replace(/\s*\(11 CCR\s*\u00A7?\s*\)/g, () => { hits += 1; return ""; });
    if (hits) c.f2_truncated_citations_stripped += hits;
    return out.replace(/\s{2,}/g, " ").trim();
  } catch { c.errors += 1; return s; }
}

// F3 — strip empty regulatory_citation on any entry-shaped object.
function fixF3_omitEmptyRegulatoryCitation(obj: any, c: PilotFixCounters): void {
  try {
    if (!obj || typeof obj !== "object") return;
    if (Object.prototype.hasOwnProperty.call(obj, "regulatory_citation")) {
      const v = obj.regulatory_citation;
      if (typeof v === "string" && v.trim() === "") {
        delete obj.regulatory_citation;
        c.f3_empty_reg_citations_omitted += 1;
      }
    }
  } catch { c.errors += 1; }
}

// F4 — when an entry claims a § 7150(b)(N) label but the resolved trigger set
// (from T7 opening provenance) does not contain N, and the resolved set is
// singleton, relabel to that single N. Otherwise strip the pinpoint entirely.
const F4_LABEL_RX = /\u00A7\s*7150\(b\)\((\d)\)/g;

function fixF4_subsectionConflation(
  obj: any,
  resolvedTriggers: number[],
  c: PilotFixCounters,
): void {
  try {
    if (!obj || typeof obj !== "object") return;
    const singleton = resolvedTriggers.length === 1 ? resolvedTriggers[0] : null;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v !== "string") continue;
      if (!F4_LABEL_RX.test(v)) continue;
      F4_LABEL_RX.lastIndex = 0;
      const rewritten = v.replace(F4_LABEL_RX, (m, digit) => {
        const n = Number(digit);
        if (resolvedTriggers.includes(n)) return m;
        if (singleton != null) {
          c.f4_subsection_labels_relabeled += 1;
          return `\u00A7 7150(b)(${singleton})`;
        }
        c.f4_subsection_pinpoints_stripped += 1;
        return "\u00A7 7150(b)";
      });
      obj[k] = rewritten;
    }
  } catch { c.errors += 1; }
}

// F5 — dedup information_needed by canonical key. Stable key uses field +
// citation + normalised question text (case+ws collapsed).
function canonKey(entry: any): string {
  const field = String(entry?.field ?? entry?.source_fields ?? "").toLowerCase().trim();
  const cite = String(entry?.citation ?? entry?.regulatory_citation ?? "").toLowerCase().trim();
  const q = String(entry?.question ?? entry?.description ?? entry?.text ?? entry?.note ?? "")
    .toLowerCase().replace(/\s+/g, " ").trim();
  return `${field}||${cite}||${q}`;
}

function fixF5_dedupInformationNeeded(arr: any, c: PilotFixCounters): any {
  try {
    if (!Array.isArray(arr)) return arr;
    const seen = new Set<string>();
    const out: any[] = [];
    let dropped = 0;
    for (const entry of arr) {
      const k = canonKey(entry);
      if (seen.has(k)) { dropped += 1; continue; }
      seen.add(k);
      out.push(entry);
    }
    if (dropped) c.f5_information_needed_deduped += dropped;
    return out;
  } catch { c.errors += 1; return arr; }
}

// F6 — drop a sentence in scope_notes that emits a negative enumeration
// listing a § 7150(b)(N) that IS in the resolved trigger set.
function fixF6_scopeNotesContradiction(
  s: string,
  resolvedTriggers: number[],
  c: PilotFixCounters,
): string {
  try {
    if (typeof s !== "string" || !s || resolvedTriggers.length === 0) return s;
    const parts = splitSentences(s);
    let dropped = 0;
    const kept = parts.filter((sent) => {
      const negative = /\b(no|not|none)\b/i.test(sent) && /\u00A7\s*7150\(b\)/i.test(sent);
      if (!negative) return true;
      const mentioned = new Set<number>();
      sent.replace(F4_LABEL_RX, (_m, d) => { mentioned.add(Number(d)); return _m; });
      F4_LABEL_RX.lastIndex = 0;
      const collide = resolvedTriggers.some((n) => mentioned.has(n));
      if (collide) { dropped += 1; return false; }
      return true;
    });
    if (dropped === 0) return s;
    c.f6_scope_notes_contradictions_dropped += dropped;
    return rejoinSentences(kept);
  } catch { c.errors += 1; return s; }
}

// F7 — scrub § 7001(ddd) parenthetical enumerations. Detects
// "§ 7001(ddd)" followed by "(<a>, <b>, ..., and <c>)" and filters the list to
// verified categories only. If none verified, drops the parenthetical enum.
function fixF7_ccpa7001dddEnum(s: string, c: PilotFixCounters): string {
  try {
    if (typeof s !== "string" || !s) return s;
    const rx = /(\u00A7\s*7001\(ddd\))\s*\(([^)]+)\)/g;
    let hits = 0;
    const out = s.replace(rx, (_m, tag, list) => {
      const items = String(list).split(/,|\band\b/).map((x) => x.trim().replace(/^and\s+/i, "")).filter(Boolean);
      const kept = items.filter((it) => CCPA_7001_DDD_VERIFIED.has(it.toLowerCase()));
      if (kept.length === items.length) return `${tag} (${list})`;
      hits += 1;
      if (kept.length === 0) return String(tag);
      const rendered = kept.length === 1
        ? kept[0]
        : kept.length === 2
          ? `${kept[0]} and ${kept[1]}`
          : `${kept.slice(0, -1).join(", ")}, and ${kept[kept.length - 1]}`;
      return `${tag} (${rendered})`;
    });
    if (hits) c.f7_7001ddd_enum_scrubs += hits;
    return out;
  } catch { c.errors += 1; return s; }
}

// Recursively walk report_data, calling a per-string mutator, per-entry mutator.
// Skips anchor keys and reserved _-prefixed subtrees (never mutates _meta).
function walk(
  node: any,
  path: string,
  onString: (s: string, path: string) => string,
  onEntry: (obj: any, path: string) => void,
  c: PilotFixCounters,
): any {
  if (node == null) return node;
  if (typeof node === "string") { c.fields_scanned += 1; return onString(node, path); }
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      node[i] = walk(node[i], `${path}[${i}]`, onString, onEntry, c);
    }
    return node;
  }
  if (typeof node === "object") {
    onEntry(node, path);
    for (const k of Object.keys(node)) {
      if (k.startsWith("_")) continue; // reserved subtrees (e.g. _meta)
      if (k === "opening_summary") continue; // deterministic slot, do not mutate
      node[k] = walk(node[k], `${path}.${k}`, onString, onEntry, c);
    }
    return node;
  }
  return node;
}

export interface PilotFixResult {
  counters: PilotFixCounters;
  resolved_triggers: number[];
}

/** Run the T7 risk pilot fix over report_data. Mutates in place. Fail-open. */
export function runT7RiskPilotFix(report_data: any): PilotFixResult {
  const c = zeroCounters();
  const resolvedTriggers: number[] = (() => {
    try {
      const t = report_data?._meta?.internal?.risk_t7_opening?.s1_triggers;
      return Array.isArray(t) ? t.map((x: any) => Number(x)).filter((n: number) => Number.isFinite(n)) : [];
    } catch { return []; }
  })();

  try {
    // Pass 1 — string-level scrubs on all customer surfaces.
    walk(
      report_data,
      "$",
      (s /* path */) => {
        let out = s;
        out = fixF1_dropGarbledSentences(out, c);
        out = fixF2_stripTruncatedCitations(out, c);
        out = fixF7_ccpa7001dddEnum(out, c);
        return out;
      },
      (obj) => {
        fixF3_omitEmptyRegulatoryCitation(obj, c);
        fixF4_subsectionConflation(obj, resolvedTriggers, c);
      },
      c,
    );

    // Pass 2 — top-level information_needed dedup + per-entry information_needed.
    if (Array.isArray(report_data?.information_needed)) {
      report_data.information_needed = fixF5_dedupInformationNeeded(report_data.information_needed, c);
    }
    // Nested information_needed arrays on entries.
    const nestedDedup = (arr: any[]) => {
      for (const entry of arr) {
        if (entry && typeof entry === "object" && Array.isArray(entry.information_needed)) {
          entry.information_needed = fixF5_dedupInformationNeeded(entry.information_needed, c);
        }
      }
    };
    for (const k of [
      "risk_assessment_by_activity",
      "top_risks",
      "priority_actions",
      "next_steps",
      "inconsistency_flags",
      "exception_analysis",
      "strengthen_items",
    ]) {
      if (Array.isArray(report_data?.[k])) nestedDedup(report_data[k]);
    }

    // Pass 3 — scope_notes contradiction scrub (top-level, if string).
    if (typeof report_data?.scope_notes === "string") {
      report_data.scope_notes = fixF6_scopeNotesContradiction(
        report_data.scope_notes, resolvedTriggers, c,
      );
    }
    // scope_and_triggers.scope_notes (common shape).
    const sc = report_data?.scope_and_triggers;
    if (sc && typeof sc === "object" && typeof sc.scope_notes === "string") {
      sc.scope_notes = fixF6_scopeNotesContradiction(sc.scope_notes, resolvedTriggers, c);
    }
  } catch { c.errors += 1; }

  return { counters: c, resolved_triggers: resolvedTriggers };
}
