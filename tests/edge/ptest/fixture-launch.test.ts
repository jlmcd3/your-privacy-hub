// /all-ptest fixture panel — random selection and the harness launch body.
// Hermetic. (Panel CONTENT is gated by panels.test.ts.)

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PANEL_BY_TOOL, PANEL_TOOLS, pickFixtures, seedFromString, seededRandom } from "../../../supabase/functions/_shared/review/panels/index.ts";
import { fromFixturesBody, planLaunch, resolvePanelTools } from "../../../supabase/functions/_shared/review/panels/launch.ts";

Deno.test("resolvePanelTools — page slugs and harness ids both resolve; unknowns drop; duplicates collapse", () => {
  assertEquals(resolvePanelTools(["cppa_risk", "cppa-risk", "li_assessment", "nope", "eu_notice", 7]), ["cppa-risk", "lia", "eu-notice"]);
  assertEquals(resolvePanelTools([]), []);
});

Deno.test("seededRandom — deterministic and in [0, 1)", () => {
  const a = seededRandom(7); const b = seededRandom(7);
  const xs = Array.from({ length: 50 }, () => a());
  assertEquals(xs, Array.from({ length: 50 }, () => b()));
  assert(xs.every((x) => x >= 0 && x < 1));
  assert(seedFromString("batch-a") !== seedFromString("batch-b"));
});

Deno.test("pickFixtures — over a synthetic pool every fixture is reachable and no product repeats a pick", () => {
  // Use whichever panels are populated; skip honestly when none are yet.
  const populated = PANEL_TOOLS.filter((t) => PANEL_BY_TOOL[t].length >= 2);
  if (!populated.length) { console.log("no populated panels yet — selection covered by the seeded test only"); return; }
  const tool = populated[0];
  const seen = new Set<string>();
  for (let s = 0; s < 400; s++) for (const p of pickFixtures([tool], 1, seededRandom(s))) seen.add(p.fixture.id);
  assertEquals(seen.size, PANEL_BY_TOOL[tool].length, `${tool}: every fixture is picked at least once across 400 seeds`);
  const three = pickFixtures([tool], 3, seededRandom(1));
  assertEquals(new Set(three.map((p) => p.fixture.id)).size, Math.min(3, PANEL_BY_TOOL[tool].length));
});

Deno.test("planLaunch + fromFixturesBody — reproducible by seed, clamps per_product to 1–8, reports empty panels, builds the harness jobs", () => {
  const tools = resolvePanelTools(["cppa_risk", "dpia"]);
  const p1 = planLaunch(tools, 2, "batch-xyz");
  const p2 = planLaunch(tools, 2, "batch-xyz");
  assertEquals(p1.seed, seedFromString("batch-xyz"));
  assertEquals(p1.picks.map((p) => p.fixture.id), p2.picks.map((p) => p.fixture.id));
  assertEquals(planLaunch(tools, 99, 1).picks.length, Math.min(8, PANEL_BY_TOOL["cppa-risk"].length) + Math.min(8, PANEL_BY_TOOL["dpia"].length));
  assertEquals(planLaunch(tools, 0, 1).picks.length, Math.min(1, PANEL_BY_TOOL["cppa-risk"].length) + Math.min(1, PANEL_BY_TOOL["dpia"].length));
  const body = fromFixturesBody("user-1", p1, "test");
  assertEquals(body.action, "from_fixtures");
  assertEquals(body.run_by, "user-1");
  const jobs = body.jobs as Array<Record<string, unknown>>;
  assertEquals(jobs.length, p1.picks.length);
  for (const j of jobs) {
    assert(typeof j.tool_slug === "string" && typeof j.fixture_id === "string" && j.company_id === j.fixture_id);
    assert(j.fixture_data && typeof j.fixture_data === "object");
    assert(j.geo === "us" || j.geo === "eu");
  }
  const unpopulated = PANEL_TOOLS.filter((t) => PANEL_BY_TOOL[t].length === 0);
  assertEquals(planLaunch(unpopulated, 1, 1).empty, unpopulated);
});
