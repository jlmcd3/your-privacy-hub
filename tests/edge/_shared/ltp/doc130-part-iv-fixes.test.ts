// DOC 130 (Batch 3 Part IV follow-through, CEO-approved 2026-09-01) —
// regression guards for the implemented escalation items: the DPIA Art. 28
// existence/terms split, the DPIA sign-off traceability guard, and the
// Registration ICO fee-tier conversion disclosure.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildDpiaDeliverables } from "../../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { assembleDpiaSkeletonDocument } from "../../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../../supabase/functions/_shared/prose/skeleton-render.ts";

const BASE_INTAKE = {
  processing_activity_name: "Aerial survey imagery",
  purpose: "Produce ortho-rectified mosaics for prospecting permits",
  data_subjects: "Residents along transit corridors",
  jurisdictions: ["EU (GDPR)"],
  data_categories: ["Imagery"],
  retention_period: "30 days for raw frames",
  third_party_processors: ["Cloud Survey Processing GmbH"],
};

Deno.test("doc130 A28 — a recorded DPA with NO recorded processor tasks leaves the term-coverage dimension open", () => {
  const d = buildDpiaDeliverables({
    ...BASE_INTAKE,
    existing_safeguards: ["DPA signed with processor", "Encryption at rest"],
  });
  const row = ((d as unknown as Record<string, Record<string, unknown>>).section2_coverage).processor_contract as unknown as Record<string, unknown>;
  assertEquals(row.dpa_recorded, true);
  assertEquals(row.status, "record_insufficient");
  assertEquals(row.ask_class, "ask_processor_terms_coverage");
  assert(String(row.finding).includes("the Art. 28 instrument is recorded"), "existence half missing");
  assert(String(row.finding).includes("term-coverage dimension remains open"), "coverage half missing");
});

Deno.test("doc130 A28 — a recorded DPA WITH recorded processor tasks closes both dimensions", () => {
  const d = buildDpiaDeliverables({
    ...BASE_INTAKE,
    existing_safeguards: ["DPA signed with processor"],
    processor_obligations: "Hosts and processes raw survey frames under documented instructions; deletes raw frames at 30 days.",
  });
  const row = ((d as unknown as Record<string, Record<string, unknown>>).section2_coverage).processor_contract as unknown as Record<string, unknown>;
  assertEquals(row.status, "analysed");
  assert(String(row.finding).includes("recorded in the Section 1 inventory"), "coverage acknowledgment missing");
});

Deno.test("doc130 A28 — no recorded DPA keeps the pre-existing missing-instrument branch", () => {
  const d = buildDpiaDeliverables({ ...BASE_INTAKE, existing_safeguards: ["Encryption at rest"] });
  const row = ((d as unknown as Record<string, Record<string, unknown>>).section2_coverage).processor_contract as unknown as Record<string, unknown>;
  assertEquals(row.dpa_recorded, false);
  assertEquals(row.status, "record_insufficient");
  assertEquals(row.ask_class, "ask_dpa_contracts");
});

Deno.test("doc130 SIGNOFF — a risk-acceptance basis carries the traceability guard sentence", () => {
  const intake = {
    ...BASE_INTAKE,
    dpia_approved_by_name: "Donna Dasher",
    dpia_approved_by_title: "DPO",
    dpia_signoff_basis:
      "Sections 3 and 4 as reviewed on 12 April 2026, acceptance of two moderate residual risks on incidental capture, and verification of the raw-frame deletion job.",
  };
  const report = {
    risk_register: [{ risk_label: "Unauthorized access", residual_band: "medium" }],
  };
  const text = skeletonDocumentToText(
    assembleDpiaSkeletonDocument(report as never, intake as never).document,
  );
  assert(
    text.includes("is not re-derived by this assessment"),
    "traceability guard sentence missing",
  );
  assert(
    text.includes("are those set out in Section 4"),
    "register pointer missing",
  );
});

Deno.test("doc130 SIGNOFF — a basis with no risk-acceptance language does NOT carry the guard", () => {
  const intake = {
    ...BASE_INTAKE,
    dpia_approved_by_name: "Donna Dasher",
    dpia_signoff_basis: "Sections 3 and 4 as reviewed on 12 April 2026.",
  };
  const text = skeletonDocumentToText(
    assembleDpiaSkeletonDocument({} as never, intake as never).document,
  );
  assert(!text.includes("is not re-derived by this assessment"), "guard fired without risk-acceptance language");
});

Deno.test("doc130 REG-1 — the ICO fee-tier conversion assumption is disclosed and rate-straddle flags the boundary", async () => {
  const src = await Deno.readTextFile("supabase/functions/run-registration-assessment/index.ts");
  assert(
    src.includes("converted from the recorded USD revenue at a 0.80 GBP/USD planning rate"),
    "conversion disclosure missing",
  );
  assert(
    src.includes("revenueUsd * 0.72") && src.includes("revenueUsd * 0.88"),
    "plausible-rate straddle check missing",
  );
});
