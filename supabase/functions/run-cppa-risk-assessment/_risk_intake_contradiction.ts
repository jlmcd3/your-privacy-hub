// RISK-INTAKE-CONTRADICTION-BODY (2026-07-26) — deterministic post-pass
// discharging item-107 QUEUED backlog (w28 doc 1036f12c hallucination HIGH x2,
// Driver 2). Whole-sentence excision of body prose that contradicts a definite
// intake polarity; deterministic downgrade of hedged "reconcile" framing to
// neutral intake-grounded phrasing when a fixed template applies (Class B).
// Model NEVER writes replacements. Fail-open at every seam. Idempotent.
//
// SCOPE: model-written narrative surfaces ONLY. NEVER touches opening_summary,
// anchor fields (citation / verbatim_quote / deadline / deadline_basis /
// source_fields), or reserved subtrees (_meta / _internal / engagement_map /
// annotations). Runs AFTER applyRiskCohortDate, BEFORE LEAK-PREV P1 emit gate.
//
// Telemetry: report._meta.internal.risk_intake_contradiction = {
//   version, stamp, build_stamp, classA_excisions, classB_downgrades,
//   criteria_checked, errors
// }
// Merged so preexisting _meta.internal siblings (risk_w24a, risk_t7_opening,
// risk_cohort_date, …) are preserved.

export const RISK_INTAKE_CONTRADICTION_VERSION =
  "risk-intake-contradiction-body-v1-2026-07-26";
export const RISK_INTAKE_CONTRADICTION_STAMP =
  "risk-intake-contradiction-body@2026-07-26T03:31:00Z";

const RESERVED_KEYS = new Set([
  "_meta", "_internal", "engagement_map", "annotations", "opening_summary",
]);
const ANCHOR_KEYS = new Set([
  "citation", "verbatim_quote", "deadline", "deadline_basis", "source_fields",
  "primary_source_url", "subsection", "governing_anchor", "depth_class",
  "proposition_key",
]);

type Polarity = "yes" | "no" | "indefinite";

export interface RicCounters {
  version: string;
  stamp: string;
  build_stamp?: string;
  classA_excisions: number;
  classB_downgrades: number;
  criteria_checked: string[];
  errors: string[];
}

function polarityOf(v: unknown): Polarity {
  if (v === true) return "yes";
  if (v === false) return "no";
  if (typeof v !== "string") return "indefinite";
  const s = v.trim().toLowerCase();
  if (!s) return "indefinite";
  // Affirmative
  if (s === "yes" || s === "y" || s === "true" || s === "both" ||
      s.startsWith("yes ") || s.startsWith("yes—") || s.startsWith("yes -") ||
      s.startsWith("yes,") || s.startsWith("yes.")) return "yes";
  // Negative
  if (s === "no" || s === "n" || s === "false" || s === "none" ||
      s.startsWith("no ") || s.startsWith("no—") || s.startsWith("no -") ||
      s.startsWith("no,") || s.startsWith("no.")) return "no";
  // Explicitly indefinite bands from real data
  if (s.includes("evaluation") || s.includes("unknown") || s.includes("tbd") ||
      s.includes("unsure") || s.includes("n/a") || s.includes("not sure"))
    return "indefinite";
  return "indefinite";
}

// Sentence splitter that preserves terminators and does not eat trailing WS.
function splitSentences(text: string): string[] {
  const out: string[] = [];
  const re = /[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(m[0]);
  return out.length ? out : [text];
}

// ── Class A: direct polarity contradiction of a definite intake answer ──
// PROFILING (q5b_profiling_observation): intake=No → excise sentences that
// affirmatively assert profiling is established/conducted/performed.
function isProfilingAffirmed(sentence: string): boolean {
  const s = sentence.toLowerCase();
  if (!/\bprofil/.test(s)) return false;
  // Guard: skip explicit negations ("does not profile", "no profiling", …)
  if (/\b(do(es)? not|does not|no|without|absen[ct]|neither|nor)\b[^.!?]{0,40}\bprofil/.test(s)) return false;
  if (/\bprofil\w*\b[^.!?]{0,40}\b(is not|isn't|are not|aren't|not (?:established|conducted|performed|used|present|observed|documented))\b/.test(s)) return false;
  return /\b(affirmatively (?:records?|documents?)|records?|documents?|confirms?|establishes?|conducts?|performs?|engages? in|uses?|infers?|observes?)\b[^.!?]{0,60}\bprofil/.test(s)
      || /\bprofil\w*\b[^.!?]{0,60}\b(is (?:established|conducted|performed|documented|present|observed)|takes place|occurs)\b/.test(s)
      || /\bthe (?:record|report|assessment|filing) (?:affirmatively )?(?:records?|documents?|confirms?)\b[^.!?]{0,60}\bprofil/.test(s);
}

// ADMT-use (q18_admt_use): intake=Yes → excise sentences framing q18 as a
// negated / absent / "no ADMT" claim OR sentences that talk about
// "reconciling" a negated ADMT-use field.
function isAdmtUseNegated(sentence: string): boolean {
  const s = sentence.toLowerCase();
  if (!/\badmt\b/.test(s)) return false;
  return /\b(no admt|does not use admt|not use admt|no use of admt|admt(?: use)? (?:is )?not (?:used|established|present|documented)|absent admt|admt is absent|negated admt(?:-use)? field|negated admt-use|admt-use field .* (?:negated|absent)|"?negated admt(?:-use)?"?)\b/.test(s)
      || /\breconcil\w+\b[^.!?]{0,80}\b(negated |no |absent |not used)?admt(?:-use)?\b/.test(s);
}

// SELL/SHARE (q5_sell_share): intake=No → excise sentences that assert the
// business sells or shares personal information as established fact.
function isSellShareAffirmed(sentence: string): boolean {
  const s = sentence.toLowerCase();
  if (!/\b(sell|shar)/.test(s)) return false;
  if (/\b(do(es)? not|not|no|without|neither|nor)\b[^.!?]{0,40}\b(sell|shar)/.test(s)) return false;
  return /\b(sells?|shares?|is (?:selling|sharing)|are (?:selling|sharing)|engages? in (?:the )?(?:sale|sharing))\b[^.!?]{0,80}\b(personal (?:information|data)|pi|consumer)/.test(s)
      || /\b(sale|sharing) of personal (?:information|data)\b[^.!?]{0,60}\b(occurs|takes place|is established|is documented|is confirmed)\b/.test(s);
}

// ── Class B: hedged/"reconcile" framing around a definite intake value ──
// Fixed-template downgrades only.
function classBDowngradeAdmtYes(sentence: string): string | null {
  const s = sentence.toLowerCase();
  if (!/\badmt\b/.test(s)) return null;
  // "reconcile the negated admt-use field" family → drop
  if (/\breconcil\w+\b[^.!?]{0,60}\b(negated |absent |no )?admt(?:-use)?\b/.test(s)) return "";
  return null;
}
function classBDowngradeProfilingNo(sentence: string): string | null {
  const s = sentence.toLowerCase();
  if (!/\bprofil/.test(s)) return null;
  // Hedged "may profile / could profile / appears to profile" when intake=No → drop
  if (/\b(may|might|could|appears? to|seems? to|likely|possibly)\b[^.!?]{0,40}\bprofil\w*\b/.test(s)) return "";
  return null;
}

interface WalkCtx {
  intake: Record<string, unknown>;
  profilingPol: Polarity;
  admtPol: Polarity;
  sellSharePol: Polarity;
  counters: RicCounters;
}

function scrubString(text: string, ctx: WalkCtx): string {
  if (!text || typeof text !== "string") return text;
  const sentences = splitSentences(text);
  let mutated = false;
  const kept: string[] = [];
  for (const sent of sentences) {
    let drop = false;

    // Class A
    if (ctx.profilingPol === "no" && isProfilingAffirmed(sent)) {
      drop = true; ctx.counters.classA_excisions++;
    } else if (ctx.admtPol === "yes" && isAdmtUseNegated(sent)) {
      drop = true; ctx.counters.classA_excisions++;
    } else if (ctx.sellSharePol === "no" && isSellShareAffirmed(sent)) {
      drop = true; ctx.counters.classA_excisions++;
    }

    // Class B (only if not already dropped)
    if (!drop && ctx.admtPol === "yes") {
      const dg = classBDowngradeAdmtYes(sent);
      if (dg !== null) { drop = dg === ""; if (drop) ctx.counters.classB_downgrades++; }
    }
    if (!drop && ctx.profilingPol === "no") {
      const dg = classBDowngradeProfilingNo(sent);
      if (dg !== null) { drop = dg === ""; if (drop) ctx.counters.classB_downgrades++; }
    }

    if (drop) { mutated = true; continue; }
    kept.push(sent);
  }
  if (!mutated) return text;
  return kept.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function walk(node: unknown, ctx: WalkCtx, parentKey?: string): unknown {
  if (node === null || node === undefined) return node;
  if (typeof node === "string") {
    if (parentKey && ANCHOR_KEYS.has(parentKey)) return node;
    return scrubString(node, ctx);
  }
  if (Array.isArray(node)) {
    return node.map((v) => walk(v, ctx, parentKey));
  }
  if (typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (RESERVED_KEYS.has(k)) { out[k] = v; continue; }
      if (ANCHOR_KEYS.has(k)) { out[k] = v; continue; }
      out[k] = walk(v, ctx, k);
    }
    return out;
  }
  return node;
}

export interface RicOptions { buildStamp?: string }

export function applyRiskIntakeContradiction(
  intake: Record<string, unknown> | null | undefined,
  report: unknown,
  opts: RicOptions = {},
): { counters: RicCounters; report: unknown } {
  const counters: RicCounters = {
    version: RISK_INTAKE_CONTRADICTION_VERSION,
    stamp: RISK_INTAKE_CONTRADICTION_STAMP,
    build_stamp: opts.buildStamp,
    classA_excisions: 0,
    classB_downgrades: 0,
    criteria_checked: [],
    errors: [],
  };
  try {
    if (!report || typeof report !== "object" || Array.isArray(report)) {
      return { counters, report };
    }
    const intakeObj = (intake && typeof intake === "object" && !Array.isArray(intake))
      ? intake as Record<string, unknown>
      : {};
    const profilingPol = polarityOf(intakeObj["q5b_profiling_observation"]);
    const admtPol = polarityOf(intakeObj["q18_admt_use"]);
    const sellSharePol = polarityOf(intakeObj["q5_sell_share"]);
    if (profilingPol !== "indefinite") counters.criteria_checked.push("q5b_profiling_observation");
    if (admtPol !== "indefinite") counters.criteria_checked.push("q18_admt_use");
    if (sellSharePol !== "indefinite") counters.criteria_checked.push("q5_sell_share");
    if (!counters.criteria_checked.length) {
      return { counters, report };
    }
    const ctx: WalkCtx = { intake: intakeObj, profilingPol, admtPol, sellSharePol, counters };
    const next = walk(report, ctx) as Record<string, unknown>;
    return { counters, report: next };
  } catch (e) {
    counters.errors.push((e as Error)?.message ?? String(e));
    return { counters, report };
  }
}
