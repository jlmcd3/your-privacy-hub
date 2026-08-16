/**
 * ITEM 310 — builder for the four dpia analytic deliverables.
 *
 * PURITY LAW: pure function of the intake object. No I/O, no clock, no env;
 * never throws — a builder fault degrades the envelope rather than aborting.
 *
 * SINGLE-WRITER LAW: this module is the ONLY producer of
 * report.necessity_findings, report.proportionality, report.risk_register
 * and report.art36_consultation. The model narrates; it does not overwrite.
 *
 * SEPARATION LAW: enforcement-exposure sentences are mechanically relocated
 * out of art36_consultation.why into .exposure_note (Item 308 pattern).
 */
import { ANCHOR_KEYS, DPIA_RISK_SPECS, DPIA_SAFEGUARD_SPECS, row, type RiskFacts } from "./elements.ts";
import { transferMechanism, type TransferFlow } from "../../dpia-jurisdiction-registry.ts";
import { spliceVerbatim } from "../verbatim-splice.ts";
import { attachMinimalUnitSurfaces } from "./minimal-units.ts";
// PROMPT 9A — the ratified compact-label registry. Presentation only: the full
// ask (`information_needed` / `dimensions`) is untouched by anything here.
import {
  type DpiaAskClass,
  mergeLabeledAsks,
  quotedOp,
  renderMergedLabel,
  resolveAskLabel,
} from "../dpia-ask-labels.ts";
import type {
  AlternativeConsidered,
  Art36Consultation,
  DpiaDeliverables,
  LegalBasisFinding,
  DpiaDecision,
  DpiaGapLedgerEntry,
  DpiaProcessingInventory,
  DpiaInventoryController,
  DpiaInventoryDataItem,
  DpiaInventoryProcessor,
  DpiaInventoryPurpose,
  DpiaInventorySecondaryUse,
  DpiaRiskCountNote,
  DpiaSection2Coverage,
  DpiaSpecialCategoryConditionRow,
  DpiaTransferRow,
  DpiaProcessorContractRow,
  DpiaMinimisationRetentionRow,
  DpiaMeasureRow,
  DpiaCoverageRow,
  DpiaIntakeStructureRecommendation,
  LegitimateInterestsTest,
  Likelihood,
  NecessityFinding,
  NecessityVerdict,
  ProportionalityFinding,
  RiskBand,
  RiskRegisterEntry,
  DpiaEnforcementAnnotation,
  DpiaEnforcementMatchType,
} from "./types.ts";

export const DPIA_DELIVERABLES_VERSION =
  "dpia-analytic-deliverables-2026-08-01-wp248";

// PROMPT 8H item 2 — DPO-advice consultation matcher.
//
// The 8E regex only recognised generic references ("supervisory authority",
// "ICO", "regulator"); run #182 doc 4 recommended "prior consultation with the
// Autoriteit Persoonsgegevens (AP)" and was missed. The matcher is still
// anchored to a consult/refer/escalate verb (so "consulted the DPO" — an
// internal consultation — stays false) but now also accepts NAMED EU/UK
// supervisory authorities and an "Art(icle) 36" reference near the verb.
// The ratified Section 6 disclosure sentence is byte-untouched.
const DPO_AUTHORITY_RE = [
  "supervisory authority",
  "supervisory authorities",
  "lead authority",
  "ico",
  "information commissioner",
  "commissioner",
  "regulator",
  "dpa",
  "autoriteit persoonsgegevens",
  "cnil",
  "hbdi",
  "bfdi",
  "garante",
  "aepd",
  "datenschutzbeh\u00f6rde",
  "datenschutzbehorde",
  "dpc",
  "data protection commission",
  "imy",
  "datatilsynet",
  "uodo",
  "cnpd",
  "apd",
  "gba",
  "gegevensbeschermingsautoriteit",
  "art\\.? ?36",
  "article ?36",
].join("|");

// PROMPT 8J item 2 (CEO-ruled 2026-08-12) — NEGATION GUARD.
// Evidence: run c3762c61 doc 4 — dpo_advice said the residual risks "do not
// meet the threshold for prior consultation with the ICO", yet the flag went
// true and the ratified disclosure sentence asserted the opposite of the
// record. The flag now requires a POSITIVE recommendation stance governing the
// consult-verb + authority match, and is false where that match sits under
// negation or threshold-not-met language. The disclosure sentence is untouched.
const DPO_STANCE_RE =
  /\b(recommend\w*|advis\w*|should|must|ought|urge\w*|propos\w*|require[sd]?|intends? to|will)\b/i;
const DPO_NEGATION_RE = new RegExp(
  [
    "\\b(?:do|does|did|would|will|could|is|are|was|were|has|have)\\s+not\\b",
    "\\bdon't\\b|\\bdoesn't\\b|\\bdidn't\\b|\\bwouldn't\\b|\\bwon't\\b|\\bisn't\\b|\\baren't\\b",
    "\\bnot\\s+(?:met|meet|required|necessary|needed|recommended|warranted|triggered)\\b",
    "\\bno\\s+(?:need|requirement|basis)\\b",
    "\\bfall(?:s)?\\s+(?:below|short)\\b",
    "\\bbelow\\s+the\\s+threshold\\b",
    "\\bdeclin\\w*\\s+to\\s+recommend\\b",
    "\\badvis\\w*\\s+against\\b",
    "\\brecommend\\w*\\s+against\\b",
    "\\bagainst\\s+consult\\w*\\b",
    "\\bunnecessary\\b",
  ].join("|"),
  "i",
);

export function dpoRecommendsConsultation(advice: string): boolean {
  const s = String(advice ?? "");
  if (!s.trim()) return false;
  const fwd = new RegExp(
    `\\b(consult|refer|escalat|notif)\\w*\\b[^.]{0,120}\\b(?:${DPO_AUTHORITY_RE})\\b`,
    "i",
  );
  // Reverse order: "the Garante should be consulted before go-live".
  const rev = new RegExp(
    `\\b(?:${DPO_AUTHORITY_RE})\\b[^.]{0,120}\\b(consult|refer|escalat|notif)\\w*\\b`,
    "i",
  );
  // Sentence-scoped: the stance and the negation are read from the same
  // clause that carries the consult + authority match.
  for (const sentence of s.split(/(?<=[.;!?])\s+|\n+/)) {
    if (!sentence.trim()) continue;
    if (!fwd.test(sentence) && !rev.test(sentence)) continue;
    if (DPO_NEGATION_RE.test(sentence)) continue;
    if (!DPO_STANCE_RE.test(sentence)) continue;
    return true;
  }
  return false;
}



const NOT_STATED = "not stated on the record";

/**
 * Language that argues the IMPACT side of the balance.
 *
 * PROMPT 9D item 1 (CEO-ruled 2026-08-15) — EVIDENCE WIDENING ONLY. Batch
 * e5a0deb8 / run 887a91d2 showed records that plainly described the effect of
 * the processing on data subjects (population, decision volume, monitoring
 * cadence, what is at stake, what they cannot avoid) being read as silent,
 * because the original eight regexes demanded narrow phrasings. Every pattern
 * below is derived from a real rejection or a graded document whose intake
 * described impact while the document said "the impact … is not described";
 * the evidencing passage is quoted beside it. Verdict logic, ask text and
 * every rendered sentence's bytes are unchanged — only WHAT COUNTS AS
 * EVIDENCE widens. Benefit-side prose alone must still fail this test, so no
 * pattern below matches benefit vocabulary.
 */
export const IMPACT_LEXICON: readonly RegExp[] = [
  // — original eight (unchanged) —
  /\bintrusive\b/i,
  /\bimpact(s|ed)? on\b/i,
  /\bdetriment\b/i,
  /\brisk(s)? to (the )?(data subjects?|individuals?|rights)\b/i,
  /\bintrusion\b/i,
  /\breasonable expectations?\b/i,
  /\baffects? (the )?(data subjects?|individuals?|employees?|patients?|customers?)\b/i,
  /\bloss of control\b/i,

  // — PROMPT 9D additions, each with its evidencing passage —

  // "Six participants expressed concern about the absence of a default human
  // review step" (doc b435d8eb, data_subjects_views).
  /\b(express\w*|rais\w*|voic\w*|indicat\w*)\b[^.]{0,60}\bconcerns?\b/i,

  // "54% were uncomfortable with health data being used in motor pricing"
  // (doc dfe21899, data_subjects_views).
  /\b(uncomfortable|discomfort|unease|distress|anxiet\w+)\b/i,

  // "AurelianScore v3.2 may produce systematically less favourable outcomes
  // for applicants from certain demographic cohorts" (doc b435d8eb,
  // residual_risks).
  /\b(less favourable|less favorable|unfavourable|unfavorable|adverse|detrimental|harmful)\b[^.]{0,40}\b(outcome|decision|effect|treatment|impact|consequence)\w*\b/i,

  // "bias — whether the XGBoost model performs equitably across patient
  // demographics" (doc 472a9ea1, data_subjects_views).
  /\b(bias(ed|es)?|discriminat\w+|inequitab\w+|disparate impact)\b/i,

  // "Declined applicants do not receive a meaningful human-review pathway in
  // the adverse-action notice" (doc 56489b7c, residual_risks).
  /\b(no|without|absence of|lack of|do(es)? not (receive|have|provide))\b[^.]{0,60}\bhuman[- ](review|intervention|oversight)\b/i,

  // "38% were unaware that automated decisions were made without human
  // review" (doc dfe21899, data_subjects_views).
  /\b(unaware|not (being )?informed|without (their )?knowledge|no (real[- ]time )?notice)\b/i,

  // "Enrichment of application data from external sources proceeds without
  // explicit disclosure at the point of collection" (doc 1ad3fbb5).
  // PROMPT 9E item 4 — tightened: the PROCESSING must occur without the
  // disclosure/consent. A negated safeguard ("No data is shared with third
  // parties without explicit consent being obtained first") is not impact.
  /\b(proceeds?|occurs?|runs?|operates?|happens?|takes place|is (carried out|performed|conducted|done)|are (carried out|performed|conducted))\b[^.]{0,40}\bwithout\b[^.]{0,40}\b(explicit |prior |meaningful )?(disclosure|transparency|informing|consent|explanation|notice)\b/i,

  // "Participants expressed a preference for a clear opt-out mechanism from
  // automated scoring" / "a clear pathway to challenge it" (docs 1ad3fbb5,
  // b435d8eb). PROMPT 9E item 4 — tightened to absence/deficiency or demand
  // form only; an available opt-out described positively is a safeguard.
  /\b(no|without|absence of|lack(s|ing)? of|not (offered|provided|available)|do(es)? not (offer|provide|have))\b[^.]{0,60}\b(opt[- ]out|objection|challenge|contest|withdrawal)\b/i,
  /\b(preference for|prefer\w*|request\w*|ask\w*|want\w*|sought|seek\w*|call\w+ for|demand\w*)\b[^.]{0,60}\b(opt[- ]out|object\w*|challenge|contest|withdraw\w*)\b/i,

  // "continuous GPS tracking at 10-second granularity is broader than strictly
  // necessary" (doc dfe21899) and run 887a91d2's "continuous transactional
  // enrichment … with continuous monitoring of account behaviour".
  // PROMPT 9E item 4 — tightened: monitoring counts only where INDIVIDUALS or
  // their behaviour are monitored, never systems, access logs or infrastructure.
  /\b(surveillance|location tracking|gps tracking|behavioural profiling|behavioral profiling)\b/i,
  /\bcontinuous(ly)? (monitor\w*|track\w*|enrich\w*|profil\w*|scor\w*)\b[^.]{0,40}\b(data subjects?|individuals?|customers?|employees?|patients?|applicants?|users?|behaviour\w*|behavior\w*|location|movements?|activity|transactions?)\b/i,

  // "collected at 10-second GPS intervals exceeds actuarial necessity" /
  // "broader than strictly necessary" (doc dfe21899).
  /\b(exceeds?|broader than|more than)\b[^.]{0,40}\b(strictly )?(necessary|necessity)\b/i,

  // Run 887a91d2: "Approximately 18,000 automated credit decisions per month
  // are issued against these customers" — decision volume BORNE by the data
  // subjects. PROMPT 9E item 4 — tightened: throughput alone is not impact;
  // the count must be of decisions the subjects receive or are subject to.
  /\b[\d][\d,.]*\s*(automated\s+)?(\w+[- ])?(decisions?|scores?|assessments?|profiles?)\b[^.]{0,80}\b(issued (against|to|on)|received by|receive|borne by|imposed on|made about|applied to|(are|is) subject to|served on|against (these |those |the )?(customers?|applicants?|individuals?|data subjects?|employees?|patients?))\b/i,

  // Run 887a91d2: "approximately 340,000 active data subjects, of whom roughly
  // 18,000 receive a new automated decision each cycle, are scored" — affected
  // population. PROMPT 9E item 4 — tightened: a headcount of people who
  // RECEIVE A BENEFIT is not impact; the population must be monitored, scored,
  // profiled, tracked, affected, or receiving an automated decision.
  /\b[\d][\d,.]*\s*(active\s+)?(data subjects?|individuals?|applicants?|employees?|patients?|customers?)\b[^.]{0,90}\b(are |is |been )?(affected|monitored|scored|profiled|tracked|surveilled)\b/i,
  /\b[\d][\d,.]*\s*(active\s+)?(data subjects?|individuals?|applicants?|employees?|patients?|customers?)\b[^.]{0,90}\b(receives?|(are|is) subject to)\b[^.]{0,40}\b(automated|decisions?|scor\w*|profil\w*|assessments?|monitoring)\b/i,


  // Run 887a91d2 ask text: "what they lose, what they would not expect, and
  // what they cannot avoid" — records that answer it in those terms.
  /\b(cannot|can(no|')t|unable to)\s+(avoid|escape|opt out|prevent|challenge|object)\b/i,
  /\b(would not|do(es)? not|did not)\s+expect\b/i,
  /\bat stake\b/i,

  // "automated scores influence care-coordinator outreach prioritisation …
  // without any human review" (doc b929760c, residual_risks) — Art. 22-class
  // consequence language.
  /\b(legal effects?|similarly significant|significantly affect\w*|denied|refused|declined)\b[^.]{0,60}\b(applicants?|individuals?|data subjects?|customers?|patients?|candidates?|access|service|credit|claim)\w*\b/i,
];


/**
 * PROMPT 8J item 3 (CEO-ruled 2026-08-12) — IMPACT-SIDE READER SCOPE.
 * Evidence: run c3762c61 doc 3 — Section 3 said "the impact on the data
 * subjects is not described on the record" while the intake described impact
 * in residual_risks and data_subjects_views. The impact-described test now
 * reads those fields and the potential-harm content too. Verdict logic and
 * every sentence's bytes are unchanged; only the evidence widens.
 */
const IMPACT_SOURCE_FIELDS: readonly string[] = [
  "necessity_proportionality",
  "data_minimisation_justification",
  "data_subjects_views",
  "residual_risks",
  "potential_harms",
  "potential_harm_detail",
  "risks_to_individuals",
];

/** Single-constant predicate: the ONE widened lexicon, no forked copies. */
export function hasImpactLanguage(text: string): boolean {
  return matches(String(text ?? ""), IMPACT_LEXICON);
}

/** The intake segments that actually argue the impact side, joined. */
function impactEvidence(intake: unknown): string {
  const segs: string[] = [];
  for (const f of IMPACT_SOURCE_FIELDS) {
    const v = get(intake, f);
    const text = Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean).join(" ") : str(v);
    if (text && matches(text, IMPACT_LEXICON)) segs.push(text);
  }
  return segs.join(" ");
}

/** Language that argues the BENEFIT side of the balance. */
const BENEFIT_LEXICON: readonly RegExp[] = [
  /\bbenefit(s)?\b/i,
  /\benables?\b/i,
  /\bnecessary to\b/i,
  /\bachiev(e|es|ing)\b/i,
  /\bimproves?\b/i,
  /\bdelivers?\b/i,
  /\brequired (to|for)\b/i,
  /\bsupports?\b/i,
];

/** Rejection reasons that only say the alternative was less USEFUL. */
const USEFULNESS_ONLY: readonly RegExp[] = [
  /\bless (useful|convenient|efficient|accurate)\b/i,
  /\bmore (expensive|costly|work|effort)\b/i,
  /\bwould (slow|reduce) (us|the business|throughput|revenue)\b/i,
  /\bnot as good\b/i,
  /\bcommercially (unattractive|inconvenient)\b/i,
];

/** Enforcement-exposure framing that must not sit inside an obligation finding. */
const EXPOSURE_LEXICON: readonly RegExp[] = [
  /\bfine(s|d)?\b/i,
  /\bpenalt(y|ies)\b/i,
  /\benforcement action\b/i,
  /\badministrative fine\b/i,
  /\b4\s*%|\b2\s*%|\bEUR\s?20\s?million|\b£17\.5\s?million/i,
  /\bsanction(s)?\b/i,
  /\bArt(icle)?\.?\s*83\b/i,
];

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function arr(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean) : [];
}

function get(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

/**
 * ITEM 330 — DPIA regime selector (CITATION ONLY).
 *
 * Returns "UK" when the record's `jurisdictions` name the United Kingdom and
 * no EU/EEA GDPR jurisdiction. The UK Art. 35 text is word-identical to the
 * EU text (the Commissioner replaces the supervisory authority), and Art.
 * 35(3)(a) does not cross-reference Art. 22 by number in either regime, so
 * this selector NEVER changes a trigger, threshold, likelihood, band or
 * determination — it only selects which verbatim row is cited.
 */
export type DpiaRegime = "EU" | "UK";

export function readDpiaRegime(intake: unknown): DpiaRegime {
  const js = arr(get(intake, "jurisdictions"));
  const uk = js.some((j) => /united kingdom|uk gdpr/i.test(j));
  const eu = js.some((j) => /^eu \(gdpr\)|european|eea/i.test(j));
  return uk && !eu ? "UK" : "EU";
}

function anchor(
  key: keyof typeof ANCHOR_KEYS,
  regime: DpiaRegime = "EU",
): { citation: string; verbatim: string } {
  const base = ANCHOR_KEYS[key];
  const r = (regime === "UK" ? row(`uk_${base}`) : null) ?? row(base);
  return {
    citation: r?.subsection ?? "",
    verbatim: r?.verbatim_quote ?? "",
  };
}

/** Fallback citation prefix used only when a registry row is missing. */
function cit(regime: DpiaRegime, subsection: string): string {
  return `${regime === "UK" ? "UK GDPR" : "GDPR"} ${subsection}`;
}

/**
 * PROMPT 8E item 6 — ToA regime prefix. A registry row resolved under the UK
 * regime may carry the unprefixed "GDPR Art. …" citation string (the UK rows
 * fall back to the EU row where no uk_ row exists). Sibling entries in a UK
 * document all read "UK GDPR …", so the bare form reads as a miscitation.
 * Prefix-only: the pinpoint and every other byte are untouched.
 */
function regimePrefixed(regime: DpiaRegime, citation: string): string {
  if (regime !== "UK" || !citation) return citation;
  if (/\bUK GDPR\b/.test(citation)) return citation;
  return citation.replace(/\bGDPR\b/, "UK GDPR");
}


function matches(text: string, res: readonly RegExp[]): boolean {
  return res.some((re) => re.test(text));
}

/**
 * PROMPT 8A item 5 — the SPAN the scan actually matched, never a
 * re-derivation: the first matching lexicon hit plus a short surrounding
 * window, trimmed to word boundaries.
 */
export function matchSpan(text: string, res: readonly RegExp[], window = 40): string {
  for (const re of res) {
    const m = re.exec(text);
    if (!m) continue;
    const start = Math.max(0, (m.index ?? 0) - window);
    const end = Math.min(text.length, (m.index ?? 0) + m[0].length + window);
    let span = text.slice(start, end);
    if (start > 0) span = span.replace(/^\S*\s+/, "");
    if (end < text.length) span = span.replace(/\s+\S*$/, "");
    return span.trim().replace(/\s+/g, " ");
  }
  return "";
}

/** PROMPT 8A slot convention `{n:word}`: one–nine as words, digits from 10 up. */
const N_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
export function nWord(n: number): string {
  return n >= 0 && n <= 9 ? N_WORDS[n] : String(n);
}

// ---------------------------------------------------------------------
// Operations — the unit each of deliverables 1 and 2 iterates over.
// ---------------------------------------------------------------------
interface Operation {
  readonly operation_id: string;
  readonly operation_label: string;
  readonly purpose_text: string;
}

/**
 * SO-FT FIX (2026-08-11): `secondary_uses` answers are frequently negations
 * ("None. Not used beyond the primary purpose."). Those are scope-limitation
 * statements, not a second processing operation — manufacturing `op_secondary`
 * from them makes proportionality weigh a negation as a benefit. Only the clean
 * negation case is suppressed; anything ambiguous keeps the old behaviour.
 */
const SECONDARY_NEGATION: readonly RegExp[] = [
  /^\s*(none|n\/a|no|nil|not applicable)\b/i,
  /^\s*(there\s+are\s+)?no\s+(other|secondary|further|additional)\s+(use|uses|purpose|purposes)\b/i,
  /^\s*(the\s+)?data\s+is\s+not\s+used\s+(for\s+any\s+purpose\s+)?beyond\b/i,
  /^\s*not\s+used\s+(for\s+any\s+purpose\s+)?beyond\b/i,
  /^\s*(the\s+)?[\w\s]{0,40}?\bis\s+not\s+used\s+for\s+any\s+(other\s+)?purpose\b/i,
];

/** True only when the answer is clearly a negation / scope-limitation. */
export function isSecondaryUseNegation(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const head = t.slice(0, 200);
  return SECONDARY_NEGATION.some((re) => re.test(head));
}

export function buildOperations(intake: unknown): Operation[] {
  const primaryPurpose = str(get(intake, "purpose"));
  const activity = str(get(intake, "processing_activity_name")) || "the assessed processing";
  const ops: Operation[] = [
    {
      operation_id: "op_primary",
      operation_label: activity,
      purpose_text: primaryPurpose,
    },
  ];
  const secondary = str(get(intake, "secondary_uses"));
  if (secondary && !isSecondaryUseNegation(secondary)) {
    ops.push({
      operation_id: "op_secondary",
      operation_label: `${activity} — secondary use`,
      purpose_text: secondary,
    });
  }
  return ops;
}

/**
 * Alternatives the record says were considered, grouped by operation id.
 *
 * PROMPT 8J item 1 (CEO-ruled 2026-08-12) — AN ALTERNATIVE IS NEVER DROPPED.
 * Evidence: run c3762c61 docs 3–5 — every alternatives_considered entry was
 * silently dropped because the free-text processing_operation never
 * byte-equals the derived operation_label, producing false "records no
 * alternative means that were considered and rejected" findings and their
 * draft_incomplete / sign-off cascades. Routing order: exact label / id /
 * "primary" (unchanged), then token overlap against the SECONDARY operation's
 * label (gapOverlap, 0.6, and it must beat the primary label), then primary.
 */
function alternativesFor(intake: unknown, op: Operation): AlternativeConsidered[] {
  const raw = get(intake, "alternatives_considered");
  if (!Array.isArray(raw)) return [];
  const ops = buildOperations(intake);
  const secondary = ops.find((o) => o.operation_id === "op_secondary");
  const primary = ops[0];

  /** The operation id this entry belongs to — always one of the ops. */
  const routeTo = (target: string): string => {
    if (!target) return "op_primary";
    for (const o of ops) {
      if (target === o.operation_label || target === o.operation_id) return o.operation_id;
    }
    if (/primary/i.test(target)) return "op_primary";
    if (secondary) {
      const sec = gapOverlap(target, secondary.operation_label);
      const pri = gapOverlap(target, primary.operation_label);
      if (sec >= 0.6 && sec > pri) return "op_secondary";
    }
    return "op_primary";
  };

  const out: AlternativeConsidered[] = [];
  for (const e of raw) {
    if (!e || typeof e !== "object") continue;
    const rec = e as Record<string, unknown>;
    if (routeTo(str(rec.processing_operation)) !== op.operation_id) continue;
    const alternative = str(rec.alternative);
    const rejection_reason = str(rec.rejection_reason);
    if (!alternative) continue;
    out.push({
      alternative,
      rejection_reason: rejection_reason || NOT_STATED,
      rejected_for_usefulness_only:
        rejection_reason.length > 0 &&
        matches(rejection_reason, USEFULNESS_ONLY) &&
        !/cannot|does not|would not (achieve|deliver|meet)|fails to/i.test(rejection_reason),
    });
  }
  return out;
}

// ---------------------------------------------------------------------
// 1. Art. 35(7)(b) — necessity (least-intrusive means, PERFORMED)
// ---------------------------------------------------------------------
export function buildNecessityFindings(intake: unknown): NecessityFinding[] {
  const regime = readDpiaRegime(intake);
  const a = anchor("necessity", regime);
  const test = anchor("necessity_test", regime);
  const useful = anchor("useful_not_necessary", regime);

  return buildOperations(intake).map((op) => {
    const purpose_stated = op.purpose_text.length > 0;
    const alternatives = alternativesFor(intake, op);

    let verdict: NecessityVerdict;
    let why: string;
    let status: NecessityFinding["status"] = "analysed";
    let information_needed: string | undefined;
    // PROMPT 9A — the ask-class tag travels with the ask it labels.
    let ask_class: DpiaAskClass | undefined;

    if (!purpose_stated) {
      verdict = "undetermined_on_the_record";
      status = "record_insufficient";
      why =
        "No purpose is recorded for this operation, and necessity is measured against a purpose; without one there is nothing for the least-intrusive-means test to compare against.";
      information_needed =
        `The specific purpose pursued by "${op.operation_label}", stated as an outcome rather than an activity.`;
      ask_class = "ask_necessity_purpose";
    } else if (alternatives.length === 0) {
      verdict = "undetermined_on_the_record";
      status = "record_insufficient";
      why =
        `The record states the purpose ("${op.purpose_text}") but records no alternative means that were considered and rejected. ` +
        `The test the assessment must run is the one the guidance states: ${test.verbatim} ` +
        "Until the alternatives that were actually weighed are recorded, that comparison cannot be run on this record.";
      information_needed =
        `For "${op.operation_label}": each less-intrusive alternative that was actually considered (for example a narrower data set, aggregated or pseudonymised data, a shorter retention period, or a manual process), and the specific reason each was rejected.`;
      ask_class = "ask_necessity_alternatives";
    } else {
      const usefulnessOnly = alternatives.filter((x) => x.rejected_for_usefulness_only);
      const unexplained = alternatives.filter((x) => x.rejection_reason === NOT_STATED);
      if (unexplained.length > 0) {
        verdict = "undetermined_on_the_record";
        status = "record_insufficient";
        why =
          `${alternatives.length === 1 ? "One alternative is" : `${nWord(alternatives.length)} alternatives are`} recorded for this operation, but ${unexplained.length === 1 ? "one carries" : `${nWord(unexplained.length)} carry`} no rejection reason, so the comparison between them and the chosen means is incomplete.`;
        information_needed =
          `The reason each of the following alternatives was rejected: ${unexplained.map((x) => x.alternative).join("; ")}.`;
        ask_class = "ask_necessity_reasons";
      } else if (usefulnessOnly.length > 0) {
        verdict = "less_intrusive_alternative_available";
        why =
          `${nWord(usefulnessOnly.length)} of the ${nWord(alternatives.length)} recorded ${alternatives.length === 1 ? "alternative" : "alternatives"} — ${usefulnessOnly.map((x) => x.alternative).join("; ")} — were rejected on usefulness or cost grounds rather than because they would fail to achieve the purpose. ` +
          `${useful.verbatim} On this record a realistic less intrusive alternative remains available, so the chosen means is not established as necessary for this purpose.`;
      } else {
        verdict = "least_intrusive_means_supported";
        why =
          `The company has recorded ${alternatives.length === 1 ? "one alternative" : `${nWord(alternatives.length)} alternatives`} — ${alternatives.map((x) => x.alternative).join("; ")} — and states ${alternatives.length === 1 ? "why it" : "for each why it"} would not achieve the recorded purpose ("${op.purpose_text}"). ` +
          DPIA_NECESSITY_TEST_SENTENCE;
      }
    }

    return {
      operation_id: op.operation_id,
      operation_label: op.operation_label,
      purpose_stated,
      purpose_text: op.purpose_text || NOT_STATED,
      alternatives_considered: alternatives,
      verdict,
      why,
      citation: a.citation || cit(regime, "Art. 35(7)(b)"),
      authority_verbatim: a.verbatim,
      status,
      ...(information_needed ? { information_needed } : {}),
      ...(ask_class
        ? {
          ask_class,
          display_label: resolveAskLabel(ask_class, { op: op.operation_label }),
          scope_op: quotedOp(op.operation_label),
        }
        : {}),
    };
  });
}

// ---------------------------------------------------------------------
// 2. Art. 35(7)(b) — proportionality, SPLIT OUT from necessity
// ---------------------------------------------------------------------
export function buildProportionality(intake: unknown): ProportionalityFinding[] {
  const regime = readDpiaRegime(intake);
  const a = anchor("necessity", regime);
  const narrative = str(get(intake, "necessity_proportionality"));
  const minimisation = str(get(intake, "data_minimisation_justification"));
  const subjects = str(get(intake, "data_subjects"));
  const volume = str(get(intake, "volume_frequency"));
  const combined = [narrative, minimisation].filter(Boolean).join(" ");

  return buildOperations(intake).map((op) => {
    const benefitSide = op.purpose_text || (matches(combined, BENEFIT_LEXICON) ? combined : "");
    // PROMPT 8J item 3 — widened impact evidence (fallback only; the existing
    // narrative + minimisation reading is byte-preserved where it matches).
    const impactSide = matches(combined, IMPACT_LEXICON) ? combined : impactEvidence(intake);
    const argued_both_directions = benefitSide.length > 0 && impactSide.length > 0;

    let verdict: ProportionalityFinding["verdict"];
    let why: string;
    let status: ProportionalityFinding["status"] = "analysed";
    let information_needed: string | undefined;
    let ask_class: DpiaAskClass | undefined;

    if (!argued_both_directions) {
      verdict = "undetermined_on_the_record";
      status = "record_insufficient";
      why = benefitSide.length === 0
        ? "The record argues neither side of the balance for this operation: no benefit is stated and no impact on the data subjects is described, so there is nothing to weigh."
        : "The record argues only the benefit side of the balance. Proportionality is a two-sided test and cannot be concluded from a statement of benefit alone; the impact on the data subjects is not described on this record.";
      information_needed =
        (ask_class = "ask_proportionality_impact",
        `For "${op.operation_label}": the impact the processing has on the data subjects (${subjects || "the individuals concerned"}) at the recorded scale (${volume || "the recorded volume"}) — what they lose, what they would not expect, and what they cannot avoid — stated separately from the benefit.`);
    } else {
      // Both sides present. The balance tips against the processing where the
      // impact side names an effect the record does not answer with a measure.
      const measures = arr(get(intake, "existing_safeguards")).filter((s) => s !== "None");
      if (measures.length === 0) {
        verdict = "disproportionate_on_the_record";
        why =
          `The company has recorded both sides of the balance — benefit: "${benefitSide}"; impact: "${impactSide}" — but records no safeguard applied against that impact, so as the record stands the impact on the data subjects is not answered and the processing is not proportionate on these facts.`;
      } else {
        verdict = "proportionate_on_the_record";
        why =
          `The company has recorded both sides of the balance — benefit: "${benefitSide}"; impact: "${impactSide}" — and records ${measures.length === 1 ? "one safeguard" : `${nWord(measures.length)} safeguards`} (${measures.join("; ")}) applied against that impact. On these facts the impact is answered and the processing is proportionate to the recorded purpose.`;
      }
    }

    return {
      operation_id: op.operation_id,
      operation_label: op.operation_label,
      benefit_argument: benefitSide || NOT_STATED,
      impact_argument: impactSide || NOT_STATED,
      argued_both_directions,
      verdict,
      why,
      citation: a.citation || cit(regime, "Art. 35(7)(b)"),
      authority_verbatim: a.verbatim,
      status,
      ...(information_needed ? { information_needed } : {}),
      ...(ask_class
        ? {
          ask_class,
          display_label: resolveAskLabel(ask_class, { op: op.operation_label }),
          scope_op: quotedOp(op.operation_label),
        }
        : {}),
    };
  });
}

// ---------------------------------------------------------------------
// 3. Art. 35(7)(c) — risk register
// ---------------------------------------------------------------------

/**
 * PROMPT 8E item 5 (CEO-ratified 2026-08-12) — regime-aware transfer test.
 *
 * `destination_country` is the PRIMARY signal; mechanism / notes text is
 * corroboration only. EU regime: a flow leaves where the destination is
 * outside the EEA. UK regime: a flow leaves where the destination is outside
 * the United Kingdom. Where no destination is recorded, an explicit
 * intra-EEA / no-third-country statement in the flow's own text settles it as
 * NOT leaving; otherwise the flow is treated as leaving (unchanged, and the
 * Chapter V ask already names what is missing).
 */
const EEA_ISO2 = new Set([
  "DE","IE","FR","ES","NL","IT","SE","DK","BE","AT","FI","LU","GR","PT","NO","PL",
  "CZ","HU","RO","BG","HR","SI","SK","EE","LV","LT","MT","CY","IS","LI",
]);
const EEA_NAMES =
  /\b(germany|ireland|france|spain|netherlands|italy|sweden|denmark|belgium|austria|finland|luxembourg|greece|portugal|norway|poland|czech|hungary|romania|bulgaria|croatia|slovenia|slovakia|estonia|latvia|lithuania|malta|cyprus|iceland|liechtenstein|eea|european economic area|eu)\b/i;
const UK_NAMES = /\b(uk|gb|united kingdom|great britain|england|scotland|wales|northern ireland)\b/i;
const NO_TRANSFER_TEXT =
  /\b(no third[- ]country transfer|no cross[- ]border transfer|intra[- ]eea|within the eea|eea[- ]internal|domestic only|uk[- ]only)\b/i;

export function flowLeavesOriginRegime(
  flow: Record<string, unknown>,
  recordRegime: DpiaRegime,
): boolean {
  const origin: DpiaRegime = String(flow.originRegime ?? flow.origin_regime ?? "").toUpperCase() === "UK"
    ? "UK"
    : String(flow.originRegime ?? flow.origin_regime ?? "").toUpperCase() === "EU"
    ? "EU"
    : recordRegime;
  const dest = str(flow.destination ?? flow.destinationCountry ?? flow.destination_country).trim();
  const corroboration = [flow.mechanism, flow.notes, flow.note, flow.safeguard]
    .map((x) => str(x))
    .join(" ");

  if (!dest) return !NO_TRANSFER_TEXT.test(corroboration);

  const code = dest.toUpperCase();
  if (origin === "UK") {
    if (code === "UK" || code === "GB" || UK_NAMES.test(dest)) return false;
    return true;
  }
  if (EEA_ISO2.has(code) || EEA_NAMES.test(dest)) return false;
  return true;
}

// PROMPT 9C item 1 (CEO-authorised) — TRANSFER-FLOW ALIAS WIDENING.
// The Section-2 coverage reader accepted only the UI shape
// (destination / importer / dpfCertified / ukExtensionCertified) while
// flowLeavesOriginRegime already accepted the contract's snake_case shape.
// This reader is the single alias surface for both shapes. Branch logic is
// unchanged: it only widens WHICH keys are read.
const DPF_TEXT = /\b(eu[-\s]?u\.?s\.?\s+data\s+privacy\s+framework|data\s+privacy\s+framework|\bdpf\b)\b/i;
const UK_EXT_TEXT = /\b(uk\s+extension|uk[-\s]?u\.?s\.?\s+data\s+bridge|data\s+bridge)\b/i;

export function readTransferFlowAliases(f: Record<string, unknown>, recordRegime: DpiaRegime = "EU"): {
  dest: string;
  origin: "EU" | "UK";
  importer: string;
  dpfCertified: boolean;
  ukExtensionCertified: boolean;
  mechanismText: string;
} {
  const dest = str(f.destination ?? f.destinationCountry ?? f.destination_country).trim();
  const originRaw = String(f.originRegime ?? f.origin_regime ?? "").toUpperCase();
  const importer = str(f.importer ?? f.importerEntity ?? f.recipient ?? f.importer_entity).trim();
  const mechanismText = [f.transfer_mechanism, f.mechanism, f.transferMechanism, f.safeguard]
    .map((x) => str(x))
    .join(" ")
    .trim();
  const dpfFlag = f.dpf_certified ?? f.dpfCertified ?? f.importerDpfCertified;
  const ukFlag = f.uk_extension_certified ?? f.ukExtensionCertified ?? f.importerUkExtensionCertified;
  // Mechanism text corroborates certification ONLY where the booleans are absent.
  const dpfCertified = dpfFlag == null ? DPF_TEXT.test(mechanismText) : !!dpfFlag;
  const ukExtensionCertified = ukFlag == null
    ? (DPF_TEXT.test(mechanismText) && UK_EXT_TEXT.test(mechanismText)) || UK_EXT_TEXT.test(mechanismText)
    : !!ukFlag;
  // PROMPT 9E item 2 — RECORD-REGIME ORIGIN FALLBACK. Where the flow carries
  // no originRegime, the origin is the RECORD's regime — exactly the
  // flowLeavesOriginRegime (8E) semantics — not a hardcoded "EU".
  const origin: "EU" | "UK" = originRaw === "UK"
    ? "UK"
    : originRaw === "EU"
    ? "EU"
    : (recordRegime === "UK" ? "UK" : "EU");
  return {
    dest,
    origin,

    importer,
    dpfCertified,
    ukExtensionCertified,
    mechanismText,
  };
}

// =====================================================================
// PROMPT 9F item 1 (CEO-ruled 2026-08-15) — CREDIT-FIRST ART. 46
// INSTRUMENT RECOGNITION.
//
// Evidence: batch 87c5b390 (run #187), quality_runs.partial_state
// .intakeGen.rejected[1] flow 1. The retry documented the executed IDTA, its
// countersignature date and a completed TRA verbatim, and the reader had no
// satisfiable path: a non-adequacy third-country flow yielded
// chapter_v_mechanism_required + the Chapter V ask unconditionally.
//
// Two branches ONLY. FULLY DOCUMENTED requires ALL THREE signals, each read
// in a sentence carrying no negation or future/modality language (the 8J
// DPO-matcher discipline, sentence-scoped). ANYTHING LESS falls through to the
// existing chapter_v_mechanism_required + ask, byte-unchanged.
//
// Lexicons are narrow and evidence-derived; each pattern carries the passage
// that evidences it.

/** Sentence splitter: full stops and semicolons both end a scoped clause. */
function chapterVSentences(text: string): string[] {
  return String(text ?? "")
    .split(/(?<=[.;])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// NEGATION / MODALITY GUARD — sentence-scoped. Each form lands from run 187.
const CHAPTER_V_BLOCKERS: RegExp[] = [
  // "No transfer mechanism documented. ... no GDPR Art. 46 or UK GDPR
  // Schedule 21 mechanism identified. This is an open gap." (run 187, flow 2)
  /\b(no|not|never|without)\b/i,
  /\bn't\b/i,
  // "has not been re-papered to reference the 2022 IDTA template — gap noted
  // by Siobhan Kehoe" (run 187, flow 4 transfer_mechanism)
  /\bre[-\s]?paper(?:ed|ing)\b/i,
  /\bgap\b/i,
  // "Mechanism validity is uncertain pending re-papering." (run 187, flow 4
  // notes)
  /\buncertain(?:ty)?\b/i,
  /\bpending\b/i,
  // "UK Extension certification status should be re-verified at annual DPA
  // review." (run 187, flow 1 first attempt notes)
  /\bshould be\b/i,
  /\bre[-\s]?verif(?:y|ied|ication)\b/i,
  // "TRA is planned for next quarter" (CEO-supplied must-NOT-credit fixture);
  // "scheduled for annual review" (run 187, flow 1 retry — future form)
  /\b(planned|scheduled|intend(?:s|ed)?|will\b|to be\b|forthcoming|next quarter)\b/i,
  /\byet\b/i,
  /\bin progress\b/i,
  /\bdraft\b/i,
  // PROMPT 9G (4b) — placeholder references are not completion evidence.
  // "IDTA countersigned on 2024-11-14. TRA ref TBD." (CEO verification probe)
  /\bTB[DA]\b/i,
  /\bto follow\b/i,
];

function chapterVClean(sentence: string): boolean {
  return !CHAPTER_V_BLOCKERS.some((re) => re.test(sentence));
}

/** (i) Named Chapter V instrument. Canonical label carried with the pattern. */
const CHAPTER_V_INSTRUMENTS: ReadonlyArray<{ re: RegExp; label: string }> = [
  // "UK International Data Transfer Agreement (IDTA) — addendum to the
  // DataRobot Master Services Agreement countersigned by both parties on
  // 2024-11-14" (run 187, flow 1 retry)
  { re: /\b(idta|international data transfer agreement)\b/i, label: "IDTA" },
  // "UK Addendum" — ICO Addendum to the EU SCCs, named alongside the IDTA in
  // the registry row UK-IDTA.
  { re: /\buk addendum\b/i, label: "UK Addendum" },
  // "no GDPR Art. 46 ... mechanism identified" (run 187, flow 2) names the
  // SCC family as the expected instrument; the positive form is credited here.
  { re: /\b(sccs?|standard contractual clauses)\b/i, label: "set of Standard Contractual Clauses" },
  { re: /\b(bcrs?|binding corporate rules)\b/i, label: "set of binding corporate rules" },
];

/** (ii) Execution evidence WITH a date. */
const CHAPTER_V_EXECUTION =
  // "countersigned by both parties on 2024-11-14" (run 187, flow 1 retry)
  /\b(executed|signed|countersigned|concluded)\b/i;
const CHAPTER_V_DATE =
  // ISO "2024-11-14" (run 187, flow 1 retry) and long/short British forms.
  /\b(\d{4}-\d{2}-\d{2}|\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}|(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/i;

/** (iii) Completed transfer risk assessment. */
const CHAPTER_V_TRA =
  // "A Transfer Risk Assessment (TRA) specific to this flow was completed by
  // Anna Whitfield at Pinsent Masons on 2024-11-10 (ref PM/VIG/2024/TRA-01)"
  // (run 187, flow 1 retry)
  /\b(tra|transfer risk assessment|transfer impact assessment|tia)\b/i;
// PROMPT 9G (4b) — TRA-EVIDENCE TIGHTENING. Completion is evidenced either by
// an explicit completion word, or by a reference that actually carries an
// identifier containing a digit. A bare "ref"/"reference" with no identifier
// (or a placeholder — see the TBD/TBA/"to follow" blockers above) is NOT
// completion evidence.
const CHAPTER_V_TRA_COMPLETE =
  // "was completed by Anna Whitfield ... on 2024-11-10"; "on file."
  // (run 187, flow 1 retry)
  /\b(completed|complete|on file)\b/i;
const CHAPTER_V_TRA_REF_ID =
  // "(ref PM/VIG/2024/TRA-01)" (run 187, flow 1 retry) — the identifier must
  // contain a digit. "TRA ref TBD" (CEO verification probe) does not match.
  /\bref(?:erence|\.)?\s*[:#]?\s*[A-Za-z0-9][A-Za-z0-9/_.\-]*\d[A-Za-z0-9/_.\-]*/i;
function chapterVTraEvidenced(sentence: string): boolean {
  if (!CHAPTER_V_TRA.test(sentence)) return false;
  return CHAPTER_V_TRA_COMPLETE.test(sentence) || CHAPTER_V_TRA_REF_ID.test(sentence);
}


/** Bounded verbatim: the crediting sentence, capped on a word boundary. */
const CHAPTER_V_VERBATIM_MAX = 300;
function boundVerbatim(text: string): string {
  const t = String(text ?? "").trim();
  if (t.length <= CHAPTER_V_VERBATIM_MAX) return t;
  const cut = t.slice(0, CHAPTER_V_VERBATIM_MAX);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 40 ? cut.slice(0, sp) : cut).replace(/[\s.,;:—-]+$/, "")}…`;
}

export interface ChapterVInstrumentCredit {
  readonly credited: boolean;
  readonly instrumentLabel: string;
  readonly verbatim: string;
}

/**
 * Single writer for the fully-documented branch. Reads the flow's own
 * mechanism/notes text only; no model call, no inference beyond the lexicons.
 */
export function readChapterVInstrumentCredit(text: string): ChapterVInstrumentCredit {
  const none: ChapterVInstrumentCredit = { credited: false, instrumentLabel: "", verbatim: "" };
  const sentences = chapterVSentences(text).filter(chapterVClean);
  if (sentences.length === 0) return none;

  // PROMPT 9G (4a) — SAME-SENTENCE RULE. The named instrument and its
  // execution-verb-plus-date must be read from the SAME clean sentence. This
  // kills the cross-document false credit ("SCCs govern the transfer to the
  // importer. The master services agreement was signed on 3 May 2022."), where
  // the execution evidence belongs to a different document entirely. The TRA
  // may still be evidenced in a separate clean sentence.
  let instrumentLabel = "";
  let creditSentence = "";
  let traSeen = false;

  for (const s of sentences) {
    if (!creditSentence) {
      const hit = CHAPTER_V_INSTRUMENTS.find((p) => p.re.test(s));
      if (hit && CHAPTER_V_EXECUTION.test(s) && CHAPTER_V_DATE.test(s)) {
        instrumentLabel = hit.label;
        creditSentence = s;
      }
    }
    if (!traSeen && chapterVTraEvidenced(s)) traSeen = true;
  }

  if (!instrumentLabel || !creditSentence || !traSeen) return none;
  return {
    credited: true,
    instrumentLabel,
    verbatim: boundVerbatim(creditSentence),
  };

}

/** CEO-ratified 9F finding sentence — mirrors the Art. 28 credit row. */
function chapterVCreditFinding(who: string, instrumentLabel: string, verbatim: string): string {
  return `For the flow to ${who}, the company records an executed ${instrumentLabel} and a completed transfer risk assessment, in its own words: ${spliceVerbatim(verbatim)}. The flow proceeds on the company's recorded basis; this assessment records the instrument as the company describes it and has not reviewed the instrument itself.`;
}





function facts(intake: unknown): RiskFacts {
  const transfers = get(intake, "transfer_flows");
  const flows = Array.isArray(transfers) ? (transfers as Record<string, unknown>[]) : [];
  return {
    dataCategories: arr(get(intake, "data_categories")),
    safeguards: arr(get(intake, "existing_safeguards")).filter((s) => s !== "None"),
    processors: arr(get(intake, "third_party_processors")),
    transferCount: flows.length,
    transferLeavesRegime: flows.some((f) => flowLeavesOriginRegime(f, readDpiaRegime(intake))),
    retentionStated: str(get(intake, "retention_period")).length > 0,
    reasons: arr(get(intake, "reasons_to_conduct")),
    secondaryUses: str(get(intake, "secondary_uses")),
    volume: str(get(intake, "volume_frequency")),
  };
}

function bandFromSeverity(sev: string): RiskBand {
  if (sev === "Severe") return "high";
  if (sev === "Significant") return "moderate";
  if (sev === "Moderate") return "low";
  return "undetermined";
}

const BAND_ORDER: RiskBand[] = ["low", "moderate", "high"];

function lower(band: RiskBand, steps: number): RiskBand {
  if (band === "undetermined") return band;
  const i = BAND_ORDER.indexOf(band);
  return BAND_ORDER[Math.max(0, i - steps)];
}

export function buildRiskRegister(intake: unknown): RiskRegisterEntry[] {
  const f = facts(intake);
  const regime = readDpiaRegime(intake);
  const a = anchor("risks", regime);
  const m = anchor("measures", regime);
  // WP248-PINNING (2026-08-01) — the severity appraisal is guidance-anchored.
  const g = anchor("risk_severity", regime);
  const out: RiskRegisterEntry[] = [];

  for (const spec of DPIA_RISK_SPECS) {
    if (!spec.trigger(f)) continue;

    const measures = spec.mitigating_safeguards.filter((s) => f.safeguards.includes(s));
    const coverage = spec.mitigating_safeguards.length === 0
      ? 0
      : measures.length / spec.mitigating_safeguards.length;

    // Likelihood is READ OFF the record's safeguard coverage for this risk —
    // it is never invented and never asserted where the record is silent
    // about safeguards altogether.
    let likelihood: Likelihood;
    if (f.safeguards.length === 0) {
      likelihood = "Likely";
    } else if (coverage >= 0.75) {
      likelihood = "Unlikely";
    } else if (coverage > 0) {
      likelihood = "Possible";
    } else {
      likelihood = "Likely";
    }

    const inherent_band = bandFromSeverity(spec.severity);
    const residual_band: RiskBand = likelihood === "Unlikely"
      ? lower(inherent_band, 1)
      : likelihood === "Possible"
      ? inherent_band
      : inherent_band === "low"
      ? "moderate"
      : inherent_band;

    const insufficient = measures.length === 0;

    out.push({
      risk_id: spec.risk_id,
      risk_label: spec.risk_label,
      // PROMPT 8 — EDPB § 3.1 design-risk vs § 4.1.1 incident-risk.
      risk_class: spec.risk_class,
      source: spec.source_template,
      affected_rights: spec.affected_rights,
      likelihood,
      severity: spec.severity,
      inherent_band,
      measures,
      residual_band,
      citation: a.citation || cit(regime, "Art. 35(7)(c)"),
      authority_verbatim: [a.verbatim, m.verbatim].filter(Boolean).join(" "),
      ...(g.verbatim
        ? { guidance_citation: g.citation, guidance_verbatim: g.verbatim }
        : {}),
      status: insufficient ? "record_insufficient" : "analysed",
      ...(insufficient
        ? {
          information_needed:
            `The measures actually applied against "${spec.risk_label}" — the record names none of: ${spec.mitigating_safeguards.join("; ")}. Record the measure, who operates it, and how its effect is evidenced.`,
          ask_class: "ask_risk_measures",
          display_label: resolveAskLabel("ask_risk_measures", { risk: spec.risk_label }),
        }
        : {}),
    });
  }

  return out;
}

// ---------------------------------------------------------------------
// 4. Art. 36(1) — prior-consultation determination
// ---------------------------------------------------------------------
/** SEPARATION GUARD — relocate exposure sentences out of an obligation finding. */
export function splitExposure(text: string): { kept: string; moved: string; repairs: number } {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const kept: string[] = [];
  const moved: string[] = [];
  for (const s of sentences) {
    if (matches(s, EXPOSURE_LEXICON)) moved.push(s);
    else kept.push(s);
  }
  return { kept: kept.join(" ").trim(), moved: moved.join(" ").trim(), repairs: moved.length };
}

export function buildArt36Consultation(
  intake: unknown,
  register: readonly RiskRegisterEntry[],
): Art36Consultation {
  const regime = readDpiaRegime(intake);
  const a = anchor("art36", regime);
  const proc = anchor("art36_materials", regime);

  const high = register.filter((r) => r.residual_band === "high");
  const undetermined = register.filter((r) => r.residual_band === "undetermined");
  const insufficient = register.filter((r) => r.status === "record_insufficient");

  let determination: Art36Consultation["determination"];
  let rawWhy: string;
  let status: Art36Consultation["status"] = "analysed";
  let information_needed: string | undefined;
  let ask_class: DpiaAskClass | undefined;

  if (register.length === 0) {
    determination = "undetermined_on_the_record";
    status = "record_insufficient";
    rawWhy =
      "No risk was identified on this record, so there is no residual-risk finding for the Art. 36(1) test to read.";
    information_needed =
      "A completed description of the processing sufficient to identify the risks to the rights and freedoms of the data subjects.";
    ask_class = "ask_art36_description";
  } else if (high.length > 0) {
    determination = "consultation_required";
    rawWhy =
      `${a.verbatim} Based on the information the company provided, ${
        high.length === 1
          ? `one risk — ${high[0].risk_label} — is deemed a high risk`
          : `${nWord(high.length)} risks — ${high.map((r) => r.risk_label).join("; ")} — are deemed high risks`
      } after the mitigating measures the company has recorded, so the condition in Art. 36(1) is met and the controller must consult ${regime === "UK" ? "the Commissioner" : "the competent supervisory authority"} before the processing begins.`;
  } else if (undetermined.length > 0 || insufficient.length > 0) {
    determination = "undetermined_on_the_record";
    status = "record_insufficient";
    const names = [...new Set([...undetermined, ...insufficient].map((r) => r.risk_label))];
    rawWhy =
      `Art. 36(1) turns on whether a high risk remains once mitigating measures are taken into account. Based on the information the company provided, the remaining risk level for ${
        names.length === 1 ? `one risk — ${names[0]} —` : `${nWord(names.length)} risks — ${names.join("; ")} —`
      } cannot be settled, so the prior-consultation question is open rather than answered either way.`;
    information_needed =
      `The measures applied to: ${names.join("; ")}, and the effect each has on the likelihood or severity of that risk.`;
    ask_class = "ask_art36_open_measures";
  } else {
    determination = "consultation_not_required";
    rawWhy =
      `${a.verbatim} Based on the information the company provided, every identified risk is deemed low or moderate after the mitigating measures the company has recorded, so the Art. 36(1) condition is not met and prior consultation is not triggered by this assessment. This determination is bound to the measures as recorded; if a measure is not operated as stated, the determination must be re-run.`;

  }

  const { kept, moved, repairs } = splitExposure(rawWhy);

  return {
    determination,
    why: kept,
    exposure_note: moved,
    separation_repairs: repairs,
    driving_risk_ids: high.map((r) => r.risk_id),
    citation: a.citation || cit(regime, "Art. 36(1)"),
    authority_verbatim: a.verbatim,
    procedural_note: determination === "consultation_required"
      ? `${proc.verbatim} the respective responsibilities of the controller, joint controllers and processors; the purposes and means of the intended processing; the measures and safeguards; the contact details of the data protection officer where applicable; and this data protection impact assessment.`
      : "Art. 36(3) applies only where a consultation is required; on this determination no consultation submission arises.",
    procedural_citation: proc.citation || cit(regime, "Art. 36(3)"),
    // PROMPT 8E item 7 — DORMANT. Read only; no renderer consumes it and the
    // determination above is untouched by it.
    dpo_recommends_consultation: dpoRecommendsConsultation(str(get(intake, "dpo_advice"))),
    status,
    ...(information_needed ? { information_needed } : {}),
    ...(ask_class ? { ask_class, display_label: resolveAskLabel(ask_class) } : {}),
  };
}


// ---------------------------------------------------------------------
// 5. Art. 6(1) — legal basis (PILOT 2026-08-11, ITEM 310 pattern)
//
// Single writer for report.legal_basis. Reads the closed set of intake
// fields that bear on lawful basis (legal_basis_proposed, purpose,
// secondary_uses, data_subjects, necessity_proportionality,
// data_minimisation_justification, data_categories, existing_safeguards,
// alternatives_considered) and, where Art. 6(1)(f) is selected, runs the
// three-part legitimate-interests test as a decision tree. A part the
// record does not support is reported unmet with a specific
// `information_needed` string — never filled with invention.
// ---------------------------------------------------------------------

const ART6_SUBSECTIONS: readonly { readonly re: RegExp; readonly sub: string; readonly label: string }[] = [
  { re: /consent/i, sub: "Art. 6(1)(a)", label: "Consent (Art. 6(1)(a))" },
  { re: /contract/i, sub: "Art. 6(1)(b)", label: "Contract (Art. 6(1)(b))" },
  { re: /legal obligation/i, sub: "Art. 6(1)(c)", label: "Legal obligation (Art. 6(1)(c))" },
  { re: /vital interest/i, sub: "Art. 6(1)(d)", label: "Vital interests (Art. 6(1)(d))" },
  { re: /public task|public interest|official authority/i, sub: "Art. 6(1)(e)", label: "Public task (Art. 6(1)(e))" },
  { re: /legitimate interest/i, sub: "Art. 6(1)(f)", label: "Legitimate interests (Art. 6(1)(f))" },
];

/** Vulnerable-subject signals that raise the balancing bar (Art. 6(1)(f) final clause). */
const VULNERABLE_SUBJECTS: readonly RegExp[] = [
  /\bchild(ren)?\b/i,
  /\bminors?\b/i,
  /\bemployees?\b/i,
  /\bpatients?\b/i,
  /\bvulnerable\b/i,
];

const SPECIAL_CATEGORY_CATS = ["Health or medical data", "Biometric data", "Children's data"];

/**
 * PROMPT 9H.1 item 1 (CEO-ruled 2026-08-15) — PINPOINT-FIRST RESOLUTION.
 *
 * Defect corrected: ART6_SUBSECTIONS is keyword-ordered, so /contract/i tested
 * before /legitimate interest/i and matched the word "contractual" in the
 * Harrowgate pinned fixture's secondary text — "…a basis stated separately from
 * the contractual basis of the primary operation" — resolving the secondary
 * operation to 6(1)(b) even though that text explicitly names "Article 6(1)(f):".
 *
 * Resolution order is now: (1) explicit Art. 6(1) sub-paragraph pinpoint, first
 * pinpoint wins; (2) only where NO pinpoint exists, the existing keyword list
 * runs byte-unchanged in its existing order. One implementation, used wherever
 * a basis is resolved (record-level and per-operation) — no fork.
 */
const ART6_PINPOINT_RE = /(?:art(?:icle|\.)?\s*)?6\s*\(\s*1\s*\)\s*\(\s*([a-f])\s*\)/i;

function readArt6(basisText: string): { sub: string; label: string } | null {
  const pin = ART6_PINPOINT_RE.exec(basisText);
  if (pin) {
    const sub = `Art. 6(1)(${pin[1].toLowerCase()})`;
    const e = ART6_SUBSECTIONS.find((x) => x.sub === sub);
    if (e) return { sub: e.sub, label: e.label };
  }
  for (const e of ART6_SUBSECTIONS) if (e.re.test(basisText)) return { sub: e.sub, label: e.label };
  return null;
}

// ── PHASE 0 PROMPT 2 (2026-08-11) — per-basis branching, Art. 6(1)(a)–(e) ──
//
// DEFECT 1 fix: each sub-basis resolves its OWN anchor. Where the verified
// registry carries no row for that sub-basis the verbatim is the empty string;
// Art. 5(1)(a) lawfulness text is never substituted for an Art. 6(1) citation.
// DEFECT 2 fix: each sub-basis carries its own deterministic record test,
// reading only existing intake fields.

/** Anchor key per Art. 6(1) sub-basis. Missing registry rows → empty verbatim. */
const ART6_ANCHOR_KEYS = {
  "Art. 6(1)(a)": "consent",
  "Art. 6(1)(b)": "contract",
  "Art. 6(1)(c)": "legal_obligation",
  "Art. 6(1)(d)": "vital_interests",
  "Art. 6(1)(e)": "public_task",
  "Art. 6(1)(f)": "legitimate_interests",
} as const;

/** Consent capture / withdrawal language (6(1)(a)). */
const CONSENT_LEXICON: readonly RegExp[] = [
  /\bwithdraw(al|n|ing)?\b/i,
  /\bopt[- ]?in\b/i,
  /\bconsent (is )?(collected|captured|obtained|recorded|given)\b/i,
  /\bconsent (banner|form|screen|record|management)\b/i,
  /\bunsubscribe\b/i,
  /\bpreference cent(re|er)\b/i,
];

/**
 * Contracting-party language (6(1)(b)).
 *
 * PROMPT 9E item 3 (CEO-ruled 2026-08-15) — PARTY-RELATIONSHIP WIDENING.
 * Evidence: run ec65e54d's rejected intake read "Individual consumers
 * (adults aged 18+) applying for Vanthorpe personal motor or home insurance
 * products" — plainly the pre-contractual class Art. 6(1)(b) contemplates —
 * but the lexicon matched noun forms only and missed "applying for". Only
 * party-RELATIONSHIP language is added; non-party classes (people whose data
 * is scraped from public sources, tracked website visitors) must still fail.
 */
const CONTRACT_PARTY_LEXICON: readonly RegExp[] = [
  /\bcustomers?\b/i,
  /\bclients?\b/i,
  /\bsubscribers?\b/i,
  /\bemployees?\b/i,
  /\bparty\b|\bparties\b/i,
  /\baccount ?holders?\b/i,
  /\bpolicy ?holders?\b/i,
  /\bapplicants?\b/i,
  // "…applying for Vanthorpe personal motor or home insurance products"
  // (run ec65e54d intake, data_subjects) — pre-contractual steps at the
  // data subject's request.
  /\bapply(ing|ies)? for\b|\bapplied for\b|\bapplications? for\b/i,
  // "prospective policyholders", "prospective customers" — the same
  // pre-contractual class named as a noun phrase.
  /\bprospective (customers?|clients?|policy ?holders?|subscribers?|members?|tenants?)\b/i,
  // Insurance / lending / tenancy counterparties.
  /\bthe insured\b|\binsureds?\b/i,
  /\bborrowers?\b/i,
  /\bmembers\b/i,
];


/** A NAMED legal instrument (6(1)(c) and 6(1)(e)). */
const NAMED_INSTRUMENT_LEXICON: readonly RegExp[] = [
  /\b[A-Z][A-Za-z]+ Act\b/,
  /\bAct \d{4}\b/,
  /\bRegulation \(EU\)/i,
  /\bDirective \d{2,4}\/\d+/i,
  /\bDirective \(EU\)/i,
  /\b§\s?\d/,
  /\bArt(icle)?\.?\s?\d+/,
  /\bsection \d+/i,
  /\bCode\b.*\b(civil|labour|labor|tax|commercial|health)\b/i,
  /\b(statute|statutory instrument)\b/i,
];

/** Life / safety / emergency language (6(1)(d)). */
const VITAL_INTEREST_LEXICON: readonly RegExp[] = [
  /\bvital interest/i,
  /\blife[- ]threatening\b/i,
  /\bemergenc(y|ies)\b/i,
  /\bsafety of\b/i,
  /\bsave (a )?li(fe|ves)\b/i,
  /\bmedical emergency\b/i,
  /\bdisaster\b/i,
];

/** Closing sentence carried by EVERY basis branch, unchanged in substance. */
const BASIS_CLOSER =
  "This assessment records the basis the controller has selected and the purpose it is selected for; " +
  "whether the conditions of that basis are met in operation is a matter for the controller's lawfulness record, " +
  "which this assessment does not substitute.";

interface BasisCheck {
  readonly met: boolean;
  /** What the record does or does not establish, in the fixed register. */
  readonly finding: string;
  readonly information_needed?: string;
  /** (d) only: the record does not describe the scenario at all. */
  readonly undetermined?: boolean;
}

function checkNonLiBasis(
  sub: string,
  fields: {
    readonly subjects: string;
    readonly rightsMechanisms: string;
    readonly description: string;
    readonly natureScopeContext: string;
    readonly narrative: string;
    readonly reasons: string;
    readonly codes: string;
    readonly categories: readonly string[];
  },
): BasisCheck {
  const instrumentScan = [
    fields.narrative,
    fields.natureScopeContext,
    fields.reasons,
    fields.codes,
  ].filter(Boolean).join(" ");

  switch (sub) {
    case "Art. 6(1)(a)": {
      const scan = [fields.rightsMechanisms, fields.description, fields.natureScopeContext]
        .filter(Boolean).join(" ");
      const met = matches(scan, CONSENT_LEXICON);
      return met
        ? {
          met: true,
          finding:
            "The record describes how consent is obtained and how it can be withdrawn, which is what reliance on consent requires it to establish.",
        }
        : {
          met: false,
          finding:
            "The record does not describe how consent is collected or how it can be withdrawn, so reliance on consent is not established on the record.",
          information_needed:
            "How consent is collected for this processing — the moment of capture and what the data subject is told — and how withdrawal is offered and acted on.",
        };
    }
    case "Art. 6(1)(b)": {
      const met = matches(fields.subjects, CONTRACT_PARTY_LEXICON);
      return met
        ? {
          met: true,
          finding:
            `The data subjects the record describes — "${fields.subjects}" — are parties to a relationship of the kind Art. 6(1)(b) contemplates, so the basis attaches to the recorded purpose.`,
        }
        : {
          met: false,
          finding:
            "The record does not establish that the data subjects are party to the contract, or that the processing takes pre-contractual steps at their request.",
          information_needed:
            "The contract relied on, named, and the data subject's status as a party to it (or the pre-contractual step taken at the data subject's request).",
        };
    }
    case "Art. 6(1)(c)": {
      const span = matchSpan(instrumentScan, NAMED_INSTRUMENT_LEXICON);
      const met = span.length > 0;
      return met
        ? {
          met: true,
          finding:
            `The company identifies the instrument the obligation arises under — "${span}" — so the obligation relied on can be identified rather than assumed.`,
        }
        : {
          met: false,
          finding:
            "The record does not name the law that establishes the obligation; it describes the obligation generally, which does not identify the instrument the basis depends on.",
          information_needed:
            "The specific Union or Member State law establishing the legal obligation relied on — named as an instrument, not described generally.",
        };
    }
    case "Art. 6(1)(d)": {
      const health = fields.categories.includes("Health or medical data");
      const scenario = matches([fields.narrative, fields.description, fields.natureScopeContext]
        .filter(Boolean).join(" "), VITAL_INTEREST_LEXICON);
      return (health || scenario)
        ? {
          met: true,
          finding:
            "The record describes a life or safety scenario of the kind Art. 6(1)(d) is confined to, so the basis attaches to the recorded purpose.",
        }
        : {
          met: false,
          undetermined: true,
          finding:
            "The record does not describe the vital-interest scenario — no life, safety or emergency circumstance is stated, and the data set does not include health or medical data — so the basis cannot be tested on this record.",
          information_needed:
            "The life or safety circumstance relied on, and why the processing is necessary to protect the vital interests of the data subject or another natural person.",
        };
    }
    case "Art. 6(1)(e)": {
      const span = matchSpan(instrumentScan, NAMED_INSTRUMENT_LEXICON);
      const met = span.length > 0;
      return met
        ? {
          met: true,
          finding:
            `The company identifies the instrument the task or official authority is laid down in — "${span}" — so the public-task footing can be identified rather than assumed.`,
        }
        : {
          met: false,
          finding:
            "The record does not name the law laying down the task carried out in the public interest or the official authority relied on.",
          information_needed:
            "The specific Union or Member State law laying down the task carried out in the public interest or the official authority vested in the controller — named as an instrument, not described generally.",
        };
    }
    default:
      return { met: false, finding: "" };
  }
}


/** PROMPT 9A — Art. 6(1) sub-basis → ratified ask-class id. */
const NON_LI_ASK_CLASS: Record<string, DpiaAskClass> = {
  "Art. 6(1)(a)": "ask_lb_consent",
  "Art. 6(1)(b)": "ask_lb_contract",
  "Art. 6(1)(c)": "ask_lb_legal_obligation",
  "Art. 6(1)(d)": "ask_lb_vital",
  "Art. 6(1)(e)": "ask_lb_public_task",
};

export function buildLegalBasis(intake: unknown): LegalBasisFinding[] {
  const regime = readDpiaRegime(intake);
  const li = anchor("legitimate_interests", regime);
  const lawfulness = anchor("lawfulness", regime);
  const necessityTest = anchor("necessity_test", regime);

  const basisText = str(get(intake, "legal_basis_proposed"));
  const subjects = str(get(intake, "data_subjects"));
  const narrative = str(get(intake, "necessity_proportionality"));
  const minimisation = str(get(intake, "data_minimisation_justification"));
  const combined = [narrative, minimisation].filter(Boolean).join(" ");
  const categories = arr(get(intake, "data_categories"));
  const safeguards = arr(get(intake, "existing_safeguards")).filter((x) => x !== "None");
  const rightsMechanisms = str(get(intake, "data_subject_rights_mechanisms"));
  const description = str(get(intake, "description"));
  const natureScopeContext = str(get(intake, "nature_scope_context"));
  const reasons = arr(get(intake, "reasons_to_conduct")).join("; ") ||
    str(get(intake, "reasons_to_conduct"));
  const codes = str(get(intake, "codes_of_conduct"));
  // PROMPT 8C item 1 (ratified 2026-08-12): where the intake carries an
  // Art. 9(2) condition, the non-(f) justification points at the
  // special-categories table. Byte-exact; never in the (f) branch.
  const art9Selected = str(get(intake, "article_9_condition"));
  const ART9_CROSS_REFERENCE =
    " Because special categories of personal data are involved, this basis is read together with the Article 9(2) condition addressed in the special-categories table below.";

  /** Per-basis anchor; empty verbatim where the registry has no row. */
  const basisAnchor = (sub: string) => {
    const key = (ART6_ANCHOR_KEYS as Record<string, keyof typeof ANCHOR_KEYS>)[sub];
    return key ? anchor(key, regime) : { citation: "", verbatim: "" };
  };

  return buildOperations(intake).map((op) => {
    const purpose = op.purpose_text;
    // PROMPT 9H item 1 (CEO-ruled 2026-08-15) — PER-OPERATION BASIS READER.
    // A record may state one basis at record level and a DIFFERENT basis in
    // the secondary operation's own text ("...on the basis of consent").
    // The secondary operation resolves its basis from its OWN text first and
    // falls back to the record-level field only where its text names none.
    // The primary operation is unchanged: record-level field only.
    const opBasisText = op.operation_id === "op_secondary" && readArt6(op.purpose_text)
      ? op.purpose_text
      : basisText;
    const art6 = readArt6(opBasisText);

    // ── No basis recorded, or no purpose to attach it to ──────────────
    if (!art6) {
      return {
        operation_id: op.operation_id,
        purpose: purpose || NOT_STATED,
        article_6_basis: basisText || NOT_STATED,
        justification:
          `The record does not identify which Art. 6(1) basis is relied on for "${op.operation_label}"` +
          (basisText ? ` — it records "${basisText}", which does not resolve to one of the six bases.` : ".") +
          ` Lawfulness is the first principle the processing must satisfy: ${lawfulness.verbatim}` +
          " No lawful basis can be assessed on this record.",
        verdict: "undetermined_on_the_record" as const,
        citation: regimePrefixed(regime, lawfulness.citation) || cit(regime, "Art. 5(1)(a)"),
        authority_verbatim: lawfulness.verbatim,
        status: "record_insufficient" as const,
        information_needed:
          `The Art. 6(1) basis relied on for "${op.operation_label}" — one of consent, contract, legal obligation, vital interests, public task, or legitimate interests — stated for this purpose specifically.`,
        operation_label: op.operation_label,
        ask_class: "ask_lb_basis_unresolved",
        display_label: resolveAskLabel("ask_lb_basis_unresolved", { op: op.operation_label }),
        scope_op: quotedOp(op.operation_label),
      };
    }

    if (!purpose) {
      return {
        operation_id: op.operation_id,
        purpose: NOT_STATED,
        article_6_basis: art6.label,
        justification:
          `The record proposes ${art6.label} but states no purpose for "${op.operation_label}". ` +
          "Every Art. 6(1) basis is measured against the purpose the processing pursues, so the basis cannot be assessed until the purpose is on the record.",
        verdict: "undetermined_on_the_record" as const,
        citation: cit(regime, art6.sub),
        authority_verbatim: basisAnchor(art6.sub).verbatim,
        status: "record_insufficient" as const,
        information_needed:
          `The specific purpose pursued by "${op.operation_label}", stated as an outcome, so the proposed ${art6.label} can be tested against it.`,
        operation_label: op.operation_label,
        ask_class: "ask_lb_purpose_for_test",
        display_label: resolveAskLabel("ask_lb_purpose_for_test", { op: op.operation_label }),
        scope_op: quotedOp(op.operation_label),
      };
    }

    // ── Non-6(1)(f) bases: per-basis record test against the purpose ───
    if (art6.sub !== "Art. 6(1)(f)") {
      const a = basisAnchor(art6.sub);
      const check = checkNonLiBasis(art6.sub, {
        subjects,
        rightsMechanisms,
        description,
        natureScopeContext,
        narrative: combined,
        reasons,
        codes,
        categories,
      });

      const opening = `The company relies on ${art6.label} for the recorded purpose ("${purpose}").` +
        (a.verbatim ? ` The basis reads: ${a.verbatim}` : "");

      return {
        operation_id: op.operation_id,
        purpose,
        article_6_basis: art6.label,
        justification: [opening, check.finding, BASIS_CLOSER].filter(Boolean).join(" ") +
          (art9Selected ? ART9_CROSS_REFERENCE : ""),
        verdict: check.met
          ? ("basis_supported_on_the_record" as const)
          : ("undetermined_on_the_record" as const),
        citation: cit(regime, art6.sub),
        // DEFECT 1: never Art. 5(1)(a) text under an Art. 6(1) citation.
        authority_verbatim: a.verbatim,
        status: check.met ? ("analysed" as const) : ("record_insufficient" as const),
        ...(check.information_needed ? { information_needed: check.information_needed } : {}),
        operation_label: op.operation_label,
        ...(check.information_needed && NON_LI_ASK_CLASS[art6.sub]
          ? {
            ask_class: NON_LI_ASK_CLASS[art6.sub],
            display_label: resolveAskLabel(NON_LI_ASK_CLASS[art6.sub], { op: op.operation_label }),
            scope_op: quotedOp(op.operation_label),
          }
          : {}),
      };
    }


    // ── Art. 6(1)(f): the three-part test, run as a decision tree ──────
    const alternatives = alternativesFor(intake, op);
    // PROMPT 8J item 3 — the impact side may be described anywhere the record
    // argues it (views sought, residual risks, potential harms), not only in
    // necessity_proportionality + data_minimisation_justification.
    const impactStated = matches(combined, IMPACT_LEXICON) || impactEvidence(intake).length > 0;
    const vulnerable =
      VULNERABLE_SUBJECTS.some((re) => re.test(subjects)) ||
      categories.includes("Children's data");
    const special = categories.some((c) => SPECIAL_CATEGORY_CATS.includes(c));

    const purpose_test_met = purpose.length > 0;
    const purpose_test_why = purpose_test_met
      ? `Part one (purpose test): the record states the interest pursued — "${purpose}" — which is an identified interest of the controller capable of being weighed.`
      : "Part one (purpose test): no interest is stated on the record, so there is nothing to weigh.";

    const necessity_test_met = alternatives.length > 0 && alternatives.every((x) => x.rejection_reason !== NOT_STATED);
    const necessity_test_why = necessity_test_met
      ? `Part two (necessity test): the record identifies ${alternatives.length} alternative means (${alternatives.map((x) => x.alternative).join("; ")}) and states why each would not achieve the stated interest, applying the test the guidance sets: ${necessityTest.verbatim}`
      : `Part two (necessity test): the record does not show that the stated interest cannot reasonably be achieved by a less intrusive means${alternatives.length > 0 ? ", because the alternatives it records carry no rejection reason" : ", because no alternative means are recorded as considered"}. On this record necessity for the purposes of Art. 6(1)(f) is not established.`;

    const balancing_test_met = impactStated && (!vulnerable || safeguards.length > 0) && !special;
    const balancing_test_why = !impactStated
      ? `Part three (balancing test): the record does not describe the impact of the processing on ${subjects || "the data subjects"}, so their interests and fundamental rights cannot be set against the controller's interest.`
      : special
      ? `Part three (balancing test): the record describes the impact on ${subjects || "the data subjects"} but the data set includes special-category or children's data (${categories.filter((c) => SPECIAL_CATEGORY_CATS.includes(c)).join("; ")}), which raises the weight on the data subjects' side; the record does not show that the controller's interest survives that weighting.`
      : vulnerable && safeguards.length === 0
      ? `Part three (balancing test): the data subjects described (${subjects}) are in a position of dependency or reduced ability to object, and no safeguards are recorded that would reduce the effect on them, so the balance is not established based on the information the company provided.`
      : `Part three (balancing test): the record describes the effect on ${subjects || "the data subjects"} and records the measures that reduce it (${safeguards.join("; ") || "the measures stated"}), so the controller's interest is not shown to be overridden on this record.`;

    const legitimate_interests_test: LegitimateInterestsTest = {
      purpose_test_met,
      purpose_test_why,
      necessity_test_met,
      necessity_test_why,
      balancing_test_met,
      balancing_test_why,
    };

    const unmet: string[] = [];
    if (!purpose_test_met) unmet.push("purpose test");
    if (!necessity_test_met) unmet.push("necessity test");
    if (!balancing_test_met) unmet.push("balancing test");

    const head =
      `The company relies on ${art6.label} for the recorded purpose ("${purpose}"). ` +
      `The basis reads: ${li.verbatim} ` +
      "It is established only where all three of its parts hold based on the information the company provided.";
    const justification = [head, purpose_test_why, necessity_test_why, balancing_test_why].join(" ");

    const information_needed = unmet.length === 0
      ? undefined
      : `For "${op.operation_label}", the record does not support the ${unmet.join(" or the ")}. ` +
        (!purpose_test_met ? "State the interest pursued as an outcome. " : "") +
        (!necessity_test_met ? "Record each less intrusive means considered and the specific reason it would not achieve that interest. " : "") +
        (!balancing_test_met ? `Describe the effect of the processing on ${subjects || "the data subjects"} — what they lose, what they would not expect, and what they cannot avoid — and the measures that reduce it${special && !art9Selected ? ", and state the Art. 9 condition relied on for the special-category items" : ""}.` : "");

    // PROMPT 9A — the 6(1)(f) compound ask decomposes into its ratified parts.
    // The compound ask itself is UNCHANGED and remains the gap-table text; each
    // unmet part contributes its own labeled entry on the composed surfaces.
    const ask_parts: { ask_class: string; display_label: string }[] = [];
    const addPart = (id: DpiaAskClass) =>
      ask_parts.push({ ask_class: id, display_label: resolveAskLabel(id, { op: op.operation_label }) });
    if (!purpose_test_met) addPart("ask_lia_purpose");
    if (!necessity_test_met) addPart("ask_lia_necessity");
    if (!balancing_test_met) addPart("ask_lia_balancing");
    if (special && !art9Selected) addPart("ask_lia_art9");

    return {
      operation_id: op.operation_id,
      operation_label: op.operation_label,
      ...(ask_parts.length
        ? {
          ask_parts,
          ask_class: ask_parts[0].ask_class,
          display_label: ask_parts[0].display_label,
          scope_op: quotedOp(op.operation_label),
        }
        : {}),
      purpose,
      article_6_basis: art6.label,
      justification,
      verdict: unmet.length === 0
        ? ("basis_supported_on_the_record" as const)
        : ("undetermined_on_the_record" as const),
      citation: regimePrefixed(regime, li.citation) || cit(regime, "Art. 6(1)(f)"),
      authority_verbatim: li.verbatim,
      legitimate_interests_test,
      status: unmet.length === 0 ? ("analysed" as const) : ("record_insufficient" as const),
      ...(information_needed ? { information_needed } : {}),
    };
  });
}


// ---------------------------------------------------------------------
// 6. Deterministic sign-off decision (PROMPT 3, 2026-08-11)
//
// Pure branching over the typed surfaces. Supersedes the u5 model string
// at section_6_conclusion.decision as the skeleton's decision source. This
// is NOT report_data.determination (ITEM 372 METHOD 2a), which is a legacy
// prose block and decides nothing.
// ---------------------------------------------------------------------
/**
 * PROMPT 9A (R3) — the {blockers} slot filling. Compact labels carry no
 * terminal punctuation, so the seam supplies exactly one stop and no ". —" or
 * doubled-stop sequence can be produced.
 */
export function blockerSlot(blockers: readonly string[]): string {
  const items = blockers.map((b) => str(b).trim().replace(/[\s.;,]+$/u, "")).filter(Boolean);
  return items.length ? `${items.join("; ")}.` : "";
}

function labels(rows: readonly { readonly risk_label: string }[]): string {
  return [...new Set(rows.map((r) => r.risk_label))].join("; ");
}

export function buildDecision(
  intake: unknown,
  deliverables: {
    readonly necessity_findings: readonly NecessityFinding[];
    readonly proportionality: readonly ProportionalityFinding[];
    readonly risk_register: readonly RiskRegisterEntry[];
    readonly art36_consultation: Art36Consultation;
    readonly legal_basis: readonly LegalBasisFinding[];
  },
): DpiaDecision {
  const regime = readDpiaRegime(intake);
  const a = anchor("art36", regime);
  const art36Citation = a.citation || cit(regime, "Art. 36(1)");
  const register = deliverables.risk_register;
  const authority = regime === "UK"
    ? "the Commissioner"
    : "the competent supervisory authority";

  // PROMPT 8D (CEO-ratified 2026-08-12) — the grounded plain-language why
  // templates. Branch discipline: no template is stretched across facts it was
  // not written for, and the no-measures, undetermined-level and zero-risk
  // fact patterns each carry their own sentence. Determination MAPPING, CEO-
  // ruled: the no-measures branch resolves to `conditionally_approved` (or
  // stays `draft_incomplete` where the record is already unresolvable) and
  // NEVER to `approved`; the zero-risk branch is `draft_incomplete`.

  // (a) Prior consultation settles the outcome before anything else.
  if (deliverables.art36_consultation.determination === "consultation_required") {
    const driving = register.filter((r) => r.residual_band === "high");
    const named = labels(driving);
    return {
      determination: "consultation_required",
      conditions: [],
      blockers: [],
      why:
        `Given the noted risks and the mitigating measures, the processing being assessed may not begin as things stand: ${driving.length === 1 ? "one risk" : `${driving.length} risks`}${named ? ` — ${named} —` : ""} ${driving.length === 1 ? "is deemed a high risk" : "are deemed high risks"} after the mitigating measures the company has recorded, and the controller must consult ${authority} under Article 36(1) before the processing begins.`,
      citation: art36Citation,
      rule_id: "dpia_decision_v1",
    };
  }

  // (a2) PROMPT 8D branch 13g — an empty register carries no determination.
  if (register.length === 0) {
    return {
      determination: "draft_incomplete",
      conditions: [],
      blockers: [],
      why:
        "No risk has been identified by the company or otherwise identified in this assessment, so there is nothing on which a determination can rest; a determination requires at least one risk to be assessed.",
      citation: art36Citation,
      rule_id: "dpia_decision_v1",
    };
  }

  // (b) An unresolvable record cannot carry a determination either way.
  const openBands = register.filter((r) => r.residual_band === "undetermined");
  const insufficient: readonly {
    readonly information_needed?: string;
    readonly ask_class?: string;
    readonly display_label?: string;
    readonly scope_op?: string;
    readonly ask_parts?: readonly { readonly ask_class: string; readonly display_label: string }[];
  }[] = [
    ...openBands,
    ...deliverables.necessity_findings.filter((f) => f.status === "record_insufficient"),
    ...deliverables.proportionality.filter((f) => f.status === "record_insufficient"),
    ...deliverables.legal_basis.filter((f) => f.status === "record_insufficient"),
    ...(deliverables.art36_consultation.status === "record_insufficient"
      ? [deliverables.art36_consultation]
      : []),
  ];
  if (openBands.length > 0 || insufficient.length > 0) {
    // PROMPT 9A (R1/R4) — blockers render the ratified COMPACT LABEL, merged
    // across operations by ask-class. The full ask is unchanged and keeps its
    // gap-table row; the template around the slot is untouched.
    const blockerItems: { ask_class?: string; label: string; scope_op?: string }[] = [];
    for (const f of insufficient) {
      const parts = f.ask_parts ?? [];
      if (parts.length > 0) {
        for (const part of parts) {
          blockerItems.push({ ask_class: part.ask_class, label: part.display_label, scope_op: f.scope_op });
        }
        continue;
      }
      const label = str(f.display_label) || str(f.information_needed);
      if (label) blockerItems.push({ ask_class: f.ask_class, label, scope_op: f.scope_op });
    }
    const blockers = mergeLabeledAsks(blockerItems).map(renderMergedLabel);
    return {
      determination: "draft_incomplete",
      conditions: [],
      blockers,
      why: (() => {
        // PROMPT 8D branch 13f — undetermined risk levels get their own
        // sentence; the generic open-points sentence is 13b.
        if (openBands.length > 0) {
          const head =
            `Given that ${openBands.length === 1 ? "one risk level remains" : `${openBands.length} risk levels remain`} undetermined, whether the processing being assessed may proceed cannot yet be determined; the levels must be set before this assessment can carry a determination.`;
          return blockers.length ? `${head} The following are still needed — ${blockerSlot(blockers)}` : head;
        }
        const n = blockers.length;
        const head =
          `Given the points still open, whether the processing being assessed may proceed cannot yet be determined: ${n === 1 ? "one point the determination turns on is" : `${n} points the determination turns on are`} unresolved based on the information the company provided`;
        return blockers.length ? `${head} — ${blockerSlot(blockers)}` : `${head}.`;
      })(),
      citation: art36Citation,
      rule_id: "dpia_decision_v1",
    };
  }

  // (c) High remaining risk without an Art. 36 trigger rides on its measures.
  const high = register.filter((r) => r.residual_band === "high");
  if (high.length > 0) {
    const conditions: string[] = [];
    for (const r of high) {
      if (r.measures.length > 0) conditions.push(...r.measures);
      else conditions.push(`a recorded measure for ${r.risk_label}`);
    }
    const deduped = [...new Set(conditions)];
    return {
      determination: "conditionally_approved",
      conditions: deduped,
      blockers: [],
      why:
        `Given the noted risks and the mitigating measures, the processing being assessed may proceed on conditions: ${high.length === 1 ? "one risk" : `${high.length} risks`} — ${labels(high)} — ${high.length === 1 ? "is deemed a high risk" : "are deemed high risks"}, and clearance is conditional on ${deduped.join("; ")}.`,
      citation: art36Citation,
      rule_id: "dpia_decision_v1",
    };
  }

  // (c2) PROMPT 8D branch 13e — a register on which no measure is recorded at
  // all has not been tested against anything. Mapped to conditional approval,
  // never approval.
  if (register.every((r) => r.measures.length === 0)) {
    return {
      determination: "conditionally_approved",
      conditions: ["recording the mitigating measures the company will rely on for each risk in this register"],
      blockers: [],
      why:
        "Given the noted risks and the absence of any recorded mitigating measure, the processing being assessed may proceed only once the company records the measures it will rely on: no risk level in this document has been tested against a measure.",
      citation: art36Citation,
      rule_id: "dpia_decision_v1",
    };
  }

  // (d) Everything settled at or below a moderate remaining risk level.
  return {
    determination: "approved",
    conditions: [],
    blockers: [],
    why:
      `Given the noted risks and the mitigating measures, the processing being assessed may proceed as described: every risk identified by the company and otherwise identified in this assessment is deemed low or moderate, and no determination this assessment makes is left open. This determination is bound to those measures as recorded; if a measure is not operated as stated, the assessment must be re-run.`,
    citation: art36Citation,
    rule_id: "dpia_decision_v1",
  };
}


// ---------------------------------------------------------------------
// PROMPT 4 (2026-08-11) — deterministic gap ledger.
//
// Single writer for report.gap_ledger. Every entry is sourced from a TYPED
// finding that already carries an ask; nothing is harvested out of prose.
// INVARIANT: an entry with empty `dimensions` or empty `field` is never
// emitted — a content-free ask is a builder bug upstream, and it is counted
// in telemetry rather than shown to a customer.
// ---------------------------------------------------------------------

/** Intake contract keys this ledger may name (dpia-framework.ts). */
const GAP_FIELD_PURPOSE = "purpose";
const GAP_FIELD_ALTERNATIVES = "alternatives_considered";
const GAP_FIELD_NECPROP = "necessity_proportionality";
const GAP_FIELD_BASIS = "legal_basis_proposed";
const GAP_FIELD_SAFEGUARDS = "existing_safeguards";
const GAP_FIELD_RESIDUAL = "residual_risks";

const GAP_STOPWORDS = new Set([
  "the", "and", "for", "that", "this", "with", "which", "from", "was", "were",
  "are", "its", "each", "any", "has", "have", "been", "their", "they", "record",
  "recorded", "company", "companys", "stated", "state", "states",
]);

function gapTokens(t: string): Set<string> {
  return new Set(
    t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter((w) => w.length > 2 && !GAP_STOPWORDS.has(w)),
  );
}

function gapOverlap(a: string, b: string): number {
  const A = gapTokens(a), B = gapTokens(b);
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared / Math.min(A.size, B.size);
}

export interface GapLedgerResult {
  readonly gap_ledger: DpiaGapLedgerEntry[];
  readonly dropped_empty: number;
  readonly dropped_unmapped: number;
  readonly merged: number;
}

function legalBasisGapField(f: LegalBasisFinding): string {
  if (/6\(1\)\(f\)|legitimate interest/i.test(f.article_6_basis)) return GAP_FIELD_NECPROP;
  return GAP_FIELD_BASIS;
}


// ---------------------------------------------------------------------
// PROMPT 6 (2026-08-11) — deterministic processing inventory.
//
// The descriptive content of EDPB §§0/1 as TYPED, intake-traceable rows.
// LAW: verbatim-or-absent. Every row names the intake contract key it came
// from; nothing is inferred, enriched or enumerated beyond the record's own
// words, and there are no model calls anywhere in this builder.
// ---------------------------------------------------------------------
const SPECIAL_CATEGORY_CATS_LOCAL = [
  "Health or medical data",
  "Biometric data",
] as const;

const ASK_DPO =
  "whether a data protection officer is designated for this processing, and if so their name and contact details";
const ASK_PROCESSOR_OBLIGATIONS =
  "the obligations and tasks each processor is bound to under the Art. 28 processing contract";
const ASK_ART9_CONDITION =
  "which Art. 9(2) condition is relied on for the special-category data recorded here";

export function buildProcessingInventory(intake: unknown): DpiaProcessingInventory {
  // ── controllers: exactly one row ────────────────────────────────────
  const dpo = str(get(intake, "dpo_info"));
  // eu_decision_establishment_country carries emptyIsAnswer semantics: an
  // empty string is the answer "decisions are made elsewhere", never a gap.
  const central = str(get(intake, "central_administration_country"));
  const euDecision = str(get(intake, "eu_decision_establishment_country"));
  const establishment = euDecision || central;
  const controller: DpiaInventoryController = {
    name: str(get(intake, "organization_name")),
    // PROMPT 7 RIDER (2026-08-11): `controller_contact` is the CONTACT FOR
    // THIS ASSESSMENT (the spine renders it as such), not an organisational
    // unit — putting it in a "Responsible unit" cell is a misattribution. The
    // intake carries no responsible-unit field, so this is honest absence: a
    // record-completeness residual, NOT a verdict-blocking ask, and therefore
    // no gap_ledger entry is raised for it.
    responsible_unit: "",
    main_establishment_or_representative: establishment,
    dpo,
    status: dpo ? "analysed" : "record_insufficient",
    ...(dpo ? {} : { information_needed: ASK_DPO, ask_class: "ask_dpo", display_label: resolveAskLabel("ask_dpo") }),
    source_field: "organization_name",
  };

  // ── processors ──────────────────────────────────────────────────────
  const processorNames = arr(get(intake, "third_party_processors"));
  const obligations = str(get(intake, "processor_obligations"));
  const processors: DpiaInventoryProcessor[] = [];
  if (processorNames.length === 0) {
    // Absence of processors is a substantive answer, not a gap.
    processors.push({
      name: "None identified",
      obligations_and_tasks: "",
      status: "analysed",
      source_field: "third_party_processors",
    });
  } else {
    for (const name of processorNames) {
      processors.push({
        name,
        obligations_and_tasks: obligations,
        status: obligations ? "analysed" : "record_insufficient",
        ...(obligations
          ? {}
          : {
            information_needed: ASK_PROCESSOR_OBLIGATIONS,
            ask_class: "ask_processor_contract",
            display_label: resolveAskLabel("ask_processor_contract", { name }),
          }),
        source_field: "third_party_processors",
      });
    }
  }

  // ── data items ──────────────────────────────────────────────────────
  const art9 = str(get(intake, "article_9_condition"));
  const data_items: DpiaInventoryDataItem[] = arr(get(intake, "data_categories")).map((item) => {
    const special = (SPECIAL_CATEGORY_CATS_LOCAL as readonly string[]).includes(item);
    if (!special) {
      return {
        item,
        special_category: false,
        status: "analysed" as const,
        source_field: "data_categories",
      };
    }
    return {
      item,
      special_category: true,
      ...(art9 ? { art9_condition_label: art9 } : {}),
      status: (art9 ? "analysed" : "record_insufficient") as "analysed" | "record_insufficient",
      ...(art9
        ? {}
        : {
          information_needed: ASK_ART9_CONDITION,
          ask_class: "ask_art9_condition",
          display_label: resolveAskLabel("ask_art9_condition", { item }),
        }),
      source_field: "data_categories",
    };
  });

  // ── purposes: op-aligned with buildOperations ───────────────────────
  const purposes: DpiaInventoryPurpose[] = buildOperations(intake).map((op) => ({
    purpose_text: op.purpose_text,
    operation_id: op.operation_id,
    source_field: op.operation_id === "op_secondary" ? "secondary_uses" : "purpose",
  }));

  // ── secondary uses ──────────────────────────────────────────────────
  const secondaryText = str(get(intake, "secondary_uses"));
  const secondary_uses: DpiaInventorySecondaryUse[] = secondaryText
    ? [{
      use_text: secondaryText,
      negation: isSecondaryUseNegation(secondaryText),
      source_field: "secondary_uses",
    }]
    : [];

  // ── planning + scale ────────────────────────────────────────────────
  const launch = str(get(intake, "estimated_launch_date"));
  const end = str(get(intake, "estimated_end_date"));
  const version = str(get(intake, "processing_version"));

  return {
    controllers: [controller],
    processors,
    data_items,
    purposes,
    secondary_uses,
    planning: {
      ...(launch ? { launch_date: launch } : {}),
      ...(end ? { end_date: end } : {}),
      ...(version ? { version } : {}),
    },
    scale: {
      volume_frequency_verbatim: str(get(intake, "volume_frequency")),
      source_field: "volume_frequency",
    },
  };
}

// ---------------------------------------------------------------------
// PROMPT 7 (2026-08-11) — deterministic Section-2 coverage tables.
//
// Single writer for report.section2_coverage. Zero model calls; every
// citation resolves through the anchor registry or `cit()`; every row is
// either the record's own words or an honest abstention. Nothing renders
// this yet.
//
// TIERING LAW (the reason this builder is not uniform):
//   TIER 1 rows run real decision trees, because structured intake exists
//     (special-category enum, the transfer_flows repeater, the safeguards
//     enum + the processor list).
//   TIER 2 rows run coverage logic over measures the record NAMES in
//     narrative fields — present/absent, quoted, never re-argued.
//   TIER 3 rows are abstentions: the intake is too thin for per-principle
//     or per-right tables, so the builder emits ONE coverage row and says
//     what a real table would need. It never fabricates structure.
// ---------------------------------------------------------------------

/**
 * INTRA-EEA PROCESSING RULE — encoded from prompt text to code.
 * PROVENANCE: run-dpia-framework/index.ts extraRules, "INTRA-EEA PROCESSING
 * RULE" (the prompt rule is the spec; this comment reproduces it):
 *
 *   "Personal data flows between EU/EEA member states are NOT Chapter V
 *    'transfers' and do NOT require adequacy decisions, SCCs, or BCRs. Use
 *    the term 'intra-EEA processing' (NEVER 'intra-EEA transfers'). For an
 *    EEA-established processor processing data solely within the EEA, only a
 *    GDPR Article 28 DPA is required. An EU-established processor that uses
 *    non-EEA infrastructure (e.g. an Irish-incorporated company using US data
 *    centres) still triggers Chapter V for the non-EEA processing leg,
 *    regardless of the processor's place of establishment. UK <-> EU flows:
 *    an EU adequacy decision for the UK has been in force since 28 June 2021,
 *    and the UK treats the EU/EEA as adequate under UK adequacy regulations —
 *    both directions therefore flow freely without SCCs or IDTA, subject to
 *    confirming that the adequacy decision remains in force."
 *
 * The adequacy list itself is NOT retyped here: determinations come from the
 * static, dated, registry-backed table `transferMechanism()` in
 * _shared/dpia-jurisdiction-registry.ts (each row carries `lastVerified`).
 */
export const TRANSFER_RULE_ID = "dpia_transfers_intra_eea_v1";

/** Regime-strict anchor: never quotes an EU row under a UK citation. */
function anchorStrict(
  key: keyof typeof ANCHOR_KEYS,
  regime: DpiaRegime,
  fallbackSubsection: string,
): { citation: string; verbatim: string } {
  const base = ANCHOR_KEYS[key];
  const r = regime === "UK" ? row(`uk_${base}`) : row(base);
  if (r) return { citation: r.subsection, verbatim: r.verbatim_quote };
  return { citation: cit(regime, fallbackSubsection), verbatim: "" };
}

const ASK_ART9_CONDITION_FOR = (item: string) =>
  `which Art. 9(2) condition is relied on for the ${item.toLowerCase()} recorded here`;
const ASK_CHAPTER_V = (dest: string) =>
  `which Chapter V instrument is executed for the flow to ${dest}, the date it was signed, and the transfer risk assessment supporting it`;
const ASK_DPA = "whether a written processing contract is in place with each named processor, and the date it was signed";
const ASK_RETENTION = "the retention period applied to this data, and the event the period runs from";
const ASK_DPBD = "the technical and organisational measures built into the design of this processing, and when each was implemented";
const ASK_SAFEGUARDS_LIST = "which technical and organisational measures are applied to this processing";
// PROMPT 8C item 2 (ratified 2026-08-12): Tier-3 asks name the facts wanted.
const ASK_DATA_QUALITY =
  "The measures that keep the personal data accurate and up to date for this purpose, and how data quality is checked.";
const ASK_ART5_TABLE =
  "The measures supporting each Article 5(1) principle — fairness, transparency, purpose limitation, data minimisation, accuracy, storage limitation, integrity and confidentiality — stated principle by principle, and whether each measure has been deployed.";
const ASK_RIGHTS_TABLE =
  "How each data-subject right — information, access, rectification, erasure, restriction, portability, objection — can be exercised for this processing: the route, the responding role, and the response time.";

// PROMPT 10B(2) — credit-first residuals. Fired when the source field IS
// supplied but unstructured: no determination turns on the breakdown, so it is
// a record-completeness residual, never a gap-ledger entry.
const RESIDUAL_ART5_TABLE =
  "The company's account above covers this ground; a per-principle breakdown would complete the table but no determination in this assessment turns on it.";
const RESIDUAL_RIGHTS_TABLE =
  "The company's account above covers this ground; a per-right breakdown would complete the table but no determination in this assessment turns on it.";

/**
 * PROMPT 10B(1) — resolve the Art. 9(2)(x) pinpoint carried by the intake's
 * condition enum label into a citation string anchored on the same GDPR Art. 9
 * registry row. No new corpus rows; no literal statute text.
 */
function art9PinpointCitation(label: string, regime: DpiaRegime): string {
  const prefix = regime === "UK" ? "UK GDPR" : "GDPR";
  const m = /9\(2\)\(([a-z])\)/i.exec(label);
  return m ? `${prefix} Art. 9(2)(${m[1].toLowerCase()})` : `${prefix} Art. 9(2)`;
}


const INTAKE_STRUCTURE_RECOMMENDATIONS: readonly DpiaIntakeStructureRecommendation[] = [
  {
    field: "data_quality_measures",
    today: "single free-text narrative",
    would_enable: "a per-measure data-quality table (measure, owner, frequency) with a real per-row status, instead of one quoted paragraph",
  },
  {
    field: "article_5_principle_measures",
    today: "not collected — Art. 5 content is inferred from narrative fields",
    would_enable: "a per-principle repeater (principle, measure, evidence) so the Art. 5 coverage table can carry a determination per principle",
  },
  {
    field: "data_subject_rights_mechanisms",
    today: "single free-text narrative covering all rights at once",
    would_enable: "a per-right repeater (right, route, response time, identity check) so the rights table can carry a determination per right",
  },
  {
    field: "data_minimisation_justification",
    today: "single free-text narrative covering the whole data set",
    would_enable: "a per-data-item necessity justification, so minimisation is decided per field rather than per activity",
  },
];

export function buildSection2Coverage(
  intake: unknown,
  deliverables: { readonly processing_inventory: DpiaProcessingInventory },
): DpiaSection2Coverage {
  const regime = readDpiaRegime(intake);
  const inv = deliverables.processing_inventory;

  // ── TIER 1a — special-category conditions ───────────────────────────
  const a9 = anchorStrict("special_categories", regime, "Art. 9(2)");
  const np = spliceVerbatim(str(get(intake, "necessity_proportionality")));
  const special_category_conditions: DpiaSpecialCategoryConditionRow[] = inv.data_items
    .filter((d) => d.special_category)
    .map((d) => {
      const label = str(d.art9_condition_label);
      if (!label) {
        return {
          item: d.item,
          condition_label: "",
          justification: `The company has recorded ${d.item.toLowerCase()} in scope but names no Art. 9(2) condition for it.`,
          citation: a9.citation,
          authority_verbatim: a9.verbatim,
          status: "record_insufficient" as const,
          information_needed: ASK_ART9_CONDITION_FOR(d.item),
          ask_class: "ask_art9_condition",
          display_label: resolveAskLabel("ask_art9_condition", { item: d.item }),
          source_field: "article_9_condition",
        };
      }
      const justification = np
        ? `The company relies on ${label} for ${d.item.toLowerCase()}. On the company's own account of necessity and proportionality, ${np}`
        : `The company relies on ${label} for ${d.item.toLowerCase()}.`;
      return {
        item: d.item,
        condition_label: label,
        justification,
        citation: a9.citation,
        // PROMPT 10B(1) — ledger the Art. 9(2)(x) pinpoint through the same
        // registry row, so the ToA can consolidate it under GDPR Art. 9.
        condition_citation: art9PinpointCitation(label, regime),
        authority_verbatim: a9.verbatim,
        status: "analysed" as const,
        source_field: "article_9_condition",
      };
    });

  // ── TIER 1b — transfers (emptyIsAnswer: zero rows is a determination) ─
  const chapterVCite = cit(regime, "Chapter V (Arts. 44–49)");
  const rawFlows = get(intake, "transfer_flows");
  const flows = Array.isArray(rawFlows) ? rawFlows : [];
  const transfers: DpiaTransferRow[] = [];
  if (flows.length === 0) {
    transfers.push({
      origin_regime: regime,
      destination: "",
      importer: "",
      determination: "no_transfer_on_the_record",
      mechanism_label: "",
      mechanism_citation: "",
      transfer_risk_assessment_required: false,
      finding:
        "No cross-border transfer is on the record for this processing, so no Chapter V mechanism is engaged by this assessment.",
      citation: chapterVCite,
      status: "analysed",
      source_field: "transfer_flows",
      registry_verified_on: "",
    });
  } else {
    for (const f of flows as Record<string, unknown>[]) {
      const r = readTransferFlowAliases(f, regime);
      const dest = r.dest.toUpperCase();
      const origin: "EU" | "UK" = r.origin === "UK" ? "UK" : "EU";
      const flow: TransferFlow = {
        originRegime: origin,
        destinationCountry: dest,
        importerEntity: r.importer || undefined,
        importerDpfCertified: r.dpfCertified,
        importerUkExtensionCertified: r.ukExtensionCertified,
      };

      const mech = transferMechanism(flow);
      const intra = mech.id === "EEA-internal";
      // PROMPT 9E item 1 — UK-origin, UK-destination is domestic processing.
      const domesticUk = mech.id === "UK-internal";
      // PROMPT 9F item 1 — credit-first Art. 46 instrument recognition. The
      // flow's OWN mechanism/notes text is the only source; the credit is
      // available in both regimes and never on an intra-EEA / UK-domestic row.
      const flowNotesText = [f.notes, f.note].map((x) => str(x)).join(" ").trim();
      const credit = (intra || domesticUk)
        ? { credited: false, instrumentLabel: "", verbatim: "" }
        : readChapterVInstrumentCredit([r.mechanismText, flowNotesText].filter(Boolean).join(" "));
      const determination = intra
        ? "intra_eea_processing" as const
        : domesticUk
        ? "uk_domestic_processing" as const
        : credit.credited
        ? "instrument_recorded" as const
        : mech.tiaRequired
        ? "chapter_v_mechanism_required" as const
        : "adequacy" as const;
      const importer = r.importer;
      const who = importer ? `${importer} in ${dest || "the destination stated"}` : (dest || "the destination stated");
      const finding = intra
        // INTRA-EEA PROCESSING RULE, encoded: never "transfer", never a Chapter V ask.
        ? `The flow to ${who} stays within the EEA. This is intra-EEA processing, not a Chapter V transfer, and the Art. 28 processing contract is the instrument that governs it.`
        : domesticUk
        // CEO-ratified 9E sentence, mirroring the intra-EEA sentence.
        ? `The flow to ${who} stays within the United Kingdom. This is domestic processing, not a Chapter V transfer, and the Art. 28 processing contract is the instrument that governs it.`
        : determination === "instrument_recorded"
        // CEO-ratified 9F sentence, mirroring the Art. 28 credit row.
        ? chapterVCreditFinding(who, credit.instrumentLabel, credit.verbatim)
        : determination === "adequacy"
        ? `The flow to ${who} is covered by ${mech.mechanism}, so the data travels on that basis without a separate Chapter V instrument.`
        : `The flow to ${who} leaves the ${origin === "UK" ? "United Kingdom" : "EEA"} for a destination with no adequacy cover on the record, so ${mech.mechanism} is the mechanism this assessment expects.`;


      transfers.push({
        origin_regime: origin,
        destination: dest,
        importer,
        determination,
        mechanism_label: mech.mechanism,
        mechanism_citation: mech.citation,
        transfer_risk_assessment_required: !!mech.tiaRequired,
        finding,
        citation: chapterVCite,
        status: determination === "chapter_v_mechanism_required" ? "record_insufficient" : "analysed",
        ...(determination === "chapter_v_mechanism_required"
          ? {
            information_needed: ASK_CHAPTER_V(dest || "the destination stated"),
            ask_class: "ask_transfer_mechanism",
            display_label: resolveAskLabel("ask_transfer_mechanism", { dest }),
          }
          : {}),
        source_field: "transfer_flows",
        registry_verified_on: str(mech.lastVerified),
      });
    }
  }

  // ── TIER 1c — Art. 28 processor contract ────────────────────────────
  const a28 = anchorStrict("processor_contract", regime, "Art. 28(3)");
  const safeguards = arr(get(intake, "existing_safeguards"));
  const processorNames = arr(get(intake, "third_party_processors"));
  const dpaRecorded = safeguards.includes("DPA signed with processor");
  const processor_contract: DpiaProcessorContractRow = processorNames.length === 0
    ? {
      processors: [],
      dpa_recorded: dpaRecorded,
      finding:
        "The company has recorded no third-party processor for this processing, so no Art. 28 processing contract is engaged by this assessment.",
      citation: a28.citation,
      authority_verbatim: a28.verbatim,
      status: "analysed",
      source_field: "third_party_processors",
    }
    : dpaRecorded
    ? {
      processors: processorNames,
      dpa_recorded: true,
      finding: `The record selects a signed processing contract as a safeguard and names ${processorNames.join(", ")}, so the Art. 28 instrument is recorded for the processor chain described.`,
      citation: a28.citation,
      authority_verbatim: a28.verbatim,
      status: "analysed",
      source_field: "existing_safeguards",
    }
    : {
      processors: processorNames,
      dpa_recorded: false,
      finding: `The company has recorded ${processorNames.join(", ")} as processors but does not record a signed processing contract among the safeguards selected.`,
      citation: a28.citation,
      authority_verbatim: a28.verbatim,
      status: "record_insufficient",
      information_needed: ASK_DPA,
      ask_class: "ask_dpa_contracts",
      display_label: resolveAskLabel("ask_dpa_contracts"),
      source_field: "existing_safeguards",
    };

  // ── TIER 2a — minimisation & retention, per data item ───────────────
  // PROMPT 9H item 2 (CEO-ruled 2026-08-15) — RETENTION IS LEDGERED UNDER
  // STORAGE LIMITATION. The row carried only the data-minimisation pinpoint
  // (Art. 5(1)(c)), so a stated retention period was never ledgered against
  // Art. 5(1)(e) and the Table of Authorities could not list it. The row now
  // cites BOTH principles: minimisation for the "why it is needed" column and
  // storage limitation for the retention determination.
  const aMin = anchorStrict("minimisation", regime, "Art. 5(1)(c)");
  const aStore = anchorStrict("storage_limitation", regime, "Art. 5(1)(e)");
  const minJust = str(get(intake, "data_minimisation_justification"));
  const retention = str(get(intake, "retention_period"));
  const data_minimisation_retention: DpiaMinimisationRetentionRow[] = inv.data_items.map((d) => ({
    item: d.item,
    need_justification: minJust,
    retention_period: retention,
    citation: `${aMin.citation}; ${aStore.citation}`,
    authority_verbatim: [aMin.verbatim, aStore.verbatim].filter(Boolean).join(" "),
    status: (retention ? "analysed" : "record_insufficient") as "analysed" | "record_insufficient",
    ...(retention
      ? {}
      : {
        information_needed: ASK_RETENTION,
        ask_class: "ask_retention",
        display_label: resolveAskLabel("ask_retention", { item: d.item }),
      }),
    source_field: "data_minimisation_justification",
  }));

  // ── TIER 2b — data protection by design ─────────────────────────────
  const aDpbd = anchorStrict("dpbd", regime, "Art. 25(1)");
  const dpbd = str(get(intake, "dp_by_design_measures"));
  const measures_dpbd: DpiaMeasureRow[] = [
    dpbd
      ? {
        measure: "Data protection by design and by default",
        description: dpbd,
        citation: aDpbd.citation,
        authority_verbatim: aDpbd.verbatim,
        status: "analysed" as const,
        source_field: "dp_by_design_measures",
      }
      : {
        measure: "Data protection by design and by default",
        description: "",
        citation: aDpbd.citation,
        authority_verbatim: aDpbd.verbatim,
        status: "record_insufficient" as const,
        information_needed: ASK_DPBD,
        ask_class: "ask_dpbd",
        display_label: resolveAskLabel("ask_dpbd"),
        source_field: "dp_by_design_measures",
      },
  ];

  // ── TIER 2c — security safeguards, one row per recorded selection ───
  const aSec = anchorStrict("security", regime, "Art. 32(1)");
  const measures_security: DpiaMeasureRow[] = [];
  if (safeguards.length === 0) {
    measures_security.push({
      measure: "Not recorded",
      description: "",
      citation: aSec.citation,
      authority_verbatim: aSec.verbatim,
      status: "record_insufficient",
      information_needed: ASK_SAFEGUARDS_LIST,
      source_field: "existing_safeguards",
    });
  } else {
    for (const sel of safeguards) {
      const spec = DPIA_SAFEGUARD_SPECS.find((sp) => sp.measure === sel);
      measures_security.push({
        measure: sel,
        description: spec
          ? spec.description
          : "The record selects this measure; the record does not describe it further.",
        citation: aSec.citation,
        authority_verbatim: aSec.verbatim,
        status: "analysed",
        source_field: "existing_safeguards",
      });
    }
  }

  // ── TIER 3a — data quality (verbatim or abstention) ─────────────────
  const dq = str(get(intake, "data_quality_measures"));
  const data_quality: DpiaCoverageRow[] = [
    dq
      ? {
        heading: "Accuracy of the data held",
        record_words: dq,
        finding: "The record's account of how this data is kept accurate is set out in the company's own words.",
        citation: cit(regime, "Art. 5(1)(d)"),
        authority_verbatim: "",
        status: "analysed" as const,
        source_field: "data_quality_measures",
      }
      : {
        heading: "Accuracy of the data held",
        record_words: "",
        finding: "The record does not describe any measure that keeps this data accurate and up to date, so this assessment makes no finding on accuracy.",
        citation: cit(regime, "Art. 5(1)(d)"),
        authority_verbatim: "",
        status: "record_insufficient" as const,
        information_needed: ASK_DATA_QUALITY,
        ask_class: "ask_data_quality",
        display_label: resolveAskLabel("ask_data_quality"),
        source_field: "data_quality_measures",
      },
  ];

  // ── TIER 3b — Art. 5 principles (single coverage row, never a table) ─
  // PROMPT 10B(2): source PRESENT → analysed + credit-first residual (no ask,
  // no ledger entry); source ABSENT → the 8C ask, ledgered as before.
  const aPurpose = anchorStrict("purpose_limitation", regime, "Art. 5(1)");
  const measures_article5: DpiaCoverageRow[] = [
    minJust
      ? {
        heading: "Measures carrying the Art. 5 principles",
        record_words: spliceVerbatim(minJust),
        finding:
          "On the record supplied, the measures bearing on the Art. 5 principles are described at the level of the activity as a whole, in the company's own words, and not principle by principle.",
        citation: aPurpose.citation,
        authority_verbatim: aPurpose.verbatim,
        status: "analysed" as const,
        residual_note: RESIDUAL_ART5_TABLE,
        source_field: "data_minimisation_justification",
      }
      : {
        heading: "Measures carrying the Art. 5 principles",
        record_words: "",
        finding:
          "The record describes no measure against the Art. 5 principles, so this assessment records coverage at the level of the activity as a whole and makes no principle-by-principle finding.",
        citation: aPurpose.citation,
        authority_verbatim: aPurpose.verbatim,
        status: "record_insufficient" as const,
        information_needed: ASK_ART5_TABLE,
        ask_class: "ask_art5_table",
        display_label: resolveAskLabel("ask_art5_table"),
        source_field: "data_minimisation_justification",
      },
  ];

  // ── TIER 3c — data-subject rights (single coverage row) ─────────────
  const rights = str(get(intake, "data_subject_rights_mechanisms"));
  const measures_rights: DpiaCoverageRow[] = [
    rights
      ? {
        heading: "Routes by which data subjects exercise their rights",
        record_words: spliceVerbatim(rights),
        finding:
          "The routes recorded for rights requests are set out in the company's own words, covering the rights together rather than one by one.",
        citation: cit(regime, "Arts. 12–22"),
        authority_verbatim: "",
        status: "analysed" as const,
        residual_note: RESIDUAL_RIGHTS_TABLE,
        source_field: "data_subject_rights_mechanisms",
      }
      : {
        heading: "Routes by which data subjects exercise their rights",
        record_words: "",
        finding:
          "The record describes no route by which data subjects exercise their rights, so this assessment makes no finding on any individual right.",
        citation: cit(regime, "Arts. 12–22"),
        authority_verbatim: "",
        status: "record_insufficient" as const,
        information_needed: ASK_RIGHTS_TABLE,
        ask_class: "ask_rights_table",
        display_label: resolveAskLabel("ask_rights_table"),
        source_field: "data_subject_rights_mechanisms",
      },
  ];

  return {
    special_category_conditions,
    transfers,
    processor_contract,
    data_minimisation_retention,
    measures_dpbd,
    measures_security,
    data_quality,
    measures_article5,
    measures_rights,
    intake_structure_recommendations: INTAKE_STRUCTURE_RECOMMENDATIONS,
    rule_id: "dpia_section2_coverage_v1",
  };
}

export function buildGapLedgerDetailed(
  _intake: unknown,
  deliverables: {
    readonly necessity_findings: readonly NecessityFinding[];
    readonly proportionality: readonly ProportionalityFinding[];
    readonly risk_register: readonly RiskRegisterEntry[];
    readonly art36_consultation: Art36Consultation;
    readonly legal_basis: readonly LegalBasisFinding[];
    readonly decision: DpiaDecision;
    readonly processing_inventory?: DpiaProcessingInventory;
    readonly section2_coverage?: DpiaSection2Coverage;
  },
): GapLedgerResult {
  // PROMPT 9A (R1) — an entry carries BOTH forms: `dimensions` (the full ask,
  // unchanged, and the only thing the gap table renders) and the ratified
  // compact `display_label` the composed surfaces render.
  type AskTag = {
    readonly ask_class?: string;
    readonly display_label?: string;
    readonly scope_op?: string;
    readonly ask_parts?: readonly { readonly ask_class: string; readonly display_label: string }[];
  };
  type Raw = {
    field: string;
    dimensions: string;
    provision: string;
    enables: string;
    ask_class?: string;
    display_label?: string;
    scope_op?: string;
  };
  const raw: Raw[] = [];
  let dropped_empty = 0;

  const push = (field: string, dimensions: string, provision: string, enables: string, tag?: AskTag) => {
    const d = str(dimensions);
    const fld = str(field);
    if (!d || !fld) { dropped_empty += 1; return; }
    const base = { field: fld, dimensions: d, provision: str(provision), enables };
    const parts = tag?.ask_parts ?? [];
    if (parts.length > 0) {
      // The compound ask keeps ONE gap-table row (identical `dimensions`);
      // each unmet part is its own labeled entry for the composed surfaces.
      for (const part of parts) {
        raw.push({
          ...base,
          ask_class: part.ask_class,
          display_label: part.display_label,
          ...(tag?.scope_op ? { scope_op: tag.scope_op } : {}),
        });
      }
      return;
    }
    raw.push({
      ...base,
      ...(tag?.ask_class ? { ask_class: tag.ask_class } : {}),
      ...(tag?.display_label ? { display_label: tag.display_label } : {}),
      ...(tag?.scope_op ? { scope_op: tag.scope_op } : {}),
    });
  };

  for (const f of deliverables.necessity_findings) {
    if (f.information_needed === undefined) continue;
    push(
      f.purpose_stated ? GAP_FIELD_ALTERNATIVES : GAP_FIELD_PURPOSE,
      str(f.information_needed),
      f.citation,
      `the necessity finding for ${quotedOp(f.operation_label)}`,
      f,
    );
  }

  for (const f of deliverables.proportionality) {
    if (f.information_needed === undefined) continue;
    push(
      GAP_FIELD_NECPROP,
      str(f.information_needed),
      f.citation,
      `the proportionality finding for ${quotedOp(f.operation_label)}`,
      f,
    );
  }

  for (const f of deliverables.legal_basis) {
    if (f.information_needed === undefined) continue;
    push(
      legalBasisGapField(f),
      str(f.information_needed),
      f.citation,
      // PROMPT 9A (R2) — the QUOTED operation label, never purpose text.
      `the lawful-basis finding for ${quotedOp(f.operation_label ?? "")}`,
      f,
    );
  }

  for (const r of deliverables.risk_register) {
    if (r.information_needed === undefined) continue;
    push(
      GAP_FIELD_SAFEGUARDS,
      str(r.information_needed),
      r.citation,
      `the remaining risk level for ${r.risk_label}`,
      r,
    );
  }

  // PROMPT 6 — processing-inventory asks join the same aggregation.
  const inv = deliverables.processing_inventory;
  if (inv) {
    for (const c of inv.controllers) {
      if (c.information_needed === undefined) continue;
      push("dpo_info", str(c.information_needed), "GDPR Art. 37",
        `the controller record for ${c.name || "the controller"}`, c);
    }
    for (const p of inv.processors) {
      if (p.information_needed === undefined) continue;
      push("processor_obligations", str(p.information_needed), "GDPR Art. 28",
        `the processor record for ${p.name}`, p);
    }
    for (const d of inv.data_items) {
      if (d.information_needed === undefined) continue;
      push("article_9_condition", str(d.information_needed), "GDPR Art. 9(2)",
        `the special-category entry for ${d.item}`, d);
    }
  }

  // PROMPT 7 — Section-2 coverage asks join the same aggregation. Rows that
  // carry no ask (intra-EEA processing, adequacy, "no transfer on the record",
  // recorded safeguards) contribute nothing — an abstention only reaches the
  // ledger when it names a fact that would resolve it.
  const s2c = deliverables.section2_coverage;
  if (s2c) {
    const s2push = (
      field: string,
      r: { information_needed?: string; citation?: string } & AskTag,
      enables: string,
    ) => {
      if (r.information_needed === undefined) return;
      push(field, str(r.information_needed), str(r.citation), enables, r);
    };
    for (const r of s2c.special_category_conditions) {
      s2push("article_9_condition", r, `the special-category condition for ${r.item}`);
    }
    for (const r of s2c.transfers) {
      s2push("transfer_flows", r, `the transfer determination for ${r.destination || "the flow recorded"}`);
    }
    s2push("existing_safeguards", s2c.processor_contract, "the Art. 28 processing-contract determination");
    for (const r of s2c.data_minimisation_retention) {
      s2push("retention_period", r, `the retention determination for ${r.item}`);
    }
    for (const r of s2c.measures_dpbd) {
      s2push("dp_by_design_measures", r, "the data-protection-by-design coverage row");
    }
    for (const r of s2c.measures_security) {
      s2push("existing_safeguards", r, "the security-measures coverage table");
    }
    for (const r of s2c.data_quality) {
      s2push("data_quality_measures", r, "the accuracy coverage row");
    }
    for (const r of s2c.measures_article5) {
      s2push("data_minimisation_justification", r, "a principle-by-principle Art. 5 coverage table");
    }
    for (const r of s2c.measures_rights) {
      s2push("data_subject_rights_mechanisms", r, "a right-by-right coverage table");
    }
  }

  const a36 = deliverables.art36_consultation;
  if (a36.information_needed !== undefined) {
    push(
      GAP_FIELD_RESIDUAL,
      str(a36.information_needed),
      a36.citation,
      "the prior-consultation determination",
      a36,
    );
  }

  // Decision blockers are the same asks aggregated; they carry no field of
  // their own, so they are only admitted where they match an ask already
  // collected above. Anything unmatched is counted, never improvised.
  let dropped_unmapped = 0;
  for (const b of deliverables.decision.blockers) {
    const t = str(b);
    if (!t) { dropped_empty += 1; continue; }
    // PROMPT 9A — blockers are compact labels; they map onto an ask by either
    // form (the label they were resolved from, or the full ask text).
    const mapped = raw.some((r) =>
      gapOverlap(r.dimensions, t) >= 0.6 ||
      (r.display_label !== undefined && gapOverlap(r.display_label, t) >= 0.6)
    );
    if (!mapped) dropped_unmapped += 1;
  }

  // Deduplicate by normalized dimensions text (mergeOpenGapItems style).
  const out: DpiaGapLedgerEntry[] = [];
  let merged = 0;
  for (const e of raw) {
    const hitIdx = out.findIndex((o) =>
      gapOverlap(o.dimensions, e.dimensions) >= 0.6 &&
      // Decomposed parts share the compound ask byte-for-byte but are distinct
      // labeled entries; everything else merges exactly as it did before 9A.
      !(o.dimensions === e.dimensions && (o.ask_class ?? "") !== (e.ask_class ?? ""))
    );
    if (hitIdx >= 0) {
      merged += 1;
      const hit = out[hitIdx];
      // Most specific phrasing wins; provision/enables are preserved.
      const winner = e.dimensions.length > hit.dimensions.length ? e : hit;
      out[hitIdx] = {
        field: hit.field,
        dimensions: winner.dimensions,
        provision: hit.provision || e.provision,
        enables: hit.enables.toLowerCase() === e.enables.toLowerCase()
          ? hit.enables
          : `${hit.enables} and ${e.enables}`,
        ...(winner.ask_class ? { ask_class: winner.ask_class } : {}),
        ...(winner.display_label ? { display_label: winner.display_label } : {}),
        ...(hit.scope_op || e.scope_op ? { scope_op: hit.scope_op || e.scope_op } : {}),
      };
      continue;
    }
    out.push({ ...e });
  }

  return { gap_ledger: out, dropped_empty, dropped_unmapped, merged };
}

export function buildGapLedger(
  intake: unknown,
  deliverables: Parameters<typeof buildGapLedgerDetailed>[1],
): DpiaGapLedgerEntry[] {
  return buildGapLedgerDetailed(intake, deliverables).gap_ledger;
}

// ---------------------------------------------------------------------
// PROMPT 4 — risk-count reconciliation.
// ---------------------------------------------------------------------
const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

/** Explicit count of remaining risks stated in the residual_risks narrative. */
/**
 * PROMPT 8E item 4 (CEO-ratified 2026-08-12) — hardened extraction.
 *
 * Evidence: run 8996eafc doc 4 read "UK GDPR Art. 37" as a stated count of 37.
 * (a) a digit preceded by Art./Article/§/Section/Recital (whitespace allowed,
 *     and surviving the sentence splitter's break after "Art.") is a pinpoint,
 *     never a count; digits inside a larger token (dates, "37(1)") likewise;
 * (b) where the narrative enumerates its risks ("1. … 2. … 3. …"), the count of
 *     enumerated items is preferred over any in-sentence number;
 * (c) the plausibility bound lives in buildRiskCountNote.
 */
const CITATION_PREFIX = /(?:art(?:icle)?\.?|§+|section|recital)\s*$/i;

function enumeratedItemCount(text: string): number | null {
  const seen = new Set<number>();
  for (const m of text.matchAll(/(?:^|\n|\s)(\d{1,2})[.)]\s+(?=\S)/g)) {
    seen.add(Number(m[1]));
  }
  let n = 0;
  while (seen.has(n + 1)) n++;
  return n >= 2 ? n : null;
}

export function statedResidualRiskCount(narrative: unknown): number | null {
  const text = str(narrative);
  if (!text) return null;

  const enumerated = enumeratedItemCount(text);
  if (enumerated !== null) return enumerated;

  // Split on sentence ends, but never on the full stop inside "Art." / "art."
  const sentences = text.split(/(?<![Aa]rt|[Nn]o|[Ss]ec)(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    if (!/\brisks?\b/i.test(sentence)) continue;
    const word = sentence.match(
      /\b(one|two|three|four|five|six|seven|eight|nine|ten)\b(?=[^.!?]*\brisks?\b)/i,
    );
    if (word) return NUMBER_WORDS[word[1].toLowerCase()];
    for (const m of sentence.matchAll(/(\d{1,2})/g)) {
      const idx = m.index ?? 0;
      const before = sentence.slice(0, idx);
      const after = sentence.slice(idx + m[1].length);
      // part of a larger token (dates, "37(1)", "2026-08", "v1.0")
      if (/[\w./\-]$/.test(before) || /^[\w./\-(]/.test(after)) continue;
      if (CITATION_PREFIX.test(before)) continue;
      if (!/^[^.!?]*\brisks?\b/i.test(after)) continue;
      const n = Number(m[1]);
      if (n > 0) return n;
    }
  }
  return null;
}

export function buildRiskCountNote(
  intake: unknown,
  register: readonly RiskRegisterEntry[],
): DpiaRiskCountNote | undefined {
  const stated_count = statedResidualRiskCount(get(intake, "residual_risks"));
  if (stated_count === null) return undefined;
  const register_count = register.length;
  if (stated_count === register_count) return undefined;
  // ITEM 4(c) — plausibility bound. An extraction that dwarfs the register is
  // very likely a misread pinpoint; say nothing rather than reconcile nonsense.
  if (register_count > 0 && stated_count > register_count * 3) return undefined;
  // PROMPT 8E item 1 — CEO-ratified 8D bytes. No lead-in sentence: the
  // canonical executive sentence already states the count and this note renders
  // immediately after it. Flag 3 variant carries the reversed case.
  const note = stated_count < register_count
    ? `The company self-identified ${nWord(stated_count)} of these risks; this assessment surfaces ${
      nWord(register_count - stated_count)
    } more. The company's own account is recorded in its own words in Section 6 below.`
    : `The company self-identified ${nWord(stated_count)} risks in its own account; this assessment carries ${
      nWord(register_count)
    } after consolidation, and the company's own account is recorded in its own words in Section 6 below.`;
  return {
    register_count,
    stated_count,
    note,
  };
}

// ---------------------------------------------------------------------
// Envelope + attach
// ---------------------------------------------------------------------
export function buildDpiaDeliverables(intake: unknown): DpiaDeliverables {
  const risk_register = buildRiskRegister(intake);
  const core = {
    necessity_findings: buildNecessityFindings(intake),
    proportionality: buildProportionality(intake),
    risk_register,
    art36_consultation: buildArt36Consultation(intake, risk_register),
    legal_basis: buildLegalBasis(intake),
  };
  const decision = buildDecision(intake, core);
  const processing_inventory = buildProcessingInventory(intake);
  const section2_coverage = buildSection2Coverage(intake, { processing_inventory });
  const withDecision = { ...core, decision, processing_inventory, section2_coverage };
  const risk_count_note = buildRiskCountNote(intake, risk_register);
  return {
    ...withDecision,
    gap_ledger: buildGapLedger(intake, withDecision),
    ...(risk_count_note ? { risk_count_note } : {}),
  };
}

/**
 * PROMPT 5B (2026-08-11) — COUNT INTEGRITY.
 *
 * ROOT CAUSE: `risk_count_note` is built inside `buildDpiaDeliverables` from
 * the register as first built, but the CSC check C3
 * (`c3_secondary_use_predicate`, _shared/ltp/dpia-csc.ts) REMOVES register rows
 * whose predicate rests on secondary uses the record denies, and it runs after
 * the attach. Run 24de247c therefore persisted register_count = 4 against a
 * 3-row register.
 *
 * FIX: reconcile the note against the FINAL persisted register, after every
 * pass that may prune rows. Recomputes the note from `report.risk_register` and
 * drops it entirely when the counts now agree. Pure apart from the two keys it
 * writes; fail-open.
 */
export function reconcileRiskCountNote(
  report: Record<string, unknown>,
  intake: unknown,
): Record<string, unknown> {
  try {
    const register = Array.isArray(report.risk_register)
      ? (report.risk_register as RiskRegisterEntry[])
      : [];
    const before = (report.risk_count_note as DpiaRiskCountNote | undefined)?.register_count ?? null;
    const rebuilt = buildRiskCountNote(intake, register);
    if (rebuilt) report.risk_count_note = rebuilt;
    else delete report.risk_count_note;
    return {
      ok: true,
      register_count: register.length,
      note_register_count_before: before,
      note_present: rebuilt ? 1 : 0,
      diverged: before !== null && before !== register.length,
    };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? String(e) };
  }
}




export function attachDpiaDeliverables(
  report: Record<string, unknown>,
  intake: unknown,
  opts?: { unitsMinimal?: boolean },
): Record<string, unknown> {
  try {
    const built = buildDpiaDeliverables(intake);
    const ledger = buildGapLedgerDetailed(intake, built);
    report.necessity_findings = built.necessity_findings;
    report.proportionality = built.proportionality;
    report.risk_register = built.risk_register;
    report.art36_consultation = built.art36_consultation;

    // PILOT 2026-08-11 — single writer for legal basis. The deterministic
    // findings become the surface, and the model-authored
    // section_2_analysis.legal_basis blob is superseded by them so the
    // skeleton reads one composed argument, not two.
    report.legal_basis = built.legal_basis;

    // PROMPT 3 (2026-08-11) — deterministic sign-off decision. Single writer
    // for report.decision; the u5 section_6_conclusion.decision string is now
    // a fallback for documents generated before this change.
    report.decision = built.decision;

    // PROMPT 4 (2026-08-11) — deterministic gap ledger. Single writer for
    // report.gap_ledger; the bracket-tag-harvested information_needed array
    // remains for documents generated before this change.
    report.gap_ledger = built.gap_ledger;

    // PROMPT 6 (2026-08-11) — deterministic processing inventory. Single
    // writer for report.processing_inventory. Nothing renders it yet.
    report.processing_inventory = built.processing_inventory;

    // PROMPT 7 (2026-08-11) — deterministic Section-2 coverage. Single writer
    // for report.section2_coverage. Nothing renders it yet.
    report.section2_coverage = built.section2_coverage;
    if (built.risk_count_note) report.risk_count_note = built.risk_count_note;

    // PROMPT 10 (2026-08-12) — with u1/u5 retired there is no model author for
    // dpia_metadata, framework_disclaimer, section_5_interested_parties or
    // section_6_conclusion. Build them deterministically. Inert when the flag
    // is off: pre-existing unit output is left exactly as the model wrote it.
    let minimalUnits: Record<string, unknown> | null = null;
    if (opts?.unitsMinimal) {
      minimalUnits = attachMinimalUnitSurfaces(report, intake, built.decision);
    }
    const s2 = report.section_2_analysis;
    if (s2 && typeof s2 === "object") {
      (s2 as Record<string, unknown>).legal_basis = built.legal_basis.map((f) => ({
        purpose: f.purpose,
        article_6_basis: f.article_6_basis,
        justification: f.justification,
        status: f.status,
        ...(f.information_needed ? { information_needed: f.information_needed } : {}),
      }));
    }

    return {
      version: DPIA_DELIVERABLES_VERSION,
      ok: true,
      operations: built.necessity_findings.length,
      necessity_insufficient: built.necessity_findings.filter((n) => n.status === "record_insufficient").length,
      proportionality_insufficient: built.proportionality.filter((p) => p.status === "record_insufficient").length,
      risks: built.risk_register.length,
      risks_high_residual: built.risk_register.filter((r) => r.residual_band === "high").length,
      art36: built.art36_consultation.determination,
      decision: built.decision.determination,
      legal_basis: built.legal_basis.length,
      legal_basis_insufficient: built.legal_basis.filter((b) => b.status === "record_insufficient").length,
      separation_repairs: built.art36_consultation.separation_repairs,
      ...(minimalUnits ? { minimal_units: minimalUnits } : {}),
      gap_ledger_entries: ledger.gap_ledger.length,
      gap_ledger_dropped_empty: ledger.dropped_empty,
      gap_ledger_dropped_unmapped: ledger.dropped_unmapped,
      gap_ledger_merged: ledger.merged,
      risk_count_note: built.risk_count_note ? 1 : 0,
      inventory_processors: built.processing_inventory.processors.length,
      inventory_data_items: built.processing_inventory.data_items.length,
      inventory_purposes: built.processing_inventory.purposes.length,
      inventory_insufficient:
        built.processing_inventory.controllers.filter((c) => c.status === "record_insufficient").length +
        built.processing_inventory.processors.filter((p) => p.status === "record_insufficient").length +
        built.processing_inventory.data_items.filter((d) => d.status === "record_insufficient").length,
    };
  } catch (e) {
    return {
      version: DPIA_DELIVERABLES_VERSION,
      ok: false,
      error: (e as Error)?.message ?? String(e),
    };
  }
}

// ── PROMPT 9 (2026-08-12) — DETERMINISTIC ENFORCEMENT ANNOTATIONS ─────
// u4's annotations[] (a model-selected enforcement_action_id plus a freeform
// relevance sentence) retires with u4. This builder replaces it: every link
// is an OBSERVED overlap between a corpus row's own columns and a register
// row, and the relevance sentence is a fixed template over the corpus row's
// own summary field, verbatim. No model call. No invented relevance.
// A precedent with no overlap is carried WITHOUT an annotation.

/** Category themes read off the corpus row's own columns. */
const ENFORCEMENT_CATEGORY_THEMES: readonly {
  readonly key: string;
  readonly label: string;
  readonly risk_id: RegExp;
  readonly matchesPrecedent: (p: Record<string, unknown>) => boolean;
}[] = [
  {
    key: "special_category",
    label: "special-category personal data",
    risk_id: /special_category/i,
    matchesPrecedent: (p) =>
      p.biometric_related === true ||
      arrHas(p.data_categories, /health|medical|biometric|genetic|racial|religio|sexual|special/i) ||
      arrHas(p.violation_types, /special.?categor|article.?9\b|sensitive/i),
  },
  {
    key: "children",
    label: "children's personal data",
    risk_id: /children/i,
    matchesPrecedent: (p) =>
      arrHas(p.data_categories, /child|minor|under.?18|age/i) ||
      arrHas(p.violation_types, /child|minor|age.?verification/i),
  },
  {
    key: "transfer",
    label: "international transfers of personal data",
    risk_id: /transfer|third_country/i,
    matchesPrecedent: (p) =>
      arrHas(p.violation_types, /transfer|third.?count|chapter.?v|schrems|adequacy/i) ||
      arrHas(p.provisions_normalized, /:(44|45|46|47|48|49)$/) ||
      arrHas(p.statutory_provisions, /article.?(44|45|46|49)\b/i),
  },
  {
    key: "security",
    label: "the security of processing",
    risk_id: /unauthorised_access|security|breach/i,
    matchesPrecedent: (p) =>
      p.breach_related === true ||
      arrHas(p.violation_types, /security|breach|confidential|integrity/i) ||
      arrHas(p.provisions_normalized, /:(32|33|34)$/) ||
      arrHas(p.statutory_provisions, /article.?(32|33|34)\b/i),
  },
];

function arrHas(v: unknown, re: RegExp): boolean {
  if (Array.isArray(v)) return v.some((x) => typeof x === "string" && re.test(x));
  if (typeof v === "string") return re.test(v);
  return false;
}

/** Article numbers named by a register row's citation, e.g. "Art. 32 GDPR" → ["32"]. */
function citationArticleNumbers(citation: unknown): string[] {
  if (typeof citation !== "string") return [];
  const out: string[] = [];
  const re = /\bArt(?:icle)?\.?\s*(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(citation)) !== null) out.push(m[1]);
  return out;
}

/** Article numbers named by a corpus row's own provision columns. */
function precedentArticleNumbers(p: Record<string, unknown>): string[] {
  const out: string[] = [];
  const push = (s: unknown) => {
    if (typeof s !== "string") return;
    const re = /(?:^|[:\s])(?:art(?:icle)?\.?\s*)?(\d{1,3})(?:\(|\b)/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) out.push(m[1]);
  };
  const cols = [p.provisions_normalized, p.statutory_provisions];
  for (const c of cols) {
    if (Array.isArray(c)) c.forEach(push);
    else push(c);
  }
  return out;
}

/** The corpus row's own summary field, verbatim. Absent → no annotation. */
function precedentSummary(p: Record<string, unknown>): string {
  for (const k of ["key_compliance_failure", "violation", "subject"]) {
    const v = p[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function precedentId(p: Record<string, unknown>): string {
  const v = p.id;
  return typeof v === "string" && v.trim() ? v.trim() : (typeof v === "number" ? String(v) : "");
}

export function buildEnforcementAnnotations(
  precedents: unknown,
  risk_register: unknown,
): DpiaEnforcementAnnotation[] {
  const rows: Record<string, unknown>[] = Array.isArray(precedents)
    ? precedents.filter((p): p is Record<string, unknown> => !!p && typeof p === "object")
    : [];
  const register: RiskRegisterEntry[] = Array.isArray(risk_register)
    ? (risk_register as RiskRegisterEntry[]).filter((r) => !!r && typeof r === "object")
    : [];
  if (rows.length === 0 || register.length === 0) return [];

  const out: DpiaEnforcementAnnotation[] = [];
  for (const p of rows) {
    const id = precedentId(p);
    const summary = precedentSummary(p);
    if (!id || !summary) continue; // listed, never force-matched

    let hit: { risk: RiskRegisterEntry; type: DpiaEnforcementMatchType; label: string } | null = null;

    // 1. Provision overlap — the precedent's own provisions vs the risk row's citation.
    const pArts = new Set(precedentArticleNumbers(p));
    if (pArts.size > 0) {
      for (const r of register) {
        const shared = citationArticleNumbers(r.citation).find((n) => pArts.has(n));
        if (shared) {
          hit = { risk: r, type: "provision", label: `Article ${shared}` };
          break;
        }
      }
    }

    // 2. Category overlap — corpus themes vs the register row's risk_id.
    if (!hit) {
      for (const theme of ENFORCEMENT_CATEGORY_THEMES) {
        if (!theme.matchesPrecedent(p)) continue;
        const r = register.find((x) => theme.risk_id.test(String(x.risk_id ?? "")));
        if (r) {
          hit = { risk: r, type: "category", label: theme.label };
          break;
        }
      }
    }

    if (!hit) continue; // no overlap → carried without an annotation

    out.push({
      enforcement_action_id: id,
      risk_id: String(hit.risk.risk_id ?? ""),
      risk_label: String(hit.risk.risk_label ?? ""),
      match_type: hit.type,
      match_label: hit.label,
      relevance:
        `This action concerned ${summary}; it bears on ${hit.risk.risk_label} because both involve ${hit.label}.`,
      precedent_significance:
        typeof p.precedent_significance === "number" ? p.precedent_significance : null,
      rule_id: "dpia_enforcement_annotations_v1",
    });
  }
  return out;
}

/**
 * PROMPT 9 — single writer for report.enforcement_annotations. Reads the
 * precedents already attached to the report by the shared-context stage
 * (the corpus fetch is untouched by unit retirement) and the FINAL register.
 */
export function attachEnforcementAnnotations(
  report: Record<string, unknown>,
): { attached: number; precedents: number } {
  const precedents = Array.isArray(report.enforcement_precedents) ? report.enforcement_precedents : [];
  const annotations = buildEnforcementAnnotations(precedents, report.risk_register);
  report.enforcement_annotations = annotations;
  return { attached: annotations.length, precedents: precedents.length };
}
