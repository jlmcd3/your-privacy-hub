// ptest-fixtures — the /all-ptest FIXTURE PANEL service (CEO instruction
// 2026-09-14): fifteen complete, internally consistent dummy intakes per
// product, committed under _shared/review/panels. A product test picks one
// fixture per product at random and runs the stress harness on it.
//
// This is a separate function so the ~2 MB of fixtures ride in exactly one
// bundle (never the driver's, which sits near the deploy cap).
//
// Actions (admin JWT or service key):
//   catalogue        → every panel's ids/labels (no intakes)
//   pick             → { products[], per_product?, seed? } → the chosen fixtures
//   launch           → { products[], per_product?, seed?, run_by, label? } →
//                      picks, then start-stress-batch { action: "from_fixtures" }
//                      with the service key; returns batch_id + the picks

import { cors, json, requireAdmin, isResponse, SUPABASE_URL, SERVICE_KEY } from "../_shared/review/auth.ts";
import { panelCatalogue } from "../_shared/review/panels/index.ts";
import { fromFixturesBody, planLaunch, resolvePanelTools } from "../_shared/review/panels/launch.ts";

export const BUILD_STAMP = "ptest-fixtures-v1@2026-09-14";
console.log(`[ptest-fixtures] boot ${BUILD_STAMP}`);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = await requireAdmin(req);
  if (isResponse(auth)) return auth;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const action = String(body.action ?? "catalogue");

  if (action === "catalogue") {
    return json({ ok: true, panels: panelCatalogue(), build_stamp: BUILD_STAMP });
  }

  const tools = resolvePanelTools(Array.isArray(body.products) ? body.products : []);
  if (!tools.length) return json({ error: "no_products", detail: "products[] must name at least one known product" }, 400);
  const perProduct = Number(body.per_product ?? 1);
  const seed = typeof body.seed === "string" || typeof body.seed === "number" ? body.seed : undefined;
  const plan = planLaunch(tools, perProduct, seed);
  const picks = plan.picks.map(({ tool, fixture }) => ({ tool, id: fixture.id, label: fixture.label, company: fixture.company, sector: fixture.sector, geo: fixture.geo }));

  if (action === "pick") {
    return json({
      ok: true, seed: plan.seed, picks, empty_panels: plan.empty,
      fixtures: plan.picks.map(({ tool, fixture }) => ({ tool, id: fixture.id, intake: fixture.intake })),
      build_stamp: BUILD_STAMP,
    });
  }

  if (action === "launch") {
    const runBy = typeof body.run_by === "string" && body.run_by ? body.run_by : auth.userId;
    if (!runBy) return json({ error: "missing_run_by" }, 400);
    if (!plan.picks.length) return json({ error: "empty_panels", detail: `no fixtures on the panel for ${plan.empty.join(", ")}` }, 400);
    const r = await fetch(`${SUPABASE_URL}/functions/v1/start-stress-batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
      body: JSON.stringify(fromFixturesBody(runBy, plan, typeof body.label === "string" ? body.label : undefined)),
      signal: AbortSignal.timeout(60_000),
    });
    let data: Record<string, unknown> = {};
    try { data = await r.json(); } catch { /* no body */ }
    if (!r.ok || !data.batch_id) {
      return json({ error: "launch_failed", detail: String(data.error ?? data.detail ?? `start-stress-batch ${r.status}`) }, 502);
    }
    return json({ ok: true, batch_id: data.batch_id, seed: plan.seed, picks, empty_panels: plan.empty, build_stamp: BUILD_STAMP });
  }

  return json({ error: "unknown_action", detail: action }, 400);
};

export { handler };
if (import.meta.main) Deno.serve(handler);
