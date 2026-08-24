// PHASE 2 corpus program (2026-08-22) — Persuasive Authority (id
// "appendix_i"), the S5 surface (doc 49 A.2.4). Covers: pure attachment
// over fired trigger states, the no-padding suppression, the AOW's
// adverse-state binding, the S3 citation trail on the factor/determination
// matrix's trigger row (Factor-Bearing Law — and its no-dangling-pointer
// property), and the standing GDPR≠CPPA disclaimer.
//
// CEO report review 2026-08-23/24: the appendix set was reordered and
// relettered — the id "appendix_i" now renders as "Appendix B" (formerly
// "I"); the factor/determination matrix (id "table_of_authorities") now
// renders as "Appendix A" (formerly "G"). Section ids are UNCHANGED; only
// the printed titles moved. See cppa-risk.spine.ts's v4.7 note.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleRiskSkeletonDocument,
  buildPersuasiveAuthority,
  deriveRiskFiredStates,
} from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { EMPTY_RISK_CORPUS } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-corpus.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";

type Bag = Record<string, unknown>;

// ── Pure-function layer ──────────────────────────────────────────────────────

Deno.test("S5 — fired-state derivation reads the classifier's Engaged lines and the completion gate", () => {
  const report: Bag = {
    scope_and_triggers: [
      "Engaged — 11 CCR § 7150(b)(3) (using ADMT for a significant decision concerning a consumer): the record supports this trigger and this activity falls within the risk-assessment obligation.",
      "Not engaged — 11 CCR § 7150(b)(1) (selling or sharing personal information): the record does not support this trigger.",
    ],
    record_complete: { value: true },
  };
  const states = deriveRiskFiredStates(report);
  assert(states.has("7150(b)(3)"));
  assert(states.has("trigger_engaged"));
  assert(!states.has("7150(b)(1)"), "Not-engaged lines must not fire states");
  assert(!states.has("record_incomplete"));
});

Deno.test("S5 — no engaged trigger → no table, no trail, no warning (no-padding law)", () => {
  const p = buildPersuasiveAuthority({
    scope_and_triggers: [
      "Not engaged — 11 CCR § 7150(b)(1) (selling or sharing personal information): the record does not support this trigger.",
    ],
    record_complete: { value: false },
  });
  assertEquals(p.table, null);
  assertEquals(p.trail, null);
  assertEquals(p.warning, null);
});

Deno.test("S5 — any engaged trigger attaches the failure-to-assess anchor (AENA); prong-keyed rows need their prong", () => {
  const p = buildPersuasiveAuthority({
    scope_and_triggers: ["Engaged — 11 CCR § 7150(b)(2) (processing sensitive personal information): x."],
    record_complete: { value: true },
  });
  assert(p.table, "table must render for an engaged trigger");
  const matters = p.table!.rows.map((r) => r[0]).join(" | ");
  assert(matters.includes("AENA"), "AENA anchors every engaged-trigger report");
  assert(!matters.includes("Deliveroo"), "Deliveroo is (b)(3)-keyed and must not attach on a (b)(2)-only record");
  assert(!matters.includes("Amazon"), "Amazon France is (b)(4)-keyed and must not attach on a (b)(2)-only record");
  assertEquals(p.warning, null, "AOW must not fire on a complete record");
});

Deno.test("S5 — (b)(3) + incomplete record attaches Deliveroo and fires the AOW", () => {
  const p = buildPersuasiveAuthority({
    scope_and_triggers: ["Engaged — 11 CCR § 7150(b)(3) (using ADMT for a significant decision concerning a consumer): x."],
    record_complete: { value: false },
  });
  assert(p.table);
  const matters = p.table!.rows.map((r) => r[0]).join(" | ");
  assert(matters.includes("AENA") && matters.includes("Deliveroo"));
  assert(p.trail!.includes("AEPD, AENA (2025)") && p.trail!.includes("Garante, Deliveroo (2021)"));
  assert(p.warning, "AOW must fire on trigger_engaged + record_incomplete");
  assert(p.warning!.includes("persuasive context only"), "AOW carries the GDPR≠CPPA frame");
});

Deno.test("S5 — attachment is deterministic (same inputs, same output)", () => {
  const report: Bag = {
    scope_and_triggers: ["Engaged — 11 CCR § 7150(b)(4) (inferring characteristics from systematic observation of workers, students, or applicants): x."],
    record_complete: { value: true },
  };
  const a = buildPersuasiveAuthority(report);
  const b = buildPersuasiveAuthority(report);
  assertEquals(JSON.stringify(a), JSON.stringify(b));
  assert(a.table!.rows.some((r) => r[0].includes("Amazon France Logistique")));
});

// ── Full-document layer over the golden fixtures ─────────────────────────────

for (const c of CPPA_RISK_PERFECT) {
  Deno.test(`S5 — full render over ${c.id}`, async (t) => {
    const result = await generateCppaRiskReport(c.intake, {
      pass1: "deterministic",
      riskCorpus: EMPTY_RISK_CORPUS,
      buildStamp: "rk-s5",
      mode: "enforce",
    });
    const report = result.report as Bag;
    const sk = assembleRiskSkeletonDocument(report, c.intake as Bag);
    const doc = sk.document;
    const ids = doc.sections.map((x) => x.id);
    const body = skeletonDocumentToText(doc);

    const fired = deriveRiskFiredStates(report);
    const shouldRender = fired.has("trigger_engaged");

    await t.step("Appendix B (formerly \"I\") renders iff a trigger is engaged", () => {
      assertEquals(ids.includes("appendix_i"), shouldRender, `appendix_i presence on ${c.id}`);
    });

    if (shouldRender) {
      await t.step("the disclaimer, the anchor precedent, and the persuasive-only label print", () => {
        assert(body.includes("Appendix B — Persuasive Authority (Analogous Enforcement)"));
        assert(body.includes("persuasive context only, are not binding"));
        assert(body.includes("AENA"));
        assert(body.includes("persuasive only; decided under the GDPR, not the CCPA"));
      });

      await t.step("Appendix A's (formerly \"G\") trigger row carries the S3 citation trail", () => {
        assert(
          body.includes("persuasive (Appendix B): "),
          "trigger-row authority cell must cite into Appendix B when it renders",
        );
      });

      await t.step("AOW fires only on an incomplete record", () => {
        const rc = report.record_complete as { value?: unknown } | undefined;
        assertEquals(body.includes("Caution. Regulators applying analogous"), rc?.value !== true);
      });
    } else {
      await t.step("no dangling pointer when Appendix B is suppressed", () => {
        assert(!body.includes("Appendix B — Persuasive Authority"), "suppressed appendix must leave no reference behind");
      });
    }

    await t.step("banned register stays clean over the new prose", () => {
      assertEquals(sk.register_findings.length, 0, JSON.stringify(sk.register_findings));
    });

    await t.step("zero conformance findings with the new section", () => {
      assertEquals(sk.conformance.length, 0, JSON.stringify(sk.conformance));
    });
  });
}
