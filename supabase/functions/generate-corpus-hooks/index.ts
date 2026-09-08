// build-marker: generate-corpus-hooks-a10-19-2026-09-08
console.log("[build-marker] generate-corpus-hooks a10-19-2026-09-08");
//
// DOC 213 — the OFFLINE ANALOGY-HOOK pipeline for the LIA corpus, as amended
// by DOC 222 (hooks contract v2: material facts, distinguishing pairs,
// proposition split, structured pinpoint, derived source status). DARK and
// ADDITIVE: nothing here is read by any product at run time, and no file
// under run-li-assessment/ is touched. The `generate` action returns file
// CONTENTS; a human commits them, and only ratified rows are ever emitted.
//
// Modelled on generate-corpus-rules / generate-corpus-relevance-profiles:
// admin-or-driver-gated POST, JSON in / JSON out, all real work in pure
// `_local/` modules, no cross-function imports.
//
// ACTIONS
//   { action: "draft",    profile_id }
//   { action: "critique", hook_id }
//   { action: "revise",   hook_id }        (Opus + objections, then critique)
//   { action: "settle",   hook_id }        (mechanical, no model)
//   { action: "generate", product }
//   { action: "status",   run_id? }
//   { action: "drive",    run_id }         (the cron driver's tick)

import { verifyCaller } from "../_shared/verify-caller.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { hookRegistryFor } from "./_local/product-registry.ts";
import { sourceExcerpt } from "./_local/excerpt.ts";
import {
  CRITIQUE_SYSTEM, DRAFT_SYSTEM, critiqueUserPrompt, draftSchema, draftUserPrompt,
  reviseUserPrompt, sha256, type ProfileForHook,
} from "./_local/prompts.ts";
import {
  parseDraftPayload, refusedForConsultationDraft, settleDecision, settlednessFor,
  verifyCritique, verifyDraft, type Objection, type SourceEndorsement,
} from "./_local/verify.ts";
import { generateHooks, type HookProfileRow, type HookRow, type HookSourceRow } from "./_local/generate.ts";
import { liaElementOf } from "./_local/factor-element.ts";
import { LIA_HOOK_CONTEXT_BLOCK } from "./_local/hook-context-block.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token, x-driver-token, x-internal-cron",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

const DRAFTER_MODEL = Deno.env.get("CORPUS_HOOK_DRAFTER_MODEL") ?? "claude-opus-5";
const CRITIC_MODEL = "gpt-4o"; // exactly the model id grade-single-assessment uses
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";

/**
 * Anthropic's structured-output schema dialect rejects array bounds
 * (`maxItems` / `minItems`) — Anthropic 400, run r1 third attempt. Strip them
 * before sending; the bounds are still enforced locally by verify.ts, which is
 * where they were ever load-bearing.
 */
function stripUnsupportedSchemaKeywords(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(stripUnsupportedSchemaKeywords);
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "maxItems" || k === "minItems") continue;
      out[k] = stripUnsupportedSchemaKeywords(v);
    }
    return out;
  }
  return node;
}

/** Opus, adaptive thinking (default), structured output, no temperature. */
async function opusCall(system: string, user: string, schema: Record<string, unknown>): Promise<{ text: string; responseId: string | null }> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: DRAFTER_MODEL,
      // LEDGER B5-6 item 3 — adaptive thinking spends this same budget, so a
      // 2048 ceiling let a revise finish its thinking block and emit no text
      // (stop_reason=max_tokens, blocks=[thinking]); that exception was the
      // reason two hooks stranded at 'critiqued'. Budget raised to 16k.
      max_tokens: 16_000,
      // Opus 5 thinks adaptively by default; an explicit `thinking` block is
      // rejected (Anthropic 400, run r1 second attempt).
      // `output_format` is deprecated (Anthropic 400, 2026-09-07 run r1).
      output_config: { format: { type: "json_schema", schema: stripUnsupportedSchemaKeywords(schema) } },

      system,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(180_000),
  });
  if (!r.ok) throw new Error(`Anthropic ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const body = await r.json();
  const blocks = Array.isArray(body?.content) ? body.content : [];
  // Adaptive thinking may put a thinking block first — take the first TEXT block.
  const text = blocks.find((b: { type?: string }) => b?.type === "text");
  if (!text || typeof text.text !== "string" || text.text.length === 0) {
    const types = blocks.map((b: { type?: string }) => String(b?.type ?? "unknown")).join(",") || "none";
    throw new Error(`Anthropic returned no text block (stop_reason=${String(body?.stop_reason ?? "unknown")}; blocks=[${types}])`);
  }
  return { text: String(text.text), responseId: body?.id ?? null };
}

/** Exactly the call shape in grade-single-assessment/index.ts. */
async function gptCall(system: string, user: string, maxTokens = 3000): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not set");
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CRITIC_MODEL, max_tokens: maxTokens, response_format: { type: "json_object" },
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!r.ok) throw new Error(`GPT ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const d = await r.json();
  return d.choices?.[0]?.message?.content ?? "";
}

// ── Source loading ──────────────────────────────────────────────────────────

async function loadProfile(profileId: string): Promise<ProfileForHook | null> {
  const { data, error } = await admin().from("authority_relevance_profiles").select("*").eq("id", profileId).maybeSingle();
  if (error) throw new Error(`profile read failed: ${error.message}`);
  return (data as ProfileForHook | null) ?? null;
}

async function loadSource(profile: ProfileForHook): Promise<{ excerpt: string; endorsement: SourceEndorsement; extra: Partial<ProfileForHook> }> {
  const db = admin();
  const quote = profile.extracted_quote ?? null;
  if (profile.source_table === "edpb_guidelines") {
    const { data } = await db.from("edpb_guidelines").select("excerpt_text,endorsement_status").eq("id", profile.source_row_id).maybeSingle();
    return {
      excerpt: sourceExcerpt(data?.excerpt_text ?? null, quote),
      endorsement: (data?.endorsement_status ?? null) as SourceEndorsement,
      extra: {},
    };
  }
  if (profile.source_table === "regulatory_guidance") {
    const { data } = await db.from("regulatory_guidance").select("full_text").eq("id", profile.source_row_id).maybeSingle();
    return { excerpt: sourceExcerpt(data?.full_text ?? null, quote), endorsement: null, extra: {} };
  }
  if (profile.source_table === "enforcement_actions") {
    const { data } = await db.from("enforcement_actions")
      .select("source_document_text,regulator,subject,decision_date,case_reference").eq("id", profile.source_row_id).maybeSingle();
    return {
      excerpt: sourceExcerpt(data?.source_document_text ?? null, quote),
      endorsement: null,
      extra: {
        regulator: data?.regulator ?? null, subject: data?.subject ?? null,
        decision_date: data?.decision_date ?? null, case_reference: data?.case_reference ?? null,
      },
    };
  }
  return { excerpt: "", endorsement: null, extra: {} };
}

async function loadHook(hookId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await admin().from("authority_hooks").select("*").eq("id", hookId).maybeSingle();
  if (error) throw new Error(`hook read failed: ${error.message}`);
  return (data as Record<string, unknown> | null) ?? null;
}

function hookForModel(hook: Record<string, unknown>) {
  return {
    hook_id: hook.id,
    material_facts: hook.material_facts ?? null,
    fact_atoms: hook.fact_atoms, distinguishing_atoms: hook.distinguishing_atoms,
    distinguishing_pairs: hook.distinguishing_pairs ?? null,
    not_distinguishable: hook.not_distinguishable, required_atoms: hook.required_atoms,
    finding_span: hook.finding_span, fact_pattern_paraphrase: hook.fact_pattern_paraphrase,
    finding_paraphrase: hook.finding_paraphrase, trigger_terms: hook.trigger_terms,
    recognised_proposition: hook.recognised_proposition ?? null,
    condition_text: hook.condition_text ?? null,
    condition_atoms: hook.condition_atoms ?? null,
    pinpoint: hook.pinpoint ?? null,
    settledness: hook.settledness,
  };
}

/** DOC 222 — the v2 columns a draft or revise writes (DDL: doc 225 §3). */
function draftColumns(draft: import("./_local/verify.ts").DraftPayload) {
  return {
    fact_atoms: draft.fact_atoms, distinguishing_atoms: draft.distinguishing_atoms,
    not_distinguishable: draft.not_distinguishable, required_atoms: draft.required_atoms,
    finding_span: draft.finding_span,
    fact_pattern_paraphrase: draft.fact_pattern_paraphrase,
    finding_paraphrase: draft.finding_paraphrase,
    trigger_terms: draft.trigger_terms,
    material_facts: draft.material_facts,
    distinguishing_pairs: draft.distinguishing_pairs,
    recognised_proposition: draft.recognised_proposition,
    condition_text: draft.condition_text,
    condition_atoms: draft.condition_atoms,
    pinpoint: draft.pinpoint,
  };
}

// ── Actions ─────────────────────────────────────────────────────────────────

async function actionDraft(profileId: string) {
  const profile = await loadProfile(profileId);
  if (!profile) return json({ error: `profile ${profileId} not found` }, 404);
  const registry = hookRegistryFor(profile.product);
  if (!registry) return json({ error: `unknown product "${profile.product}"` }, 400);

  const { excerpt, endorsement, extra } = await loadSource(profile);
  const full = { ...profile, ...extra } as ProfileForHook;

  if (refusedForConsultationDraft(full, endorsement)) {
    const row = await upsertHook({
      profile_id: profileId, product: profile.product, hook_status: "contested",
      finding_span: "", fact_pattern_paraphrase: "", finding_paraphrase: "",
      settledness: "R3",
      drafter: { model: DRAFTER_MODEL, refused: true, abstain_reason: "draft_consultation_source", drafted_at: new Date().toISOString() },
    });
    return json({ ok: true, hook_id: row?.id ?? null, hook_status: "contested", reason: "draft_consultation_source" });
  }

  const system = DRAFT_SYSTEM;
  const user = draftUserPrompt(full, excerpt, registry);
  const schema = draftSchema(profileId);
  const { text, responseId } = await opusCall(system, user, schema);

  const parsed = parseDraftPayload(text, profileId);
  if (!parsed.ok) {
    const row = await upsertHook({
      profile_id: profileId, product: profile.product, hook_status: "contested",
      finding_span: "", fact_pattern_paraphrase: "", finding_paraphrase: "",
      settledness: settlednessFor(full, endorsement),
      drafter: { model: DRAFTER_MODEL, raw: text, response_id: responseId, error: parsed.error, drafted_at: new Date().toISOString() },
    });
    return json({ ok: false, hook_id: row?.id ?? null, error: parsed.error }, 422);
  }
  const draft = parsed.draft;
  const verification = verifyDraft(draft, full, excerpt, registry);

  const row = await upsertHook({
    profile_id: profileId, product: profile.product,
    hook_status: verification.hook_status,
    ...draftColumns(draft),
    settledness: settlednessFor(full, endorsement),
    substring_checks_passed: verification.substring_checks_passed,
    vocabulary_checks_passed: verification.vocabulary_checks_passed,
    drafter: {
      model: DRAFTER_MODEL,
      contract: "doc222-v2",
      prompt_sha256: await sha256(`${system}\n\n${user}`),
      schema_sha256: await sha256(JSON.stringify(schema)),
      response_id: responseId,
      drafted_at: new Date().toISOString(),
      raw: text,
      abstain_reason: draft.abstain_reason,
      verification_errors: verification.errors,
      verification_warnings: verification.warnings,
    },
  });
  return json({
    ok: true, hook_id: row?.id ?? null, hook_status: verification.hook_status,
    errors: verification.errors, warnings: verification.warnings, abstain_reason: draft.abstain_reason,
  });
}

async function upsertHook(fields: Record<string, unknown>) {
  const db = admin();
  const { data: existing } = await db.from("authority_hooks")
    .select("id,hook_version").eq("profile_id", fields.profile_id as string)
    .order("hook_version", { ascending: false }).limit(1).maybeSingle();
  const payload = { ...fields, updated_at: new Date().toISOString() };
  if (existing?.id) {
    const { data, error } = await db.from("authority_hooks").update(payload).eq("id", existing.id).select("id").maybeSingle();
    if (error) throw new Error(`hook update failed: ${error.message}`);
    return data;
  }
  const { data, error } = await db.from("authority_hooks").insert({ ...payload, hook_version: 1 }).select("id").maybeSingle();
  if (error) throw new Error(`hook insert failed: ${error.message}`);
  return data;
}

async function actionCritique(hookId: string) {
  const hook = await loadHook(hookId);
  if (!hook) return json({ error: `hook ${hookId} not found` }, 404);
  const profile = await loadProfile(String(hook.profile_id));
  if (!profile) return json({ error: "profile not found" }, 404);
  const registry = hookRegistryFor(profile.product);
  if (!registry) return json({ error: `unknown product "${profile.product}"` }, 400);
  const { excerpt, extra } = await loadSource(profile);
  void extra;

  const system = CRITIQUE_SYSTEM;
  const user = critiqueUserPrompt(hookForModel(hook), excerpt, registry);
  const raw = await gptCall(system, user);
  const result = verifyCritique(
    raw,
    hookId,
    excerpt,
    (hook.fact_atoms as string[] | null) ?? [],
  );

  const priorRounds = Number((hook.critic as { rounds?: number } | null)?.rounds ?? 0);
  const { error } = await admin().from("authority_hooks").update({
    hook_status: "critiqued",
    critic: {
      model: CRITIC_MODEL,
      prompt_sha256: await sha256(`${system}\n\n${user}`),
      rounds: priorRounds + 1,
      objections: result.objections,
      residual_warnings: result.discarded,
      critiqued_at: new Date().toISOString(),
      raw,
    },
    updated_at: new Date().toISOString(),
  }).eq("id", hookId);
  if (error) throw new Error(`critique write failed: ${error.message}`);

  return json({ ok: result.ok, hook_id: hookId, verdict: result.verdict, objections: result.objections, discarded: result.discarded });
}

async function actionRevise(hookId: string) {
  const hook = await loadHook(hookId);
  if (!hook) return json({ error: `hook ${hookId} not found` }, 404);
  const round = Number(hook.round ?? 1);
  if (round >= 2) return json({ ok: false, hook_id: hookId, error: "revision budget exhausted (max 2 rounds)" }, 409);
  const profile = await loadProfile(String(hook.profile_id));
  if (!profile) return json({ error: "profile not found" }, 404);
  const registry = hookRegistryFor(profile.product);
  if (!registry) return json({ error: `unknown product "${profile.product}"` }, 400);
  const { excerpt, endorsement, extra } = await loadSource(profile);
  const full = { ...profile, ...extra } as ProfileForHook;

  const objections = (hook.critic as { objections?: Objection[] } | null)?.objections ?? [];
  const system = DRAFT_SYSTEM;
  const user = reviseUserPrompt(hookForModel(hook), objections);
  const schema = draftSchema(String(hook.profile_id));
  const { text, responseId } = await opusCall(system, user, schema);
  const parsed = parseDraftPayload(text, String(hook.profile_id));
  if (!parsed.ok) return json({ ok: false, hook_id: hookId, error: parsed.error }, 422);
  const draft = parsed.draft;
  const verification = verifyDraft(draft, full, excerpt, registry);

  const { error } = await admin().from("authority_hooks").update({
    ...draftColumns(draft),
    settledness: settlednessFor(full, endorsement),
    substring_checks_passed: verification.substring_checks_passed,
    vocabulary_checks_passed: verification.vocabulary_checks_passed,
    hook_status: verification.hook_status,
    round: round + 1,
    drafter: {
      model: DRAFTER_MODEL, contract: "doc222-v2", prompt_sha256: await sha256(`${system}\n\n${user}`),
      schema_sha256: await sha256(JSON.stringify(schema)), response_id: responseId,
      drafted_at: new Date().toISOString(), raw: text, abstain_reason: draft.abstain_reason,
      verification_errors: verification.errors, verification_warnings: verification.warnings,
      revision_of_round: round,
    },
    updated_at: new Date().toISOString(),
  }).eq("id", hookId);
  if (error) throw new Error(`revise write failed: ${error.message}`);

  return await actionCritique(hookId);
}

async function actionSettle(hookId: string) {
  const hook = await loadHook(hookId);
  if (!hook) return json({ error: `hook ${hookId} not found` }, 404);
  const profile = await loadProfile(String(hook.profile_id));
  const objections = (hook.critic as { objections?: Objection[] } | null)?.objections ?? [];
  const drafter = (hook.drafter as { verification_errors?: unknown[] } | null) ?? null;
  const pin = hook.pinpoint as { ref?: unknown; anchor_span?: unknown } | null;
  const decision = settleDecision({
    substring_checks_passed: hook.substring_checks_passed === true,
    vocabulary_checks_passed: hook.vocabulary_checks_passed === true,
    objections,
    outcome_posture: profile?.outcome_posture ?? null,
    not_distinguishable: hook.not_distinguishable === true,
    distinguishing_atoms: (hook.distinguishing_atoms as string[] | null) ?? [],
    round: Number(hook.round ?? 1),
    // DOC 222 — settle gates on the v2 fields the join will need.
    pinpoint_present: !!pin && typeof pin.ref === "string" && pin.ref.length > 0 && typeof pin.anchor_span === "string",
    proposition_split_present: typeof hook.recognised_proposition === "string" && hook.recognised_proposition.length > 0 &&
      typeof hook.condition_text === "string" && hook.condition_text.length > 0,
    verification_errors: Array.isArray(drafter?.verification_errors) ? drafter.verification_errors.length : 0,
  });
  if (decision.hook_status === null) {
    return json({ ok: true, hook_id: hookId, hook_status: hook.hook_status, pending: decision.reasons });
  }
  const notes = decision.reasons.length > 0 ? { settle_reasons: decision.reasons } : null;
  const patch: Record<string, unknown> = { hook_status: decision.hook_status, updated_at: new Date().toISOString() };
  if (notes) patch.lawyer_edits = { ...(hook.lawyer_edits as Record<string, unknown> ?? {}), ...notes };
  const { error } = await admin().from("authority_hooks").update(patch).eq("id", hookId);
  if (error) throw new Error(`settle write failed: ${error.message}`);
  return json({ ok: true, hook_id: hookId, hook_status: decision.hook_status, reasons: decision.reasons });
}

async function actionGenerate(product: string) {
  const registry = hookRegistryFor(product);
  if (!registry) return json({ error: `unknown product "${product}" — doc 213 registers no vocabulary for it` }, 400);
  const db = admin();
  const { data: hookRows, error: hookErr } = await db.from("authority_hooks").select("*").eq("product", product);
  if (hookErr) return json({ error: `authority_hooks read failed: ${hookErr.message}` }, 500);
  const rows = (hookRows ?? []) as unknown as HookRow[];

  const profileIds = [...new Set(rows.map((row) => row.profile_id))];
  const profiles = new Map<string, HookProfileRow>();
  const sources = new Map<string, HookSourceRow>();
  if (profileIds.length > 0) {
    const { data: profileRowsRaw, error: profileErr } = await db.from("authority_relevance_profiles")
      .select(
        "id,source_table,source_row_id,outcome_posture,instrument,factor_ids," +
          "use_case_class,relationship,data_categories,flags,curation_note," +
          "ratified_by,ratified_at,ledger_ref",
      )
      .in("id", profileIds);
    if (profileErr) return json({ error: `profile read failed: ${profileErr.message}` }, 500);
    // The select list is a concatenated string, so PostgREST cannot infer the
    // row shape; name it here rather than repeat a cast at every use.
    const profileRows = (profileRowsRaw ?? []) as unknown as (HookProfileRow & { source_row_id: string })[];
    // Citation + status facts (doc 222 §2.7), read from the SAME source rows
    // the drafter was given. A read error is returned, never swallowed into
    // "citation facts incomplete" for every row.
    const edpbIds = profileRows.filter((p) => p.source_table === "edpb_guidelines").map((p) => p.source_row_id);
    const endorsements = new Map<string, string | null>();
    const edpb = new Map<string, HookSourceRow>();
    if (edpbIds.length > 0) {
      const { data: guidelines, error } = await db.from("edpb_guidelines")
        .select("id,title,endorsement_status,adopted_date,source_url,status").in("id", edpbIds);
      if (error) return json({ error: `edpb_guidelines read failed: ${error.message}` }, 500);
      for (const g of guidelines ?? []) {
        endorsements.set(String(g.id), g.endorsement_status ?? null);
        edpb.set(String(g.id), {
          source_table: "edpb_guidelines", title: g.title ?? null, adopted_date: g.adopted_date ?? null,
          source_url: g.source_url ?? null, status: g.status ?? null,
        });
      }
    }
    const enfIds = profileRows.filter((p) => p.source_table === "enforcement_actions").map((p) => p.source_row_id);
    const enf = new Map<string, HookSourceRow>();
    if (enfIds.length > 0) {
      const { data: actions, error } = await db.from("enforcement_actions")
        .select("id,regulator,subject,decision_date,appeal_status").in("id", enfIds);
      if (error) return json({ error: `enforcement_actions read failed: ${error.message}` }, 500);
      for (const a of actions ?? []) {
        enf.set(String(a.id), {
          source_table: "enforcement_actions", regulator: a.regulator ?? null, subject: a.subject ?? null,
          decision_date: a.decision_date ?? null, appeal_status: a.appeal_status ?? null,
        });
      }
    }
    const guidIds = profileRows.filter((p) => p.source_table === "regulatory_guidance").map((p) => p.source_row_id);
    const guid = new Map<string, HookSourceRow>();
    if (guidIds.length > 0) {
      const { data: guidance, error } = await db.from("regulatory_guidance")
        .select("id,title,regulator,document_type").in("id", guidIds);
      if (error) return json({ error: `regulatory_guidance read failed: ${error.message}` }, 500);
      for (const g of guidance ?? []) {
        guid.set(String(g.id), { source_table: "regulatory_guidance", title: g.title ?? null, regulator: g.regulator ?? null, document_type: g.document_type ?? null });
      }
    }

    for (const p of profileRows) {
      profiles.set(p.id, { ...p, endorsement: endorsements.get(p.source_row_id) ?? null } as unknown as HookProfileRow);
      const src = p.source_table === "enforcement_actions"
        ? enf.get(p.source_row_id)
        : p.source_table === "edpb_guidelines"
        ? edpb.get(p.source_row_id)
        : p.source_table === "regulatory_guidance"
        ? guid.get(p.source_row_id)
        : undefined;
      if (src) sources.set(p.id, src);
    }
  }

  const day = new Date().toISOString().slice(0, 10);
  const result = generateHooks({
    product, rows, profiles, sources,
    elementOf: liaElementOf,
    hooksVersion: `${registry.export_prefix.toLowerCase()}-hooks-v2-${day}-0`,
    outputPath: registry.output_path,
    exportPrefix: registry.export_prefix,
    // The three [RATIFY] blocks, copied VERBATIM from the canonical pinned
    // file (_local/hook-context-block.ts; pinned by test after CRLF/LF
    // normalisation) — no longer a placeholder.
    contextBlock: LIA_HOOK_CONTEXT_BLOCK,
  });

  return json({
    ...result,
    output_path: registry.output_path,
    context_blocks: "verbatim copy of the canonical [RATIFY] blocks",
  }, result.ok ? 200 : 422);
}


async function actionStatus(runId?: string) {
  const db = admin();
  const { data: hooks } = await db.from("authority_hooks").select("hook_status,drafter,critic,round");
  const counts: Record<string, number> = {};
  const contestedReasons: Record<string, number> = {};
  let draftCalls = 0, critiqueCalls = 0;
  for (const hook of hooks ?? []) {
    counts[hook.hook_status] = (counts[hook.hook_status] ?? 0) + 1;
    if (hook.hook_status === "contested") {
      const reason = String((hook.drafter as { abstain_reason?: string } | null)?.abstain_reason ?? "unspecified");
      contestedReasons[reason] = (contestedReasons[reason] ?? 0) + 1;
    }
    if (hook.drafter) draftCalls += Number((hook.round as number | null) ?? 1);
    if (hook.critic) critiqueCalls += Number((hook.critic as { rounds?: number }).rounds ?? 1);
  }
  let run = null;
  if (runId) {
    const { data } = await db.from("authority_hook_runs").select("*").eq("run_id", runId).maybeSingle();
    run = data ?? null;
  }
  return json({
    ok: true, counts, contested_reasons: contestedReasons,
    telemetry: { drafter_model: DRAFTER_MODEL, critic_model: CRITIC_MODEL, draft_calls: draftCalls, critique_calls: critiqueCalls },
    run,
  });
}

const PROFILES_PER_TICK = 4;

async function actionDrive(runId: string) {
  const db = admin();
  const { data: run } = await db.from("authority_hook_runs").select("*").eq("run_id", runId).maybeSingle();
  if (!run) return json({ error: `run ${runId} not found` }, 404);
  if (run.status !== "running") return json({ ok: true, run_id: runId, status: run.status, processed: 0 });

  const ids = (run.profile_ids ?? []) as string[];
  const cursor = Number(run.cursor ?? 0);
  const slice = ids.slice(cursor, cursor + PROFILES_PER_TICK);
  if (slice.length === 0) {
    await db.from("authority_hook_runs").update({ status: "finished", finished_at: new Date().toISOString() }).eq("run_id", runId);
    return json({ ok: true, run_id: runId, status: "finished", processed: 0 });
  }

  const outcomes: Record<string, unknown>[] = [];
  for (const profileId of slice) {
    try {
      const drafted = await (await actionDraft(profileId)).json();
      const hookId = drafted?.hook_id as string | null;
      if (!hookId) { outcomes.push({ profile_id: profileId, error: drafted?.error ?? "no hook" }); continue; }
      if (drafted?.hook_status === "contested") { outcomes.push({ profile_id: profileId, hook_id: hookId, hook_status: "contested" }); continue; }
      let critique = await (await actionCritique(hookId)).json();
      let reviseError: string | null = null;
      // LEDGER A10-19 (2026-09-08) — a draft can carry a CODE-level verification
      // error (a dropped qualifier, a missing span, an unanchored pinpoint) that
      // the critic never objects to, because the critic reviews legal accuracy,
      // not the mechanical checks verify.ts already ran. The old condition here
      // triggered a revise ONLY on a blocking critic objection, so a
      // verification-only defect at round 1 left `settleDecision` with
      // `reasons.length > 0` and no way to reach round 2 — the hook was
      // stranded at hook_status='critiqued' forever, never re-drafted. Found
      // when hook run r2b left `a22b1399` stuck this way with no critic
      // objection above "warn" and a real error
      // ("condition_text drops the qualifier \"might\""). Revise is now
      // attempted whenever EITHER the critic blocks OR the draft itself has an
      // outstanding verification error — the round-2 ceiling is unchanged.
      const hasBlockingObjection = critique?.objections?.some((o: Objection) => o.severity === "block");
      const hasVerificationErrors = Array.isArray(drafted?.errors) && drafted.errors.length > 0;
      if (hasBlockingObjection || hasVerificationErrors) {
        // LEDGER B5-6 item 3 — a throwing revise (model call or write failure)
        // used to escape to the outer catch, so settle never ran and the hook
        // was left stranded at hook_status='critiqued'. Revise failure is now
        // recorded and the hook is ALWAYS settled (contested at round >= 2).
        try {
          critique = await (await actionRevise(hookId)).json();
        } catch (e) {
          reviseError = (e as Error).message;
        }
      }
      const settled = await (await actionSettle(hookId)).json();
      outcomes.push({
        profile_id: profileId,
        hook_id: hookId,
        hook_status: settled?.hook_status ?? null,
        ...(reviseError ? { revise_error: reviseError } : {}),
      });
    } catch (e) {
      outcomes.push({ profile_id: profileId, error: (e as Error).message });
    }
  }

  const nextCursor = cursor + slice.length;
  const finished = nextCursor >= ids.length;
  await db.from("authority_hook_runs").update({
    cursor: nextCursor,
    status: finished ? "finished" : "running",
    finished_at: finished ? new Date().toISOString() : null,
    notes: { last_tick: new Date().toISOString(), outcomes },
  }).eq("run_id", runId);

  return json({ ok: true, run_id: runId, processed: slice.length, cursor: nextCursor, finished, outcomes });
}

// ── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Internal driver auth: pg_cron cannot read edge-function env secrets, so the
  // scheduled driver presents a DB-held handshake token instead. Auth only.
  const adminTok = req.headers.get("x-admin-token");
  const driverTok = req.headers.get("x-driver-token");
  let internalByToken = !!adminTok && adminTok === Deno.env.get("ADMIN_SECRET_TOKEN");
  if (!internalByToken && driverTok) {
    const { data: tokenRow } = await admin().from("internal_driver_tokens")
      .select("token").eq("name", "authority-hooks").maybeSingle();
    if (tokenRow?.token && tokenRow.token === driverTok) internalByToken = true;
  }
  if (!internalByToken) {
    const caller = await verifyCaller(req);
    if (!caller.internal) {
      if (!caller.userId) return json({ error: "forbidden" }, 403);
      const { data: isAdmin } = await admin().rpc("has_role", { _user_id: caller.userId, _role: "admin" });
      if (!isAdmin) return json({ error: "forbidden" }, 403);
    }
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const action = typeof body.action === "string" ? body.action : "status";
  try {
    switch (action) {
      case "draft": {
        const profileId = String(body.profile_id ?? "");
        if (!profileId) return json({ error: "missing required field: profile_id" }, 400);
        return await actionDraft(profileId);
      }
      case "critique": {
        const hookId = String(body.hook_id ?? "");
        if (!hookId) return json({ error: "missing required field: hook_id" }, 400);
        return await actionCritique(hookId);
      }
      case "revise": {
        const hookId = String(body.hook_id ?? "");
        if (!hookId) return json({ error: "missing required field: hook_id" }, 400);
        return await actionRevise(hookId);
      }
      case "settle": {
        const hookId = String(body.hook_id ?? "");
        if (!hookId) return json({ error: "missing required field: hook_id" }, 400);
        return await actionSettle(hookId);
      }
      case "generate":
        return await actionGenerate(String(body.product ?? "lia"));
      case "status":
        return await actionStatus(typeof body.run_id === "string" ? body.run_id : undefined);
      case "drive": {
        const runId = String(body.run_id ?? "");
        if (!runId) return json({ error: "missing required field: run_id" }, 400);
        return await actionDrive(runId);
      }
      default:
        return json({ error: `unknown action "${action}"` }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
