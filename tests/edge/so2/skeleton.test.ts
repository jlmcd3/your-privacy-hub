// ITEM SO-2 — SKELETON FIDELITY + SLOT MAP + PINPOINTS + REGISTER (ADMT).
//
// Identities:
//   SO-2 — the skeleton's seven sections, in order
//   SO-2 — determination leads: exactly one per led section
//   SO-2 — inline conditionals carry a trigger, fixed first words, absent branch
//   SO-2 — fixed prose is byte-pinned and slot-bearing only inside braces
//   SO-2 — slot map: every skeleton slot resolves to a live source
//   SO-2 — every intake-bound slot names a key on the live contract
//   SO-2 — every typed surface the skeleton consumes is consumed
//   SO-2 — every pinpoint in fixed prose is in the verification set
//   SO-2 — the dropped systemPurpose slot never returns
//   SO-2 — Table of Authorities: three brief-order groups, iff-cited

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  ADMT_SKELETON_SECTIONS,
  ADMT_SKELETON_SUBTITLE,
  ADMT_PROTECTED_FIXED_PROSE,
  ADMT_SKELETON_PINPOINTS,
  ADMT_V3_BANNED_REGISTER,
  ADMT_SKELETON_VERSION,
  ADMT_SKELETON_PROVENANCE,
  ADMT_INLINE_CONDITIONALS,
  ADMT_TOA_GROUPS,
} from "../../../supabase/functions/_shared/prose/plans/cppa-admt.spine.ts";
import {
  ADMT_SLOT_MAP,
  ADMT_TYPED_SURFACES,
} from "../../../supabase/functions/_shared/prose/plans/cppa-admt.slotmap.ts";
import { cppaAdmtContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-admt.ts";

const SECTION_IDS = [
  "executive_summary",
  "applicability",
  "pre_use_notice",
  "opt_out_appeal",
  "access_explanation",
  "findings_actions",
  "table_of_authorities",
];

Deno.test("SO-2 — the skeleton's seven sections, in order", () => {
  assertEquals(ADMT_SKELETON_SECTIONS.map((s) => s.id), SECTION_IDS);
  assertEquals(ADMT_SKELETON_VERSION, "prose-plans-2026-08-10-item-so2");
  assert(ADMT_SKELETON_PROVENANCE.includes(
    "panel-delegated approval per CEO delegation 2026-08-06",
  ));
});

Deno.test("SO-2 — determination leads: exactly one per led section", () => {
  const led = ADMT_SKELETON_SECTIONS.filter((s) =>
    s.blocks.some((b) => b.kind === "lead")
  );
  assertEquals(led.map((s) => s.id), SECTION_IDS.slice(0, 6));
  for (const s of led) {
    assertEquals(s.blocks.filter((b) => b.kind === "lead").length, 1, s.id);
    assertEquals(s.blocks[0].kind, "lead", `${s.id} must OPEN with its lead`);
    assert(
      s.blocks[0].text.startsWith("[DETERMINATION LEAD] One sentence"),
      `${s.id} lead must be the skeleton's one-sentence form`,
    );
  }
});

Deno.test("SO-2 — inline conditionals carry a trigger, fixed first words, absent branch", () => {
  // The v3 ADMT skeleton carries no standalone [CONDITIONAL] paragraph.
  const standalone = ADMT_SKELETON_SECTIONS.flatMap((s) => s.blocks)
    .filter((b) => b.text.startsWith("[CONDITIONAL]"));
  assertEquals(standalone.length, 0);

  assertEquals(ADMT_INLINE_CONDITIONALS.length, 2);
  const fixedProse = ADMT_PROTECTED_FIXED_PROSE.join("\n");
  const contractKeys = new Set(cppaAdmtContract.fields.map((f) => f.key));
  for (const c of ADMT_INLINE_CONDITIONALS) {
    assert(fixedProse.includes(`{${c.slot}`), `${c.slot} must live inside fixed prose`);
    assert(fixedProse.includes(c.fixed_first_words), `${c.slot} fixed first words`);
    assert(contractKeys.has(c.trigger), `${c.slot} trigger "${c.trigger}" off-contract`);
    assert(c.absent.length > 0, c.slot);
  }
});

Deno.test("SO-2 — fixed prose is byte-pinned and slot-bearing only inside braces", () => {
  assertEquals(ADMT_PROTECTED_FIXED_PROSE.length, 4);
  for (const text of ADMT_PROTECTED_FIXED_PROSE) {
    assert(!text.startsWith("["), "fixed prose never carries a block marker");
    for (const banned of ADMT_V3_BANNED_REGISTER) {
      assert(
        !text.toLowerCase().includes(banned),
        `banned register "${banned}" in fixed prose`,
      );
    }
  }
});

function skeletonSlots(): Set<string> {
  const slots = new Set<string>();
  const texts = [ADMT_SKELETON_SUBTITLE, ...ADMT_SKELETON_SECTIONS.flatMap((s) => s.blocks).map((b) => b.text)];
  for (const t of texts) {
    for (const m of t.matchAll(/\{([^{}]+)\}/g)) {
      slots.add(m[1].split(" - ")[0].split("=")[0].trim());
    }
  }
  return slots;
}

Deno.test("SO-2 — slot map: every skeleton slot resolves to a live source", () => {
  const inSkeleton = skeletonSlots();
  const mapped = new Set(ADMT_SLOT_MAP.map((s) => s.slot));
  const unmapped = [...inSkeleton].filter((s) => !mapped.has(s));
  assertEquals(unmapped, [], `unmapped slots: ${unmapped.join(", ")}`);
  const unused = [...mapped].filter((s) => !inSkeleton.has(s));
  assertEquals(unused, [], `slot map carries unused slots: ${unused.join(", ")}`);
});

Deno.test("SO-2 — every intake-bound slot names a key on the live contract", () => {
  const keys = new Set(cppaAdmtContract.fields.map((f) => f.key));
  for (const b of ADMT_SLOT_MAP) {
    if (b.kind === "typed-surface") continue;
    for (const r of b.source.split(/\s*[|+]\s*/).map((s) => s.trim())) {
      assert(keys.has(r), `slot ${b.slot} → unknown contract key "${r}"`);
    }
  }
});

Deno.test("SO-2 — every typed surface the skeleton consumes is consumed", () => {
  const ids = new Set(ADMT_SKELETON_SECTIONS.map((s) => s.id));
  for (const t of ADMT_TYPED_SURFACES) {
    assert(ids.has(t.section_id), `${t.surface} → unknown section ${t.section_id}`);
  }
  assertEquals(ADMT_TYPED_SURFACES.length, 5);
});

Deno.test("SO-2 — every pinpoint in fixed prose is in the verification set", () => {
  const declared = new Set(ADMT_SKELETON_PINPOINTS.map((p) => p.pinpoint));
  assertEquals(
    [...declared].sort(),
    ["Section 7220", "Section 7221", "Section 7222"],
  );
  // The subtitle states the range 7220-7222; every member is declared.
  assert(ADMT_SKELETON_SUBTITLE.includes("11 CCR Sections 7220-7222"));
  for (const text of ADMT_PROTECTED_FIXED_PROSE) {
    for (const m of text.matchAll(/Section 7\d{3}(?:\((?:[a-z]|\d)\))*/g)) {
      assert(declared.has(m[0]), `pinpoint ${m[0]} is not in the verification set`);
    }
  }
});

Deno.test("SO-2 — the dropped systemPurpose slot never returns", () => {
  const all = [ADMT_SKELETON_SUBTITLE, ...ADMT_SKELETON_SECTIONS.flatMap((s) => s.blocks).map((b) => b.text)].join("\n");
  assertEquals(/systemPurpose/.test(all), false);
  assertEquals(ADMT_SLOT_MAP.some((s) => s.slot === "systemPurpose"), false);
});

Deno.test("SO-2 — Table of Authorities: three brief-order groups, iff-cited", () => {
  assertEquals(ADMT_TOA_GROUPS, [
    "Regulations",
    "Statutes",
    "Guidance and Persuasive Authority",
  ]);
  const toa = ADMT_SKELETON_SECTIONS.at(-1)!;
  assertEquals(toa.id, "table_of_authorities");
  assert(toa.blocks[0].text.includes("if and only if it is cited"));
});
