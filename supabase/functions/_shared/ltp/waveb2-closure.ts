// WAVEB2-CLOSURE — deterministic post-render closure for the six citation-
// class defects surfaced by Wave-B.2 (run 146). Runs AFTER
// applyWaveBCompletion and BEFORE the LTP shadow-mode telemetry block.
// Fail-open. Telemetry lands at _meta.internal.waveb2_closure.
//
// Fixes:
//   (1) Token-substitution truncation — drop any string sentence carrying a
//       garbled/mid-cite fragment (ellipsis inside a citation span, unclosed
//       parenthesis on a § pinpoint, or trailing "…" after "§ N…").
//   (2) information_needed self-contradiction — drop any entry whose
//       requested pinpoint already appears verbatim in the rendered report.
//   (4) attestation_block citation discipline — enforce that
//       attestation_block.statutory_basis is registry-anchored (§ 7157(b)(5)
//       or § 7157(c)). Any unverified § 7156(a) is rewritten to § 7157(b)(5).
//
// Fixes (3) prong-map verbatim and (5) cyber-crosswalk band matrix are
// handled in ccpa-7150-pin.ts (registry) and waveb-completion.ts
// (computeProngOutcomes tightening) respectively; this module carries only
// the render-time guards.

export const WAVEB2_CLOSURE_VERSION = "waveb2-closure-v1";
export const WAVEB2_CLOSURE_STAMP = "waveb2-closure@2026-07-27T04:15:00Z";

export interface WaveB2Counters {
  truncation_sentences_dropped: number;
  information_needed_self_contradictions_dropped: number;
  attestation_basis_rewrites: number;
}

export interface WaveB2Result {
  report: any;
  counters: WaveB2Counters;
  stamp: string;
  version: string;
}

// ── (1) truncation guard ────────────────────────────────────────────────
// Detect garbled citation fragments. Positive signals:
//   - "§ N…" (ellipsis mid-cite, e.g. "§ 1798.140(d)(1)(A)…")
//   - "\d\)…" (ellipsis inside a pinpoint chain, e.g. "(d)(1)(A)…")
//   - unclosed opening parenthesis in a § span: "§ N(…" without matching ")"
const TRUNCATION_PATTERNS: RegExp[] = [
  /§[^.;!?]{0,80}…/,
  /\(\d+\)[^)]{0,20}…/,
  /\d+\(\d+\)\(\w+\)\s*…/,
];

function splitSentences(s: string): string[] {
  return s.split(/(?<=[.!?])\s+(?=[A-Z(§])/);
}

function isTruncatedCitationSentence(sent: string): boolean {
  for (const rx of TRUNCATION_PATTERNS) if (rx.test(sent)) return true;
  return false;
}

function scrubTruncationString(s: string, counter: { n: number }): string {
  if (typeof s !== "string" || !/…/.test(s)) return s;
  const parts = splitSentences(s);
  const kept = parts.filter((p) => {
    if (isTruncatedCitationSentence(p)) { counter.n += 1; return false; }
    return true;
  });
  if (kept.length === parts.length) return s;
  return kept.join(" ").trim();
}

function walkAndScrubTruncation(node: any, counter: { n: number }): any {
  if (node == null) return node;
  if (typeof node === "string") return scrubTruncationString(node, counter);
  if (Array.isArray(node)) return node.map((v) => walkAndScrubTruncation(v, counter));
  if (typeof node === "object") {
    for (const k of Object.keys(node)) {
      if (k === "_meta") continue;
      node[k] = walkAndScrubTruncation(node[k], counter);
    }
    return node;
  }
  return node;
}

// ── (2) information_needed self-contradiction filter ───────────────────
const PINPOINT_RX = /§\s*[\d.]+(?:\([\w\d]+\))+/g;

function collectReportedPinpoints(report: any): Set<string> {
  const out = new Set<string>();
  const skipKeys = new Set(["information_needed", "_meta"]);
  const walk = (n: any) => {
    if (n == null) return;
    if (typeof n === "string") {
      const m = n.match(PINPOINT_RX);
      if (m) for (const p of m) out.add(p.replace(/\s+/g, " ").trim());
      return;
    }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (typeof n === "object") {
      for (const k of Object.keys(n)) {
        if (skipKeys.has(k)) continue;
        walk(n[k]);
      }
    }
  };
  walk(report);
  return out;
}

function entryRequestedPinpoints(entry: any): string[] {
  const bag: string[] = [];
  for (const k of ["citation", "regulatory_citation", "question", "description", "text", "note"]) {
    const v = entry?.[k];
    if (typeof v === "string") {
      const m = v.match(PINPOINT_RX);
      if (m) for (const p of m) bag.push(p.replace(/\s+/g, " ").trim());
    }
  }
  return bag;
}

function filterSelfContradictoryInformationNeeded(report: any, counter: { n: number }): void {
  const filterArr = (arr: any): any => {
    if (!Array.isArray(arr)) return arr;
    const reported = collectReportedPinpoints(report);
    return arr.filter((e) => {
      const req = entryRequestedPinpoints(e);
      if (req.length === 0) return true;
      const allReported = req.every((p) => reported.has(p));
      if (allReported) { counter.n += 1; return false; }
      return true;
    });
  };
  if (Array.isArray(report?.information_needed)) {
    report.information_needed = filterArr(report.information_needed);
  }
  if (Array.isArray(report?.risk_assessment_by_activity)) {
    for (const a of report.risk_assessment_by_activity) {
      if (a && Array.isArray(a.information_needed)) {
        a.information_needed = filterArr(a.information_needed);
      }
    }
  }
}

// ── (4) attestation basis discipline ───────────────────────────────────
function enforceAttestationBasis(report: any, counter: { n: number }): void {
  const ab = report?.attestation_block;
  if (!ab || typeof ab !== "object") return;
  const cur = String(ab.statutory_basis ?? "");
  if (/7157/.test(cur)) return; // already verified anchor
  if (/7156/.test(cur) || cur.trim() === "") {
    ab.statutory_basis = "§ 7157(b)(5), § 7157(c)";
    counter.n += 1;
  }
}

// ── orchestrator ────────────────────────────────────────────────────────
export function applyWaveB2Closure(report: any): WaveB2Result {
  const counters: WaveB2Counters = {
    truncation_sentences_dropped: 0,
    information_needed_self_contradictions_dropped: 0,
    attestation_basis_rewrites: 0,
  };
  if (!report || typeof report !== "object") {
    return { report, counters, stamp: WAVEB2_CLOSURE_STAMP, version: WAVEB2_CLOSURE_VERSION };
  }

  const tCounter = { n: 0 };
  walkAndScrubTruncation(report, tCounter);
  counters.truncation_sentences_dropped = tCounter.n;

  const inCounter = { n: 0 };
  filterSelfContradictoryInformationNeeded(report, inCounter);
  counters.information_needed_self_contradictions_dropped = inCounter.n;

  const abCounter = { n: 0 };
  enforceAttestationBasis(report, abCounter);
  counters.attestation_basis_rewrites = abCounter.n;

  return { report, counters, stamp: WAVEB2_CLOSURE_STAMP, version: WAVEB2_CLOSURE_VERSION };
}
