/**
 * ITEM 358 — BLOCKING TESTS.
 *
 * FIX 1 — reserved-class items must not gate the risk band.
 *   (a) the complete fixture renders a genuine band, with the reserved
 *       § 7152(a)(7) initiation decision still listed in information_needed;
 *   (b) the messy fixture still gates to "Insufficient basis" on its genuine
 *       missing_data gaps;
 *   (c) the conformance suite carries the band law (asserted here on both
 *       fixtures through the shared generation module).
 *
 * FIX 2a — derived-token expansion of the Pass-2R numeric whitelist.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateCppaRiskReport } from "../../../../supabase/functions/_shared/ltp/generate-cppa-risk.ts";
import { derivePlan } from "../../../../supabase/functions/_shared/ltp/derive.ts";
import { resolveLtpIntake } from "../../../../supabase/functions/_shared/ltp/entry-intake.ts";
import {
  computeRecordNeeds,
  missingDataNeeds,
} from "../../../../supabase/functions/_shared/ltp/section-composers/cppa-risk.ts";
import {
  buildPass2rWhitelist,
  derivedNumericTokens,
  validateNumericDateWhitelist,
} from "../../../../supabase/functions/_shared/ltp/pass2r-validators.ts";
import { runConformanceChecks } from "../../fixtures/item354/conformance-checks.ts";

const DIR = new URL("../../fixtures/item350/", import.meta.url);
const BANDS = ["Low", "Moderate", "High", "Critical"];

async function raw(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await Deno.readTextFile(new URL(`${name}.json`, DIR)));
}

async function planFor(name: string) {
  return derivePlan({
    intake: resolveLtpIntake(await raw(name)).intake,
    report_data: {},
    buildStamp: "item358-test",
  });
}

async function render(name: string): Promise<Record<string, unknown>> {
  const gen = await generateCppaRiskReport(await raw(name), {
    buildStamp: "item358-test",
    runId: `item358-${name}`,
    pass1: "deterministic",
    mode: "enforce",
    euCorpus: [],
  });
  return gen.report;
}

const perfect = await render("perfect-a073d9c5");
const messy = await render("messy-bd458f0d");

// ── FIX 1 (a) ──────────────────────────────────────────────────────────
Deno.test("[item358][fix1a] the complete record has NO missing_data needs, only the reserved decision", async () => {
  const plan = await planFor("perfect-a073d9c5");
  const needs = computeRecordNeeds(plan);
  assertEquals(missingDataNeeds(plan).length, 0, JSON.stringify(needs, null, 2));
  const reserved = needs.filter((n) => n.kind === "reserved_decision");
  assertEquals(reserved.length, 1);
  assertEquals(reserved[0].need_id, "need.j.initiation_decision");
});

Deno.test("[item358][fix1a] the complete record renders a genuine band, not 'Insufficient basis'", () => {
  assert(
    BANDS.includes(perfect.risk_level as string),
    `risk_level=${JSON.stringify(perfect.risk_level)}`,
  );
});

Deno.test("[item358][fix1a] the reserved item is still listed in information_needed", () => {
  const s = JSON.stringify(perfect.information_needed);
  assert(/initiate/i.test(s), s.slice(0, 400));
  assert(/reserved/i.test(s), "the reserved item must be labelled as reserved");
});

// ── FIX 1 (b) ──────────────────────────────────────────────────────────
Deno.test("[item358][fix1b] the messy record still gates on its genuine missing_data gaps", async () => {
  const plan = await planFor("messy-bd458f0d");
  assert(missingDataNeeds(plan).length > 0, "messy record must carry missing_data needs");
  assertEquals(messy.risk_level, "Insufficient basis");
});

// ── FIX 1 (c) ──────────────────────────────────────────────────────────
for (const [name, report] of [["perfect-a073d9c5", perfect], ["messy-bd458f0d", messy]] as const) {
  Deno.test(`[item358][fix1c] conformance suite green on ${name}`, () => {
    const failed = runConformanceChecks(report as Record<string, unknown>).filter((r) => !r.ok);
    assertEquals(failed.length, 0, failed.map((r) => `${r.name}: ${r.detail}`).join(" | "));
  });
}

// ── FIX 2a — derived-token expansion ───────────────────────────────────
Deno.test("[item358][fix2a] band components, unit-stripped durations and date parts are derivable", () => {
  const d = derivedNumericTokens([
    "250,000 to under 1,000,000",
    "$25M to under $50M",
    "24 months rolling",
    "2026-07-30",
    "1 million records",
  ]);
  for (const tok of ["250000", "1000000", "24", "2026", "07", "7", "30", "25", "50"]) {
    assert(d.has(tok.replace(/,/g, "")), `expected derived token ${tok}; got ${JSON.stringify([...d])}`);
  }
  assert(!d.has("999"), "non-derivable values must stay out of the expansion");
});

Deno.test("[item358][fix2a] the Item-357 rejected numerals now validate against the real plan", async () => {
  const plan = await planFor("perfect-a073d9c5");
  const wl = buildPass2rWhitelist(plan, { verdict: "Moderate" });
  const doc = {
    parts: [{
      part: 1,
      heading: "Overview",
      prose:
        "The record places annual California consumer volume between 250,000 and 1,000,000. " +
        "Data is retained for 24 months. The assessment was approved on 2026-07-30.",
      covered_keys: [],
    }],
  };
  const outcome = validateNumericDateWhitelist(doc as never, wl);
  assertEquals(outcome.rejections.length, 0, JSON.stringify(outcome.rejections));
});

Deno.test("[item358][fix2a] a numeral the plan does not carry is still rejected", async () => {
  const plan = await planFor("perfect-a073d9c5");
  const wl = buildPass2rWhitelist(plan, { verdict: "Moderate" });
  const doc = {
    parts: [{
      part: 1,
      heading: "Overview",
      prose: "The business processes 3,141,592 consumer records each quarter.",
      covered_keys: [],
    }],
  };
  const outcome = validateNumericDateWhitelist(doc as never, wl);
  assert(outcome.rejections.length > 0, "invented numerals must stay rejected");
});
