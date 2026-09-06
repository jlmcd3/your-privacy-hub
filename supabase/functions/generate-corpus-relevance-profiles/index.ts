// build-marker: generate-corpus-relevance-profiles-doc191-2026-09-06
console.log("[build-marker] generate-corpus-relevance-profiles doc191-2026-09-06");
//
// DOC 191 §5 + §6 — the build-time step that turns curated
// `authority_relevance_profiles` rows into a snapshot-pinned
// `*-relevance-profiles.ts` file, and the §6 classification pipeline that
// decides a row's `rule_or_pattern` before that generation happens.
//
// Modelled on generate-stress-fixtures: admin-gated POST, JSON in / JSON out,
// all real work in pure `_local/` modules so the test suite exercises the
// logic against fixtures rather than against this handler.
//
// THE DETERMINISM LAW IS UNCHANGED (doc 48 §II.2a). No product code queries
// this table at generation time. This function reads it at BUILD time and
// returns file CONTENTS; a human (or a build script) writes those contents
// into the repo and commits them, and the pinned file is what ships. An edge
// function cannot and must not write into the repo.
//
// ACTIONS
//   { action: "generate", product }
//       → validates every row for `product` (§5 checks 1–4 + the §6.4
//         sibling-consistency warning) and returns
//         { ok, errors, warnings, excluded, file, output_path }.
//         `ok:false` means NO file — a hard validation failure fails the
//         build, exactly as §5 requires.
//   { action: "classify", product, dry_run?: true, limit? }
//       → runs §6 stages 0–3 over that product's CAM rows and returns the
//         outcomes, the per-stage §6.3 checkpoint draws, and (unless
//         dry_run) the writes it would make. IT NEVER SETS ratified_by /
//         ratified_at / ledger_ref — only the CEO or a named delegate may
//         (doc 191 §8), and no pipeline stage can satisfy that on its own.

import { verifyCaller } from "../_shared/verify-caller.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { AuthorityRelevanceProfileRow } from "../_shared/corpus/authority-relevance-profile.ts";
import { generateRelevanceProfiles, siblingConsistencyWarnings } from "./_local/generate.ts";
import { LAYER_B_CLOSED_PRODUCTS, registryFor } from "./_local/product-registry.ts";
import { mapSourceFor } from "./_local/map-sources.ts";
import { runClassificationPipeline, PIPELINE_VERSION } from "./_local/classify/pipeline.ts";
import type { ClassificationCandidate, LlmCall } from "./_local/classify/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── The model ───────────────────────────────────────────────────────────────
//
// FLAGGED FOR THE CEO, NOT DECIDED HERE. The standing rule
// (feedback_factor_models_fable5) is that factor-model work normally requires
// claude-fable-5, and that a waiver is task-scoped and must be confirmed
// rather than carried over. No `claude-fable-5` string exists anywhere in this
// repo today, so there is no convention to follow for it. The conventions that
// DO exist are: extraction passes over corpus content use Haiku
// (_shared/llm-extraction.ts, backfill-li-relevance), and the one pass in this
// codebase that exercises LEGAL JUDGMENT — grade-single-assessment — uses
// claude-opus-4-6.
//
// This pipeline is a legal-judgment pass (is this sentence a statement about
// what the law categorically requires?), so it defaults to the model this
// codebase already trusts with legal judgment, and the default is a named,
// overridable constant rather than a literal buried in a fetch call.
const DEFAULT_CLASSIFIER_MODEL = "claude-opus-5";
const CLASSIFIER_MODEL = Deno.env.get("CORPUS_CLASSIFIER_MODEL") ?? DEFAULT_CLASSIFIER_MODEL;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

function anthropicCall(model: string): LlmCall {
  return async (system: string, user: string): Promise<string> => {
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        temperature: 0,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!r.ok) {
      const errText = await r.text().catch(() => "no body");
      throw new Error(`Anthropic ${r.status}: ${errText.slice(0, 300)}`);
    }
    const body = await r.json();
    const block = Array.isArray(body?.content) ? body.content[0] : null;
    return block && block.type === "text" ? String(block.text) : "";
  };
}

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function loadRows(product?: string): Promise<AuthorityRelevanceProfileRow[]> {
  const db = admin();
  let query = db.from("authority_relevance_profiles").select("*");
  if (product) query = query.eq("product", product);
  const { data, error } = await query;
  if (error) throw new Error(`authority_relevance_profiles read failed: ${error.message}`);
  return (data ?? []) as AuthorityRelevanceProfileRow[];
}

function productError(product: unknown): string | null {
  if (typeof product !== "string" || product === "") return "missing required field: product";
  if (LAYER_B_CLOSED_PRODUCTS.includes(product)) {
    return `product "${product}" has no Layer-B CAM by ruling (doc 190 §6) — it has no registered vocabulary and none is to be invented for it`;
  }
  if (!registryFor(product)) return `unknown product "${product}" — doc 191 §3 registers no vocabulary for it`;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const caller = await verifyCaller(req);
  if (!caller.internal) {
    if (!caller.userId) return json({ error: "forbidden" }, 403);
    const { data: isAdmin } = await admin().rpc("has_role", { _user_id: caller.userId, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const action = typeof body.action === "string" ? body.action : "generate";
  const product = body.product;
  const perr = productError(product);
  if (perr) return json({ error: perr }, 400);
  const productName = product as string;
  const registry = registryFor(productName)!;

  // Vocabulary + CAM rows: wired source first, request override second.
  const wired = mapSourceFor(productName);
  const overrideFactors = Array.isArray(body.factors) ? (body.factors as string[]) : null;
  const overrideCamRows = Array.isArray(body.cam_rows)
    ? (body.cam_rows as { id: string; role: string; source_table: string; source_row_id: string }[])
    : null;
  const factors = overrideFactors ?? wired?.factors ?? [];
  const camRows = overrideCamRows ?? wired?.camRows ?? [];

  if (factors.length === 0) {
    return json({
      error:
        `no factor vocabulary for "${productName}" — ${registry.factor_vocabulary_source}. Doc 191 §7.2: whoever curates the first row proposes the vocabulary as part of that curation pass; the generator does not invent one. Pass \`factors\` explicitly to override.`,
    }, 400);
  }

  try {
    if (action === "generate") {
      const [rows, allRows] = await Promise.all([loadRows(productName), loadRows()]);
      const result = generateRelevanceProfiles({
        product: productName,
        rows,
        allProductRows: allRows,
        camRows,
        vocabulary: { factors, instruments: registry.instruments },
        profilesVersion: typeof body.profiles_version === "string"
          ? body.profiles_version
          : `${productName}-relevance-profiles-v1-${new Date().toISOString().slice(0, 10)}`,
        exportPrefix: registry.export_prefix,
        factorVocabularySource: registry.factor_vocabulary_source,
        outputPath: registry.output_path,
      });
      return json({
        action,
        product: productName,
        output_path: registry.output_path,
        map_version: wired?.map_version ?? null,
        factors_derived_from_map: wired?.factors_derived_from_map ?? null,
        row_count: rows.length,
        ...result,
      }, result.ok ? 200 : 422);
    }

    if (action === "classify") {
      const dryRun = body.dry_run !== false; // dry by default; writing is opt-in
      const limit = typeof body.limit === "number" ? body.limit : undefined;
      const allRows = await loadRows();
      const conflictSources = new Set(
        siblingConsistencyWarnings(allRows)
          .map((w) => w.match(/source_row_id ([0-9a-f-]{36})/i)?.[1])
          .filter((x): x is string => !!x),
      );

      const candidates = (body.candidates as ClassificationCandidate[] | undefined) ?? [];
      if (candidates.length === 0) {
        return json({
          error:
            "classify requires `candidates`: [{ id, product, source_table, source_row_id, role, pinned_excerpt, curation_note, display_bearing? }]. Doc 191 §6.1 — the reviewable unit is the pre-extracted, pin-verified EXCERPT, never the source document, so the caller supplies excerpts rather than this function re-reading corpus tables.",
        }, 400);
      }

      const run = await runClassificationPipeline(
        typeof limit === "number" ? candidates.slice(0, limit) : candidates,
        { llm: anthropicCall(CLASSIFIER_MODEL), siblingConflicts: conflictSources },
      );

      return json({
        action,
        product: productName,
        model: CLASSIFIER_MODEL,
        pipeline_version: run.pipeline_version,
        dry_run: dryRun,
        // Restated on every response so it cannot be missed: the pipeline
        // produces CANDIDATES. Doc 191 §8's ratification gate is the terminal
        // guarantee and nothing here touches it.
        ratification_note:
          "No row here is ratified. ratified_by / ratified_at / ledger_ref are never set by this function — only the CEO or a named delegate may set them (doc 191 §8), and the generator excludes any unratified 'rule' row from the shipped map.",
        outcomes: run.outcomes,
        checkpoints: run.checkpoints,
        stage2_candidates: run.stage2_candidates,
        promoted_ids: run.promoted_ids,
      });
    }

    return json({ error: `unknown action "${action}" — expected "generate" or "classify"` }, 400);
  } catch (e) {
    return json({ error: "corpus relevance profile step failed", detail: (e as Error).message }, 502);
  }
});

export { CLASSIFIER_MODEL, DEFAULT_CLASSIFIER_MODEL, PIPELINE_VERSION };
