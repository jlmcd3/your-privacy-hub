// ITEM 394 LEG C — ADMT PLAN REGISTER: SINGLE WRITERS FOR THE REPAIRABLE
// ABSENCE-CLAIM SURFACES.
//
// The ADMT analogue of `lia-deliverables/doc-plan-register.ts`. Each builder
// is the SINGLE WRITER for one surface: it states only what the persisted
// record states, in the product's drafting voice, and returns "" when the
// record does not back the surface (honest degradation — the CSC pass then
// leaves the surface standing and the gate reads the unrepaired violation).
//
// Deterministic. No I/O, no clock, no model.

function readPath(intake: unknown, path: string): unknown {
  let cur: unknown = intake;
  for (const seg of String(path).split(".")) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

function s(intake: unknown, path: string): string {
  const v = readPath(intake, path);
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean).join(", ");
  return String(v).trim();
}

function sentence(parts: readonly string[]): string {
  const body = parts.filter((p) => p && p.trim()).join(" ");
  return body.trim();
}

const YES_RE = /^yes\b/i;

/**
 * § 7222(b)(2) logic-disclosure element. Written from what the record states
 * about how the output is explained.
 */
export function buildLogicDisclosureRecord(intake: unknown): string {
  const logic = s(intake, "access_logic_disclosure");
  const ready = s(intake, "access_readiness.b2_logic_ready");
  const process = s(intake, "access_readiness.b2_logic_process");
  const models = s(intake, "admt_detail.model_types");
  const secrets = s(intake, "access_trade_secret_policy");
  if (!logic && !process && !ready) return "";

  const out: string[] = [];
  if (logic) {
    out.push(`The record states the explanation the business can give: ${logic.replace(/\s+$/, "")}${/[.!?]$/.test(logic) ? "" : "."}`);
  }
  if (models) out.push(`The technology is recorded as ${models}.`);
  if (ready) out.push(`Readiness to produce the § 7222(b)(2) explanation is recorded as "${ready}".`);
  if (process) out.push(`The process recorded for producing it is: ${process}${/[.!?]$/.test(process) ? "" : "."}`);
  if (secrets) out.push(`The record also states the trade-secret position: ${secrets}${/[.!?]$/.test(secrets) ? "" : "."}`);
  return sentence(out);
}

/**
 * § 7221(b)(1) human-involvement element. Written from the human-review answer
 * and the appeal facts the record supplies.
 */
export function buildHumanInvolvementRecord(intake: unknown): string {
  const review = s(intake, "human_review");
  const role = s(intake, "admt_detail.appeal_reviewer_role");
  const trained = s(intake, "admt_detail.appeal_trained");
  const authority = s(intake, "admt_detail.appeal_authority_overturn");
  const appeal = s(intake, "opt_out_appeal_process");
  if (!review && !role && !appeal) return "";

  const out: string[] = [];
  if (review) out.push(`The record answers the human-review question as: ${review}${/[.!?]$/.test(review) ? "" : "."}`);
  if (role) out.push(`The reviewer named on the record is the ${role}.`);
  if (trained) {
    out.push(
      YES_RE.test(trained)
        ? "The record states that the reviewer is trained to interpret the output."
        : `Training of that reviewer is recorded as "${trained}".`,
    );
  }
  if (authority) {
    out.push(
      YES_RE.test(authority)
        ? "The record states that the reviewer has authority to overturn the outcome."
        : `Authority to overturn the outcome is recorded as "${authority}".`,
    );
  }
  if (appeal) out.push(`The appeal process recorded is: ${appeal}${/[.!?]$/.test(appeal) ? "" : "."}`);
  return sentence(out);
}

/** Scope-analysis human-review reasoning — same facts, scope-section voice. */
export function buildHumanReviewReasoning(intake: unknown): string {
  const body = buildHumanInvolvementRecord(intake);
  if (!body) return "";
  return body;
}

export const ADMT_RECORD_REGISTER_VERSION = "admt-record-register@item394-2026-08-06";
