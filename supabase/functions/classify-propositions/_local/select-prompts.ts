// DOC 224 §3 / 212G §3 — the hook-selection prompt, schema and hashes.
// One request per leg carries EVERY item of a generation (doc 224 §3);
// the reply is split per item and each item is stored under its own key.

import type { SelectionItem } from "../../_shared/corpus/hook-selection.ts";
import { sha256 } from "./prompts.ts";

export const SELECT_SYSTEM = [
  "You compare a company's free-text answer from a Legitimate Interests Assessment intake",
  "against the FACT PATTERN of one or more regulatory authorities, and say for each authority",
  "whether the answer describes the SAME facts as that fact pattern, DIFFERENT facts on a",
  "point that authority turned on, or whether you cannot tell.",
  "",
  "For each authority (candidate) return fact_agreement ∈ {same, different, unknown}.",
  "  same      — the answer itself describes facts matching the authority's fact pattern;",
  "              name the matched_atom from that authority's fact_atoms.",
  "  different — the answer itself states a fact that takes it outside the authority's",
  "              fact pattern; name the matched_atom from that authority's distinguishing_atoms.",
  "  unknown   — the answer does not let you tell. This is the default and the usual answer.",
  "A same/different reading MUST copy the supporting span VERBATIM from the answer into",
  "evidence_span; a reading with no verbatim span is rejected by code. matched_atom MUST be",
  "one of the atoms listed for that authority; any other atom is rejected by code.",
  "Never infer: silence is unknown. Never judge lawfulness, and never use the words",
  "'supports' or 'against' — direction is decided by a ratified matrix, not by you.",
  "Return exactly one item per field_id supplied and exactly one reading per candidate.",
].join("\n");

export const SELECT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["items"],
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field_id", "readings"],
        properties: {
          field_id: { type: "string" },
          readings: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["hook_id", "fact_agreement", "matched_atom", "evidence_span", "confidence"],
              properties: {
                hook_id: { type: "string" },
                fact_agreement: { type: "string", enum: ["same", "different", "unknown"] },
                matched_atom: { type: ["string", "null"] },
                evidence_span: { type: ["string", "null"] },
                confidence: { type: "number" },
              },
            },
          },
        },
      },
    },
  },
};

export function selectUserPrompt(items: readonly SelectionItem[]): string {
  const blocks = items.map((item) => {
    const cands = item.candidates.map((c) =>
      [
        `### AUTHORITY hook_id=${c.hook_id}`,
        `fact pattern: ${c.fact_pattern_paraphrase}`,
        `fact_atoms (for same): ${JSON.stringify(c.fact_atoms)}`,
        `distinguishing_atoms (for different): ${JSON.stringify(c.distinguishing_atoms)}`,
      ].join("\n")
    ).join("\n\n");
    return [
      `## ITEM field_id=${item.field_id}`,
      `QUESTION AS DISPLAYED: ${item.question_text}`,
      "ANSWER:",
      item.answer,
      "",
      "CANDIDATES:",
      cands,
    ].join("\n");
  });
  return blocks.join("\n\n");
}

/** Stable over the system prompt + schema. */
export function selectPromptHash(): Promise<string> {
  return sha256(`${SELECT_SYSTEM}\n--SCHEMA--\n${JSON.stringify(SELECT_SCHEMA)}`);
}

export function selectSchemaHash(): Promise<string> {
  return sha256(JSON.stringify(SELECT_SCHEMA));
}

/** Per-item input hash: the question as displayed + the CANONICAL answer. */
export function selectInputHash(item: SelectionItem): Promise<string> {
  return sha256(JSON.stringify({ question_text: item.question_text, answer: item.answer }));
}
