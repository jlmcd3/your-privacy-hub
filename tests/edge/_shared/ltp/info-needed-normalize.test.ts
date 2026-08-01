import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeInformationNeeded } from "./info-needed-normalize.ts";

Deno.test("info-needed-normalize: stamps id/topic on rows missing them", () => {
  const report: any = {
    information_needed: [
      { field: "annual_gross_revenue_2028", prompt: "confirm revenue" },
      { prompt: "x" },
      { id: "existing", topic: "keep", prompt: "y" },
    ],
  };
  const r = normalizeInformationNeeded(report);
  assertEquals(r.normalized, 2);
  assertEquals(report.information_needed[0].topic, "annual_gross_revenue_2028");
  if (!report.information_needed[0].id.startsWith("info_")) throw new Error("id not stamped");
  if (typeof report.information_needed[1].id !== "string") throw new Error("id missing");
  assertEquals(report.information_needed[2].id, "existing");
  assertEquals(report.information_needed[2].topic, "keep");
});

Deno.test("info-needed-normalize: idempotent", () => {
  const report: any = { information_needed: [{ prompt: "x" }] };
  normalizeInformationNeeded(report);
  const r2 = normalizeInformationNeeded(report);
  assertEquals(r2.normalized, 0);
});

Deno.test("info-needed-normalize: fail-open on missing array", () => {
  const r = normalizeInformationNeeded({});
  assertEquals(r.normalized, 0);
  assertEquals(r.total, 0);
});

Deno.test("info-needed-normalize: dedupes id collisions", () => {
  const report: any = { information_needed: [{ id: "dup", prompt: "a" }, { id: "dup", prompt: "b" }] };
  normalizeInformationNeeded(report);
  const ids = report.information_needed.map((r: any) => r.id);
  if (ids[0] === ids[1]) throw new Error("ids not deduped");
});
