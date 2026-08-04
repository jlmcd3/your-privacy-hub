// MODEL A/B HARNESS (dispatch 1) — per-run generation-model selection.
//
// One allowlist, one resolver, one request-scoped carrier. Every customer
// product generator that calls the Anthropic Messages API for its PRODUCT
// output reads the model from here instead of hard-coding the string, so a
// batch can generate the SAME fixture on two models and compare.
//
// HARD BOUNDARY: this module governs GENERATION models only. Grader / rubric /
// cross-review model strings are pinned in run-quality-batch and MUST NEVER
// read from here. See tests/edge/_tests/model-ab-grader-pin.test.ts.
//
// Internal micro-tasks (haiku classifiers, summarisers, citation auditors)
// keep their explicit model strings — they are not part of the A/B surface.

export const DEFAULT_GENERATION_MODEL = "claude-sonnet-4-6";
export const AB_ALT_GENERATION_MODEL = "claude-fable-5";

export const ALLOWED_GENERATION_MODELS: readonly string[] = [
  DEFAULT_GENERATION_MODEL,
  AB_ALT_GENERATION_MODEL,
];

/** Short, filename-safe slug per model — used in PDF/zip filenames and columns. */
export const GENERATION_MODEL_SLUG: Record<string, string> = {
  [DEFAULT_GENERATION_MODEL]: "sonnet46",
  [AB_ALT_GENERATION_MODEL]: "fable5",
};

export function generationModelSlug(model: string | null | undefined): string {
  if (!model) return GENERATION_MODEL_SLUG[DEFAULT_GENERATION_MODEL];
  return GENERATION_MODEL_SLUG[model] ?? model.replace(/[^a-z0-9]+/gi, "").slice(0, 16).toLowerCase();
}

export class GenerationModelError extends Error {
  code = "invalid_generation_model";
  constructor(raw: unknown) {
    super(
      `invalid generation_model: ${JSON.stringify(raw)} — allowed: ${ALLOWED_GENERATION_MODELS.join(", ")}`,
    );
    this.name = "GenerationModelError";
  }
}

/**
 * Resolve an optional caller-supplied generation_model.
 * Absent / null / "" → the current default. Anything not on the allowlist
 * throws GenerationModelError (callers surface it as a 400).
 */
export function resolveGenerationModel(raw: unknown): string {
  if (raw === undefined || raw === null || raw === "") return DEFAULT_GENERATION_MODEL;
  if (typeof raw !== "string") throw new GenerationModelError(raw);
  const v = raw.trim();
  if (!ALLOWED_GENERATION_MODELS.includes(v)) throw new GenerationModelError(raw);
  return v;
}

export function isAllowedGenerationModel(raw: unknown): boolean {
  try { resolveGenerationModel(raw); return true; } catch { return false; }
}

// ── Per-call timeout policy ──────────────────────────────────────────────────
// Item 4 (latency/timeout sanity): fable-5 is materially slower per call. The
// generators are all background/202 paths, so the only real ceiling is the
// per-fetch AbortSignal. Give the alternate model a longer per-call window;
// the default model's window is unchanged.
export const GENERATION_TIMEOUT_MS: Record<string, number> = {
  [DEFAULT_GENERATION_MODEL]: 330_000,
  [AB_ALT_GENERATION_MODEL]: 600_000,
};

/**
 * Per-call timeout for a model. When the call site already has a timeout,
 * pass it as `base`: the result is never SHORTER than the base (no retry- or
 * policy change for the default model), only longer for the slower model.
 */
export function generationTimeoutMs(model: string, base?: number): number {
  const policy = GENERATION_TIMEOUT_MS[model] ?? GENERATION_TIMEOUT_MS[DEFAULT_GENERATION_MODEL];
  return base ? Math.max(base, policy) : policy;
}

// ── Request-scoped carrier ───────────────────────────────────────────────────
// Generators have many internal call sites behind local `callAnthropic`
// helpers. Threading a parameter through every one of them would be a very
// wide, high-risk edit; a module-level variable would cross-contaminate
// concurrent requests sharing an isolate (which A/B batches deliberately
// create). AsyncLocalStorage gives per-request isolation with a one-line edit
// at each helper.

import { AsyncLocalStorage } from "node:async_hooks";

export interface GenerationScope {
  model: string;
  /** Row the generation belongs to (assessment_id / dpia_id / document_id). */
  sourceRowId: string | null;
}

const als = new AsyncLocalStorage<GenerationScope>();

/** The generation model for the in-flight request; default outside any scope. */
export function currentGenerationModel(): string {
  return als.getStore()?.model ?? DEFAULT_GENERATION_MODEL;
}

/** The row id for the in-flight request, for api_usage attribution. */
export function currentSourceRowId(): string | null {
  return als.getStore()?.sourceRowId ?? null;
}

/** Run `fn` with `model` as the ambient generation model. */
export function withGenerationModel<T>(
  model: string,
  fn: () => T,
  sourceRowId: string | null = null,
): T {
  return als.run({ model, sourceRowId }, fn);
}

const corsJson = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const ROW_ID_KEYS = ["assessment_id", "dpia_id", "document_id", "playbook_id", "id"];

function extractSourceRowId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  for (const k of ROW_ID_KEYS) {
    const v = (body as Record<string, unknown>)[k];
    if (typeof v === "string" && v) return v;
  }
  return null;
}

/**
 * Wrap a Deno.serve handler so `generation_model` on the JSON body is
 * validated once and made ambient for the whole request (including work
 * continued in EdgeRuntime.waitUntil, which inherits the async context).
 *
 * Usage:  Deno.serve(serveWithGenerationModel(async (req) => { ... }))
 */
export function serveWithGenerationModel(
  handler: (req: Request) => Promise<Response> | Response,
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    let model = DEFAULT_GENERATION_MODEL;
    let sourceRowId: string | null = null;
    if (req.method !== "OPTIONS" && req.method !== "GET") {
      try {
        const body = await req.clone().json();
        model = resolveGenerationModel((body as any)?.generation_model);
        sourceRowId = extractSourceRowId(body);
      } catch (e) {
        if (e instanceof GenerationModelError) {
          return new Response(JSON.stringify({ error: e.message, code: e.code }), {
            status: 400,
            headers: corsJson,
          });
        }
        // Non-JSON / unreadable body: leave the handler to deal with it.
      }
    }
    return await withGenerationModel(model, async () => await handler(req), sourceRowId);
  };
}

/** Stamp the model actually used onto a report's `_meta`. Returns the report. */
export function stampGenerationModel<T extends Record<string, any>>(
  reportData: T,
  model: string = currentGenerationModel(),
): T {
  (reportData as any)._meta = { ...((reportData as any)._meta ?? {}), generation_model: model };
  return reportData;
}
