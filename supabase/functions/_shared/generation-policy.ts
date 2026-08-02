// Cross-product generation policy: token caps + retry/refund dispatch.
//
// Customer-facing product generators all run on claude-sonnet-4-6, whose
// synchronous Messages API output ceiling is 64,000 tokens. Anthropic bills
// only for tokens actually generated and `max_tokens` carries no rate-limit
// cost or extra latency — raising the cap to the model ceiling is pure
// upside.
//
// Use PRODUCT_MAX_OUTPUT_TOKENS at every product-generator call site. Do NOT
// apply it to internal micro-tasks (classifiers, citation auditors,
// summarisers) — those are deliberately small.
export const PRODUCT_MAX_OUTPUT_TOKENS = 64000;

// Total generation attempts before a row is declared exhausted (original + 2
// automatic retries). Tunable single knob for the cross-product retry sweeper.
export const MAX_ATTEMPTS = 3;

// A row stuck in `processing` for longer than this is treated as a crashed or
// timed-out run that the sweeper should retry. Generators have a 15-min
// AbortSignal — 12 min is a safe lower bound where we know in-flight work
// won't complete normally.
export const STUCK_PROCESSING_MINUTES = 12;

// product_type → generator dispatch. Mirrors payments-webhook so the sweeper
// and the webhook never drift. Each entry names the table the row lives on,
// the generator edge function to invoke, and the request body key that
// generator expects.
export interface ProductDispatch {
  table: string;
  fn: string;
  bodyKey: string;
}

export const PRODUCT_DISPATCH: Record<string, ProductDispatch> = {
  li_assessment:        { table: "li_assessments",         fn: "run-li-assessment",         bodyKey: "assessment_id" },
  governance_assessment:{ table: "governance_assessments", fn: "run-governance-assessment", bodyKey: "assessment_id" },
  dpia_framework:       { table: "dpia_frameworks",        fn: "run-dpia-framework",        bodyKey: "dpia_id"       },
  ir_playbook:          { table: "ir_playbooks",           fn: "generate-ir-playbook",      bodyKey: "assessment_id" },
  biometric_checker:    { table: "biometric_assessments",  fn: "check-biometric-compliance",bodyKey: "assessment_id" },
  cppa_risk_assessment: { table: "cppa_assessments",       fn: "run-cppa-risk-assessment-v2",  bodyKey: "assessment_id" },
  cppa_cybersecurity:   { table: "cppa_assessments",       fn: "run-cppa-cybersecurity",    bodyKey: "assessment_id" },
  cppa_admt:            { table: "cppa_assessments",       fn: "run-admt-checker",          bodyKey: "assessment_id" },
  dpa_generator:        { table: "dpa_documents",          fn: "generate-dpa",              bodyKey: "document_id"   },
};

// Reverse lookup: table → product_type(s). Multiple product types can share a
// table (all three CPPA products live on cppa_assessments) so we differentiate
// by the row's own `tool_type` / `assessment_type` column when present, falling
// back to the table's default product type.
export const TABLE_DEFAULT_PRODUCT: Record<string, string> = {
  li_assessments:         "li_assessment",
  governance_assessments: "governance_assessment",
  dpia_frameworks:        "dpia_framework",
  ir_playbooks:           "ir_playbook",
  biometric_assessments:  "biometric_checker",
  cppa_assessments:       "cppa_risk_assessment", // discriminate by row.assessment_type
  dpa_documents:          "dpa_generator",
};
