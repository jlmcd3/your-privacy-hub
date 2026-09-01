// BATCH 20b (Wave C4 — doc 111 Batch 20 second half, doc 113 Part F seam
// rulings S6.1–S6.5): Risk exec trigger table + II.H roster list + §V Key
// Dates; DPA annex data placement / fill-in checklist / informational
// Schedule retitle + word-boundary truncation; DPIA column conventions.

import { assert, assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runRiskFactorEngine } from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";
import { deriveKeyDatesTable } from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { assembleDpaDocument } from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-assemble.ts";
import { ANNEX_HEADING, summarise } from "../../../supabase/functions/generate-dpa/_local/dpa-clause-coverage.ts";
import { buildDpiaSkeletonTables } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-tables.ts";

type Bag = Record<string, unknown>;

Deno.test("C4/S6.3: the Risk Key Dates table digests the derived and pinned windows", () => {
  const t = deriveKeyDatesTable(
    { processing_status: "Planned", planned_start_date: "2026-10-01" },
    "2026-08-30",
  );
  assertExists(t);
  assertEquals(t.columns, ["Obligation", "Authority", "Date / deadline"]);
  assert(t.rows.some((r) => r[0] === "Initial risk assessment" && r[1] === "11 CCR § 7155(a)(1)–(b)" && r[2].startsWith("Before the processing is initiated")));
  assert(t.rows.some((r) => r[0] === "Three-year review" && r[2] === "2029-08-30"));
  assert(t.rows.some((r) => r[2] === "April 1, 2028"));
  assert(t.rows.some((r) => r[2] === "Within 30 calendar days of the request"));
});

Deno.test("C4/S6.4a: an Annex D item carrying separators places service and location", () => {
  const base = {
    documentType: "gdpr" as const,
    controllerName: "Acme GmbH",
    controllerJurisdiction: "Germany",
    processorName: "ProcCo Ltd",
    processorJurisdiction: "Ireland",
    services: "warehouse analytics",
    dataCategories: ["contact details"],
    retention: "3 years",
    hasSubProcessors: true,
    subProcessorList: "CloudHost — managed hosting — Ireland; MailFlow (transactional email, Netherlands); BareName Ltd",
    subprocessorAuthorizationModel: "general" as const,
    subprocessorNoticeDays: 30,
    auditRights: "annual audit",
    includeTransferClause: false,
    transferMechanism: "",
    securityMeasuresSelected: [],
    securityMeasuresDetails: "",
    californiaEngaged: false,
  };
  const doc = assembleDpaDocument(base);
  assertStringIncludes(doc.document_text, "- CloudHost / managed hosting / Ireland / [TO BE COMPLETED: date authorised]");
  assertStringIncludes(doc.document_text, "- MailFlow / transactional email / Netherlands / [TO BE COMPLETED: date authorised]");
  // No separators => today's bytes.
  assertStringIncludes(doc.document_text, "- BareName Ltd / [TO BE COMPLETED: service] / [TO BE COMPLETED: country/region where processing occurs] / [TO BE COMPLETED: date authorised]");
  // S6.4b — the empty-TOMS state carries the taxonomy fill-in checklist.
  assertStringIncludes(doc.document_text, "marking each as applicable or not applicable");
  assertStringIncludes(doc.document_text, "- Encryption of personal data at rest: [TO BE COMPLETED: applicable / not applicable — specifics]");
});

Deno.test("C4/S6.4c: the coverage annex is the informational Schedule and never truncates mid-word", () => {
  assertEquals(ANNEX_HEADING, "SCHEDULE — ARTICLE 28(3) CLAUSE-COVERAGE (INFORMATIONAL)");
  const longWords = Array.from({ length: 60 }, (_, i) => `requirementword${i}`).join(" ");
  const out = summarise(longWords);
  assert(out.endsWith("…"), out);
  const truncated = /(\S+)…$/.exec(out)?.[1] ?? "";
  assert(/^requirementword\d+$/.test(truncated), `mid-word truncation: "${truncated}…"`);
});

Deno.test("C4/S6.5: DPIA column conventions — all-dash columns drop; constants ride the note", () => {
  const tables = buildDpiaSkeletonTables(
    {
      processing_inventory: {
        controllers: [
          { name: "Acme GmbH", responsible_unit: "", main_establishment_or_representative: "DE", dpo: "", status: "analysed", information_needed: "" },
          { name: "Acme Sub GmbH", responsible_unit: "", main_establishment_or_representative: "DE", dpo: "", status: "analysed", information_needed: "" },
        ],
      },
    } as never,
    {} as never,
  );
  const controllers = Object.entries(tables)
    .map(([, t]) => t)
    .find((t) => t && t.title === "Controller");
  assertExists(controllers);
  // All-dash columns (Responsible unit, DPO) dropped; constant Status and
  // "What is still needed" dropped to the note.
  assert(!controllers.columns.includes("Responsible unit"), JSON.stringify(controllers.columns));
  assert(!controllers.columns.includes("Data protection officer"));
  assert(!controllers.columns.includes("Status"));
  assertExists(controllers.note);
  assertStringIncludes(controllers.note, "applies to every row");
  assert(controllers.columns.length >= 2);
  assertEquals(controllers.columns[0], "Controller");
});

Deno.test("C4/S6.1+S6.2: the Risk exec trigger table and the II.H roster list", () => {
  const engine = runRiskFactorEngine(
    {
      q1_processing_purpose: "Sell consumer profiles",
      q15_sensitive_pi: "Yes",
      a8_information_providers: "Blitz Zenn (security controls) — provided the incident history. Vera Ops (vendor management) — provided the processor list.",
      section_7151_operational_participants: [
        { name: "K. Ma", role: "Data engineering lead", processing_responsibility: "pipeline design" },
      ],
    } as never,
    {} as never,
    "2026-08-30",
  ) as unknown as {
    tables: Record<string, { columns: string[]; rows: string[][] } | undefined>;
    blocks: Record<string, { text: string } | string | undefined>;
  };
  const trig = engine.tables["executive_summary:3"];
  if (trig) {
    // DOC 127 §10 (Phase B, 2026-09-01) — the digest merged to two columns;
    // the status word leads the Determination cell, basis bytes carried.
    assertEquals(trig.columns, ["Trigger", "Determination"]);
    assert(trig.rows.every((r) => /^(Engaged|Unresolved) — /.test(r[1])));
  }
  const providers = engine.blocks["ii_information:18"];
  const providersText = typeof providers === "string" ? providers : providers?.text ?? "";
  if (providersText) {
    assert(providersText.includes("\n— "), "roster items must sit on their own lines");
    assert(!providersText.includes(". — "), "fused same-line item boundary resurfaced");
  }
});
