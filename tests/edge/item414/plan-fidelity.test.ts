// ITEM 414 — IR PLAN FIDELITY (both registers).
//
// The plan is the contract: every section the plan declares must exist in the
// artifact the plan assigns it to, and no artifact may ship a section the plan
// does not declare.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  IR_PIPELINE_STAMP,
  IR_PLAN_PRODUCT,
  IR_SECTION_SPECS,
  irSectionsFor,
} from "../../../supabase/functions/generate-ir-playbook/_local/prose/ir.spine.ts";
import {
  buildStandingPlaybook,
  STANDING_SECTION_ORDER,
} from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/standing-playbook.ts";
import { buildIncidentWorksheet } from "../../../supabase/functions/generate-ir-playbook/_local/ltp/ir-playbook-deliverables/incident-worksheet.ts";

Deno.test("item414: the stamp is the item414 constant", () => {
  assertEquals(IR_PIPELINE_STAMP, "ir-pipeline@item417b-2026-08-09");
  assertEquals(IR_PLAN_PRODUCT, "ir-playbook");
});

Deno.test("item414: plan fidelity — the standing register declares every rendered standing section", () => {
  const declared = new Set(irSectionsFor("standing_playbook").map((s) => s.id));
  for (const id of STANDING_SECTION_ORDER) {
    assert(declared.has(id), `standing section "${id}" is rendered but the plan does not declare it`);
  }
});

Deno.test("item414: plan fidelity — the worksheet register declares every rendered form", () => {
  const declared = new Set(irSectionsFor("incident_worksheet").map((s) => s.id));
  const ws = buildIncidentWorksheet("Meridian Health Systems");
  for (const f of ws.forms) {
    assert(declared.has(f.id), `worksheet form "${f.id}" is rendered but the plan does not declare it`);
  }
  assertEquals(ws.forms.length, irSectionsFor("incident_worksheet").length);
});

Deno.test("item414: plan fidelity — the two registers are disjoint and complete", () => {
  const standing = irSectionsFor("standing_playbook").length;
  const worksheet = irSectionsFor("incident_worksheet").length;
  assertEquals(standing + worksheet, IR_SECTION_SPECS.length);
  assert(standing > 0 && worksheet > 0);
  const ids = IR_SECTION_SPECS.map((s) => s.id);
  assertEquals(new Set(ids).size, ids.length, "section ids must be unique across both registers");
});

Deno.test("item414: every spec carries id/title/arc_stage/lead/source_key/themes", () => {
  for (const s of IR_SECTION_SPECS) {
    assert(s.id && s.title && s.arc_stage && s.lead, `${s.id} is missing a plan field`);
    assert(s.source_key.startsWith(`${s.artifact}.`), `${s.id} source_key must sit under its artifact`);
    assert(s.themes.length > 0, `${s.id} declares no themes`);
  }
});

Deno.test("item414: the standing playbook renders its sections in the declared order", () => {
  const sp = buildStandingPlaybook({ organizationName: "Meridian Health Systems" });
  assertEquals(sp.sections.map((s) => s.id), [...STANDING_SECTION_ORDER]);
});
