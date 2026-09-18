// product-test-grade — HARD RULE: no model import anywhere in this function.
//
// Scans `deno info --json` for product-test-grade/index.ts and asserts the
// module closure never reaches `_shared/review/model-calls.ts` or
// `_shared/grader/context.ts` (the two model-call surfaces named in the
// brief) or any esm.sh/npm specifier naming anthropic/openai directly.
//
// NOT RUN by this agent (hard rule: no `deno test`). Run with:
//   deno test -A tests/edge/product-test/no-model-import.test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const ENTRY = new URL("../../../supabase/functions/product-test-grade/index.ts", import.meta.url);

interface DenoInfoModule {
  specifier: string;
}
interface DenoInfoOutput {
  modules: DenoInfoModule[];
}

async function denoInfoJson(entry: URL): Promise<DenoInfoOutput> {
  const cmd = new Deno.Command(Deno.execPath(), {
    args: ["info", "--json", entry.href],
    stdout: "piped",
    stderr: "piped",
  });
  const { stdout, code, stderr } = await cmd.output();
  if (code !== 0) {
    throw new Error(`deno info failed: ${new TextDecoder().decode(stderr)}`);
  }
  return JSON.parse(new TextDecoder().decode(stdout)) as DenoInfoOutput;
}

const FORBIDDEN_SUBSTRINGS = [
  "_shared/review/model-calls.ts",
  "_shared/grader/context.ts",
];

const FORBIDDEN_HOST_PATTERNS = [
  /api\.anthropic\.com/i,
  /api\.openai\.com/i,
];

Deno.test("product-test-grade has no path to model-calls.ts or grader/context.ts", async () => {
  const info = await denoInfoJson(ENTRY);
  const specifiers = info.modules.map((m) => m.specifier);
  assert(specifiers.length > 0, "deno info returned no modules — entry point failed to resolve");

  for (const bad of FORBIDDEN_SUBSTRINGS) {
    const hit = specifiers.find((s) => s.includes(bad));
    assertEquals(hit, undefined, `forbidden module reachable: ${hit}`);
  }
});

Deno.test("product-test-grade has no direct Anthropic/OpenAI API host reference", async () => {
  const info = await denoInfoJson(ENTRY);
  const specifiers = info.modules.map((m) => m.specifier);
  for (const re of FORBIDDEN_HOST_PATTERNS) {
    const hit = specifiers.find((s) => re.test(s));
    assertEquals(hit, undefined, `forbidden host reference reachable: ${hit}`);
  }
});
