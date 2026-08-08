// ITEM 413 §3 — THE RECORD-COMPLETE GATE DETERMINATION, WITH ITS EVIDENCE.
//
// ANSWER: NO. The gate is NOT wired, and no registration intake contract is
// authored this item. The gate exists to stop a MODEL-WRITTEN document from
// speaking affirmatively over a record that cannot carry the claim. Both of
// its preconditions fail here:
//
//   G1  There is no affirmative/draft framing to gate. Registration emits no
//       model prose at all — `run-registration-assessment` makes zero model
//       calls. Asserted by scanning the product for any inference client.
//
//   G2  There is no unanswered-question surface for a gate to protect,
//       because the SHAPE LAW of the deliverables already does the gate's job
//       per finding: an unsupportable finding degrades to
//       `record_insufficient` and must name `information_needed`. That is
//       finer-grained than a document-level boolean, and it is asserted here
//       over a deliberately degraded record.
//
// Wiring a gate would therefore add a document-level flag over a product that
// already refuses, field by field, to overclaim — and it would require
// authoring a contract against an informal schema, which §3 forbids.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleRegistrationReport, PERFECT_INTAKE } from "./_assemble.ts";

const SRC_ROOT = new URL(
  "../../../supabase/functions/run-registration-assessment/",
  import.meta.url,
);

async function readAllSources(dir: URL): Promise<string> {
  const parts: string[] = [];
  for await (const entry of Deno.readDir(dir)) {
    const child = new URL(entry.name + (entry.isDirectory ? "/" : ""), dir);
    if (entry.isDirectory) parts.push(await readAllSources(child));
    else if (entry.name.endsWith(".ts")) parts.push(await Deno.readTextFile(child));
  }
  return parts.join("\n");
}

Deno.test("G1 — the product makes no model calls, so there is no framing to gate", async () => {
  const src = await readAllSources(SRC_ROOT);
  const code = src.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  for (
    const re of [
      /ai\.gateway\.lovable\.dev/,
      /LOVABLE_API_KEY/,
      /openai\.com\/v1\/chat/,
      /anthropic\.com/,
      /\bcallModel\(/,
      /\bchatCompletion\(/,
    ]
  ) {
    assert(
      !re.test(code),
      `registration now makes model calls (${re}) — re-open the record-complete gate determination.`,
    );
  }
});

Deno.test("G2 — a degraded record degrades per finding and names what is needed", () => {
  const { report } = assembleRegistrationReport({ markets_served: ["US-CA"] });
  const deliverables = report.registration_deliverables as Record<string, unknown>;
  const insufficient: Array<Record<string, unknown>> = [];
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (o.status === "record_insufficient") insufficient.push(o);
      Object.values(o).forEach(walk);
    }
  };
  walk(deliverables);
  assert(insufficient.length > 0, "a near-empty record produced no record_insufficient findings");
  const silent = insufficient.filter((o) => {
    const need = o.information_needed ?? o.open_questions ?? o.summary;
    return !need || (typeof need === "string" && need.trim().length === 0) ||
      (Array.isArray(need) && need.length === 0);
  });
  assertEquals(
    silent.length,
    0,
    `record_insufficient findings that name nothing: ${JSON.stringify(silent, null, 2)}`,
  );
});

Deno.test("G2 — the degraded record never speaks affirmatively about a duty it cannot settle", () => {
  const { report } = assembleRegistrationReport({ markets_served: ["US-CA"] });
  const determinations = (report.registration_deliverables as Record<string, unknown>)
    .determinations as Array<Record<string, unknown>>;
  for (const d of determinations) {
    if (d.status !== "record_insufficient") continue;
    assert(
      d.verdict === "record_insufficient" || d.verdict === "conditional",
      `insufficient determination claims verdict "${d.verdict}"`,
    );
  }
});

Deno.test("no record-complete flag is emitted — the determination is legible in the output", () => {
  const { report } = assembleRegistrationReport(PERFECT_INTAKE);
  const dump = JSON.stringify(report);
  assert(!dump.includes("record_complete"), "a record-complete gate was wired without re-deciding §3");
});
