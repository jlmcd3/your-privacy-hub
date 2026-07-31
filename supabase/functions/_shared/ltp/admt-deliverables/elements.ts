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
} from "../../registry/admt-verified-authorities.ts";
import { requireVerified } from "../../verified-authority-resolver.ts";
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
}

/** The five § 7220(c) elements. Closed list — no sixth element exists. */
export const NOTICE_ELEMENT_SPECS: readonly NoticeElementSpec[] = [
  {
    element_id: "c1_purpose",
    element_label: "Specific purpose for the ADMT (§ 7220(c)(1))",
    proposition_keys: ["notice_purpose"],
    text_keys: ["purpose"],
    status_keys: ["notice_has_specific_purpose"],
  },
  {
    element_id: "c2_optout",
    element_label: "Right to opt-out and how to submit the request (§ 7220(c)(2))",
    proposition_keys: ["notice_optout"],
    text_keys: ["optout"],
    status_keys: ["notice_has_opt_out_desc"],
  },
  {
    element_id: "c3_access",
    element_label: "Right to access ADMT and how to submit the request (§ 7220(c)(3))",
    proposition_keys: ["notice_access"],
    text_keys: ["access"],
    status_keys: ["notice_has_access_desc"],
  },
  {
    element_id: "c4_antiretaliation",
    element_label: "Prohibition on retaliation for exercising CCPA rights (§ 7220(c)(4))",
    proposition_keys: ["notice_antiretal"],
    text_keys: ["antiretaliation"],
    status_keys: ["notice_has_anti_retaliation"],
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
