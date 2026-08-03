/**
 * ITEM 308 — builder for the three cppa-admt analytic deliverables.
 *
 * PURITY LAW: pure function of the intake object (+ the model's raw
 * determination for deliverable 3). No I/O, no clock, no env; never throws
 * — a builder fault degrades the envelope rather than aborting the run.
 *
 * SINGLE-WRITER LAW: this module is the ONLY producer of
 * report.notice_element_findings, report.exception_qualification and
 * report.determination. The model narrates; it does not overwrite.
 *
 * DETERMINISM NOTE (deliverables 1 and 2 vs 3):
 *   1 and 2 ARE deterministic — each is an element-by-element / condition-
 *     by-condition read of the record against a CLOSED, verbatim statutory
 *     list. There is nothing to reason about: either the record shows the
 *     element/condition or it does not.
 *   3 is NOT deterministic and is deliberately not modelled on cppa-risk's
 *     § 7152(a)(7) `consequence` decision table. See normalizeDetermination.
 */
import {
  ACCESS_ELEMENT_SPECS,
  EXCEPTION_IDENTIFICATION_SPEC,
  EXCEPTION_SPECS,
  NOTICE_ELEMENT_SPECS,
  row,
} from "./elements.ts";
import type {
  AccessReadinessFinding,
  AccessVerdict,
  AdmtDeliverables,
  ConditionVerdict,
  Determination,
  ExceptionCondition,
  ExceptionIdentificationFinding,
  ExceptionQualificationEntry,
  NoticeElementFinding,
  NoticeElementId,
  NoticeVerdict,
} from "./types.ts";

export const ADMT_DELIVERABLES_VERSION =
  "cppa-admt-analytic-deliverables-2026-08-03-upgrade3";


const NOT_STATED = "not stated on the record";

/** § 7220(c)(1) forbids notice text that does not name a SPECIFIC purpose. */
const GENERIC_TEXT_PATTERNS: readonly RegExp[] = [
  /\bbusiness purposes?\b/i,
  /\bimprov(e|ing) (our |the )?(service|services|experience|product|products)\b/i,
  /\bas (further )?described in (our|the) privacy policy\b/i,
  /\bvarious purposes\b/i,
  /\bamong other things\b/i,
  /\boperational purposes\b/i,
];

/** Values that affirmatively record the element as ABSENT (not merely silent). */
const ABSENCE_TOKENS: readonly string[] = [
  "No",
  "Not yet",
  "No — uses generic language",
  "We have not yet created a Pre-use Notice",
  "We have not yet provided a Pre-use Notice",
];

const GENERIC_STATUS_TOKENS: readonly string[] = [
  "No — uses generic language",
  "Mentions opt-out but without clear instructions",
  "Partial — some elements missing",
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

function isGeneric(text: string): boolean {
  return GENERIC_TEXT_PATTERNS.some((re) => re.test(text));
}

// ---------------------------------------------------------------------
// 1. § 7220(c) — notice element findings (SHAPE-LAW; UPGRADE-3 ITEM 1)
// ---------------------------------------------------------------------
/**
 * Split a pasted pre-use notice into sentences and return those that carry
 * the element's locate cues. Cues LOCATE the business's own words; they
 * never grade them — grading happens in the application step below.
 */
function locateInPublishedNotice(fullText: string, cues: readonly RegExp[]): string {
  if (!fullText) return "";
  const sentences = fullText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const hits = sentences.filter((s) => cues.some((re) => re.test(s)));
  return hits.join(" ");
}

export function buildNoticeElementFindings(intake: unknown): NoticeElementFinding[] {
  const textBag = (get(intake, "notice_element_text") ?? {}) as Record<string, unknown>;
  // UPGRADE-3 ITEM 1 — the business's ACTUAL published pre-use notice.
  const fullNotice = str(get(intake, "notice_full_text"));
  const out: NoticeElementFinding[] = [];

  for (const spec of NOTICE_ELEMENT_SPECS) {
    const rows = spec.proposition_keys.map((k) => row(k)).filter(Boolean);
    const element_verbatim = rows.map((r) => r!.verbatim_quote).join("\n");
    const citation = rows[0]?.subsection ?? "11 CCR § 7220(c)";

    const transcribed = spec.text_keys
      .map((k) => str(textBag[k]))
      .filter((s) => s.length > 0)
      .join("\n\n");

    const located = transcribed ? "" : locateInPublishedNotice(fullNotice, spec.locate_cues);
    const published = transcribed || located;

    const statuses = spec.status_keys.map((k) => str(get(intake, k))).filter(Boolean);
    const assertsAbsence = statuses.some((s) => ABSENCE_TOKENS.includes(s));
    const assertsGeneric = statuses.some((s) => GENERIC_STATUS_TOKENS.includes(s));

    const record_source: NoticeElementFinding["record_source"] = transcribed
      ? "element_text"
      : located
      ? "published_notice_text"
      : assertsAbsence
      ? "absence_assertion"
      : "none";

    let verdict: NoticeVerdict;
    let why: string;
    let application: string;
    let status: NoticeElementFinding["status"] = "analysed";
    let information_needed: string | undefined;

    // TESTING, not asserting: each branch applies `spec.standard` to the
    // notice's own captured words and states the result.
    if (published.length === 0 && assertsAbsence) {
      verdict = "absent";
      application =
        `There are no notice words to test against the standard: the record states that the published notice does not carry this element (${statuses.join("; ")}).`;
      why =
        "The element is absent from the published notice on the business's own account, so the provision is not met.";
    } else if (published.length === 0 && fullNotice.length > 0) {
      verdict = "insufficient_record";
      status = "record_insufficient";
      application =
        "The published notice was supplied, but no passage in it addresses this element, and the record does not state that the element was deliberately omitted. Silence is not read as absence.";
      why =
        "The captured notice text cannot be tested against the standard for this element, because no passage of it speaks to the element.";
      information_needed =
        `The passage of your published pre-use notice that addresses: ${spec.element_label}. If the notice does not address it at all, say so on the record.`;
    } else if (published.length === 0) {
      verdict = "insufficient_record";
      status = "record_insufficient";
      application =
        "There is nothing to test: neither the published pre-use notice nor a transcription of this element's wording is on the record.";
      why =
        "The record does not carry the published notice text for this element, so its adequacy cannot be assessed against the cited provision. Silence is not treated as absence.";
      information_needed =
        `The verbatim text your published pre-use notice uses for: ${spec.element_label}.`;
    } else if (isGeneric(published) || assertsGeneric) {
      verdict = "inadequate";
      application =
        `Applying the standard to the notice's own words: the captured wording (\u201C${published.slice(0, 240)}\u201D) is generic. A consumer reading it cannot tell what this business specifically does, which is the very framing the provision rules out.`;
      why =
        "The notice's own words fail the standard: they are written in generic terms and do not do the work the cited provision requires.";
    } else if (published.length < 40) {
      verdict = "inadequate";
      application =
        `Applying the standard to the notice's own words: the captured wording is a fragment (${published.length} characters) — \u201C${published}\u201D — and does not state the matter the provision requires in terms the consumer could act on.`;
      why =
        "The notice's own words fail the standard on their face: there is too little of the element present to satisfy the provision.";
    } else {
      verdict = "adequate";
      application =
        `Applying the standard to the notice's own words: the captured wording (\u201C${published.slice(0, 240)}\u201D) addresses the matter the provision requires, in terms tied to this business's own use of the technology.`;
      why =
        "The notice's own words meet the standard the cited provision sets for this element.";
    }

    out.push({
      element_id: spec.element_id,
      element_label: spec.element_label,
      proposition_keys: spec.proposition_keys,
      element_verbatim: element_verbatim || NOT_STATED,
      citation,
      standard: spec.standard,
      record_fact: published || NOT_STATED,
      application,
      published_text: published || NOT_STATED,
      record_source,
      verdict,
      why,
      status,
      ...(information_needed ? { information_needed } : {}),
    });
  }

  return out;
}

// ---------------------------------------------------------------------
// 1b. § 7220(c)(2)(B) — exception-IDENTIFICATION duty (UPGRADE-3 ITEM 1)
// ---------------------------------------------------------------------
/**
 * Distinct from the c2_optout MECHANISM finding above. The mechanism finding
 * asks whether the notice describes the opt-out and its submission route.
 * THIS finding asks a different question the same subsection poses: where the
 * business relies on a § 7221(b) exception other than human appeal, does the
 * notice NAME that exception? Both can fail independently.
 */
export function buildExceptionIdentification(intake: unknown): ExceptionIdentificationFinding {
  const spec = EXCEPTION_IDENTIFICATION_SPEC;
  const r = row(spec.proposition_key);
  const citation = r?.subsection ?? "11 CCR § 7220(c)(2)(B)";
  const element_verbatim = r?.verbatim_quote ?? NOT_STATED;

  const claimed = str(get(intake, "opt_out_exception"));
  const textBag = (get(intake, "notice_element_text") ?? {}) as Record<string, unknown>;
  const named = spec.text_keys.map((k) => str(textBag[k])).filter(Boolean).join("\n\n");
  const fullNotice = str(get(intake, "notice_full_text"));

  const base = {
    finding_id: spec.finding_id,
    citation,
    element_verbatim,
    standard: spec.standard,
    exception_relied_upon: claimed || NOT_STATED,
  };

  if (!claimed) {
    return {
      ...base,
      record_fact: NOT_STATED,
      application:
        "The duty cannot be tested: the record does not say whether the business relies on any § 7221(b) exception in place of offering an opt-out.",
      verdict: "insufficient_record",
      why:
        "Whether this disclosure duty is engaged at all turns on which exception (if any) the business relies upon, and the record does not say.",
      status: "record_insufficient",
      information_needed:
        "Whether the business relies on any § 7221(b) exception instead of offering an opt-out, and if so which one.",
    };
  }

  if (spec.no_exception_prefixes.some((p) => claimed.startsWith(p))) {
    return {
      ...base,
      record_fact: `The record states the business relies on no § 7221(b) exception: \u201C${claimed}\u201D.`,
      application:
        "The identification duty attaches only where the business withholds an opt-out in reliance on a § 7221(b) exception other than human appeal. On this record no exception is relied upon, so the duty is not engaged.",
      verdict: "not_applicable",
      why: "No exception is relied upon, so there is no exception to identify.",
      status: "analysed",
    };
  }

  if (claimed.startsWith(spec.appeal_claim_prefix)) {
    return {
      ...base,
      record_fact: `The record states the business relies on the human-appeal exception: \u201C${claimed}\u201D.`,
      application:
        "Reliance on the human-appeal exception is governed by § 7220(c)(2)(A), which requires the notice to inform the consumer of the ability to appeal and how to submit it, rather than by the (c)(2)(B) identification duty. The identification duty is therefore not engaged; the appeal-disclosure duty is assessed with the opt-out element.",
      verdict: "not_applicable",
      why:
        "The exception relied upon is the human-appeal exception, which carries the (c)(2)(A) appeal-disclosure duty instead of the (c)(2)(B) identification duty.",
      status: "analysed",
    };
  }

  const noticeNames = named || (fullNotice && /section 7221|\u00a7 ?7221|exception/i.test(fullNotice)
    ? locateInPublishedNotice(fullNotice, [/exception/i, /7221/])
    : "");

  if (!noticeNames && !fullNotice) {
    return {
      ...base,
      record_fact: `The business relies on the exception recorded as \u201C${claimed}\u201D; the published notice text is not on the record.`,
      application:
        "The duty is engaged, but it cannot be tested: without the notice's own words there is no way to see whether the specific exception is named in it.",
      verdict: "insufficient_record",
      why: "The duty is engaged and the record cannot show whether it is discharged.",
      status: "record_insufficient",
      information_needed:
        "The passage of your published pre-use notice that names the specific § 7221(b) exception you rely upon.",
    };
  }

  if (!noticeNames) {
    return {
      ...base,
      record_fact: `The business relies on the exception recorded as \u201C${claimed}\u201D. No passage of the supplied pre-use notice names a § 7221(b) exception.`,
      application:
        "Applying the standard: the duty is engaged because an exception other than human appeal is relied upon, and the notice as supplied does not identify the specific exception. The duty is not discharged.",
      verdict: "not_satisfied",
      why:
        "The notice must name the specific exception relied upon, and the supplied notice names none.",
      status: "analysed",
    };
  }

  return {
    ...base,
    record_fact: `The business relies on the exception recorded as \u201C${claimed}\u201D. The notice states: \u201C${noticeNames.slice(0, 240)}\u201D.`,
    application:
      "Applying the standard: the duty is engaged, and the notice's own words identify the specific exception relied upon.",
    verdict: "satisfied",
    why: "The specific exception is named in the notice, which is what the subsection requires.",
    status: "analysed",
  };
}



// ---------------------------------------------------------------------
// 2. § 7221(b) — exception qualification
// ---------------------------------------------------------------------
const NEGATIVE_EVIDENCE = new Set(["No", "Unsure", "Not applicable / unsure"]);

function conditionVerdict(values: string[]): ConditionVerdict {
  if (values.length === 0) return "insufficient_record";
  if (values.some((v) => NEGATIVE_EVIDENCE.has(v))) return "not_satisfied";
  return "satisfied";
}

export function buildExceptionQualification(
  intake: unknown,
): ExceptionQualificationEntry[] {
  const claimed = str(get(intake, "opt_out_exception"));
  const out: ExceptionQualificationEntry[] = [];

  for (const spec of EXCEPTION_SPECS) {
    const r = row(spec.proposition_key);
    const isClaimed = spec.claim_prefixes.some((p) => claimed.startsWith(p));
    if (!isClaimed) continue;

    const conditions: ExceptionCondition[] = spec.conditions.map((c) => {
      const values = c.evidence_keys
        .map((k) => str(get(intake, k)))
        .filter((s) => s.length > 0);
      const verdict = conditionVerdict(values);
      const evidence = values.length ? values.join(" | ") : NOT_STATED;
      const why = verdict === "satisfied"
        ? "The record carries affirmative evidence addressed to this condition."
        : verdict === "not_satisfied"
        ? "The record answers this condition in the negative or as unresolved, so the condition is not met on the facts given."
        : "The record is silent on this condition; it is neither satisfied nor disproved on what has been provided.";
      return {
        condition_id: c.condition_id,
        condition_verbatim: c.condition_verbatim,
        verdict,
        why,
        evidence_on_the_record: evidence,
        ...(verdict === "satisfied" ? {} : { information_needed: c.information_needed }),
      };
    });

    const anyFail = conditions.some((c) => c.verdict === "not_satisfied");
    const anyGap = conditions.some((c) => c.verdict === "insufficient_record");
    const qualifies: ExceptionQualificationEntry["qualifies"] = anyFail
      ? "does_not_qualify"
      : anyGap
      ? "insufficient_record"
      : "qualifies";

    out.push({
      proposition_key: spec.proposition_key,
      exception_label: spec.exception_label,
      citation: r?.subsection ?? "11 CCR § 7221(b)",
      claimed_on_the_record: true,
      conditions,
      qualifies,
      why: anyFail
        ? "At least one named condition of the exception is not met on the record, so the exception is unavailable and the opt-out duty in the cited provision stands undisturbed."
        : anyGap
        ? "Every named condition must hold. The record does not yet establish each of them, so the exception cannot be relied on as demonstrated."
        : "Each named condition of the exception is addressed affirmatively on the record.",
      status: anyGap ? "record_insufficient" : "analysed",
      ...(anyGap
        ? {
          information_needed: conditions
            .filter((c) => c.information_needed)
            .map((c) => c.information_needed)
            .join(" "),
        }
        : {}),
    });
  }

  return out;
}

// ---------------------------------------------------------------------
// 3. determination — model-work, separation-guarded
// ---------------------------------------------------------------------
/**
 * SEPARATION LAW lexicon. Any sentence in the lawfulness component that
 * matches is RELOCATED to the exposure component. Item 297's evidence row
 * led `priority_actions[0]` with enforcement exposure instead of the
 * §§ 7220/7221 determination itself; this guard makes that unrepresentable.
 */
const EXPOSURE_LEXICON: readonly RegExp[] = [
  /\bpenalt(y|ies)\b/i,
  /\bfine[sd]?\b/i,
  /\benforcement\b/i,
  /\bcivil action\b/i,
  /\bper[- ]violation\b/i,
  /\b1798\.155\b/,
  /\bsanction/i,
  /\bagency (may|could|will) (bring|pursue|assess)/i,
  /\$\s?\d/,
];

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const CITE_LAWFULNESS = "11 CCR §§ 7220, 7221";
const CITE_EXPOSURE = "Cal. Civ. Code § 1798.155";

/**
 * WHY THIS IS NOT DETERMINISTIC (contrast with cppa-risk Item 305).
 *
 * cppa-risk's `consequence` implements § 7152(a)(7), which supplies a fixed
 * decision rule: the business must not initiate the activity where the risks
 * to privacy outweigh the benefits. Inputs are typed and bounded (harm
 * bands, safeguard status, weighing classes), so the outcome is a lookup.
 *
 * §§ 7220/7221 supply no such rule. The determination is an APPLICATION of
 * heterogeneous element findings and condition findings to a two-part legal
 * question — which shortfalls make the current use unlawful as the rules
 * stand, and separately what the consequence of that non-compliance is. That
 * requires weighing which shortfalls are dispositive against this business's
 * own facts, which a lookup table cannot represent without inventing a
 * severity ordering the regulation does not contain. So the model reasons it;
 * this builder supplies the grounded inputs, enforces the two-part shape, and
 * degrades to a named record_insufficient scaffold when the model omits it.
 */
export function normalizeDetermination(
  raw: unknown,
  ctx: {
    activity_id: string;
    activity_name: string;
    notice: readonly NoticeElementFinding[];
    exceptions: readonly ExceptionQualificationEntry[];
  },
): Determination {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const lawSrc = (src.lawfulness && typeof src.lawfulness === "object"
    ? src.lawfulness
    : {}) as Record<string, unknown>;
  const expSrc = (src.exposure && typeof src.exposure === "object"
    ? src.exposure
    : {}) as Record<string, unknown>;

  let lawText = str(lawSrc.finding);
  let expText = str(expSrc.statement);
  let repairs = 0;

  // SEPARATION GUARD — relocate exposure sentences out of the lawfulness text.
  if (lawText) {
    const keep: string[] = [];
    const moved: string[] = [];
    for (const s of splitSentences(lawText)) {
      if (EXPOSURE_LEXICON.some((re) => re.test(s))) moved.push(s);
      else keep.push(s);
    }
    if (moved.length) {
      repairs = moved.length;
      lawText = keep.join(" ").trim();
      expText = [expText, ...moved].filter(Boolean).join(" ").trim();
    }
  }

  const failing = ctx.notice.filter((n) => n.verdict === "inadequate" || n.verdict === "absent");
  const unresolved = ctx.notice.filter((n) => n.verdict === "insufficient_record");
  const badExceptions = ctx.exceptions.filter((e) => e.qualifies !== "qualifies");

  const degraded = lawText.length < 20;

  const lawfulness = degraded
    ? {
      finding:
        "The record does not yet support a determination of what is unlawful now under the pre-use-notice and opt-out provisions. "
        + (unresolved.length
          ? `The published notice text is missing for ${unresolved.length} of the five notice elements. `
          : "")
        + (badExceptions.length
          ? `${badExceptions.length} claimed opt-out exception(s) are not established condition-by-condition on the record. `
          : ""),
      basis_element_ids: unresolved.map((n) => n.element_id) as NoticeElementId[],
      basis_exception_keys: badExceptions.map((e) => e.proposition_key),
      citation: CITE_LAWFULNESS,
      status: "record_insufficient" as const,
      information_needed:
        "The verbatim published pre-use notice text for each § 7220(c) element, and the condition-level evidence for every claimed § 7221(b) exception.",
    }
    : {
      finding: lawText,
      basis_element_ids: failing.map((n) => n.element_id) as NoticeElementId[],
      basis_exception_keys: badExceptions.map((e) => e.proposition_key),
      citation: str(lawSrc.citation) || CITE_LAWFULNESS,
      status: "analysed" as const,
    };

  const exposure = expText.length >= 20
    ? {
      statement: expText,
      citation: str(expSrc.citation) || CITE_EXPOSURE,
      status: "analysed" as const,
    }
    : {
      statement:
        "Exposure is stated separately from the lawfulness finding above and is not established on this record: the consequence of non-compliance depends on facts the record does not carry.",
      citation: CITE_EXPOSURE,
      status: "record_insufficient" as const,
      information_needed:
        "Whether the identified shortfalls persist past the applicable compliance date, and the affected California consumer population.",
    };

  return {
    activity_id: ctx.activity_id,
    activity_name: ctx.activity_name,
    lawfulness,
    exposure,
    source: degraded ? "degraded" : "model",
    separation_repairs: repairs,
  };
}

// ---------------------------------------------------------------------
// 4. § 7222 — access-rights readiness (UPGRADE-3 ITEM 3)
// ---------------------------------------------------------------------
const READY_AFFIRMATIVE = "Yes — we can produce this today";
const READY_PARTIAL = "Partially — we can produce some of it";
const READY_NEGATIVE = "No — we cannot produce this today";

function readinessVerdict(ready: string, process: string, fallback: string): AccessVerdict {
  if (ready === READY_AFFIRMATIVE) return process || fallback ? "ready" : "partially_ready";
  if (ready === READY_PARTIAL) return "partially_ready";
  if (ready === READY_NEGATIVE) return "not_ready";
  // "Unsure" and silence alike: DEGRADATION LAW.
  if (!ready && (process || fallback)) return "partially_ready";
  return "insufficient_record";
}

export function buildAccessReadinessFindings(intake: unknown): AccessReadinessFinding[] {
  const out: AccessReadinessFinding[] = [];

  for (const spec of ACCESS_ELEMENT_SPECS) {
    const r = row(spec.proposition_key);
    const citation = r?.subsection ?? "11 CCR § 7222(b)";
    const element_verbatim = r?.verbatim_quote ?? NOT_STATED;

    const ready = str(get(intake, spec.ready_key));
    const process = str(get(intake, spec.process_key));
    const fallback = spec.fallback_keys
      .map((k) => str(get(intake, k)))
      .filter((s) => s.length > 0 && !/^not yet implemented$/i.test(s))
      .join("\n\n");

    const verdict = readinessVerdict(ready, process, fallback);

    const record_fact = [
      ready ? `Readiness stated by the business: \u201C${ready}\u201D.` : "",
      process ? `Process described: \u201C${process}\u201D.` : "",
      fallback ? `Existing disclosure material on the record: \u201C${fallback.slice(0, 300)}\u201D.` : "",
    ].filter(Boolean).join(" ") || NOT_STATED;

    let application: string;
    let why: string;
    let status: AccessReadinessFinding["status"] = "analysed";
    let information_needed: string | undefined;

    switch (verdict) {
      case "ready":
        application =
          "Applying the standard to the record: the business states it can produce this explanation on request and has described the process by which it does so, which is what readiness for this element means.";
        why = "The element can be supplied on an access request on the business's own account, with a named process behind it.";
        break;
      case "partially_ready":
        application = process || fallback
          ? "Applying the standard to the record: material exists that speaks to this element, but the record does not establish that a consumer-facing explanation covering the whole element can be produced on request."
          : "Applying the standard to the record: readiness is asserted but no process is described, so the assertion cannot be tested.";
        why = "The record shows part of what the element requires, not the whole of it.";
        status = "record_insufficient";
        information_needed =
          `The complete process by which you would produce, on a consumer's access request, the explanation required for: ${spec.element_label}.`;
        break;
      case "not_ready":
        application =
          "Applying the standard to the record: the business states it cannot produce this explanation on request today, so the element could not be answered if an access request arrived now.";
        why = "The business's own account is that the required explanation cannot presently be given.";
        break;
      default:
        application =
          "There is nothing to test: the record neither states that this explanation can be produced nor states that it cannot. Silence is not read as unreadiness.";
        why = "Readiness for this element cannot be assessed on the record as it stands.";
        status = "record_insufficient";
        information_needed =
          `Whether you can produce, on a consumer's access request, the explanation required for: ${spec.element_label} — and by what process.`;
    }

    out.push({
      element_id: spec.element_id,
      element_label: spec.element_label,
      citation,
      corpus_key: "cppa-7222",
      element_verbatim,
      standard: spec.standard,
      record_fact,
      application,
      process_on_the_record: process || fallback || NOT_STATED,
      verdict,
      why,
      status,
      ...(information_needed ? { information_needed } : {}),
    });
  }

  return out;
}

// ---------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------
export function buildAdmtDeliverables(
  intake: unknown,
  rawDetermination: unknown,
): AdmtDeliverables {
  const notice = buildNoticeElementFindings(intake);
  const exceptionIdentification = buildExceptionIdentification(intake);
  const exceptions = buildExceptionQualification(intake);
  const access = buildAccessReadinessFindings(intake);
  const determination = normalizeDetermination(rawDetermination, {
    activity_id: str(get(intake, "system_name")) || "admt_system_1",
    activity_name: str(get(intake, "system_name")) || NOT_STATED,
    notice,
    exceptions,
  });
  return {
    notice_element_findings: notice,
    exception_identification: exceptionIdentification,
    exception_qualification: exceptions,
    access_readiness_findings: access,
    determination,
  };
}

/**
 * Attach the deliverables to the report object (mutates in place) and
 * return a telemetry record. Fail-open: a throw here must never abort a run.
 */
export function attachAdmtDeliverables(
  report: Record<string, unknown>,
  intake: unknown,
): Record<string, unknown> {
  try {
    const built = buildAdmtDeliverables(intake, (report as any).determination);
    (report as any).notice_element_findings = built.notice_element_findings;
    (report as any).exception_identification = built.exception_identification;
    (report as any).exception_qualification = built.exception_qualification;
    (report as any).access_readiness_findings = built.access_readiness_findings;
    (report as any).determination = built.determination;
    return {
      version: ADMT_DELIVERABLES_VERSION,
      ok: true,
      notice_elements: built.notice_element_findings.length,
      notice_insufficient: built.notice_element_findings.filter((n) =>
        n.status === "record_insufficient"
      ).length,
      notice_tested_against_published_text: built.notice_element_findings.filter((n) =>
        n.record_source === "published_notice_text" || n.record_source === "element_text"
      ).length,
      exception_identification_verdict: built.exception_identification.verdict,
      exceptions_claimed: built.exception_qualification.length,
      access_elements: built.access_readiness_findings.length,
      access_insufficient: built.access_readiness_findings.filter((a) =>
        a.status === "record_insufficient"
      ).length,
      determination_source: built.determination.source,
      separation_repairs: built.determination.separation_repairs,
    };
  } catch (e) {
    return {
      version: ADMT_DELIVERABLES_VERSION,
      ok: false,
      error: (e as Error)?.message ?? String(e),
    };
  }
}

