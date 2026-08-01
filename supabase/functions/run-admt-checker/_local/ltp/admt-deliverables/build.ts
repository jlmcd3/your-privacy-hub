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
  EXCEPTION_SPECS,
  NOTICE_ELEMENT_SPECS,
  row,
} from "./elements.ts";
import type {
  AdmtDeliverables,
  ConditionVerdict,
  Determination,
  ExceptionCondition,
  ExceptionQualificationEntry,
  NoticeElementFinding,
  NoticeElementId,
  NoticeVerdict,
} from "./types.ts";

export const ADMT_DELIVERABLES_VERSION =
  "cppa-admt-analytic-deliverables-2026-07-31-item308";

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
// 1. § 7220(c) — notice element findings
// ---------------------------------------------------------------------
export function buildNoticeElementFindings(intake: unknown): NoticeElementFinding[] {
  const textBag = (get(intake, "notice_element_text") ?? {}) as Record<string, unknown>;
  const out: NoticeElementFinding[] = [];

  for (const spec of NOTICE_ELEMENT_SPECS) {
    const rows = spec.proposition_keys.map((k) => row(k)).filter(Boolean);
    const element_verbatim = rows.map((r) => r!.verbatim_quote).join("\n");
    const citation = rows[0]?.subsection ?? "11 CCR § 7220(c)";

    const published = spec.text_keys
      .map((k) => str(textBag[k]))
      .filter((s) => s.length > 0)
      .join("\n\n");

    const statuses = spec.status_keys.map((k) => str(get(intake, k))).filter(Boolean);
    const assertsAbsence = statuses.some((s) => ABSENCE_TOKENS.includes(s));
    const assertsGeneric = statuses.some((s) => GENERIC_STATUS_TOKENS.includes(s));

    let verdict: NoticeVerdict;
    let why: string;
    let status: NoticeElementFinding["status"] = "analysed";
    let information_needed: string | undefined;

    if (published.length === 0 && assertsAbsence) {
      verdict = "absent";
      why =
        `The record affirmatively states that the published pre-use notice does not carry this element (${statuses.join("; ")}), and no notice text was transcribed for it.`;
    } else if (published.length === 0) {
      verdict = "insufficient_record";
      status = "record_insufficient";
      why =
        "The record does not carry the published notice text for this element, so its adequacy cannot be assessed against the cited provision. Silence is not treated as absence.";
      information_needed =
        `The verbatim text your published pre-use notice uses for: ${spec.element_label}.`;
    } else if (isGeneric(published) || assertsGeneric) {
      verdict = "inadequate";
      why =
        "The transcribed notice text is written in generic terms and does not do the work the cited provision requires: a reader cannot tell from it what this business specifically does.";
    } else if (published.length < 40) {
      verdict = "inadequate";
      why =
        `The transcribed notice text for this element is a fragment (${published.length} characters) and does not state the matter the cited provision requires in terms a consumer could act on.`;
    } else {
      verdict = "adequate";
      why =
        "The transcribed notice text addresses the matter the cited provision requires, in specific terms tied to this business's own use of the technology.";
    }

    out.push({
      element_id: spec.element_id,
      element_label: spec.element_label,
      proposition_keys: spec.proposition_keys,
      element_verbatim: element_verbatim || NOT_STATED,
      citation,
      published_text: published || NOT_STATED,
      verdict,
      why,
      status,
      ...(information_needed ? { information_needed } : {}),
    });
  }

  return out;
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
// Envelope
// ---------------------------------------------------------------------
export function buildAdmtDeliverables(
  intake: unknown,
  rawDetermination: unknown,
): AdmtDeliverables {
  const notice = buildNoticeElementFindings(intake);
  const exceptions = buildExceptionQualification(intake);
  const determination = normalizeDetermination(rawDetermination, {
    activity_id: str(get(intake, "system_name")) || "admt_system_1",
    activity_name: str(get(intake, "system_name")) || NOT_STATED,
    notice,
    exceptions,
  });
  return {
    notice_element_findings: notice,
    exception_qualification: exceptions,
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
    (report as any).exception_qualification = built.exception_qualification;
    (report as any).determination = built.determination;
    return {
      version: ADMT_DELIVERABLES_VERSION,
      ok: true,
      notice_elements: built.notice_element_findings.length,
      notice_insufficient: built.notice_element_findings.filter((n) =>
        n.status === "record_insufficient"
      ).length,
      exceptions_claimed: built.exception_qualification.length,
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
