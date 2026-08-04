// ITEM 372 — DPIA QUALITY PILOT (methods 2 and 3, plus the e6 rider).
//
// Proves the four behaviours the dispatch asks for, at the unit level:
//   2a determination block composed and rendered first
//   2b bracket tags out of sentences, onto the asks surface
//   2c authority appendix states the citation-only condition once
//   3a single-home rule: register lint flags a restated cross-cutting point
//   3b/3c the dpia plan is version 2, approved, with the fact-exempt exemplar
//   rider: "outside counsel" / "external counsel" are e6 referrals
import {
  assert,
  assertEquals,
  assertStringIncludes,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
  applyBracketTagPass,
  countProseInterruptions,
  describeTag,
  isBareTag,
  labelledBlank,
} from "../../../supabase/functions/_shared/prose/bracket-tags.ts";
import {
  buildDeterminationBlock,
  DETERMINATION_HEADING,
  renderDeterminationHtml,
} from "../../../supabase/functions/_shared/report-exhibits/determination.ts";
import {
  buildAuthorityExhibit,
  CITATION_ONLY_PREAMBLE,
  renderAuthorityExhibitHtml,
} from "../../../supabase/functions/_shared/report-exhibits/authority-exhibit.ts";
import { lintCrossSectionRestatement } from "../../../supabase/functions/_shared/prose/register-lint.ts";
import { lintPlan } from "../../../supabase/functions/_shared/prose/plan.ts";
import { COUNSEL_REFERRAL_RE } from "../../../supabase/functions/_shared/advisory-voice.ts";
import { runFormatChecksGeneric } from "../../../supabase/functions/_shared/grader/format-checks.ts";
import { REPORT_DISCLAIMER } from "../../../supabase/functions/_shared/report-disclaimer.ts";
import dpiaPlan from "../../../library/prose/plans/dpia.plan.json" with { type: "json" };

// ── METHOD 2b ──────────────────────────────────────────────────────────────

Deno.test("2b: a bare tag becomes a short labelled blank, not an instruction", () => {
  assert(isBareTag("[TO COMPLETE — DPO name and contact]"));
  assertEquals(describeTag("[TO COMPLETE — DPO name and contact]"), "DPO name and contact");
  assertEquals(labelledBlank("[TO COMPLETE — DPO name and contact]"), "To be completed: DPO name and contact");
  const report: Record<string, unknown> = {
    section_5_interested_parties: { dpo_advice: "[TO COMPLETE — DPO name and contact]" },
  };
  const c = applyBracketTagPass(report);
  assertEquals(c.labelled_blanks, 1);
  assertEquals(
    (report.section_5_interested_parties as Record<string, string>).dpo_advice,
    "To be completed: DPO name and contact",
  );
});

Deno.test("2b: a tag inside a sentence is lifted out and recorded as an ask", () => {
  const report: Record<string, unknown> = {
    section_1_description: {
      scope:
        "Portal events are retained on a rolling cycle [TO BE ASSESSED — confirm the retention period from operational data] before deletion.",
    },
  };
  const c = applyBracketTagPass(report);
  assertEquals(c.lifted_from_prose, 1);
  assertEquals(c.asks_added, 1);
  const text = (report.section_1_description as Record<string, string>).scope;
  assert(!text.includes("["), `tag survived: ${text}`);
  assertStringIncludes(text, "Portal events are retained on a rolling cycle before deletion.");
  const asks = report.information_needed as Array<{ dimensions: string }>;
  assertEquals(asks.length, 1);
  assertStringIncludes(asks[0].dimensions, "confirm the retention period");
});

Deno.test("2b: after the pass, bracketed interruptions inside prose are zero", () => {
  const report: Record<string, unknown> = {
    a: { p: "One [TO COMPLETE — a] and two [TO COMPLETE — b] in one sentence." },
    b: ["[TO COMPLETE — c]", "Clean sentence with no tag."],
    c: { nested: { deep: "Trailing tag [TO BE ASSESSED — d]." } },
  };
  assert(countProseInterruptions(report) > 0);
  const c = applyBracketTagPass(report);
  assertEquals(c.interruptions_remaining, 0);
  assertEquals(countProseInterruptions(report), 0);
  assertEquals(c.crashed, false);
});

Deno.test("2b: the pass never throws and writes telemetry to _meta.internal", () => {
  const report: Record<string, unknown> = { x: "no tags here" };
  const c = applyBracketTagPass(report);
  assertEquals(c.found, 0);
  const meta = (report._meta as Record<string, unknown>).internal as Record<string, unknown>;
  assert(meta.bracket_tags, "telemetry missing");
  assertEquals(applyBracketTagPass(null).crashed, false);
});

// ── METHOD 2a ──────────────────────────────────────────────────────────────

Deno.test("2a: the determination leads with the record, enumerates the gaps, states the consequence", () => {
  const block = buildDeterminationBlock({
    report: {
      executive_summary:
        "The organisation proposes portal analytics for its chronic-care programmes. The purpose is coherent. The record is not ready.",
      information_needed: [
        { dimensions: "The legitimate-interests assessment" },
        { dimensions: "The Member State law opening the Article 9(2)(h) gateway" },
      ],
      has_unresolved_placeholders: true,
    },
    organizationName: "Acme Health SA",
  });
  assert(block);
  assertEquals(block!.heading, DETERMINATION_HEADING);
  assertEquals(block!.missing_foundations.length, 2);
  const joined = block!.paragraphs.join("\n");
  assertStringIncludes(joined, "The record is not ready.");
  assertStringIncludes(joined, "Two foundations are missing:");
  assertStringIncludes(joined, "the legitimate-interests assessment");
  assertStringIncludes(joined, "no one can sign it");
  // prose, never a table
  assert(!/<table|\|/.test(joined));
});

Deno.test("2a: with no asks the determination says the record answered, and still renders", () => {
  const block = buildDeterminationBlock({
    report: {
      dpia_metadata: { processing_activity_name: "patient portal analytics" },
      information_needed: [],
      section_6_conclusion: { decision: "Processing may proceed subject to the recorded conditions" },
    },
    organizationName: "Acme Health SA",
  });
  assert(block);
  const joined = block!.paragraphs.join("\n");
  assertStringIncludes(joined, "This assessment covers patient portal analytics, carried out by Acme Health SA.");
  assertStringIncludes(joined, "The record answers every question");
  assertStringIncludes(joined, "The decision recorded is:");
  const html = renderDeterminationHtml(block);
  assertStringIncludes(html, "class=\"determination\"");
  assertStringIncludes(html, "Determination");
});

Deno.test("2a: nothing to say renders nothing", () => {
  assertEquals(buildDeterminationBlock({ report: null }), null);
  assertEquals(renderDeterminationHtml(null), "");
});

// ── METHOD 2c ──────────────────────────────────────────────────────────────

Deno.test("2c: the citation-only condition is stated once, not per entry", () => {
  const exhibit = buildAuthorityExhibit(
    ["GDPR Article 5", "GDPR Article 6(1)(f)", "GDPR Article 35(1)"],
    [],
  );
  assertEquals(exhibit.preamble_note, CITATION_ONLY_PREAMBLE);
  assertEquals(exhibit.entries.filter((e) => e.note).length, 0);
  const html = renderAuthorityExhibitHtml(exhibit);
  const occurrences = html.split("no approved corpus text").length - 1;
  assertEquals(occurrences, 0, "per-entry note must not repeat");
  assertEquals(html.split(CITATION_ONLY_PREAMBLE).length - 1, 1);
});

// ── METHOD 3a ──────────────────────────────────────────────────────────────

Deno.test("3a: a restated cross-cutting point is flagged; a passing reference is not", () => {
  const assignments = [
    { id: "one_stop_shop", home_section_id: "section_0_overview", anchors: ["Art. 4(16)(a)"] },
  ];
  const restated = lintCrossSectionRestatement(
    [{
      section_id: "section_6_conclusion",
      text:
        "Because the controller has no main establishment in the sense of Art. 4(16)(a), the one-stop-shop mechanism is unavailable and the controller answers separately to the authority of every Member State whose data subjects are substantially affected by this processing.",
    }],
    assignments,
  );
  assertEquals(restated.length, 1);
  assertEquals(restated[0].rule, "cross_section_restatement");

  const referenced = lintCrossSectionRestatement(
    [{ section_id: "section_6_conclusion", text: "The Art. 4(16)(a) position is settled in Section 0." }],
    assignments,
  );
  assertEquals(referenced.length, 0);

  const atHome = lintCrossSectionRestatement(
    [{
      section_id: "section_0_overview",
      text:
        "Because the controller has no main establishment in the sense of Art. 4(16)(a), the one-stop-shop mechanism is unavailable and the controller answers separately to the authority of every Member State whose data subjects are substantially affected by this processing.",
    }],
    assignments,
  );
  assertEquals(atHome.length, 0);
});

// ── METHOD 3b / 3c ─────────────────────────────────────────────────────────

// CHANGE CONTROL — the artifact carries content only. Approval is recorded in
// `prose_document_plans.approved` (CEO sign-off) and pinned by the DB suite.
Deno.test("3c: the dpia plan is the item372 revision, sections reviewed, lint-clean", () => {
  assertEquals(dpiaPlan.version, "prose-plans-2026-08-04-item372");
  assertEquals(dpiaPlan.approved, undefined);
  assertEquals(dpiaPlan.seed_default_approved, false);
  assert(dpiaPlan.sections.every((s: { status: string }) => s.status === "approved"));
  assertStringIncludes(dpiaPlan.provenance.approval, "ITEM 372");
  // deno-lint-ignore no-explicit-any
  assertEquals(lintPlan(dpiaPlan as any), []);
});

Deno.test("3a/3b: the plan carries the five homes and the fact-exempt reference render", () => {
  const ids = (dpiaPlan.home_assignments ?? []).map((h: { id: string }) => h.id);
  assertEquals(ids.sort(), [
    "missing_9_2_h_law",
    "missing_lia",
    "one_stop_shop",
    "retention_window",
    "unimplemented_measures",
  ]);
  const sectionIds = new Set(dpiaPlan.sections.map((s: { id: string }) => s.id));
  for (const h of dpiaPlan.home_assignments ?? []) {
    assert(sectionIds.has(h.home_section_id), `unknown home section ${h.home_section_id}`);
  }
  const xr = (dpiaPlan.extended_exemplars ?? [])[0];
  assert(xr, "reference render missing");
  assertEquals(xr.kind, "reference_render");
  assertEquals(xr.fact_exempt, true);
  assertStringIncludes(xr.provenance, "CEO writing exercise 2026-08-04");
  assertStringIncludes(xr.text, "DETERMINATION");
  assertStringIncludes(xr.note, "never appear in any customer's document");
});

// ── RIDER: e6 DETECTOR GAP ─────────────────────────────────────────────────

Deno.test("rider: 'outside counsel' and 'external counsel' referrals are e6 hits", () => {
  for (const s of [
    "The organisation should engage outside counsel before relying on this analysis.",
    "This position requires review by external counsel prior to sign-off.",
  ]) {
    assert(COUNSEL_REFERRAL_RE.test(s), `positive control missed: ${s}`);
    const findings = runFormatChecksGeneric(s);
    const e6 = findings.filter((f) => f.check_id === "e6_counsel_referral");
    assertEquals(e6.length, 1);
    assertEquals(e6[0].passed, false);
  }
});

Deno.test("rider: the universal disclaimer and the sanctioned register stay exempt", () => {
  const disclaimerFindings = runFormatChecksGeneric(REPORT_DISCLAIMER);
  const e6d = disclaimerFindings.filter((f) => f.check_id === "e6_counsel_referral");
  assertEquals(e6d.length, 1);
  assertEquals(e6d[0].passed, true);

  // Negative control: ordinary prose that merely names the word "counsel"
  // outside a referral construction is not a hit.
  assert(!COUNSEL_REFERRAL_RE.test("The counsel of the board was recorded in the minutes."));
});

// ---------------------------------------------------------------------------
// METHOD 2b — a closing bracket with no opener is wreckage, never content.
// ---------------------------------------------------------------------------

Deno.test("2b: orphan closing brackets are dropped; balanced brackets survive", async () => {
  const { dropOrphanBrackets, applyBracketTagPass, countProseInterruptions } = await import(
    "../../../supabase/functions/_shared/prose/bracket-tags.ts"
  );
  assertEquals(
    dropOrphanBrackets("The organisation named no processor. ]"),
    "The organisation named no processor. ",
  );
  assertEquals(dropOrphanBrackets("Retention is [30 days] on the record."), "Retention is [30 days] on the record.");
  assertEquals(dropOrphanBrackets("No brackets here."), "No brackets here.");

  const doc: Record<string, unknown> = {
    section_1_description: {
      narrative: "Portal events are collected daily and retained for the stated window. ]",
    },
  };
  applyBracketTagPass(doc);
  const text = (doc.section_1_description as Record<string, string>).narrative;
  assert(!text.includes("]"), `orphan bracket survived: ${text}`);
  assertEquals(countProseInterruptions(doc), 0);
});
