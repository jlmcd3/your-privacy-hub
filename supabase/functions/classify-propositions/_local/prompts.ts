// DOC 217 §4 — proposition-reading prompt, schema and hashes.

export async function sha256(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface InventoryRow {
  prop_id: string;
  label: string;
  definition: string;
  positive_examples: string[];
  negative_examples: string[];
  sibling_group: string | null;
  version: number;
}

export const CLASSIFY_SYSTEM = [
  "You read a single free-text answer from a Legitimate Interests Assessment intake",
  "and decide, for each listed proposition, whether the ANSWER ITSELF states it.",
  "",
  "A reading is 'asserted' only when the answer itself states the proposition, and you",
  "must copy the exact supporting span VERBATIM from the answer into evidence_span.",
  "If the answer does not state it, or you would have to infer it, abstain.",
  "Never infer a negation: silence is abstention, never a denial.",
  "Return exactly one reading per proposition supplied.",
].join("\n");

export const CLASSIFY_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["readings"],
  properties: {
    readings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["prop_id", "stance", "evidence_span", "confidence"],
        properties: {
          prop_id: { type: "string" },
          stance: { type: "string", enum: ["asserted", "abstain"] },
          evidence_span: { type: ["string", "null"] },
          confidence: { type: "number" },
        },
      },
    },
  },
};

export function classifyUserPrompt(
  inventory: InventoryRow[],
  question_text: string,
  answer: string,
): string {
  const props = inventory
    .map((p) =>
      [
        `### PROPOSITION ${p.prop_id}`,
        `label: ${p.label}`,
        `definition: ${p.definition}`,
        `positive examples:${(p.positive_examples ?? []).map((e) => `\n  + ${e}`).join("") || " (none)"}`,
        `negative examples:${(p.negative_examples ?? []).map((e) => `\n  - ${e}`).join("") || " (none)"}`,
      ].join("\n")
    )
    .join("\n\n");
  return [
    "PROPOSITIONS",
    props,
    "",
    "QUESTION AS DISPLAYED",
    question_text,
    "",
    "ANSWER",
    answer,
  ].join("\n");
}

/** Stable over the system prompt + schema. */
export function classifyPromptHash(): Promise<string> {
  return sha256(`${CLASSIFY_SYSTEM}\n--SCHEMA--\n${JSON.stringify(CLASSIFY_SCHEMA)}`);
}

export function schemaHash(): Promise<string> {
  return sha256(JSON.stringify(CLASSIFY_SCHEMA));
}

/** sha256 over (prop_id, version, definition) in prop_id order. */
export function inventoryVersion(rows: InventoryRow[]): Promise<string> {
  const canon = [...rows]
    .sort((a, b) => (a.prop_id < b.prop_id ? -1 : a.prop_id > b.prop_id ? 1 : 0))
    .map((r) => [r.prop_id, r.version, r.definition]);
  return sha256(JSON.stringify(canon));
}

export function inputHash(question_text: string, answer: string): Promise<string> {
  return sha256(JSON.stringify({ question_text, answer }));
}
