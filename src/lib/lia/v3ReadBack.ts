// DOC 217 §6 — THE READ-BACK CLIENT MODULE (dark behind
// VITE_LIA_V3_READBACK_ENABLED; mounted only by src/components/lia/V3ReadBack.tsx).
//
// Typed to the doc 217 §3 rows and §4 function contracts EXACTLY as written
// (Lovable builds the tables and the two functions in parallel; nothing here
// may depend on them existing — every call fails open and returns a typed
// error). The module never composes customer-facing text: it moves DATA
// (verdicts, reason codes, spans, prop ids, dispositions) between the
// functions, the store and the component, which renders the ratified
// templates (src/lib/lia/readbackTemplates.ts, the byte-mirror of the
// engine's v3/readback-templates.ts).
//
// Transport: the app's existing `supabase.functions.invoke` pattern for the
// two edge functions; `supabase.from(...)` for the store writes. The four
// V3 tables are service-role-RLS per doc 217 §3 — the direct writes below
// are the spec's §6 design ("records dispositions by upserting
// intake_readings") and need an owner policy, or a `dispose` action on
// classify-propositions, before they succeed in production; until then
// they fail open (logged, never thrown). Recorded in 217B as a contract
// item for Lovable's half.

import { supabase } from "@/integrations/supabase/client";
import { isLiaGateReasonCode, type LiaGateReasonCode } from "./readbackTemplates";

// ── doc 217 §3 — the rows ──────────────────────────────────────────────────

export type ReadingDisposition = "confirmed" | "corrected" | "stood" | "unconfirmed";
export type ReadingStance = "asserted" | "abstain";
export type GateVerdict = "conforms" | "non_conforming";
export type GateCustomerAction = "revised" | "stood" | "pending";
export type ReadingsState = "none" | "pending" | "complete";
export type EffectClass = "persuasive_only" | "flag_risk" | "require_condition" | "verdict_bearing";

/** §3.1 proposition_inventory */
export interface PropositionInventoryRow {
  prop_id: string;
  product: string;
  field_id: string;
  label: string;
  definition: string;
  positive_examples: string[];
  negative_examples: string[];
  sibling_group: string | null;
  gate_eligible: boolean;
  effect_class: EffectClass;
  version: number;
  drafted_by: string | null;
  drafted_at: string | null;
  ratified_by: string | null;
  ratified_at: string | null;
  ledger_ref: string | null;
  retired_at: string | null;
  retired_reason: string | null;
  created_at?: string;
  updated_at?: string;
}

/** One entry of proposition_decisions.readings (§3.2) — plus the inventory
 *  label the UI needs to render the reading template; the classifier
 *  response is expected to carry it (217B contract item). */
export interface PropositionReading {
  prop_id: string;
  stance: ReadingStance;
  evidence_span: string | null;
  span_verified: boolean;
  legs_agree: boolean;
  confidence: number;
  label?: string;
}

/** §3.2 proposition_decisions */
export interface PropositionDecisionRow {
  decision_id: string;
  product: string;
  field_id: string;
  input_hash: string;
  inventory_version: string;
  prompt_hash: string;
  schema_hash: string;
  primary_model: string;
  second_model: string;
  primary_raw: string;
  second_raw: string;
  readings: PropositionReading[];
  conformance: unknown;
  created_at?: string;
}

/** §3.3 intake_gate_results */
export interface IntakeGateResultRow {
  id?: string;
  product: string;
  assessment_id: string | null;
  field_id: string;
  question_text: string;
  answer_hash: string;
  verdict: GateVerdict;
  reason_codes: LiaGateReasonCode[];
  other_limb_field: string | null;
  model: string;
  prompt_hash: string;
  raw: string;
  customer_action: GateCustomerAction | null;
  created_at?: string;
}

/** §3.4 intake_readings */
export interface IntakeReadingRow {
  id?: string;
  product: string;
  assessment_id: string;
  field_id: string;
  question_text: string;
  answer_hash: string;
  decision_id: string;
  prop_id: string;
  evidence_span: string;
  disposition: ReadingDisposition;
  disposed_at: string | null;
  revision_no: number;
  created_at?: string;
}

// ── doc 217 §4 — the function contracts ────────────────────────────────────

/** §4.1 input field */
export interface GateFieldInput {
  field_id: string;
  question_text: string;
  answer: string;
  closed_answers?: Record<string, unknown>;
}

/** §4.1 structured output per field (+ the stored row id when returned). */
export interface GateFieldResult {
  field_id: string;
  verdict: GateVerdict;
  reason_codes: LiaGateReasonCode[];
  other_limb_field: string | null;
  evidence_span: string | null;
  gate_result_id: string | null;
}

/** §4.2 classify output. */
export interface ClassifyResult {
  decision_id: string | null;
  inventory_version: string | null;
  readings: PropositionReading[];
}

export interface Outcome {
  ok: boolean;
  error: string | null;
}

// ── hashing (pure, runtime-independent) ────────────────────────────────────

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

/** SHA-256 hex digest of the UTF-8 bytes of `text`. Pure JS (no
 *  crypto.subtle dependency), synchronous, so a hash is one value in every
 *  runtime the form runs in. */
export function sha256Hex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  const bitLen = bytes.length * 8;
  const padLen = (((bytes.length + 9 + 63) >> 6) << 6);
  const buf = new Uint8Array(padLen);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(padLen - 8, Math.floor(bitLen / 0x100000000));
  dv.setUint32(padLen - 4, bitLen >>> 0);
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  for (let i = 0; i < padLen; i += 64) {
    for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0;
      d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map((x) => x.toString(16).padStart(8, "0")).join("");
}

/** Canonical JSON: object keys sorted recursively, no whitespace. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

/** `intake_readings.answer_hash` / `intake_gate_results.answer_hash`. */
export function answerHash(answer: string): string {
  return sha256Hex(answer);
}

/** `li_assessments.intake_hash` (doc 217 stage 3): sha256 of the canonical
 *  JSON of every free-text answer keyed by field id. */
export function intakeHash(fields: readonly { field_id: string; answer: string }[]): string {
  const obj: Record<string, string> = {};
  for (const f of fields) obj[f.field_id] = f.answer ?? "";
  return sha256Hex(canonicalJson(obj));
}

/** `li_assessments.readings_state`. */
export function readingsStateOf(dispositions: readonly ReadingDisposition[]): ReadingsState {
  if (dispositions.length === 0) return "none";
  return dispositions.some((d) => d === "unconfirmed") ? "pending" : "complete";
}

// ── transport ──────────────────────────────────────────────────────────────

type Bag = Record<string, unknown>;
const bag = (v: unknown): Bag => (v && typeof v === "object" && !Array.isArray(v) ? v as Bag : {});
const str = (v: unknown): string => (typeof v === "string" ? v : "");

function errorText(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message || "request_failed");
  return e ? String(e) : "request_failed";
}

/** The subset of the query builder this module uses, typed loosely because
 *  the four V3 tables are not in the generated Database type yet (Lovable's
 *  half) — the codebase's own pattern for a table outside the types. */
interface LooseQuery extends PromiseLike<{ data: unknown; error: unknown }> {
  update(values: Record<string, unknown>): LooseQuery;
  insert(values: Record<string, unknown>): LooseQuery;
  select(columns: string): LooseQuery;
  eq(column: string, value: string): LooseQuery;
  single(): LooseQuery;
}

function table(name: string): LooseQuery {
  return (supabase as unknown as { from: (t: string) => LooseQuery }).from(name);
}

function parseGateResult(raw: unknown, fallbackFieldId: string): GateFieldResult {
  const r = bag(raw);
  const verdict: GateVerdict = str(r.verdict) === "non_conforming" ? "non_conforming" : "conforms";
  const codes = Array.isArray(r.reason_codes) ? r.reason_codes.filter(isLiaGateReasonCode) : [];
  return {
    field_id: str(r.field_id) || fallbackFieldId,
    verdict,
    reason_codes: codes,
    other_limb_field: str(r.other_limb_field) || null,
    evidence_span: str(r.evidence_span) || null,
    gate_result_id: str(r.gate_result_id) || str(r.id) || null,
  };
}

/** §4.1 `lia-intake-gate` action `gate`. Never throws. */
export async function runIntakeGate(args: {
  assessment_id?: string;
  fields: readonly GateFieldInput[];
}): Promise<{ results: GateFieldResult[]; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("lia-intake-gate", {
      body: {
        action: "gate",
        product: "lia",
        assessment_id: args.assessment_id ?? null,
        fields: args.fields.map((f) => ({
          field_id: f.field_id,
          question_text: f.question_text,
          answer: f.answer,
          closed_answers: f.closed_answers ?? {},
        })),
      },
    });
    if (error) return { results: [], error: errorText(error) };
    const d = bag(data);
    const list = Array.isArray(d.results) ? d.results : Array.isArray(d.fields) ? d.fields : Array.isArray(data) ? data : [];
    return {
      results: list.map((raw: unknown, i: number) => parseGateResult(raw, args.fields[i]?.field_id ?? "")),
      error: null,
    };
  } catch (e) {
    return { results: [], error: errorText(e) };
  }
}

function parseReading(raw: unknown): PropositionReading | null {
  const r = bag(raw);
  const prop_id = str(r.prop_id);
  if (!prop_id) return null;
  return {
    prop_id,
    stance: str(r.stance) === "asserted" ? "asserted" : "abstain",
    evidence_span: str(r.evidence_span) || null,
    span_verified: r.span_verified === true,
    legs_agree: r.legs_agree === true,
    confidence: typeof r.confidence === "number" ? r.confidence : 0,
    ...(str(r.label) ? { label: str(r.label) } : {}),
  };
}

/** §4.2 `classify-propositions` action `classify`. Never throws; a field
 *  with no ratified inventory comes back as `{ readings: [] }`. */
export async function classifyField(args: {
  field_id: string;
  question_text: string;
  answer: string;
  inventory_version?: string;
}): Promise<ClassifyResult & { error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke("classify-propositions", {
      body: {
        action: "classify",
        product: "lia",
        field_id: args.field_id,
        question_text: args.question_text,
        answer: args.answer,
        ...(args.inventory_version ? { inventory_version: args.inventory_version } : {}),
      },
    });
    if (error) return { decision_id: null, inventory_version: null, readings: [], error: errorText(error) };
    const d = bag(data);
    const readings = (Array.isArray(d.readings) ? d.readings : [])
      .map(parseReading)
      .filter((r: PropositionReading | null): r is PropositionReading => r !== null);
    return {
      decision_id: str(d.decision_id) || null,
      inventory_version: str(d.inventory_version) || null,
      readings,
      error: null,
    };
  } catch (e) {
    return { decision_id: null, inventory_version: null, readings: [], error: errorText(e) };
  }
}

/** §3.3 — `intake_gate_results.customer_action`. */
export async function recordGateAction(args: { gate_result_id: string; customer_action: GateCustomerAction }): Promise<Outcome> {
  try {
    const { error } = await table("intake_gate_results")
      .update({ customer_action: args.customer_action })
      .eq("id", args.gate_result_id);
    return { ok: !error, error: error ? errorText(error) : null };
  } catch (e) {
    return { ok: false, error: errorText(e) };
  }
}

/** §3.4 — insert one reading row (initially `unconfirmed`, §4.3). */
export async function insertReading(row: Omit<IntakeReadingRow, "id" | "created_at">): Promise<{ id: string | null; error: string | null }> {
  try {
    const { data, error } = await table("intake_readings").insert(row).select("id").single();
    if (error) return { id: null, error: errorText(error) };
    return { id: str(bag(data).id) || null, error: null };
  } catch (e) {
    return { id: null, error: errorText(e) };
  }
}

/** §3.4 — the customer's disposition of a reading. */
export async function updateReadingDisposition(args: { id: string; disposition: ReadingDisposition; disposed_at?: string }): Promise<Outcome> {
  try {
    const { error } = await table("intake_readings")
      .update({ disposition: args.disposition, disposed_at: args.disposed_at ?? new Date().toISOString() })
      .eq("id", args.id);
    return { ok: !error, error: error ? errorText(error) : null };
  } catch (e) {
    return { ok: false, error: errorText(e) };
  }
}

/** §6 "Submit records intake_hash and readings_state" (li_assessments). */
export async function recordSubmitState(args: { assessment_id: string; intake_hash: string; readings_state: ReadingsState }): Promise<Outcome> {
  try {
    const { error } = await table("li_assessments")
      .update({ intake_hash: args.intake_hash, readings_state: args.readings_state })
      .eq("id", args.assessment_id);
    return { ok: !error, error: error ? errorText(error) : null };
  } catch (e) {
    return { ok: false, error: errorText(e) };
  }
}

/** Intake-time rows are keyed on the preview row's id (the only id the form
 *  has); checkout inserts a NEW li_assessments row and does not persist
 *  `preview_assessment_id`, so the rows are re-keyed to the paid id at
 *  `onComplete` (217B contract item). */
export async function rekeyReadings(args: { from_assessment_id: string; to_assessment_id: string }): Promise<Outcome> {
  if (!args.from_assessment_id || !args.to_assessment_id || args.from_assessment_id === args.to_assessment_id) {
    return { ok: true, error: null };
  }
  try {
    const { error } = await table("intake_readings")
      .update({ assessment_id: args.to_assessment_id })
      .eq("assessment_id", args.from_assessment_id);
    const { error: gateError } = await table("intake_gate_results")
      .update({ assessment_id: args.to_assessment_id })
      .eq("assessment_id", args.from_assessment_id);
    const err = error ?? gateError;
    return { ok: !err, error: err ? errorText(err) : null };
  } catch (e) {
    return { ok: false, error: errorText(e) };
  }
}
