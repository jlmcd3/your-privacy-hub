// DOC 217 §3 — gate prompt, schema and hashes.

import { GATE_REASON_CODES, LIA_FREE_TEXT_FIELDS } from "./codes.ts";

export async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const GATE_SYSTEM = [
  "You screen free-text answers given in a Legitimate Interests Assessment intake form.",
  "",
  'A field "conforms" when the answer is ALL of the following, and nothing more is being claimed:',
  "  - responsive to the question AS DISPLAYED (not to some related question);",
  "  - intelligible;",
  "  - not a placeholder;",
  "  - not contradicting a closed-list answer supplied in closed_answers;",
  "  - not a legal conclusion offered in place of a fact " +
    '("this processing is necessary" answers nothing);',
  "  - not a fact that belongs to another question (for example special-category data",
  "    disclosed in the purpose answer belongs to the special-category question).",
  "",
  '"conforms" NEVER means that the answer is true, sufficient or adequate. You are not',
  "assessing the merits of the assessment and you never write prose for the customer.",
  "",
  `Reason codes (use only these): ${GATE_REASON_CODES.join(", ")}.`,
  "When and only when you use fact_belongs_to_other_limb, set other_limb_field to the",
  "field id the fact belongs to, from this list:",
  ...LIA_FREE_TEXT_FIELDS.map((f) => `  - ${f}`),
  "otherwise set other_limb_field to null.",
  "",
  "evidence_span, when given, must be copied VERBATIM from the answer.",
  "Return one object per field supplied, in the same order.",
].join("\n");

export const GATE_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["results"],
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field_id", "verdict", "reason_codes", "other_limb_field", "evidence_span"],
        properties: {
          field_id: { type: "string" },
          verdict: { type: "string", enum: ["conforms", "non_conforming"] },
          reason_codes: { type: "array", items: { type: "string", enum: [...GATE_REASON_CODES] } },
          other_limb_field: { type: ["string", "null"] },
          evidence_span: { type: ["string", "null"] },
        },
      },
    },
  },
};

export interface PromptField {
  field_id: string;
  question_text: string;
  answer: string;
  closed_answers?: Record<string, unknown>;
}

export function gateUserPrompt(fields: PromptField[]): string {
  return fields
    .map((f, i) =>
      [
        `### FIELD ${i + 1}`,
        `field_id: ${f.field_id}`,
        `question as displayed: ${f.question_text}`,
        `closed_answers: ${JSON.stringify(f.closed_answers ?? {})}`,
        "answer:",
        f.answer,
      ].join("\n")
    )
    .join("\n\n");
}

/** Stable over the system prompt + schema; changes whenever either changes. */
export function gatePromptHash(): Promise<string> {
  return sha256(`${GATE_SYSTEM}\n--SCHEMA--\n${JSON.stringify(GATE_SCHEMA)}`);
}
