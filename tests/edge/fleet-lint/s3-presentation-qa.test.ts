// A-TEAM SESSION 3 (doc 115, 2026-08-31) — PRESENTATION-QA RECURRENCE GUARDS.
//
// The 2026-08-31 presentation review found internal vocabulary, raw schema
// keys, and rendering artifacts in customer PDFs. These tests pin the fixes:
// behavioral where the builder is importable, source-text pins (the
// established c3-verdict-scoreboards precedent) where the module opens an
// HTTP listener at import time.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildDpiaTablesBySurface } from "../../../supabase/functions/_shared/ltp/dpia-skeleton-tables.ts";
import { buildRiskLedgerTable } from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";
import { lowerFirstWordSafe } from "../../../supabase/functions/_shared/ltp/splice-case.ts";
import { formatReportDateLong } from "../../../supabase/functions/_shared/report-dates.ts";
import { reportDisclaimerHtml, applyUniversalDisclaimerHtml } from "../../../supabase/functions/_shared/report-disclaimer.ts";

// ── I.2/IV.11 — the DPIA gap ledger can never print a raw schema key ──────
Deno.test("S3 I.2 — DPIA gap ledger resolves raw field ids to display labels", () => {
  const report = {
    gap_ledger: [
      { dimensions: "the DPO details", field: "dpo_info", provision: "GDPR Art. 37", enables: "the controller record" },
      { dimensions: "the transfer record", field: "transfer_flows", provision: "GDPR Ch. V", enables: "the transfer determination" },
      { dimensions: "a future field", field: "some_new_unmapped_key", provision: "GDPR Art. 5", enables: "a determination" },
    ],
  };
  const t = buildDpiaTablesBySurface(report as never, {} as never)["gap_ledger"];
  assert(t, "gap ledger table renders");
  for (const row of t!.rows) {
    assert(!/[a-z0-9]_[a-z0-9]/.test(row[1]), `raw schema key leaked: ${row[1]}`);
  }
  assertEquals(t!.rows[0][1], "Data protection officer details");
  // Unmapped keys go through the humanizer, never verbatim.
  assertEquals(t!.rows[2][1], "Some new unmapped key");
});

// ── VI.3 — risk movement marks are words, not glyphs ──────────────────────
Deno.test("S3 VI.3 — risk ledger movement marks render as words", () => {
  const pathways = [
    { harm: "(A) Unauthorized access", materiality: "High", residual: "High", safeguards: [], bestStatus: null },
    { harm: "(G) Reputational harms", materiality: "High", residual: "Low", safeguards: [], bestStatus: null },
  ];
  const t = buildRiskLedgerTable(pathways as never, "exec_ledger");
  assert(t, "exec ledger renders");
  // A-TEAM S4 RULING S2.16 (doc 119) — the compression carries the
  // safeguard-status middle column; movement marks live in column 2.
  assertEquals(t!.columns, ["Privacy risk", "Safeguard credited", "Remaining risk"]);
  assertEquals(t!.rows[0][1], "None established");
  assertEquals(t!.rows[0][2], "High (unchanged)");
  assertEquals(t!.rows[1][2], "Low (reduced)");
  for (const row of t!.rows) {
    assert(!/[=▼]/.test(row[2]), `glyph mark leaked: ${row[2]}`);
  }
});

// ── S4 (doc 119) — SESSION-4 RECURRENCE GUARDS ────────────────────────────

// S2.10 — the DPIA status vocabulary states the ask, not the engine idiom.
Deno.test("S4 S2.10 — DPIA record_insufficient label is the fleet ask", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/_shared/ltp/dpia-skeleton-tables.ts", import.meta.url),
  );
  assert(!src.includes('"The record does not carry the point"'), "engine idiom returned");
  assert(src.includes('record_insufficient: "Additional information required"'), "fleet label missing");
});

// S3.1 — the ToA rename holds across every spine section title.
Deno.test("S4 S3.1 — no spine section title says Table of Authorities", async () => {
  const spines = [
    "../../../supabase/functions/check-biometric-compliance/_local/prose/plans/biometric.spine.ts",
    "../../../supabase/functions/generate-ir-playbook/_local/prose/plans/ir-playbook.spine.ts",
    "../../../supabase/functions/run-li-assessment/_local/prose/plans/lia.spine.ts",
    "../../../supabase/functions/generate-report-pdf/_local/prose/plans/lia.spine.ts",
    "../../../supabase/functions/generate-ropa-document/register/ropa.spine.ts",
    "../../../supabase/functions/run-registration-assessment/_local/prose/plans/registration.spine.ts",
    "../../../supabase/functions/run-governance-assessment/_local/prose/plans/governance.spine.ts",
    "../../../supabase/functions/run-cppa-cybersecurity/_local/prose/plans/cppa-cyber-v4.spine.ts",
    "../../../supabase/functions/run-admt-checker/_local/prose/plans/cppa-admt.spine.ts",
    "../../../src/lib/scope/scope-spine.ts",
  ];
  for (const rel of spines) {
    const text = await Deno.readTextFile(new URL(rel, import.meta.url));
    assert(!text.includes('title: "Table of Authorities"'), `${rel} still titles the old ToA name`);
  }
});

// S2.13(d) — the biometric amendment trigger names in-scope statutes only.
Deno.test("S4 S2.13d — biometric review triggers are jurisdiction-scoped", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/check-biometric-compliance/_local/ltp/biometric-deliverables/build.ts", import.meta.url),
  );
  assert(!src.includes("const BIOMETRIC_REVIEW_TRIGGERS"), "static all-statute trigger list returned");
  assert(src.includes("function biometricReviewTriggers("), "scoped trigger builder missing");
});

// ── III.10/V.7 — acronym-safe mid-sentence casing ─────────────────────────
Deno.test("S3 III.10 — lowerFirstWordSafe preserves leading acronyms", () => {
  assertEquals(lowerFirstWordSafe("DLP rules"), "DLP rules");
  assertEquals(lowerFirstWordSafe("Gradient-boosted ML model"), "gradient-boosted ML model");
  assertEquals(lowerFirstWordSafe("Content filtering"), "content filtering");
  assertEquals(lowerFirstWordSafe("ICO"), "ICO");
  assertEquals(lowerFirstWordSafe("A"), "a");
  assertEquals(lowerFirstWordSafe(""), "");
});

// ── I.23 — long-form report dates ─────────────────────────────────────────
Deno.test("S3 I.23 — formatReportDateLong", () => {
  assertEquals(formatReportDateLong("2026-08-31"), "August 31, 2026");
  assertEquals(formatReportDateLong("2026-01-05T12:00:00Z"), "January 5, 2026");
  // Unparseable input passes through, never blanks.
  assertEquals(formatReportDateLong("not a date"), "not a date");
  assertEquals(formatReportDateLong(""), "");
});

// ── I.7/I.22 — the universal notice is labelled and idempotent ────────────
Deno.test("S3 I.7 — disclaimer block is labelled and strips cleanly on re-application", () => {
  const html = reportDisclaimerHtml();
  assert(html.includes("Important notice"));
  const once = applyUniversalDisclaimerHtml("<p>body</p>");
  const twice = applyUniversalDisclaimerHtml(once);
  assertEquals(
    (twice.match(/Important notice/g) ?? []).length,
    1,
    "re-application must not duplicate or orphan the notice",
  );
});

// ── Source-text pins (Deno.serve modules; c3-verdict-scoreboards precedent) ──
const read = (p: string) => Deno.readTextFile(p);

Deno.test("S3 I.4 — the PDF renderer converts under print-media emulation", async () => {
  const src = await read("supabase/functions/generate-report-pdf/index.ts");
  assert(src.includes("use_print: true"), "use_print must stay true — header repetition depends on print-media emulation");
});

Deno.test("S3 V.13/I.14 — no template meta-commentary literals remain", async () => {
  const admt = await read("supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts");
  assert(!admt.includes("section number is retained"), "ADMT template commentary reintroduced");
  assert(!admt.includes("automated compliance assessment"), "'automated' generation-method leak reintroduced");
  const risk = await read("supabase/functions/_shared/ltp/risk-skeleton-assemble.ts");
  assert(!risk.includes("appendix letter is retained"), "risk appendix template commentary reintroduced");
});

Deno.test("S3 I.1/I.3 — internal engine/corpus vocabulary stays out of composer output strings", async () => {
  const riskAsm = await read("supabase/functions/_shared/ltp/risk-skeleton-assemble.ts");
  assert(!riskAsm.includes("assessment engine ${"), "risk engine-version leak reintroduced");
  const cyberV4 = await read("supabase/functions/run-cppa-cybersecurity/_local/ltp/cyber-skeleton-assemble-v4.ts");
  assert(!cyberV4.includes('["Engine version"'), "cyber engine-version row reintroduced");
  const cyberIdx = await read("supabase/functions/run-cppa-cybersecurity/index.ts");
  assert(!cyberIdx.includes("in the FSOR corpus for this component"), "FSOR-corpus label reintroduced");
  const regSpine = await read("supabase/functions/run-registration-assessment/_local/prose/plans/registration.spine.ts");
  assert(!regSpine.includes("rests on the statutes in the verified corpus"), "registration verified-corpus sentence reintroduced");
});

Deno.test("S3 IV.10 — DPIA blockers join with separators and a terminal stop", async () => {
  const src = await read("supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts");
  assert(src.includes('Sign-off is held open by the following: ${list.join("; ")}.'), "blockers run-on join reintroduced");
});
