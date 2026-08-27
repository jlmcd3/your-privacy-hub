// S-D3 (doc 80, 2026-08-27) — the CCPA required-terms checklist. Until the
// S-D1 assembler lands, every prompt-enforced item's evidence regex must
// match the live generate-dpa source (prompt drift is caught here); the
// assembler-only items are pinned as such so their disposition is honest.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assemblerOnlyTerms,
  DPA_US_REQUIRED_TERMS,
  DPA_US_REQUIRED_TERMS_VERIFIED,
  promptEnforcedTerms,
} from "../../../supabase/functions/generate-dpa/_local/registry/dpa-us-required-terms.ts";

const INDEX_SRC = Deno.readTextFileSync(
  new URL("../../../supabase/functions/generate-dpa/index.ts", import.meta.url),
);
// The enforcement surface is the RENDERED prompt: index.ts splices
// renderUsRequiredTermsBlock() from the registry, so evidence lives in the
// union of both sources (plus the wiring line asserted below).
const REGISTRY_SRC = Deno.readTextFileSync(
  new URL("../../../supabase/functions/generate-dpa/_local/registry/dpa-us-required-terms.ts", import.meta.url),
);
const PROMPT_SURFACE = INDEX_SRC + REGISTRY_SRC;

Deno.test("S-D3 — the checklist carries all 15 verified terms (5 statutory + 10 regulatory), unique ids", () => {
  assertEquals(DPA_US_REQUIRED_TERMS.length, 15);
  assertEquals(DPA_US_REQUIRED_TERMS.filter((t) => t.source === "Cal. Civ. Code § 1798.100(d)").length, 5);
  assertEquals(DPA_US_REQUIRED_TERMS.filter((t) => t.source === "11 CCR § 7051(a)").length, 10);
  const ids = DPA_US_REQUIRED_TERMS.map((t) => t.id);
  assertEquals(new Set(ids).size, ids.length);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(DPA_US_REQUIRED_TERMS_VERIFIED));
});

Deno.test("S-D3 — every prompt-enforced term's evidence regex matches the live generate-dpa source", () => {
  const missing: string[] = [];
  for (const t of promptEnforcedTerms()) {
    const re = new RegExp(t.prompt_evidence as string, "i");
    if (!re.test(PROMPT_SURFACE)) missing.push(`${t.id} (${t.pinpoint}): /${t.prompt_evidence}/ not found`);
  }
  assertEquals(missing, []);
});

Deno.test("S-D3 — the rendered block wiring: index splices the registry block for engaged-California records", () => {
  assert(INDEX_SRC.includes("renderUsRequiredTermsBlock()"), "the US prompt must splice the checklist block");
  // With the block spliced, every term is prompt-enforced; the
  // assembler-only set is empty until S-D1 re-classifies enforcement.
  assertEquals(assemblerOnlyTerms().length, 0);
});
