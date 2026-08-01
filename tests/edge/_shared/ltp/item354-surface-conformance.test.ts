/**
 * ITEM 354 — LTP cppa-risk CONFORMANCE SUITE (permanent cutover gate).
 *
 * Codifies EVERY live-smoke check from Items 342 / 345 / 349 / 351 / 353
 * plus the Item 354 surface contract, run harness-side against BOTH smoke
 * fixtures (perfect + messy). Green here is the precondition for any future
 * T-M cutover attempt.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { derivePlan } from "../../../../supabase/functions/_shared/ltp/derive.ts";
import { assembleReport } from "../../../../supabase/functions/_shared/ltp/pass2-assembler.ts";
import { resolveLtpIntake } from "../../../../supabase/functions/_shared/ltp/entry-intake.ts";
import { INTERNAL_FORBIDDEN_TOKENS } from "../../../../supabase/functions/_shared/ltp/customer-projections.ts";
import {
  CPPA_RISK_SURFACE_CONTRACT,
  CPPA_RISK_SURFACE_KEYS,
} from "../../fixtures/item354/surface-contract.v1.ts";

const FIXTURES = ["perfect-a073d9c5", "messy-bd458f0d"] as const;

async function render(name: string): Promise<Record<string, unknown>> {
  const raw = JSON.parse(
    await Deno.readTextFile(new URL(`../../fixtures/item350/${name}.json`, import.meta.url)),
  );
  const era = resolveLtpIntake(raw);
  const plan = derivePlan({ intake: era.intake, report_data: {}, buildStamp: "item354-conformance" });
  return assembleReport(plan, {}, { exitMode: "enforce" }).report as Record<string, unknown>;
}

const reports: Record<string, Record<string, unknown>> = {};
for (const f of FIXTURES) reports[f] = await render(f);

function customerSurface(r: Record<string, unknown>): Record<string, unknown> {
  const { _meta: _ignored, ...rest } = r;
  return rest;
}

function jsonType(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

// ── SURFACE CONTRACT ────────────────────────────────────────────────
for (const f of FIXTURES) {
  Deno.test(`[item354][${f}] surface key set matches the versioned contract`, () => {
    assertEquals(Object.keys(reports[f]).sort(), [...CPPA_RISK_SURFACE_KEYS].sort());
  });

  Deno.test(`[item354][${f}] every key satisfies its declared contract type`, () => {
    for (const entry of CPPA_RISK_SURFACE_CONTRACT) {
      const t = jsonType(reports[f][entry.key]);
      assert(
        entry.types.includes(t),
        `${entry.key}: expected ${entry.types.join("|")}, got ${t}`,
      );
    }
  });

  // Item 353 FAILURE 1 + Item 351 finding 3.
  Deno.test(`[item354][${f}] no internal identifier on any customer surface`, () => {
    const s = JSON.stringify(customerSurface(reports[f]));
    for (const tok of INTERNAL_FORBIDDEN_TOKENS) {
      assert(!s.includes(tok), `internal-forbidden token "${tok}" leaked to the customer surface`);
    }
  });

  Deno.test(`[item354][${f}] risk_level is a human band, overall_score a scalar`, () => {
    const bands = ["Low", "Moderate", "High", "Critical", "Insufficient basis"];
    assert(bands.includes(reports[f].risk_level as string), `risk_level=${JSON.stringify(reports[f].risk_level)}`);
    const score = reports[f].overall_score;
    assert(score === null || typeof score === "number", `overall_score=${JSON.stringify(score)}`);
  });

  Deno.test(`[item354][${f}] risk_register / top_risks entries are customer-shaped`, () => {
    for (const key of ["risk_register", "top_risks"]) {
      const rows = reports[f][key] as Record<string, unknown>[];
      assert(Array.isArray(rows) && rows.length > 0, `${key} empty`);
      for (const row of rows) {
        assertEquals(Object.keys(row).sort(), ["citation", "description", "status", "title"]);
        assert((row.title as string).length > 0, `${key}: blank title`);
      }
    }
  });

  Deno.test(`[item354][${f}] annotations carry only title + citation`, () => {
    for (const a of reports[f].annotations as Record<string, unknown>[]) {
      assertEquals(Object.keys(a).sort(), ["citation", "title"]);
    }
  });

  // Item 342/345: named primary activity on BOTH records.
  Deno.test(`[item354][${f}] processing_narrative non-empty and free of raw JSON`, () => {
    const blocks = reports[f].processing_narrative as unknown[];
    assert(Array.isArray(blocks) && blocks.length > 0, "processing_narrative empty");
    const s = JSON.stringify(blocks);
    assert(!/\\"[a-z_]+\\"\s*:/.test(s), "raw JSON printed inside prose");
    assert(!s.includes("[registry:"), "unresolved registry placeholder printed literally");
    assert(!s.includes("undefined") && !s.includes("[object Object]"), "placeholder artifact in prose");
  });

  Deno.test(`[item354][${f}] no snake_case field-name subjects in prose`, () => {
    const s = JSON.stringify([
      reports[f].processing_narrative,
      reports[f].record_sufficiency,
      reports[f].executive_summary,
    ]);
    assert(!/\b[a-z]+_[a-z_]+\b(?=[^"]*(?:is|are)\s)/.test(s.replace(/"[a-z_]+":/g, "")),
      "field-name subject construction detected");
  });
}

// ── DIFFERENTIATION (Items 349 / 351 / 352) ─────────────────────────
async function md5(v: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(v));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.test("[item354] record_sufficiency differs between the two records", async () => {
  const a = await md5(reports["perfect-a073d9c5"].record_sufficiency);
  const b = await md5(reports["messy-bd458f0d"].record_sufficiency);
  assert(a !== b, `record_sufficiency byte-identical (${a})`);
});

Deno.test("[item354] information_needed differs between the two records", async () => {
  const a = await md5(reports["perfect-a073d9c5"].information_needed);
  const b = await md5(reports["messy-bd458f0d"].information_needed);
  assert(a !== b, `information_needed byte-identical (${a})`);
});

Deno.test("[item354] the messy record needs at least as much information as the perfect one", () => {
  const p = (reports["perfect-a073d9c5"].information_needed as unknown[]).length;
  const m = (reports["messy-bd458f0d"].information_needed as unknown[]).length;
  assert(m >= p, `messy=${m} < perfect=${p}: degradation is not honest`);
});
