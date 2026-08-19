/**
 * LTP RenderPlan v1 Wire Schema — MECHANICAL PROJECTION of the canonical
 * TypeScript types in _shared/render-plan/schema.ts.
 *
 * Content-anchored courier ruling (2026-07-26): the wire schema is a
 * mechanical projection of the reviewed canonical `schema.ts`; no
 * hand-authored content is introduced here. Projection rules:
 *   • additionalProperties:false everywhere
 *   • all enums closed
 *   • required = every non-optional field
 *   • string caps: 240 chars on note fields per §3.2 #7
 * A test in `renderplan-wire-schema.test.ts` asserts the projection
 * round-trips against golden plan fixtures.
 */

export const RENDERPLAN_WIRE_SCHEMA_VERSION = "wire-v1-2026-07-28-item244-p1-reorder";

const AUTHORITY_WEIGHT_ENUM = ["binding", "persuasive"] as const;
const EPISTEMIC_TYPE_ENUM = ["R", "W", "J"] as const;
const JURISDICTION_TAG_ENUM = [
  "cppa-ca",
  "us-federal",
  "us-state-co",
  "us-state-va",
  "us-state-tx",
  "eu-gdpr",
  "uk-gdpr",
] as const;

const noteString = { type: "string", maxLength: 240 } as const;

/** Anchor sub-object (StatutoryAnchor). */
const anchorSchema = {
  type: "object",
  additionalProperties: false,
  required: ["corpus_key", "pinpoint", "jurisdiction_tag"],
  properties: {
    corpus_key: { type: "string" },
    pinpoint: { type: "string" },
    jurisdiction_tag: { type: "string", enum: JURISDICTION_TAG_ENUM },
  },
} as const;

const intakeLedgerEntrySchema = {
  type: "object",
  additionalProperties: false,
  required: ["ledger_id", "intake_field", "value", "display"],
  properties: {
    ledger_id: { type: "string" },
    intake_field: { type: "string" },
    value: { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }, { type: "null" }] },
    display: { type: "string" },
  },
} as const;

const citationBindingSchema = {
  type: "object",
  additionalProperties: false,
  required: ["pinpoint_ref", "corpus_key", "pinpoint", "jurisdiction_tag"],
  properties: {
    pinpoint_ref: { type: "string" },
    corpus_key: { type: "string" },
    pinpoint: { type: "string" },
    jurisdiction_tag: { type: "string", enum: JURISDICTION_TAG_ENUM },
    authority_weight: { type: "string", enum: AUTHORITY_WEIGHT_ENUM },
  },
} as const;

const propositionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "id",
    "conclusion_id",
    "epistemic_type",
    "jurisdiction_tag",
    "anchor",
    "intake_ledger_refs",
    "citation_binding_refs",
  ],
  properties: {
    id: { type: "string" },
    conclusion_id: { type: "string" },
    epistemic_type: { type: "string", enum: EPISTEMIC_TYPE_ENUM },
    jurisdiction_tag: { type: "string", enum: JURISDICTION_TAG_ENUM },
    polarity: { type: "string", enum: ["positive", "negative", "not_applicable"] },
    anchor: anchorSchema,
    intake_ledger_refs: { type: "array", items: { type: "string" } },
    citation_binding_refs: { type: "array", items: { type: "string" } },
    weighing_frame_ref: { type: "string" },
    template_slot: { type: "string" },
  },
} as const;

const factorTableEntrySchema = {
  type: "object",
  additionalProperties: false,
  // ITEM 244 (P1) — supporting_ledger_ids (aliased here as
  // `intake_ledger_refs`, the canonical schema.ts field name) placed
  // immediately before `weight_note` in property order to mirror the
  // Pass-1 P2 exemplar row and reduce model drift on the token that
  // most affects grounded-note grounding.
  required: [
    "factor_id",
    "kind",
    "jurisdiction_tag",
    "present_in_intake",
    "guidance_refs",
    "anchor",
    "intake_ledger_refs",
  ],
  properties: {
    factor_id: { type: "string" },
    kind: { type: "string", enum: ["benefit", "negative_impact", "safeguard"] },
    jurisdiction_tag: { type: "string", enum: JURISDICTION_TAG_ENUM },
    present_in_intake: { type: "boolean" },
    guidance_refs: { type: "array" },
    anchor: anchorSchema,
    intake_ledger_refs: { type: "array", items: { type: "string" } },
    weight_note: { ...noteString },
  },
} as const;

const weighingFrameEntrySchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "frame_id",
    "test_id",
    "jurisdiction_tag",
    "source",
    "corpus_ref",
    "anchor_hint",
    "pinpoint",
    "closeness_contribution",
    "tier_label",
  ],
  properties: {
    frame_id: { type: "string" },
    test_id: { type: "string" },
    jurisdiction_tag: { type: "string", enum: JURISDICTION_TAG_ENUM },
    source: {
      type: "string",
      enum: [
        "fsor_commentary",
        "fsor_callout",
        "enforcement_action_fsor_analogy",
        "edpb_guideline",
        "enforcement_action_edpb_analogy",
      ],
    },
    corpus_ref: { type: "string" },
    anchor_hint: { type: "string" },
    pinpoint: { type: "string" },
    closeness_contribution: { type: "number", minimum: 0, maximum: 1 },
    tier_label: { type: "string", enum: ["primary", "supporting", "analogy_fsor_internal"] },
    authority_weight: { type: "string", enum: AUTHORITY_WEIGHT_ENUM },
    fsor_mediation_ref: { type: "string" },
  },
} as const;

const gateRuleOutcomeSchema = {
  type: "object",
  additionalProperties: false,
  required: ["gate_id", "outcome"],
  properties: {
    gate_id: { type: "string" },
    outcome: { type: "string", enum: ["pass", "block", "not_applicable"] },
    reason: { ...noteString },
  },
} as const;

const conservativeWriteAroundSchema = {
  type: "object",
  additionalProperties: false,
  required: ["triggered", "disclosure"],
  properties: {
    triggered: { type: "boolean" },
    reason: { ...noteString },
    disclosure: { type: "string", enum: ["silent+telemetry", "customer_visible_banner"] },
  },
} as const;

export const RENDERPLAN_WIRE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "plan_version",
    "product",
    "build_stamp",
    "jurisdiction_tag",
    "intake_ledger",
    "citation_bindings",
    "propositions",
    "factor_table",
    "weighing_frame",
    "gate_outcomes",
    "conservative_write_around",
  ],
  properties: {
    plan_version: { type: "string", enum: ["v1"] },
    product: { type: "string" },
    build_stamp: { type: "string" },
    jurisdiction_tag: { type: "string", enum: JURISDICTION_TAG_ENUM },
    intake_ledger: { type: "array", items: intakeLedgerEntrySchema },
    citation_bindings: { type: "array", items: citationBindingSchema },
    propositions: { type: "array", items: propositionSchema },
    factor_table: { type: "array", items: factorTableEntrySchema },
    weighing_frame: { type: "array", items: weighingFrameEntrySchema },
    gate_outcomes: { type: "array", items: gateRuleOutcomeSchema },
    conservative_write_around: conservativeWriteAroundSchema,
  },
} as const;

/**
 * ITEM 305 — DETERMINISTIC-ONLY PLAN KEYS.
 *
 * `activity_analytics` is computed deterministically by `derivePlan`
 * (buildActivityAnalytics) and is NEVER model-authored. It is therefore
 * deliberately ABSENT from the wire schema the model is shown — declaring
 * it there would invite Pass-1 to fabricate the § 7152 analytic
 * deliverables the deterministic engine owns. The projection check below
 * excludes these keys instead of widening the model contract.
 */
export const DETERMINISTIC_ONLY_PLAN_KEYS: readonly string[] = [
  "activity_analytics",
  // ITEM 341 — corpus-pinned EU persuasive authority; never model-authored.
  "eu_persuasive_authority",
  // UPGRADE-2 — § 7152(a)(8)-(9) attestation; deterministic, never model-authored.
  "attestation",
];

/**
 * Shallow structural round-trip check used by the projection test: every
 * property on a candidate RenderPlan object must be listed in the schema's
 * top-level `properties` block (no drift surface between the TS canonical
 * and the wire projection), except the deterministic-only keys above.
 */
export function planKeysProjected(plan: Record<string, unknown>): {
  ok: boolean;
  extra_keys: string[];
  missing_required: string[];
} {
  const allowed = new Set(Object.keys(RENDERPLAN_WIRE_SCHEMA.properties));
  const deterministicOnly = new Set(DETERMINISTIC_ONLY_PLAN_KEYS);
  const required = new Set(RENDERPLAN_WIRE_SCHEMA.required);
  const extra_keys: string[] = [];
  for (const k of Object.keys(plan ?? {})) {
    if (!allowed.has(k) && !deterministicOnly.has(k)) extra_keys.push(k);
  }

  const missing_required: string[] = [];
  for (const k of required) if (!(k in (plan ?? {}))) missing_required.push(k);
  return { ok: extra_keys.length === 0 && missing_required.length === 0, extra_keys, missing_required };
}
