// DOC 224 §3 / §4.B — classify-propositions `select_hooks`, the pure
// orchestration (`_local/select.ts`) with mocked model clients and store.
// Pins: store hit → no call; misses → exactly ONE call per leg for the whole
// bundle; per-item decisions saved under content addresses that change with
// the candidate set; storeOnly (the cap) → no call, `cap` source; a split
// between the legs → legs_disagreed; the model callers are the grader's
// endpoints and keys (by source, never called here).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { itemSlice, runSelectHooks, selectionDecisionIdFor, type SelectDeps } from "../../../supabase/functions/classify-propositions/_local/select.ts";
import { SELECT_SCHEMA, SELECT_SYSTEM, selectUserPrompt } from "../../../supabase/functions/classify-propositions/_local/select-prompts.ts";
import { PRIMARY_MODEL, SECOND_MODEL, isOpenAiModel } from "../../../supabase/functions/classify-propositions/_local/model-call.ts";
import type { SelectionItem } from "../../../supabase/functions/_shared/corpus/hook-selection.ts";

const A: SelectionItem = {
  field_id: "processing_description",
  question_text: "What processing are you considering?",
  answer: "We screen every checkout for fraud using device signals and transaction history.",
  candidates: [{ hook_id: "h/psd2", hook_version: 1, fact_pattern_paraphrase: "fraud screening by a PSP", fact_atoms: ["class:fraud_prevention"], distinguishing_atoms: ["flag:children"] }],
};
const B: SelectionItem = {
  field_id: "necessity_details.why_consent_not_used",
  question_text: "Why isn't consent appropriate here?",
  answer: "Consent would let fraudsters opt out of the screening and defeat the purpose.",
  candidates: [{ hook_id: "h/psd2", hook_version: 1, fact_pattern_paraphrase: "fraud screening by a PSP", fact_atoms: ["class:fraud_prevention"], distinguishing_atoms: ["flag:children"] }],
};

function deps(over: Partial<SelectDeps> & { store?: Map<string, unknown>; calls?: string[]; replies?: Record<string, string> } = {}): SelectDeps & { store: Map<string, unknown>; calls: string[] } {
  const store = over.store ?? new Map<string, unknown>();
  const calls = over.calls ?? [];
  const replies = over.replies ?? {};
  return {
    primaryModel: PRIMARY_MODEL,
    secondModel: SECOND_MODEL,
    // deno-lint-ignore require-await
    async findDecision(id) {
      const row = store.get(id) as { decision_id: string; readings: never[] } | undefined;
      return row ?? null;
    },
    // deno-lint-ignore require-await
    async saveDecision(row) {
      store.set(String(row.decision_id), row);
    },
    // deno-lint-ignore require-await
    async callModel(model, _system, user, _schema) {
      calls.push(`${model}:${user.length}`);
      return replies[model] ?? JSON.stringify({ items: [] });
    },
    ...over,
    store,
    calls,
  };
}

const AGREE_REPLY = JSON.stringify({
  items: [
    { field_id: A.field_id, readings: [{ hook_id: "h/psd2", fact_agreement: "same", matched_atom: "class:fraud_prevention", evidence_span: "checkout for fraud", confidence: 0.9 }] },
    { field_id: B.field_id, readings: [{ hook_id: "h/psd2", fact_agreement: "unknown", matched_atom: null, evidence_span: null, confidence: 0.2 }] },
  ],
});

Deno.test("doc224 §3 — two misses → exactly one call per leg carrying BOTH items; per-item decisions saved; legs agree → settled", async () => {
  const d = deps({ replies: { [PRIMARY_MODEL]: AGREE_REPLY, [SECOND_MODEL]: AGREE_REPLY } });
  const out = await runSelectHooks({ product: "lia", items: [A, B] }, d);
  assertEquals(out.calls_made, 2);
  assertEquals(d.calls.length, 2);
  assert(d.calls.some((c) => c.startsWith(PRIMARY_MODEL)) && d.calls.some((c) => c.startsWith(SECOND_MODEL)));
  assertEquals(out.from_model, 2);
  assertEquals(out.from_store, 0);
  assertEquals(d.store.size, 2);
  const a = out.items.find((i) => i.field_id === A.field_id)!;
  assertEquals(a.readings[0].fact_agreement, "same");
  assertEquals(a.readings[0].matched_atom, "class:fraud_prevention");
  const b = out.items.find((i) => i.field_id === B.field_id)!;
  assertEquals(b.readings[0].fact_agreement, "unknown");
  assertEquals(b.readings[0].legs_disagreed, false);
  // The bundle prompt carries both items and every candidate's atoms.
  const prompt = selectUserPrompt([A, B]);
  assertStringIncludes(prompt, `## ITEM field_id=${A.field_id}`);
  assertStringIncludes(prompt, `## ITEM field_id=${B.field_id}`);
  assertStringIncludes(prompt, '"flag:children"');
});

Deno.test("doc224 §1 — a store hit makes NO call; the same input returns the stored decision", async () => {
  const d = deps({ replies: { [PRIMARY_MODEL]: AGREE_REPLY, [SECOND_MODEL]: AGREE_REPLY } });
  await runSelectHooks({ product: "lia", items: [A] }, d);
  const before = d.calls.length;
  const again = await runSelectHooks({ product: "lia", items: [A] }, d);
  assertEquals(d.calls.length, before);
  assertEquals(again.calls_made, 0);
  assertEquals(again.from_store, 1);
  assertEquals(again.items[0].readings[0].fact_agreement, "same");
});

Deno.test("doc224 §3 — the decision key changes with the candidate set, the prompt, the models and the canonical input", async () => {
  const base = { primary_model: PRIMARY_MODEL, second_model: SECOND_MODEL, prompt_hash: "p", schema_hash: "s", input_hash: "i", candidate_key: "h/psd2@1" };
  const k1 = await selectionDecisionIdFor(base);
  assert(k1 !== await selectionDecisionIdFor({ ...base, candidate_key: "h/psd2@1|h/other@1" }));
  assert(k1 !== await selectionDecisionIdFor({ ...base, second_model: "claude-haiku-4-5-20251001" }));
  assert(k1 !== await selectionDecisionIdFor({ ...base, input_hash: "j" }));
  assertEquals(k1, await selectionDecisionIdFor({ ...base }));
});

Deno.test("doc224A D9 — storeOnly (cap reached): misses make no call and come back as `cap` with every candidate unknown", async () => {
  const d = deps({ replies: { [PRIMARY_MODEL]: AGREE_REPLY, [SECOND_MODEL]: AGREE_REPLY } });
  const out = await runSelectHooks({ product: "lia", items: [A, B] }, d, { storeOnly: true });
  assertEquals(d.calls.length, 0);
  assertEquals(out.calls_made, 0);
  assertEquals(out.items.map((i) => i.source), ["cap", "cap"]);
  assertEquals(out.items[0].readings[0].fact_agreement, "unknown");
  assertEquals(d.store.size, 0);
});

Deno.test("212G §3 — a split between the legs is legs_disagreed (the ROO item), never a selection; a bad span on one leg is unknown on that leg", async () => {
  const different = JSON.stringify({
    items: [{ field_id: A.field_id, readings: [{ hook_id: "h/psd2", fact_agreement: "different", matched_atom: "flag:children", evidence_span: "checkout", confidence: 0.6 }] }],
  });
  const d = deps({ replies: { [PRIMARY_MODEL]: AGREE_REPLY, [SECOND_MODEL]: different } });
  const out = await runSelectHooks({ product: "lia", items: [A] }, d);
  const r = out.items[0].readings[0];
  assertEquals(r.fact_agreement, "unknown");
  assertEquals(r.legs_disagreed, true);
  // itemSlice tolerates a missing item.
  assertEquals(itemSlice({ items: [] }, "x"), { readings: [] });
});

Deno.test("doc224 §3 — the model callers are the grader's pattern by source: Claude at api.anthropic.com with ANTHROPIC_API_KEY, GPT-4o at api.openai.com with OPENAI_API_KEY, no temperature", async () => {
  const src = await Deno.readTextFile(new URL("../../../supabase/functions/classify-propositions/_local/model-call.ts", import.meta.url));
  assertStringIncludes(src, "https://api.anthropic.com/v1/messages");
  assertStringIncludes(src, 'Deno.env.get("ANTHROPIC_API_KEY")');
  assertStringIncludes(src, "https://api.openai.com/v1/chat/completions");
  assertStringIncludes(src, 'Deno.env.get("OPENAI_API_KEY")');
  assertStringIncludes(src, '"anthropic-version": "2023-06-01"');
  assertStringIncludes(src, 'response_format');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join("\n");
  assert(!/\btemperature\s*:|\btop_p\s*:/.test(code), "no temperature / top_p on either leg");
  assertEquals(PRIMARY_MODEL, "claude-sonnet-5");
  assertEquals(SECOND_MODEL, "gpt-4o");
  assert(isOpenAiModel(SECOND_MODEL) && !isOpenAiModel(PRIMARY_MODEL));
  // The schema is strict-compatible (every property required, no extras).
  assertEquals((SELECT_SCHEMA as { additionalProperties: boolean }).additionalProperties, false);
  assertStringIncludes(SELECT_SYSTEM, "unknown");
  assert(!SELECT_SYSTEM.includes("supports the company"));
});
