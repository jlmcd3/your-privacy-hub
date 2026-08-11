// D3 REGISTER SUPERSESSION — OUTPUT SWEEP BATTERY.
//
// `d3-supersession.test.ts` proves no generator PROMPT prescribes the v3
// banned register family. This sibling battery proves the same for what the
// tools actually RENDER: hardcoded template strings in the document-builder
// code, and the render chokepoint that sweeps composed prose.
//
// Two layers:
//   1. SOURCE — the deliverable/composer surfaces that were found carrying the
//      family as literal strings (LIA, Registration, Biometric, Governance,
//      CPPA Risk section composers) are scanned; the family must be absent.
//   2. OUTPUT — the builders are invoked on fixture intake and their emitted
//      prose is asserted clean, and `renderSkeletonDocument` is shown to sweep
//      any composed block that still carried the family.
//
// Run: deno test -A tests/edge/register/d3-output-sweep.test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  hasBannedRegister,
  repairRegister,
  V3_BANNED_REGISTER_PATTERNS,
} from "../../../supabase/functions/_shared/ltp/register-repair.ts";
import { renderSkeletonDocument, skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { buildGovernanceDeliverables } from "../../../supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts";
import { buildRegistrationDeliverables } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import { buildBiometricDeliverables } from "../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-deliverables/build.ts";
import { buildLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { buildLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";

const ROOT = new URL("../../../", import.meta.url);

/** The seven reported locations, plus their whole files. */
const OUTPUT_SURFACES = [
  "supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts",
  "supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts",
  "supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts",
  "supabase/functions/check-biometric-compliance/_local/ltp/biometric-deliverables/build.ts",
  "supabase/functions/run-governance-assessment/_local/ltp/governance-deliverables/build.ts",
  "supabase/functions/_shared/ltp/section-composers/cppa-risk.ts",
];

/** A line may NAME the family when it is prohibiting or repairing it. */
const PROHIBITION = /\bBANNED\b|\bREGISTER defect\b|repairRegister|\bdo not (?:emit|write|use)\b/i;

async function read(rel: string): Promise<string> {
  return await Deno.readTextFile(new URL(rel, ROOT));
}

/** Walk every string leaf of an arbitrary structure. */
function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => strings(v, out));
  return out;
}

function assertClean(label: string, value: unknown) {
  const bad = strings(value).filter(hasBannedRegister);
  assertEquals(bad, [], `${label}: banned v3 register reached the output\n${bad.join("\n")}`);
}

Deno.test("D3 output sweep — no deliverable/composer source carries the banned family", async () => {
  const findings: string[] = [];
  for (const rel of OUTPUT_SURFACES) {
    const src = await read(rel);
    src.split("\n").forEach((line, i) => {
      if (line.trim().startsWith("//") || line.trim().startsWith("*")) return;
      if (PROHIBITION.test(line)) return;
      for (const re of V3_BANNED_REGISTER_PATTERNS) {
        if (re.test(line)) findings.push(`${rel}:${i + 1} ${line.trim().slice(0, 140)}`);
      }
    });
  }
  assertEquals(findings, [], findings.join("\n"));
});

Deno.test("D3 output sweep — Governance deliverables emit no banned register", () => {
  for (
    const intake of [
      {},
      {
        sector: "public_sector",
        size: "large",
        data_categories: ["health data", "location data"],
        special_categories: ["health"],
        core_activity_monitoring: "yes",
        ropa_maintained: "yes",
        policies_documented: "partial",
        training_programme: "no",
        dpo_appointed: "no",
      },
    ]
  ) {
    assertClean("governance", buildGovernanceDeliverables(intake));
  }
});

Deno.test("D3 output sweep — Registration deliverables emit no banned register", () => {
  for (
    const intake of [
      {},
      {
        states: ["VT", "CA", "TX", "OR"],
        operating_states: ["VT", "CA", "TX", "OR"],
        direct_relationship: "no",
        data_broker: "yes",
        eu_establishment: "no",
        offers_goods_eu: "yes",
        monitoring_eu: "yes",
        processing_occasional: "no",
        special_categories: "yes",
        ai_systems_in_use: "yes",
        representative_designated: "no",
      },
    ]
  ) {
    assertClean("registration", buildRegistrationDeliverables(intake as never));
  }
});

Deno.test("D3 output sweep — Biometric deliverables emit no banned register", () => {
  for (
    const intake of [
      {},
      {
        states: ["IL", "TX", "WA"],
        biometric_types: ["fingerprint", "face geometry"],
        retention_schedule: "no",
        destruction_trigger: "no",
        written_policy: "no",
        written_release: "no",
        notice_given: "no",
      },
      {
        states: ["IL"],
        retention_schedule: "yes",
        destruction_trigger: "no",
      },
    ]
  ) {
    assertClean("biometric", buildBiometricDeliverables(intake as never));
  }
});

Deno.test("D3 output sweep — LIA deliverables emit no banned register", () => {
  for (
    const intake of [
      {},
      {
        relationship_type: "existing_customer",
        purpose: "fraud prevention scoring",
        alternatives_considered: "consent was considered and rejected",
        consent_alternative_reason: "consent would not produce a reliable signal",
        less_intrusive_means: "aggregate scoring was considered",
        children_involved: "no",
        opt_out_mechanism: "yes",
        safeguards: "pseudonymisation, retention limit",
      },
    ]
  ) {
    assertClean("lia-deliverables", buildLiaDeliverables(intake));
    assertClean("lia-upgrade4", buildLiaUpgrade4(intake));
  }
});

Deno.test("D3 output sweep — the render chokepoint repairs any composed block", () => {
  const sections = [{
    id: "s1",
    title: "Section One",
    blocks: [
      { kind: "skeleton", text: "Fixed prose stays byte-pinned." },
      { kind: "generated", text: "[GENERATED]" },
    ],
  }];
  const doc = renderSkeletonDocument({
    sections,
    values: {},
    composed: {
      "s1:1":
        "The record shows a schedule. On this record, the record indicates a trigger and the record establishes compliance.",
    },
    spineVersion: "test",
    title: "T",
    subtitle: "S",
  });
  const text = skeletonDocumentToText(doc);
  assert(!hasBannedRegister(text), `render chokepoint did not sweep: ${text}`);
  assert(text.includes("Fixed prose stays byte-pinned."), "fixed prose must survive untouched");
  assert(text.includes("The company has indicated"), "attributed replacement expected");
});

Deno.test("D3 output sweep — repairRegister covers every family member", () => {
  for (const probe of [
    "The record shows X",
    "the record reflects X",
    "the record indicates X",
    "the record demonstrates X",
    "the record establishes X",
    "On this record, X",
  ]) {
    assert(!hasBannedRegister(repairRegister(probe)), probe);
  }
});
