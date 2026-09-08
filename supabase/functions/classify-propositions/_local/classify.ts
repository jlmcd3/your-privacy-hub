// DOC 217 §4 — the classify orchestration, pure of Deno/DB so it can be tested
// with mocked model clients and a mocked store.

import {
  classifyPromptHash,
  classifyUserPrompt,
  CLASSIFY_SCHEMA,
  CLASSIFY_SYSTEM,
  inputHash,
  inventoryVersion,
  schemaHash,
  sha256,
  type InventoryRow,
} from "./prompts.ts";
import { mergeLegs, verifyLeg, type MergedReading } from "./merge.ts";

export const PRIMARY_MODEL = "claude-sonnet-5";
export const SECOND_MODEL = "claude-haiku-4-5-20251001";

export interface StoredDecision {
  decision_id: string;
  readings: MergedReading[];
  conformance?: unknown;
  inventory_version?: string;
  created_at?: string;
}

export interface ClassifyDeps {
  loadInventory(product: string, field_id: string): Promise<InventoryRow[]>;
  findDecision(decision_id: string): Promise<StoredDecision | null>;
  saveDecision(row: Record<string, unknown>): Promise<void>;
  callModel(model: string, system: string, user: string, schema: Record<string, unknown>): Promise<string>;
}

export interface ClassifyInput {
  product: string;
  field_id: string;
  question_text: string;
  answer: string;
}

export interface ClassifyOutput {
  decision_id: string | null;
  readings: MergedReading[];
  source: "store" | "model" | "empty_inventory";
  inventory_version?: string;
  prompt_hash?: string;
}

export function decisionIdFor(parts: {
  primary_model: string;
  second_model: string;
  prompt_hash: string;
  schema_hash: string;
  input_hash: string;
  inventory_version: string;
}): Promise<string> {
  return sha256(
    [
      parts.primary_model,
      parts.second_model,
      parts.prompt_hash,
      parts.schema_hash,
      parts.input_hash,
      parts.inventory_version,
    ].join("|"),
  );
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function runClassify(input: ClassifyInput, deps: ClassifyDeps): Promise<ClassifyOutput> {
  const inventory = await deps.loadInventory(input.product, input.field_id);
  if (inventory.length === 0) {
    return { decision_id: null, readings: [], source: "empty_inventory" };
  }

  const [prompt_hash, schema_hash, invVersion, in_hash] = await Promise.all([
    classifyPromptHash(),
    schemaHash(),
    inventoryVersion(inventory),
    inputHash(input.question_text, input.answer),
  ]);
  const decision_id = await decisionIdFor({
    primary_model: PRIMARY_MODEL,
    second_model: SECOND_MODEL,
    prompt_hash,
    schema_hash,
    input_hash: in_hash,
    inventory_version: invVersion,
  });

  const stored = await deps.findDecision(decision_id);
  if (stored) {
    return {
      decision_id,
      readings: stored.readings ?? [],
      source: "store",
      inventory_version: invVersion,
      prompt_hash,
    };
  }

  const user = classifyUserPrompt(inventory, input.question_text, input.answer);
  const [primaryRaw, secondRaw] = await Promise.all([
    deps.callModel(PRIMARY_MODEL, CLASSIFY_SYSTEM, user, CLASSIFY_SCHEMA),
    deps.callModel(SECOND_MODEL, CLASSIFY_SYSTEM, user, CLASSIFY_SCHEMA),
  ]);

  const legA = verifyLeg(safeParse(primaryRaw), inventory, input.answer);
  const legB = verifyLeg(safeParse(secondRaw), inventory, input.answer);
  const readings = mergeLegs(legA, legB, inventory);

  await deps.saveDecision({
    decision_id,
    product: input.product,
    field_id: input.field_id,
    input_hash: in_hash,
    inventory_version: invVersion,
    prompt_hash,
    schema_hash,
    primary_model: PRIMARY_MODEL,
    second_model: SECOND_MODEL,
    primary_raw: primaryRaw,
    second_raw: secondRaw,
    readings,
    conformance: {
      inventory_size: inventory.length,
      asserted: readings.filter((r) => r.stance === "asserted").length,
      legs_disagreed: readings.filter((r) => !r.legs_agree).length,
    },
  });

  return { decision_id, readings, source: "model", inventory_version: invVersion, prompt_hash };
}
