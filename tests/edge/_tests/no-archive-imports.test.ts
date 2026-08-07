// ITEM 402-D — DURABLE GUARD: the uploaded tree may never depend on the
// un-uploaded tree.
//
// Established by ITEM 402-C: the Supabase deploy path is a filesystem WALK of
// supabase/functions/ — every byte inside it is uploaded, and nothing outside
// it is, regardless of reachability. So a module under supabase/functions/
// that imports from archive/ (or any sibling of supabase/functions/) resolves
// locally, typechecks locally, and passes every local test — then fails at
// COLD START in the deployed isolate with module-not-found. Green suite,
// broken production.
//
// This test fails CI instead. It is the durable fix; any individual file that
// must be dragged back into the tree is only an instance of it.

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

function findFunctionsRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 12; i++) {
    const candidate = resolve(dir, "supabase", "functions");
    try {
      if (Deno.statSync(candidate).isDirectory) return candidate;
    } catch { /* keep walking up */ }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`no-archive-imports: could not locate supabase/functions from ${start}`);
}

const FUNCTIONS_ROOT = findFunctionsRoot(HERE);

const IMPORT_RE =
  /(?:import\s+(?:[^"'`;]+?\s+from\s+)?|export\s+[^"'`;]+?\s+from\s+|import\s*\(\s*)["']([^"']+)["']/g;

Deno.test("no-archive-imports: nothing under supabase/functions/ imports from archive/ or any un-uploaded path", async () => {
  const offenders: string[] = [];

  for await (
    const entry of walk(FUNCTIONS_ROOT, { exts: [".ts"], includeDirs: false })
  ) {
    const src = await Deno.readTextFile(entry.path);
    IMPORT_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = IMPORT_RE.exec(src)) !== null) {
      const spec = match[1];

      // Only relative specifiers can escape the tree; schemes and bare
      // specifiers are resolved by the runtime, not the filesystem.
      if (/^[a-z][a-z0-9+.-]*:/i.test(spec)) continue;
      if (!spec.startsWith(".") && !spec.startsWith("/")) continue;

      const resolved = normalize(join(dirname(entry.path), spec));
      const rel = relative(FUNCTIONS_ROOT, resolved);
      if (rel.startsWith("..")) {
        offenders.push(
          `${relative(FUNCTIONS_ROOT, entry.path)}: import "${spec}" resolves to ` +
            `"${rel}", outside the uploaded tree`,
        );
      }
    }
  }

  assertEquals(
    offenders,
    [],
    `Files under supabase/functions/ are uploaded; files outside it are NOT. ` +
      `An import that escapes the tree fails at cold start in the deployed ` +
      `isolate even though it resolves locally. Move the dependency back ` +
      `under supabase/functions/. Offenders:\n  ` + offenders.join("\n  "),
  );
});
