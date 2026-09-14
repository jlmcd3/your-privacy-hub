// /all-ptest — STRUCTURED OUTPUT SCHEMAS.
//
// WHY. The single biggest cause of a lost review was an answer that was valid
// reasoning but invalid JSON (a long answer cut off mid-object). A schema-bound
// answer removes that failure class at the source: Anthropic returns the object
// as a forced tool call, OpenAI as a json_schema response. Neither can emit
// prose around the object, and neither can stop mid-key without the provider
// itself reporting a failure.
//
// STATIC, like the prompts: these objects are part of the cached prefix. Never
// interpolate anything per-document into them.

export interface JsonSchemaSpec {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

const str = { type: ["string", "null"] } as const;

/** Deep review. Mirrors the shape stated in REVIEW_METHOD, key for key. */
export const REVIEW_JSON_SCHEMA: JsonSchemaSpec = {
  name: "submit_review",
  description: "Return the deep-review findings, the double-check note and the scored verdict.",
  schema: {
    type: "object",
    properties: {
      findings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            section: str,
            defect_type: { type: "string", enum: ["editorial", "factual", "legal", "logical", "consistency"] },
            severity: { type: "string", enum: ["critical", "high", "editorial"] },
            confidence: str,
            quote: { type: "string" },
            why: { type: "string" },
            proposed_change: str,
            decision_required: str,
            cause_layer: str,
            code_focus: str,
            regression_test: str,
          },
          required: ["id", "defect_type", "severity", "quote", "why"],
        },
      },
      double_check: str,
      overall: str,
      dimension_scores: {
        type: "object",
        properties: {
          accuracy: { type: "number" },
          citation: { type: "number" },
          hallucination: { type: "number" },
          analysis: { type: "number" },
          intelligence: { type: "number" },
          formatting: { type: "number" },
        },
      },
      overall_score: { type: "number" },
    },
    required: ["findings"],
  },
};

/** Arbitration and merge share one output shape. */
export const ARBITRATION_JSON_SCHEMA: JsonSchemaSpec = {
  name: "submit_arbitration",
  description: "Return the agreed fix list, the CEO decision sheet, the dropped items and the double-check note.",
  schema: {
    type: "object",
    properties: {
      fix_list: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            status: { type: "string" },
            raised_by: { type: "string" },
            severity: { type: "string" },
            defect_type: { type: "string" },
            occurrences: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  document_id: str,
                  product: str,
                  section: str,
                  quote: str,
                },
              },
            },
            cause: str,
            cause_layer: str,
            code_focus: str,
            change: str,
            regression_test: str,
            boundary_cases: { type: "array", items: { type: "string" } },
          },
          required: ["id", "title", "status", "severity"],
        },
      },
      ceo_sheet: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            question: { type: "string" },
            status: { type: "string" },
            raised_by: str,
            context: str,
            gpt_proposed_fix: str,
            arbiter_reason: str,
            options: {
              type: "array",
              items: {
                type: "object",
                properties: { option: str, consequence: str },
              },
            },
          },
          required: ["id", "question", "status"],
        },
      },
      dropped: {
        type: "array",
        items: {
          type: "object",
          properties: { id: { type: "string" }, reason: str },
          required: ["id"],
        },
      },
      double_check: str,
      summary: str,
    },
    required: ["fix_list", "ceo_sheet"],
  },
};
