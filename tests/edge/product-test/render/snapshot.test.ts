// DOC 272 §6.5 "Snapshot" — the document's hash equals the pinned hash for
// that fixture; on mismatch the diff is stored per block (doc 272 §6.5, §9
// "the snapshot pins live [in the offline twin]"). "A new pin is accepted
// only by a person" (doc 272 §6, Score) — that person runs
// `scripts/product-test/pin-snapshots.ts` deliberately; this test never
// writes a pin itself.
//
// `pins.json` ships as `{}` (no fixture pinned yet — doc 272's day-to-day
// plan pins snapshots on 9/20, after the golden and messy runs land). A
// fixture with no pin is reported "unpinned" and the test still passes: an
// unpinned fixture is not yet a regression gate, it is only not yet
// reviewed.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { firstDivergence } from "../../../../supabase/functions/ptest-run-driver/_local/review/determinism.ts";
import { PANEL_BY_TOOL, type PanelTool } from "../../../../src/lib/ptestPanels/index.ts";
import { renderOffline, WIRED_TOOLS } from "./dispatcher.ts";

const DATE = "2026-09-18";

type Pins = Record<string, string>;

async function readPins(): Promise<Pins> {
  try {
    const raw = await Deno.readTextFile(new URL("./pins.json", import.meta.url));
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === "object") ? parsed as Pins : {};
  } catch {
    return {};
  }
}

async function readSnapshotText(tool: string, fixtureId: string): Promise<string | null> {
  try {
    return await Deno.readTextFile(new URL(`./snapshots/${tool}/${fixtureId}.txt`, import.meta.url));
  } catch {
    return null;
  }
}

const pins = await readPins();

for (const tool of WIRED_TOOLS) {
  const panel = PANEL_BY_TOOL[tool as PanelTool];

  Deno.test(`snapshot [${tool}] — rendered hash matches the pinned hash (or reports unpinned)`, async () => {
    for (const fixture of panel) {
      const key = `${tool}/${fixture.id}`;
      const pinned = pins[key];
      if (!pinned) {
        console.log(`  [snapshot] ${key} — unpinned`);
        continue;
      }
      const { hash, text } = await renderOffline(tool, fixture.intake as Record<string, unknown>, DATE);
      if (hash !== pinned) {
        const stored = await readSnapshotText(tool, fixture.id);
        if (stored !== null) {
          const d = firstDivergence(stored, text);
          throw new Error(
            `${key}: hash mismatch (rendered ${hash}, pinned ${pinned}). First divergence from the stored snapshot ` +
              `at line ${d?.line}:\n  snapshot: ${d?.a}\n  rendered: ${d?.b}\n` +
              `If this change is intended, run: deno run -A scripts/product-test/pin-snapshots.ts`,
          );
        }
        throw new Error(
          `${key}: hash mismatch (rendered ${hash}, pinned ${pinned}); no stored snapshot text at ` +
            `tests/edge/product-test/render/snapshots/${tool}/${fixture.id}.txt to diff against. ` +
            `If this change is intended, run: deno run -A scripts/product-test/pin-snapshots.ts`,
        );
      }
      assertEquals(hash, pinned, `${key}: hash mismatch`);
    }
  });
}
