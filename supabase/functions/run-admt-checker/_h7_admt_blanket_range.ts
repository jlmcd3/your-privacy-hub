// ─────────────────────────────────────────────────────────────────────────
// H7-ADMT-BLANKET-RANGE (2026-07-25) — deploy turn on run-admt-checker.
// Discharges queued h7_admt_blanket_range per WAVE-26 DIGEST (ledger
// item 86, admt citation-69 driver (ii)): blanket-range citation
// "11 CCR §§ 7200–7222" was leaking into notice_gaps and opt_out_gaps
// prose (quality_run docs 2a8f5bda and f140f3c6, run 115, qr 6c06f218)
// where a specific section-level authority is verified corpus.
//
// CORPUS CONSTRAINT (controller-verified 23:14Z, BINDING):
//   • Subdivision-level texts for § 7220/§ 7221 are NOT verified corpus
//     (provision_texts rows cppa-7220/cppa-7221 are status=pending,
//     unapproved).
//   • Verified corpus is SECTION-LEVEL only:
//       cppa_authorities "11 CCR § 7220" (Pre-use Notice Requirements)
//       cppa_authorities "11 CCR § 7221" (Requests to Opt-Out of ADMT)
//   • Therefore: relabel to SECTION-LEVEL pinpoints only. NEVER emit
//     subdivision pinpoints like § 7221(a)/(c)/(e). Omission over
//     invention.
//
// CONTEXT ROUTING:
//   • entry under notice_gaps  → "11 CCR § 7220"
//   • entry under opt_out_gaps → "11 CCR § 7221"
//   • entry elsewhere          → strip the citation parenthetical;
//                                if the citation is load-bearing
//                                mid-sentence and removal would leave
//                                residue, consume the whole sentence
//                                (item 84c whole-sentence excision).
//
// DISCIPLINE:
//   • Deterministic post-emitter — model NEVER writes/edits prose.
//   • Fail-open at every helper and the orchestrator.
//   • Anchor keys and _-prefixed reserved subtrees are never mutated.
//   • Idempotent (entries tagged `_h7_blanket_range_ran = true`).
//   • Telemetry ONLY under `_meta.internal.admt_h7_blanket_range`.
// ─────────────────────────────────────────────────────────────────────────

export const H7_ADMT_BLANKET_RANGE_STAMP =
  "h7-admt-blanket-range@2026-07-25T23:48:00Z";

const SECTION_NOTICE = "11 CCR § 7220";
const SECTION_OPTOUT = "11 CCR § 7221";

// Buckets we route with section-level relabels.
const NOTICE_BUCKET = "notice_gaps";
const OPTOUT_BUCKET = "opt_out_gaps";

// Other customer-visible buckets — we still strip the blanket range
// (elsewhere → drop the parenthetical / consume the sentence). Keeps
// the fix consistent everywhere the leak surface can appear.
const OTHER_CUSTOMER_BUCKETS = [
  "access_gaps",
  "documentation_to_maintain",
  "top_3_actions",
  "priority_actions",
  "information_needed",
  "annotations",
];

// Never touched by the walker.
const ANCHOR_KEYS = new Set([
  "field", "source_fields", "citation", "citations",
  "regulatory_citation", "verbatim_quote", "provision",
  "proposition_key", "id", "element_id", "requirement_id",
  "key", "stamp", "build_stamp", "subsection",
]);

// Blanket-range regex — covers hyphen, en-dash, em-dash, and spacing
// variants. Anchored on "§§" with the 7200 → 7222 pair.
//   e.g. "11 CCR §§ 7200-7222", "11 CCR §§ 7200 – 7222",
//        "11 CCR §§7200—7222", "11 CCR § § 7200 -7222"
// Case-insensitive.
export const BLANKET_RANGE_RE =
  /11\s*CCR\s*§\s*§?\s*7200\s*[-–—]\s*7222/gi;

// Citation parenthetical carrying the blanket range — matches the
// whole parenthetical for whole-parenthetical omission on non-routed
// buckets. Uses a lazy inner match so we don't consume nested groups.
export const BLANKET_PARENTHETICAL_RE =
  /\s*\((?:[^()]*?)11\s*CCR\s*§\s*§?\s*7200\s*[-–—]\s*7222(?:[^()]*?)\)/gi;

// Sentence splitter (whole-sentence excision doctrine — mirrors w26).
export function splitSentences(text: string): string[] {
  if (typeof text !== "string" || text.length === 0) return [];
  const out: string[] = [];
  const re = /[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[0]);
  return out.length > 0 ? out : [text];
}

export function rejoinSentences(sentences: string[]): string {
  return sentences
    .map((s) => s.replace(/^\s+/, ""))
    .filter((s) => s.length > 0)
    .join(" ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function hasBlanketRange(value: string): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  BLANKET_RANGE_RE.lastIndex = 0;
  return BLANKET_RANGE_RE.test(value);
}

// Relabel: substitute every blanket-range occurrence with the given
// section-level pinpoint. Returns { out, count }.
export function relabelBlanketRange(
  value: string,
  section: string,
): { out: string; count: number } {
  if (typeof value !== "string" || !section) {
    return { out: value, count: 0 };
  }
  let count = 0;
  const out = value.replace(BLANKET_RANGE_RE, () => {
    count++;
    return section;
  });
  return { out, count };
}

// Strip the whole citation parenthetical carrying the blanket range.
// If the raw citation appears OUTSIDE any parenthetical (load-bearing
// mid-sentence), fall back to whole-sentence excision so we don't
// leave residue like "under  , the controller …".
export function stripBlanketCitation(
  value: string,
): { out: string; parenthetical_strips: number; sentence_drops: number } {
  if (typeof value !== "string" || value.length === 0) {
    return { out: value, parenthetical_strips: 0, sentence_drops: 0 };
  }
  // 1. Strip whole parentheticals first.
  let strips = 0;
  let s1 = value.replace(BLANKET_PARENTHETICAL_RE, () => {
    strips++;
    return "";
  });
  // 2. Any residual bare occurrences → whole-sentence excision.
  let drops = 0;
  if (hasBlanketRange(s1)) {
    const sentences = splitSentences(s1);
    const kept: string[] = [];
    for (const sent of sentences) {
      if (hasBlanketRange(sent)) {
        drops++;
        continue;
      }
      kept.push(sent);
    }
    s1 = rejoinSentences(kept);
  }
  if (strips === 0 && drops === 0) {
    return { out: value, parenthetical_strips: 0, sentence_drops: 0 };
  }
  // Tidy any lingering "  " or " ." / " ," residue from paren removal.
  const tidy = s1
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .trim();
  return { out: tidy, parenthetical_strips: strips, sentence_drops: drops };
}

export interface H7AdmtBlanketRangeDiag {
  version: string;
  stamp: string;
  build_stamp: string;
  notice_relabels: number;
  optout_relabels: number;
  parenthetical_strips: number;
  sentence_drops: number;
  strings_scanned: number;
  errors: number;
}

function emptyDiag(buildStamp: string): H7AdmtBlanketRangeDiag {
  return {
    version: H7_ADMT_BLANKET_RANGE_STAMP,
    stamp: H7_ADMT_BLANKET_RANGE_STAMP,
    build_stamp: buildStamp,
    notice_relabels: 0,
    optout_relabels: 0,
    parenthetical_strips: 0,
    sentence_drops: 0,
    strings_scanned: 0,
    errors: 0,
  };
}

function bucketRows(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as any).rows)) {
    return (raw as any).rows;
  }
  return [];
}

type Mode = "notice" | "optout" | "strip";

// Recursive prose walker. Skips ANCHOR_KEYS and `_`-prefixed keys
// (reserved subtrees, incl. _meta / _va_stamp).
function walkAndFix(
  node: any,
  mode: Mode,
  diag: H7AdmtBlanketRangeDiag,
): void {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const v = node[i];
      if (typeof v === "string") {
        diag.strings_scanned++;
        if (!hasBlanketRange(v)) continue;
        try {
          if (mode === "notice") {
            const r = relabelBlanketRange(v, SECTION_NOTICE);
            if (r.count > 0) {
              node[i] = r.out;
              diag.notice_relabels += r.count;
            }
          } else if (mode === "optout") {
            const r = relabelBlanketRange(v, SECTION_OPTOUT);
            if (r.count > 0) {
              node[i] = r.out;
              diag.optout_relabels += r.count;
            }
          } else {
            const r = stripBlanketCitation(v);
            if (r.parenthetical_strips > 0 || r.sentence_drops > 0) {
              node[i] = r.out;
              diag.parenthetical_strips += r.parenthetical_strips;
              diag.sentence_drops += r.sentence_drops;
            }
          }
        } catch {
          diag.errors++;
        }
      } else if (v && typeof v === "object") {
        walkAndFix(v, mode, diag);
      }
    }
    return;
  }
  if (typeof node !== "object") return;
  for (const k of Object.keys(node)) {
    if (ANCHOR_KEYS.has(k)) continue;
    if (k.startsWith("_")) continue; // reserved subtrees
    const v = (node as any)[k];
    if (typeof v === "string") {
      diag.strings_scanned++;
      if (!hasBlanketRange(v)) continue;
      try {
        if (mode === "notice") {
          const r = relabelBlanketRange(v, SECTION_NOTICE);
          if (r.count > 0) {
            (node as any)[k] = r.out;
            diag.notice_relabels += r.count;
          }
        } else if (mode === "optout") {
          const r = relabelBlanketRange(v, SECTION_OPTOUT);
          if (r.count > 0) {
            (node as any)[k] = r.out;
            diag.optout_relabels += r.count;
          }
        } else {
          const r = stripBlanketCitation(v);
          if (r.parenthetical_strips > 0 || r.sentence_drops > 0) {
            (node as any)[k] = r.out;
            diag.parenthetical_strips += r.parenthetical_strips;
            diag.sentence_drops += r.sentence_drops;
          }
        }
      } catch {
        diag.errors++;
      }
    } else if (v && typeof v === "object") {
      walkAndFix(v, mode, diag);
    }
  }
}

export function applyH7AdmtBlanketRange(
  report: any,
  buildStamp = "unknown",
): H7AdmtBlanketRangeDiag {
  const diag = emptyDiag(buildStamp);
  if (!report || typeof report !== "object") return diag;

  const routes: Array<{ bucket: string; mode: Mode }> = [
    { bucket: NOTICE_BUCKET, mode: "notice" },
    { bucket: OPTOUT_BUCKET, mode: "optout" },
    ...OTHER_CUSTOMER_BUCKETS.map((b) => ({ bucket: b, mode: "strip" as Mode })),
  ];

  for (const { bucket, mode } of routes) {
    try {
      const rows = bucketRows((report as any)[bucket]);
      for (const entry of rows) {
        if (!entry || typeof entry !== "object") continue;
        if (entry._h7_blanket_range_ran === true) continue;
        try {
          walkAndFix(entry, mode, diag);
        } catch (e) {
          diag.errors++;
          console.warn(
            `[h7-admt-blanket-range] entry walk failed (non-fatal) in ${bucket}:`,
            (e as Error)?.message,
          );
        }
        entry._h7_blanket_range_ran = true;
      }
    } catch (e) {
      diag.errors++;
      console.warn(
        `[h7-admt-blanket-range] bucket ${bucket} failed (non-fatal):`,
        (e as Error)?.message,
      );
    }
  }

  try {
    const r = report as any;
    r._meta = (r._meta && typeof r._meta === "object") ? r._meta : {};
    r._meta.internal = (r._meta.internal && typeof r._meta.internal === "object")
      ? r._meta.internal : {};
    r._meta.internal.admt_h7_blanket_range = diag;
  } catch {
    diag.errors++;
  }

  return diag;
}

export const _internals = {
  SECTION_NOTICE,
  SECTION_OPTOUT,
  NOTICE_BUCKET,
  OPTOUT_BUCKET,
  OTHER_CUSTOMER_BUCKETS,
  ANCHOR_KEYS,
};
