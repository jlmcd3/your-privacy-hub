// A-TEAM DELTA (ChatGPT batch review, 2026-08-31, P0-2) — LIA alternatives
// state-gating defect. run-li-assessment/index.ts's frame-substitution call
// never passed `surfaceStatuses`, so the approved whole-section
// "lia-gap-alternatives-considered" frame ("No alternative route appears in
// the record...") could land on `alternatives_considered` even when the
// record genuinely supplies alternatives with reasons — the DPIA-only
// ITEM 374 FIX 1(a) opt-in (surfaceIsAnalysed gate) was never extended to
// LIA. This regression lock mirrors ChatGPT's own suggested test case.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyFrameSubstitution, surfaceIsAnalysed } from "../../../supabase/functions/_shared/prose/frame-substitution.ts";
import { LIA_FRAMES } from "../../../library/prose/load.ts";

const INFO_NEEDED_LITERAL =
  "We could not verify this item from the information provided; it is listed under information needed.";

Deno.test("LIA P0-2 — a populated alternatives_considered surface never renders the whole-section gap frame", () => {
  // Reproduces the exact defect shape: the deterministic emit gate wrote the
  // controlled literal into a degraded LEAF under alternatives_considered
  // (e.g. a metadata sub-field), while the alternatives array itself is
  // fully populated with four named alternatives and reasons elsewhere in
  // the same report — the surface as a whole is analysed, not absent.
  const report: Record<string, unknown> = {
    alternatives_considered: {
      alternatives: [
        { alternative: "Scheduled supervisor check-ins", why_inadequate: "Too infrequent to detect an acute medical event.", rationale_recorded: true },
        { alternative: "Zone-only sensors without physiological data", why_inadequate: "Would not detect cardiac or heat events.", rationale_recorded: true },
        { alternative: "Voluntary opt-in telemetry", why_inadequate: "Selection bias would leave at-risk workers unmonitored.", rationale_recorded: true },
        { alternative: "Obtaining consent under Article 6(1)(a)", why_inadequate: "Workers are in a clear power imbalance with the employer.", rationale_recorded: true },
      ],
      // A degraded sub-field unrelated to any specific alternative's
      // rationale — this is what the emit gate actually writes the literal
      // into; without the surfaceStatuses gate, frame substitution swept
      // this leaf into the whole-section frame regardless of the four
      // populated alternatives above it.
      additional_context: INFO_NEEDED_LITERAL,
    },
  };

  // Without the gate (no surfaceStatuses passed): the defect reproduces.
  const withoutGate = structuredClone(report);
  const before = applyFrameSubstitution(withoutGate, {
    product: "lia",
    frameSet: LIA_FRAMES,
    contract: "li_assessment",
    values: { organization_name: "Kestrel Harbour Financial Group Inc." },
  });
  assert(before.atoms_applied >= 1, "the literal should have been substituted with SOME frame");
  const beforeText = JSON.stringify(withoutGate);
  assert(
    beforeText.includes("No alternative route appears in the record"),
    "defect reproduction: whole-section gap frame lands despite four populated alternatives",
  );

  // With the gate (surfaceStatuses says this surface is analysed): fixed.
  const withGate = structuredClone(report);
  applyFrameSubstitution(withGate, {
    product: "lia",
    frameSet: LIA_FRAMES,
    contract: "li_assessment",
    surfaceStatuses: { alternatives_considered: "analysed" },
    values: { organization_name: "Kestrel Harbour Financial Group Inc." },
  });
  const afterText = JSON.stringify(withGate);
  assert(
    !afterText.includes("No alternative route appears in the record"),
    "fix: the whole-section gap frame must not land on an analysed surface",
  );
  // The four populated alternatives are untouched — this is a gate, not a
  // rewrite of the record.
  assertEquals(
    (withGate.alternatives_considered as { alternatives: unknown[] }).alternatives.length,
    4,
  );
});

Deno.test("LIA P0-2 — surfaceIsAnalysed gate itself: true only when the caller marks the surface analysed", () => {
  assert(
    surfaceIsAnalysed("alternatives_considered.additional_context", {
      surfaceStatuses: { alternatives_considered: "analysed" },
    }),
  );
  assert(
    !surfaceIsAnalysed("alternatives_considered.additional_context", {
      surfaceStatuses: { alternatives_considered: "" },
    }),
  );
  assert(!surfaceIsAnalysed("alternatives_considered.additional_context", {}));
});
