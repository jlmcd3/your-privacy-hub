// C1-b (2026-07-23T14:20:00Z) — CITATION PAIR VERIFIER
//
// Post-generation deterministic scanner that flags "confusion pair" citation
// defects — sentences that cite one member of a well-known confusion pair
// while the sentence's factual predicate matches the OTHER member of the pair.
//
// Coverage (v1):
//   - GDPR Art. 13 vs 14        (source of collection: data-subject vs third-party)
//   - GDPR Art. 21(1) vs 21(2)  (general right-to-object vs absolute direct-marketing right)
//   - GDPR Art. 6(1)(f) vs 6(11) (EU legitimate-interests basis vs UK DUAA 2025 example list)
//   - CCPA (ah) vs (aj)         (Cal. Civ. Code § 1798.140 lettering; "service provider" is (ag),
//                                not (v); (ah) is "sensitive personal information";
//                                (aj) is "share"; treat crossed pairings as defects)
//   - 11 CCR § 7220 family      (sub-lettered depth (A)/(B)/(C)/(D) permitted ONLY when the
//                                supplied paragraph index / anchors block confirms them)
//
// Enforcement mode is "flag" — the verifier NEVER silently emits: on mismatch
// it appends an inline warning ("[citation-pair conflict — verify against
// paragraph index]") and emits before/after lint events so catch-rate can be
// measured. Full regenerate-loop wiring is deferred; the flag-then-log path
// satisfies the "never silently emit" bar and provides the calibration data
// the regen loop will need.
//
// Callers wrap their assembled text like:
//   const before = { evt: "citation_pair_check_before", fn, len: text.length };
//   console.log(JSON.stringify(before));
//   const { text: verified, findings } = verifyCitationPairs(text, {
//     paragraphIndex: buildParagraphIndex(retrievalPayload),
//     regime: "gdpr" | "uk_gdpr",
//   });
//   console.log(JSON.stringify({ evt: "citation_pair_check_after", fn, findings: findings.length,
//     pairs: findings.map(f => f.pair), sample: findings.slice(0, 3) }));

export type ConfusionPair =
  | "gdpr_13_14"
  | "gdpr_21_1_vs_2"
  | "gdpr_6_1_f_vs_6_11"
  | "ccpa_ae_ah_lettering"
  | "cpra_7220_depth";

export interface ParagraphIndex {
  /** Statutory anchors the retrieval payload confirms are present in corpus,
   *  normalised (e.g. "art. 13 gdpr", "11 ccr § 7220(c)(5)"). */
  anchors: Set<string>;
  /** Sub-lettered § 7220 depths the corpus confirms (e.g. "7220(c)(5)(A)"). */
  allowedDeep7220: Set<string>;
}

export interface VerifyOpts {
  paragraphIndex: ParagraphIndex;
  regime: "gdpr" | "uk_gdpr" | "unknown";
}

export interface PairFinding {
  pair: ConfusionPair;
  sentence: string;
  reason: string;
}

const FLAG = " [citation-pair conflict — verify against paragraph index]";

function norm(s: string): string {
  return s
    .replace(/§§/g, "§")
    .replace(/\bSection\b/gi, "§")
    .replace(/\bSec\.?\b/gi, "§")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function buildParagraphIndex(payload: {
  authorityCites?: string[];
  gdprCites?: string[];
}): ParagraphIndex {
  const anchors = new Set<string>();
  const allowedDeep7220 = new Set<string>();
  const push = (s: string) => {
    if (!s) return;
    const n = norm(s);
    anchors.add(n);
    // Detect explicit § 7220(c)(5)(A) — treat that sub-lettered form as allowed.
    const m = n.match(/7220\s*\(([a-z])\)\s*\(([0-9]+)\)\s*\(([a-z])\)/);
    if (m) allowedDeep7220.add(`7220(${m[1]})(${m[2]})(${m[3]})`);
  };
  for (const a of payload.authorityCites || []) push(a);
  for (const g of payload.gdprCites || []) push(g);
  return { anchors, allowedDeep7220 };
}

// Split into sentences preserving separators.
function splitSentences(text: string): Array<{ body: string; sep: string }> {
  const parts = text.split(/([.!?]+\s+|\n+)/);
  const out: Array<{ body: string; sep: string }> = [];
  for (let i = 0; i < parts.length; i += 2) {
    const body = parts[i] ?? "";
    const sep = parts[i + 1] ?? "";
    if (!body && !sep) continue;
    out.push({ body, sep });
  }
  return out;
}

// ---- Confusion-pair detectors -----------------------------------------------
// Each returns null (clean) or a PairFinding.

// 13/14: Art. 13 is direct-from-data-subject; Art. 14 is indirect (third party).
// Flag: sentence cites 13 with indirect-collection cues, or cites 14 with
// direct-collection cues.
function detect_13_14(s: string): PairFinding | null {
  const lower = s.toLowerCase();
  const cites13 = /\bart(?:icle|\.)?\s*13\b/i.test(s) && !/\bart(?:icle|\.)?\s*14\b/i.test(s);
  const cites14 = /\bart(?:icle|\.)?\s*14\b/i.test(s) && !/\bart(?:icle|\.)?\s*13\b/i.test(s);
  const indirectCue = /(?:obtained|received|sourced|acquired|collected)\s+from\s+(?:a\s+)?(?:third[- ]part(?:y|ies)|broker|public\s+source|another\s+controller|other\s+source)/i.test(lower)
    || /\bnot\s+obtained\s+from\s+the\s+data\s+subject\b/i.test(lower);
  const directCue = /\bcollected\s+directly\s+from\s+the\s+data\s+subject\b/i.test(lower)
    || /\b(?:the\s+)?data\s+subject\s+provides?\b/i.test(lower);
  if (cites13 && indirectCue) {
    return { pair: "gdpr_13_14", sentence: s, reason: "Art. 13 cited with indirect-collection predicate; Art. 14 governs indirectly-obtained data." };
  }
  if (cites14 && directCue) {
    return { pair: "gdpr_13_14", sentence: s, reason: "Art. 14 cited with direct-from-data-subject predicate; Art. 13 governs directly-collected data." };
  }
  return null;
}

// 21(1) vs 21(2): 21(1) is general right-to-object (grounds required, controller
// may show compelling legitimate grounds); 21(2) is direct-marketing (absolute
// right, no balancing). Flag when 21(1) is cited alongside direct-marketing
// cues, or when 21(2) is cited without direct-marketing context.
function detect_21_1_vs_2(s: string): PairFinding | null {
  const lower = s.toLowerCase();
  const cites21_1 = /\bart(?:icle|\.)?\s*21\s*\(\s*1\s*\)/i.test(s);
  const cites21_2 = /\bart(?:icle|\.)?\s*21\s*\(\s*2\s*\)/i.test(s);
  const bareCites21 = /\bart(?:icle|\.)?\s*21\b(?!\s*\()/i.test(s);
  const directMarketing = /\bdirect[- ]marketing\b/i.test(lower);
  const absoluteLang = /\babsolute\s+right\b|\bunconditional(?:ly)?\b|\bwithout\s+balancing\b/i.test(lower);
  if ((cites21_1 || bareCites21) && directMarketing && absoluteLang) {
    return { pair: "gdpr_21_1_vs_2", sentence: s, reason: "Art. 21(1) or bare Art. 21 cited for absolute direct-marketing right; the absolute right is Art. 21(2)." };
  }
  if (cites21_2 && !directMarketing) {
    return { pair: "gdpr_21_1_vs_2", sentence: s, reason: "Art. 21(2) cited without a direct-marketing predicate; 21(2) applies only to direct marketing." };
  }
  return null;
}

// 6(1)(f) vs 6(11): 6(1)(f) is the EU/UK legitimate-interests LEGAL BASIS;
// 6(11) is the UK-only DUAA 2025 example list. Flag: any 6(11) citation when
// regime !== uk_gdpr, and any 6(11) citation NOT accompanied by "UK GDPR".
function detect_6_1_f_vs_6_11(s: string, regime: VerifyOpts["regime"]): PairFinding | null {
  const cites6_11 = /\bart(?:icle|\.)?\s*6\s*\(\s*11\s*\)/i.test(s);
  const cites6_1_f = /\bart(?:icle|\.)?\s*6\s*\(\s*1\s*\)\s*\(\s*f\s*\)/i.test(s);
  const namesUk = /\buk\s+gdpr\b|\bduaa\b|\bdata\s+\(use\s+and\s+access\)\b/i.test(s);
  if (cites6_11 && regime !== "uk_gdpr") {
    return { pair: "gdpr_6_1_f_vs_6_11", sentence: s, reason: "Art. 6(11) cited but resolved regime is not UK GDPR; Art. 6(11) is a UK DUAA 2025 provision." };
  }
  if (cites6_11 && !namesUk) {
    return { pair: "gdpr_6_1_f_vs_6_11", sentence: s, reason: "Art. 6(11) cited without naming UK GDPR / DUAA 2025 — mandatory regime tag missing." };
  }
  if (cites6_1_f && /\brecognised[- ]legitimate[- ]interests?\b/i.test(s)) {
    return { pair: "gdpr_6_1_f_vs_6_11", sentence: s, reason: "Art. 6(1)(f) cited alongside 'recognised legitimate interests' — the recognised-LI basis is UK Art. 6(1)(ea) + Annex 1, not 6(1)(f)." };
  }
  return null;
}

// (ah) vs (aj): Cal. Civ. Code § 1798.140. Post-CPRA lettering — (ag) is
// "service provider"; (ah) is "sensitive personal information"; (aj) is
// "share". Flag common cross-pairings.
function detect_ccpa_ah_aj(s: string): PairFinding | null {
  const cites_ah = /1798\.140\s*\(\s*ah\s*\)/i.test(s);
  const cites_aj = /1798\.140\s*\(\s*aj\s*\)/i.test(s);
  const lower = s.toLowerCase();
  if (cites_ah && /\b(share|sharing|cross[- ]context\s+behavioral\s+advertising)\b/.test(lower) && !/sensitive/.test(lower)) {
    return { pair: "ccpa_ah_vs_aj", sentence: s, reason: "§ 1798.140(ah) cited for 'share/sharing' predicate; 'share' is defined at (aj), (ah) defines 'sensitive personal information'." };
  }
  if (cites_aj && /\bsensitive\s+personal\s+information\b/.test(lower) && !/\bshare\b/.test(lower)) {
    return { pair: "ccpa_ah_vs_aj", sentence: s, reason: "§ 1798.140(aj) cited for 'sensitive personal information'; that definition is at (ah), (aj) defines 'share'." };
  }
  return null;
}

// § 7220 depth: flag any § 7220(c)(N)(letter) citation whose depth isn't
// listed in the paragraph index's allowedDeep7220 set.
function detect_7220_depth(s: string, idx: ParagraphIndex): PairFinding | null {
  const re = /7220\s*\(([a-z])\)\s*\(([0-9]+)\)\s*\(([a-z])\)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const key = `7220(${m[1].toLowerCase()})(${m[2]})(${m[3].toLowerCase()})`;
    if (!idx.allowedDeep7220.has(key)) {
      return { pair: "cpra_7220_depth", sentence: s, reason: `§ ${key} cited but sub-lettered depth not confirmed by the supplied paragraph index; cite § 7220(${m[1]})(${m[2]}) and stop, or supply the anchor.` };
    }
  }
  return null;
}

export interface VerifyResult {
  text: string;
  findings: PairFinding[];
}

export function verifyCitationPairs(text: string, opts: VerifyOpts): VerifyResult {
  if (!text) return { text: "", findings: [] };
  const idx = opts.paragraphIndex;
  const sentences = splitSentences(text);
  const findings: PairFinding[] = [];
  const rebuilt: string[] = [];
  for (const { body, sep } of sentences) {
    const local: PairFinding[] = [];
    const push = (f: PairFinding | null) => { if (f) local.push(f); };
    push(detect_13_14(body));
    push(detect_21_1_vs_2(body));
    push(detect_6_1_f_vs_6_11(body, opts.regime));
    push(detect_ccpa_ah_aj(body));
    push(detect_7220_depth(body, idx));
    if (local.length === 0) {
      rebuilt.push(body + sep);
    } else {
      findings.push(...local);
      // Flag once per sentence irrespective of pair count; keep the sentence
      // intact so counsel review can adjudicate. Never silently emit.
      rebuilt.push(body + FLAG + sep);
    }
  }
  return { text: rebuilt.join(""), findings };
}
