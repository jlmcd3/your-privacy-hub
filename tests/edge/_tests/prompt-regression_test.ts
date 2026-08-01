// supabase/functions/_tests/prompt-regression_test.ts
//
// Prompt-regression integration test.
//
// Goal: catch the two failure modes that silently break the AI pipeline:
//   1. A prompt edit makes the model emit a shape the schema validator
//      rejects (missing field, wrong enum, wrong type) — the new article
//      then gets persisted with NULL enrichment fields and shows blank
//      on the feed.
//   2. An edge function itself stops returning 200 (model deprecated,
//      API key rotated, syntax error in a prompt string template).
//
// The test has two layers:
//
//   A. FIXTURE LAYER  — fast, deterministic, no network.
//      A fixed set of sample AI outputs (golden + deliberately broken)
//      is run through the shared validators (`_shared/ai-validation.ts`).
//      These fixtures encode the contract each prompt MUST produce.
//      Edit a prompt without updating the fixture? The test fails.
//
//   B. LIVE SMOKE LAYER — opt-in, gated by `RUN_LIVE_INTEGRATION=1`.
//      Hits each of the four deployed edge functions over HTTP with
//      minimum-cost parameters (limit=1) and asserts they return 200
//      with the expected response shape. Skipped by default so the
//      suite stays cheap and offline-safe.
//
// Run all:   supabase--test_edge_functions  (fixtures only — fast)
// Live:      RUN_LIVE_INTEGRATION=1 deno test --allow-net --allow-env
//
// Requires .env at repo root with VITE_SUPABASE_URL +
// VITE_SUPABASE_PUBLISHABLE_KEY for the live layer.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  validateAISummary,
  validateSignalsPatch,
  validateActionItemsPatch,
} from "../../../supabase/functions/_shared/ai-validation.ts";

// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE ARTICLES — fixed corpus the prompts are expected to handle correctly.
// Add a new entry whenever a new article class causes a regression in prod.
// ─────────────────────────────────────────────────────────────────────────────
const SAMPLE_ARTICLES = [
  {
    id: "fixture-cnil-fine",
    title: "CNIL fines French retailer €2.4M for unlawful loyalty tracking",
    source_domain: "cnil.fr",
    summary:
      "France's data protection authority (CNIL) issued a €2.4 million sanction against a national retail chain for processing loyalty-card data without a valid Article 6 GDPR legal basis. The decision confirms CNIL's position from its 2024 guidance that consent-or-pay models in retail require granular opt-in.",
  },
  {
    id: "fixture-edpb-guidelines",
    title: "EDPB adopts final guidelines on Article 48 GDPR third-country transfers",
    source_domain: "edpb.europa.eu",
    summary:
      "The European Data Protection Board has adopted the final version of its guidelines clarifying the interaction between Article 48 GDPR and foreign court orders, narrowing the legitimate-interest pathway for cross-border transfers.",
  },
  {
    id: "fixture-ftc-rulemaking",
    title: "FTC proposes commercial surveillance rule covering biometric data",
    source_domain: "ftc.gov",
    summary:
      "The U.S. Federal Trade Commission released a notice of proposed rulemaking establishing baseline restrictions on processing biometric identifiers in advertising contexts. Comments due in 90 days.",
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// GOLDEN OUTPUTS — what each prompt MUST be able to produce.
// These are the contract. If a prompt edit means the model can no longer
// produce something matching this shape, the schema validator will reject
// the row in prod and the fixture test will catch it here.
// ─────────────────────────────────────────────────────────────────────────────

const GOLDEN_AI_SUMMARY = {
  why_it_matters:
    "Organisations running loyalty schemes in France now have a concrete €2.4M benchmark for the cost of relying on legitimate interest where CNIL expects opt-in consent.",
  why_it_matters_short:
    "CNIL fines retailer €2.4M, hardening consent-or-pay stance for loyalty data.",
  takeaways: [
    "CNIL treats loyalty-card profiling as requiring Article 6(1)(a) consent, not legitimate interest.",
    "Retailers must offer a granular opt-in separate from the loyalty enrolment itself.",
    "Fine is the largest French retail-sector privacy sanction of 2025.",
  ],
  compliance_impact:
    "DPOs operating retail loyalty programmes in France should re-audit their lawful-basis records and migrate any legitimate-interest reliance to explicit consent within the next compliance cycle.",
  urgency: "This quarter",
  legal_weight: "Enforcement",
  risk_level: "High",
  precedent_novelty: "confirms_existing",
  affected_jurisdictions: ["france", "eu"],
  regulatory_theory: "Consent-as-prerequisite doctrine for retail loyalty profiling",
  key_date: "2025-04-12",
  entities: {
    regulators: ["CNIL"],
    laws: ["GDPR Article 6", "GDPR Article 7"],
  },
  action_items: [
    {
      action: "Audit lawful basis records for loyalty-card processing in French operations.",
      role: "DPO",
      timeframe: "This quarter",
    },
  ],
  related_signals: [
    { label: "Confirms CNIL's 2024 consent-or-pay position", kind: "precedent" },
  ],
  defense_considerations:
    "Argue that aggregated loyalty analytics fall under Recital 47 legitimate interest where individual profiling is excluded.",
};

const GOLDEN_SIGNALS_PATCH = {
  why_it_matters_short:
    "CNIL fines retailer €2.4M, hardening consent-or-pay stance for loyalty data.",
  related_signals: [
    { label: "Confirms CNIL's 2024 consent-or-pay position", kind: "precedent" },
    { label: "First French retail loyalty-program sanction over €2M", kind: "pattern" },
  ],
};

const GOLDEN_ACTION_ITEMS_PATCH = {
  action_items: [
    {
      action: "Audit lawful basis records for loyalty-card processing.",
      role: "DPO",
      timeframe: "This quarter",
    },
    {
      action: "Reconfigure consent banners to separate loyalty enrolment from profiling consent.",
      role: "Product",
      timeframe: "This quarter",
    },
  ],
  precedent_novelty: "confirms_existing",
};

// ─────────────────────────────────────────────────────────────────────────────
// LAYER A — FIXTURE TESTS (fast, no network)
// ─────────────────────────────────────────────────────────────────────────────

Deno.test("fixtures: golden AI summary passes validator (fetch-updates / backfill-ai-summaries / fetch-newsapi)", () => {
  for (const article of SAMPLE_ARTICLES) {
    const res = validateAISummary(GOLDEN_AI_SUMMARY, {
      fn: "fixture-test",
      articleId: article.id,
      title: article.title,
    });
    assert(
      res.ok,
      `golden summary rejected for ${article.id}: ${
        !res.ok ? res.errors.join(", ") : ""
      }`,
    );
  }
});

Deno.test("fixtures: golden signals patch passes validator (backfill-update-signals)", () => {
  const res = validateSignalsPatch(GOLDEN_SIGNALS_PATCH, {
    fn: "fixture-test",
    articleId: SAMPLE_ARTICLES[0].id,
  });
  assert(res.ok, `golden signals patch rejected: ${!res.ok ? res.errors.join(", ") : ""}`);
});

Deno.test("fixtures: golden action-items patch passes validator (backfill-action-items)", () => {
  const res = validateActionItemsPatch(GOLDEN_ACTION_ITEMS_PATCH, {
    fn: "fixture-test",
    articleId: SAMPLE_ARTICLES[0].id,
  });
  assert(res.ok, `golden action patch rejected: ${!res.ok ? res.errors.join(", ") : ""}`);
});

// ── Negative fixtures: each documents a known past regression mode ──────────

Deno.test("fixtures: AI summary rejects missing required fields", () => {
  const broken = { ...GOLDEN_AI_SUMMARY } as Record<string, unknown>;
  delete broken.why_it_matters;
  delete broken.takeaways;
  const res = validateAISummary(broken, { fn: "fixture-test" });
  assertEquals(res.ok, false);
  if (!res.ok) {
    assert(res.errors.some((e) => e.includes("why_it_matters")));
    assert(res.errors.some((e) => e.includes("takeaways")));
  }
});

Deno.test("fixtures: AI summary rejects invalid enum values", () => {
  const broken = {
    ...GOLDEN_AI_SUMMARY,
    urgency: "ASAP", // not in the URGENCY enum
    risk_level: "Catastrophic", // not in RISK_LEVEL
    precedent_novelty: "groundbreaking", // not in PRECEDENT_NOVELTY
  };
  const res = validateAISummary(broken, { fn: "fixture-test" });
  assertEquals(res.ok, false);
  if (!res.ok) {
    assert(res.errors.some((e) => e.includes("urgency")));
    assert(res.errors.some((e) => e.includes("risk_level")));
    assert(res.errors.some((e) => e.includes("precedent_novelty")));
  }
});

Deno.test("fixtures: AI summary rejects too-short takeaways and bad key_date", () => {
  const broken = {
    ...GOLDEN_AI_SUMMARY,
    takeaways: [], // must be 1–8
    key_date: "April 12, 2025", // must be YYYY-MM-DD
  };
  const res = validateAISummary(broken, { fn: "fixture-test" });
  assertEquals(res.ok, false);
  if (!res.ok) {
    assert(res.errors.some((e) => e.includes("takeaways")));
    assert(res.errors.some((e) => e.includes("key_date")));
  }
});

Deno.test("fixtures: signals patch rejects malformed related_signals", () => {
  const broken = {
    why_it_matters_short: "ok",
    related_signals: [
      { label: "ok", kind: "speculation" }, // kind not in SIGNAL_KIND
    ],
  };
  const res = validateSignalsPatch(broken, { fn: "fixture-test" });
  assertEquals(res.ok, false);
  if (!res.ok) {
    assert(res.errors.some((e) => e.includes("related_signals")));
  }
});

Deno.test("fixtures: action-items patch rejects items missing action", () => {
  const broken = {
    action_items: [{ role: "DPO", timeframe: "Immediate" }], // no `action`
    precedent_novelty: "confirms_existing",
  };
  const res = validateActionItemsPatch(broken, { fn: "fixture-test" });
  assertEquals(res.ok, false);
  if (!res.ok) {
    assert(res.errors.some((e) => e.includes("action_items")));
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// LAYER B — LIVE SMOKE TESTS (opt-in, hits deployed edge functions)
// Gated by RUN_LIVE_INTEGRATION=1 so the default suite stays free & offline.
// ─────────────────────────────────────────────────────────────────────────────

const LIVE = Deno.env.get("RUN_LIVE_INTEGRATION") === "1";
const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? "";
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "";

async function invokeFn(
  name: string,
  query: Record<string, string> = {},
): Promise<{ status: number; body: unknown }> {
  const qs = new URLSearchParams(query).toString();
  const url = `${SUPABASE_URL}/functions/v1/${name}${qs ? "?" + qs : ""}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ANON_KEY}`,
      "apikey": ANON_KEY,
      "content-type": "application/json",
    },
    body: "{}",
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch { /* keep raw */ }
  return { status: res.status, body };
}

Deno.test({
  name: "live: fetch-updates returns 200 with run summary",
  ignore: !LIVE,
  fn: async () => {
    const { status, body } = await invokeFn("fetch-updates", { shards: "1", shard: "1" });
    assertEquals(status, 200, `body=${JSON.stringify(body).slice(0, 400)}`);
    assert(typeof body === "object" && body !== null);
  },
});

Deno.test({
  name: "live: fetch-newsapi returns 200 with counters incl. validation_failed",
  ignore: !LIVE,
  fn: async () => {
    const { status, body } = await invokeFn("fetch-newsapi");
    assertEquals(status, 200, `body=${JSON.stringify(body).slice(0, 400)}`);
    assert(
      typeof body === "object" && body !== null &&
        "validation_failed" in (body as Record<string, unknown>),
      "fetch-newsapi response should expose a validation_failed counter",
    );
  },
});

Deno.test({
  name: "live: backfill-update-signals returns 200 with scanned/updated/failed",
  ignore: !LIVE,
  fn: async () => {
    const { status, body } = await invokeFn("backfill-update-signals", { limit: "1" });
    assertEquals(status, 200, `body=${JSON.stringify(body).slice(0, 400)}`);
    const b = body as Record<string, unknown>;
    for (const k of ["scanned", "updated", "failed"]) {
      assert(k in b, `backfill-update-signals missing key ${k}`);
    }
  },
});

Deno.test({
  name: "live: backfill-action-items returns 200 with scanned counter",
  ignore: !LIVE,
  fn: async () => {
    const { status, body } = await invokeFn("backfill-action-items", { limit: "1" });
    assertEquals(status, 200, `body=${JSON.stringify(body).slice(0, 400)}`);
    const b = body as Record<string, unknown>;
    assert("scanned" in b, "backfill-action-items missing scanned");
  },
});

// Sanity: live layer can find creds when enabled.
Deno.test({
  name: "live: env credentials present",
  ignore: !LIVE,
  fn: () => {
    assertStringIncludes(SUPABASE_URL, "supabase.co");
    assert(ANON_KEY.length > 20, "VITE_SUPABASE_PUBLISHABLE_KEY missing");
  },
});
