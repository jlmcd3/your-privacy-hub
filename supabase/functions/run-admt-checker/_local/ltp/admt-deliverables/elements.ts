/**
 * ITEM 308 — element + condition registries for the cppa-admt deliverables.
 *
 * REUSE LAW (Chapter 3 (E)(2) confirmation): the § 7220(c) and § 7221(b)
 * element text already exists, verbatim-sourced, in
 * ../../registry/admt-verified-authorities.ts. NOTHING is re-derived here.
 * This module only *groups* those existing rows into the element and
 * condition shapes the deliverables iterate over, and records which intake
 * key carries the business's own evidence for each.
 *
 * Every `condition_verbatim` below is a byte-identical SUBSTRING of the
 * referenced registry row's `verbatim_quote` — pinned by the colocated
 * test src/registry/__tests__/admt-deliverables.test.ts.
 */
import {
  ADMT_VERIFIED_AUTHORITIES,
} from "../../../../_shared/registry/admt-verified-authorities.ts";
import { requireVerified } from "../../../../_shared/verified-authority-resolver.ts";
import type { NoticeElementId } from "./types.ts";

export interface NoticeElementSpec {
  readonly element_id: NoticeElementId;
  readonly element_label: string;
  /** Registry rows that define the element. */
  readonly proposition_keys: readonly string[];
  /** Sub-keys of intake.notice_element_text carrying the published text. */
  readonly text_keys: readonly string[];
  /** Existing status enums the form already asks (absence evidence). */
  readonly status_keys: readonly string[];
  /**
   * UPGRADE-3 ITEM 1 — the bar the cited provision sets, in plain terms.
   * This is the SHAPE-LAW "standard" step: it is stated once, then TESTED
   * against the business's own captured notice words. It is never the
   * finding itself.
   */
  readonly standard: string;
  /**
   * Keyword cues used to locate the element's own words inside a pasted
   * full pre-use notice when no per-element transcription was supplied.
   * Cues LOCATE text; they never grade it.
   */
  readonly locate_cues: readonly RegExp[];
}


/** The five § 7220(c) elements. Closed list — no sixth element exists. */
export const NOTICE_ELEMENT_SPECS: readonly NoticeElementSpec[] = [
  {
    element_id: "c1_purpose",
    element_label: "Specific purpose for the ADMT (§ 7220(c)(1))",
    proposition_keys: ["notice_purpose"],
    text_keys: ["purpose"],
    status_keys: ["notice_has_specific_purpose"],
    standard:
      "The notice must explain, in plain language, the specific purpose for which this business plans to use the ADMT. Generic framing does not satisfy the provision: a purpose stated as \u201Cto make a significant decision\u201D, \u201Cbusiness purposes\u201D or \u201Cto improve our services\u201D does not tell the consumer which decision is being made about them.",
    locate_cues: [/\bpurpose\b/i, /\bwe use\b/i, /\bin order to\b/i, /\bto (decide|determine|assess|evaluate|screen|rank)\b/i],
  },
  {
    element_id: "c2_optout",
    element_label: "Right to opt-out and how to submit the request (§ 7220(c)(2))",
    proposition_keys: ["notice_optout"],
    text_keys: ["optout"],
    status_keys: ["notice_has_opt_out_desc"],
    standard:
      "The notice must describe the consumer's right to opt out of the ADMT AND how the consumer submits that request. A statement of the right without the submission route does not satisfy the provision.",
    locate_cues: [/\bopt[- ]out\b/i, /\bopt out\b/i],
  },
  {
    element_id: "c3_access",
    element_label: "Right to access ADMT and how to submit the request (§ 7220(c)(3))",
    proposition_keys: ["notice_access"],
    text_keys: ["access"],
    status_keys: ["notice_has_access_desc"],
    standard:
      "The notice must describe the consumer's right to access ADMT and how the consumer submits that request.",
    locate_cues: [/\bright to access\b/i, /\baccess ADMT\b/i, /\brequest to access\b/i],
  },
  {
    element_id: "c4_antiretaliation",
    element_label: "Prohibition on retaliation for exercising CCPA rights (§ 7220(c)(4))",
    proposition_keys: ["notice_antiretal"],
    text_keys: ["antiretaliation"],
    status_keys: ["notice_has_anti_retaliation"],
    standard:
      "The notice must state that the business is prohibited from retaliating against consumers for exercising their CCPA rights.",
    locate_cues: [/\bretaliat/i, /\bdiscriminate against you\b/i],
  },
  {
    element_id: "c5_howworks_and_alternative",
    element_label:
      "How the ADMT works — inputs, output, and the alternative process (§ 7220(c)(5))",
    proposition_keys: [
      "notice_howworks_inputs",
      "notice_howworks_output",
      "notice_altprocess",
    ],
    text_keys: ["howworks_inputs", "howworks_output", "altprocess"],
    status_keys: ["notice_has_how_it_works", "notice_has_alternative_process"],
    standard:
      "The notice must explain how the ADMT works with respect to this consumer — the personal information it uses as inputs and the output it produces — and must describe the alternative process the business offers where one applies.",
    locate_cues: [/\bhow (it|the (system|tool|model|technology)) works\b/i, /\binputs?\b/i, /\boutput\b/i, /\balternative\b/i],
  },
];

/** UPGRADE-3 ITEM 1 — § 7220(c)(2)(B) exception-identification duty. */
export const EXCEPTION_IDENTIFICATION_SPEC = {
  finding_id: "c2B_exception_identification" as const,
  proposition_key: "notice_exception_identification",
  standard:
    "Where the business does not offer an opt-out because it relies on a § 7221(b) exception other than the human-appeal exception, the pre-use notice must NAME the specific exception relied upon. This duty is separate from describing the opt-out mechanism: a notice can describe opt-out rights adequately and still fail to identify the exception.",
  /** Intake keys carrying the notice's own naming of the exception. */
  text_keys: ["exception_identification", "optout"] as const,
  /** Exception claims to which the (b)(1) appeal-disclosure route applies instead. */
  appeal_claim_prefix: "Human appeal exception",
  /** Claim value recording that no exception is relied upon. */
  no_exception_prefixes: ["No exception", "None", "We do not rely"] as const,
};

export interface AccessElementSpec {
  readonly element_id:
    | "b1_purpose"
    | "b2_logic"
    | "b3_output_use"
    | "b3_outcome"
    | "b3_human_role";
  readonly element_label: string;
  /** Registry row supplying the verbatim § 7222(b) text. */
  readonly proposition_key: string;
  readonly standard: string;
  /** Intake key: can the business produce this explanation on request? */
  readonly ready_key: string;
  /** Intake key: by what process? */
  readonly process_key: string;
  /** Pre-existing intake fields that also evidence this element. */
  readonly fallback_keys: readonly string[];
}

/**
 * UPGRADE-3 ITEM 3 — the § 7222(b) explanation elements, in the order the
 * regulation enumerates them. Closed list, drawn from cppa-7222.
 */
export const ACCESS_ELEMENT_SPECS: readonly AccessElementSpec[] = [
  {
    element_id: "b1_purpose",
    element_label: "Specific purpose for which the ADMT was used (§ 7222(b)(1))",
    proposition_key: "access_purpose",
    standard:
      "On an access request the business must explain, in plain language, the specific purpose for which it used the ADMT with respect to THAT consumer — not a generic description of the programme.",
    ready_key: "access_readiness.b1_purpose_ready",
    process_key: "access_readiness.b1_purpose_process",
    fallback_keys: [],
  },
  {
    element_id: "b2_logic",
    element_label: "Logic of the ADMT, including its assumptions and limitations (§ 7222(b)(2))",
    proposition_key: "access_logic",
    standard:
      "The explanation must enable the consumer to understand how the ADMT processed their personal information to generate an output about them — which may include the parameters that generated the output and the output itself. An explanation that omits the assumptions the model makes, or the limitations on what the output can show, does not enable that understanding.",
    ready_key: "access_readiness.b2_logic_ready",
    process_key: "access_readiness.b2_logic_process",
    fallback_keys: ["access_logic_disclosure"],
  },
  {
    element_id: "b3_output_use",
    element_label: "The output and how the business used it (§ 7222(b)(3))",
    proposition_key: "access_output_use",
    standard:
      "The explanation must state the output the ADMT produced for that consumer and how the business used that output to make the significant decision — including whether the output was the sole factor and, if not, which other factors played a role.",
    ready_key: "access_readiness.b3_output_use_ready",
    process_key: "access_readiness.b3_output_use_process",
    fallback_keys: ["access_outcome_disclosure"],
  },
  {
    element_id: "b3_outcome",
    element_label: "The outcome of the decisionmaking process for the consumer (§ 7222(b)(3))",
    proposition_key: "access_outcome",
    standard:
      "The explanation must state the outcome of the decisionmaking process for that consumer, and where the business plans to reuse the output for a future significant decision, how it plans to use it.",
    ready_key: "access_readiness.b3_outcome_ready",
    process_key: "access_readiness.b3_outcome_process",
    fallback_keys: ["access_outcome_disclosure"],
  },
  {
    element_id: "b3_human_role",
    element_label: "The role any human played in the decisionmaking process (§ 7222(b)(3))",
    proposition_key: "access_human_role",
    standard:
      "Where a human took part in the decisionmaking process in a manner that does not meet the § 7001(e)(1) definition of human involvement, the explanation must state what that human's role was.",
    ready_key: "access_readiness.b3_human_role_ready",
    process_key: "access_readiness.b3_human_role_process",
    fallback_keys: [],
  },
];


export interface ExceptionConditionSpec {
  readonly condition_id: string;
  /** VERBATIM substring of the parent row's quote. */
  readonly condition_verbatim: string;
  /** Intake paths (dotted, relative to the intake object) carrying evidence. */
  readonly evidence_keys: readonly string[];
  readonly information_needed: string;
}

export interface ExceptionSpec {
  readonly proposition_key: string;
  readonly exception_label: string;
  /** Prefix the form's `opt_out_exception` value starts with when claimed. */
  readonly claim_prefixes: readonly string[];
  readonly conditions: readonly ExceptionConditionSpec[];
}

export const EXCEPTION_SPECS: readonly ExceptionSpec[] = [
  {
    proposition_key: "optout_exc_appeal",
    exception_label: "Human-appeal exception (§ 7221(b)(1))",
    claim_prefixes: ["Human appeal exception"],
    conditions: [
      {
        condition_id: "b1_method_to_appeal",
        condition_verbatim: "a method to appeal the decision",
        evidence_keys: ["opt_out_appeal_process", "admt_detail.appeal_step_count"],
        information_needed:
          "The appeal route the consumer actually uses, and how many steps it takes from the adverse decision to the human reviewer.",
      },
      {
        condition_id: "b1_human_reviewer",
        condition_verbatim: "to a human reviewer",
        evidence_keys: [
          "admt_detail.appeal_reviewer_role",
          "admt_detail.appeal_trained",
        ],
        information_needed:
          "The role that performs the appeal review, and an attestation that the reviewer is competent to interpret the ADMT output.",
      },
      {
        condition_id: "b1_authority_to_overturn",
        condition_verbatim: "who has the authority to overturn the decision",
        evidence_keys: ["admt_detail.appeal_authority_overturn"],
        information_needed:
          "An attestation that the named reviewer holds authority to overturn the decision, not merely to review it.",
      },
    ],
  },
  {
    proposition_key: "optout_exc_hire",
    exception_label: "Admission / acceptance / hiring exception (§ 7221(b)(2))",
    claim_prefixes: ["Hiring/admission exception"],
    conditions: [
      {
        condition_id: "b2A_sole_use",
        condition_verbatim:
          "The business uses the ADMT solely for the business\u2019s assessment of the consumer\u2019s ability to perform at work or in an educational program to determine whether to admit, accept, or hire them",
        evidence_keys: ["admt_detail.sole_use_attestation"],
        information_needed:
          "An attestation that the ADMT is used solely to assess ability to perform, and no other purpose rides on the same output.",
      },
      {
        condition_id: "b2B_non_discrimination",
        condition_verbatim:
          "The ADMT works for the business\u2019s purpose and does not unlawfully discriminate based upon protected characteristics",
        evidence_keys: [
          "admt_detail.nondiscrimination_testing",
          "opt_out_fairness_doc",
        ],
        information_needed:
          "The non-discrimination testing record: what was tested, against which protected characteristics, when, and by whom.",
      },
    ],
  },
];

/** Resolve a registry row, or null when the key is absent. */
export function row(key: string) {
  try {
    return requireVerified(ADMT_VERIFIED_AUTHORITIES, key);
  } catch {
    return null;
  }
}
