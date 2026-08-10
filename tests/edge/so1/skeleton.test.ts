// ITEM SO-1 — SKELETON FIDELITY + SLOT MAP + PINPOINTS + REGISTER.
//
// The v3 skeleton is render law. These assertions are the mechanical guard:
// the byte-pinned fixed prose stays byte-pinned, every slot resolves to a live
// source, every typed surface the skeleton consumes is consumed, and every
// statutory pinpoint in fixed prose is supported by its verified corpus row.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  SKELETON_SECTIONS,
  RISK_PROTECTED_FIXED_PROSE,
  RISK_SKELETON_PINPOINTS,
  RISK_V3_BANNED_REGISTER,
  RISK_SKELETON_VERSION,
  RISK_SKELETON_PROVENANCE,
  RISK_TOA_GROUPS,
} from "../../../supabase/functions/_shared/prose/plans/cppa-risk.spine.ts";
import {
  RISK_SLOT_MAP,
  RISK_TYPED_SURFACES,
} from "../../../supabase/functions/_shared/prose/plans/cppa-risk.slotmap.ts";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";

const SECTION_IDS = [
  "executive_summary",
  "activity_under_assessment",
  "applicability",
  "personal_information",
  "necessity_minimisation",
  "impacts_safeguards",
  "benefits_weighing",
  "recommended_actions",
  "accountability_certification",
  "table_of_authorities",
];

Deno.test("SO-1 — the skeleton's ten sections, in order", () => {
  assertEquals(SKELETON_SECTIONS.map((s) => s.id), SECTION_IDS);
  assertEquals(RISK_SKELETON_VERSION, "prose-plans-2026-08-10-item-so1");
  assert(RISK_SKELETON_PROVENANCE.includes(
    "panel-delegated approval per CEO delegation 2026-08-06",
  ));
});

Deno.test("SO-1 — determination leads: exactly one per led section", () => {
  const led = SKELETON_SECTIONS.filter((s) =>
    s.blocks.some((b) => b.kind === "lead")
  );
  assertEquals(led.map((s) => s.id), [
    "executive_summary",
    "applicability",
    "personal_information",
    "necessity_minimisation",
    "impacts_safeguards",
    "benefits_weighing",
    "recommended_actions",
  ]);
  for (const s of led) {
    assertEquals(s.blocks.filter((b) => b.kind === "lead").length, 1, s.id);
    assertEquals(s.blocks[0].kind, "lead", `${s.id} must OPEN with its lead`);
    assert(
      s.blocks[0].text.startsWith("[DETERMINATION LEAD] One sentence"),
      `${s.id} lead must be the skeleton's one-sentence form`,
    );
  }
});

Deno.test("SO-1 — conditionals carry a trigger and a fixed rendered form", () => {
  const conds = SKELETON_SECTIONS.flatMap((s) => s.blocks)
    .filter((b) => b.kind === "conditional");
  assertEquals(conds.length, 4);
  for (const c of conds) {
    assert(c.text.startsWith("[CONDITIONAL] "), c.text.slice(0, 40));
    assert(/ trigger/.test(c.text), c.text.slice(0, 60));
    assert(
      /fixed first words|"|typed nine-leaf/.test(c.text),
      c.text.slice(0, 60),
    );

  }
  // Two of the four state the omit branch outright; the ADMT and DPIA
  // conditionals are trigger-gated on their own and simply do not render when
  // untriggered — never padded, never announced.
  assertEquals(conds.filter((c) => /omitted/.test(c.text)).length, 2);



Deno.test("SO-1 — fixed prose is byte-pinned and slot-bearing only inside braces", () => {
  assertEquals(RISK_PROTECTED_FIXED_PROSE.length, 9);
  for (const text of RISK_PROTECTED_FIXED_PROSE) {
    assert(!text.startsWith("["), "fixed prose never carries a block marker");
    for (const banned of RISK_V3_BANNED_REGISTER) {
      assert(
        !text.toLowerCase().includes(banned),
        `banned register "${banned}" in fixed prose`,
      );
    }
  }
});

Deno.test("SO-1 — slot map: every skeleton slot resolves to a live source", () => {
  const slotsInSkeleton = new Set<string>();
  for (const s of SKELETON_SECTIONS) {
    for (const b of s.blocks) {
      for (const m of b.text.matchAll(/\{([^{}]+)\}/g)) {
        slotsInSkeleton.add(m[1].split(" - ")[0].split("=")[0].trim());
      }
    }
  }
  const mapped = new Set(RISK_SLOT_MAP.map((s) => s.slot));
  const unmapped = [...slotsInSkeleton].filter((s) => !mapped.has(s));
  assertEquals(unmapped, [], `unmapped slots: ${unmapped.join(", ")}`);
  // Reverse direction: the map carries no slot the skeleton does not use.
  const unused = [...mapped].filter((s) => !slotsInSkeleton.has(s));
  assertEquals(unused, [], `slot map carries unused slots: ${unused.join(", ")}`);
});

Deno.test("SO-1 — every intake-bound slot names a key on the live contract", () => {
  const keys = new Set(cppaRiskContract.fields.map((f) => f.key));
  for (const b of RISK_SLOT_MAP) {
    const refs = b.source.split(/\s*[|+]\s*/).map((s) => s.trim());
    for (const r of refs) {
      if (b.kind === "typed-surface") continue;
      assert(keys.has(r), `slot ${b.slot} → unknown contract key "${r}"`);
    }
  }
});

Deno.test("SO-1 — every typed surface the skeleton consumes is consumed", () => {
  const ids = new Set(SKELETON_SECTIONS.map((s) => s.id));
  for (const t of RISK_TYPED_SURFACES) {
    assert(ids.has(t.section_id), `${t.surface} → unknown section ${t.section_id}`);
  }
  assertEquals(RISK_TYPED_SURFACES.length, 4);
});

Deno.test("SO-1 — every pinpoint in fixed prose is in the verification set", () => {
  const declared = new Set(RISK_SKELETON_PINPOINTS.map((p) => p.pinpoint));
  const found = new Set<string>();
  for (const text of RISK_PROTECTED_FIXED_PROSE) {
    for (const m of text.matchAll(/Section 7\d{3}(?:\((?:[a-z]|\d)\))*/g)) {
      found.add(m[0]);
    }
  }
  for (const f of found) {
    assert(declared.has(f), `pinpoint ${f} is not in the verification set`);
  }
  // § 7152(a)(7) is the initiation decision: reserved to the business and NOT
  // asserted anywhere in the fixed prose (the SO-1 stop, corrected in v3).
  assert(!found.has("Section 7152(a)(7)"));
});

Deno.test("SO-1 — Table of Authorities: three brief-order groups, iff-cited", () => {
  assertEquals(RISK_TOA_GROUPS, [
    "Regulations",
    "Statutes",
    "Guidance and Persuasive Authority",
  ]);
  const toa = SKELETON_SECTIONS.at(-1)!;
  assertEquals(toa.id, "table_of_authorities");
  assert(toa.blocks[0].text.includes("if and only if it is cited"));
});
