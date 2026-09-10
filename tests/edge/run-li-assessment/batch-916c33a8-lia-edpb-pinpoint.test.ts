// BATCH 916c33a8 (2026-09-10) — Velantrix LIA (a2adac32, 89/93). Section IV
// quoted "the mere fulfilment of information duties according to Articles
// 12, 13 and 14 GDPR is not sufficient in itself …" against a bare "EDPB
// Guidelines 1/2024" in the Table of Authorities — the only EDPB 1/2024
// registry row without a pinpoint. Verified against the published PDF
// (Version 1.0, adopted 8 October 2024): para. 68, Section III.2.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { LIA_VERIFIED_AUTHORITIES } from "../../../supabase/functions/run-li-assessment/_local/registry/lia-verified-authorities.ts";

const ROW = (LIA_VERIFIED_AUTHORITIES as Record<string, { citation: string; subsection: string; verbatim_quote: string; verified_on: string }>)
  .edpb_1_2024_notice_alone_not_sufficient;

Deno.test("916c33a8 LIA-1 — the information-duties row carries its paragraph pinpoint on both cited surfaces", () => {
  assertEquals(ROW.subsection, "EDPB Guidelines 1/2024, para. 68");
  assertEquals(ROW.citation, "EDPB Guidelines 1/2024, para. 68 (information duties and reasonable expectations)");
  assertEquals(ROW.verified_on, "2026-09-10");
  // The verbatim quote is byte-unchanged (it is para. 68's own sentence).
  assertEquals(
    ROW.verbatim_quote,
    "the mere fulfilment of information duties according to Articles 12, 13 and 14 GDPR is not sufficient in itself to consider that the data subjects can reasonably expect a given processing.",
  );
});

Deno.test("916c33a8 LIA-1 — every EDPB 1/2024 row now cites below the guideline title", () => {
  for (const [key, row] of Object.entries(LIA_VERIFIED_AUTHORITIES as Record<string, { subsection: string; governing_anchor: string }>)) {
    if (!key.startsWith("edpb_1_2024_")) continue;
    assert(row.subsection !== "EDPB Guidelines 1/2024", `${key} cites the guideline bare`);
    assert(row.subsection.startsWith("EDPB Guidelines 1/2024, "), `${key}: ${row.subsection}`);
  }
});
