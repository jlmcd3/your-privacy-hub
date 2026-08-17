// PROMPT 9L.2 (CEO-ratified 2026-08-16) — §4 block-order correction sentinels.
// Pure reorder: the statutory frame opens Section 4, then the design-risks
// intro, then the design table, deviation table, risk register, per-risk
// paragraphs and the summary last. §3 still ends on "On this analysis…" with
// no table. No sentence bytes move.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleDpiaSkeletonDocument } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { buildDpiaDeliverables } from "../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { DPIA_SKELETON_VERSION } from "../../../supabase/functions/_shared/prose/plans/dpia.spine.ts";
import { DPIA_PERFECT_PINNED } from "../../../supabase/functions/_shared/golden/dpia-perfect-pinned.ts";
import { DPIA_PERFECT } from "../../../supabase/functions/_shared/golden/dpia.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

const intakeOf = (f: Any) => f.intake ?? f.intake_data ?? f;
const FIXTURES: Any[] = [...(DPIA_PERFECT as Any[]), ...(DPIA_PERFECT_PINNED as Any[])].map(intakeOf);

function section(intake: Any, id: string): Any {
  const { document } = assembleDpiaSkeletonDocument(buildDpiaDeliverables(intake) as Any, intake);
  return document.sections.find((s: Any) => s.id === id)!;
}

Deno.test("9L.2 — Section 4 renders frame, design intro, design table, in that order (all pins)", () => {
  assert(FIXTURES.length >= 4, `expected four pins, saw ${FIXTURES.length}`);
  for (const intake of FIXTURES) {
    const ps = section(intake, "section_4_risk_management").paragraphs as Any[];
    assert(
      String(ps[0].text).startsWith("Article 35(7)(c) requires an assessment of the risks"),
      String(ps[0].text).slice(0, 120),
    );
    assert(
      String(ps[1].text).endsWith("as the starting point of the risk assessment."),
      String(ps[1].text).slice(0, 160),
    );
    // RE-POINTED BY PROMPT 12I (2026-08-17): the design table renders only when
    // the record carries design risks (the novel single-operation pins carry
    // none). The ORDER assertion is unweakened: the tables that do render must
    // appear contiguously from index 2 in the ratified order.
    const surfaces = ps.filter((p) => p.table).map((p) => p.table.surface);
    const ratified = ["risk_register.design", "risk_register.incident", "risk_register"];
    assertEquals(surfaces, ratified.filter((s) => surfaces.includes(s)));
    assertEquals(surfaces.at(-1), "risk_register");
    assert(surfaces.includes("risk_register.incident"), "incident table missing");
    for (let i = 0; i < surfaces.length; i++) {
      assertEquals(ps[2 + i].table?.surface, surfaces[i], "tables are not contiguous from index 2");
    }
    // Per-risk paragraphs, then the summary as the closing paragraph. The
    // floor is computed from the record (12I): two leads + the tables that
    // render + one paragraph per risk + the summary.
    const minParas = 2 + surfaces.length + 1;
    assert(ps.length > minParas, `section 4 truncated: ${ps.length} paragraphs`);
    assert(!ps.at(-1).table, "summary paragraph is not the last block");
  }
});


Deno.test("9L.2 — Section 3 is unchanged: ends on the determination, carries no table", () => {
  for (const intake of FIXTURES) {
    const ps = section(intake, "section_3_necessity_proportionality").paragraphs as Any[];
    assert(!ps.some((p) => p.table), "a table appears in §3");
    assert(String(ps.at(-1).text).startsWith("On this analysis"), String(ps.at(-1).text).slice(0, 120));
  }
});

Deno.test("9L.2 — version string re-pins to v4.5.1", () => {
  assertEquals(DPIA_SKELETON_VERSION, "prose-plans-2026-08-16-prompt9l2-v4-5-1");
});
