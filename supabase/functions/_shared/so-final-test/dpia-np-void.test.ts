// PROMPT 5 — no AI-text fallback in composeNecessityBody.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  composeNecessityBody,
  DPIA_NP_VOID_NOTICE,
} from "../ltp/dpia-skeleton-assemble.ts";

Deno.test("empty typed arrays compose the defect notice, never section_3 prose", () => {
  const out = composeNecessityBody({
    necessity_findings: [],
    proportionality: [],
    section_3_necessity_proportionality:
      "MODEL PROSE THAT MUST NOT APPEAR IN THE DOCUMENT.",
  });
  assertEquals(out, DPIA_NP_VOID_NOTICE);
  assert(!out.includes("MODEL PROSE"));
});

Deno.test("string-shaped section_3 is also ignored", () => {
  const out = composeNecessityBody({
    section_3_necessity_proportionality: "RAW U3 STRING OUTPUT.",
  });
  assertEquals(out, DPIA_NP_VOID_NOTICE);
});

Deno.test("typed findings still compose normally", () => {
  const out = composeNecessityBody({
    necessity_findings: [{ why: "The processing is necessary to detect fraud on card transactions." }],
    proportionality: [],
    section_3_necessity_proportionality: "MODEL PROSE.",
  });
  assertStringIncludes(out, "necessary to detect fraud");
  assert(!out.includes("MODEL PROSE"));
});

Deno.test("no section_0..section_5 read remains in the assembler", async () => {
  const src = await Deno.readTextFile(
    new URL("../ltp/dpia-skeleton-assemble.ts", import.meta.url),
  );
  for (const n of [0, 1, 2, 3, 4, 5]) {
    assert(
      !src.includes(`report.section_${n}_`),
      `unexpected read of section_${n} in dpia-skeleton-assemble.ts`,
    );
  }
});
