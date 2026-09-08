// DOC 224 §3 — the `select_hooks` orchestration, pure of Deno/DB so it can
// be tested with mocked model clients and a mocked store.
//
// THE RULE (doc 224 §1): a model is called for a (field, hook) pair iff no
// stored decision exists for this exact input — the canonical answer, the
// candidate set, the models and the prompt. Per-item keys: an unchanged
// item next generation is a store hit regardless of what else was in the
// bundle. One request per leg carries every miss; the reply is split per
// item; each leg's per-item slice is verified by code (atoms, byte-
// substring spans), the two legs are merged (must agree), and the decision
// is persisted under its content address BEFORE anything is returned.

import {
  mergeSelectionLegs,
  selectionCandidateKey,
  verifySelectionLeg,
  type MergedSelection,
  type SelectionItem,
} from "../../_shared/corpus/hook-selection.ts";
import { sha256 } from "./prompts.ts";
import { SELECT_SCHEMA, SELECT_SYSTEM, selectInputHash, selectPromptHash, selectSchemaHash, selectUserPrompt } from "./select-prompts.ts";

export interface StoredSelectionDecision {
  readonly decision_id: string;
  readonly readings: readonly MergedSelection[];
}

export interface SelectDeps {
  readonly primaryModel: string;
  readonly secondModel: string;
  findDecision(decision_id: string): Promise<StoredSelectionDecision | null>;
  saveDecision(row: Record<string, unknown>): Promise<void>;
  /** Returns the raw text of one leg's reply for the whole bundle. */
  callModel(model: string, system: string, user: string, schema: Record<string, unknown>): Promise<string>;
}

export interface SelectItemResult {
  readonly field_id: string;
  readonly decision_id: string;
  readonly input_hash: string;
  /** `cap` — the assessment's call ceiling was reached: no call was made
   *  and every candidate is `unknown` (doc 224A §8 D9). */
  readonly source: "store" | "model" | "cap";
  readonly readings: readonly MergedSelection[];
}

export interface SelectOptions {
  /** True when the ceiling is reached: misses are returned as `cap`. */
  readonly storeOnly?: boolean;
}

export interface SelectOutput {
  readonly items: readonly SelectItemResult[];
  /** 0 or 2 — one per leg, over every miss at once. */
  readonly calls_made: number;
  readonly from_store: number;
  readonly from_model: number;
  readonly prompt_hash: string;
  readonly primary_raw?: string;
  readonly second_raw?: string;
}

export function selectionDecisionIdFor(parts: {
  primary_model: string;
  second_model: string;
  prompt_hash: string;
  schema_hash: string;
  input_hash: string;
  candidate_key: string;
}): Promise<string> {
  return sha256([
    parts.primary_model,
    parts.second_model,
    parts.prompt_hash,
    parts.schema_hash,
    parts.input_hash,
    parts.candidate_key,
  ].join("|"));
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (!m) return {};
    try {
      return JSON.parse(m[0]);
    } catch {
      return {};
    }
  }
}

/** The per-item slice of a bundle reply: `{ readings }` for `field_id`. */
export function itemSlice(rawReply: unknown, field_id: string): { readings: unknown[] } {
  const items = Array.isArray((rawReply as { items?: unknown })?.items) ? (rawReply as { items: unknown[] }).items : [];
  for (const it of items) {
    const o = (it ?? {}) as Record<string, unknown>;
    if (o.field_id === field_id) return { readings: Array.isArray(o.readings) ? o.readings : [] };
  }
  return { readings: [] };
}

export async function runSelectHooks(
  input: { product: string; items: readonly SelectionItem[] },
  deps: SelectDeps,
  opts: SelectOptions = {},
): Promise<SelectOutput> {
  const [prompt_hash, schema_hash] = await Promise.all([selectPromptHash(), selectSchemaHash()]);
  const keyed: { item: SelectionItem; decision_id: string; input_hash: string; candidate_key: string }[] = [];
  for (const item of input.items) {
    if (item.candidates.length === 0) continue;
    const input_hash = await selectInputHash(item);
    const candidate_key = selectionCandidateKey(item.candidates);
    const decision_id = await selectionDecisionIdFor({
      primary_model: deps.primaryModel,
      second_model: deps.secondModel,
      prompt_hash,
      schema_hash,
      input_hash,
      candidate_key,
    });
    keyed.push({ item, decision_id, input_hash, candidate_key });
  }

  const results: SelectItemResult[] = [];
  const misses: typeof keyed = [];
  for (const k of keyed) {
    const stored = await deps.findDecision(k.decision_id);
    if (stored) {
      results.push({ field_id: k.item.field_id, decision_id: k.decision_id, input_hash: k.input_hash, source: "store", readings: stored.readings });
    } else {
      misses.push(k);
    }
  }

  let calls_made = 0;
  let primary_raw: string | undefined;
  let second_raw: string | undefined;
  if (misses.length > 0 && opts.storeOnly) {
    for (const m of misses) {
      results.push({
        field_id: m.item.field_id,
        decision_id: m.decision_id,
        input_hash: m.input_hash,
        source: "cap",
        readings: mergeSelectionLegs(verifySelectionLeg({}, m.item), verifySelectionLeg({}, m.item), m.item),
      });
    }
  } else if (misses.length > 0) {
    const user = selectUserPrompt(misses.map((m) => m.item));
    const [rawA, rawB] = await Promise.all([
      deps.callModel(deps.primaryModel, SELECT_SYSTEM, user, SELECT_SCHEMA),
      deps.callModel(deps.secondModel, SELECT_SYSTEM, user, SELECT_SCHEMA),
    ]);
    calls_made = 2;
    primary_raw = rawA;
    second_raw = rawB;
    const parsedA = safeParse(rawA);
    const parsedB = safeParse(rawB);
    for (const m of misses) {
      const legA = verifySelectionLeg(itemSlice(parsedA, m.item.field_id), m.item);
      const legB = verifySelectionLeg(itemSlice(parsedB, m.item.field_id), m.item);
      const readings = mergeSelectionLegs(legA, legB, m.item);
      await deps.saveDecision({
        decision_id: m.decision_id,
        product: input.product,
        field_id: m.item.field_id,
        input_hash: m.input_hash,
        candidate_key: m.candidate_key,
        prompt_hash,
        schema_hash,
        primary_model: deps.primaryModel,
        second_model: deps.secondModel,
        primary_raw: JSON.stringify(itemSlice(parsedA, m.item.field_id)),
        second_raw: JSON.stringify(itemSlice(parsedB, m.item.field_id)),
        readings,
        conformance: {
          candidates: m.item.candidates.length,
          settled: readings.filter((r) => r.fact_agreement !== "unknown").length,
          legs_disagreed: readings.filter((r) => r.legs_disagreed).length,
        },
      });
      results.push({ field_id: m.item.field_id, decision_id: m.decision_id, input_hash: m.input_hash, source: "model", readings });
    }
  }

  // Keep the caller's item order (the planner's field order — it decides
  // which field "wins" a hook when several settle).
  const order = new Map(input.items.map((it, i) => [it.field_id, i] as const));
  results.sort((a, b) => (order.get(a.field_id) ?? 0) - (order.get(b.field_id) ?? 0));

  return {
    items: results,
    calls_made,
    from_store: results.filter((r) => r.source === "store").length,
    from_model: results.filter((r) => r.source === "model").length,
    prompt_hash,
    ...(primary_raw !== undefined ? { primary_raw } : {}),
    ...(second_raw !== undefined ? { second_raw } : {}),
  };
}
