// Deploy-hygiene guard: edge functions cannot import from outside
// supabase/functions/. Imports resolving to ../../../src/, "@/...", or any
// path that escapes supabase/functions/ are deploy-breakers — the Supabase
// edge runtime bundles only files under supabase/functions/, so such imports
// fail at redeploy time. This test fails CI instead.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { walk } from "https://deno.land/std@0.224.0/fs/walk.ts";
import {
  dirname,
  fromFileUrl,
  join,
  normalize,
  relative,
  resolve,
} from "https://deno.land/std@0.224.0/path/mod.ts";

const HERE = dirname(fromFileUrl(import.meta.url));
const FUNCTIONS_ROOT = resolve(HERE, "..");           // supabase/functions
const TESTS_DIR = resolve(FUNCTIONS_ROOT, "_tests");

// Matches static + dynamic imports and re-exports:
//   import ... from "X"
//   import "X"
//   export ... from "X"
//   import("X")
const IMPORT_RE =
  /(?:import\s+(?:[^"'`;]+?\s+from\s+)?|export\s+[^"'`;]+?\s+from\s+|import\s*\(\s*)["']([^"']+)["']/g;

function isBareOrUrlSpecifier(spec: string): boolean {
  // Allowed: URL (https:, http:), npm:, jsr:, node:, deno.land, bare (no ./ or /).
  if (/^[a-z][a-z0-9+.-]*:/i.test(spec)) return true; // scheme
  if (!spec.startsWith(".") && !spec.startsWith("/")) return true; // bare
  return false;
}

function escapesFunctionsRoot(fromFile: string, spec: string): boolean {
  // Only relative specifiers are resolvable to filesystem paths here.
  const resolved = normalize(join(dirname(fromFile), spec));
  const rel = relative(FUNCTIONS_ROOT, resolved);
  return rel.startsWith("..") || resolve(rel) === rel && !resolved.startsWith(FUNCTIONS_ROOT);
}

Deno.test("deploy-hygiene: no edge-function file imports outside supabase/functions/", async () => {
  const offenders: string[] = [];

  for await (
    const entry of walk(FUNCTIONS_ROOT, {
      exts: [".ts"],
      includeDirs: false,
      skip: [/\/_tests(\/|$)/, /\.test\.ts$/, /_test\.ts$/],
    })
  ) {
    // Extra guard: skip anything under _tests even if walk missed it.
    if (entry.path.startsWith(TESTS_DIR)) continue;

    const src = await Deno.readTextFile(entry.path);
    IMPORT_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = IMPORT_RE.exec(src)) !== null) {
      const spec = match[1];

      // Forbid alias imports outright — "@/..." only resolves under src/.
      if (spec.startsWith("@/")) {
        offenders.push(
          `${relative(FUNCTIONS_ROOT, entry.path)}: forbidden alias import "${spec}"`,
        );
        continue;
      }

      if (isBareOrUrlSpecifier(spec)) continue;

      if (escapesFunctionsRoot(entry.path, spec)) {
        offenders.push(
          `${relative(FUNCTIONS_ROOT, entry.path)}: import "${spec}" resolves outside supabase/functions/`,
        );
      }
    }
  }

  assertEquals(
    offenders,
    [],
    `Edge functions may only import from within supabase/functions/, ` +
      `bare specifiers, or URL/npm:/jsr:/node: schemes. Offenders:\n  ` +
      offenders.join("\n  "),
  );
});
