// BATCH e74fdbfd (2026-09-09) — DPIA run b17a7266 (Veltrix). The record
// named three processors — "Google Cloud Platform (EU region hosting)",
// "Segment (event pipeline)", "Mixpanel (analytics sub-processor)" — and
// every surface asked for "the obligations and tasks each processor is bound
// to under the Art. 28 processing contract" without naming one (claude
// rubric_actionability, verified on the PDF). The ask now names the
// processors in the company's own words (build.ts askProcessorObligations),
// on the Section 1 rows and the Art. 28(3) row alike, so the gap ledger
// still merges the identical asks into one completion item. The intake holds
// ONE processor_obligations answer, so nothing per-processor is invented.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildDpiaDeliverables } from "../../../../supabase/functions/_shared/ltp/dpia-deliverables/build.ts";
import { assembleDpiaSkeletonDocument } from "../../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../../supabase/functions/_shared/prose/skeleton-render.ts";

type Bag = Record<string, unknown>;

const PROCESSORS = ["Google Cloud Platform (EU region hosting)", "Segment (event pipeline)", "Mixpanel (analytics sub-processor)"];
const ASK =
  "the obligations and tasks each processor — Google Cloud Platform (EU region hosting), Segment (event pipeline) and Mixpanel (analytics sub-processor) — is bound to under the Art. 28 processing contract";

const INTAKE: Bag = {
  organization_name: "Veltrix Digital Solutions Ltd",
  processing_activity_name: "AI-Driven Churn Prediction and Personalisation Engine",
  description:
    "The system ingests pseudonymised clickstream, session and feature-usage data from approximately 2.4 million platform users and applies an ML classifier to generate individual churn-risk scores and personalised content rankings.",
  purpose: "To predict subscriber churn before it occurs and deliver personalised in-product experiences that improve retention and user satisfaction.",
  data_subjects: "Registered Veltrix platform users (B2C and B2B subscribers) in the EU and UK",
  jurisdictions: ["EU (GDPR)"],
  data_categories: ["Customer records", "Location data"],
  retention_period: "Engagement profiles and churn scores retained for 24 months from last active session; raw event logs deleted after 90 days",
  third_party_processors: PROCESSORS,
  existing_safeguards: ["DPA signed with processor", "Encryption at rest", "Pseudonymisation"],
};

function rowsOf(d: unknown): { contract: Bag; processors: Bag[] } {
  const bag = d as Record<string, Bag>;
  return {
    contract: (bag.section2_coverage as Bag).processor_contract as Bag,
    processors: (bag.processing_inventory as Bag).processors as Bag[],
  };
}

Deno.test("batch e74fdbfd — the Art. 28 ask names every processor the record names, identically on both surfaces", () => {
  const { contract, processors } = rowsOf(buildDpiaDeliverables(INTAKE));
  assertEquals(contract.status, "record_insufficient");
  assertEquals(contract.ask_class, "ask_processor_terms_coverage");
  assertEquals(contract.information_needed, ASK);
  assert(String(contract.finding).includes("term-coverage dimension remains open"), "the DOC 130 finding is unchanged");
  assertEquals(processors.map((p) => p.name), PROCESSORS);
  assertEquals(processors.map((p) => p.information_needed), [ASK, ASK, ASK]);
});

Deno.test("batch e74fdbfd — the rendered document carries the named ask and one merged gap item", () => {
  // The assembler reads the typed deliverables off the report object (the
  // edge function merges them into report_data), so the built deliverables
  // ARE the report here.
  const report = buildDpiaDeliverables(INTAKE) as unknown as Bag;
  const text = skeletonDocumentToText(assembleDpiaSkeletonDocument(report as never, INTAKE as never).document);
  assertStringIncludes(text, ASK);
  assert(!text.includes("the obligations and tasks each processor is bound to under the Art. 28 processing contract"), "the unnamed form no longer renders when processors are named");
  // The gap table merges identical asks: the ask appears in the gap table once,
  // completing the three processor records and the Art. 28 determination.
  assertStringIncludes(text, "the processor record for Mixpanel (analytics sub-processor)");
  assertStringIncludes(text, "the Art. 28 processing-contract determination");
});

Deno.test("batch e74fdbfd — a single processor takes the singular form; recorded tasks close the ask", () => {
  const one = rowsOf(buildDpiaDeliverables({ ...INTAKE, third_party_processors: ["Cloud Survey Processing GmbH"] }));
  assertEquals(one.contract.information_needed, "the obligations and tasks Cloud Survey Processing GmbH is bound to under the Art. 28 processing contract");
  assertEquals(one.processors[0].information_needed, one.contract.information_needed);
  const closed = rowsOf(buildDpiaDeliverables({
    ...INTAKE,
    processor_obligations: "GCP hosts the warehouse in the EU region; Segment routes events; Mixpanel computes funnel analytics — all under documented instructions.",
  }));
  assertEquals(closed.contract.status, "analysed");
  assertEquals(closed.contract.information_needed, undefined);
  assert(closed.processors.every((p) => p.information_needed === undefined));
});
