/**
 * L1 PRE-LANDING (2026-08-26) — the ePrivacy short-circuit gate.
 *
 * RATIFIED RULE (doc 58 §2; doc 62 §5 "B5 LIA" ruling — the ONE
 * MUST-implement logic item ahead of L1 freezing surfaces; the rule text
 * below is the CAM's own queue_ref, verbatim in substance):
 *
 *   "where Article 5(3) ePrivacy Directive requires consent for the
 *    processing (e.g. cookies/terminal-equipment access, unsolicited
 *    electronic messages), legitimate interests under Article 6(1)(f)
 *    GDPR CANNOT substitute for that consent, however the balancing test
 *    would otherwise resolve. L1 must encode this as a hard gate on
 *    factor 11, evaluated before or independent of the balancing
 *    computation, not as a balancing input."
 *
 * This module IS that hard gate: a pure function of the intake record,
 * evaluated with no input from — and no effect routed through — the
 * balancing computation. L1's deterministic three-part test consumes
 * `li_foreclosed_for_covered_processing` as a gate, never as a weight.
 *
 * PURITY LAW: pure function of the record object. No I/O, no clock, no
 * env; never throws. Matches build.ts / precedent-class.ts conventions.
 *
 * SINGLE-WRITER LAW: this module is the ONLY producer of
 * report.eprivacy_short_circuit (attached via attachLiaDeliverables).
 *
 * DETERMINISM: trigger detection runs closed lexicons over the two intake
 * fields that DEFINE the assessed processing (processing_description,
 * stated_purpose — both required "always" by the contract) plus the
 * shared deterministic use-case classifier. No model output is read.
 *
 * INTAKE GAP (PN-L6, decision queue "Open — LIA", filed 2026-08-26): the
 * intake contract has NO field recording whether the processing involves
 * cookies/terminal-equipment access or electronic direct marketing. Until
 * the CEO rules on the proposed field, this gate works only from what the
 * record's own free text states, and it is conservative in one direction
 * ONLY: `consent_requirement_engaged` fires solely on unmistakable
 * recorded triggers; anything indicated but unresolved (including the
 * strictly-necessary cookie exemption and the existing-customer
 * "soft opt-in" question, neither of which this gate ever adjudicates)
 * degrades to `undetermined_on_the_record` with a specific
 * information_needed. A record whose description carries no indication of
 * ePrivacy-covered activity determines `not_engaged_on_the_record` —
 * bound to the record as the application text states, re-run if the facts
 * are otherwise.
 *
 * RENDER-READINESS (doc 48 §II.6) + RATIFICATION GATE: this finding is
 * computed and persisted on every run (telemetry + audit), but NO
 * renderer may splice any of its prose into skeleton_document until
 * LIA_EPRIVACY_GATE_RATIFIED flips — the sentences authored here are
 * DRAFTS proposed to the CEO in PN-L6, exactly the
 * LIA_PRECEDENT_CLASS_RATIFIED pattern (precedent-classes.ts). No
 * skeleton wiring exists yet at all; the flag is declared now so the
 * later wiring has its gate waiting.
 *
 * AUTHORITY: the standard is the CAM row lia/f11-eprivacy/fcl-01's
 * pinned excerpt (EDPB Guidelines 1/2024, verified live 2026-08-25,
 * snapshot-pinned by cam-pins.test.ts) — never re-typed here. NOTE for
 * ratification: the corpus holds NO ePrivacy Directive provision text
 * (no provision_texts row for Art. 5(3)/Art. 13), so no draft below
 * quotes the Directive itself; a registry anchor must be ingested before
 * any pinpoint citation to the Directive can ratify (flagged in PN-L6).
 */
import { LIA_CORPUS_MAP } from "../../corpus/maps/lia-corpus-map.ts";
import { classifyLiaUseCase, USE_CASE_LABELS } from "../../../../_shared/lia/lia-use-case-classifier.ts";
import type { EprivacyShortCircuitFinding, EprivacyTriggerBasis } from "./types.ts";

export const LIA_EPRIVACY_GATE_VERSION = "lia-eprivacy-gate-2026-08-26-v1";

/**
 * RATIFICATION GATE (PN-L6). Flipped TRUE 2026-08-26 under the CEO's
 * delegated ratification ("complete LIA Conversion … I defer to your
 * recommendations"): the finding's prose, and the PN-L6(c) rule sentence
 * (LIA_EPRIVACY_RULE_SENTENCE, three-part-test-typed.ts), are ratified
 * bytes. Rendering happens ONLY on the deterministic path (the typed
 * engine's outcome override carries the rule into the document); the
 * legacy model path remains byte-untouched.
 */
export const LIA_EPRIVACY_GATE_RATIFIED = true;

/** The CAM row this gate implements (lia-corpus-map.ts, logic-bearing FC). */
export const EPRIVACY_CAM_ROW_ID = "lia/f11-eprivacy/fcl-01";

const CAM_ROW = LIA_CORPUS_MAP.rows.find((r) => r.id === EPRIVACY_CAM_ROW_ID);

/**
 * Trigger lexicons — deliberately NARROW. A phrase belongs here only when
 * its presence in a processing description is an unmistakable statement of
 * ePrivacy-covered activity. Widening any list is a logic change to a
 * CEO-ratified gate: file it, do not slip it in.
 */
export const TERMINAL_EQUIPMENT_TRIGGERS: readonly RegExp[] = [
  /\bcookies?\b/i,
  /\btracking pixels?\b/i,
  /\bweb beacons?\b/i,
  /\b(?:device|browser) fingerprint\w*/i,
  /\bterminal equipment\b/i,
];

export const UNSOLICITED_MESSAGE_TRIGGERS: readonly RegExp[] = [
  /\bunsolicited (?:commercial |electronic |marketing )?(?:e-?mails?|messages?|communications?|marketing|texts?|sms)\b/i,
  /\bcold (?:e-?mails?|e-?mailing|outreach)\b/i,
];

/**
 * Electronic-direct-marketing indications: activity the ePrivacy rules
 * COVER, where whether the consent requirement APPLIES is not resolved on
 * the record (e.g. the existing-customer question). Indication, never
 * engagement.
 */
export const ELECTRONIC_MARKETING_INDICATORS: readonly RegExp[] = [
  /\be-?mail marketing\b/i,
  /\bmarketing (?:e-?mails?|messages?|texts?|sms)\b/i,
  /\b(?:sms|text|push)(?:-| )(?:marketing|campaigns?)\b/i,
  /\bnewsletters?\b/i,
  /\belectronic direct marketing\b/i,
];

/**
 * Strictly-necessary qualifier: where the record itself invokes the
 * Art. 5(3) strict-necessity exemption territory, the gate does not
 * adjudicate the exemption — it degrades to undetermined.
 */
export const STRICTLY_NECESSARY_QUALIFIER: readonly RegExp[] = [
  /\bstrictly necessary\b/i,
  /\bessential cookies?\b/i,
];

/** Use-case classes whose activity typically operates through ePrivacy-covered
 * channels; class membership alone is an INDICATION, never an engagement. */
const EPRIVACY_ADJACENT_CLASSES: readonly string[] = [
  "behavioral_advertising",
  "direct_marketing",
];

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function get(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function collectHits(text: string, res: readonly RegExp[]): string[] {
  const out: string[] = [];
  for (const re of res) {
    const m = re.exec(text);
    if (m && m[0]) out.push(m[0]);
  }
  return out;
}

function anyMatch(text: string, res: readonly RegExp[]): boolean {
  return res.some((re) => re.test(text));
}

/**
 * The ratified B5 rule, stated as one sentence. DRAFT customer prose
 * (PN-L6): a light grammatical normalisation of the doc 62 §5 ruling
 * text; dark until LIA_EPRIVACY_GATE_RATIFIED.
 */
const RULE_SENTENCE =
  "Where Article 5(3) of the ePrivacy Directive requires consent for the processing — for example cookies or other access to terminal equipment, or unsolicited electronic messages — legitimate interests under Article 6(1)(f) GDPR cannot substitute for that consent, however the balancing test would otherwise resolve.";

// DOC 161 (2026-09-03, audit A.5) — the UK twin: on a UK-only record the
// consent requirement arises under PECR, which gives effect to Article 5(3),
// and the basis foreclosed is Article 6(1)(f) UK GDPR. Ratification queue R10.
const RULE_SENTENCE_UK =
  "Where regulation 6 of the Privacy and Electronic Communications (EC Directive) Regulations 2003, which gives effect to Article 5(3) of the ePrivacy Directive, requires consent for the processing — for example cookies or other access to terminal equipment — or regulation 22 requires consent for unsolicited electronic marketing messages, legitimate interests under Article 6(1)(f) UK GDPR cannot substitute for that consent, however the balancing test would otherwise resolve.";

const quoteList = (phrases: readonly string[]): string =>
  phrases.map((p) => `"${p}"`).join(", ");

export function buildEprivacyShortCircuit(intake: unknown): EprivacyShortCircuitFinding {
  const standard = CAM_ROW?.pinned_excerpt ?? "";
  const standard_citation = CAM_ROW ? "EDPB Guidelines 1/2024" : "";
  const description = str(get(intake, "processing_description"));
  const statedPurpose = str(get(intake, "stated_purpose"));
  const scan = `${description} ${statedPurpose}`.trim();
  const jurisdictions = (Array.isArray(get(intake, "jurisdictions")) ? get(intake, "jurisdictions") as unknown[] : []).map((j) => str(j));
  const ukOnly = jurisdictions.includes("United Kingdom (UK GDPR)") && !jurisdictions.includes("EU (GDPR)");
  const ruleSentence = ukOnly ? RULE_SENTENCE_UK : RULE_SENTENCE;

  const common = {
    standard,
    standard_citation,
    supporting_citation: standard_citation,
    supporting_verbatim: standard,
    corpus_row_id: EPRIVACY_CAM_ROW_ID,
  };

  // ── No description at all: the fact the gate runs on is absent. ──────
  if (!scan) {
    return {
      ...common,
      record_fact: "The record does not describe the processing this gate is evaluated against.",
      application:
        "Whether the ePrivacy consent requirement forecloses legitimate interests cannot be evaluated without a description of the processing activity.",
      determination: "undetermined_on_the_record",
      li_foreclosed_for_covered_processing: false,
      trigger_basis: "none_recorded",
      trigger_phrases: [],
      indication_unresolved: false,
      status: "record_insufficient",
      information_needed:
        "processing_description — what is done, over what channels and technologies, so the ePrivacy gate can be evaluated. A dedicated intake field for ePrivacy-covered activity (cookies/terminal-equipment access; electronic direct marketing and its recipients) is separately proposed in the decision queue (PN-L6).",
    };
  }

  const terminalHits = collectHits(scan, TERMINAL_EQUIPMENT_TRIGGERS);
  const unsolicitedHits = collectHits(scan, UNSOLICITED_MESSAGE_TRIGGERS);
  const marketingIndications = collectHits(scan, ELECTRONIC_MARKETING_INDICATORS);
  const strictlyNecessary = anyMatch(scan, STRICTLY_NECESSARY_QUALIFIER);
  const useCaseClass = classifyLiaUseCase(description);

  const terminalEngaged = terminalHits.length > 0 && !strictlyNecessary;
  const unsolicitedEngaged = unsolicitedHits.length > 0;

  // ── Hard gate engaged: an unmistakable recorded trigger. ─────────────
  if (terminalEngaged || unsolicitedEngaged) {
    const basis: EprivacyTriggerBasis = terminalEngaged
      ? "terminal_equipment_access"
      : "unsolicited_electronic_messages";
    const phrases = [...new Set([...(terminalEngaged ? terminalHits : []), ...unsolicitedHits])];
    const covered = terminalEngaged
      ? "storing information, or gaining access to information already stored, in users' terminal equipment"
      : "unsolicited electronic messages";
    return {
      ...common,
      record_fact:
        `The record's description of the processing includes ${quoteList(phrases)}, which describes ${covered}.`,
      application:
        `${ruleSentence} The processing as recorded involves ${covered}, so for that covered processing legitimate interests is not an available basis and the consent the ePrivacy rules themselves require is the route to lawfulness. This gate is evaluated independently of the balancing test and is not moved by its outcome.`,
      determination: "consent_requirement_engaged",
      li_foreclosed_for_covered_processing: true,
      trigger_basis: basis,
      trigger_phrases: phrases,
      indication_unresolved: false,
      status: "analysed",
    };
  }

  // ── Indicated but unresolved: degrade, never adjudicate. ─────────────
  const classIndicated = EPRIVACY_ADJACENT_CLASSES.includes(useCaseClass);
  const strictlyNecessaryUnresolved = terminalHits.length > 0 && strictlyNecessary;
  if (strictlyNecessaryUnresolved || marketingIndications.length > 0 || classIndicated) {
    const indicationPhrases = [
      ...new Set([...terminalHits, ...marketingIndications]),
    ];
    const indicationText = indicationPhrases.length > 0
      ? `includes ${quoteList(indicationPhrases)}`
      : `is classified as ${(USE_CASE_LABELS[useCaseClass] ?? USE_CASE_LABELS.other).toLowerCase()}`;
    return {
      ...common,
      record_fact:
        `The record's description of the processing ${indicationText}, activity of a kind the ePrivacy consent rules can cover, but it does not resolve whether the consent requirement applies to this processing.`,
      application:
        `${ruleSentence} The description is consistent with ePrivacy-covered activity, but the facts that decide whether the consent requirement applies here are not recorded — for example whether any terminal-equipment access is limited to what is strictly necessary for a service the individual has requested, what channels any direct marketing uses, and to whom such messages are sent. The gate is therefore open rather than resolved either way, and the determination above is stated subject to it.`,
      determination: "undetermined_on_the_record",
      li_foreclosed_for_covered_processing: false,
      trigger_basis: "none_recorded",
      trigger_phrases: indicationPhrases,
      indication_unresolved: true,
      status: "record_insufficient",
      information_needed:
        "whether the processing stores or reads information on users' devices (cookies or similar technologies) beyond what is strictly necessary for a service the individual has requested, and whether it involves electronic messages to individuals and on what basis recipients receive them. No intake field currently records this; a dedicated field is proposed in the decision queue (PN-L6).",
    };
  }

  // ── No recorded indication: not engaged, bound to the record. ────────
  return {
    ...common,
    record_fact:
      "The record's description of the processing does not include cookies or other terminal-equipment access, and does not include electronic direct marketing or other electronic messages to individuals.",
    application:
      "The processing as the record describes it does not involve storing or reading information on users' terminal equipment or sending unsolicited electronic messages, so the ePrivacy consent requirement is not engaged by the processing as described and legitimate interests is not foreclosed by it. The determination is bound to that description: if the processing in fact uses cookies or similar technologies, or sends electronic marketing messages, this gate must be re-run.",
    determination: "not_engaged_on_the_record",
    li_foreclosed_for_covered_processing: false,
    trigger_basis: "none_recorded",
    trigger_phrases: [],
    indication_unresolved: false,
    status: "analysed",
  };
}
