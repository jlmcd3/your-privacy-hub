// build-marker: generate-corpus-rules-doc207c-2026-09-07
console.log("[build-marker] generate-corpus-rules doc207c-2026-09-07");
//
// DOC 207C — the build-time step that turns ratified `public.authority_rules`
// rows into a product's pinned `*-rules.ts` file CONTENTS.
//
// Modelled on generate-corpus-relevance-profiles: admin-gated POST, JSON in /
// JSON out, all real work in pure `_local/` modules, no cross-function
// imports so the function is deployable on its own.
//
// DETERMINISM LAW (doc 48 §II.2a) UNCHANGED: this function never writes a
// file and no product code queries `authority_rules` at run time. It returns
// contents; a human commits them.
//
// ACTION
//   { action: "generate", product, rules_version? }

import { verifyCaller } from "../_shared/verify-caller.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateRules, type AuthorityRuleRow, type RuleProfileRow } from "./_local/generate.ts";
import { ruleRegistryFor } from "./_local/product-registry.ts";
import { LIA_RULE_CONTEXT_BLOCK } from "./_local/lia-rule-context.ts";

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

function admin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

const CONTEXT_BLOCKS: Readonly<Record<string, string>> = {
  lia: LIA_RULE_CONTEXT_BLOCK,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const adminTok = req.headers.get("x-admin-token");
  let internalByToken = !!adminTok && adminTok === Deno.env.get("ADMIN_SECRET_TOKEN");
  if (!internalByToken) {
    const caller = await verifyCaller(req);
    if (!caller.internal) {
      if (!caller.userId) return json({ error: "forbidden" }, 403);
      const { data: isAdmin } = await admin().rpc("has_role", { _user_id: caller.userId, _role: "admin" });
      if (!isAdmin) return json({ error: "forbidden" }, 403);
      internalByToken = true;
    }
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const action = typeof body.action === "string" ? body.action : "generate";
  if (action !== "generate") return json({ error: `unknown action "${action}" — expected "generate"` }, 400);

  const product = body.product;
  if (typeof product !== "string" || product === "") return json({ error: "missing required field: product" }, 400);
  const registry = ruleRegistryFor(product);
  if (!registry) return json({ error: `unknown product "${product}" — doc 207C registers no typed state vocabulary for it` }, 400);
  const contextBlock = CONTEXT_BLOCKS[product];
  if (!contextBlock) return json({ error: `no LIA_RULE_CONTEXT-equivalent block registered for product "${product}"` }, 400);

  try {
    const db = admin();
    const { data, error } = await db.from("authority_rules").select("*").eq("product", product).is("retired_at", null);
    if (error) throw new Error(`authority_rules read failed: ${error.message}`);
    const rows = (data ?? []) as AuthorityRuleRow[];

    const profileIds = new Set<string>();
    for (const row of rows) {
      profileIds.add(row.profile_id);
      for (const id of row.supporting_profile_ids ?? []) profileIds.add(id);
    }
    const profiles = new Map<string, RuleProfileRow>();
    if (profileIds.size > 0) {
      const { data: profileRows, error: profileError } = await db
        .from("authority_relevance_profiles")
        .select("id,rule_or_pattern,ratified_by,ratified_at,ledger_ref")
        .in("id", [...profileIds]);
      if (profileError) throw new Error(`authority_relevance_profiles read failed: ${profileError.message}`);
      for (const row of (profileRows ?? []) as RuleProfileRow[]) profiles.set(row.id, row);
    }

    const rulesVersion = typeof body.rules_version === "string" && body.rules_version !== ""
      ? body.rules_version
      : `${product}-rules-v1-${new Date().toISOString().slice(0, 10)}-0`;

    const result = generateRules({
      product,
      rows,
      profiles,
      vocabulary: registry.typed_state_vocabulary,
      instrumentScope: registry.instrument_scope,
      rulesVersion,
      exportPrefix: registry.export_prefix,
      outputPath: registry.output_path,
      ruleContextBlock: contextBlock,
    });

    return json({
      ok: result.ok,
      product,
      rules_version: rulesVersion,
      output_path: registry.output_path,
      row_count: rows.length,
      emitted: result.emitted,
      excluded: result.excluded,
      errors: result.errors,
      contents: result.contents,
    }, result.ok ? 200 : 422);
  } catch (e) {
    return json({ error: "corpus rules generation failed", detail: (e as Error).message }, 502);
  }
});
