// W17-CYBER-BOILERPLATE-GUARD — deterministic post-generation pass that
// detects near-duplicate per-control remediation text across the 18
// § 7123(c) components and rewrites duplicates to an answer-first
// information_needed advisory.
//
// Semantics (defensive by construction):
//   - Only touches `controls[].remediation` strings (>= 120 chars).
//   - Skips any remediation that already references an intake field/value
//     (heuristic: contains a quoted phrase, a numeric figure, or a named
//     framework/system token — see INTAKE_REF_HINTS).
//   - Normalizes whitespace/case, then compares:
//       (a) EXACT normalized match; OR
//       (b) token-Jaccard similarity > 0.90 on strings of similar length.
//   - Keeps the FIRST occurrence in controls[] order; rewrites every
//     subsequent duplicate to a single answer-first sentence naming the
//     control, sets `information_needed: true`, and increments counter.
//   - NEVER touches citation/verbatim_quote/subsection/governing_anchor
//     fields, and NEVER fabricates new technical guidance.
//   - Fail-open: any throw returns the report unchanged.
//   - Telemetry lands ONLY on `report._meta.internal.cyber_boiler` —
//     never any top-level `_w*_` key.

export const CYBER_BOILER_VERSION = "w17-cyber-boiler-2026-07-25";

const MIN_LEN = 120;
const SIM_THRESHOLD = 0.90;
const LEN_RATIO_TOL = 0.15; // only compare pairs whose lengths are within ±15%

// Heuristic hints that the remediation text is anchored to intake facts
// (a quoted phrase, a digit run OUTSIDE citations, or a named
// framework/vendor/system). Citations of the form "§ 7XXX(...)" are
// stripped before the numeric check because statutory pinpoints are not
// intake facts.
const INTAKE_REF_HINTS: RegExp[] = [
  /"[^"]{3,}"/,                                    // quoted phrase from intake
  /\b\d[\d,\.]*\b/,                                // any numeric figure (post-citation-strip)
  /\b(HITRUST|SOC ?2|ISO ?27001|NIST CSF|CIS Controls|PCI DSS|HIPAA|GLBA|NERC CIP|CPNI|Okta|Duo|CrowdStrike|Splunk|Rapid7|Qualys|Tenable|SentinelOne|Microsoft (?:Defender|Sentinel|Entra)|Azure|AWS|GCP)\b/i,
];

// Strip statutory citation tokens so their numeric parts don't false-
// positive the "numeric figure" intake-fact heuristic. Covers § 7XXX(...)
// and 11 CCR § 7XXX(...) forms, plus CFR/USC pinpoints.
function stripCitations(s: string): string {
  return s
    .replace(/(?:11\s*CCR\s*)?§+\s*\d{3,4}(?:\s*\([^)]+\))*/gi, "")
    .replace(/\b\d+\s*CFR\s*(?:Part\s*)?\d+(?:\.\d+)*/gi, "")
    .replace(/\b\d+\s*U\.?S\.?C\.?\s*§+\s*\d+/gi, "");
}


function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim();
}

function tokens(s: string): Set<string> {
  return new Set(normalize(s).split(" ").filter((t) => t.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function referencesIntake(s: string): boolean {
  for (const rx of INTAKE_REF_HINTS) if (rx.test(s)) return true;
  return false;
}

function controlLabel(c: any, idx: number): string {
  const name = (typeof c?.component === "string" && c.component) ||
    (typeof c?.name === "string" && c.name) ||
    (typeof c?.label === "string" && c.label) ||
    `control #${idx + 1}`;
  return name;
}

export interface CyberBoilerResult {
  version: string;
  boiler_scanned: number;
  boiler_duplicates_rewritten: number;
  boiler_skipped_intake_anchored: number;
}

export function applyCyberBoilerplateGuard(report: unknown): CyberBoilerResult {
  const out: CyberBoilerResult = {
    version: CYBER_BOILER_VERSION,
    boiler_scanned: 0,
    boiler_duplicates_rewritten: 0,
    boiler_skipped_intake_anchored: 0,
  };
  try {
    const r = report as any;
    const controls = Array.isArray(r?.controls) ? r.controls : null;
    if (!controls) return out;

    interface Slot {
      idx: number;
      text: string;
      norm: string;
      toks: Set<string>;
      intakeAnchored: boolean;
    }
    const slots: Slot[] = [];
    for (let i = 0; i < controls.length; i++) {
      const c = controls[i];
      const rem = typeof c?.remediation === "string" ? c.remediation : "";
      if (rem.length < MIN_LEN) continue;
      out.boiler_scanned++;
      const anchored = referencesIntake(rem);
      if (anchored) out.boiler_skipped_intake_anchored++;
      slots.push({
        idx: i,
        text: rem,
        norm: normalize(rem),
        toks: tokens(rem),
        intakeAnchored: anchored,
      });
    }

    // Group by duplicate/near-duplicate; keep first occurrence.
    const rewrittenIdx = new Set<number>();
    for (let i = 0; i < slots.length; i++) {
      const a = slots[i];
      if (rewrittenIdx.has(a.idx)) continue;
      for (let j = i + 1; j < slots.length; j++) {
        const b = slots[j];
        if (rewrittenIdx.has(b.idx)) continue;
        if (b.intakeAnchored) continue; // never touch intake-anchored copies
        // length gate
        const la = a.text.length, lb = b.text.length;
        const ratio = Math.abs(la - lb) / Math.max(la, lb);
        if (ratio > LEN_RATIO_TOL) continue;
        const dup = a.norm === b.norm || jaccard(a.toks, b.toks) >= SIM_THRESHOLD;
        if (!dup) continue;
        // Rewrite b — answer-first, names the control, routes information_needed.
        const label = controlLabel(controls[b.idx], b.idx);
        controls[b.idx].remediation =
          `Remediation guidance for ${label} requires review against the intake; the generated guidance duplicated another control's text.`;
        controls[b.idx].information_needed = true;
        rewrittenIdx.add(b.idx);
        out.boiler_duplicates_rewritten++;
      }
    }

    const meta = (r._meta = r._meta ?? {});
    meta.internal = meta.internal ?? {};
    meta.internal.cyber_boiler = { ...out };
    return out;
  } catch (_e) {
    return out; // fail-open
  }
}
