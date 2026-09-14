// /all-ptest v2 (DOC 261, 2026-09-14) — STRUCTURED OUTPUT SCHEMAS for the three
// evidence-scoped workers and the classifier.
//
// Same discipline as json-schemas.ts: STATIC objects (part of the cached
// prefix); the provider validates the answer, so a truncated or prose-wrapped
// answer cannot reach the parser. Every finding shape names a BLOCK KEY and
// carries the evidence the deterministic validator (validate-v2.ts) checks:
// the quote, the intake key/value, the registry row id/quote.

import type { JsonSchemaSpec } from "./json-schemas.ts";

const str = { type: ["string", "null"] } as const;
const SEVERITY = { type: "string", enum: ["critical", "high", "editorial"] } as const;
const CONFIDENCE = { type: "string", enum: ["high", "medium", "low"] } as const;

/** W-RECORD — does every factual statement trace to an intake value, and is every intake value the block reads reflected? */
export const W_RECORD_JSON_SCHEMA: JsonSchemaSpec = {
  name: "submit_record_findings",
  description: "Return the record-fidelity findings: statements the intake does not support, statements that contradict an intake value, and intake values a block reads but does not reflect.",
  schema: {
    type: "object",
    properties: {
      findings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            block_key: { type: "string" },
            intake_key: { type: "string" },
            intake_value: str,
            quote: { type: "string" },
            kind: { type: "string", enum: ["unsupported", "contradicts", "omitted"] },
            mismatch: { type: "string" },
            severity: SEVERITY,
            confidence: CONFIDENCE,
          },
          required: ["id", "block_key", "intake_key", "quote", "kind", "mismatch", "severity"],
        },
      },
      double_check: str,
    },
    required: ["findings"],
  },
};

/** W-LAW — is every legal statement supported by the registry row the block cites? */
export const W_LAW_JSON_SCHEMA: JsonSchemaSpec = {
  name: "submit_law_findings",
  description: "Return the legal-grounding findings (a statement that contradicts or goes beyond its registry row), plus the fixed-prose statements with no bound row and the row each rests on.",
  schema: {
    type: "object",
    properties: {
      findings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            block_key: { type: "string" },
            binding: { type: "string", enum: ["bound", "unbound", "model_selected"] },
            registry_row_id: str,
            registry_quote: str,
            quote: { type: "string" },
            divergence: { type: "string" },
            severity: SEVERITY,
            confidence: CONFIDENCE,
          },
          required: ["id", "block_key", "binding", "quote", "divergence", "severity"],
        },
      },
      unbound_statements: {
        type: "array",
        items: {
          type: "object",
          properties: {
            block_key: { type: "string" },
            quote: { type: "string" },
            proposed_row_id: str,
            consistent: { type: "boolean" },
            note: str,
          },
          required: ["block_key", "quote", "consistent"],
        },
      },
      double_check: str,
    },
    required: ["findings"],
  },
};

/** W-REASON — does fact → issue → analysis → determination → action hold? */
export const W_REASON_JSON_SCHEMA: JsonSchemaSpec = {
  name: "submit_reasoning_findings",
  description: "Return the reasoning findings: broken chains, contradictions between two blocks, unreachable or self-cancelling conditions.",
  schema: {
    type: "object",
    properties: {
      findings: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            block_key_a: { type: "string" },
            block_key_b: str,
            quote_a: { type: "string" },
            quote_b: str,
            kind: { type: "string", enum: ["broken_chain", "contradiction", "unreachable_condition", "self_cancelling", "unsupported_step"] },
            why: { type: "string" },
            severity: SEVERITY,
            confidence: CONFIDENCE,
          },
          required: ["id", "block_key_a", "quote_a", "kind", "why", "severity"],
        },
      },
      double_check: str,
    },
    required: ["findings"],
  },
};

export const FIX_CLASSES = [
  "rule_bug",
  "clause_defect",
  "missing_structured_input",
  "presentation",
  "judgment",
  "intake_artifact",
] as const;
export type FixClass = typeof FIX_CLASSES[number];

/** Stage 4 — one class per validated finding, bound to a rule or clause. */
export const CLASSIFY_JSON_SCHEMA: JsonSchemaSpec = {
  name: "submit_classifications",
  description: "Assign exactly one fix class to every finding, name the rule or clause it binds to, and give a one-line reason.",
  schema: {
    type: "object",
    properties: {
      classifications: {
        type: "array",
        items: {
          type: "object",
          properties: {
            finding_id: { type: "string" },
            fix_class: { type: "string", enum: [...FIX_CLASSES] },
            rule_ref: str,
            reason: { type: "string" },
          },
          required: ["finding_id", "fix_class", "reason"],
        },
      },
      double_check: str,
    },
    required: ["classifications"],
  },
};
