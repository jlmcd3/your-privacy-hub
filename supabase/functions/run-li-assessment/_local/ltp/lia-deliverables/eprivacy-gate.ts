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
 * DETERMINISM: the gate reads, in this order, (1) the company's own answers
 * to the two device-access questions (purpose_details.device_access and
 * purpose_details.device_access_strictly_necessary — DOC 189, 2026-09-05,
 * the PN-L6 resolution; CEO-approved wording, an explicit exception to the
 * fleet-redesign "no new intake" rule), then (2) closed lexicons over the two
 * intake fields that DEFINE the assessed processing (processing_description,
 * stated_purpose) plus the shared deterministic use-case classifier. No model
 * output is read.
 *
 * ANSWER-FIRST LAW (doc 189 §1.4): an explicit answer outranks the lexicons
 * on the terminal-equipment limb. "No" resolves that limb not engaged on the
 * company's statement; "Yes" + "goes further" engages the hard gate; "Yes" +
 * "all strictly necessary" records the exemption CLAIM (a new determination,
 * `exemption_claimed_on_the_record` — LI is not foreclosed, the determination
 * is stated subject to the claim, and this assessment never verifies it);
 * "Yes" + "Not sure" and "Not sure" alone stay undetermined with a narrower
 * information_needed. A "No" beside a description that itself names cookies,
 * pixels, beacons or fingerprinting is a record CONTRADICTION: undetermined,
 * both facts stated, never a silent override in either direction. Unanswered
 * (legacy records, the harness) keeps the lexicon behaviour byte-for-byte.
 * The unsolicited-messages limb is untouched by the answers — it is a
 * different question (the optional marketing pair is listed in doc 189 §1.4).
 *
 * The lexicon path is conservative in one direction ONLY:
 * `consent_requirement_engaged` fires solely on unmistakable recorded
 * triggers; anything indicated but unresolved (including the strictly-
 * necessary cookie exemption and the existing-customer "soft opt-in"
 * question, neither of which this gate ever adjudicates) degrades to
 * `undetermined_on_the_record` with a specific information_needed. A record
 * whose description carries no indication of ePrivacy-covered activity
 * determines `not_engaged_on_the_record` — bound to the record as the
 * application text states, re-run if the facts are otherwise.
 *
 * RENDER-READINESS (doc 48 §II.6) + RATIFICATION GATE: the finding's prose
 * is ratified (LIA_EPRIVACY_GATE_RATIFIED, below) and reaches the document
 * ONLY through the typed engine's outcome override (three-part-test-typed.ts)
 * and the engagement map's R_EPRIVACY_PECR entry — the skeleton assembler
 * never reads this finding directly (pinned by eprivacy-gate.test.ts).
 *
 * AUTHORITY: the standard is the CAM row lia/f11-eprivacy/fcl-01's
 * pinned excerpt (EDPB Guidelines 1/2024, verified live 2026-08-25,
 * snapshot-pinned by cam-pins.test.ts) — never re-typed here. NOTE for
 * ratification: the corpus holds NO ePrivacy Directive provision text
 * (no provision_texts row for Art. 5(3)/Art. 13), so no sentence below
 * quotes the Directive itself; a registry anchor must be ingested before
 * any pinpoint citation to the Directive can ratify.
 */
import { LIA_CORPUS_MAP } from "../../corpus/maps/lia-corpus-map.ts";
import { classifyLiaUseCase, USE_CASE_LABELS } from "../../../../_shared/lia/lia-use-case-classifier.ts";
import type { EprivacyGateDetermination, EprivacyShortCircuitFinding, EprivacyTriggerBasis } from "./types.ts";

export const LIA_EPRIVACY_GATE_VERSION = "lia-eprivacy-gate-2026-09-05-v2-device-access-question";

/**
 * RATIFICATION GATE (PN-L6). Flipped TRUE 2026-08-26 under the CEO's
 * delegated ratification ("complete LIA Conversion … I defer to your
 * recommendations"): the finding's prose, and the PN-L6(c) rule sentence
 * (LIA_EPRIVACY_RULE_SENTENCE, three-part-test-typed.ts), are ratified
 * bytes. Rendering happens ONLY on the deterministic path (the typed
 * engine's outcome override carries the rule into the document); the
 * legacy model path remains byte-untouched. DOC 189 (2026-09-05): the
 * answer-first sentences below were approved with doc 189 §1.4.
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
  /\bterminal equipment\b/i,
];

/**
 * Batch 4ed05f22 (2026-09-05), CEO-ratified lexicon move: "device/browser
 * fingerprint" is COVERED activity (the EDPB's Guidelines 2/2023 on Art. 5(3)
 * treat active fingerprinting as gaining access to terminal equipment; the ICO
 * said the same in December 2024) but the phrase alone does not establish
 * that CONSENT is required — a fingerprint used for account-security fraud
 * detection sits in the strictly-necessary-for-a-requested-service territory
 * the gate never adjudicates. The Velorix run flipped a three-limbs-met LIA to
 * "Not Available" on this word alone. It now routes to the indicated-but-
 * unresolved branch: determination stated subject to the gate, with the
 * strictly-necessary question asked. Cookies/pixels/beacons stay conclusive.
 * DOC 189: the device-access questions are the direct route out of this
 * branch — the company answers the question the lexicon could only raise.
 */
export const DEVICE_ACCESS_INDICATORS: readonly RegExp[] = [
  /\b(?:device|browser) fingerprint\w*/i,
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

// DOC 189 — the two questions' option strings (verbatim copies of the
// intake contract's DEVICE_ACCESS_OPTS / DEVICE_ACCESS_NECESSITY_OPTS; the
// contract test pins the parity). Matching is exact after trim.
export const DEVICE_ACCESS_YES = "Yes";
export const DEVICE_ACCESS_NO = "No";
export const DEVICE_ACCESS_NOT_SURE = "Not sure";
export const DEVICE_ACCESS_NECESSARY_YES = "Yes — all of it is strictly necessary";
export const DEVICE_ACCESS_NECESSARY_NO = "No — some or all of it goes further";
export const DEVICE_ACCESS_NECESSARY_NOT_SURE = "Not sure";

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
 * The ratified B5 rule, stated as one sentence (PN-L6(c), ratified
 * 2026-08-26; byte-identical to LIA_EPRIVACY_RULE_SENTENCE).
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

// DOC 189 §1.4 — the company's-own-statement sentences (approved wording).
const STATEMENT_NO_DEVICE_ACCESS =
  "The company states that the processing does not store information on, or read information from, individuals' devices.";
const STATEMENT_DEVICE_ACCESS_GOES_FURTHER =
  "The company states that the processing stores information on, or reads information from, individuals' devices, and that this access goes beyond what is strictly necessary to provide a service the individual has requested.";
const STATEMENT_DEVICE_ACCESS_STRICTLY_NECESSARY =
  "The company states that the processing stores information on, or reads information from, individuals' devices, and that the device access is limited to what is strictly necessary for a service the individual has requested.";
const STATEMENT_DEVICE_ACCESS_NECESSITY_NOT_SURE =
  "The company states that the processing stores information on, or reads information from, individuals' devices, but has not resolved whether that access is limited to what is strictly necessary for a service the individual has requested.";
const STATEMENT_DEVICE_ACCESS_NOT_SURE =
  "The company has answered that it is not sure whether the processing stores information on, or reads information from, individuals' devices.";

const INFORMATION_NEEDED_NECESSITY_ONLY =
  "whether every storage of information on, or read of information from, individuals' devices that this processing involves is strictly necessary to provide a service the individual has asked for (keeping someone signed in, remembering a basket, protecting their account), or whether any of it serves analytics, advertising, personalisation or audience measurement — the second device-access question on the intake.";
const INFORMATION_NEEDED_DEVICE_ACCESS =
  "whether the processing stores information on, or reads information from, people's phones, computers or browsers (cookies, pixels and web beacons, SDK or advertising identifiers, device or browser fingerprinting) — the device-access question on the intake — and, if it does, whether all of that access is strictly necessary to provide a service the individual has asked for.";
const INFORMATION_NEEDED_MESSAGING =
  "whether the processing involves electronic messages to individuals (e-mail, SMS, push) and on what basis recipients receive them — in particular whether they are existing customers being contacted about similar products or services.";

/** The terminal-equipment limb as resolved by the two answers, if answered. */
interface DeviceLeg {
  readonly kind: "engaged" | "exemption_claimed" | "not_engaged" | "unresolved";
  readonly statement: string;
  readonly information_needed?: string;
}

function readDeviceLeg(q1: string, q2: string): DeviceLeg | null {
  if (q1 === DEVICE_ACCESS_NO) {
    return { kind: "not_engaged", statement: STATEMENT_NO_DEVICE_ACCESS };
  }
  if (q1 === DEVICE_ACCESS_NOT_SURE) {
    return {
      kind: "unresolved",
      statement: STATEMENT_DEVICE_ACCESS_NOT_SURE,
      information_needed: INFORMATION_NEEDED_DEVICE_ACCESS,
    };
  }
  if (q1 === DEVICE_ACCESS_YES) {
    if (q2 === DEVICE_ACCESS_NECESSARY_NO) {
      return { kind: "engaged", statement: STATEMENT_DEVICE_ACCESS_GOES_FURTHER };
    }
    if (q2 === DEVICE_ACCESS_NECESSARY_YES) {
      return { kind: "exemption_claimed", statement: STATEMENT_DEVICE_ACCESS_STRICTLY_NECESSARY };
    }
    return {
      kind: "unresolved",
      statement: STATEMENT_DEVICE_ACCESS_NECESSITY_NOT_SURE,
      information_needed: INFORMATION_NEEDED_NECESSITY_ONLY,
    };
  }
  return null;
}

export function buildEprivacyShortCircuit(intake: unknown): EprivacyShortCircuitFinding {
  const standard = CAM_ROW?.pinned_excerpt ?? "";
  const standard_citation = CAM_ROW ? "EDPB Guidelines 1/2024" : "";
  const description = str(get(intake, "processing_description"));
  const statedPurpose = str(get(intake, "stated_purpose"));
  const scan = `${description} ${statedPurpose}`.trim();
  const jurisdictions = (Array.isArray(get(intake, "jurisdictions")) ? get(intake, "jurisdictions") as unknown[] : []).map((j) => str(j));
  const ukOnly = jurisdictions.includes("United Kingdom (UK GDPR)") && !jurisdictions.includes("EU (GDPR)");
  const ruleSentence = ukOnly ? RULE_SENTENCE_UK : RULE_SENTENCE;

  // DOC 189 — the company's own answers, read before any lexicon.
  const q1 = str(get(intake, "purpose_details.device_access"));
  const q2 = str(get(intake, "purpose_details.device_access_strictly_necessary"));
  const deviceLeg = readDeviceLeg(q1, q2);

  const common = {
    standard,
    standard_citation,
    supporting_citation: standard_citation,
    supporting_verbatim: standard,
    corpus_row_id: EPRIVACY_CAM_ROW_ID,
    device_access_recorded: q1,
    device_access_strictly_necessary_recorded: q1 === DEVICE_ACCESS_YES ? q2 : "",
  };

  // ── No description at all: the fact the gate runs on is absent. ──────
  // (The answers alone cannot carry the gate: the covered PROCESSING must be
  // described before the gate can say what it is evaluated against.)
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
        "processing_description — what is done, over what channels and technologies, so the ePrivacy gate can be evaluated, together with the two device-access questions on the intake.",
    };
  }

  const terminalHits = collectHits(scan, TERMINAL_EQUIPMENT_TRIGGERS);
  const unsolicitedHits = collectHits(scan, UNSOLICITED_MESSAGE_TRIGGERS);
  const marketingIndications = collectHits(scan, ELECTRONIC_MARKETING_INDICATORS);
  const deviceIndications = collectHits(scan, DEVICE_ACCESS_INDICATORS);
  const strictlyNecessary = anyMatch(scan, STRICTLY_NECESSARY_QUALIFIER);
  const useCaseClass = classifyLiaUseCase(description);
  const classIndicated = EPRIVACY_ADJACENT_CLASSES.includes(useCaseClass);

  const unsolicitedEngaged = unsolicitedHits.length > 0;
  const deviceLexiconHits = [...new Set([...terminalHits, ...deviceIndications])];

  // ═══ DOC 189 — ANSWER-FIRST PATH (terminal-equipment limb resolved by the
  // company's own answers; the unsolicited-messages limb keeps its lexicon). ═══
  if (deviceLeg) {
    // Contradiction: "No" beside a description that itself names device access.
    if (deviceLeg.kind === "not_engaged" && deviceLexiconHits.length > 0) {
      return {
        ...common,
        record_fact:
          `${STATEMENT_NO_DEVICE_ACCESS} The record's description of the processing, however, includes ${quoteList(deviceLexiconHits)}, which describes storing information on, or reading information from, individuals' devices. The two statements contradict each other.`,
        application:
          `${ruleSentence} The record answers the device-access question "No" while describing device access in its own words, so the facts that decide whether the consent requirement applies here are contradicted rather than recorded. The gate is therefore open rather than resolved either way, and the determination above is stated subject to it.`,
        determination: "undetermined_on_the_record",
        li_foreclosed_for_covered_processing: false,
        trigger_basis: "none_recorded",
        trigger_phrases: deviceLexiconHits,
        indication_unresolved: true,
        status: "record_insufficient",
        information_needed:
          `reconcile the device-access answer ("No") with the description's reference to ${quoteList(deviceLexiconHits)}: either the processing does store or read information on individuals' devices, in which case answer "Yes" and say whether all of that access is strictly necessary for a service the individual has asked for, or it does not, in which case remove the reference from the description.`,
      };
    }

    // Hard gate engaged on the company's own statement, or on a conclusive
    // unsolicited-messages trigger.
    if (deviceLeg.kind === "engaged" || unsolicitedEngaged) {
      const terminalEngaged = deviceLeg.kind === "engaged";
      const basis: EprivacyTriggerBasis = terminalEngaged
        ? "terminal_equipment_access"
        : "unsolicited_electronic_messages";
      const covered = terminalEngaged
        ? "storing information, or gaining access to information already stored, in users' terminal equipment"
        : "unsolicited electronic messages";
      const recordFact = terminalEngaged
        ? `${STATEMENT_DEVICE_ACCESS_GOES_FURTHER}${
          unsolicitedEngaged ? ` The record's description of the processing also includes ${quoteList(unsolicitedHits)}, which describes unsolicited electronic messages.` : ""
        }`
        : `${deviceLeg.statement} The record's description of the processing includes ${quoteList(unsolicitedHits)}, which describes unsolicited electronic messages.`;
      return {
        ...common,
        record_fact: recordFact,
        application:
          `${ruleSentence} The processing as recorded involves ${covered}, so for that covered processing legitimate interests is not an available basis and the consent the ePrivacy rules themselves require is the route to lawfulness. This gate is evaluated independently of the balancing test and is not moved by its outcome.`,
        determination: "consent_requirement_engaged",
        li_foreclosed_for_covered_processing: true,
        trigger_basis: basis,
        trigger_phrases: terminalEngaged ? [...deviceLexiconHits, ...unsolicitedHits] : [...unsolicitedHits],
        indication_unresolved: false,
        status: "analysed",
      };
    }

    // The messaging limb is unresolved by lexicon (indication or class):
    // the gate stays open on that limb whatever the device answers say, and
    // the record_fact carries both.
    const messagingOpen = marketingIndications.length > 0 || classIndicated;

    if (deviceLeg.kind === "unresolved" || messagingOpen) {
      const facts: string[] = [deviceLeg.statement];
      if (messagingOpen) {
        facts.push(
          marketingIndications.length > 0
            ? `The record's description of the processing also includes ${quoteList(marketingIndications)}, activity of a kind the ePrivacy consent rules can cover, but it does not resolve whether the consent requirement applies to those messages.`
            : `The record's description of the processing is also classified as ${(USE_CASE_LABELS[useCaseClass] ?? USE_CASE_LABELS.other).toLowerCase()}, activity of a kind the ePrivacy consent rules can cover, but it does not resolve whether any electronic messages are sent or on what basis.`,
        );
      }
      const needed: string[] = [];
      if (deviceLeg.kind === "unresolved" && deviceLeg.information_needed) needed.push(deviceLeg.information_needed);
      if (messagingOpen) needed.push(INFORMATION_NEEDED_MESSAGING);
      return {
        ...common,
        record_fact: facts.join(" "),
        application:
          `${ruleSentence} The facts that decide whether the consent requirement applies here are not fully recorded — ${
            deviceLeg.kind === "unresolved"
              ? "the company has not resolved the device-access question"
              : "the device-access question is answered"
          }${messagingOpen ? `${deviceLeg.kind === "unresolved" ? ", and" : ", but"} the channels and recipients of any electronic messages are not recorded` : ""}. The gate is therefore open rather than resolved either way, and the determination above is stated subject to it.`,
        determination: "undetermined_on_the_record",
        li_foreclosed_for_covered_processing: false,
        trigger_basis: "none_recorded",
        trigger_phrases: [...new Set([...deviceLexiconHits, ...marketingIndications])],
        indication_unresolved: true,
        status: "record_insufficient",
        information_needed: needed.join(" Also: "),
      };
    }

    // The exemption is claimed on the record: LI is not foreclosed; the
    // determination is stated subject to the claim, which is never verified.
    if (deviceLeg.kind === "exemption_claimed") {
      const determination: EprivacyGateDetermination = "exemption_claimed_on_the_record";
      return {
        ...common,
        record_fact: STATEMENT_DEVICE_ACCESS_STRICTLY_NECESSARY,
        application:
          `${ruleSentence} On the company's statement the device access falls within the strict-necessity exemption, so the consent requirement is not engaged for that access and legitimate interests is not foreclosed by it. This assessment records the statement and does not verify it: whether each storage or read is in fact strictly necessary for a service the individual has requested is a question of fact the company must be able to demonstrate, and the determination above is stated subject to it. This gate is evaluated independently of the balancing test and is not moved by its outcome.`,
        determination,
        li_foreclosed_for_covered_processing: false,
        trigger_basis: "none_recorded",
        trigger_phrases: deviceLexiconHits,
        indication_unresolved: false,
        status: "analysed",
      };
    }

    // "No", uncontradicted, nothing open on the messaging limb.
    return {
      ...common,
      record_fact:
        `${STATEMENT_NO_DEVICE_ACCESS} The record's description of the processing does not include electronic direct marketing or other electronic messages to individuals.`,
      application:
        "On the company's statement the processing does not involve storing or reading information on users' terminal equipment, and as the record describes it the processing does not involve sending unsolicited electronic messages, so the ePrivacy consent requirement is not engaged on that statement and legitimate interests is not foreclosed by it. The determination is bound to that statement and description: if the processing in fact uses cookies or similar technologies, or sends electronic marketing messages, this gate must be re-run.",
      determination: "not_engaged_on_the_record",
      li_foreclosed_for_covered_processing: false,
      trigger_basis: "none_recorded",
      trigger_phrases: [],
      indication_unresolved: false,
      status: "analysed",
    };
  }

  // ═══ LEXICON PATH (questions unanswered — legacy records, the harness). ═══
  const terminalEngaged = terminalHits.length > 0 && !strictlyNecessary;

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
  const strictlyNecessaryUnresolved = terminalHits.length > 0 && strictlyNecessary;
  if (strictlyNecessaryUnresolved || marketingIndications.length > 0 || deviceIndications.length > 0 || classIndicated) {
    const indicationPhrases = [
      ...new Set([...terminalHits, ...deviceIndications, ...marketingIndications]),
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
        `${INFORMATION_NEEDED_DEVICE_ACCESS} Also: ${INFORMATION_NEEDED_MESSAGING}`,
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
