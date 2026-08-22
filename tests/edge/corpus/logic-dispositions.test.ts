// Logic-Bearing Law CI guard (doc 48 §II.3a rule 3): every FC-L row must
// carry a disposition, and an "implemented" disposition's branch_ref must
// name a real, findable symbol in the cited file — no guessed
// "implemented". Kept simple and honest per doc 52 §1: this asserts the
// symbol/literal exists as a substring of the named file, not that it is
// semantically wired correctly (that verification happened at authoring
// time, by reading the file directly).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { RISK_CORPUS_MAP } from "../../../supabase/functions/_shared/corpus/maps/risk-corpus-map.ts";
import { ADMT_CORPUS_MAP } from "../../../supabase/functions/_shared/corpus/maps/admt-corpus-map.ts";
import { DPIA_CORPUS_MAP } from "../../../supabase/functions/_shared/corpus/maps/dpia-corpus-map.ts";
import type { CamRow, CorpusMap } from "../../../supabase/functions/_shared/corpus/cam-types.ts";

const MAPS: readonly CorpusMap[] = [RISK_CORPUS_MAP, ADMT_CORPUS_MAP, DPIA_CORPUS_MAP];

async function assertImplementedBranchExists(row: CamRow): Promise<void> {
  if (!row.logic_disposition || row.logic_disposition.kind !== "implemented") return;
  const ref = row.logic_disposition.branch_ref;
  const sep = ref.indexOf(":");
  assert(sep > 0, `${row.id}: branch_ref "${ref}" is not "path:symbol" shaped`);
  const path = ref.slice(0, sep);
  const symbol = ref.slice(sep + 1);
  let src: string;
  try {
    src = await Deno.readTextFile(path);
  } catch {
    throw new Error(`${row.id}: branch_ref file does not exist: ${path}`);
  }
  assert(
    src.includes(symbol),
    `${row.id}: branch_ref symbol "${symbol}" not found in ${path}`,
  );
}

for (const map of MAPS) {
  Deno.test(`${map.product}: every logic_bearing row has a disposition`, () => {
    for (const row of map.rows) {
      if (row.logic_bearing) {
        assert(row.logic_disposition, `${row.id}: logic_bearing with no logic_disposition`);
      }
    }
  });

  Deno.test(`${map.product}: every implemented disposition's branch_ref resolves`, async () => {
    for (const row of map.rows) {
      await assertImplementedBranchExists(row);
    }
  });

  Deno.test(`${map.product}: every extension_filed disposition has a non-empty queue_ref`, () => {
    for (const row of map.rows) {
      if (row.logic_disposition?.kind === "extension_filed") {
        assert(row.logic_disposition.queue_ref.trim().length > 0, `${row.id}: empty queue_ref`);
      }
    }
  });

  Deno.test(`${map.product}: every declined disposition has a non-empty reason`, () => {
    for (const row of map.rows) {
      if (row.logic_disposition?.kind === "declined") {
        assert(row.logic_disposition.reason.trim().length > 0, `${row.id}: empty reason`);
      }
    }
  });
}

Deno.test("RISK_CORPUS_MAP: disposition mix matches this session's finding (11 implemented, 0 filed)", () => {
  const counts = { implemented: 0, extension_filed: 0, declined: 0 };
  for (const row of RISK_CORPUS_MAP.rows) {
    const kind = row.logic_disposition?.kind;
    if (kind) counts[kind]++;
  }
  // PN-CORPUS-L-RISK-1 resolved 2026-08-22 (phase-2 redline): the
  // § 7150(b)(2)(A) carve-out gate branch landed, moving the
  // accommodations row from extension_filed to implemented.
  assertEquals(counts, { implemented: 11, extension_filed: 0, declined: 0 });
});

Deno.test("ADMT_CORPUS_MAP: disposition mix matches this session's finding (5 implemented, 0 filed)", () => {
  const counts = { implemented: 0, extension_filed: 0, declined: 0 };
  for (const row of ADMT_CORPUS_MAP.rows) {
    const kind = row.logic_disposition?.kind;
    if (kind) counts[kind]++;
  }
  assertEquals(counts, { implemented: 5, extension_filed: 0, declined: 0 });
});

Deno.test("DPIA_CORPUS_MAP: disposition mix matches this session's finding (5 implemented, 0 filed, 1 declined)", () => {
  const counts = { implemented: 0, extension_filed: 0, declined: 0 };
  for (const row of DPIA_CORPUS_MAP.rows) {
    const kind = row.logic_disposition?.kind;
    if (kind) counts[kind]++;
  }
  // PN-CORPUS-L-DPIA-1 resolved 2026-08-22 (phase-2 redline): the general
  // "systematic monitoring" REASONS_TO_CONDUCT option was added, moving
  // this row from extension_filed to implemented.
  assertEquals(counts, { implemented: 5, extension_filed: 0, declined: 1 });
});
