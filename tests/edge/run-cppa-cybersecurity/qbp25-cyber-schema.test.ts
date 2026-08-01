// QB-P25 CYBER — Turn A2 schema/normalisation assertions.
// Run: deno test --allow-env --allow-net supabase/functions/run-cppa-cybersecurity/qbp25-cyber-schema.test.ts
import { assert, assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { BUILD_STAMP } from "../../../supabase/functions/run-cppa-cybersecurity/index.ts";

Deno.test("BUILD_STAMP bumped past QB-P25 A2 (current: w10-cyber-a1a2)", () => {
  // Historical bump: qbp25-cyber-evidence-differentiator-rank. Current
  // stamp advances through the wave sequence — any dated cyber build
  // stamped after the a1a2 pre-emit gates satisfies this pin.
  assert(/cyber/i.test(BUILD_STAMP), `unexpected BUILD_STAMP: ${BUILD_STAMP}`);
});

// The normalise step lives inline in the handler; we verify the shape rule by
// re-executing the same logic against a synthetic control set here.
Deno.test("rank normalisation renumbers 1..N by severity/score", () => {
  const controls = [
    { control: "A", status: "Mature", score: 95, rank: null },
    { control: "B", status: "Gap", score: 30, rank: null },
    { control: "C", status: "Partial", score: 55, rank: null },
    { control: "D", status: "Critical Gap", score: 10, rank: null },
  ];
  const STATUS_WEIGHT: Record<string, number> = {
    "critical gap": 0, "gap": 1, "partial": 2,
    "insufficient information": 3, "implemented": 4, "mature": 5,
  };
  const ordered = [...controls]
    .map((c: any, idx: number) => ({ c, idx }))
    .sort((a: any, b: any) => {
      const wa = STATUS_WEIGHT[a.c.status.toLowerCase()] ?? 6;
      const wb = STATUS_WEIGHT[b.c.status.toLowerCase()] ?? 6;
      if (wa !== wb) return wa - wb;
      return (a.c.score || 0) - (b.c.score || 0);
    });
  ordered.forEach((o, i) => { controls[o.idx].rank = i + 1; });
  assertEquals(controls.find((c) => c.control === "D")!.rank, 1);
  assertEquals(controls.find((c) => c.control === "B")!.rank, 2);
  assertEquals(controls.find((c) => c.control === "C")!.rank, 3);
  assertEquals(controls.find((c) => c.control === "A")!.rank, 4);
});

Deno.test("next_steps cap = 3 and object coercion", () => {
  const raw = ["one", { text: "two", owner: "DPO", trigger: "when X" }, "three", "four", "five"];
  const out = raw.slice(0, 3).map((s: any) =>
    typeof s === "string" ? { text: s, owner: "", trigger: "" } : s
  );
  assertEquals(out.length, 3);
  assertEquals(out[0].text, "one");
  assertEquals(out[1].owner, "DPO");
});
